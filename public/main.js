/*
 * Email Outreach Tool - TypeScript Implementation
 *
 * IMPORTANT: This TypeScript file needs to be compiled to JavaScript before use.
 * Run: tsc main.ts
 * This will generate main.js which should be linked in the HTML file.
 */
// Sample data - replace with your actual prospect data
const prospects = [
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
// User configuration - will be populated from login
const userConfig = {
    yourName: "",
    yourCompany: "High Five Spirits",
    yourPhone: "",
    yourEmail: "",
    emailSubject: "Apple Pie Vodka Conversation"
};
// Application state
class EmailOutreachApp {
    constructor() {
        this.currentIndex = 0;
        this.isEditing = false;
        this.companiesWithoutEmail = [];
        this.savedEdits = new Map();
        this.sentProspects = new Set(); // Track which prospects have been sent
        this.availableProspects = []; // Track available prospect indices
        this.globalEmailTemplate = null; // Store the global email template
        this.globalSubjectLine = ''; // Store the global subject line
        this.globalAttachments = []; // Store global email attachments
        this.uploadedProspects = []; // Store prospects from uploaded JSON
        this.initializeApp();
        this.setupEventListeners();
        this.findCompaniesWithoutEmail();
        this.displayCurrentProspect();
        this.updateUserConfigFromAuth();
    }
    initializeApp() {
        // Initialize the app with the first prospect
        this.currentIndex = 0;
        this.isEditing = false;
        this.initializeAvailableProspects();
    }

    updateUserConfigFromAuth() {
        // Update userConfig with data from authenticated user
        if (window.authManager && window.authManager.isUserAuthenticated()) {
            const currentUser = window.authManager.getCurrentUser();
            if (currentUser) {
                userConfig.yourName = currentUser.name;
                userConfig.yourEmail = currentUser.email;
                // You can add phone number input later if needed
                userConfig.yourPhone = ""; // Will be empty until user provides it
                
                console.log('Updated userConfig:', userConfig);
            }
        }
    }
    initializeAvailableProspects() {
        // Start with all prospects available
        this.availableProspects = prospects.map((_, index) => index);
    }
    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const sendBtn = document.getElementById('send-btn');
        const deleteBtn = document.getElementById('delete-btn');
        prevBtn?.addEventListener('click', () => this.previousProspect());
        nextBtn?.addEventListener('click', () => this.nextProspect());
        sendBtn?.addEventListener('click', () => this.sendEmail());
        deleteBtn?.addEventListener('click', () => this.deleteCurrentProspect());
        
        // New control buttons
        const saveContextBtn = document.getElementById('save-context-btn');
        const clearTemplateBtn = document.getElementById('clear-template-btn');
        const jsonFileInput = document.getElementById('json-file-input');
        const jsonFileNameLabel = document.getElementById('json-file-name');
        const attachmentBtn = document.getElementById('attachment-btn');
        const attachmentInput = document.getElementById('email-attachment-input');
        
        saveContextBtn?.addEventListener('click', () => this.saveEmailContext());
        clearTemplateBtn?.addEventListener('click', () => this.clearTemplateEditor());
        jsonFileInput?.addEventListener('change', (e) => {
            this.handleJsonFileUpload(e);
            if (jsonFileNameLabel) {
                jsonFileNameLabel.textContent = e.target.files?.[0]?.name || 'No file selected';
            }
        });
        attachmentBtn?.addEventListener('click', () => attachmentInput?.click());
        attachmentInput?.addEventListener('change', (e) => this.handleAttachmentUpload(e));

        this.refreshTemplateEditor();
        
        // Make email fields editable on click
        const emailTo = document.getElementById('email-to');
        const emailSubject = document.getElementById('email-subject');
        const emailBody = document.getElementById('email-body');
        
        emailTo?.addEventListener('click', () => this.makeFieldEditable('email-to'));
        emailSubject?.addEventListener('click', () => this.makeFieldEditable('email-subject'));
        emailBody?.addEventListener('click', () => this.makeEmailBodyEditable());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft')
                this.previousProspect();
            if (e.key === 'ArrowRight')
                this.nextProspect();
            if (e.key === 'Escape' && this.isEditing) {
                this.exitEditMode();
            }
        });
        
        // Drag and drop functionality for email body
        this.setupDragAndDrop();
        
        // Drag and drop functionality for email template
        this.setupTemplateDragAndDrop();
    }
    
    setupDragAndDrop() {
        const emailBodyContainer = document.querySelector('.email-body-container');
        const emailBody = document.getElementById('email-body');
        const dragOverlay = document.getElementById('drag-overlay');
        
        if (!emailBodyContainer || !emailBody || !dragOverlay) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            emailBodyContainer.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            emailBodyContainer.addEventListener(eventName, () => {
                emailBodyContainer.classList.add('drag-active');
                dragOverlay.style.display = 'flex';
            }, false);
        });
        
        // Remove highlight when item leaves drop area
        ['dragleave', 'drop'].forEach(eventName => {
            emailBodyContainer.addEventListener(eventName, () => {
                emailBodyContainer.classList.remove('drag-active');
                dragOverlay.style.display = 'none';
            }, false);
        });
        
        // Handle dropped files
        emailBodyContainer.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            this.handleDroppedFiles(files);
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleDroppedFiles(files) {
        const fileArray = Array.from(files);
        const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showAlert('Please drop only image files.', 'error');
            return;
        }
        
        // Process each image file
        imageFiles.forEach(file => {
            this.processImageFile(file);
        });
        
        this.showAlert(`Added ${imageFiles.length} image(s) to email body.`, 'success');
    }
    
    setupTemplateDragAndDrop() {
        const templateEditorContainer = document.querySelector('.template-editor-container');
        const templateEditor = document.getElementById('email-context-textarea');
        const dragOverlay = document.getElementById('drag-overlay-template');
        
        if (!templateEditorContainer || !templateEditor || !dragOverlay) return;
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            templateEditorContainer.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            templateEditorContainer.addEventListener(eventName, () => {
                templateEditorContainer.classList.add('drag-active');
                dragOverlay.style.display = 'flex';
            }, false);
        });
        
        // Remove highlight when item leaves drop area
        ['dragleave', 'drop'].forEach(eventName => {
            templateEditorContainer.addEventListener(eventName, () => {
                templateEditorContainer.classList.remove('drag-active');
                dragOverlay.style.display = 'none';
            }, false);
        });
        
        // Handle dropped files
        templateEditorContainer.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            this.handleTemplateDroppedFiles(files, templateEditor);
        }, false);
    }
    
    handleTemplateDroppedFiles(files, templateEditor) {
        const fileArray = Array.from(files);
        const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            this.showAlert('Please drop only image files.', 'error');
            return;
        }
        
        // Process each image file and add to template
        imageFiles.forEach(file => {
            this.processTemplateImageFile(file, templateEditor);
        });
        
        this.showAlert(`Added ${imageFiles.length} image(s) to email template.`, 'success');
    }
    
    processTemplateImageFile(file, templateEditor) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '10px 0';
            img.style.borderRadius = '4px';
            img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            img.style.cursor = 'grab';
            img.style.objectFit = 'contain';
            img.className = 'resizable-image draggable-image';
            img.draggable = true;
            
            // Add a wrapper div for better styling and resize functionality
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'image-wrapper';
            imgWrapper.style.textAlign = 'center';
            imgWrapper.style.margin = '15px 0';
            imgWrapper.style.position = 'relative';
            imgWrapper.style.display = 'inline-block';
            imgWrapper.appendChild(img);
            
            // Add resize handles
            this.addResizeHandles(imgWrapper, img);
            
            // Insert the image at the end of the template editor
            templateEditor.appendChild(imgWrapper);
            
            // Add drag functionality for moving images within template
            this.setupTemplateImageDrag(imgWrapper, img, templateEditor);
        };
        
        reader.readAsDataURL(file);
    }
    
    setupTemplateImageDrag(wrapper, img, templateEditor) {
        let isDragging = false;
        
        // Handle drag start
        img.addEventListener('dragstart', (e) => {
            isDragging = true;
            
            // Hide resize handles during drag
            const handles = wrapper.querySelector('.resize-handles');
            if (handles) handles.style.display = 'none';
            
            // Add dragging class for visual feedback
            wrapper.classList.add('dragging');
            img.style.cursor = 'grabbing';
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', wrapper.outerHTML);
        });
        
        // Handle drag end
        img.addEventListener('dragend', (e) => {
            isDragging = false;
            wrapper.classList.remove('dragging');
            img.style.cursor = 'grab';
            
            // Remove all drop zones
            this.removeAllDropZones();
        });
        
        // Handle drag over the template editor
        templateEditor.addEventListener('dragover', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Find the best drop position
            const dropPosition = this.findDropPosition(e, templateEditor);
            if (dropPosition) {
                this.showDropZone(dropPosition);
            }
        });
        
        // Handle drop
        templateEditor.addEventListener('drop', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const dropPosition = this.findDropPosition(e, templateEditor);
            
            if (dropPosition) {
                // Move the image to the new position
                if (dropPosition.insertBefore && dropPosition.nextSibling) {
                    dropPosition.nextSibling.parentNode.insertBefore(wrapper, dropPosition.nextSibling);
                } else if (dropPosition.insertBefore) {
                    dropPosition.element.parentNode.insertBefore(wrapper, dropPosition.element);
                } else {
                    dropPosition.element.appendChild(wrapper);
                }
            }
            
            this.removeAllDropZones();
        });
    }
    
    processImageFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '10px 0';
            img.style.borderRadius = '4px';
            img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            img.style.cursor = 'grab';
            img.style.objectFit = 'contain';
            img.className = 'resizable-image draggable-image';
            img.draggable = true;
            
            // Add a wrapper div for better styling and resize functionality
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'image-wrapper';
            imgWrapper.style.textAlign = 'center';
            imgWrapper.style.margin = '15px 0';
            imgWrapper.style.position = 'relative';
            imgWrapper.style.display = 'inline-block';
            imgWrapper.appendChild(img);
            
            // Add resize handles
            this.addResizeHandles(imgWrapper, img);
            
            // Insert the image at the end of the email body
            const emailBody = document.getElementById('email-body');
            emailBody.appendChild(imgWrapper);
            
            // Mark as customized
            this.updateCustomizationIndicator(true);
        };
        
        reader.readAsDataURL(file);
    }
    
    addResizeHandles(wrapper, img) {
        // Create resize handles container
        const handlesContainer = document.createElement('div');
        handlesContainer.className = 'resize-handles';
        handlesContainer.style.display = 'none';
        handlesContainer.style.position = 'absolute';
        handlesContainer.style.top = '0';
        handlesContainer.style.left = '0';
        handlesContainer.style.right = '0';
        handlesContainer.style.bottom = '0';
        handlesContainer.style.pointerEvents = 'none';
        
        // Create corner handles
        const corners = ['nw', 'ne', 'sw', 'se'];
        corners.forEach(corner => {
            const handle = document.createElement('div');
            handle.className = `resize-handle resize-handle-${corner}`;
            handle.style.position = 'absolute';
            handle.style.width = '10px';
            handle.style.height = '10px';
            handle.style.backgroundColor = '#007bff';
            handle.style.border = '2px solid white';
            handle.style.borderRadius = '50%';
            handle.style.cursor = `${corner}-resize`;
            handle.style.pointerEvents = 'all';
            handle.style.zIndex = '10';
            
            // Position handles
            if (corner.includes('n')) handle.style.top = '-5px';
            if (corner.includes('s')) handle.style.bottom = '-5px';
            if (corner.includes('w')) handle.style.left = '-5px';
            if (corner.includes('e')) handle.style.right = '-5px';
            
            handlesContainer.appendChild(handle);
        });
        
        wrapper.appendChild(handlesContainer);
        
        // Add click handler to show/hide resize handles
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleResizeHandles(wrapper);
        });
        
        // Add resize functionality
        this.setupImageResize(wrapper, img, handlesContainer);
        
        // Add drag functionality for moving images
        this.setupImageDrag(wrapper, img);
    }
    
    toggleResizeHandles(wrapper) {
        const handles = wrapper.querySelector('.resize-handles');
        const isVisible = handles.style.display !== 'none';
        
        // Hide all other resize handles and remove selection
        document.querySelectorAll('.resize-handles').forEach(h => {
            h.style.display = 'none';
        });
        document.querySelectorAll('.image-wrapper').forEach(w => {
            w.classList.remove('selected');
        });
        
        // Toggle current handles and add selection
        if (!isVisible) {
            handles.style.display = 'block';
            wrapper.classList.add('selected');
        } else {
            wrapper.classList.remove('selected');
        }
    }
    
    setupImageResize(wrapper, img, handlesContainer) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        const handles = handlesContainer.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = img.offsetWidth;
                startHeight = img.offsetHeight;
                
                const handleType = handle.className.split(' ')[1].split('-')[2]; // nw, ne, sw, se
                
                const handleMouseMove = (e) => {
                    if (!isResizing) return;
                    
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    let newWidth = startWidth;
                    let newHeight = startHeight;
                    
                    // Calculate new dimensions based on handle type
                    if (handleType.includes('e')) newWidth = startWidth + deltaX;
                    if (handleType.includes('w')) newWidth = startWidth - deltaX;
                    if (handleType.includes('s')) newHeight = startHeight + deltaY;
                    if (handleType.includes('n')) newHeight = startHeight - deltaY;
                    
                    // Maintain aspect ratio - use the original aspect ratio
                    const aspectRatio = startWidth / startHeight;
                    
                    // For corner handles, use the larger change to determine which dimension to base the ratio on
                    if (handleType.includes('n') || handleType.includes('s')) {
                        // If we're resizing vertically, base the width on the height
                        newWidth = newHeight * aspectRatio;
                    } else {
                        // If we're resizing horizontally, base the height on the width
                        newHeight = newWidth / aspectRatio;
                    }
                    
                    // Apply size constraints
                    newWidth = Math.max(50, Math.min(newWidth, 800));
                    newHeight = Math.max(50, Math.min(newHeight, 600));
                    
                    img.style.width = newWidth + 'px';
                    img.style.height = newHeight + 'px';
                    img.style.maxWidth = 'none';
                };
                
                const handleMouseUp = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        });
        
        // Hide handles when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                handlesContainer.style.display = 'none';
                wrapper.classList.remove('selected');
            }
        });
    }
    
    setupImageDrag(wrapper, img) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        let originalParent = null;
        let originalNextSibling = null;
        
        // Handle drag start
        img.addEventListener('dragstart', (e) => {
            isDragging = true;
            originalParent = wrapper.parentNode;
            originalNextSibling = wrapper.nextSibling;
            
            // Hide resize handles during drag
            const handles = wrapper.querySelector('.resize-handles');
            if (handles) handles.style.display = 'none';
            
            // Add dragging class for visual feedback
            wrapper.classList.add('dragging');
            img.style.cursor = 'grabbing';
            
            // Create a semi-transparent clone for drag feedback
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', wrapper.outerHTML);
        });
        
        // Handle drag end
        img.addEventListener('dragend', (e) => {
            isDragging = false;
            wrapper.classList.remove('dragging');
            img.style.cursor = 'grab';
            
            // Remove all drop zones
            this.removeAllDropZones();
        });
        
        // Handle drag over the email body
        const emailBody = document.getElementById('email-body');
        emailBody.addEventListener('dragover', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            // Find the best drop position
            const dropPosition = this.findDropPosition(e, emailBody);
            if (dropPosition) {
                this.showDropZone(dropPosition);
            }
        });
        
        // Handle drop
        emailBody.addEventListener('drop', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const dropPosition = this.findDropPosition(e, emailBody);
            
            if (dropPosition) {
                // Move the image to the new position
                if (dropPosition.insertBefore && dropPosition.nextSibling) {
                    dropPosition.nextSibling.parentNode.insertBefore(wrapper, dropPosition.nextSibling);
                } else if (dropPosition.insertBefore) {
                    dropPosition.element.parentNode.insertBefore(wrapper, dropPosition.element);
                } else {
                    dropPosition.element.appendChild(wrapper);
                }
                
                // Mark as customized
                this.updateCustomizationIndicator(true);
            }
            
            this.removeAllDropZones();
        });
    }
    
    findDropPosition(e, container) {
        const elements = Array.from(container.children);
        const mouseY = e.clientY;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const rect = element.getBoundingClientRect();
            const elementMiddle = rect.top + (rect.height / 2);
            
            if (mouseY < elementMiddle) {
                return {
                    insertBefore: true,
                    nextSibling: element,
                    element: element
                };
            }
        }
        
        // If we're past all elements, append to the end
        return {
            insertBefore: false,
            element: container
        };
    }
    
    showDropZone(dropPosition) {
        // Remove existing drop zones
        this.removeAllDropZones();
        
        // Create drop zone indicator
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.style.height = '4px';
        dropZone.style.backgroundColor = '#007bff';
        dropZone.style.margin = '10px 0';
        dropZone.style.borderRadius = '2px';
        dropZone.style.opacity = '0.8';
        dropZone.style.transition = 'all 0.2s ease';
        
        if (dropPosition.insertBefore && dropPosition.nextSibling) {
            dropPosition.nextSibling.parentNode.insertBefore(dropZone, dropPosition.nextSibling);
        } else if (dropPosition.insertBefore) {
            dropPosition.element.parentNode.insertBefore(dropZone, dropPosition.element);
        } else {
            dropPosition.element.appendChild(dropZone);
        }
    }
    
    removeAllDropZones() {
        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => zone.remove());
    }
    
    async processEmbeddedImages(htmlContent) {
        const attachments = [];
        let processedHtml = htmlContent;
        
        console.log('Processing embedded images from HTML:', htmlContent.substring(0, 200) + '...');
        
        // Find all base64 images in the HTML
        const base64Regex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
        let match;
        let imageIndex = 0;
        
        while ((match = base64Regex.exec(htmlContent)) !== null) {
            const mimeType = match[1];
            const base64Data = match[2];
            const fullMatch = match[0];
            
            // Convert base64 to buffer
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create attachment with proper CID format
            const filename = `embedded-image-${imageIndex + 1}.${mimeType}`;
            const cid = `embedded-image-${imageIndex + 1}@highfivespirits.com`; // Use domain format for CID
            const attachment = {
                filename: filename,
                content: bytes,
                contentType: `image/${mimeType}`,
                cid: cid // Content ID for referencing in HTML
            };
            
            attachments.push(attachment);
            
            // Replace the base64 src with cid reference
            const newImgTag = fullMatch.replace(
                /src="data:image\/[^;]+;base64,[^"]+"/,
                `src="cid:${cid}"`
            );
            
            console.log(`Processing image ${imageIndex + 1}:`, {
                filename,
                cid,
                originalTag: fullMatch.substring(0, 50) + '...',
                newTag: newImgTag.substring(0, 50) + '...'
            });
            
            processedHtml = processedHtml.replace(fullMatch, newImgTag);
            imageIndex++;
        }
        
        console.log(`Processed ${attachments.length} embedded images. Final HTML:`, processedHtml.substring(0, 300) + '...');
        console.log('Attachments being sent:', attachments.map(a => ({ filename: a.filename, cid: a.cid, size: a.content.length })));
        
        return {
            html: processedHtml,
            attachments: attachments
        };
    }
    
    handleInsertLinks() {
        // For now, show a simple prompt for inserting links
        const links = prompt('Enter links to insert (separated by commas):');
        if (links && links.trim()) {
            this.showAlert('Links functionality will be implemented soon!', 'success');
            console.log('Links to insert:', links);
        }
    }
    
    cancelJsonUpload() {
        const inputDiv = document.getElementById('json-upload-input');
        const fileInput = document.getElementById('json-file-input');
        const jsonFileNameLabel = document.getElementById('json-file-name');
        
        if (inputDiv) {
            inputDiv.scrollTop = 0;
        }
        fileInput.value = '';
        if (jsonFileNameLabel) {
            jsonFileNameLabel.textContent = 'No file selected';
        }
    }
    
    handleJsonFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                this.processJsonData(jsonData);
            } catch (error) {
                this.showAlert('Invalid JSON file. Please check the format and try again.', 'error');
                console.error('JSON parsing error:', error);
            }
        };
        reader.readAsText(file);
    }
    
    processJsonData(jsonData) {
        if (!Array.isArray(jsonData)) {
            this.showAlert('JSON file must contain an array of prospect objects.', 'error');
            return;
        }
        
        // Convert JSON data to prospect format
        this.uploadedProspects = jsonData.map((item, index) => ({
            id: index + 1000, // Use high IDs to avoid conflicts with existing prospects
            companyName: item.company_name || 'Unknown Company',
            contactName: item.name || 'Unknown Contact',
            contactEmail: item.email || '',
            companyOverview: 'Uploaded prospect data',
            discoveredEmails: [item.email || ''],
            subjectiveInfo: 'Uploaded via JSON file',
            websiteUrl: '',
            phoneNumber: '',
            revenue: '',
            location: ''
        }));
        
        // Replace the prospects array with uploaded data
        prospects.length = 0;
        prospects.push(...this.uploadedProspects);
        
        // Reset the app with new data
        this.initializeAvailableProspects();
        this.currentIndex = 0;
        this.savedEdits.clear();
        this.sentProspects.clear();
        
        // Hide the upload input
        this.cancelJsonUpload();
        
        // Display the first prospect
        this.displayCurrentProspect();
        this.updateNavigationButtons();
        
        this.showAlert(`Successfully loaded ${this.uploadedProspects.length} prospects from JSON file!`, 'success');
    }
    
    handleAttachmentUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        // Add files to global attachments
        files.forEach(file => {
            this.globalAttachments.push(file);
        });
        
        this.updateAttachmentList();
        this.showAlert(`Added ${files.length} file(s) to all emails`, 'success');
        
        // Clear the input so the same file can be selected again if needed
        event.target.value = '';
    }
    
    updateAttachmentList() {
        const attachmentList = document.getElementById('attachment-list');
        if (!attachmentList) return;
        
        if (this.globalAttachments.length === 0) {
            attachmentList.style.display = 'none';
            return;
        }
        
        attachmentList.style.display = 'block';
        attachmentList.innerHTML = this.globalAttachments.map((file, index) => `
            <div class="attachment-item">
                <span class="attachment-name" title="${file.name}">${file.name}</span>
                <button class="remove-attachment" onclick="app.removeAttachment(${index})" title="Remove attachment">×</button>
            </div>
        `).join('');
    }
    
    removeAttachment(index) {
        this.globalAttachments.splice(index, 1);
        this.updateAttachmentList();
        this.showAlert('Attachment removed', 'success');
    }
    
    saveEmailContext() {
        const templateEditor = document.getElementById('email-context-textarea');
        const context = templateEditor.innerHTML.trim();
        
        if (!context || context === '<br>' || context === '') {
            this.showAlert('Please enter some email template before saving.', 'error');
            return;
        }
        
        // Store as global email template (already in HTML format with images)
        this.globalEmailTemplate = context;
        this.showAlert('Email template saved successfully! This will be used for all prospects.', 'success');
        console.log('Global email template saved:', context);
        
        // Update current prospect with new template
        this.updateCurrentProspectWithTemplate();

        this.refreshTemplateEditor();
    }
    
    refreshTemplateEditor() {
        const templateEditor = document.getElementById('email-context-textarea');
        if (!templateEditor)
            return;
        if (this.globalEmailTemplate && this.globalEmailTemplate.trim() !== '') {
            templateEditor.innerHTML = this.globalEmailTemplate;
        }
        else {
            templateEditor.innerHTML = '';
        }
    }
    
    clearTemplateEditor() {
        this.refreshTemplateEditor();
        this.showAlert(this.globalEmailTemplate ? 'Template reset to last saved version.' : 'Template cleared.', 'info');
    }
    
    updateCurrentProspectWithTemplate() {
        if (!this.globalEmailTemplate) return;
        
        const prospect = prospects[this.currentIndex];
        const populatedTemplate = this.populateGlobalTemplate(this.globalEmailTemplate, prospect);
        
        const emailBody = document.getElementById('email-body');
        if (emailBody) {
            emailBody.innerHTML = populatedTemplate;
        }
        
        // Clear any saved edits for this prospect since we're using the new template
        this.savedEdits.delete(this.currentIndex);
        this.updateCustomizationIndicator(false);
    }
    
    populateGlobalTemplate(template, prospect) {
        // Template is already HTML (line breaks converted when saved), just populate variables
        return template
            .replace(/\[NAME\]/g, prospect.contactName || 'Valued Customer')
            .replace(/\[CONTACT_NAME\]/g, prospect.contactName || 'Valued Customer')
            .replace(/\[COMPANY\]/g, prospect.companyName || 'their company')
            .replace(/\[COMPANY_NAME\]/g, prospect.companyName || 'their company')
            .replace(/\[YOUR_NAME\]/g, userConfig.yourName)
            .replace(/\[YOUR_COMPANY\]/g, userConfig.yourCompany)
            .replace(/\[YOUR_PHONE\]/g, userConfig.yourPhone)
            .replace(/\[YOUR_EMAIL\]/g, userConfig.yourEmail)
            .replace(/\[PHONE\]/g, userConfig.yourPhone)
            .replace(/\[EMAIL\]/g, userConfig.yourEmail);
    }
    
    updateAllProspectsWithGlobalSubject() {
        // Update the subject line for all prospects in the saved edits
        for (let [prospectIndex, savedEdit] of this.savedEdits.entries()) {
            savedEdit.subject = this.globalSubjectLine;
        }
        
        // If we're currently viewing a prospect that doesn't have saved edits,
        // update its display immediately
        const currentProspect = prospects[this.currentIndex];
        if (currentProspect && !this.savedEdits.has(this.currentIndex)) {
            this.updateElement('email-subject', this.globalSubjectLine);
        }
    }

    findCompaniesWithoutEmail() {
        this.companiesWithoutEmail = prospects
            .filter(prospect => !prospect.contactEmail || prospect.contactEmail.trim() === '')
            .map(prospect => prospect.companyName);
        this.displayErrorPanel();
    }
    displayErrorPanel() {
        const errorPanel = document.getElementById('error-panel');
        const errorList = document.getElementById('error-list');
        if (this.companiesWithoutEmail.length > 0) {
            errorPanel.style.display = 'block';
            errorList.innerHTML = this.companiesWithoutEmail
                .map(company => `<li>${company}</li>`)
                .join('');
        }
        else {
            errorPanel.style.display = 'none';
        }
    }
    displayCurrentProspect() {
        // Update user config from authentication before displaying
        this.updateUserConfigFromAuth();
        
        const prospect = prospects[this.currentIndex];
        if (!prospect)
            return;
        // Update left panel
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
        }
        else {
            // Use global template if available, otherwise blank template
                this.updateElement('email-to', prospect.contactEmail || '');
            this.updateElement('email-subject', this.globalSubjectLine);
            
            if (this.globalEmailTemplate) {
                this.updateEmailBodyWithGlobalTemplate(prospect);
            } else {
                this.updateBlankEmailBody(prospect);
            }
            this.updateCustomizationIndicator(false);
        }
        this.updatePageCounter();
    }
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
    updatePageCounter() {
        const counter = document.getElementById('page-counter');
        if (counter) {
            const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
            const totalAvailable = this.availableProspects.length;
            counter.textContent = `${currentAvailableIndex + 1}/${totalAvailable}`;
        }
    }
    updateBlankEmailBody(prospect) {
        const emailBody = document.getElementById('email-body');
        if (!emailBody)
            return;
        const template = this.getBlankEmailTemplate();
        const populatedTemplate = this.populateTemplate(template, prospect);
        emailBody.innerHTML = populatedTemplate;
        
        // Re-attach event listeners to any images
        this.reattachImageHandlers(emailBody);
    }
    
    updateEmailBodyWithGlobalTemplate(prospect) {
        const emailBody = document.getElementById('email-body');
        if (!emailBody || !this.globalEmailTemplate)
            return;
        const populatedTemplate = this.populateGlobalTemplate(this.globalEmailTemplate, prospect);
        emailBody.innerHTML = populatedTemplate;
        
        // Re-attach event listeners to images in the template
        this.reattachImageHandlers(emailBody);
    }
    restoreEmailBody(bodyContent) {
        const emailBody = document.getElementById('email-body');
        if (!emailBody)
            return;
        // Since we're now saving HTML content, use it directly
        emailBody.innerHTML = bodyContent;
        
        // Re-attach event listeners to images
        this.reattachImageHandlers(emailBody);
    }
    
    reattachImageHandlers(container) {
        // Find all image wrappers and re-attach resize and drag handlers
        const imageWrappers = container.querySelectorAll('.image-wrapper');
        
        imageWrappers.forEach(wrapper => {
            const img = wrapper.querySelector('img');
            if (!img) return;
            
            // Check if resize handles already exist
            let handlesContainer = wrapper.querySelector('.resize-handles');
            
            if (!handlesContainer) {
                // Add resize handles if they don't exist (this also adds all event listeners)
                this.addResizeHandles(wrapper, img);
            } else {
                // Handles exist, just need to re-attach event listeners
                
                // Add click handler to show/hide resize handles
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleResizeHandles(wrapper);
                });
                
                // Re-setup resize functionality on existing handles
                this.setupImageResize(wrapper, img, handlesContainer);
                
                // Re-setup drag functionality
                this.setupImageDrag(wrapper, img);
            }
        });
    }
    saveCurrentEdits() {
        const emailToField = document.getElementById('email-to');
        const emailSubjectField = document.getElementById('email-subject');
        const emailBody = document.getElementById('email-body');
        if (!emailToField || !emailSubjectField || !emailBody)
            return;
        const toEmail = emailToField.textContent || '';
        const subject = emailSubjectField.textContent || '';
        // Save the HTML content to preserve formatting
        const bodyHTML = emailBody.innerHTML;
        const bodyText = emailBody.innerText || emailBody.textContent || '';
        // Only save if there are actual changes from the default
        const prospect = prospects[this.currentIndex];
        // Different defaults based on whether global template exists
        let defaultTo, defaultSubject, defaultBody;
            defaultTo = prospect.contactEmail || '';
        defaultSubject = this.globalSubjectLine;
        
        if (this.globalEmailTemplate) {
            // Use global template if available
            defaultBody = this.populateGlobalTemplate(this.globalEmailTemplate, prospect);
        } else {
            // Use blank template
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
        }
        else {
            // Remove saved edit if it matches defaults
            this.savedEdits.delete(this.currentIndex);
        }
    }
    updateCustomizationIndicator(isCustomized) {
        const pageCounter = document.getElementById('page-counter');
        if (!pageCounter)
            return;
        const baseText = `${this.currentIndex + 1}/${prospects.length}`;
        pageCounter.textContent = isCustomized ? `${baseText} *` : baseText;
    }
    getBlankEmailTemplate() {
        return `<p>Hi [Contact Name],</p><br><br><p>Best,</p><p>[Your Name]</p><p>[Your Company]</p><p>[Phone Number]</p><p>[Email]</p>`;
    }
    populateTemplate(template, prospect) {
        return template
            .replace(/\[Contact Name\]/g, prospect.contactName || 'Valued Customer')
            .replace(/\[Your Name\]/g, userConfig.yourName)
            .replace(/\[Your Company\]/g, userConfig.yourCompany)
            .replace(/\[Phone Number\]/g, userConfig.yourPhone)
            .replace(/\[Email\]/g, userConfig.yourEmail);
    }
    previousProspect() {
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (currentAvailableIndex > 0) {
            // Save current edits before navigating away
            this.saveCurrentEdits();
            this.currentIndex = this.availableProspects[currentAvailableIndex - 1];
            this.displayCurrentProspect();
            this.updateNavigationButtons();
        }
    }
    nextProspect() {
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (currentAvailableIndex < this.availableProspects.length - 1) {
            // Save current edits before navigating away
            this.saveCurrentEdits();
            this.currentIndex = this.availableProspects[currentAvailableIndex + 1];
            this.displayCurrentProspect();
            this.updateNavigationButtons();
        }
    }
    moveToNextProspect() {
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (currentAvailableIndex < this.availableProspects.length - 1) {
            // Move to next available prospect
            this.nextProspect();
        }
        else {
            // All emails sent - show completion message
            this.showCompletionMessage();
        }
    }
    removeSentProspect(prospectIndex) {
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
    
    deleteCurrentProspect() {
        // Confirm deletion with user
        const prospect = prospects[this.currentIndex];
        if (!prospect) return;
        
        const confirmDelete = confirm(`Are you sure you want to delete "${prospect.companyName}" from the queue? This action cannot be undone.`);
        if (!confirmDelete) return;
        
        // Save current edits before deleting
        this.saveCurrentEdits();
        
        // Remove from available prospects (same as removeSentProspect but without marking as sent)
        const availableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (availableIndex > -1) {
            this.availableProspects.splice(availableIndex, 1);
        }
        
        // Remove saved edits for this prospect
        this.savedEdits.delete(this.currentIndex);
        
        // Show confirmation message
        this.showAlert(`"${prospect.companyName}" has been removed from the queue.`, 'success');
        
        console.log(`Prospect ${this.currentIndex} deleted from available list. Remaining: ${this.availableProspects.length}`);
        
        // Navigate to next available prospect or show completion message
        if (this.availableProspects.length > 0) {
            // Move to next available prospect
            if (availableIndex >= this.availableProspects.length) {
                // If we deleted the last prospect, go to the previous one
                this.currentIndex = this.availableProspects[this.availableProspects.length - 1];
            } else {
                // Otherwise, go to the next one (or stay on current if it's still available)
                this.currentIndex = this.availableProspects[availableIndex] || this.availableProspects[0];
            }
            this.displayCurrentProspect();
            this.updateNavigationButtons();
        } else {
            // No more prospects available - show completion message
            this.showCompletionMessage();
        }
    }
    showCompletionMessage() {
        // Only hide the right panel content, keep left panel visible
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            // Hide the email content
            const emailContent = rightPanel.querySelector('.email-content');
            const emailControls = rightPanel.querySelector('.email-controls');
            if (emailContent)
                emailContent.style.display = 'none';
            if (emailControls)
                emailControls.style.display = 'none';
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
        const rightPanelElement = document.querySelector('.right-panel');
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
    restartApplication() {
        // Remove completion message
        const completionDiv = document.getElementById('completion-message');
        if (completionDiv) {
            completionDiv.remove();
        }
        // Show email content and controls again
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel) {
            const emailContent = rightPanel.querySelector('.email-content');
            const emailControls = rightPanel.querySelector('.email-controls');
            if (emailContent)
                emailContent.style.display = 'flex';
            if (emailControls)
                emailControls.style.display = 'flex';
        }
        // Reset to first prospect
        this.currentIndex = 0;
        this.savedEdits.clear();
        this.sentProspects.clear();
        this.initializeAvailableProspects();
        this.displayCurrentProspect();
        this.updateNavigationButtons();
    }
    showAddProspectsMessage() {
        const completionDiv = document.getElementById('completion-message');
        if (!completionDiv)
            return;
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
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const currentAvailableIndex = this.availableProspects.indexOf(this.currentIndex);
        if (prevBtn)
            prevBtn.disabled = currentAvailableIndex === 0;
        if (nextBtn)
            nextBtn.disabled = currentAvailableIndex === this.availableProspects.length - 1;
    }
    makeFieldEditable(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field)
            return;
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
            
            // If this is the subject field, update global subject
            if (fieldId === 'email-subject') {
                this.globalSubjectLine = field.textContent || '';
                this.updateAllProspectsWithGlobalSubject();
                this.showAlert('Subject line updated for all prospects!', 'success');
            }
            
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
    makeEmailBodyEditable() {
        const emailBody = document.getElementById('email-body');
        if (!emailBody || this.isEditing)
            return;
        
        this.isEditing = true;
        emailBody.contentEditable = 'true';
            emailBody.focus();
        
        // Add visual indication
        emailBody.style.backgroundColor = '#333';
        emailBody.style.border = '2px solid #007acc';
        emailBody.style.borderRadius = '4px';
        emailBody.style.padding = '16px';
        emailBody.style.outline = 'none';
        
        // Add event listeners for saving on blur or Enter key
        const saveEmailBody = () => {
            this.exitEditMode();
        };
        
        emailBody.addEventListener('blur', saveEmailBody, { once: true });
        emailBody.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.exitEditMode();
            }
        }, { once: true });
    }
    
    exitEditMode() {
        const emailBody = document.getElementById('email-body');
        if (!emailBody || !this.isEditing)
            return;
        
        this.isEditing = false;
        emailBody.contentEditable = 'false';
        
        // Remove visual indication
        emailBody.style.backgroundColor = '';
        emailBody.style.border = '';
        emailBody.style.borderRadius = '';
        emailBody.style.padding = '';
        emailBody.style.outline = '';
        
            // Save edits when exiting edit mode
            this.saveCurrentEdits();
    }
    async sendEmail() {
        const prospect = prospects[this.currentIndex];
        if (!prospect) {
            this.showAlert('No prospect data available.', 'error');
            return;
        }
        // Get current values from editable fields
        const emailToField = document.getElementById('email-to');
        const emailSubjectField = document.getElementById('email-subject');
        const emailBody = document.getElementById('email-body');
        if (!emailToField || !emailSubjectField || !emailBody)
            return;
        const toEmail = emailToField.textContent || '';
        const subject = emailSubjectField.textContent || '';
        const bodyHTML = emailBody.innerHTML || '';  // Get HTML content with images
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
        const sendBtn = document.getElementById('send-btn');
        const originalText = sendBtn.textContent;
        sendBtn.textContent = 'SENDING...';
        sendBtn.disabled = true;
        try {
            // Extract and process embedded images from HTML content
            const processedEmailData = await this.processEmbeddedImages(bodyHTML);
            
            // Create FormData for file attachments
            const formData = new FormData();
            formData.append('to', toEmail);
            formData.append('subject', subject);
            formData.append('body', processedEmailData.html);
            formData.append('fromName', userConfig.yourName);
            formData.append('fromEmail', userConfig.yourEmail);
            
            // Add user email settings if available
            if (window.authManager && window.authManager.getCurrentUserEmailSettings()) {
                const userEmailSettings = window.authManager.getCurrentUserEmailSettings();
                formData.append('userEmailSettings', JSON.stringify(userEmailSettings));
                console.log('Sending email with user settings:', userEmailSettings);
                console.log('User config being used:', userConfig);
            } else {
                console.log('No user email settings available');
                console.log('Auth manager available:', !!window.authManager);
                console.log('User authenticated:', window.authManager ? window.authManager.isUserAuthenticated() : 'N/A');
            }
            
            // Add attachments if any
            this.globalAttachments.forEach((file, index) => {
                formData.append('attachments', file);
            });
            
            // Add embedded images as attachments
            if (processedEmailData.attachments && processedEmailData.attachments.length > 0) {
                console.log(`Adding ${processedEmailData.attachments.length} embedded image(s) as attachments`);
                processedEmailData.attachments.forEach((attachment, index) => {
                    // Create a Blob from the buffer
                    const blob = new Blob([attachment.content], { type: attachment.contentType });
                    formData.append('attachments', blob, attachment.filename);
                    console.log(`Added embedded image: ${attachment.filename} (CID: ${attachment.cid})`);
                });
            }
            
            console.log('Sending email with FormData:');
            console.log('To:', toEmail);
            console.log('Subject:', subject);
            console.log('Attachments:', this.globalAttachments.length);
            
            const response = await fetch('/api/send-email', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                this.showAlert(`Email sent successfully to ${toEmail}!`, 'success');
                console.log('Email sent:', result.messageId);
                // Remove this prospect from the available list
                this.removeSentProspect(this.currentIndex);
                // Auto-navigate to next prospect after successful send
                setTimeout(() => {
                    this.moveToNextProspect();
                }, 1500); // Wait 1.5 seconds to show success message
            }
            else {
                this.showAlert(`Failed to send email: ${result.error}`, 'error');
            }
        }
        catch (error) {
            console.error('Error sending email:', error);
            this.showAlert('Network error. Please check your connection and try again.', 'error');
        }
        finally {
            // Reset button state
            sendBtn.textContent = originalText;
            sendBtn.disabled = false;
        }
    }
    showAlert(message, type) {
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
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize the email tool if we're on the email tool page
    // The auth system will handle showing/hiding the appropriate screens
    if (document.getElementById('email-tool').style.display !== 'none') {
        app = new EmailOutreachApp();
    }
});

// Function to initialize email tool when accessed
function initializeEmailTool() {
    if (!app) {
        app = new EmailOutreachApp();
    }
    return app;
}

// Make it globally available
window.EmailOutreachApp = EmailOutreachApp;
window.initializeEmailTool = initializeEmailTool;
