/*
 * Email Outreach Tool - TypeScript Implementation
 * 
 * IMPORTANT: This TypeScript file needs to be compiled to JavaScript before use.
 * Run: tsc main.ts
 * This will generate main.js which should be linked in the HTML file.
 */

// Type definitions
interface Prospect {
    id: number;
    companyName: string;
    companyOverview: string;
    discoveredEmails: string[];
    subjectiveInfo: string;
    websiteUrl: string;
    contactName?: string;
    contactEmail?: string;
    phoneNumber?: string;
    revenue?: string;
    location?: string;
}

interface UserConfig {
    yourName: string;
    yourCompany: string;
    yourPhone: string;
    yourEmail: string;
    emailSubject: string;
}

// Extend Window interface for database manager
interface Window {
    databaseManager?: {
        addEmail: (emailData: any) => Promise<boolean>;
    };
}

// Sample data - replace with your actual prospect data
const prospects: Prospect[] = [
    {
        id: 1,
        companyName: "Gypsy Spirits (also known as High Five Spirits)",
        companyOverview: "Michigan-based craft distillery producing award-winning vodka, gin, rum, and whiskey. Their flagship Gypsy Vodka is gluten-free, non-GMO, keto-friendly, and distilled 7x using artesian spring water and corn. Won \"The Best Tasting Vodka in America\" from The Fifty Best Awards in 2020. They operate multiple tasting rooms including Gypsy Distillery in Petoskey (5251 Charlevoix Ave) - a converted equestrian center featuring a craft cocktail tasting room, cocktail garden, and event spaces. Founded by brothers Michael and Adam Kazanowski.",
        discoveredEmails: ["mwcooper@umich.edu"],
        subjectiveInfo: "Direct competitor in premium vodka space with established Michigan presence. They already make an Apple Pie Vodka (limited edition), so they're in the exact same flavored vodka category. Strong local branding, multiple physical locations, and event venue capabilities suggest they're well-established. Revenue ~$5.7M indicates mid-sized craft operation with solid distribution. Phone: (231) 867-0800. May not be a good prospect since they already produce their own flavored vodkas including apple pie.",
        websiteUrl: "https://gypsyvodka.com/",
        contactName: "Michael Kazanowski",
        contactEmail: "mwcooper@umich.edu",
        phoneNumber: "(231) 867-0800",
        revenue: "$5.7M",
        location: "Michigan"
    }
];

// User configuration - customize these values
const userConfig: UserConfig = {
    yourName: "Max Cooper",
    yourCompany: "Your Company",
    yourPhone: "(555) 123-4567",
    yourEmail: "your.email@company.com",
    emailSubject: "Apple Pie Vodka Conversation"
};

// Interface for saved email edits
interface SavedEmailEdit {
    to: string;
    subject: string;
    body: string;
    isCustomized: boolean;
}

// Application state
class EmailOutreachApp {
    private currentIndex: number = 0;
    private isEditing: boolean = false;
    private companiesWithoutEmail: string[] = [];
    private savedEdits: Map<number, SavedEmailEdit> = new Map();
    private sentProspects: Set<number> = new Set(); // Track which prospects have been sent
    private availableProspects: number[] = []; // Track available prospect indices

    constructor() {
        this.initializeApp();
        this.setupEventListeners();
        this.findCompaniesWithoutEmail();
        this.displayCurrentProspect();
    }

    private initializeApp(): void {
        // Initialize the app with the first prospect
        this.currentIndex = 0;
        this.isEditing = false;
        this.initializeAvailableProspects();
    }

    private initializeAvailableProspects(): void {
        // Start with all prospects available
        this.availableProspects = prospects.map((_, index) => index);
    }

    private setupEventListeners(): void {
        // Navigation buttons
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        const editBtn = document.getElementById('edit-btn') as HTMLButtonElement;
        const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

        prevBtn?.addEventListener('click', () => this.previousProspect());
        nextBtn?.addEventListener('click', () => this.nextProspect());
        editBtn?.addEventListener('click', () => this.toggleEditMode());
        sendBtn?.addEventListener('click', () => this.sendEmail());

        // Make email fields editable on click
        const emailTo = document.getElementById('email-to') as HTMLSpanElement;
        const emailSubject = document.getElementById('email-subject') as HTMLSpanElement;

        emailTo?.addEventListener('click', () => this.makeFieldEditable('email-to'));
        emailSubject?.addEventListener('click', () => this.makeFieldEditable('email-subject'));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.previousProspect();
            if (e.key === 'ArrowRight') this.nextProspect();
            if (e.key === 'Escape' && this.isEditing) this.toggleEditMode();
        });
    }

    private findCompaniesWithoutEmail(): void {
        this.companiesWithoutEmail = prospects
            .filter(prospect => !prospect.contactEmail || prospect.contactEmail.trim() === '')
            .map(prospect => prospect.companyName);
        
        this.displayErrorPanel();
    }

    private displayErrorPanel(): void {
        const errorPanel = document.getElementById('error-panel') as HTMLDivElement;
        const errorList = document.getElementById('error-list') as HTMLUListElement;

        if (this.companiesWithoutEmail.length > 0) {
            errorPanel.style.display = 'block';
            errorList.innerHTML = this.companiesWithoutEmail
                .map(company => `<li>${company}</li>`)
                .join('');
        } else {
            errorPanel.style.display = 'none';
        }
    }

    private displayCurrentProspect(): void {
        const prospect = prospects[this.currentIndex];
        if (!prospect) return;

        // Update left panel
        this.updateElement('prospect-url', prospect.websiteUrl);
        this.updateElement('scraped-url', prospect.websiteUrl);
        this.updateElement('company-name', prospect.companyName);
        this.updateElement('company-overview', prospect.companyOverview);
        this.updateElement('discovered-emails', prospect.discoveredEmails.join(', '));
        this.updateElement('subjective-info', prospect.subjectiveInfo);

        // Check if we have saved edits for this prospect
        const savedEdit = this.savedEdits.get(this.currentIndex);
        
        if (savedEdit) {
            // Restore saved edits
            this.updateElement('email-to', savedEdit.to);
            this.updateElement('email-subject', savedEdit.subject);
            this.restoreEmailBody(savedEdit.body);
            this.updateCustomizationIndicator(true);
        } else {
            // Show template only for the first prospect (Gypsy Spirits), blank for others
            if (this.currentIndex === 0) {
                // First prospect gets the full template
                this.updateElement('email-to', prospect.contactEmail || 'No email available');
                this.updateElement('email-subject', userConfig.emailSubject);
                this.updateEmailBody(prospect);
            } else {
                // Other prospects get blank template
                this.updateElement('email-to', prospect.contactEmail || '');
                this.updateElement('email-subject', '');
                this.updateBlankEmailBody(prospect);
            }
            this.updateCustomizationIndicator(false);
        }

        this.updatePageCounter();
    }

    private updateElement(id: string, content: string): void {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    private updatePageCounter(): void {
        const counter = document.getElementById('page-counter');
        if (counter) {
            const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
            const totalAvailable = this.availableProspects.length;
            counter.textContent = `${currentAvailableIndex + 1}/${totalAvailable}`;
        }
    }

    private updateEmailBody(prospect: Prospect): void {
        const emailBody = document.getElementById('email-body') as HTMLDivElement;
        if (!emailBody) return;

        const template = this.getEmailTemplate();
        const populatedTemplate = this.populateTemplate(template, prospect);
        
        emailBody.innerHTML = populatedTemplate;
    }

    private updateBlankEmailBody(prospect: Prospect): void {
        const emailBody = document.getElementById('email-body') as HTMLDivElement;
        if (!emailBody) return;

        const template = this.getBlankEmailTemplate();
        const populatedTemplate = this.populateTemplate(template, prospect);
        
        emailBody.innerHTML = populatedTemplate;
    }

    private restoreEmailBody(bodyContent: string): void {
        const emailBody = document.getElementById('email-body') as HTMLDivElement;
        if (!emailBody) return;

        // Since we're now saving HTML content, use it directly
        emailBody.innerHTML = bodyContent;
    }

    private saveCurrentEdits(): void {
        const emailToField = document.getElementById('email-to') as HTMLSpanElement;
        const emailSubjectField = document.getElementById('email-subject') as HTMLSpanElement;
        const emailBody = document.getElementById('email-body') as HTMLDivElement;

        if (!emailToField || !emailSubjectField || !emailBody) return;

        const toEmail = emailToField.textContent || '';
        const subject = emailSubjectField.textContent || '';
        
        // Save the HTML content to preserve formatting
        const bodyHTML = emailBody.innerHTML;
        const bodyText = emailBody.innerText || emailBody.textContent || '';

        // Only save if there are actual changes from the default
        const prospect = prospects[this.currentIndex];
        
        // Different defaults based on prospect index
        let defaultTo, defaultSubject, defaultBody;
        
        if (this.currentIndex === 0) {
            // First prospect (Gypsy Spirits) uses full template
            defaultTo = prospect.contactEmail || 'No email available';
            defaultSubject = userConfig.emailSubject;
            defaultBody = this.populateTemplate(this.getEmailTemplate(), prospect);
        } else {
            // Other prospects use blank template
            defaultTo = prospect.contactEmail || '';
            defaultSubject = '';
            defaultBody = this.populateTemplate(this.getBlankEmailTemplate(), prospect);
        }

        const isCustomized = toEmail !== defaultTo || 
                           subject !== defaultSubject || 
                           bodyHTML !== defaultBody;

        if (isCustomized) {
            this.savedEdits.set(this.currentIndex, {
                to: toEmail,
                subject: subject,
                body: bodyHTML, // Save HTML content instead of plain text
                isCustomized: true
            });
        } else {
            // Remove saved edit if it matches defaults
            this.savedEdits.delete(this.currentIndex);
        }
    }

    private updateCustomizationIndicator(isCustomized: boolean): void {
        const pageCounter = document.getElementById('page-counter');
        if (!pageCounter) return;

        const baseText = `${this.currentIndex + 1}/${prospects.length}`;
        pageCounter.textContent = isCustomized ? `${baseText} *` : baseText;
    }

    private getEmailTemplate(): string {
        return `
            <p>Hi [Contact Name],</p>
            <br>
            <p></p>
            <br>
            <p></p>
            <br>
            <p></p>
            <br>
            <p></p>
            <br>
            <p>Best,</p>
            <p>[Your Name]</p>
            <p>[Phone Number]</p>
            <p>[Email]</p>
        `;
    }

    private getBlankEmailTemplate(): string {
        return `<p>Hi [Contact Name],</p><br><br><p>Best,</p><p>[Your Name]</p><p>[Your Company]</p><p>[Phone Number]</p><p>[Email]</p>`;
    }

    private populateTemplate(template: string, prospect: Prospect): string {
        return template
            .replace(/\[Contact Name\]/g, prospect.contactName || 'Valued Customer')
            .replace(/\[Your Name\]/g, userConfig.yourName)
            .replace(/\[Your Company\]/g, userConfig.yourCompany)
            .replace(/\[Phone Number\]/g, userConfig.yourPhone)
            .replace(/\[Email\]/g, userConfig.yourEmail);
    }

    private previousProspect(): void {
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (currentAvailableIndex > 0) {
            // Save current edits before navigating away
            this.saveCurrentEdits();
            
            this.currentIndex = this.availableProspects[currentAvailableIndex - 1];
            this.displayCurrentProspect();
            this.updateNavigationButtons();
        }
    }

    private nextProspect(): void {
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (currentAvailableIndex < this.availableProspects.length - 1) {
            // Save current edits before navigating away
            this.saveCurrentEdits();
            
            this.currentIndex = this.availableProspects[currentAvailableIndex + 1];
            this.displayCurrentProspect();
            this.updateNavigationButtons();
        }
    }

    private moveToNextProspect(): void {
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (currentAvailableIndex < this.availableProspects.length - 1) {
            // Move to next available prospect
            this.nextProspect();
        } else {
            // All emails sent - show completion message
            this.showCompletionMessage();
        }
    }

    private removeSentProspect(prospectIndex: number): void {
        // Mark as sent
        this.sentProspects.add(prospectIndex);
        
        // Remove from available prospects
        const availableIndex = this.availableProspects.indexOf(prospectIndex);
        if (availableIndex > -1) {
            this.availableProspects.splice(availableIndex, 1);
        }
        
        // Remove saved edits for this prospect
        this.savedEdits.delete(prospectIndex);
        
        console.log(`Prospect ${prospectIndex} removed from available list. Remaining: ${this.availableProspects.length}`);
    }

    private showCompletionMessage(): void {
        // Only hide the right panel content, keep left panel visible
        const rightPanel = document.querySelector('.right-panel') as HTMLElement;
        
        if (rightPanel) {
            // Hide the email content
            const emailContent = rightPanel.querySelector('.email-content') as HTMLElement;
            const emailControls = rightPanel.querySelector('.email-controls') as HTMLElement;
            
            if (emailContent) emailContent.style.display = 'none';
            if (emailControls) emailControls.style.display = 'none';
        }

        // Create completion message in the right panel
        const completionDiv = document.createElement('div');
        completionDiv.id = 'completion-message';
        completionDiv.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            background-color: #1a1a1a;
            color: #e0e0e0;
            text-align: center;
        `;

        completionDiv.innerHTML = `
            <div style="max-width: 500px;">
                <div style="margin-bottom: 30px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;"></div>
                    <h1 style="color: #28a745; font-size: 2rem; margin-bottom: 15px; font-weight: 600;">All Emails Sent!</h1>
                    <p style="font-size: 1rem; color: #ccc; line-height: 1.5;">
                        You've successfully sent emails to all prospects in your current list.
                    </p>
                </div>
                
                <div style="background-color: #2a2a2a; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #404040;">
                    <h3 style="color: #007acc; margin-bottom: 20px; font-size: 1.1rem; font-weight: 600;">Next Steps</h3>
                    <div style="text-align: left; color: #e0e0e0;">
                        <div style="margin-bottom: 12px; display: flex; align-items: center;">
                            <span style="color: #28a745; margin-right: 10px;">-</span>
                            <span>Add more prospects to your list</span>
                        </div>
                        <div style="margin-bottom: 12px; display: flex; align-items: center;">
                            <span style="color: #28a745; margin-right: 10px;">-</span>
                            <span>Upload new prospect data</span>
                        </div>
                        <div style="margin-bottom: 12px; display: flex; align-items: center;">
                            <span style="color: #28a745; margin-right: 10px;">-</span>
                            <span>Review and follow up on sent emails</span>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button id="restart-btn" style="
                        background-color: #007acc;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-width: 120px;
                    " onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007acc'">
                        Start Over
                    </button>
                    <button id="add-prospects-btn" style="
                        background-color: #28a745;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-width: 120px;
                    " onmouseover="this.style.backgroundColor='#1e7e34'" onmouseout="this.style.backgroundColor='#28a745'">
                        Add Prospects
                    </button>
                </div>
            </div>
        `;

        // Add to right panel
        const rightPanelElement = document.querySelector('.right-panel') as HTMLElement;
        if (rightPanelElement) {
            rightPanelElement.appendChild(completionDiv);
        }

        // Add event listeners for buttons
        const restartBtn = document.getElementById('restart-btn');
        const addProspectsBtn = document.getElementById('add-prospects-btn');

        restartBtn?.addEventListener('click', () => {
            this.restartApplication();
        });

        addProspectsBtn?.addEventListener('click', () => {
            this.showAddProspectsMessage();
        });
    }

    private restartApplication(): void {
        // Remove completion message
        const completionDiv = document.getElementById('completion-message');
        if (completionDiv) {
            completionDiv.remove();
        }

        // Show email content and controls again
        const rightPanel = document.querySelector('.right-panel') as HTMLElement;
        if (rightPanel) {
            const emailContent = rightPanel.querySelector('.email-content') as HTMLElement;
            const emailControls = rightPanel.querySelector('.email-controls') as HTMLElement;
            
            if (emailContent) emailContent.style.display = 'flex';
            if (emailControls) emailControls.style.display = 'flex';
        }

        // Reset to first prospect
        this.currentIndex = 0;
        this.savedEdits.clear();
        this.sentProspects.clear();
        this.initializeAvailableProspects();
        this.displayCurrentProspect();
        this.updateNavigationButtons();
    }

    private showAddProspectsMessage(): void {
        const completionDiv = document.getElementById('completion-message');
        if (!completionDiv) return;

        // Replace the content with detailed instructions
        completionDiv.innerHTML = `
            <div style="max-width: 500px;">
                <div style="margin-bottom: 30px;">
                    <div style="font-size: 3rem; margin-bottom: 20px;">+</div>
                    <h1 style="color: #007acc; font-size: 1.8rem; margin-bottom: 15px; font-weight: 600;">Add More Prospects</h1>
                    <p style="font-size: 1rem; color: #ccc; line-height: 1.5;">
                        Follow these steps to add new prospects to your outreach list.
                    </p>
                </div>
                
                <div style="background-color: #2a2a2a; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #404040;">
                    <h3 style="color: #28a745; margin-bottom: 20px; font-size: 1.1rem; font-weight: 600;">Instructions</h3>
                    <div style="text-align: left; color: #e0e0e0;">
                        <div style="margin-bottom: 15px; padding: 15px; background-color: #333; border-radius: 8px; border-left: 4px solid #007acc;">
                            <div style="font-weight: 600; color: #007acc; margin-bottom: 8px;">Step 1: Edit the prospects array</div>
                            <div style="font-size: 0.9rem; color: #ccc;">Open <code style="background-color: #444; padding: 2px 6px; border-radius: 4px;">src/main.ts</code> and find the <code style="background-color: #444; padding: 2px 6px; border-radius: 4px;">prospects</code> array</div>
                        </div>
                        <div style="margin-bottom: 15px; padding: 15px; background-color: #333; border-radius: 8px; border-left: 4px solid #28a745;">
                            <div style="font-weight: 600; color: #28a745; margin-bottom: 8px;">Step 2: Add new prospect objects</div>
                            <div style="font-size: 0.9rem; color: #ccc;">Add new objects with company details, emails, and contact information</div>
                        </div>
                        <div style="margin-bottom: 15px; padding: 15px; background-color: #333; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <div style="font-weight: 600; color: #ffc107; margin-bottom: 8px;">Step 3: Restart the application</div>
                            <div style="font-size: 0.9rem; color: #ccc;">Run <code style="background-color: #444; padding: 2px 6px; border-radius: 4px;">npm run build && npm start</code> to apply changes</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button id="back-to-completion-btn" style="
                        background-color: #6c757d;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-width: 120px;
                    " onmouseover="this.style.backgroundColor='#5a6268'" onmouseout="this.style.backgroundColor='#6c757d'">
                        Back
                    </button>
                    <button id="restart-btn" style="
                        background-color: #007acc;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        min-width: 120px;
                    " onmouseover="this.style.backgroundColor='#0056b3'" onmouseout="this.style.backgroundColor='#007acc'">
                        Start Over
                    </button>
                </div>
            </div>
        `;

        // Add event listeners for the new buttons
        const backBtn = document.getElementById('back-to-completion-btn');
        const restartBtn = document.getElementById('restart-btn');

        backBtn?.addEventListener('click', () => {
            this.showCompletionMessage(); // Go back to the main completion screen
        });

        restartBtn?.addEventListener('click', () => {
            this.restartApplication();
        });
    }

    private updateNavigationButtons(): void {
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;

        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        
        if (prevBtn) prevBtn.disabled = currentAvailableIndex === 0;
        if (nextBtn) nextBtn.disabled = currentAvailableIndex === this.availableProspects.length - 1;
    }

    private makeFieldEditable(fieldId: string): void {
        const field = document.getElementById(fieldId) as HTMLSpanElement;
        if (!field) return;

        // Store original content
        const originalContent = field.textContent || '';
        
        // Make field editable
        field.contentEditable = 'true';
        field.focus();
        
        // Add visual indication
        field.style.backgroundColor = '#333';
        field.style.border = '2px solid #007acc';
        field.style.borderRadius = '4px';
        field.style.padding = '4px 8px';
        field.style.outline = 'none';
        
        // Handle save on blur or Enter key
        const saveField = () => {
            field.contentEditable = 'false';
            field.style.backgroundColor = '';
            field.style.border = '';
            field.style.borderRadius = '';
            field.style.padding = '';
            field.style.outline = '';
            
            // Save the edit after field is updated
            this.saveCurrentEdits();
        };

        field.addEventListener('blur', saveField, { once: true });
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveField();
            }
            if (e.key === 'Escape') {
                field.textContent = originalContent;
                saveField();
            }
        }, { once: true });
    }

    private toggleEditMode(): void {
        const emailBody = document.getElementById('email-body') as HTMLDivElement;
        const editBtn = document.getElementById('edit-btn') as HTMLButtonElement;

        if (!emailBody || !editBtn) return;

        this.isEditing = !this.isEditing;
        emailBody.contentEditable = this.isEditing.toString();
        
        if (this.isEditing) {
            editBtn.textContent = 'SAVE MESSAGE';
            editBtn.style.backgroundColor = '#007acc';
            emailBody.focus();
        } else {
            editBtn.textContent = 'EDIT MESSAGE';
            editBtn.style.backgroundColor = '#404040';
            
            // Save edits when exiting edit mode
            this.saveCurrentEdits();
        }
    }

    private async sendEmail(): Promise<void> {
        const prospect = prospects[this.currentIndex];
        if (!prospect) {
            this.showAlert('No prospect data available.', 'error');
            return;
        }

        // Get current values from editable fields
        const emailToField = document.getElementById('email-to') as HTMLSpanElement;
        const emailSubjectField = document.getElementById('email-subject') as HTMLSpanElement;
        const emailBody = document.getElementById('email-body') as HTMLDivElement;

        if (!emailToField || !emailSubjectField || !emailBody) return;

        const toEmail = emailToField.textContent || '';
        const subject = emailSubjectField.textContent || '';
        const bodyText = emailBody.innerText || emailBody.textContent || '';

        if (!toEmail || toEmail.trim() === '') {
            this.showAlert('Please enter a valid email address.', 'error');
            return;
        }

        if (!subject || subject.trim() === '') {
            this.showAlert('Please enter a subject line.', 'error');
            return;
        }

        // Show loading state
        const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
        const originalText = sendBtn.textContent;
        sendBtn.textContent = 'SENDING...';
        sendBtn.disabled = true;

        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: toEmail,
                    subject: subject,
                    body: bodyText,
                    fromName: userConfig.yourName,
                    fromEmail: userConfig.yourEmail
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`Email sent successfully to ${toEmail}!`, 'success');
                console.log('Email sent:', result.messageId);
                
                // Track the email in the database
                await this.trackEmailInDatabase(prospect, toEmail, subject, result.messageId);
                
                // Remove this prospect from the available list
                this.removeSentProspect(this.currentIndex);
                
                // Auto-navigate to next prospect after successful send
                setTimeout(() => {
                    this.moveToNextProspect();
                }, 1500); // Wait 1.5 seconds to show success message
            } else {
                this.showAlert(`Failed to send email: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            this.showAlert('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            sendBtn.textContent = originalText;
            sendBtn.disabled = false;
        }
    }

    private async trackEmailInDatabase(prospect: Prospect, toEmail: string, subject: string, messageId: string): Promise<void> {
        try {
            // Get user email from session or config
            const userEmail = userConfig.yourEmail || 'unknown@example.com';
            
            const emailData = {
                companyName: prospect.companyName,
                contactName: prospect.contactName || 'N/A',
                email: toEmail,
                subject: subject,
                messageId: messageId,
                sentBy: userEmail
            };

            // Use the database manager if available
            if (window.databaseManager) {
                await window.databaseManager.addEmail(emailData);
            } else {
                // Fallback: direct API call
                const response = await fetch('/api/emails/track', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(emailData)
                });

                const result = await response.json();
                if (!result.success) {
                    console.error('Failed to track email:', result.error);
                }
            }
        } catch (error) {
            console.error('Error tracking email:', error);
        }
    }

    private showAlert(message: string, type: 'success' | 'error'): void {
        // Create or update alert element
        let alertElement = document.getElementById('alert-message');
        if (!alertElement) {
            alertElement = document.createElement('div');
            alertElement.id = 'alert-message';
            alertElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 1000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(alertElement);
        }

        alertElement.textContent = message;
        alertElement.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
        alertElement.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EmailOutreachApp();
});
