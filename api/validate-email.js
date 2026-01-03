const { getAllowedEmails } = require('./utils');

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
        const { email } = req.body;
        console.log('Validating email:', email);
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email address is required' 
            });
        }

        // Get allowed emails from environment or file
        const allowedEmails = getAllowedEmails();
        const isAllowed = allowedEmails.includes(email.toLowerCase());
        
        console.log('Email allowed:', isAllowed);
        
        if (isAllowed) {
            res.json({ 
                success: true, 
                message: 'Email address is allowed',
                allowed: true
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Email address is not in the allowed list',
                allowed: false
            });
        }
    } catch (error) {
        console.error('Error validating email:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error validating email address' 
        });
    }
};
