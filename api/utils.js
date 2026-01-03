const fs = require('fs');
const path = require('path');

// Function to get allowed emails from environment variable or file
function getAllowedEmails() {
    // First try environment variable (for Vercel deployment)
    if (process.env.ALLOWED_EMAILS) {
        try {
            const emails = process.env.ALLOWED_EMAILS
                .split(',')
                .map(email => email.trim().toLowerCase())
                .filter(email => email);
            console.log('Loaded allowed emails from environment:', emails);
            return emails;
        } catch (error) {
            console.error('Error parsing ALLOWED_EMAILS environment variable:', error);
        }
    }
    
    // Fallback to file (for local development)
    try {
        const allowedEmailsPath = path.join(__dirname, '..', 'allowed_emails.txt');
        console.log('Reading allowed emails from file:', allowedEmailsPath);
        
        const fileContent = fs.readFileSync(allowedEmailsPath, 'utf8');
        
        // Parse the file content
        const lines = fileContent.split('\n');
        
        const emails = lines
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
            .map(email => email.toLowerCase()); // Normalize to lowercase
        
        console.log('Parsed allowed emails from file:', emails);
        return emails;
    } catch (error) {
        console.error('Error reading allowed_emails.txt:', error);
        return []; // Return empty array if file can't be read
    }
}

module.exports = {
    getAllowedEmails
};
