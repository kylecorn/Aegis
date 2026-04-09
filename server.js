const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Google Gemini AI
let genAI = null;
try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (process.env.GOOGLE_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        console.log('✅ Google Gemini AI initialized');
    } else {
        console.log('⚠️  GOOGLE_API_KEY not found. AI message generation will not work.');
    }
} catch (error) {
    console.warn('⚠️  Google Gemini AI not available:', error.message);
}

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

app.get('/manifest.json', (req, res) => {
    res.type('application/manifest+json');
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

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

// API endpoint to generate AI message
app.post('/api/generate-ai-message', async (req, res) => {
    try {
        const { subject, originalMessage } = req.body;

        if (!subject || !originalMessage) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: subject, originalMessage'
            });
        }

        if (!genAI) {
            return res.status(503).json({
                success: false,
                error: 'AI service not configured. Please set GOOGLE_API_KEY in your .env file.'
            });
        }

        console.log('🤖 AI Message Generation Request:');
        console.log('  Subject:', subject);
        console.log('  Original Message:', originalMessage);

        // Single model, single request — set GEMINI_MODEL in .env (see https://ai.google.dev/gemini-api/docs/models).
        const modelName = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
        console.log('  Model:', modelName, '(override with GEMINI_MODEL in .env)');

        // Use the same format instructions as AiInterpreter.py
        const format_instructions = `I want you to act as an AI assistant helping me with scheduling.
Your main purpose is to first deduce the type of request you are receiving, and then based 
on that you will output a response in a specific format. 

The first type of request is "Schedule Request". Schedule Request is designed to trigger 
a request for a schedule for a specified period of time. If you identify the request as 
being something along these lines, please respond by assessing what the user is requesting 
(what time period they want the schedule for) and then reiterate it using this specific format: 
"Create a schedule for {date1} - {date2}." where date1/date2 are in the format of month/day/year.
If I wanted a schedule from November 3rd to November 9th 2025, the format output should be 
"Create a schedule for 11/03/2025 - 11/09/2025.". After you've responded with the reiteration 
in the specific format, please ask the user to confirm whether or not your reiteration is correct.
When asking for the confirmation use a more casual tone, you don't need to say it exactly in the 
format of the first line you will reply with/type out

The second form of request is "Substitution Needed". Substitution Needed is designed to help the 
user find help on short notice, typically when someone is calling out sick or something comes up. 
If you identify the request as being something along these lines, please respond by assessing what 
the user is requesting (which person called out sick today) and reiterate their request using this 
specific format: "{NameOfPerson} called out sick today.". NameOfPerson should be something like 
"Lifeguard" followed by a number. If Lifeguard 4 calls out sick, the response you give should be 
"Lifeguard #4 called out sick today.". After you've responded with the reiteration in the specific 
format, please ask the user to confirm whether or not your reiteration is correct. When asking for 
the confirmation use a more casual tone, you don't need to say it exactly in the format of the first 
line you will reply with/type out

Last, if you don't identify the prompt given to you as being a request for you to do one of the 
earlier requests, I want you to act like a normal assistant who will talk and respond with casual 
talking and engage in conversations. If the user is talking to you a lot, casually ask if they 
need assistance with anything or if they want to just continue casually chatting.

The way that you should respond to the rest of my prompts (until I tell you to stop) is by first 
writing the request type, then on the next line you should respond to me in the ways that I asked.`;

        // Get current date and time for context
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        const currentDateTime = now.toLocaleDateString('en-US', options);
        const currentDate = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `${format_instructions}

Current Context:
- Today's date and time: ${currentDateTime}
- Today's date: ${currentDate}
- Current time: ${currentTime}

When the user refers to "today", "now", or relative dates, use the current date and time information above.

User's message: "${originalMessage}"

Please process this message according to the instructions above.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiMessage = response.text().trim();

        console.log('✅ AI message generated successfully');

        res.json({
            success: true,
            aiMessage: aiMessage,
            originalMessage: originalMessage
        });

    } catch (error) {
        console.error('❌ Error generating AI message:', error);
        
        // Provide helpful error messages for common issues
        let errorMessage = error.message || 'Failed to generate AI message';
        let statusCode = 500;
        
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            errorMessage = 'Gemini model not found. Check GEMINI_MODEL in .env matches a model your key can use.\n' +
                'Run: npm run list-gemini-models\n' +
                'Docs: https://ai.google.dev/gemini-api/docs/models';
            statusCode = 404;
        } else if (
            errorMessage.includes('429') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('Quota exceeded') ||
            errorMessage.includes('credit') ||
            errorMessage.includes('billing') ||
            errorMessage.includes('prepayment')
        ) {
            errorMessage = 'Gemini API billing or quota issue (HTTP 429). Common causes:\n' +
                '1. Prepaid credits are used up — open https://aistudio.google.com/ → your project → billing / usage\n' +
                '2. Rate limit — wait a minute and retry\n' +
                '3. Enable or top up billing in Google Cloud for the project linked to this API key\n\n' +
                'Details from Google: ' + errorMessage.split('\n')[0];
            statusCode = 429;
        } else if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
            errorMessage = 'Invalid API key. Please check your GOOGLE_API_KEY in .env file.';
            statusCode = 401;
        }
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

// Start the server locally only (Vercel invokes the exported app; do not listen there)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Gmail Email Sender running at http://localhost:${PORT}`);
    });
}

module.exports = app;
