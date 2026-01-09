// Simple Gmail Email Sender
class EmailSender {
    constructor() {
        this.emailSettings = null;
        this.recognition = null;
        this.isListening = false;
        this.finalTranscript = ''; // Track final transcript to avoid duplicates
        this.silenceTimeout = null; // Timeout for 5-second silence detection
        this.lastSpeechTime = null; // Track when speech was last detected
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

        // AI Assistant circle indicator
        const aiCircle = document.getElementById('ai-circle-indicator');
        if (aiCircle) {
            aiCircle.addEventListener('click', () => {
                // TODO: Add AI interaction logic here
                console.log('AI Assistant clicked');
            });
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
            this.lastSpeechTime = Date.now(); // Track when we started
            this.updateSpeechButton(true);
            
            // Start silence detection timeout (5 seconds)
            this.startSilenceTimeout();
            
            // Show tip
            const tip = document.getElementById('speech-tip');
            if (tip) {
                tip.style.display = 'block';
            }
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let newFinalTranscript = '';
            let hasSpeech = false;

            // Process only new results (from resultIndex onwards)
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (transcript.trim().length > 0) {
                    hasSpeech = true;
                }
                if (event.results[i].isFinal) {
                    newFinalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Always update last speech time when we get ANY result (even interim)
            // This ensures the 5-second timer resets on any speech activity
            if (hasSpeech || interimTranscript.trim().length > 0 || newFinalTranscript.trim().length > 0) {
                this.lastSpeechTime = Date.now();
                this.startSilenceTimeout(); // Restart the 5-second timer
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
            
            // Clear silence timeout on error
            this.clearSilenceTimeout();
            
            // Don't stop on 'no-speech' errors - let our silence timeout handle it
            if (event.error === 'no-speech') {
                // Ignore no-speech errors - our timeout will handle silence
                return;
            } else if (event.error === 'not-allowed') {
                this.showAlert('Microphone access denied. Please enable microphone permissions in your browser settings.', 'error');
                this.stopSpeechRecognition();
            } else if (event.error === 'audio-capture') {
                this.showAlert('No microphone found. Please connect a microphone and try again.', 'error');
                this.stopSpeechRecognition();
            } else if (event.error === 'network') {
                this.showAlert('Network error. Please check your internet connection.', 'error');
                this.stopSpeechRecognition();
            } else {
                this.showAlert('Speech recognition error. Please try again.', 'error');
                this.stopSpeechRecognition();
            }
        };

        this.recognition.onend = () => {
            // The browser's speech recognition automatically ends after detecting speech
            // We need to restart it to keep listening, unless we've had 5 seconds of silence
            if (this.isListening) {
                // Check if it's been 5 seconds since last speech
                const timeSinceLastSpeech = Date.now() - (this.lastSpeechTime || Date.now());
                
                if (timeSinceLastSpeech >= 5000) {
                    // It's been 5+ seconds of silence, stop naturally
                    console.log('Stopping after 5 seconds of silence');
                    this.stopSpeechRecognition();
                } else {
                    // Restart recognition immediately to keep listening
                    // Use a small delay to avoid restart errors
                    setTimeout(() => {
                        if (this.isListening) {
                            try {
                                console.log('Restarting recognition to continue listening...');
                                this.recognition.start();
                            } catch (e) {
                                // If we can't restart (might already be starting), try again
                                if (e.message && !e.message.includes('already started')) {
                                    setTimeout(() => {
                                        if (this.isListening) {
                                            try {
                                                this.recognition.start();
                                            } catch (e2) {
                                                console.log('Second restart attempt failed:', e2.message);
                                            }
                                        }
                                    }, 200);
                                }
                            }
                        }
                    }, 100);
                }
            }
        };
    }

    toggleSpeechRecognition() {
        if (!this.recognition) {
            this.showAlert('Speech recognition is not supported in your browser. Please use Chrome or Edge.', 'error');
            return;
        }

        if (this.isListening) {
            // User clicked to stop - call stopSpeechRecognition to properly clean up
            this.stopSpeechRecognition();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                this.showAlert('Could not start speech recognition. Please try again.', 'error');
            }
        }
    }

    startSilenceTimeout() {
        // Clear any existing timeout
        this.clearSilenceTimeout();
        
        // Set a new timeout for 5 seconds
        this.silenceTimeout = setTimeout(() => {
            if (this.isListening) {
                console.log('5 seconds of silence detected, stopping recognition');
                this.stopSpeechRecognition();
            }
        }, 5000);
    }

    clearSilenceTimeout() {
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }
    }

    stopSpeechRecognition() {
        // Clear silence timeout
        this.clearSilenceTimeout();
        
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Ignore errors if already stopped
                console.log('Recognition already stopped');
            }
        }
        this.isListening = false;
        this.lastSpeechTime = null;
        // Don't reset finalTranscript - keep the text that was transcribed
        this.updateSpeechButton(false);
        
        // Hide tip
        const tip = document.getElementById('speech-tip');
        if (tip) {
            tip.style.display = 'none';
        }
        
        // Ensure button stays visible
        const speechBtn = document.getElementById('speech-btn');
        if (speechBtn) {
            speechBtn.style.display = 'flex';
            speechBtn.style.visibility = 'visible';
        }
    }

    updateSpeechButton(listening) {
        const speechBtn = document.getElementById('speech-btn');
        const speechIcon = document.getElementById('speech-icon');
        const speechStatus = document.getElementById('speech-status');
        
        if (speechBtn && speechIcon && speechStatus) {
            // Always ensure button is visible
            speechBtn.style.display = 'flex';
            speechBtn.style.visibility = 'visible';
            speechBtn.style.opacity = '1';
            
            if (listening) {
                speechBtn.style.backgroundColor = '#dc3545';
                // Change to stop icon
                speechIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
                speechStatus.style.display = 'inline';
            } else {
                speechBtn.style.backgroundColor = '';
                // Change back to microphone icon
                speechIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
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

        // Show/hide appropriate views based on tab
        const aiAssistantView = document.getElementById('ai-assistant-view');
        const messageBoxView = document.getElementById('message-box-view');
        const aiPreviewView = document.getElementById('ai-preview-view');
        
        // Hide all views first
        if (aiAssistantView) aiAssistantView.style.display = 'none';
        if (messageBoxView) messageBoxView.style.display = 'none';
        if (aiPreviewView) aiPreviewView.style.display = 'none';
        
        if (tabNumber === '1') {
            // AI Assistant tab - show circle indicator
            if (aiAssistantView) aiAssistantView.style.display = 'block';
        } else if (tabNumber === '4') {
            // AI Preview tab - show preview
            if (aiPreviewView) aiPreviewView.style.display = 'block';
        } else {
            // Other tabs (2 & 3) - show message box
            if (messageBoxView) messageBoxView.style.display = 'block';
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
        this.switchTab('1', 'AI Assistant');

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
        sendBtn.textContent = 'Processing with AI...';
        sendBtn.disabled = true;

        try {
            // Step 1: Get AI-generated message
            const aiResponse = await fetch('/api/generate-ai-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subject: subject,
                    originalMessage: body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() // Plain text version
                })
            });

            const aiResult = await aiResponse.json();
            
            if (!aiResult.success) {
                throw new Error(aiResult.error || 'Failed to generate AI message');
            }

            // Update AI preview tab with the generated message
            const aiPreviewBody = document.getElementById('ai-preview-body');
            if (aiPreviewBody) {
                aiPreviewBody.innerHTML = aiResult.aiMessage.replace(/\n/g, '<br>');
            }

            // Step 2: Send the AI-generated email
            sendBtn.textContent = 'Sending...';
            
            const formData = new FormData();
            formData.append('to', to);
            formData.append('subject', subject);
            formData.append('body', aiResult.aiMessage.replace(/\n/g, '<br>'));
            
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
                // Switch to AI Preview tab to show what was sent
                this.switchTab('4', 'AI Preview');
            } else {
                this.showAlert('Failed to send email: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            this.showAlert('Error sending email: ' + error.message, 'error');
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
