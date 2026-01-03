const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

let nodemailer;
try {
    nodemailer = require('nodemailer');
    console.log('✅ Nodemailer loaded successfully');
} catch (error) {
    console.error('❌ Failed to load nodemailer:', error);
    throw error;
}

const app = express();
const PORT = 3000;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Email configuration helper
const createTransporter = (userEmailSettings) => {
    if (!userEmailSettings) {
        // Use environment variables
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables, or log in with your Gmail credentials.');
        }
        
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
    }
    
    // Use user credentials
    return nodemailer.createTransport({
        host: userEmailSettings.host || 'smtp.gmail.com',
        port: parseInt(userEmailSettings.port) || 587,
        secure: false,
        auth: {
            user: userEmailSettings.user,
            pass: userEmailSettings.pass
        }
    });
};

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to send emails
app.post('/api/send-email', upload.array('attachments', 10), async (req, res) => {
    try {
        let to, subject, body, userEmailSettings;
        
        // Handle FormData
        if (req.body.userEmailSettings && typeof req.body.userEmailSettings === 'string') {
            to = req.body.to;
            subject = req.body.subject;
            body = req.body.body;
            try {
                userEmailSettings = JSON.parse(req.body.userEmailSettings);
            } catch (e) {
                userEmailSettings = null;
            }
        } else {
            // JSON request
            to = req.body.to;
            subject = req.body.subject;
            body = req.body.body;
            userEmailSettings = req.body.userEmailSettings;
        }
        
        // Validate required fields
        if (!to || !subject || !body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: to, subject, body' 
            });
        }

        // Check for credentials
        const hasEnvCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;
        const hasUserCredentials = userEmailSettings && userEmailSettings.user && userEmailSettings.pass;
        
        if (!hasEnvCredentials && !hasUserCredentials) {
            return res.status(500).json({ 
                success: false, 
                error: 'Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables, or log in with your Gmail credentials.' 
            });
        }

        // Create transporter
        const transporter = createTransporter(userEmailSettings);
        await transporter.verify();

        // Determine sender email
        const senderEmail = userEmailSettings ? userEmailSettings.user : process.env.EMAIL_USER;
        const senderName = process.env.YOUR_NAME || 'Email Sender';

        // Email options
        const mailOptions = {
            from: `"${senderName}" <${senderEmail}>`,
            to: to,
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
        };

        // Add attachments if any
        if (req.files && req.files.length > 0) {
            mailOptions.attachments = req.files.map(file => ({
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype
            }));
        }

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email sent successfully:', info.messageId);
        
        res.json({ 
            success: true, 
            messageId: info.messageId,
            message: 'Email sent successfully!' 
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send email' 
        });
    }
});

// Start the server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Gmail Email Sender running at http://localhost:${PORT}`);
    });
}

module.exports = app;
