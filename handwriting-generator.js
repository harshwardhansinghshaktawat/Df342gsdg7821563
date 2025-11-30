class TextToHandwritingElement extends HTMLElement {
    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.settings = {
            text: "Type your text here...",
            fontFamily: 'Caveat',
            fontSize: 24,
            inkColor: '#0000aa',
            paperType: 'lined', // 'blank', 'lined', 'grid'
            lineColor: '#e0e0e0',
            paperColor: '#ffffff',
            lineHeight: 1.5,
            letterSpacing: 0,
            leftMargin: 50,
            topMargin: 50,
            randomness: 0.5, // 0 to 1, adds human jitter
            imageUrl: '',
            imagePosition: 'bottom-right', // 'top-left', 'center', etc.
            imageScale: 0.2,
            pageWidth: 595, // A4 width at 72dpi approx
            pageHeight: 842  // A4 height
        };
        this.fontsLoaded = {};
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.position = 'relative';
        
        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Create Download Button Overlay
        this.createControls();

        // Initial Load
        this.loadGoogleFont(this.settings.fontFamily, () => this.render());
    }

    static get observedAttributes() {
        return ['config', 'export-trigger'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'config' && newValue !== oldValue) {
            const newSettings = JSON.parse(newValue);
            Object.assign(this.settings, newSettings);
            
            // Only re-render if font is ready, otherwise load font then render
            if (newSettings.fontFamily !== this.settings.fontFamily && !this.fontsLoaded[newSettings.fontFamily]) {
                this.loadGoogleFont(newSettings.fontFamily, () => this.render());
            } else {
                this.render();
            }
        } else if (name === 'export-trigger') {
            // Trigger download logic when this attribute changes
            this.downloadImage();
        }
    }

    createControls() {
        const btn = document.createElement('button');
        btn.innerText = "Download Image";
        Object.assign(btn.style, {
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '10px 15px',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: '10'
        });
        btn.onclick = () => this.downloadImage();
        this.appendChild(btn);
    }

    loadGoogleFont(fontName, callback) {
        if (this.fontsLoaded[fontName]) {
            callback();
            return;
        }
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(/ /g, '+')}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        // Wait for font to load
        document.fonts.load(`20px "${fontName}"`).then(() => {
            this.fontsLoaded[fontName] = true;
            callback();
        });
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = 'handwriting-export.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    drawPaper() {
        const { width, height } = this.canvas;
        this.ctx.fillStyle = this.settings.paperColor;
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.settings.lineColor;
        this.ctx.lineWidth = 1;

        if (this.settings.paperType === 'lined') {
            const lineHeightPx = this.settings.fontSize * this.settings.lineHeight;
            for (let y = this.settings.topMargin; y < height; y += lineHeightPx) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(width, y);
            }
        } else if (this.settings.paperType === 'grid') {
            const gridSize = 30;
            for (let x = 0; x < width; x += gridSize) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, height);
            }
            for (let y = 0; y < height; y += gridSize) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(width, y);
            }
        }
        this.ctx.stroke();
        
        // Draw Margin Line (Red vertical line common in notebooks)
        if (this.settings.paperType !== 'blank') {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.moveTo(this.settings.leftMargin - 10, 0);
            this.ctx.lineTo(this.settings.leftMargin - 10, height);
            this.ctx.stroke();
        }
    }

    async drawImage() {
        if (!this.settings.imageUrl) return;
        
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = this.settings.imageUrl;
        
        return new Promise(resolve => {
            img.onload = () => {
                const scale = this.settings.imageScale;
                const w = img.width * scale;
                const h = img.height * scale;
                let x = 0, y = 0;

                // Simple positioning logic
                if(this.settings.imagePosition.includes('right')) x = this.canvas.width - w - 20;
                if(this.settings.imagePosition.includes('center')) x = (this.canvas.width/2) - (w/2);
                if(this.settings.imagePosition.includes('bottom')) y = this.canvas.height - h - 20;
                
                this.ctx.globalAlpha = 0.8; // Slight transparency
                this.ctx.drawImage(img, x, y, w, h);
                this.ctx.globalAlpha = 1.0;
                resolve();
            };
            img.onerror = resolve; // Continue even if image fails
        });
    }

    wrapText() {
        const text = this.settings.text;
        const xStart = this.settings.leftMargin;
        let y = this.settings.topMargin;
        const maxWidth = this.canvas.width - this.settings.leftMargin - 20;
        const lineHeight = this.settings.fontSize * this.settings.lineHeight;

        this.ctx.font = `${this.settings.fontSize}px "${this.settings.fontFamily}"`;
        this.ctx.fillStyle = this.settings.inkColor;
        this.ctx.textBaseline = 'bottom';

        const paragraphs = text.split('\n');

        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let line = '';

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = this.ctx.measureText(testLine);
                const testWidth = metrics.width;

                if (testWidth > maxWidth && n > 0) {
                    this.drawHumanLine(line, xStart, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
            this.drawHumanLine(line, xStart, y);
            y += lineHeight;
        });
    }

    // Draws text with slight rotation and offset for realism
    drawHumanLine(text, x, y) {
        let cursorX = x;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Random jitter
            const r = this.settings.randomness;
            const yOffset = (Math.random() - 0.5) * 4 * r; 
            const xOffset = (Math.random() - 0.5) * 2 * r;
            const rotation = (Math.random() - 0.5) * 0.1 * r;

            this.ctx.save();
            this.ctx.translate(cursorX + xOffset, y + yOffset);
            this.ctx.rotate(rotation);
            this.ctx.fillText(char, 0, 0);
            this.ctx.restore();

            const charWidth = this.ctx.measureText(char).width;
            cursorX += charWidth + this.settings.letterSpacing;
        }
    }

    async render() {
        // Set physical size
        this.canvas.width = this.settings.pageWidth;
        this.canvas.height = this.settings.pageHeight;
        
        // CSS display size (responsive)
        this.canvas.style.width = '100%';
        this.canvas.style.height = 'auto';

        this.drawPaper();
        await this.drawImage();
        this.wrapText();
    }
}

customElements.define('handwriting-generator', TextToHandwritingElement);
