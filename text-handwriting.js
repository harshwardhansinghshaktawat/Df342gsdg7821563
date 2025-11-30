/* text-handwriting-element.js
   Custom element: <text-handwriting>
   Attributes observed: text (string), options (JSON)
   Exposes methods for export: exportPNG(), exportJPEG(), exportPDF()
*/

class TextHandwritingElement extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.ctx = this.canvas.getContext('2d');
    this.settings = this.defaultSettings();
    this.fontsLoaded = {};
    this._pdfLibLoaded = false;
    this._html2canvasLoaded = false;
    this.rendering = false;

    // container styles
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.style.position = 'relative';
    wrapper.appendChild(this.canvas);

    const style = document.createElement('style');
    style.textContent = this.constructor.STYLE;

    this.shadow.appendChild(style);
    this.shadow.appendChild(wrapper);
  }

  static get STYLE() {
    return `
      :host { display:block; width:100%; height:100%; position:relative; background:#fff; overflow:hidden; }
      canvas { display:block; width:100% !important; height:100% !important; }
      .watermark { position:absolute; bottom:8px; right:8px; font-size:10px; color:rgba(0,0,0,0.2); }
    `;
  }

  defaultSettings() {
    return {
      text: 'Hello, hand-written world!',
      language: 'en',
      fontName: 'Indie Flower', // default handwriting-like google font
      googleFontVariant: 'regular', // pass to Google Fonts
      fontSize: 28,
      inkColor: '#222222',
      pageType: 'one-line', // 'one-line' | 'two-lines' | 'paragraph' | 'custom-ruled'
      pageSize: 'A4', // 'A4'|'Letter'|'A5'|'Custom'
      customWidth: 800,
      customHeight: 1200,
      lineSpacing: 1.6, // multiplier
      jitter: 0.6, // handwriting jitter strength 0-3
      cursive: true, // whether to use cursive smoothing (visual only)
      backgroundImage: null, // dataURL
      bgOpacity: 1,
      margin: 40,
      exportDPR: 2,
      allowUploads: true,
      showGuides: true,
      pageBackground: '#ffffff',
      languageFallbackFont: 'Arial'
    };
  }

  connectedCallback() {
    // initial size + draws
    this.updateSize();
    this.loadExportLibs();
    this.render();
    window.addEventListener('resize', () => this.updateSize());
  }

  static get observedAttributes() {
    return ['text', 'options'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (newVal == null) return;
    if (name === 'text') {
      this.settings.text = newVal;
    } else if (name === 'options') {
      try {
        const o = JSON.parse(newVal);
        Object.assign(this.settings, o);
      } catch (e) {
        console.warn('Invalid options JSON', e);
      }
    }
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.updateSize);
  }

  // responsive canvas pixel size
  updateSize() {
    const rect = this.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing for DPR
    this.render();
  }

  // Load Google font dynamically (simple loader)
  async loadGoogleFont(fontName, variant = 'regular') {
    const key = `${fontName}:${variant}`;
    if (this.fontsLoaded[key]) return;
    const familyForUrl = fontName.replace(/ /g, '+');
    const url = `https://fonts.googleapis.com/css2?family=${familyForUrl}:wght@400;700&display=swap`;
    // avoid duplicate link tags
    if (!document.querySelector(`link[data-gfont="${familyForUrl}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.setAttribute('data-gfont', familyForUrl);
      document.head.appendChild(link);
    }
    // wait until font is available
    try {
      await document.fonts.load(`16px "${fontName}"`);
      this.fontsLoaded[key] = true;
    } catch (e) {
      console.warn('font load failed', fontName, e);
    }
  }

  // Load export libraries (html2canvas + jsPDF) for export options
  loadExportLibs() {
    if (!this._html2canvasLoaded) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.onload = () => { this._html2canvasLoaded = true; };
      document.head.appendChild(s);
    }
    if (!this._pdfLibLoaded) {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s2.onload = () => { this._pdfLibLoaded = true; };
      document.head.appendChild(s2);
    }
  }

  // basic text layout: split into lines according to pageType
  layoutLines() {
    const s = this.settings;
    const raw = s.text || '';
    if (s.pageType === 'one-line') {
      return [raw];
    } else if (s.pageType === 'two-lines') {
      // try to split in middle nearest whitespace
      const mid = Math.floor(raw.length / 2);
      let left = raw.lastIndexOf(' ', mid);
      if (left === -1) left = mid;
      return [raw.substring(0, left).trim(), raw.substring(left).trim()];
    } else if (s.pageType === 'paragraph') {
      // basic wrap by max chars based on font size and width
      const approxCharsPerLine = Math.max(10, Math.floor((this.canvas.width / (s.fontSize * 1.1)) - 4));
      const words = raw.split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach(w => {
        if ((line + ' ' + w).trim().length <= approxCharsPerLine) {
          line = (line + ' ' + w).trim();
        } else {
          lines.push(line);
          line = w;
        }
      });
      if (line) lines.push(line);
      return lines;
    } else if (s.pageType === 'custom-ruled') {
      return raw.split('\n');
    } else {
      return [raw];
    }
  }

  // draw a single line with jitter / stroke to simulate handwriting
  drawHandwrittenLine(x, y, text, maxWidth) {
    const ctx = this.ctx;
    const s = this.settings;

    // optionally random small rotations / offsets for each chunk
    const baseFont = `${s.fontSize}px "${s.fontName}", ${s.languageFallbackFont}`;
    ctx.font = baseFont;
    ctx.fillStyle = s.inkColor;
    ctx.textBaseline = 'alphabetic';

    // approximate method: render each character with tiny offsets
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const metrics = ctx.measureText(ch);
      const w = Math.max(6, metrics.width);
      // jitter offsets depend on font size
      const jitterX = (Math.random() - 0.5) * s.jitter * (s.fontSize / 30);
      const jitterY = (Math.random() - 0.5) * s.jitter * (s.fontSize / 20);
      // small rotation occasionally
      const rot = ((Math.random() - 0.5) * s.jitter * 0.02);
      ctx.save();
      ctx.translate(cx + jitterX, y + jitterY);
      ctx.rotate(rot);
      // draw filled glyph
      ctx.fillText(ch, 0, 0);
      // optional stroke for more pen-like look
      if (s.cursive === false) { // if not cursive, add light stroke for pen
        ctx.lineWidth = Math.max(0.5, s.fontSize / 40);
        ctx.strokeStyle = this._darkenColor(s.inkColor, 0.15);
        ctx.strokeText(ch, 0, 0);
      }
      ctx.restore();
      cx += w;
      // small kerning variation
      cx += (Math.random() - 0.5) * (s.jitter * 0.4);
      if (maxWidth && cx - x > maxWidth) break;
    }
  }

  // utility: slightly darken a hex color
  _darkenColor(hex, amount = 0.1) {
    try {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
      const num = parseInt(c, 16);
      let r = (num >> 16) - Math.round(255 * amount);
      let g = ((num >> 8) & 0x00FF) - Math.round(255 * amount);
      let b = (num & 0x0000FF) - Math.round(255 * amount);
      r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
      return `rgb(${r},${g},${b})`;
    } catch (e) {
      return hex;
    }
  }

  // main render
  async render() {
    if (this.rendering) return;
    this.rendering = true;
    const s = this.settings;
    // ensure font loaded
    await this.loadGoogleFont(s.fontName, s.googleFontVariant);

    const ctx = this.ctx;
    const canvasW = this.canvas.width / (window.devicePixelRatio || 1);
    const canvasH = this.canvas.height / (window.devicePixelRatio || 1);

    // clear
    ctx.save();
    ctx.clearRect(0, 0, canvasW, canvasH);
    // background
    ctx.fillStyle = s.pageBackground || '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // background image if present
    if (s.backgroundImage) {
      try {
        const img = await this._loadImage(s.backgroundImage);
        ctx.globalAlpha = Math.max(0, Math.min(1, s.bgOpacity));
        // cover-fit
        const ratio = Math.max(canvasW / img.width, canvasH / img.height);
        const iw = img.width * ratio;
        const ih = img.height * ratio;
        ctx.drawImage(img, (canvasW - iw) / 2, (canvasH - ih) / 2, iw, ih);
        ctx.globalAlpha = 1;
      } catch (e) {
        console.warn('BG image load failed', e);
      }
    }

    // guides: ruled lines for 'custom-ruled' or if showGuides true
    if (s.showGuides) {
      ctx.save();
      ctx.strokeStyle = this._lightenColor(s.pageBackground, 0.08);
      ctx.lineWidth = 1;
      const startY = s.margin;
      const lineHeight = s.fontSize * s.lineSpacing;
      for (let y = startY; y < canvasH - s.margin; y += lineHeight) {
        ctx.beginPath();
        ctx.moveTo(s.margin, y);
        ctx.lineTo(canvasW - s.margin, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // draw text lines
    const lines = this.layoutLines();
    const totalLines = lines.length;
    const lineHeight = s.fontSize * s.lineSpacing;
    let startY = s.margin + s.fontSize; // initial baseline
    // center vertically for one-line or two-lines if space exists
    if (s.pageType === 'one-line' || s.pageType === 'two-lines') {
      const contentHeight = totalLines * lineHeight;
      startY = Math.max(s.margin + s.fontSize, (canvasH - contentHeight) / 2 + s.fontSize);
    }

    ctx.fillStyle = s.inkColor;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${s.fontSize}px "${s.fontName}", ${s.languageFallbackFont}`;

    const maxTextWidth = canvasW - s.margin * 2;

    // for each line, calculate x to center (or left)
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      // measure full width (approx)
      const measured = ctx.measureText(text);
      let x = s.margin;
      // center horizontally
      x = s.margin + (maxTextWidth - measured.width) / 2;
      const y = startY + i * lineHeight;
      // draw with handwriting simulation
      this.drawHandwrittenLine(x, y, text, maxTextWidth);
    }

    ctx.restore();
    this.rendering = false;
  }

  // helper to lighten a hex color
  _lightenColor(hex, amount = 0.1) {
    try {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
      const num = parseInt(c, 16);
      let r = (num >> 16) + Math.round(255 * amount);
      let g = ((num >> 8) & 0x00FF) + Math.round(255 * amount);
      let b = (num & 0x0000FF) + Math.round(255 * amount);
      r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
      return `rgb(${r},${g},${b})`;
    } catch (e) {
      return hex;
    }
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  }

  // Exports
  async exportPNG(filename = 'handwriting.png') {
    const dataUrl = this.canvas.toDataURL('image/png');
    this._downloadDataURL(dataUrl, filename);
    return dataUrl;
  }

  async exportJPEG(filename = 'handwriting.jpg', quality = 0.92) {
    const dataUrl = this.canvas.toDataURL('image/jpeg', quality);
    this._downloadDataURL(dataUrl, filename);
    return dataUrl;
  }

  async exportPDF(filename = 'handwriting.pdf', orientation = 'portrait') {
    // require jsPDF
    if (!this._pdfLibLoaded && !window.jspdf) {
      console.warn('jsPDF not loaded yet. Attempting to load library.');
      await new Promise((r) => setTimeout(r, 600));
    }
    if (!window.jspdf) {
      throw new Error('PDF export library not available.');
    }
    const { jsPDF } = window.jspdf;
    const imgData = this.canvas.toDataURL('image/png');
    // create pdf sized to canvas ratio
    const pdf = new jsPDF(orientation, 'px', [this.canvas.width / (window.devicePixelRatio||1), this.canvas.height / (window.devicePixelRatio||1)]);
    pdf.addImage(imgData, 'PNG', 0, 0, this.canvas.width / (window.devicePixelRatio||1), this.canvas.height / (window.devicePixelRatio||1));
    pdf.save(filename);
  }

  _downloadDataURL(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // External helper to update options programmatically
  setOptions(options) {
    Object.assign(this.settings, options);
    this.updateSize();
    this.render();
  }

  // allow text update
  setText(text) {
    this.settings.text = text;
    this.render();
  }
}

customElements.define('text-handwriting', TextHandwritingElement);
