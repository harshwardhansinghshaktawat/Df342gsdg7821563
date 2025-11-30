class TextToHandwritingElement extends HTMLElement {
    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.currentPage = 0;
        this.pages = [];
        this.userImages = [];
        this.settings = {
            // Color scheme
            primaryColor: '#2c3e50',
            secondaryColor: '#3498db',
            accentColor: '#e74c3c',
            backgroundColor: '#ffffff',
            textColor: '#2c3e50',
            lineColor: '#d3d3d3',
            shadowColor: '#00000020',
            buttonPrimaryBg: '#3498db',
            buttonPrimaryText: '#ffffff',
            buttonSecondaryBg: '#ecf0f1',
            buttonSecondaryText: '#2c3e50',
            inputBorderColor: '#bdc3c7',
            inputFocusColor: '#3498db',
            
            // Text settings
            text: 'Write your text here to convert it into beautiful handwriting...',
            fontSize: 24,
            lineHeight: 1.8,
            letterSpacing: 0.5,
            wordSpacing: 5,
            textAlign: 'left',
            fontFamily: 'Caveat',
            fontWeight: '400',
            textColor: '#000000',
            inkOpacity: 100,
            textSlant: 0,
            
            // Page settings
            pageType: 'ruled',
            pageSize: 'a4',
            orientation: 'portrait',
            topMargin: 80,
            bottomMargin: 80,
            leftMargin: 80,
            rightMargin: 80,
            showMargins: true,
            
            // Line settings
            lineSpacing: 40,
            lineThickness: 1,
            showRuledLines: true,
            ruledLineColor: '#d3d3d3',
            marginLineColor: '#ff6b6b',
            
            // Export settings
            exportFormat: 'png',
            exportQuality: 95,
            exportDpi: 300,
            includeBackground: true,
            
            // Advanced features
            paperTexture: 'none',
            textureOpacity: 10,
            addNoise: false,
            noiseIntensity: 5,
            inkBleed: false,
            bleedIntensity: 2,
            
            // Language support
            language: 'en',
            rtl: false,
            
            // UI Labels
            labelInputText: 'Enter your text',
            labelFontFamily: 'Handwriting Font',
            labelFontSize: 'Font Size',
            labelPageType: 'Page Type',
            labelPageSize: 'Page Size',
            labelOrientation: 'Orientation',
            labelExport: 'Export',
            labelClear: 'Clear',
            labelAddImage: 'Add Image',
            labelPrevPage: 'Previous Page',
            labelNextPage: 'Next Page',
            placeholderText: 'Start typing your text here...'
        };
        
        this.pageSizes = {
            a4: { width: 2480, height: 3508 },
            letter: { width: 2550, height: 3300 },
            legal: { width: 2550, height: 4200 },
            a5: { width: 1748, height: 2480 },
            custom: { width: 2480, height: 3508 }
        };
        
        this.availableFonts = [
            'Caveat', 'Dancing Script', 'Permanent Marker', 'Indie Flower',
            'Shadows Into Light', 'Kalam', 'Patrick Hand', 'Satisfy',
            'Amatic SC', 'Handlee', 'Architects Daughter', 'Covered By Your Grace',
            'Reenie Beanie', 'Gloria Hallelujah', 'Crafty Girls', 'Nothing You Could Do',
            'Schoolbell', 'Waiting for the Sunrise', 'Just Another Hand', 'Rock Salt'
        ];
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.loadGoogleFonts();
        this.render();
        this.setupEventListeners();
        this.initializeCanvas();
    }

    static get observedAttributes() {
        return ['data', 'options'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (newValue && newValue !== oldValue) {
            if (name === 'options') {
                const newOptions = JSON.parse(newValue);
                Object.assign(this.settings, newOptions);
                this.render();
                this.updateCanvas();
            }
        }
    }

    loadGoogleFonts() {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?${this.availableFonts.map(font => `family=${font.replace(/ /g, '+')}:wght@400;700`).join('&')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    render() {
        const style = document.createElement('style');
        style.textContent = this.getStyles();
        
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this.createUI());
    }

    getStyles() {
        return `
            :host {
                --primary-color: ${this.settings.primaryColor};
                --secondary-color: ${this.settings.secondaryColor};
                --accent-color: ${this.settings.accentColor};
                --background-color: ${this.settings.backgroundColor};
                --text-color: ${this.settings.textColor};
                --line-color: ${this.settings.lineColor};
                --shadow-color: ${this.settings.shadowColor};
                --button-primary-bg: ${this.settings.buttonPrimaryBg};
                --button-primary-text: ${this.settings.buttonPrimaryText};
                --button-secondary-bg: ${this.settings.buttonSecondaryBg};
                --button-secondary-text: ${this.settings.buttonSecondaryText};
                --input-border-color: ${this.settings.inputBorderColor};
                --input-focus-color: ${this.settings.inputFocusColor};
                
                display: block;
                width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                color: var(--text-color);
                background-color: var(--background-color);
                box-sizing: border-box;
            }

            *, *::before, *::after {
                box-sizing: border-box;
            }

            .container {
                width: 100%;
                max-width: 1400px;
                margin: 0 auto;
                padding: 24px;
            }

            .controls-panel {
                background: var(--background-color);
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px var(--shadow-color);
            }

            .control-section {
                margin-bottom: 24px;
            }

            .control-section:last-child {
                margin-bottom: 0;
            }

            .section-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--primary-color);
                margin-bottom: 12px;
                display: block;
            }

            .control-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
            }

            .control-item {
                display: flex;
                flex-direction: column;
            }

            label {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-color);
                margin-bottom: 6px;
                display: block;
            }

            textarea, input, select, button {
                font-family: inherit;
                font-size: 14px;
            }

            textarea {
                width: 100%;
                min-height: 120px;
                padding: 12px;
                border: 2px solid var(--input-border-color);
                border-radius: 8px;
                resize: vertical;
                transition: border-color 0.3s ease;
                color: var(--text-color);
                background: var(--background-color);
            }

            textarea:focus {
                outline: none;
                border-color: var(--input-focus-color);
            }

            select {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid var(--input-border-color);
                border-radius: 8px;
                background: var(--background-color);
                color: var(--text-color);
                cursor: pointer;
                transition: border-color 0.3s ease;
            }

            select:focus {
                outline: none;
                border-color: var(--input-focus-color);
            }

            input[type="number"],
            input[type="color"] {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid var(--input-border-color);
                border-radius: 8px;
                background: var(--background-color);
                color: var(--text-color);
                transition: border-color 0.3s ease;
            }

            input[type="number"]:focus,
            input[type="color"]:focus {
                outline: none;
                border-color: var(--input-focus-color);
            }

            input[type="color"] {
                height: 44px;
                cursor: pointer;
            }

            input[type="range"] {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: var(--input-border-color);
                outline: none;
                -webkit-appearance: none;
            }

            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--secondary-color);
                cursor: pointer;
            }

            input[type="range"]::-moz-range-thumb {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--secondary-color);
                cursor: pointer;
                border: none;
            }

            .range-value {
                display: inline-block;
                margin-left: 8px;
                font-size: 13px;
                color: var(--secondary-color);
                font-weight: 600;
            }

            .button-group {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            button {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            button:focus {
                outline: 2px solid var(--input-focus-color);
                outline-offset: 2px;
            }

            .btn-primary {
                background: var(--button-primary-bg);
                color: var(--button-primary-text);
            }

            .btn-primary:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            .btn-secondary {
                background: var(--button-secondary-bg);
                color: var(--button-secondary-text);
            }

            .btn-secondary:hover {
                filter: brightness(0.95);
            }

            .btn-accent {
                background: var(--accent-color);
                color: white;
            }

            .btn-accent:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            input[type="file"] {
                display: none;
            }

            .file-label {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                background: var(--button-secondary-bg);
                color: var(--button-secondary-text);
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .file-label:hover {
                filter: brightness(0.95);
            }

            .canvas-container {
                background: #f5f5f5;
                border-radius: 12px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                box-shadow: 0 2px 8px var(--shadow-color);
                overflow: auto;
            }

            canvas {
                max-width: 100%;
                height: auto;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                background: white;
            }

            .pagination {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-top: 16px;
            }

            .page-info {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-color);
            }

            .loading {
                display: none;
                text-align: center;
                padding: 20px;
                color: var(--secondary-color);
                font-weight: 600;
            }

            .loading.active {
                display: block;
            }

            @media (max-width: 768px) {
                .container {
                    padding: 16px;
                }

                .controls-panel {
                    padding: 16px;
                }

                .control-grid {
                    grid-template-columns: 1fr;
                }

                .button-group {
                    flex-direction: column;
                }

                button, .file-label {
                    width: 100%;
                }
            }

            /* Accessibility improvements */
            .visually-hidden {
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

            *:focus-visible {
                outline: 2px solid var(--input-focus-color);
                outline-offset: 2px;
            }
        `;
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'container';
        container.setAttribute('role', 'main');

        container.innerHTML = `
            <div class="controls-panel" role="region" aria-label="Text to Handwriting Controls">
                <div class="control-section">
                    <label for="text-input" class="section-title">${this.settings.labelInputText}</label>
                    <textarea 
                        id="text-input" 
                        placeholder="${this.settings.placeholderText}"
                        aria-label="Text input for handwriting conversion"
                    >${this.settings.text}</textarea>
                </div>

                <div class="control-section">
                    <span class="section-title">Font & Style</span>
                    <div class="control-grid">
                        <div class="control-item">
                            <label for="font-select">${this.settings.labelFontFamily}</label>
                            <select id="font-select" aria-label="Select handwriting font">
                                ${this.availableFonts.map(font => 
                                    `<option value="${font}" ${font === this.settings.fontFamily ? 'selected' : ''}>${font}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="control-item">
                            <label for="font-size">${this.settings.labelFontSize}: <span class="range-value">${this.settings.fontSize}px</span></label>
                            <input type="range" id="font-size" min="12" max="72" value="${this.settings.fontSize}" aria-label="Font size slider">
                        </div>
                        <div class="control-item">
                            <label for="text-color">Text Color</label>
                            <input type="color" id="text-color" value="${this.settings.textColor}" aria-label="Text color picker">
                        </div>
                        <div class="control-item">
                            <label for="line-height">Line Height: <span class="range-value">${this.settings.lineHeight}</span></label>
                            <input type="range" id="line-height" min="1" max="3" step="0.1" value="${this.settings.lineHeight}" aria-label="Line height slider">
                        </div>
                    </div>
                </div>

                <div class="control-section">
                    <span class="section-title">Page Settings</span>
                    <div class="control-grid">
                        <div class="control-item">
                            <label for="page-type">${this.settings.labelPageType}</label>
                            <select id="page-type" aria-label="Select page type">
                                <option value="ruled" ${this.settings.pageType === 'ruled' ? 'selected' : ''}>Ruled Lines</option>
                                <option value="blank" ${this.settings.pageType === 'blank' ? 'selected' : ''}>Blank</option>
                                <option value="grid" ${this.settings.pageType === 'grid' ? 'selected' : ''}>Grid</option>
                                <option value="dotted" ${this.settings.pageType === 'dotted' ? 'selected' : ''}>Dotted</option>
                                <option value="cursive" ${this.settings.pageType === 'cursive' ? 'selected' : ''}>Cursive Lines</option>
                            </select>
                        </div>
                        <div class="control-item">
                            <label for="page-size">${this.settings.labelPageSize}</label>
                            <select id="page-size" aria-label="Select page size">
                                <option value="a4" ${this.settings.pageSize === 'a4' ? 'selected' : ''}>A4</option>
                                <option value="letter" ${this.settings.pageSize === 'letter' ? 'selected' : ''}>Letter</option>
                                <option value="legal" ${this.settings.pageSize === 'legal' ? 'selected' : ''}>Legal</option>
                                <option value="a5" ${this.settings.pageSize === 'a5' ? 'selected' : ''}>A5</option>
                            </select>
                        </div>
                        <div class="control-item">
                            <label for="orientation">${this.settings.labelOrientation}</label>
                            <select id="orientation" aria-label="Select page orientation">
                                <option value="portrait" ${this.settings.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
                                <option value="landscape" ${this.settings.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
                            </select>
                        </div>
                        <div class="control-item">
                            <label for="line-color">Line Color</label>
                            <input type="color" id="line-color" value="${this.settings.ruledLineColor}" aria-label="Line color picker">
                        </div>
                    </div>
                </div>

                <div class="control-section">
                    <span class="section-title">Advanced Options</span>
                    <div class="control-grid">
                        <div class="control-item">
                            <label for="paper-texture">Paper Texture</label>
                            <select id="paper-texture" aria-label="Select paper texture">
                                <option value="none" ${this.settings.paperTexture === 'none' ? 'selected' : ''}>None</option>
                                <option value="light" ${this.settings.paperTexture === 'light' ? 'selected' : ''}>Light</option>
                                <option value="medium" ${this.settings.paperTexture === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="heavy" ${this.settings.paperTexture === 'heavy' ? 'selected' : ''}>Heavy</option>
                            </select>
                        </div>
                        <div class="control-item">
                            <label for="ink-opacity">Ink Opacity: <span class="range-value">${this.settings.inkOpacity}%</span></label>
                            <input type="range" id="ink-opacity" min="50" max="100" value="${this.settings.inkOpacity}" aria-label="Ink opacity slider">
                        </div>
                        <div class="control-item">
                            <label for="export-format">Export Format</label>
                            <select id="export-format" aria-label="Select export format">
                                <option value="png" ${this.settings.exportFormat === 'png' ? 'selected' : ''}>PNG</option>
                                <option value="jpg" ${this.settings.exportFormat === 'jpg' ? 'selected' : ''}>JPG</option>
                                <option value="pdf" ${this.settings.exportFormat === 'pdf' ? 'selected' : ''}>PDF</option>
                            </select>
                        </div>
                        <div class="control-item">
                            <label for="export-dpi">Export DPI</label>
                            <select id="export-dpi" aria-label="Select export DPI">
                                <option value="150" ${this.settings.exportDpi === 150 ? 'selected' : ''}>150 DPI</option>
                                <option value="300" ${this.settings.exportDpi === 300 ? 'selected' : ''}>300 DPI</option>
                                <option value="600" ${this.settings.exportDpi === 600 ? 'selected' : ''}>600 DPI</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="control-section">
                    <div class="button-group">
                        <label for="image-upload" class="file-label">
                            <span>📁</span>
                            <span>${this.settings.labelAddImage}</span>
                        </label>
                        <input type="file" id="image-upload" accept="image/*" aria-label="Upload image">
                        
                        <button class="btn-primary" id="generate-btn" aria-label="Generate handwriting">
                            <span>✍️</span>
                            <span>Generate</span>
                        </button>
                        <button class="btn-accent" id="export-btn" aria-label="Export handwriting">
                            <span>💾</span>
                            <span>${this.settings.labelExport}</span>
                        </button>
                        <button class="btn-secondary" id="clear-btn" aria-label="Clear all content">
                            <span>🗑️</span>
                            <span>${this.settings.labelClear}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="loading" id="loading" aria-live="polite" aria-atomic="true">
                Generating handwriting...
            </div>

            <div class="canvas-container" role="region" aria-label="Handwriting preview">
                <canvas id="handwriting-canvas" role="img" aria-label="Generated handwriting preview"></canvas>
                <div class="pagination">
                    <button class="btn-secondary" id="prev-page" aria-label="Previous page">
                        <span>◀</span>
                        <span>${this.settings.labelPrevPage}</span>
                    </button>
                    <span class="page-info" aria-live="polite">Page <span id="current-page">1</span> of <span id="total-pages">1</span></span>
                    <button class="btn-secondary" id="next-page" aria-label="Next page">
                        <span>${this.settings.labelNextPage}</span>
                        <span>▶</span>
                    </button>
                </div>
            </div>
        `;

        return container;
    }

    setupEventListeners() {
        const root = this.shadowRoot;

        // Text input
        root.getElementById('text-input').addEventListener('input', (e) => {
            this.settings.text = e.target.value;
        });

        // Font controls
        root.getElementById('font-select').addEventListener('change', (e) => {
            this.settings.fontFamily = e.target.value;
            this.updateCanvas();
        });

        root.getElementById('font-size').addEventListener('input', (e) => {
            this.settings.fontSize = parseInt(e.target.value);
            root.querySelector('#font-size + label .range-value').textContent = `${e.target.value}px`;
            this.updateCanvas();
        });

        root.getElementById('text-color').addEventListener('input', (e) => {
            this.settings.textColor = e.target.value;
            this.updateCanvas();
        });

        root.getElementById('line-height').addEventListener('input', (e) => {
            this.settings.lineHeight = parseFloat(e.target.value);
            root.querySelector('#line-height + label .range-value').textContent = e.target.value;
            this.updateCanvas();
        });

        // Page settings
        root.getElementById('page-type').addEventListener('change', (e) => {
            this.settings.pageType = e.target.value;
            this.updateCanvas();
        });

        root.getElementById('page-size').addEventListener('change', (e) => {
            this.settings.pageSize = e.target.value;
            this.updateCanvas();
        });

        root.getElementById('orientation').addEventListener('change', (e) => {
            this.settings.orientation = e.target.value;
            this.updateCanvas();
        });

        root.getElementById('line-color').addEventListener('input', (e) => {
            this.settings.ruledLineColor = e.target.value;
            this.updateCanvas();
        });

        // Advanced options
        root.getElementById('paper-texture').addEventListener('change', (e) => {
            this.settings.paperTexture = e.target.value;
            this.updateCanvas();
        });

        root.getElementById('ink-opacity').addEventListener('input', (e) => {
            this.settings.inkOpacity = parseInt(e.target.value);
            root.querySelector('#ink-opacity + label .range-value').textContent = `${e.target.value}%`;
            this.updateCanvas();
        });

        root.getElementById('export-format').addEventListener('change', (e) => {
            this.settings.exportFormat = e.target.value;
        });

        root.getElementById('export-dpi').addEventListener('change', (e) => {
            this.settings.exportDpi = parseInt(e.target.value);
        });

        // Image upload
        root.getElementById('image-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        this.userImages.push(img);
                        this.updateCanvas();
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Buttons
        root.getElementById('generate-btn').addEventListener('click', () => {
            this.generateHandwriting();
        });

        root.getElementById('export-btn').addEventListener('click', () => {
            this.exportHandwriting();
        });

        root.getElementById('clear-btn').addEventListener('click', () => {
            this.clearAll();
        });

        // Pagination
        root.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.updateCanvas();
            }
        });

        root.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.pages.length - 1) {
                this.currentPage++;
                this.updateCanvas();
            }
        });
    }

    initializeCanvas() {
        this.canvas = this.shadowRoot.getElementById('handwriting-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.updateCanvas();
    }

    getPageDimensions() {
        let size = this.pageSizes[this.settings.pageSize];
        if (this.settings.orientation === 'landscape') {
            return { width: size.height, height: size.width };
        }
        return size;
    }

    drawBackground() {
        const dims = this.getPageDimensions();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, dims.width, dims.height);

        // Apply paper texture
        if (this.settings.paperTexture !== 'none') {
            this.applyPaperTexture();
        }
    }

    applyPaperTexture() {
        const dims = this.getPageDimensions();
        const imageData = this.ctx.getImageData(0, 0, dims.width, dims.height);
        const data = imageData.data;
        
        const intensity = {
            light: 0.02,
            medium: 0.05,
            heavy: 0.1
        }[this.settings.paperTexture] || 0;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 255;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    drawPageLines() {
        const dims = this.getPageDimensions();
        const { topMargin, bottomMargin, leftMargin, rightMargin } = this.settings;

        this.ctx.strokeStyle = this.settings.ruledLineColor;
        this.ctx.lineWidth = this.settings.lineThickness;

        if (this.settings.pageType === 'ruled' || this.settings.pageType === 'cursive') {
            const lineSpacing = this.settings.lineSpacing;
            const startY = topMargin;
            const endY = dims.height - bottomMargin;

            for (let y = startY; y < endY; y += lineSpacing) {
                this.ctx.beginPath();
                this.ctx.moveTo(leftMargin, y);
                this.ctx.lineTo(dims.width - rightMargin, y);
                this.ctx.stroke();

                if (this.settings.pageType === 'cursive') {
                    this.ctx.save();
                    this.ctx.setLineDash([2, 4]);
                    this.ctx.strokeStyle = this.settings.ruledLineColor + '80';
                    this.ctx.beginPath();
                    this.ctx.moveTo(leftMargin, y - lineSpacing / 3);
                    this.ctx.lineTo(dims.width - rightMargin, y - lineSpacing / 3);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        } else if (this.settings.pageType === 'grid') {
            const gridSize = 40;
            
            for (let x = leftMargin; x < dims.width - rightMargin; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, topMargin);
                this.ctx.lineTo(x, dims.height - bottomMargin);
                this.ctx.stroke();
            }
            
            for (let y = topMargin; y < dims.height - bottomMargin; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(leftMargin, y);
                this.ctx.lineTo(dims.width - rightMargin, y);
                this.ctx.stroke();
            }
        } else if (this.settings.pageType === 'dotted') {
            const dotSpacing = 40;
            this.ctx.fillStyle = this.settings.ruledLineColor;
            
            for (let y = topMargin; y < dims.height - bottomMargin; y += dotSpacing) {
                for (let x = leftMargin; x < dims.width - rightMargin; x += dotSpacing) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // Margin line
        if (this.settings.showMargins) {
            this.ctx.strokeStyle = this.settings.marginLineColor;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(leftMargin + 40, topMargin);
            this.ctx.lineTo(leftMargin + 40, dims.height - bottomMargin);
            this.ctx.stroke();
        }
    }

    drawText() {
        const dims = this.getPageDimensions();
        const { leftMargin, rightMargin, topMargin } = this.settings;
        
        this.ctx.font = `${this.settings.fontWeight} ${this.settings.fontSize}px '${this.settings.fontFamily}', cursive`;
        this.ctx.fillStyle = this.settings.textColor;
        this.ctx.globalAlpha = this.settings.inkOpacity / 100;
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = this.settings.textAlign;

        const maxWidth = dims.width - leftMargin - rightMargin - (this.settings.showMargins ? 60 : 20);
        const lineHeight = this.settings.fontSize * this.settings.lineHeight;
        const lines = this.wrapText(this.settings.text, maxWidth);
        
        let y = topMargin + 10;
        const x = this.settings.textAlign === 'right' ? dims.width - rightMargin - 20 : 
                  this.settings.textAlign === 'center' ? dims.width / 2 : 
                  leftMargin + (this.settings.showMargins ? 60 : 20);

        lines.forEach(line => {
            if (y + lineHeight < dims.height - this.settings.bottomMargin) {
                this.ctx.fillText(line, x, y);
                y += lineHeight;
            }
        });

        this.ctx.globalAlpha = 1;
    }

    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    drawImages() {
        this.userImages.forEach((img, index) => {
            const x = this.settings.leftMargin + (index * 100);
            const y = this.settings.topMargin;
            const maxSize = 200;
            
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const width = img.width * scale;
            const height = img.height * scale;
            
            this.ctx.drawImage(img, x, y, width, height);
        });
    }

    updateCanvas() {
        if (!this.canvas || !this.ctx) return;

        const dims = this.getPageDimensions();
        this.canvas.width = dims.width;
        this.canvas.height = dims.height;

        this.drawBackground();
        this.drawPageLines();
        this.drawText();
        this.drawImages();

        this.updatePagination();
    }

    generateHandwriting() {
        const loading = this.shadowRoot.getElementById('loading');
        loading.classList.add('active');

        setTimeout(() => {
            this.updateCanvas();
            loading.classList.remove('active');
        }, 500);
    }

    exportHandwriting() {
        const format = this.settings.exportFormat;
        const canvas = this.canvas;

        if (format === 'pdf') {
            this.exportAsPDF();
        } else {
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            const quality = this.settings.exportQuality / 100;
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `handwriting.${format}`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }, mimeType, quality);
        }
    }

    exportAsPDF() {
        // Simple PDF export - in production, use jsPDF library
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'handwriting.png';
        link.href = dataURL;
        link.click();
    }

    clearAll() {
        this.settings.text = '';
        this.userImages = [];
        this.currentPage = 0;
        this.shadowRoot.getElementById('text-input').value = '';
        this.updateCanvas();
    }

    updatePagination() {
        const totalPages = Math.max(1, this.pages.length);
        this.shadowRoot.getElementById('current-page').textContent = this.currentPage + 1;
        this.shadowRoot.getElementById('total-pages').textContent = totalPages;
        
        this.shadowRoot.getElementById('prev-page').disabled = this.currentPage === 0;
        this.shadowRoot.getElementById('next-page').disabled = this.currentPage >= totalPages - 1;
    }

    disconnectedCallback() {
        // Cleanup
    }
}

customElements.define('text-to-handwriting', TextToHandwritingElement);
