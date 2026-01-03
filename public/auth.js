/*
 * Authentication System for High Five Spirits Email Outreach Tool
 * Handles login/logout functionality and session management
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.loginScreen = document.getElementById('login-screen');
        this.homepage = document.getElementById('homepage');
        this.emailTool = document.getElementById('email-tool');
        this.loginForm = document.getElementById('login-form');
        this.logoutBtn = document.getElementById('logout-btn');
        this.openEmailToolBtn = document.getElementById('open-email-tool');
        
        console.log('AuthManager initialized');
        console.log('Login form found:', !!this.loginForm);
        console.log('Login screen found:', !!this.loginScreen);
        console.log('Homepage found:', !!this.homepage);
        
        this.initializeAuth();
        this.setupEventListeners();
    }

    validateGmailCredentials(email, appPassword) {
        // Allow Gmail addresses and the specific High Five Spirits email
        const allowedDomains = ['gmail.com', 'highfivespirits.com'];
        const emailDomain = email.split('@')[1];
        
        if (!allowedDomains.includes(emailDomain)) {
            return { success: false, message: 'Please enter a valid Gmail address or your High Five Spirits email address.' };
        }

        // For Gmail and Google Workspace accounts, require 16-character app password
        if ((email.includes('@gmail.com') || email.includes('@highfivespirits.com')) && (!appPassword || appPassword.length < 16)) {
            return { success: false, message: 'Please enter a valid 16-character App Password.' };
        }

        if (!appPassword || appPassword.length < 1) {
            return { success: false, message: 'Please enter your email password.' };
        }

        return { success: true };
    }

    async validateEmailAgainstAllowlist(email) {
        try {
            const response = await fetch('/api/validate-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });

            if (!response.ok) {
                console.error('API endpoint not available, using fallback validation');
                // Fallback: Check against hardcoded allowed emails
                const allowedEmails = [
                    'gypsy@highfivespirits.com',
                    'maxwcoop@gmail.com',
                    'weman4444@gmail.com',
                    'daniokoy12@gmail.com'
                ];
                
                if (allowedEmails.includes(email.toLowerCase())) {
                    return { success: true };
                } else {
                    return { 
                        success: false, 
                        message: 'Your email address is not authorized to access this system. Please contact an administrator.' 
                    };
                }
            }

            const result = await response.json();
            
            if (result.success && result.allowed) {
                return { success: true };
            } else {
                return { 
                    success: false, 
                    message: 'Your email address is not authorized to access this system. Please contact an administrator.' 
                };
            }
        } catch (error) {
            console.error('Error validating email:', error);
            console.log('Using fallback validation for:', email);
            
            // Fallback: Check against hardcoded allowed emails
            const allowedEmails = [
                'gypsy@highfivespirits.com',
                'maxwcoop@gmail.com',
                'weman4444@gmail.com',
                'daniokoy12@gmail.com'
            ];
            
            if (allowedEmails.includes(email.toLowerCase())) {
                return { success: true };
            } else {
                return { 
                    success: false, 
                    message: 'Your email address is not authorized to access this system. Please contact an administrator.' 
                };
            }
        }
    }

    initializeAuth() {
        // Check if user is already authenticated (session storage)
        const savedAuth = sessionStorage.getItem('highFiveAuth');
        if (savedAuth) {
            try {
                const authData = JSON.parse(savedAuth);
                if (authData.isAuthenticated && authData.user) {
                    this.isAuthenticated = true;
                    this.currentUser = authData.user;
                    this.showHomepage();
                    return;
                }
            } catch (error) {
                console.error('Error parsing saved auth data:', error);
                sessionStorage.removeItem('highFiveAuth');
            }
        }

        // Show login screen by default
        this.showLoginScreen();
    }

    setupEventListeners() {
        // Login form submission
        this.loginForm.addEventListener('submit', (e) => {
            console.log('Login form submitted');
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        this.logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        // Open email tool button
        this.openEmailToolBtn.addEventListener('click', () => {
            this.openEmailTool();
        });

        // Add back to homepage button functionality
        this.setupBackToHomepageButton();
    }

    async handleLogin() {
        console.log('Login attempt started');
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const appPassword = document.getElementById('app-password').value.trim();
        const errorDiv = document.getElementById('login-error');

        console.log('Login form data:', { name, email, appPassword: appPassword ? '***HIDDEN***' : 'NOT PROVIDED' });

        // Clear previous errors
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        // Validate input
        if (!name || !email || !appPassword) {
            console.log('Validation failed: missing fields');
            errorDiv.textContent = 'Please enter your name, email address, and password.';
            errorDiv.style.display = 'block';
            return;
        }

        // Validate Gmail credentials
        const validation = this.validateGmailCredentials(email, appPassword);
        if (!validation.success) {
            console.log('Gmail validation failed:', validation.message);
            errorDiv.textContent = validation.message;
            errorDiv.style.display = 'block';
            return;
        }

        console.log('Gmail validation passed, checking allowlist...');

        // Validate email against allowed list
        try {
            const emailValidation = await this.validateEmailAgainstAllowlist(email);
            if (!emailValidation.success) {
                console.log('Email allowlist validation failed:', emailValidation.message);
                errorDiv.textContent = emailValidation.message;
                errorDiv.style.display = 'block';
                return;
            }
            console.log('Email allowlist validation passed');
        } catch (error) {
            console.error('Error during email validation:', error);
            errorDiv.textContent = 'Error validating email. Please try again.';
            errorDiv.style.display = 'block';
            return;
        }

        console.log('All validations passed, proceeding with login');

        // Successful login
        this.isAuthenticated = true;
        this.currentUser = {
            email: email,
            appPassword: appPassword,
            name: name,
            loginTime: new Date().toISOString()
        };

        // Save to session storage
        sessionStorage.setItem('highFiveAuth', JSON.stringify({
            isAuthenticated: true,
            user: this.currentUser
        }));

        console.log('Login successful, showing homepage');

        // Show success message briefly
        this.showLoginSuccess();
        
        // Show homepage after brief delay
        setTimeout(() => {
            this.showHomepage();
        }, 1000);
    }


    handleLogout() {
        // Clear authentication
        this.isAuthenticated = false;
        this.currentUser = null;
        sessionStorage.removeItem('highFiveAuth');

        // Show login screen
        this.showLoginScreen();
    }

    showLoginScreen() {
        this.loginScreen.style.display = 'flex';
        this.homepage.style.display = 'none';
        this.emailTool.style.display = 'none';
        
        // Focus on username field
        setTimeout(() => {
            document.getElementById('username').focus();
        }, 100);
    }

    showHomepage() {
        this.loginScreen.style.display = 'none';
        this.homepage.style.display = 'flex';
        this.emailTool.style.display = 'none';
        
        // Update user info display
        this.updateUserInfo();
    }

    updateUserInfo() {
        const brandDiv = document.querySelector('.brand');
        if (brandDiv && this.currentUser) {
            // Add user info below the brand
            let userInfoDiv = document.getElementById('user-info');
            if (!userInfoDiv) {
                userInfoDiv = document.createElement('div');
                userInfoDiv.id = 'user-info';
                userInfoDiv.style.cssText = `
                    margin-top: 8px;
                    font-size: 14px;
                    color: #888;
                `;
                brandDiv.appendChild(userInfoDiv);
            }
            userInfoDiv.textContent = `Welcome, ${this.currentUser.name} (${this.currentUser.email})`;
        }
    }

    // Method to get current user's email settings for nodemailer
    getCurrentUserEmailSettings() {
        if (!this.isAuthenticated || !this.currentUser) {
            console.log('AuthManager: User not authenticated or no current user');
            return null;
        }

        // Configure SMTP settings based on email domain
        let host, port;
        if (this.currentUser.email.includes('@gmail.com')) {
            host = 'smtp.gmail.com';
            port = 587;
        } else if (this.currentUser.email.includes('@highfivespirits.com')) {
            // For High Five Spirits domain - Google Workspace (G Suite)
            // Google Workspace uses Gmail SMTP with custom domains
            host = 'smtp.gmail.com';
            port = 587;
        } else {
            // Default to Gmail for other domains
            host = 'smtp.gmail.com';
            port = 587;
        }

        const settings = {
            host: host,
            port: port,
            user: this.currentUser.email,
            pass: this.currentUser.appPassword,
            name: this.currentUser.name
        };
        
        console.log('AuthManager: Generated email settings:', {
            host: settings.host,
            port: settings.port,
            user: settings.user,
            pass: settings.pass ? '***HIDDEN***' : 'NOT PROVIDED',
            name: settings.name
        });
        
        return settings;
    }

    openEmailTool() {
        this.loginScreen.style.display = 'none';
        this.homepage.style.display = 'none';
        this.emailTool.style.display = 'flex';
        
        // Update user config from current authentication
        if (window.app && window.app.updateUserConfigFromAuth) {
            window.app.updateUserConfigFromAuth();
        }
        
        // Initialize the email tool if not already done
        if (typeof window.app === 'undefined' || window.app === null) {
            // Wait for the main.js to load and initialize
            setTimeout(() => {
                if (typeof window.EmailOutreachApp !== 'undefined') {
                    window.app = new window.EmailOutreachApp();
                } else if (typeof window.initializeEmailTool !== 'undefined') {
                    window.app = window.initializeEmailTool();
                }
            }, 100);
        }
    }

    setupBackToHomepageButton() {
        // Add a back button to the email tool
        const emailTool = document.getElementById('email-tool');
        const leftPanel = emailTool?.querySelector('.left-panel');
        
        if (leftPanel) {
            // Ensure left panel has position relative for absolute positioning
            leftPanel.style.position = 'relative';
            
            // Create back button
            const backButton = document.createElement('button');
            backButton.id = 'back-to-homepage';
            backButton.innerHTML = '← Back';
            backButton.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: #007acc;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                z-index: 999;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            
            backButton.addEventListener('click', () => {
                this.showHomepage();
            });
            
            backButton.addEventListener('mouseenter', () => {
                backButton.style.backgroundColor = '#0056b3';
                backButton.style.transform = 'translateY(-1px)';
                backButton.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
            });
            
            backButton.addEventListener('mouseleave', () => {
                backButton.style.backgroundColor = '#007acc';
                backButton.style.transform = 'translateY(0)';
                backButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            });
            
            leftPanel.appendChild(backButton);
        }
    }

    showLoginSuccess() {
        const loginBtn = document.querySelector('.login-btn');
        const originalText = loginBtn.textContent;
        const originalBg = loginBtn.style.background;
        
        loginBtn.textContent = '✓ Login Successful!';
        loginBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        
        setTimeout(() => {
            loginBtn.textContent = originalText;
            loginBtn.style.background = originalBg;
        }, 2000);
    }

    // Public method to check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Public method to get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
