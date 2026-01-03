const nodemailer = require('nodemailer');
// Database tracking removed - email sending only

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        console.log('📧 Received email send request:', req.body);
        const { to, subject, body, fromName, fromEmail, userEmailSettings } = req.body;
        
        // Validate required fields
        if (!to || !subject || !body) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: to, subject, body' 
            });
        }

        // Check if email credentials are configured (prioritize environment variables for gypsy workaround)
        const hasEnvCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;
        const hasUserCredentials = userEmailSettings && userEmailSettings.user && userEmailSettings.pass;
        
        // Special case: if user logged in with special password (aegisVibeCode), use environment credentials
        const isSpecialPasswordLogin = userEmailSettings && userEmailSettings.isSpecialPassword === true;
        
        // Special case for gypsy@highfivespirits.com with specific app password
        const isGypsyAccount = userEmailSettings && userEmailSettings.user === 'gypsy@highfivespirits.com';
        const isCorrectGypsyPassword = userEmailSettings && userEmailSettings.pass && 
            (userEmailSettings.pass === 'vcay geso xkfv umsr' || 
             userEmailSettings.pass === 'vcaygesoxkfvumsr' || 
             userEmailSettings.pass.replace(/\s+/g, '') === 'vcaygesoxkfvumsr');
        const shouldUseEnvCredentials = isGypsyAccount && isCorrectGypsyPassword && hasEnvCredentials;
        
        console.log('Email credentials check:');
        console.log('- Env credentials:', hasEnvCredentials ? 'YES' : 'NO');
        console.log('- User credentials:', hasUserCredentials ? 'YES' : 'NO');
        console.log('- Is gypsy account:', isGypsyAccount);
        console.log('- Correct gypsy password:', isCorrectGypsyPassword);
        console.log('- Should use env credentials:', shouldUseEnvCredentials);
        
        // For special password login, require environment credentials
        if (isSpecialPasswordLogin && !hasEnvCredentials) {
            return res.status(500).json({ 
                success: false, 
                error: 'Email credentials not configured in environment variables. Please set EMAIL_USER and EMAIL_PASS.' 
            });
        }
        
        if (!hasEnvCredentials && !hasUserCredentials) {
            return res.status(500).json({ 
                success: false, 
                error: 'Email credentials not configured. Please log in with your email credentials.' 
            });
        }

        // Create transporter
        let transporter;
        if (isSpecialPasswordLogin || shouldUseEnvCredentials) {
            // Use environment credentials for gypsy@highfivespirits.com
            console.log('Using ENVIRONMENT credentials for gypsy@highfivespirits.com');
            transporter = nodemailer.createTransport({
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
        } else if (hasUserCredentials) {
            console.log('Using USER credentials');
            let transporterConfig = {
                host: userEmailSettings.host || 'smtp.gmail.com',
                port: parseInt(userEmailSettings.port) || 587,
                secure: false,
                auth: {
                    user: userEmailSettings.user,
                    pass: userEmailSettings.pass
                }
            };
            
            // Additional configuration for Google Workspace accounts
            if (userEmailSettings.user?.includes('@highfivespirits.com')) {
                console.log('Configuring for Google Workspace account');
                transporterConfig.requireTLS = true;
                transporterConfig.tls = {
                    ciphers: 'SSLv3',
                    rejectUnauthorized: false
                };
            }
            
            transporter = nodemailer.createTransport(transporterConfig);
        } else {
            console.log('Using ENVIRONMENT credentials (fallback)');
            transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        }

        // Verify connection
        await transporter.verify();

        // Determine the actual sender email
        // If special password login, always use environment credentials or default to kjcornell335@gmail.com
        let actualFromEmail;
        if (isSpecialPasswordLogin) {
            actualFromEmail = process.env.EMAIL_USER || 'kjcornell335@gmail.com';
        } else {
            actualFromEmail = shouldUseEnvCredentials ? process.env.EMAIL_USER : (fromEmail || userEmailSettings?.user || process.env.EMAIL_USER || 'kjcornell335@gmail.com');
        }
        const actualFromName = fromName || 'Email Outreach Tool';

        // Email options
        const mailOptions = {
            from: `"${actualFromName}" <${actualFromEmail}>`,
            to: to,
            subject: subject,
            html: body
        };

        console.log('📤 Sending email from:', actualFromEmail);

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);

        // Database tracking removed - email sending only

        res.json({
            success: true,
            messageId: info.messageId,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send email: ' + error.message
        });
    }
};
