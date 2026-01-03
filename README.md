# Gmail Email Sender

A simple Gmail wrapper for sending emails through a web interface.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure email credentials (choose one):

   **Option A: Environment Variables (Recommended)**
   
   Create a `.env` file:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   YOUR_NAME=Your Name
   ```

   **Option B: Login via Web Interface**
   
   If environment variables are not set, the app will show a login form where you can enter your Gmail credentials.

## Running

```bash
node server.js
```

Then open http://localhost:3000 in your browser.

## Features

- Simple email composer interface
- Send emails via Gmail SMTP
- Optional login if environment variables aren't set
- Clean, minimal UI

## Gmail App Password

To use this app, you need a Gmail App Password:
1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password
4. Use that 16-character password (not your regular Gmail password)
