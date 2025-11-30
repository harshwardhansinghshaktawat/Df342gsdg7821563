class HandwritingGeneratorElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.settings = {
            // Text Settings
            textContent: '',
            fontSize: 18,
            lineHeight: 1.8,
            letterSpacing: 0,
            wordSpacing: 0,
            textAlign: 'left',
            
            // Font Settings
            fontFamily: 'Caveat',
            fontWeight: 400,
            fontStyle: 'normal',
            
            // Page Settings
            pageType: 'ruled',
            pageSize: 'a4',
            pageOrientation: 'portrait',
            
            // Colors (will be overridden by CSS variables)
            primaryColor: '#2c3e50',
            secondaryColor: '#3498db',
            textColor: '#2c3e50',
            backgroundColor: '#ffffff',
            lineColor: '#e0e0e0',
            marginLineColor: '#ff6b6b',
            paperTexture: true,
            
            // Margins & Spacing
            topMargin: 40,
            bottomMargin: 40,
            leftMargin: 60,
            rightMargin: 40,
            
            // Line Settings
            lineSpacing: 35,
            lineThickness: 1,
            showMarginLine: true,
            marginLinePosition: 60,
            
            // Language & Direction
            language: 'en',
            textDirection: 'ltr',
            
            // Export Settings
            exportFormat: 'pdf',
            exportQuality: 'high',
            includeBackground: true,
            
            // UI Text
            placeholderText: 'Start typing to see your handwriting...',
            exportButtonText: 'Download',
            clearButtonText: 'Clear',
            uploadImageText: 'Upload Image',
            
            // Features
            showLineNumbers: false,
            enableImageUpload: true,
            showExportOptions: true,
            showCharacterCount: true
        };
        
        this.uploadedImages = [];
        this.loadedFonts = new Set();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadGoogleFont(this.settings.fontFamily);
    }

    static get observedAttributes() {
        return ['settings'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (newValue && newValue !== oldValue && name === 'settings') {
            try {
                const newSettings = JSON.parse(newValue);
                Object.assign(this.settings, newSettings);
                if (this.shadowRoot.querySelector('.handwriting-container')) {
                    this.updateDisplay();
                    if (oldValue) {
                        const oldSettings = JSON.parse(oldValue);
                        if (oldSettings.fontFamily !== newSettings.fontFamily) {
                            this.loadGoogleFont(newSettings.fontFamily);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
    }

    loadGoogleFont(fontFamily) {
        if (this.loadedFonts.has(fontFamily)) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
        this.loadedFonts.add(fontFamily);
        
        link.onload = () => {
            if (this.shadowRoot.querySelector('.preview-text')) {
                this.updateDisplay();
            }
        };
    }

    render() {
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        
        const container = document.createElement('div');
        container.className = 'handwriting-container';
        container.innerHTML = this.getHTML();
        
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);
    }

    getStyles() {
        return `
            :host {
                --primary-color: ${this.settings.primaryColor};
                --secondary-color: ${this.settings.secondaryColor};
                --text-color: ${this.settings.textColor};
                --background-color: ${this.settings.backgroundColor};
                --line-color: ${this.settings.lineColor};
                --margin-line-color: ${this.settings.marginLineColor};
                --border-radius: 8px;
                --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
                --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
                --shadow-lg: 0 10px 25px rgba(0,0,0,0.15);
                --transition: all 0.3s ease;
                display: block;
                width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            .handwriting-container {
                width: 100%;
                background: var(--background-color);
                border-radius: var(--border-radius);
                overflow: hidden;
            }

            .editor-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                padding: 20px;
                background: #f8f9fa;
            }

            @media (max-width: 768px) {
                .editor-section {
                    grid-template-columns: 1fr;
                }
            }

            .input-panel {
                background: white;
                border-radius: var(--border-radius);
                padding: 20px;
                box-shadow: var(--shadow-sm);
            }

            .preview-panel {
                background: white;
                border-radius: var(--border-radius);
                padding: 20px;
                box-shadow: var(--shadow-sm);
                position: relative;
            }

            .text-input {
                width: 100%;
                min-height: 300px;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: var(--border-radius);
                font-size: 16px;
                font-family: inherit;
                resize: vertical;
                transition: var(--transition);
                color: var(--text-color);
            }

            .text-input:focus {
                outline: none;
                border-color: var(--secondary-color);
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }

            .text-input::placeholder {
                color: #95a5a6;
                opacity: 1;
            }

            .preview-wrapper {
                position: relative;
                background: white;
                min-height: 400px;
                border-radius: var(--border-radius);
                overflow: hidden;
            }

            .preview-page {
                width: 100%;
                min-height: 400px;
                padding: ${this.settings.topMargin}px ${this.settings.rightMargin}px ${this.settings.bottomMargin}px ${this.settings.leftMargin}px;
                background: var(--background-color);
                position: relative;
                ${this.settings.paperTexture ? this.getPaperTexture() : ''}
            }

            .page-lines {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 1;
            }

            .preview-text {
                position: relative;
                z-index: 2;
                font-family: '${this.settings.fontFamily}', cursive;
                font-size: ${this.settings.fontSize}px;
                line-height: ${this.settings.lineHeight};
                letter-spacing: ${this.settings.letterSpacing}px;
                word-spacing: ${this.settings.wordSpacing}px;
                text-align: ${this.settings.textAlign};
                color: var(--text-color);
                font-weight: ${this.settings.fontWeight};
                font-style: ${this.settings.fontStyle};
                direction: ${this.settings.textDirection};
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .controls-bar {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                padding: 15px 20px;
                background: white;
                border-top: 1px solid #e0e0e0;
                align-items: center;
            }

            .button {
                padding: 10px 20px;
                border: none;
                border-radius: var(--border-radius);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: var(--transition);
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-family: inherit;
            }

            .button:focus {
                outline: 2px solid var(--secondary-color);
                outline-offset: 2px;
            }

            .button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .button-primary {
                background: var(--secondary-color);
                color: white;
            }

            .button-primary:hover:not(:disabled) {
                background: #2980b9;
                transform: translateY(-1px);
                box-shadow: var(--shadow-md);
            }

            .button-secondary {
                background: #95a5a6;
                color: white;
            }

            .button-secondary:hover:not(:disabled) {
                background: #7f8c8d;
            }

            .button-outline {
                background: transparent;
                color: var(--text-color);
                border: 2px solid #e0e0e0;
            }

            .button-outline:hover:not(:disabled) {
                border-color: var(--secondary-color);
                color: var(--secondary-color);
            }

            .file-upload {
                position: relative;
                overflow: hidden;
            }

            .file-upload input[type="file"] {
                position: absolute;
                left: -9999px;
            }

            .character-count {
                margin-left: auto;
                color: #7f8c8d;
                font-size: 14px;
                padding: 8px 12px;
            }

            .uploaded-images {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 15px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: var(--border-radius);
            }

            .image-preview {
                position: relative;
                width: 80px;
                height: 80px;
                border-radius: var(--border-radius);
                overflow: hidden;
                box-shadow: var(--shadow-sm);
            }

            .image-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .image-preview-remove {
                position: absolute;
                top: 4px;
                right: 4px;
                background: rgba(231, 76, 60, 0.9);
                color: white;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition);
            }

            .image-preview-remove:hover {
                background: #c0392b;
                transform: scale(1.1);
            }

            .loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
            }

            /* Responsive Design */
            @media print {
                .controls-bar,
                .input-panel {
                    display: none !important;
                }
                
                .preview-panel {
                    box-shadow: none;
                }
            }
        `;
    }

    getPaperTexture() {
        return `
            background-image: 
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0,0,0,0.02) 2px,
                    rgba(0,0,0,0.02) 4px
                );
        `;
    }

    getHTML() {
        return `
            <div class="editor-section" role="main">
                <div class="input-panel">
                    <label for="text-input" class="sr-only">Enter your text</label>
                    <textarea 
                        id="text-input"
                        class="text-input" 
                        placeholder="${this.settings.placeholderText}"
                        aria-label="Text input for handwriting conversion"
                        spellcheck="true"
                    >${this.settings.textContent}</textarea>
                    
                    ${this.settings.enableImageUpload ? `
                        <div class="file-upload">
                            <label for="image-upload" class="button button-outline" style="margin-top: 10px;">
                                <span>📷</span>
                                <span>${this.settings.uploadImageText}</span>
                            </label>
                            <input 
                                type="file" 
                                id="image-upload" 
                                accept="image/*" 
                                multiple
                                aria-label="Upload images to include in handwriting"
                            />
                        </div>
                        <div class="uploaded-images" id="uploaded-images"></div>
                    ` : ''}
                </div>

                <div class="preview-panel">
                    <div class="preview-wrapper" id="preview-wrapper">
                        <div class="preview-page" id="preview-page">
                            <canvas class="page-lines" id="page-lines" aria-hidden="true"></canvas>
                            <div class="preview-text" id="preview-text" role="article" aria-live="polite"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="controls-bar" role="toolbar" aria-label="Export and control options">
                ${this.settings.showExportOptions ? `
                    <button 
                        class="button button-primary" 
                        id="export-pdf"
                        aria-label="Download as PDF"
                    >
                        <span>📄</span>
                        <span>PDF</span>
                    </button>
                    <button 
                        class="button button-primary" 
                        id="export-png"
                        aria-label="Download as PNG image"
                    >
                        <span>🖼️</span>
                        <span>PNG</span>
                    </button>
                ` : ''}
                
                <button 
                    class="button button-secondary" 
                    id="clear-text"
                    aria-label="Clear all text"
                >
                    <span>🗑️</span>
                    <span>${this.settings.clearButtonText}</span>
                </button>

                ${this.settings.showCharacterCount ? `
                    <div class="character-count" id="char-count" aria-live="polite">
                        0 characters
                    </div>
                ` : ''}
            </div>
        `;
    }

    setupEventListeners() {
        const textInput = this.shadowRoot.getElementById('text-input');
        const previewText = this.shadowRoot.getElementById('preview-text');
        const charCount = this.shadowRoot.getElementById('char-count');
        const clearBtn = this.shadowRoot.getElementById('clear-text');
        const exportPdfBtn = this.shadowRoot.getElementById('export-pdf');
        const exportPngBtn = this.shadowRoot.getElementById('export-png');
        const imageUpload = this.shadowRoot.getElementById('image-upload');

        if (textInput) {
            textInput.addEventListener('input', (e) => {
                this.settings.textContent = e.target.value;
                if (previewText) {
                    previewText.textContent = e.target.value || '';
                }
                if (charCount) {
                    charCount.textContent = `${e.target.value.length} characters`;
                }
                this.drawPageLines();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (textInput) textInput.value = '';
                if (previewText) previewText.textContent = '';
                if (charCount) charCount.textContent = '0 characters';
                this.settings.textContent = '';
                this.uploadedImages = [];
                this.updateUploadedImages();
            });
        }

        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportToPDF());
        }

        if (exportPngBtn) {
            exportPngBtn.addEventListener('click', () => this.exportToPNG());
        }

        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        this.drawPageLines();
    }

    drawPageLines() {
        const canvas = this.shadowRoot.getElementById('page-lines');
        const previewPage = this.shadowRoot.getElementById('preview-page');
        
        if (!canvas || !previewPage) return;

        const rect = previewPage.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const startY = this.settings.topMargin;
        const endY = canvas.height - this.settings.bottomMargin;
        const lineSpacing = this.settings.lineSpacing;

        // Draw horizontal lines based on page type
        if (this.settings.pageType === 'ruled' || this.settings.pageType === 'college-ruled') {
            ctx.strokeStyle = this.settings.lineColor;
            ctx.lineWidth = this.settings.lineThickness;

            for (let y = startY; y < endY; y += lineSpacing) {
                ctx.beginPath();
                ctx.moveTo(this.settings.leftMargin, y);
                ctx.lineTo(canvas.width - this.settings.rightMargin, y);
                ctx.stroke();
            }
        } else if (this.settings.pageType === 'cursive') {
            // Draw cursive lines (solid and dashed)
            ctx.lineWidth = this.settings.lineThickness;
            
            for (let y = startY; y < endY; y += lineSpacing) {
                // Top line (dashed)
                ctx.strokeStyle = this.settings.lineColor;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(this.settings.leftMargin, y);
                ctx.lineTo(canvas.width - this.settings.rightMargin, y);
                ctx.stroke();

                // Middle line (solid)
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(this.settings.leftMargin, y + lineSpacing / 2);
                ctx.lineTo(canvas.width - this.settings.rightMargin, y + lineSpacing / 2);
                ctx.stroke();

                // Bottom line (solid)
                ctx.beginPath();
                ctx.moveTo(this.settings.leftMargin, y + lineSpacing);
                ctx.lineTo(canvas.width - this.settings.rightMargin, y + lineSpacing);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // Draw margin line
        if (this.settings.showMarginLine) {
            ctx.strokeStyle = this.settings.marginLineColor;
            ctx.lineWidth = this.settings.lineThickness + 1;
            ctx.beginPath();
            ctx.moveTo(this.settings.marginLinePosition, startY);
            ctx.lineTo(this.settings.marginLinePosition, endY);
            ctx.stroke();
        }

        // Draw line numbers
        if (this.settings.showLineNumbers) {
            ctx.fillStyle = this.settings.lineColor;
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            let lineNum = 1;
            for (let y = startY; y < endY; y += lineSpacing) {
                ctx.fillText(lineNum.toString(), this.settings.marginLinePosition - 10, y + 5);
                lineNum++;
            }
        }
    }

    updateDisplay() {
        const previewText = this.shadowRoot.getElementById('preview-text');
        const previewPage = this.shadowRoot.getElementById('preview-page');
        
        if (previewText) {
            previewText.style.fontFamily = `'${this.settings.fontFamily}', cursive`;
            previewText.style.fontSize = `${this.settings.fontSize}px`;
            previewText.style.lineHeight = this.settings.lineHeight;
            previewText.style.letterSpacing = `${this.settings.letterSpacing}px`;
            previewText.style.wordSpacing = `${this.settings.wordSpacing}px`;
            previewText.style.textAlign = this.settings.textAlign;
            previewText.style.fontWeight = this.settings.fontWeight;
            previewText.style.fontStyle = this.settings.fontStyle;
            previewText.style.direction = this.settings.textDirection;
        }

        if (previewPage) {
            previewPage.style.padding = `${this.settings.topMargin}px ${this.settings.rightMargin}px ${this.settings.bottomMargin}px ${this.settings.leftMargin}px`;
        }

        this.drawPageLines();
        this.updateStyles();
    }

    updateStyles() {
        const style = this.shadowRoot.querySelector('style');
        if (style) {
            style.textContent = this.getStyles();
        }
    }

    handleImageUpload(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.uploadedImages.push({
                        url: e.target.result,
                        name: file.name
                    });
                    this.updateUploadedImages();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    updateUploadedImages() {
        const container = this.shadowRoot.getElementById('uploaded-images');
        if (!container) return;

        container.innerHTML = this.uploadedImages.map((img, index) => `
            <div class="image-preview">
                <img src="${img.url}" alt="${img.name}" />
                <button 
                    class="image-preview-remove" 
                    data-index="${index}"
                    aria-label="Remove ${img.name}"
                >
                    ×
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.image-preview-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.uploadedImages.splice(index, 1);
                this.updateUploadedImages();
            });
        });
    }

    async exportToPDF() {
        const exportBtn = this.shadowRoot.getElementById('export-pdf');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<span class="loading"></span><span>Exporting...</span>';
        exportBtn.disabled = true;

        try {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

            const { jsPDF } = window.jspdf;
            const previewPage = this.shadowRoot.getElementById('preview-page');
            
            const canvas = await html2canvas(previewPage, {
                scale: this.settings.exportQuality === 'high' ? 2 : 1,
                backgroundColor: this.settings.includeBackground ? this.settings.backgroundColor : null,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: this.settings.pageOrientation,
                unit: 'mm',
                format: this.settings.pageSize
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('handwriting.pdf');
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    async exportToPNG() {
        const exportBtn = this.shadowRoot.getElementById('export-png');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<span class="loading"></span><span>Exporting...</span>';
        exportBtn.disabled = true;

        try {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');

            const previewPage = this.shadowRoot.getElementById('preview-page');
            const canvas = await html2canvas(previewPage, {
                scale: this.settings.exportQuality === 'high' ? 3 : 2,
                backgroundColor: this.settings.includeBackground ? this.settings.backgroundColor : null,
                logging: false
            });

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'handwriting.png';
                link.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (error) {
            console.error('PNG export failed:', error);
            alert('Failed to export PNG. Please try again.');
        } finally {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    disconnectedCallback() {
        // Cleanup
        this.uploadedImages = [];
    }
}

customElements.define('handwriting-generator', HandwritingGeneratorElement);

export const STYLE = `
    :host {
        display: block;
        width: 100%;
        min-height: 600px;
    }
`;
