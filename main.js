// Simple Gmail Email Sender
class EmailSender {
    constructor() {
        this.emailSettings = null;
        this.recognition = null;
        this.isListening = false;
        this.finalTranscript = ''; // Track final transcript to avoid duplicates
        this.init();
    }

    init() {
        // Check if we have stored credentials
        const stored = sessionStorage.getItem('gmailCredentials');
        if (stored) {
            try {
                this.emailSettings = JSON.parse(stored);
                this.showComposer();
            } catch (e) {
                sessionStorage.removeItem('gmailCredentials');
                this.showLogin();
            }
        } else {
            // Check if server has environment variables set (no login needed)
            this.checkServerAuth();
        }

        this.setupEventListeners();
    }

    async checkServerAuth() {
        // Check if server has environment variables configured
        // If yes, show composer directly (no login needed)
        // If no, show login form
        try {
            // Try a simple check - if server has env vars, it will work
            // We'll show login for now, but server can still use env vars if available
            this.showLogin();
        } catch (e) {
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Send button
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendEmail());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabNumber = btn.getAttribute('data-tab');
                const subject = btn.getAttribute('data-subject');
                this.switchTab(tabNumber, subject);
            });
        });

        // Speech-to-text button
        this.initSpeechRecognition();
        const speechBtn = document.getElementById('speech-btn');
        if (speechBtn) {
            speechBtn.addEventListener('click', () => this.toggleSpeechRecognition());
        }
    }

    initSpeechRecognition() {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            const speechBtn = document.getElementById('speech-btn');
            if (speechBtn) {
                speechBtn.style.display = 'none';
            }
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        // Improve accuracy - use best available language model
        // Some browsers support 'en-US' with better models
        try {
            // Try to set better recognition settings if available
            if (this.recognition.grammars) {
                // Could add custom grammar here for better recognition
            }
        } catch (e) {
            // Ignore if not supported
        }

        this.recognition.onstart = () => {
            this.isListening = true;
            this.finalTranscript = ''; // Reset on start
            this.updateSpeechButton(true);
            
            // Show tip
            const tip = document.getElementById('speech-tip');
            if (tip) {
                tip.style.display = 'block';
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let newFinalTranscript = '';

            // Process only new results (from resultIndex onwards)
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    newFinalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Add new final transcript to our tracked final transcript
            if (newFinalTranscript) {
                this.finalTranscript += newFinalTranscript;
            }

            // Insert text into email body
            const emailBody = document.getElementById('email-body');
            if (emailBody) {
                // Combine final transcript with current interim results
                const displayText = this.finalTranscript + interimTranscript;
                emailBody.textContent = displayText;
                
                // Move cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(emailBody);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                this.showAlert('No speech detected. Please speak louder or check your microphone.', 'error');
            } else if (event.error === 'not-allowed') {
                this.showAlert('Microphone access denied. Please enable microphone permissions in your browser settings.', 'error');
            } else if (event.error === 'audio-capture') {
                this.showAlert('No microphone found. Please connect a microphone and try again.', 'error');
            } else if (event.error === 'network') {
                this.showAlert('Network error. Please check your internet connection.', 'error');
            } else {
                this.showAlert('Speech recognition error. Please try again.', 'error');
            }
            this.stopSpeechRecognition();
        };

        this.recognition.onend = () => {
            this.stopSpeechRecognition();
        };
    }

    toggleSpeechRecognition() {
        if (!this.recognition) {
            this.showAlert('Speech recognition is not supported in your browser. Please use Chrome or Edge.', 'error');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.showAlert('Could not start speech recognition. Please try again.', 'error');
            }
        }
    }

    stopSpeechRecognition() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
        this.finalTranscript = ''; // Reset when stopped
        this.updateSpeechButton(false);
        
        // Hide tip
        const tip = document.getElementById('speech-tip');
        if (tip) {
            tip.style.display = 'none';
        }
    }

    updateSpeechButton(listening) {
        const speechBtn = document.getElementById('speech-btn');
        const speechIcon = document.getElementById('speech-icon');
        const speechStatus = document.getElementById('speech-status');
        
        if (speechBtn && speechIcon && speechStatus) {
            if (listening) {
                speechBtn.style.backgroundColor = '#dc3545';
                speechIcon.textContent = '⏹️';
                speechStatus.style.display = 'inline';
            } else {
                speechBtn.style.backgroundColor = '';
                speechIcon.textContent = '🎤';
                speechStatus.style.display = 'none';
            }
        }
    }

    switchTab(tabNumber, subject) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabNumber}"]`).classList.add('active');

        // Update subject field (read-only)
        const subjectField = document.getElementById('subject');
        if (subjectField) {
            subjectField.value = subject;
        }
    }

    handleLogin() {
        const email = document.getElementById('email').value.trim();
        const appPassword = document.getElementById('app-password').value.trim();
        const errorDiv = document.getElementById('login-error');

        if (!email || !appPassword) {
            this.showError('Please enter both email and app password');
            return;
        }

        if (appPassword.length < 16) {
            this.showError('App password must be at least 16 characters');
            return;
        }

        // Store credentials
        this.emailSettings = {
            user: email,
            pass: appPassword,
            host: 'smtp.gmail.com',
            port: 587
        };

        sessionStorage.setItem('gmailCredentials', JSON.stringify(this.emailSettings));
        this.showComposer();
    }

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('email-composer').style.display = 'none';
    }

    showComposer() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('email-composer').style.display = 'block';

        // Initialize with first tab selected
        this.switchTab('1', 'Schedule Request');

        // Show logout button if using login credentials
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && this.emailSettings) {
            logoutBtn.style.display = 'inline-block';
        }
    }

    logout() {
        sessionStorage.removeItem('gmailCredentials');
        this.emailSettings = null;
        this.showLogin();
    }

    async sendEmail() {
        // Always send to kylcorn@umich.edu
        const to = 'kylcorn@umich.edu';
        const subject = document.getElementById('subject').value.trim();
        const body = document.getElementById('email-body').innerHTML;

        if (!subject || !body) {
            this.showAlert('Please fill in subject and message', 'error');
            return;
        }

        const sendBtn = document.getElementById('send-btn');
        const originalText = sendBtn.textContent;
        sendBtn.textContent = 'Sending...';
        sendBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('to', to);
            formData.append('subject', subject);
            formData.append('body', body);
            
            // Add email settings if we have them (from login)
            // If not, server will use environment variables
            if (this.emailSettings) {
                formData.append('userEmailSettings', JSON.stringify(this.emailSettings));
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert('Email sent successfully to kylcorn@umich.edu!', 'success');
                // Clear message only (subject is hardcoded per tab)
                document.getElementById('email-body').innerHTML = '';
            } else {
                this.showAlert('Failed to send email: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            this.showAlert('Network error. Please try again.', 'error');
        } finally {
            sendBtn.textContent = originalText;
            sendBtn.disabled = false;
        }
    }

    showAlert(message, type) {
        let alert = document.getElementById('alert-message');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'alert-message';
            alert.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(alert);
        }
        alert.textContent = message;
        alert.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    showError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.emailSender = new EmailSender();
});
