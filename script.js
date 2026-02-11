/* --- GLOBAL STATE --- */
let state = {
    pages: [], 
    currentPageIndex: 0,
    zoom: 1.0,
    copiedData: null,
    selectedEl: null,
    dragMode: null,
    dragData: {},
    headersVisible: false,
    spellCheck: true,
    history: [],
    historyIndex: -1,
    cropMode: false,
    lastRange: null, 
    isProgrammaticUpdate: false 
};

const paper = document.getElementById('paper');
const floatToolbar = document.getElementById('float-toolbar');

// --- INITIALIZATION ---
window.onload = function() {
    initRulers();
    initThemes();
    initShapes();
    initClipart();
    initWordArt();
    initAds();
    initTemplates();
    initTablePicker();
    initFontPickers(); 
    setupZoomControls();
    
    // Set Default Zoom to 60%
    setZoom(0.6);
    
    // Create first page
    addNewPage();
    
    // Events
    paper.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp); 
    
    // Track selection changes to update Float Bar state
    document.addEventListener('selectionchange', () => {
        if(state.isProgrammaticUpdate) return; 

        const sel = window.getSelection();
        if(sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if(paper.contains(range.commonAncestorContainer)) {
                state.lastRange = range.cloneRange();
                if(state.selectedEl) updateFloatToolbarValues();
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        // Key Shortcuts
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            redo();
            return;
        }
        // Copy
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
            if (state.selectedEl && !isTextEditing()) {
                 e.preventDefault();
                 copyEl();
            }
        }
        // Paste
        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
             // Check if not focusing input
             if (!isTextEditing()) {
                 e.preventDefault();
                 pasteEl();
             }
        }
        
        // Only delete if not editing text
        if(e.key === 'Delete' && !isTextEditing()) {
            deleteSelected();
        }
        if(e.key === 'Escape') deselect(); 
    });
    
    window.addEventListener('click', (e) => {
        // Hide Dropdowns on outside click
        if(!e.target.closest('.dropdown-menu') && 
           !e.target.closest('.tool-btn') && 
           !e.target.closest('#float-toolbar') && 
           !e.target.closest('.font-picker-container')) {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            document.querySelectorAll('.custom-dropdown').forEach(d => d.style.display = 'none');
        }
        if(e.target.id === 'viewport' || e.target.classList.contains('viewport')) deselect();
    });
};

/* --- CUSTOM FONT PICKER LOGIC --- */
const fontList = [
    "Arial", "Segoe UI", "Times New Roman", "Courier New", "Verdana", "Georgia", "Comic Sans MS", "Impact", "Trebuchet MS",
    "Abril Fatface", "Acme", "Anton", "Architects Daughter", "Archivo Black", "Arvo", "Bangers", "Barlow", "Bebas Neue", "Bitter",
    "Bree Serif", "Cabin", "Cairo", "Caveat", "Cinzel", "Comfortaa", "Comic Neue", "Concert One", "Cookie", "Courgette", "Creepster",
    "Crimson Text", "Dancing Script", "DM Sans", "Dosis", "EB Garamond", "Exo 2", "Fira Sans", "Fjalla One", "Fredoka One",
    "Gloria Hallelujah", "Great Vibes", "Heebo", "Hind", "IBM Plex Sans", "Inconsolata", "Indie Flower", "Josefin Sans", "Kanit",
    "Karla", "Lato", "Libre Baskerville", "Lobster", "Lora", "Manrope", "Maven Pro", "Merriweather", "Monoton", "Montserrat", "Mukta",
    "Nanum Gothic", "Noto Sans", "Nunito", "Old Standard TT", "Open Sans", "Orbitron", "Oswald", "Oxygen", "Pacifico", "Passion One",
    "Patrick Hand", "Permanent Marker", "Playfair Display", "Poppins", "Press Start 2P", "Prompt", "PT Sans", "PT Serif", "Quicksand",
    "Rajdhani", "Raleway", "Righteous", "Roboto", "Roboto Condensed", "Roboto Mono", "Roboto Slab", "Rubik", "Sacramento", "Satisfy",
    "Shadows Into Light", "Signika", "Slabo 27px", "Source Code Pro", "Source Sans Pro", "Space Mono", "Teko", "Titillium Web",
    "Ubuntu", "Varela Round", "Vollkorn", "Work Sans", "Yanone Kaffeesatz", "Zilla Slab"
];

function initFontPickers() {
    const ribbonList = document.getElementById('ribbon-font-list');
    const floatList = document.getElementById('float-font-list');
    const preloader = document.getElementById('font-preloader');
    
    // Sort Alphabetically
    fontList.sort();

    fontList.forEach(font => {
        // Ribbon Item
        const item1 = document.createElement('div');
        item1.className = 'font-item';
        item1.innerText = font;
        item1.style.fontFamily = font;
        item1.onclick = () => { selectFont(font); };
        ribbonList.appendChild(item1);

        // Float Item
        const item2 = document.createElement('div');
        item2.className = 'font-item';
        item2.innerText = font;
        item2.style.fontFamily = font;
        item2.onclick = () => { selectFont(font); };
        floatList.appendChild(item2);

        // Preload font by creating an element
        const span = document.createElement('span');
        span.style.fontFamily = font;
        span.innerText = "A";
        preloader.appendChild(span);
    });
}

function toggleCustomDropdown(type) {
    const id = type === 'ribbon' ? 'ribbon-font-list' : 'float-font-list';
    const menu = document.getElementById(id);
    const isVisible = menu.style.display === 'block';
    
    // Close others
    document.querySelectorAll('.custom-dropdown').forEach(d => d.style.display = 'none');
    
    if (!isVisible) {
        // Calculate position to prevent clipping in Ribbon overflow
        if(type === 'ribbon') {
            const btn = document.getElementById('ribbon-font-btn');
            const rect = btn.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 2) + 'px';
            // We must ensure the width matches or is appropriate
            menu.style.width = '200px'; 
        }
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

function selectFont(fontName) {
    // FIXED: Immediately update UI Labels visually
    document.getElementById('ribbon-font-label').innerText = fontName;
    document.getElementById('float-font-label').innerText = fontName;
    
    // Execute
    if (state.selectedEl) {
        // If text selected, specific execute
        execCmd('fontName', fontName);
        
        // FIXED: Force immediate repaint to show font change
        forceRepaint();
    } else {
        // Set float font updates global execution state
        setFloatFont(fontName);
    }
    
    // Hide Menus
    document.querySelectorAll('.custom-dropdown').forEach(d => d.style.display = 'none');
}

// FIXED: Helper to force browser to repaint the selected element
function forceRepaint() {
    if(state.selectedEl) {
        const el = state.selectedEl;
        // Toggling a harmless style property forces layout recalculation
        const oldDisplay = el.style.display;
        el.style.display = 'none';
        // Trigger reflow
        el.offsetHeight; 
        el.style.display = oldDisplay || 'block'; 
        
        // Ensure focus remains for continued editing
        const content = el.querySelector('.element-content');
        if(content && content.getAttribute('contenteditable') === 'true') {
            content.focus();
        }
    }
}

function toggleSidebar(forceClose) {
    const sb = document.getElementById('sidebar');
    const trigger = document.getElementById('sidebar-toggle-trigger');
    
    if(forceClose) {
        sb.classList.add('manual-collapsed');
        sb.classList.remove('active');
        trigger.style.display = 'flex'; 
    } else {
        if(sb.classList.contains('manual-collapsed')) {
            sb.classList.remove('manual-collapsed');
            trigger.style.display = 'none'; 
        } else if(window.innerWidth <= 900) {
            sb.classList.toggle('active');
        } else {
            sb.classList.add('manual-collapsed');
            trigger.style.display = 'flex';
        }
    }
}

function isTextEditing() {
     const ae = document.activeElement;
     return ae && (ae.isContentEditable || ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
}

function updateFloatToolbarValues() {
    if(document.activeElement && (document.activeElement.id === 'float-font' || document.activeElement.id === 'float-size')) return;

    if(state.lastRange) {
        const parent = state.lastRange.commonAncestorContainer.parentElement || state.lastRange.commonAncestorContainer;
        if(parent && (parent.nodeType === 1)) {
            const computed = window.getComputedStyle(parent);
            const fam = computed.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
            
            // Update Labels
            document.getElementById('ribbon-font-label').innerText = fam;
            document.getElementById('float-font-label').innerText = fam;

            const fSize = parseInt(computed.fontSize);
            const sizeSelect = document.getElementById('float-size');
            for(let i=0; i<sizeSelect.options.length; i++) {
                 if(parseInt(sizeSelect.options[i].value) === fSize) {
                     sizeSelect.selectedIndex = i;
                     break;
                 }
            }
        }
    }
}

// --- SERIALIZER & RENDER ---
function serializeCurrentPage() {
    // FIXED: Preserve existing thumbnail if present so it doesn't blank out on page switch
    const existingPage = state.pages[state.currentPageIndex] || {};
    
    const p = {
        id: existingPage.id || Date.now(),
        thumb: existingPage.thumb, // <--- PRESERVE THUMBNAIL
        width: paper.style.width,
        height: paper.style.height,
        background: paper.style.background,
        header: paper.querySelector('.page-header').innerHTML,
        footer: paper.querySelector('.page-footer').innerHTML,
        borderStyle: paper.querySelector('.page-border-container').getAttribute('data-style') || 'none',
        elements: []
    };

    const els = paper.querySelectorAll('.pub-element');
    els.forEach(el => {
        const data = {
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.height,
            transform: el.style.transform,
            zIndex: el.style.zIndex,
            type: el.getAttribute('data-type') || 'box',
            innerHTML: '', 
            imgSrc: '', 
            clipPath: '', 
            bg: '', 
            cropMode: el.classList.contains('cropping'),
            imgStyle: {},
            scaleX: el.getAttribute('data-scaleX') || "1",
            scaleY: el.getAttribute('data-scaleY') || "1"
        };

        const content = el.querySelector('.element-content');
        const img = content.querySelector('img');
        const shapeDiv = content.querySelector('div');

        if (img) {
            data.imgSrc = img.src;
            data.imgStyle = {
                width: img.style.width,
                height: img.style.height,
                top: img.style.top,
                left: img.style.left,
                position: img.style.position,
                filter: img.style.filter,
                maxWidth: img.style.maxWidth,
                maxHeight: img.style.maxHeight
            };
        } else if (shapeDiv && shapeDiv.style.clipPath) {
            data.clipPath = shapeDiv.style.clipPath;
            data.bg = shapeDiv.style.background;
        } else {
            data.innerHTML = content.innerHTML;
        }

        p.elements.push(data);
    });
    return p;
}

function renderPage(pageData) {
    deselect();
    
    paper.style.width = pageData.width;
    paper.style.height = pageData.height;
    paper.style.background = pageData.background;
    
    paper.querySelector('.page-header').innerHTML = pageData.header;
    paper.querySelector('.page-footer').innerHTML = pageData.footer;
    
    const borderEl = paper.querySelector('.page-border-container');
    borderEl.setAttribute('data-style', pageData.borderStyle);
    setPageBorder(pageData.borderStyle, false); 

    const structural = paper.querySelectorAll('.margin-guides, .page-border-container, .page-header, .page-footer');
    paper.innerHTML = '';
    structural.forEach(el => paper.appendChild(el));

    pageData.elements.forEach(data => {
        const el = document.createElement('div');
        el.className = 'pub-element';
        el.style.left = data.left;
        el.style.top = data.top;
        el.style.width = data.width;
        el.style.height = data.height;
        el.style.transform = data.transform || 'none';
        el.style.zIndex = data.zIndex || 10;
        if (data.type) el.setAttribute('data-type', data.type);
        
        // Restore scale attributes
        const sX = data.scaleX || "1";
        const sY = data.scaleY || "1";
        el.setAttribute('data-scaleX', sX);
        el.setAttribute('data-scaleY', sY);

        let inner = '';
        if (data.imgSrc) {
            const s = data.imgStyle || {};
            const styleStr = `width:${s.width||'100%'}; height:${s.height||'100%'}; top:${s.top||0}; left:${s.left||0}; position:${s.position||'absolute'}; filter:${s.filter||'none'}; max-width:${s.maxWidth||'none'}; max-height:${s.maxHeight||'none'}`;
            inner = `<img src="${data.imgSrc}" style="${styleStr}">`;
        } else if (data.clipPath) {
            inner = `<div style="width:100%; height:100%; background:${data.bg}; clip-path:${data.clipPath}"></div>`;
        } else {
            inner = data.innerHTML;
        }

        el.innerHTML = `
            <div class="element-content" style="transform: scale(${sX}, ${sY});">${inner}</div>
            <div class="resize-handle rh-nw" data-dir="nw"></div>
            <div class="resize-handle rh-n" data-dir="n"></div>
            <div class="resize-handle rh-ne" data-dir="ne"></div>
            <div class="resize-handle rh-e" data-dir="e"></div>
            <div class="resize-handle rh-se" data-dir="se"></div>
            <div class="resize-handle rh-s" data-dir="s"></div>
            <div class="resize-handle rh-sw" data-dir="sw"></div>
            <div class="resize-handle rh-w" data-dir="w"></div>
            <div class="rotate-stick"></div>
            <div class="rotate-handle"></div>
        `;

        if (data.cropMode) el.classList.add('cropping');
        paper.appendChild(el);
    });
    
    toggleHeaderFooter(state.headersVisible);
    document.getElementById('page-count-status').innerText = `Page ${state.currentPageIndex + 1} of ${state.pages.length}`;
    updateSidebar();
}

// --- HISTORY MANAGEMENT ---
function pushHistory() {
    state.pages[state.currentPageIndex] = serializeCurrentPage();

    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }

    const snapshot = JSON.parse(JSON.stringify({
        pages: state.pages,
        idx: state.currentPageIndex
    }));

    state.history.push(snapshot);
    state.historyIndex++;
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreSnapshot(state.history[state.historyIndex]);
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreSnapshot(state.history[state.historyIndex]);
    }
}

function restoreSnapshot(snap) {
    state.pages = JSON.parse(JSON.stringify(snap.pages));
    state.currentPageIndex = snap.idx;
    renderPage(state.pages[state.currentPageIndex]);
    updateSidebar();
}

// --- PAGE MANAGEMENT ---
function addNewPage() {
    if(state.pages.length > 0) {
        state.pages[state.currentPageIndex] = serializeCurrentPage();
    }

    const newPage = {
        id: Date.now(),
        width: '794px', height: '1123px', // A4 Default
        background: '#ffffff',
        header: 'Header (Type here)', 
        footer: 'Footer (Type here)',
        borderStyle: 'none',
        elements: []
    };
    
    state.pages.push(newPage);
    state.currentPageIndex = state.pages.length - 1;
    renderPage(newPage);
    updateSidebar();
    
    setTimeout(() => {
        updateThumbnails();
        pushHistory(); 
    }, 50);
}

function switchPage(newIndex) {
    if (newIndex === state.currentPageIndex) return;
    state.pages[state.currentPageIndex] = serializeCurrentPage();
    state.currentPageIndex = newIndex;
    renderPage(state.pages[newIndex]);
}

function deletePage(index, event) {
    event.stopPropagation();
    if(!confirm("Delete this page?")) return;
    state.pages.splice(index, 1);
    if(state.pages.length === 0) {
        addNewPage();
    } else {
        if(state.currentPageIndex >= state.pages.length) {
            state.currentPageIndex = state.pages.length - 1;
        }
        renderPage(state.pages[state.currentPageIndex]);
        updateSidebar();
        pushHistory();
    }
}

function handleNewDocument() {
    if(confirm("Create a new document? \nOK: Save current and create new.\nCancel: Abort.")) {
         state.pages = [];
         state.history = [];
         state.historyIndex = -1;
         addNewPage();
    }
}

function updateSidebar() {
    const sb = document.getElementById('sidebar');
    const btn = sb.querySelector('.page-add-btn');
    sb.innerHTML = '';
    
    // Re-inject toggle button if cleared
    if(!sb.querySelector('.sidebar-collapse-btn')) {
         const t = document.createElement('div');
         t.className = 'sidebar-collapse-btn';
         t.innerHTML = '<i class="fas fa-angle-double-left"></i>';
         t.onclick = () => toggleSidebar(true);
         sb.appendChild(t);
    } else {
         sb.appendChild(sb.querySelector('.sidebar-collapse-btn'));
    }

    state.pages.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = `page-thumb-container ${i === state.currentPageIndex ? 'active' : ''}`;
        div.onclick = () => switchPage(i);
        
        div.innerHTML = `
            <div class="page-del-btn" onclick="deletePage(${i}, event)" title="Delete Page"><i class="fas fa-times"></i></div>
            <div class="page-thumb" id="thumb-${i}">
                ${p.thumb ? `<img src="${p.thumb}">` : '<div style="color:#ccc;text-align:center;padding-top:50px;">...</div>'}
            </div>
            <small>Page ${i+1}</small>
        `;
        sb.appendChild(div);
    });
    sb.appendChild(btn);
}

function updateThumbnails() {
    generateThumbnail(state.currentPageIndex);
}

function generateThumbnail(index) {
    if (index !== state.currentPageIndex) return;
    const original = document.getElementById('paper');
    const clone = original.cloneNode(true);
    
    clone.querySelectorAll('.resize-handle, .rotate-handle, .rotate-stick, .margin-guides').forEach(el => el.remove());
    
    const headers = clone.querySelectorAll('.page-header, .page-footer');
    headers.forEach(h => {
        h.classList.remove('visible'); 
        h.style.display = 'flex';
        h.style.border = 'none';
        if (!state.headersVisible && !h.innerText.trim()) h.style.display = 'none';
    });

    clone.querySelectorAll('.selected, .cropping').forEach(el => {
        el.classList.remove('selected'); 
        el.classList.remove('cropping');
        el.style.outline = 'none';
    });

    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.zIndex = '-9999'; 
    clone.style.pointerEvents = 'none';
    clone.style.transform = 'none'; 
    
    document.getElementById('viewport').appendChild(clone);

    html2canvas(clone, { 
        scale: 0.2, 
        logging: false, 
        useCORS: true,
        backgroundColor: null 
    }).then(canvas => {
        const dataUrl = canvas.toDataURL();
        if(state.pages[index]) {
            state.pages[index].thumb = dataUrl;
            const img = document.querySelector(`#thumb-${index} img`);
            if(img) img.src = state.pages[index].thumb;
            else updateSidebar(); 
        }
        clone.remove();
    }).catch(err => {
        clone.remove();
    });
}

function toggleHeaderFooter(forceState) {
    if (typeof forceState === 'boolean') {
        state.headersVisible = forceState;
    } else {
        state.headersVisible = !state.headersVisible;
    }
    const hdr = paper.querySelector('.page-header');
    const ftr = paper.querySelector('.page-footer');
    if(state.headersVisible) {
        hdr.classList.add('visible');
        ftr.classList.add('visible');
    } else {
        hdr.classList.remove('visible');
        ftr.classList.remove('visible');
    }
}

// --- ZOOM CONTROLS ---
function setupZoomControls() {
    window.addEventListener('wheel', (e) => {
        if(e.ctrlKey) {
            e.preventDefault();
            let delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(Math.max(0.2, Math.min(3.0, state.zoom + delta)));
        }
    }, {passive: false});

    document.addEventListener('keydown', (e) => {
        if(e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            setZoom(Math.max(0.2, Math.min(3.0, state.zoom + 0.1)));
        }
        if(e.ctrlKey && e.key === '-') {
            e.preventDefault();
            setZoom(Math.max(0.2, Math.min(3.0, state.zoom - 0.1)));
        }
        if(e.ctrlKey && e.key === '0') {
            e.preventDefault();
            setZoom(1.0);
        }
    });
}

// --- THEMES & STYLES ---
function initThemes() {
    const container = document.getElementById('theme-group');
    const colors = [
        '#ffffff', '#fdf2f0', '#e8f6f3', '#fef9e7', '#f4ecf7', '#eaf2f8',
        '#ebf5fb', '#e8daef', '#d4e6f1', '#d1f2eb', '#fcf3cf', '#fadbd8',
        '#333333', '#2c3e50', '#5d6d7e', '#800000', '#1a5276', '#117864',
        'linear-gradient(to bottom right, #fff, #eee)',
        'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #fff 10px, #fff 20px)',
        'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
        'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
        'radial-gradient(circle, #fff, #ccc)',
        'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
        'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
        'linear-gradient(to top, #5f72bd 0%, #9b23ea 100%)',
        'linear-gradient(to top, #09203f 0%, #537895 100%)',
        'repeating-radial-gradient(circle, #fff, #fff 10px, #eee 10px, #eee 20px)'
    ];
    
    colors.forEach(c => {
        const swatch = document.createElement('div');
        swatch.style.width = '60px';
        swatch.style.height = '40px';
        swatch.style.background = c;
        swatch.style.display = 'inline-block';
        swatch.style.margin = '2px';
        swatch.style.border = '1px solid #999';
        swatch.style.cursor = 'pointer';
        swatch.style.verticalAlign = 'middle';
        swatch.style.borderRadius = '2px'; // Round Corners Update
        swatch.title = "Apply Background";
        swatch.onclick = () => { paper.style.background = c; pushHistory(); };
        container.appendChild(swatch);
    });
}

// --- BORDERS ---
function setPageBorder(type, doPush = true) {
    const div = document.getElementById('page-border');
    div.setAttribute('data-style', type);
    div.style.cssText = 'position: absolute; inset: 0; pointer-events: none; z-index: 2500; box-sizing: border-box;'; 
    div.innerHTML = ''; 

    if(type === 'none') { if(doPush) pushHistory(); return; }
    
    if (type.startsWith('fancy-')) {
        if (type === 'fancy-deco') { 
            div.style.border = "15px solid #333"; 
            div.style.outline = "2px dashed #333"; 
            div.style.outlineOffset = "-20px"; 
        }
        else if (type === 'fancy-cert') { 
            div.style.border = "20px solid #d4af37"; 
            div.style.borderImage = "linear-gradient(to bottom right, #b8860b, #ffd700, #b8860b) 1"; 
            const inner = document.createElement('div'); 
            inner.style.position = 'absolute'; inner.style.inset = '5px'; inner.style.border = '2px solid #b8860b'; 
            div.appendChild(inner); 
        }
        else if (type === 'fancy-double') { 
            div.style.border = "double 10px #000"; 
            div.style.outline = "double 4px #000"; 
            div.style.outlineOffset = "-15px"; 
        }
        else if (type === 'fancy-antique') {
            div.style.border = "10px double #5d4037";
            const c = document.createElement('div');
            c.style.cssText = "position:absolute; inset:5px; border: 2px solid #5d4037; border-radius: 10px;";
            div.appendChild(c);
        }
        else if (type === 'fancy-modern') {
            div.style.border = "20px solid #2c3e50";
            div.style.borderBottom = "40px solid #2c3e50";
        }
        else if (type === 'fancy-floral') {
            div.style.border = "5px solid green";
            const tl = document.createElement('div'); tl.innerText = "🌿"; tl.style.cssText = "position:absolute; top:-15px; left:-15px; font-size:40px;";
            const tr = document.createElement('div'); tr.innerText = "🌿"; tr.style.cssText = "position:absolute; top:-15px; right:-15px; font-size:40px; transform:scaleX(-1);";
            const bl = document.createElement('div'); bl.innerText = "🌿"; bl.style.cssText = "position:absolute; bottom:-15px; left:-15px; font-size:40px; transform:scaleY(-1);";
            const br = document.createElement('div'); br.innerText = "🌿"; br.style.cssText = "position:absolute; bottom:-15px; right:-15px; font-size:40px; transform:scale(-1);";
            div.appendChild(tl); div.appendChild(tr); div.appendChild(bl); div.appendChild(br);
        }
    } else {
        div.style.border = `5px ${type} #333`;
        div.style.inset = '0px'; 
    }
    document.getElementById('border-dropdown').style.display = 'none';
    if(doPush) pushHistory();
}

// --- SHAPES ENGINE ---
function initShapes() {
    const grid = document.getElementById('shape-grid');
    const gridOutline = document.getElementById('shape-grid-outline');

    const basicShapes = [
        {n:'Rect', c:'inset(0)'}, 
        {n:'Circle', c:'circle(50%)'},
        {n:'Tri', c:'polygon(50% 0%, 0% 100%, 100% 100%)'},
        {n:'Dia', c:'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'},
        {n:'Star5', c:'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'},
        {n:'Msg', c:'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)'},
        {n:'Banner', c:'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)'},
        {n:'Hex', c:'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'},
        {n:'Oct', c:'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'},
        {n:'Trap', c:'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)'}
    ];

    basicShapes.forEach((s) => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `<div style="width:25px; height:25px; background:#007670; clip-path:${s.c}"></div>`;
        item.onclick = () => {
            addShapeElement(s.c, '#007670');
            document.getElementById('shape-dropdown').style.display = 'none';
        };
        grid.appendChild(item);
    });

    // OUTLINE LIST
    const outlineShapes = [
        {svg: '<rect x="5" y="5" width="90" height="90" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<rect x="5" y="5" width="90" height="90" rx="20" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<circle cx="50" cy="50" r="45" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<ellipse cx="50" cy="50" rx="45" ry="30" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="50,5 5,95 95,95" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="50,5 20,95 80,95" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="5,5 5,95 95,95" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="25,5 75,5 98,50 75,95 25,95 2,50" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<polygon points="50,5 65,35 95,50 65,65 50,95 35,65 5,50 35,35" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<path d="M10,50 Q50,0 90,50 L70,50 L50,20 L30,50 Z" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<path d="M5,5 h90 v60 h-30 l-10,20 l-10,-20 h-40 z" fill="none" stroke="black" stroke-width="2"/>'},
        {svg: '<path d="M50,5 A45,35 0 0 1 50,75 L30,95 L40,70 A45,35 0 0 1 50,5 z" fill="none" stroke="black" stroke-width="2"/>'},
            {svg: '<path d="M50,90 C5,60 5,20 25,20 C35,20 45,30 50,40 C55,30 65,20 75,20 C95,20 95,60 50,90" fill="none" stroke="black" stroke-width="2"/>'},
            {svg: '<polygon points="40,5 65,5 50,40 75,40 35,95 45,55 20,55" fill="none" stroke="black" stroke-width="2"/>'},
            {svg: '<path d="M40,5 Q10,5 10,30 v15 l-5,5 l5,5 v15 Q10,95 40,95" fill="none" stroke="black" stroke-width="2"/>'},
            {svg: '<path d="M60,5 Q90,5 90,30 v15 l5,5 l-5,5 v15 Q90,95 60,95" fill="none" stroke="black" stroke-width="2"/>'},
            // Happy Face
            {svg: '<circle cx="50" cy="50" r="45" fill="none" stroke="black" stroke-width="2"/><circle cx="35" cy="35" r="5" fill="black"/><circle cx="65" cy="35" r="5" fill="black"/><path d="M30,65 Q50,85 70,65" fill="none" stroke="black" stroke-width="2"/>'},
            // Arrows
            {svg: '<line x1="10" y1="50" x2="90" y2="50" stroke="black" stroke-width="2" marker-end="url(#ah)"/>'},
            {svg: '<line x1="10" y1="50" x2="90" y2="50" stroke="black" stroke-width="2" marker-start="url(#ah)" marker-end="url(#ah)"/>'},
            {svg: '<path d="M10,50 Q50,10 90,50" fill="none" stroke="black" stroke-width="2" marker-end="url(#ah)"/>'},
            // Callouts
            {svg: '<path d="M5,5 h90 v60 h-40 l-10,20 l-10,-20 h-30 z" fill="none" stroke="black" stroke-width="2"/>'},
            {svg: '<ellipse cx="50" cy="40" rx="45" ry="30" fill="none" stroke="black" stroke-width="2"/><path d="M20,60 L10,90 L40,65" fill="none" stroke="black" stroke-width="2"/>'}
    ];

    const svgDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgDefs.innerHTML = '<defs><marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" /></marker></defs>';
    document.body.appendChild(svgDefs);
    svgDefs.style.display='none';

    outlineShapes.forEach(s => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `<svg viewBox="0 0 100 100" style="width:25px; height:25px;">${s.svg}</svg>`;
        item.onclick = () => {
            createWrapper(`<svg viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">${s.svg}</svg>`);
            document.getElementById('shape-dropdown').style.display = 'none';
        };
        gridOutline.appendChild(item);
    });
}

// --- CLIPART SYSTEM (TWEMOJI) ---
function initClipart() {
    const grid = document.getElementById('clipart-grid');

    // Massive list of high-quality vector emojis
    // Grouped by Category with unique, intact sequences
    const categories = {
        "People & Fantasy": [
            // Base Smileys
            "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
            // Gestures
            "👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪",
            // People (Base)
            "👶","👧","🧒","👦","👩","🧑","👨","👩‍🦱","🧑‍🦱","👨‍🦱","👩‍","🧑‍🦰","👨‍🦰","👱‍♀️","👱","👱‍♂️","👩‍🦳","🧑‍🦳","👨‍🦳","👩‍🦲","🧑‍🦲","👨‍🦲","🧔","👵","🧓","👴","👲","👳‍♀️","👳","👳‍♂️","🧕",
            // Professions (ZWJ Sequences)
            "👮‍♀️","👮","👮‍♂️","👷‍♀️","👷","👷‍♂️","💂‍♀️","💂","💂‍♂️","🕵️‍♀️","🕵️","🕵️‍♂️","👩‍⚕️","🧑‍⚕️","👨‍⚕️","👩‍🌾","🧑‍🌾","👨‍🌾","👩‍🍳","🧑‍🍳","👨‍🍳","👩‍🎓","🧑‍🎓","👨‍🎓","👩‍🎤","🧑‍🎤","👨‍🎤","👩‍🏫","🧑‍🏫","👨‍🏫","👩‍🏭","🧑‍🏭","👨‍🏭","👩‍💻","🧑‍💻","👨‍💻","👩‍💼","🧑‍💼","👨‍💼","👩‍🔧","🧑‍🔧","👨‍🔧","👩‍🔬","🧑‍🔬","👨‍🔬","👩‍🎨","🧑‍🎨","👨‍🎨","👩‍🚒","🧑‍🚒","👨‍🚒","👩‍✈️","🧑‍✈️","👨‍✈️","👩‍🚀","🧑‍🚀","👨‍🚀","👩‍⚖️","🧑‍⚖️","👨‍⚖️",
            // Fantasy & Roles
            "👰","🤵","👸","🤴","🦸‍♀️","🦸","🦸‍♂️","🦹‍♀️","🦹","🦹‍♂️","🤶","🎅","🧙‍♀️","🧙","🧙‍♂️","🧝‍♀️","🧝","🧝‍♂️","🧛‍♀️","🧛","🧛‍♂️","🧟‍♀️","🧟","🧟‍♂️","🧞‍♀️","🧞","🧞‍♂️","🧜‍♀️","🧜","🧜‍♂️","🧚‍♀️","🧚","🧚‍♂️","👼"
        ],
        "Animals & Nature": [
            "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵","🐵","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🕸","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐓","🦃","🦚","🦜","🦢","🦩","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔",
            "🐾","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🎍","🎋","🍃","🍂","🍁","🍄","🐚","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊","🌫"
        ],
        "Food & Drink": [
            "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🥮","☕️","🍵","🥣","🍼","🥤","🧃","🧉","🥛","🍺","🍻","🍷","🥂","🥃","🍸","🍹","🍾","🥄","🍴","🍽","🥣","🥡","🥢","🧂"
        ],
        "Activity & Sports": [
            "⚽️","🏀","🏈","⚾️","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🥅","⛳️","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛷","⛸","🥌","🎿","⛷","🏂","🪂","🏋️‍♀️","🏋️","🏋️‍♂️","🤼‍♀️","🤼","🤼‍♂️","🤸‍♀️","🤸","🤸‍♂️","⛹️‍♀️","⛹️","⛹️‍♂️","🤺","🤾‍♀️","🤾","🤾‍♂️","🏌️‍♀️","🏌️","🏌️‍♂️","🏇","🧘‍♀️","🧘","🧘‍♂️","🏄‍♀️","🏄","🏄‍♂️","🏊‍♀️","🏊","🏊‍♂️","🤽‍♀️","🤽","🤽‍♂️","🚣‍♀️","🚣","🚣‍♂️","🧗‍♀️","🧗","🧗‍♂️","🚵‍♀️","🚵","🚵‍♂️","🚴‍♀️","🚴","🚴‍♂️","🏆","🥇","🥈","🥉","🏅","🎖","🏵","🎗","🎫","🎟","🎪","🤹","🤹‍♂️","🤹‍♀️","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎲","♟","🎯","🎳","🎮","🎰","🧩"
        ],
        "Travel & Places": [
            "🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🦯","🦽","🦼","🛴","🚲","🛵","🏍","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩","💺","🛰","🚀","🛸","🚁","🛶","⛵️","🚤","🛥","🛳","⛴","🚢","⚓️","⛽️","🚧","🚦","🚥","🚏","🗺","🗿","🗽","🗼","🏰","🏯","🏟","🎡","🎢","🎠","⛲️","⛱","🏖","🏝","🏜","🌋","⛰","🏔","🗻","⛺️","🏠","🏡","🏘","🏚","🏗","🏭","🏢","🏬","🏣","🏤","🏥","🏦","🏨","🏪","🏫","🏩","💒","🏛","⛪️","🕌","🕍","🛕","🕋","⛩","🛤","🛣","🗾","🎑","🏞","🌅","🌄","🌠","🎇","🎆","🌇","🌆","🏙","🌃","🌌","🌉","🌁"
        ],
        "Objects & Tech": [
            "⌚️","📱","📲","💻","⌨️","🖥","🖨","🖱","🖲","🕹","🗜","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽","🎞","📞","☎️","📟","📠","📺","📻","🎙","🎚","🎛","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","📡","🔋","🔌","💡","🔦","🕯","🪔","🧯","🛢","💸","💵","💴","💶","💷","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🪓","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🔪","🗡","⚔️","🛡","🚬","⚰️","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳","🩹","🩺","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪒","🧽","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🛍","🛒","🎁","🎈","🎏","🎀","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📪","📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","📇","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓"
        ],
        "Symbols": [
            "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈️","♉️","♊️","♋️","♌️","♍️","♎️","♏️","♐️","♑️","♒️","♓️","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚️","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕️","🛑","⛔️","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗️","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸","🔱","⚜️","🔰","♻️","✅","🈯️","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿️","🅿️","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","🚻","🚮","🎦","📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","#️⃣","*️⃣","⏏️","▶️","⏸","⏯","⏹","⏺","⏭","⏮","⏩","⏪","⏫","⏬","◀️","🔼","🔽","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","↪️","↩️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🎵","🎶","➕","➖","➗","✖️","♾","💲","💱","™️","©️","®️","👁‍🗨","🔚","🔙","🔛","🔝","🔜","〰️","➰","➿","✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫️","⚪️","🟤","🔺","🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪️","▫️","◾️","◽️","◼️","◻️","🟥","🟧","🟨","🟩","🟦","🟪","⬛️","⬜️","🔈","🔇","🔉","🔊","🔔","🔕","📣","📢","💬","💭","🗯","♠️","♣️","♥️","♦️","🃏","🎴","🀄️","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛","🕜","🕝","🕞","🕟","🕠","🕡","🕢","🕣","🕤","🕥","🕦","🕧"
        ],
        "Flags": [
            "🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇦🇫","🇦🇽","🇦🇱","🇩🇿","🇦🇸","🇦🇩","🇦🇴","🇦🇮","🇦🇶","🇦🇬","🇦🇷","🇦🇲","🇦🇼","🇦🇺","🇦🇹","🇦🇿","🇧🇸","🇧🇭","🇧🇩","🇧🇧","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇲","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇮🇴","🇻🇬","🇧🇳","🇧🇬","🇧🇫","🇧🇮","🇰🇭","🇨🇲","🇨🇦","🇮🇨","🇨🇻","🇧bq","🇰🇾","🇨🇫","🇹🇩","🇨🇱","🇨🇳","🇨🇽","🇨🇨","🇨🇴","🇰🇲","🇨🇬","🇨🇩","🇨🇰","🇨🇷","🇨🇮","🇭🇷","🇨🇺","🇨🇼","🇨🇾","🇨🇿","🇩🇰","🇩🇯","🇩🇲","🇩🇴","🇪🇨","🇪🇬","🇸🇻","🇬🇶","🇪🇷","🇪🇪","🇪🇹","🇪🇺","🇫🇰","🇫🇴","🇫🇯","🇫🇮","🇫🇷","🇬🇫","🇵🇫","🇹🇫","🇬🇦","🇬🇲","🇬🇪","🇩🇪","🇬🇭","🇬🇮","🇬🇷","🇬🇱","🇬🇩","🇬🇵","🇬🇺","🇬🇹","🇬🇬","🇬🇳","🇬🇼","🇬🇾","🇭🇹","🇭🇳","🇭🇰","🇭🇺","🇮🇸","🇮🇳","🇮🇩","🇮🇷","🇮🇶","🇮🇪","🇮🇲","🇮🇱","🇮🇹","🇯🇲","🇯🇵","🎌","🇯🇪","🇯🇴","🇰🇿","🇰🇪","🇰🇮","🇽🇰","🇰🇼","🇰🇬","🇱🇦","🇱🇻","🇱🇧","🇱🇸","🇱🇷","🇱🇾","🇱🇮","🇱🇹","🇱🇺","🇲🇴","🇲🇰","🇲🇬","🇲🇼","🇲🇾","🇲🇻","🇲🇱","🇲🇹","🇲🇭","🇲🇶","🇲🇷","🇲🇺","YT","🇲🇽","🇫🇲","🇲🇩","🇲🇨","🇲🇳","🇲🇪","🇲🇸","🇲🇦","🇲🇿","🇲🇲","🇳🇦","🇳🇷","🇳🇵","🇳🇱","🇳🇨","🇳🇿","🇳🇮","🇳🇪","🇳🇬","🇳🇺","🇳🇫","🇰🇵","🇲🇵","🇳🇴","🇴🇲","🇵🇰","🇵🇼","🇵🇸","🇵🇦","🇵🇬","🇵🇾","🇵🇪","🇵🇭","🇵🇳","🇵🇱","🇵🇹","🇵🇷","🇶🇦","🇷🇪","🇷🇴","🇷🇺","🇷🇼","🇼🇸","🇸🇲","🇸🇦","🇸🇳","🇷🇸","🇸🇨","🇸🇱","🇸🇬","🇸🇽","🇸🇰","🇸🇮","🇬🇸","🇸🇧","🇸🇴","🇿🇦","🇰🇷","🇸🇸","🇪🇸","🇱🇰","🇧🇱","🇸🇭","🇰🇳","🇱🇨","🇵🇲","🇻🇨","🇸🇩","🇸🇷","🇸🇿","🇸🇪","🇨🇭","🇸🇾","🇹🇼","🇹🇯","🇹🇿","🇹🇭","🇹🇱","🇹🇬","🇹🇰","🇹🇴","🇹🇹","🇹🇳","🇹🇷","🇹🇲","🇹🇨","🇹🇻","🇺🇬","🇺🇦","🇦🇪","🇬🇧","🏴󠁧󠁢󠁥󠁮󠁧󠁿","🏴󠁧󠁢󠁳󠁣󠁴󠁿","🏴󠁧󠁢󠁷󠁬󠁳󠁿","🇺🇸","🇺🇾","🇺🇿","🇻🇺","🇻🇦","🇻🇪","🇻🇳","🇼🇫","🇪🇭","🇾🇪","🇿🇲","🇿🇼"
        ]
    };

    const hexHelper = (str) => {
        // Correctly handles ZWJ sequences like 👨‍✈️ by processing codepoints not chars
        return Array.from(str).map(c => c.codePointAt(0).toString(16)).join('-');
    };

    Object.keys(categories).forEach(cat => {
        // Add header
        const header = document.createElement('div');
        header.style.gridColumn = "1 / -1";
        header.style.padding = "5px";
        header.style.background = "#eee";
        header.style.fontWeight = "bold";
        header.style.fontSize = "12px";
        header.style.marginTop = "10px";
        header.innerText = cat;
        grid.appendChild(header);

        categories[cat].forEach(char => {
            const hex = hexHelper(char);
            const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${hex}.svg`;

            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.title = "Insert Clipart";
            
            const img = document.createElement('img');
            img.src = url;
            img.style.width = "100%";
            img.style.height = "100%";
            img.loading = "lazy";
            
            // Add simple error handler to hide broken ones
            img.onerror = () => { div.style.display = 'none'; };

            div.appendChild(img);
            div.onclick = () => {
                 createWrapper(`<img src="${url}" style="width:100%; height:100%; position:absolute; top:0; left:0;">`);
                 document.getElementById('clipart-modal').style.display = 'none';
            };
            grid.appendChild(div);
        });
    });
}

function initWordArt() {
    const grid = document.getElementById('wordart-grid');
    for(let i=1; i<=60; i++) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.style.height = '40px'; 
        item.innerHTML = `<div class="wa-text wa-style-${i}" style="font-size:24px;">Aa</div>`;
        item.onclick = () => {
            createWrapper(`<div class="wa-wrapper"><div class="wa-text wa-style-${i}">Word Art</div></div>`);
            document.getElementById('wordart-modal').style.display = 'none';
        };
        grid.appendChild(item);
    }
}

function initAds() {
    const grid = document.getElementById('ad-grid');
    const ads = [
        {t: 'Sale', c: 'red', s: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', n: 'Star'}, 
        {t: 'New!', c: 'blue', s: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', n:'Star Blue'},
        {t: '50% OFF', c: 'green', s: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)', n:'Octagon'}, 
        {t: 'Buy 1 Get 1', c: 'orange', s: 'inset(0)', n:'Rect'},
        {t: 'Best Value', c: 'purple', s: 'polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)', n:'Msg'}, 
        {t: 'Limited', c: '#333', s: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)', n:'Banner'},
        {t: 'Clearance', c: '#e91e63', s: 'polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%)', n:'Cross'},
        {t: 'Flash Sale', c: '#ffeb3b', tc:'#000', s: 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)', n:'Burst'},
        {t: 'Grand Opening', c: '#009688', s: 'ellipse(50% 25% at 50% 50%)', n:'Oval'},
        {t: 'Special', c: '#795548', s: 'polygon(10% 25%, 35% 25%, 35% 0%, 65% 0%, 65% 25%, 90% 25%, 90% 50%, 65% 50%, 65% 100%, 35% 100%, 35% 50%, 10% 50%)', n:'Ribbon'},
        {t: 'Hot Deal', c: '#ff5722', s: 'circle(50% at 50% 50%)', n:'Circle'},
        {t: 'Exclusive', c: '#3f51b5', s: 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)', n:'Trapezoid'}
    ];
    
    ads.forEach(ad => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.style.background = '#fff';
        const textColor = ad.tc ? ad.tc : 'white';
        div.innerHTML = `<div style="width:60px; height:60px; display:flex; align-items:center; justify-content:center; background:${ad.c}; color:${textColor}; font-family:Impact; font-size:10px; text-align:center; clip-path:${ad.s};">${ad.t}</div>`;
        div.onclick = () => {
            const el = createWrapper(`<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:${ad.c}; color:${textColor}; font-family:Impact; font-size:24px; text-align:center; clip-path:${ad.s};">${ad.t}</div>`);
            el.style.width = "150px"; el.style.height = "150px";
            document.getElementById('ad-modal').style.display = 'none';
        };
        grid.appendChild(div);
    });
}

function initTemplates() {
    const tmplData = {
        "Resumes": [
            {
                n: "Modern Minimal", bg: "#fff",
                els: [
                    {html:"<div style='background:#2c3e50; width:100%; height:100%;'></div>", t:0, l:0, w:250, h:1123},
                    {html:"<div style='border-radius:50%; background:#ccc; width:100%; height:100%; overflow:hidden; border:5px solid white;'><img src='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' style='width:100%; height:100%; object-fit:cover;'></div>", t:50, l:50, w:150, h:150},
                    {html:"<h2 style='color:white; font-family:Montserrat; font-weight:700; text-align:center;'>JOHN<br>DOE</h2>", t:220, l:25, w:200, h:120},
                    {html:"<div style='color:#ccc; font-family:Lato; text-align:center; font-size:14px;'>GRAPHIC DESIGNER</div>", t:340, l:25, w:200, h:50},
                    {html:"<h3 style='color:white; border-bottom:1px solid #555; font-family:Montserrat; padding-bottom:5px;'>CONTACT</h3>", t:400, l:25, w:200, h:60},
                    {html:"<div style='color:#ccc; font-size:12px; line-height:1.5;'><i class='fas fa-phone'></i> +1 234 567 890<br><i class='fas fa-envelope'></i> hello@johndoe.com<br><i class='fas fa-map-marker-alt'></i> New York, NY</div>", t:470, l:25, w:200, h:120},
                    {html:"<h3 style='color:white; border-bottom:1px solid #555; font-family:Montserrat; padding-bottom:5px; margin-top:20px;'>SKILLS</h3>", t:600, l:25, w:200, h:60},
                    {html:"<div style='color:#ccc; font-size:12px;'>• Photoshop<br>• Illustrator<br>• InDesign<br>• HTML/CSS</div>", t:670, l:25, w:200, h:120},
                    
                    {html:"<h1 style='color:#333; font-family:Montserrat; font-weight:700; border-bottom:2px solid #2c3e50; padding-bottom:10px;'>EXPERIENCE</h1>", t:50, l:300, w:450, h:80},
                    {html:"<h3 style='color:#2c3e50; font-family:Montserrat; margin:0;'>Senior Designer</h3><div style='color:#777; font-size:12px;'>Creative Agency / 2020 - Present</div><p style='font-size:13px; color:#555;'>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>", t:140, l:300, w:450, h:140},
                    {html:"<h3 style='color:#2c3e50; font-family:Montserrat; margin:0;'>Junior Designer</h3><div style='color:#777; font-size:12px;'>StartUp Inc / 2018 - 2020</div><p style='font-size:13px; color:#555;'>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>", t:300, l:300, w:450, h:140},
                    {html:"<h1 style='color:#333; font-family:Montserrat; font-weight:700; border-bottom:2px solid #2c3e50; padding-bottom:10px;'>EDUCATION</h1>", t:460, l:300, w:450, h:80},
                    {html:"<h3 style='color:#2c3e50; font-family:Montserrat; margin:0;'>Bachelor of Arts</h3><div style='color:#777; font-size:12px;'>University of Design / 2014 - 2018</div>", t:550, l:300, w:450, h:100}
                ]
            },
            {
                n: "Corporate Blue", bg: "#f0f8ff",
                els: [
                    {html:"<div style='border-top:20px solid #0056b3; width:100%; height:100%;'></div>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:#0056b3; font-family:Arial; font-size:48px; font-weight:bold; letter-spacing:2px;'>JANE SMITH</h1>", t:50, l:50, w:500, h:80},
                    {html:"<div style='font-size:18px; color:#555; font-family:Arial; letter-spacing:4px;'>MARKETING MANAGER</div>", t:130, l:50, w:500, h:50},
                    {html:"<div style='display:flex; justify-content:space-between; border-bottom:1px solid #ccc; padding-bottom:10px; color:#0056b3; font-weight:bold;'><span>PROFILE</span></div>", t:200, l:50, w:694, h:50},
                    {html:"<p style='font-family:Georgia; color:#444; font-size:14px; line-height:1.6;'>Dedicated professional with 10+ years of experience in strategic marketing and team leadership. Proven track record of increasing revenue and brand awareness.</p>", t:260, l:50, w:694, h:100},
                    {html:"<div style='display:flex; justify-content:space-between; border-bottom:1px solid #ccc; padding-bottom:10px; color:#0056b3; font-weight:bold; margin-top:20px;'><span>PROFESSIONAL HISTORY</span></div>", t:380, l:50, w:694, h:50},
                    {html:"<div style='margin-bottom:20px;'><b style='font-size:16px;'>Global Corp</b> <span style='float:right; color:#777;'>2019-Present</span><br><i style='color:#555;'>Head of Marketing</i><ul style='font-size:13px; margin-top:5px; color:#444;'><li>Led a team of 15 specialists.</li><li>Increased sales by 25% YoY.</li></ul></div>", t:440, l:50, w:694, h:140},
                    {html:"<div style='margin-bottom:20px;'><b style='font-size:16px;'>Tech Solutions</b> <span style='float:right; color:#777;'>2015-2019</span><br><i style='color:#555;'>Marketing Associate</i><ul style='font-size:13px; margin-top:5px; color:#444;'><li>Managed social media campaigns.</li><li>Developed SEO strategies.</li></ul></div>", t:600, l:50, w:694, h:140}
                ]
            },
            {
                 n: "Creative Splash", bg: "#fff",
                 els: [
                     {html:"<div style='background:#ff6b6b; width:100%; height:100%; clip-path:polygon(0 0, 100% 0, 100% 85%, 0 100%);'></div>", t:0, l:0, w:794, h:300},
                     {html:"<h1 style='color:white; font-family:Poppins; font-weight:900; font-size:60px; line-height:0.9;'>ALEX<br>RIVER</h1>", t:50, l:50, w:400, h:180},
                     {html:"<div style='background:white; color:#ff6b6b; padding:5px 15px; font-family:Poppins; font-weight:bold; display:inline-block;'>ART DIRECTOR</div>", t:240, l:50, w:200, h:60},
                     {html:"<div style='column-count:2; column-gap:40px; font-family:Roboto; color:#444; font-size:13px;'><h3 style='color:#ff6b6b;'>About Me</h3>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula.<br><br><h3 style='color:#ff6b6b;'>Education</h3><b>Design School</b><br>2010-2014<br>Bachelor of Arts<br><br><h3 style='color:#ff6b6b;'>Contact</h3>alex@example.com<br>123-456-7890<br><br><h3 style='color:#ff6b6b;'>Experience</h3><b>Studio X</b> - Senior Artist<br>Managed diverse projects for high-end clients.</div>", t:350, l:50, w:694, h:700}
                 ]
            },
            {
                n: "Executive", bg: "#fafafa",
                els: [
                     {html:"<div style='border-left:5px solid #333; height:100%; padding-left:20px;'><h1 style='text-transform:uppercase; letter-spacing:5px; color:#333; margin:0;'>Sarah Connor</h1><h3 style='color:#666; font-weight:300; margin-top:5px;'>Operations Manager</h3></div>", t:50, l:50, w:700, h:120},
                     {html:"<hr style='border:1px solid #ccc;'>", t:180, l:50, w:700, h:10},
                     {html:"<h4 style='text-transform:uppercase; color:#333;'>Summary</h4><p style='font-size:13px; color:#555;'>Experienced operations manager looking for new opportunities in logistics.</p>", t:210, l:50, w:700, h:100},
                     {html:"<h4 style='text-transform:uppercase; color:#333;'>Work Experience</h4><b style='font-size:14px;'>Logistics Co.</b><br><i style='font-size:12px; color:#777;'>2018-2022</i><p style='font-size:13px;'>Streamlined shipping processes.</p>", t:330, l:50, w:700, h:150},
                     {html:"<div style='background:#333; color:white; padding:20px; text-align:center;'>Contact: 555-999-8888 • sarah@example.com</div>", t:1000, l:50, w:700, h:80}
                ]
            },
            {
                n: "Simple Lines", bg: "#fff",
                els: [
                     {html:"<div style='border-right:2px solid #333; height:100%; width:200px; padding-right:20px; text-align:right;'><h2 style='margin:0;'>JAKE</h2><h2 style='margin:0; color:#777;'>SULLY</h2><br><p>Graphic Designer</p><br><p>contact@email.com</p></div>", t:50, l:0, w:220, h:1000},
                     {html:"<div style='padding-left:20px;'><h3 style='border-bottom:1px solid #ccc;'>Experience</h3><p><b>Company A</b> - 2020-Present<br>Lead Designer.</p><h3 style='border-bottom:1px solid #ccc;'>Education</h3><p><b>School B</b> - 2016-2020<br>BFA Design.</p></div>", t:50, l:250, w:500, h:1000}
                ]
            },
            {
                 n: "Dark Mode", bg: "#222",
                 els: [
                     {html:"<h1 style='color:white; border-bottom:2px solid #00e5ff; display:inline-block;'>NEO ANDERSON</h1>", t:50, l:50, w:700, h:80},
                     {html:"<h3 style='color:#ccc;'>Software Engineer</h3>", t:130, l:50, w:700, h:50},
                     {html:"<div style='color:white; font-family:monospace;'> > Skills: [JS, Python, C++] <br> > Experience: 5 Years <br> > Status: Hired</div>", t:200, l:50, w:700, h:200},
                     {html:"<div style='border:1px solid #444; padding:20px; color:#aaa;'>Project A: AI Bot<br>Project B: Web App</div>", t:450, l:50, w:700, h:300}
                 ]
            }
        ],
        "Invitations": [
            {
                n: "Floral Wedding", bg: "#fdfbf7",
                els: [
                    {html:"<div style='border:2px solid #d4af37; height:100%; width:100%;'></div>", t:20, l:20, w:754, h:1083},
                    {html:"<div style='font-size:80px; text-align:center;'>🌸 🌿 🌸</div>", t:50, l:200, w:400, h:120},
                    {html:"<h3 style='text-align:center; font-family:Lato; letter-spacing:3px; color:#777; text-transform:uppercase; font-size:14px;'>Save The Date</h3>", t:200, l:200, w:400, h:50},
                    {html:"<h1 style='text-align:center; font-family:\"Great Vibes\"; font-size:72px; color:#333; margin:0;'>Sarah & James</h1>", t:260, l:100, w:600, h:150},
                    {html:"<div style='text-align:center; font-family:\"Playfair Display\"; font-style:italic; font-size:20px; color:#555;'>Are getting married</div>", t:420, l:200, w:400, h:60},
                    {html:"<div style='text-align:center; font-family:Lato; font-size:18px; font-weight:bold; border-top:1px solid #d4af37; border-bottom:1px solid #d4af37; padding:15px 0; color:#333; width:100%;'>SATURDAY, JUNE 24TH, 2024</div>", t:500, l:150, w:500, h:80},
                    {html:"<div style='text-align:center; font-family:Lato; font-size:14px; line-height:1.6; color:#555;'>AT TWO O'CLOCK IN THE AFTERNOON<br>THE GRAND GARDEN ESTATE<br>NEW YORK, NY</div>", t:600, l:150, w:500, h:120},
                    {html:"<div style='font-size:80px; text-align:center; transform:scaleY(-1);'>🌸 🌿 🌸</div>", t:950, l:200, w:400, h:120}
                ]
            },
            {
                n: "Kids Birthday", bg: "#e0f7fa",
                els: [
                    {html:"<div style='background:#fff; border-radius:20px; border:5px dashed #ff4081; width:100%; height:100%;'></div>", t:20, l:20, w:754, h:1083},
                    {html:"<div style='font-size:100px; text-align:center;'>🎈 🎂 🦄</div>", t:50, l:150, w:500, h:150},
                    {html:"<h1 style='font-family:\"Bangers\"; color:#ff4081; font-size:60px; text-align:center; text-shadow:3px 3px 0 #fff, 5px 5px 0 #00bcd4;'>YOU'RE INVITED!</h1>", t:220, l:50, w:700, h:120},
                    {html:"<h2 style='font-family:\"Comic Neue\"; color:#3f51b5; text-align:center; font-weight:bold;'>To Emma's 5th Birthday!</h2>", t:350, l:100, w:600, h:80},
                    {html:"<div style='background:#ffeb3b; padding:20px; border-radius:15px; font-family:\"Comic Neue\"; font-size:20px; text-align:center; font-weight:bold; color:#d84315; transform:rotate(-2deg);'>Pizza, Games & Cake!</div>", t:450, l:200, w:400, h:120},
                    {html:"<div style='text-align:center; font-family:Arial; font-size:18px; line-height:2;'>📅 July 15th<br>⏰ 2:00 PM - 5:00 PM<br>📍 123 Fun Street</div>", t:600, l:200, w:400, h:180},
                    {html:"<div style='font-size:80px; position:absolute; bottom:0; left:0;'>🎁</div>", t:950, l:50, w:100, h:100},
                    {html:"<div style='font-size:80px; position:absolute; bottom:0; right:0;'>🎉</div>", t:950, l:640, w:100, h:100}
                ]
            },
            {
                n: "Elegant Gold", bg: "#1a1a1a",
                els: [
                    {html:"<div style='border:1px solid #d4af37; width:100%; height:100%;'></div>", t:15, l:15, w:764, h:1093},
                    {html:"<div style='border:1px solid #d4af37; width:100%; height:100%;'></div>", t:25, l:25, w:744, h:1073},
                    {html:"<h1 style='font-family:\"Cinzel\"; color:#d4af37; text-align:center; font-size:50px; letter-spacing:5px;'>GALA NIGHT</h1>", t:150, l:100, w:600, h:100},
                    {html:"<div style='width:100px; height:2px; background:#d4af37; margin:0 auto;'></div>", t:260, l:347, w:100, h:2},
                    {html:"<p style='color:#ccc; text-align:center; font-family:\"Lato\"; font-weight:300; letter-spacing:2px; font-size:14px;'>YOU ARE CORDIALLY INVITED TO THE</p>", t:300, l:100, w:600, h:60},
                    {html:"<h2 style='color:white; text-align:center; font-family:\"Playfair Display\"; font-style:italic;'>Annual Charity Ball</h2>", t:380, l:100, w:600, h:80},
                    {html:"<div style='color:#d4af37; text-align:center; font-family:\"Cinzel\"; border:1px solid #d4af37; padding:15px; width:100%;'>DECEMBER 31ST • 8:00 PM</div>", t:500, l:200, w:400, h:80},
                    {html:"<p style='color:#999; text-align:center; font-size:12px; margin-top:50px;'>BLACK TIE ATTIRE • RSVP BY DEC 20</p>", t:900, l:200, w:400, h:60}
                ]
            },
            {
                n: "Baby Shower", bg: "#e6e6fa",
                els: [
                     {html:"<div style='border:4px dotted white; border-radius:20px; height:100%; width:100%;'></div>", t:20, l:20, w:754, h:1083},
                     {html:"<div style='font-size:80px; text-align:center;'>🍼 🧸</div>", t:80, l:250, w:300, h:120},
                     {html:"<h1 style='font-family:\"Pacifico\"; color:#9370db; text-align:center; font-size:60px;'>It's a Boy!</h1>", t:200, l:100, w:600, h:100},
                     {html:"<h3 style='font-family:\"Quicksand\"; text-align:center; color:#555;'>Please join us for a Baby Shower honoring</h3>", t:320, l:100, w:600, h:60},
                     {html:"<h2 style='font-family:\"Dancing Script\"; text-align:center; font-size:48px; color:#483d8b;'>Jessica Brown</h2>", t:380, l:100, w:600, h:100},
                     {html:"<div style='background:white; padding:20px; border-radius:10px; text-align:center; color:#666;'>Sunday, April 10th @ 2PM<br>123 Bluebell Lane</div>", t:550, l:200, w:400, h:120}
                ]
            },
            {
                n: "Retirement Party", bg: "#fff",
                els: [
                     {html:"<div style='background:#222; height:300px; width:100%; clip-path:polygon(0 0, 100% 0, 100% 80%, 0 100%);'></div>", t:0, l:0, w:794, h:300},
                     {html:"<h1 style='color:white; font-family:\"Cinzel\"; font-size:60px; text-align:center;'>RETIREMENT</h1>", t:50, l:50, w:700, h:100},
                     {html:"<h2 style='color:#d4af37; text-align:center; font-family:sans-serif;'>CELEBRATION</h2>", t:150, l:50, w:700, h:60},
                     {html:"<h1 style='text-align:center; font-family:\"Playfair Display\"; font-size:50px;'>Robert Wilson</h1>", t:350, l:100, w:600, h:100},
                     {html:"<p style='text-align:center; font-style:italic; font-size:18px;'>Join us to celebrate 40 years of dedication.</p>", t:460, l:100, w:600, h:60},
                     {html:"<div style='border-top:1px solid #ccc; border-bottom:1px solid #ccc; padding:20px; text-align:center; font-weight:bold;'>Friday, Oct 5th • 6:00 PM • The Country Club</div>", t:600, l:100, w:600, h:80}
                ]
            },
            {
                n: "Graduation", bg: "#fff",
                els: [
                     {html:"<div style='border:2px solid black; padding:10px; height:100%; width:100%;'></div>", t:10, l:10, w:774, h:1103},
                     {html:"<h1 style='font-family:serif; text-align:center; font-size:60px;'>Class of 2024</h1>", t:100, l:100, w:600, h:100},
                     {html:"<div style='font-size:100px; text-align:center;'>🎓</div>", t:200, l:300, w:200, h:150},
                     {html:"<h2 style='text-align:center;'>You Did It!</h2>", t:350, l:200, w:400, h:60},
                     {html:"<p style='text-align:center; font-size:18px;'>Open House Celebration</p>", t:420, l:200, w:400, h:50}
                ]
            }
        ],
        "Flyers": [
            {
                n:"Lost Dog", bg:"#fff", 
                els: [
                    {html:"<h1 style='color:red; text-align:center; font-family:Impact; font-size:80px; margin:0; letter-spacing:5px;'>LOST DOG</h1>", t:50, l:50, w:700, h:120},
                    {html:"<div style='background:#eee; width:100%; height:100%; display:flex; align-items:center; justify-content:center; border:5px solid #333;'><i class='fas fa-dog' style='font-size:150px; color:#aaa;'></i></div>", t:180, l:100, w:600, h:400},
                    {html:"<h2 style='text-align:center; font-family:Arial; font-size:40px; background:yellow; padding:10px;'>REWARD $500</h2>", t:620, l:100, w:600, h:100},
                    {html:"<p style='text-align:center; font-size:24px; font-family:Arial;'>Please help us find 'Buster'. Last seen at the park. Very friendly. Wearing a blue collar.</p>", t:740, l:100, w:600, h:150},
                    {html:"<div style='border:5px dashed red; padding:20px; text-align:center; font-weight:bold; font-size:40px; font-family:Impact;'>CALL 555-0199</div>", t:920, l:100, w:600, h:120}
                ]
            },
            {
                n:"Concert Gig", bg:"#111", 
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1459749411177-0473ef71607b?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; opacity:0.5;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:#0ff; text-align:center; font-family:\"Monoton\"; font-size:80px; text-shadow:4px 4px #f0f; margin:0;'>LIVE</h1>", t:100, l:50, w:700, h:120},
                    {html:"<h2 style='color:white; text-align:center; font-family:\"Rock Salt\"; font-size:40px; transform:rotate(-5deg); text-shadow:2px 2px black;'>THE ROCKERS</h2>", t:240, l:100, w:600, h:100},
                    {html:"<div style='background:rgba(255,0,255,0.8); color:white; padding:20px; text-align:center; font-family:Impact; font-size:24px; transform:rotate(2deg);'>SATURDAY NIGHT<br>JULY 24TH</div>", t:800, l:450, w:300, h:140},
                    {html:"<div style='color:#0ff; font-family:Courier; font-weight:bold; text-align:center; font-size:24px;'>DOORS OPEN 8PM • $15 ENTRY</div>", t:1000, l:100, w:600, h:60}
                ]
            },
            {
                n:"Real Estate", bg:"#fff",
                els: [
                    {html:"<div style='background:#003366; width:100%; height:100%; clip-path:polygon(0 0, 100% 0, 100% 80%, 0 100%);'></div>", t:0, l:0, w:794, h:600},
                    {html:"<img src='https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; border:5px solid white; box-shadow:0 10px 20px rgba(0,0,0,0.3);'>", t:120, l:100, w:600, h:350},
                    {html:"<h1 style='color:white; font-family:\"Lato\"; font-weight:900; font-size:48px; text-shadow:2px 2px 5px rgba(0,0,0,0.5);'>JUST LISTED</h1>", t:40, l:50, w:400, h:80},
                    {html:"<h2 style='color:#003366; font-family:\"Playfair Display\"; font-size:36px; margin:0;'>Modern Family Home</h2>", t:620, l:100, w:600, h:60},
                    {html:"<p style='font-family:Arial; color:#555; font-size:16px;'>3 Bed • 2 Bath • 2 Car Garage</p>", t:680, l:100, w:600, h:40},
                    {html:"<div style='display:flex; justify-content:space-around;'><img src='https://images.unsplash.com/photo-1484154218962-a1c002085d2f?auto=format&fit=crop&w=200&q=80' style='width:180px; height:120px; object-fit:cover;'><img src='https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=200&q=80' style='width:180px; height:120px; object-fit:cover;'><img src='https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=200&q=80' style='width:180px; height:120px; object-fit:cover;'></div>", t:740, l:50, w:700, h:150},
                    {html:"<div style='background:#d4af37; color:white; font-weight:bold; font-size:24px; padding:10px 30px;'>$850,000</div>", t:950, l:100, w:200, h:60},
                    {html:"<div style='text-align:right; font-family:Arial; color:#333;'><b>Call Agent Name</b><br>555-888-999</div>", t:950, l:450, w:250, h:80}
                ]
            },
            {
                n: "Grand Opening", bg: "#fff",
                els: [
                     {html:"<div style='background:#ff4081; width:100%; height:100%;'></div>", t:0, l:0, w:794, h:400},
                     {html:"<h1 style='color:white; font-size:80px; font-family:\"Bebas Neue\"; text-align:center;'>GRAND<br>OPENING</h1>", t:50, l:50, w:700, h:250},
                     {html:"<div style='width:600px; height:400px; background:#eee; margin:0 auto; border:10px solid white; overflow:hidden;'><img src='https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80' style='width:100%; height:100%; object-fit:cover;'></div>", t:350, l:100, w:600, h:400},
                     {html:"<h2 style='text-align:center; color:#333;'>WE ARE NOW OPEN!</h2>", t:780, l:100, w:600, h:60},
                     {html:"<p style='text-align:center; font-size:20px; color:#555;'>Come visit our new store and get 20% off everything!</p>", t:850, l:100, w:600, h:80},
                     {html:"<div style='background:#333; color:white; padding:10px; text-align:center; font-weight:bold;'>123 Main Street • Open 9am-9pm</div>", t:1000, l:100, w:600, h:60}
                ]
            },
            {
                n: "Garage Sale", bg: "#ffeb3b",
                els: [
                     {html:"<div style='border:10px solid black; width:100%; height:100%;'></div>", t:20, l:20, w:754, h:1083},
                     {html:"<h1 style='font-family:Impact; font-size:100px; text-align:center; line-height:0.9;'>GARAGE<br>SALE</h1>", t:80, l:50, w:700, h:200},
                     {html:"<div style='background:red; color:white; font-size:30px; font-weight:bold; padding:20px; text-align:center; transform:rotate(-5deg);'>EVERYTHING MUST GO!</div>", t:300, l:100, w:600, h:100},
                     {html:"<ul style='font-size:30px; font-family:sans-serif;'><li>Furniture</li><li>Clothes</li><li>Tools</li><li>Toys</li></ul>", t:450, l:250, w:300, h:250},
                     {html:"<h2 style='text-align:center; font-size:40px;'>THIS SATURDAY!</h2>", t:750, l:100, w:600, h:60},
                     {html:"<div style='text-align:center; font-size:24px;'>7AM - 1PM • 45 Maple Avenue</div>", t:820, l:100, w:600, h:80}
                ]
            },
            {
                n: "Car Wash", bg: "#0288d1",
                els: [
                     {html:"<div style='border:5px dashed white; width:100%; height:100%; border-radius:20px;'></div>", t:20, l:20, w:754, h:1083},
                     {html:"<h1 style='color:white; text-align:center; font-family:\"Luckiest Guy\", cursive; font-size:80px; text-shadow:4px 4px 0 #005b9f;'>CAR WASH</h1>", t:50, l:50, w:700, h:120},
                     {html:"<div style='font-size:150px; text-align:center;'>🚗 💦</div>", t:200, l:200, w:400, h:200},
                     {html:"<div style='background:yellow; color:red; font-weight:bold; font-size:40px; text-align:center; transform:rotate(5deg); padding:10px; border:3px solid red;'>ONLY $10</div>", t:450, l:450, w:250, h:100},
                     {html:"<h2 style='color:white; text-align:center;'>Support the High School Band</h2>", t:600, l:100, w:600, h:60},
                     {html:"<p style='color:white; text-align:center; font-size:24px;'>Saturday Morning<br>School Parking Lot</p>", t:680, l:100, w:600, h:100}
                ]
            }
        ],
        "Magazines": [
            {
                n:"Fashion Cover", bg:"#fff",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:white; font-family:\"Didot\", serif; font-size:120px; text-align:center; letter-spacing:-5px; line-height:1; mix-blend-mode:overlay;'>VOGUE</h1>", t:20, l:0, w:794, h:160},
                    {html:"<div style='color:white; font-family:\"Lato\"; font-weight:bold; font-size:32px; text-shadow:2px 2px 5px rgba(0,0,0,0.5);'>SUMMER<br>STYLES</div>", t:300, l:50, w:300, h:120},
                    {html:"<div style='color:#ffff00; font-family:\"Lato\"; font-weight:bold; font-size:24px; text-shadow:1px 1px 2px rgba(0,0,0,0.8);'>100+<br>LOOKS</div>", t:450, l:50, w:200, h:100},
                    {html:"<div style='color:white; font-family:\"Lato\"; text-align:right; font-size:28px; text-shadow:2px 2px 5px rgba(0,0,0,0.5);'>THE<br>ICONS<br>ISSUE</div>", t:800, l:500, w:250, h:180},
                    {html:"<div style='background:white; height:40px; width:150px; display:flex; align-items:center; justify-content:center; font-family:monospace; letter-spacing:3px;'>BARCODE</div>", t:1050, l:50, w:150, h:50}
                ]
            },
            {
                n:"Tech Monthly", bg:"#000",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; opacity:0.8;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:white; font-family:\"Orbitron\"; font-size:90px; text-align:center; letter-spacing:10px; border-top:2px solid #00ff00; border-bottom:2px solid #00ff00;'>WIRED</h1>", t:30, l:50, w:700, h:140},
                    {html:"<div style='color:#00ff00; font-family:\"Roboto Mono\"; font-size:30px; background:black; display:inline-block; padding:5px;'>FUTURE OF AI</div>", t:250, l:50, w:350, h:60},
                    {html:"<p style='color:white; font-family:Arial; font-size:18px; text-shadow:1px 1px 2px black;'>Are robots taking over?<br>Exclusive interview inside.</p>", t:320, l:50, w:300, h:100},
                    {html:"<div style='color:cyan; font-family:\"Roboto Mono\"; font-size:30px; text-align:right;'>CYBER<br>SECURITY</div>", t:700, l:500, w:250, h:100}
                ]
            },
            {
                n:"Foodie", bg:"#fff",
                els: [
                     {html:"<img src='https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover;'>", t:0, l:0, w:794, h:1123},
                     {html:"<h1 style='color:#fff; font-family:\"Lobster\"; font-size:100px; text-align:center; text-shadow:2px 2px 10px rgba(0,0,0,0.5);'>Delicious</h1>", t:20, l:50, w:700, h:150},
                     {html:"<div style='background:rgba(255,255,255,0.9); padding:20px; border-radius:50%; width:150px; height:150px; display:flex; align-items:center; justify-content:center; text-align:center; color:#e65100; font-weight:bold; transform:rotate(-10deg); box-shadow:0 5px 15px rgba(0,0,0,0.2);'>BEST<br>RECIPES<br>2024</div>", t:200, l:50, w:150, h:150},
                     {html:"<h2 style='color:white; text-shadow:2px 2px 4px black; text-align:center;'>Comfort Food Classics</h2>", t:900, l:100, w:600, h:60},
                     {html:"<div style='color:white; text-align:center; font-size:24px; font-weight:bold; text-shadow:1px 1px 2px black;'>Quick & Easy Dinners • Dessert Special</div>", t:970, l:50, w:700, h:60}
                ]
            },
            {
                n:"Nature", bg:"#2e7d32",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; opacity:0.8;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:white; font-family:serif; text-align:center; font-size:100px;'>WILD</h1>", t:50, l:50, w:700, h:120},
                    {html:"<h3 style='color:white; text-align:center; letter-spacing:10px;'>PHOTOGRAPHY</h3>", t:160, l:50, w:700, h:60},
                    {html:"<div style='position:absolute; bottom:50px; right:50px; color:white; text-align:right;'><h2>ISSUE 24</h2><p>The Great Outdoors</p></div>", t:900, l:400, w:350, h:150}
                ]
            }
        ],
        "Brochures": [
            {
                n:"Tri-Fold Layout", bg:"#fff", 
                els: [
                    {html:"<div style='border-right:1px dashed #ccc; height:100%; width:100%; display:flex; justify-content:center; padding-top:20px; color:#999; font-size:10px;'>Inside Flap</div>", t:0, l:0, w:264, h:1123},
                    {html:"<div style='border-right:1px dashed #ccc; height:100%; width:100%; display:flex; justify-content:center; padding-top:20px; color:#999; font-size:10px;'>Back Cover</div>", t:0, l:264, w:264, h:1123},
                    {html:"<div style='height:100%; width:100%; display:flex; justify-content:center; padding-top:20px; color:#999; font-size:10px;'>Front Cover</div>", t:0, l:528, w:264, h:1123},
                    // Front Cover
                    {html:"<img src='https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover;'>", t:100, l:540, w:240, h:300},
                    {html:"<h1 style='color:#333; font-family:Helvetica; font-weight:bold; font-size:32px; text-align:center;'>MODERN<br>LIVING</h1>", t:420, l:540, w:240, h:120},
                    {html:"<p style='text-align:center; color:#777; font-family:Arial; font-size:14px;'>Interior Design Solutions</p>", t:550, l:540, w:240, h:50},
                    // Back Cover
                    {html:"<h3 style='text-align:center; color:#333; font-family:Helvetica;'>Contact Us</h3><p style='text-align:center; font-size:12px; color:#555;'>123 Main St, City<br>www.example.com<br>555-1234</p>", t:800, l:276, w:240, h:160},
                    // Inside Flap
                    {html:"<h3 style='color:#007670; font-family:Helvetica; border-bottom:2px solid #007670;'>Our Services</h3><ul style='font-size:12px; font-family:Arial; color:#444; padding-left:20px;'><li>Space Planning</li><li>Color Consultation</li><li>Furniture Selection</li></ul>", t:200, l:12, w:240, h:200}
                ]
            },
            {
                n:"Travel Brochure", bg:"#e0f2f1",
                els: [
                    {html:"<div style='border-right:1px dashed #999; height:100%; width:100%;'></div>", t:0, l:0, w:264, h:1123},
                    {html:"<div style='border-right:1px dashed #999; height:100%; width:100%;'></div>", t:0, l:264, w:264, h:1123},
                    // Cover
                    {html:"<img src='https://images.unsplash.com/photo-1502003153089-649eb051d819?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover; clip-path:polygon(0 0, 100% 0, 100% 85%, 0 100%);'>", t:0, l:528, w:266, h:500},
                    {html:"<h1 style='color:#00695c; font-family:\"Pacifico\"; font-size:40px; text-align:center;'>Visit<br>Paradise</h1>", t:520, l:540, w:240, h:140},
                    {html:"<div style='background:#00695c; color:white; padding:10px; text-align:center; font-family:Arial; border-radius:5px;'>Book Now 50% Off</div>", t:700, l:560, w:200, h:60},
                    // Middle
                    {html:"<img src='https://images.unsplash.com/photo-1537551080512-fb7dd14fbf90?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover; border-radius:10px;'>", t:100, l:280, w:230, h:160},
                    {html:"<h4 style='color:#00695c; font-family:Arial;'>Luxury Hotels</h4><p style='font-size:11px; font-family:Arial;'>Experience world class comfort.</p>", t:270, l:280, w:230, h:100}
                ]
            },
            {
                n:"Bi-Fold Medical", bg:"#fff",
                els: [
                    {html:"<div style='border-right:1px solid #ccc; height:100%; width:100%;'></div>", t:0, l:396, w:2, h:1123},
                    {html:"<div style='background:#2196f3; height:100%; width:40px; position:absolute; right:0;'></div>", t:0, l:754, w:40, h:1123},
                    {html:"<img src='https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80' style='width:100%; height:300px; object-fit:cover;'>", t:100, l:420, w:330, h:300},
                    {html:"<h1 style='color:#1565c0; font-family:sans-serif;'>HEALTH FIRST<br>CLINIC</h1>", t:420, l:420, w:300, h:120},
                    {html:"<p style='color:#555;'>Caring for you and your family.</p>", t:550, l:420, w:300, h:50},
                    {html:"<h3 style='color:#1565c0;'>Services</h3><ul><li>Checkups</li><li>Dental</li><li>Cardiology</li></ul>", t:100, l:50, w:300, h:200}
                ]
            },
            {
                n: "Corporate", bg: "#e8eaf6",
                els: [
                    {html:"<div style='border-right:1px solid #ccc; height:100%; width:100%;'></div>", t:0, l:264, w:2, h:1123},
                    {html:"<div style='border-right:1px solid #ccc; height:100%; width:100%;'></div>", t:0, l:528, w:2, h:1123},
                    {html:"<div style='background:#3f51b5; height:200px; width:100%; position:absolute; top:0;'></div>", t:0, l:0, w:794, h:200},
                    {html:"<h2 style='color:white; position:absolute; top:50px; left:550px;'>Annual Report</h2>", t:0, l:0, w:794, h:200},
                    {html:"<div style='position:absolute; bottom:50px; left:550px;'><h3 style='color:#3f51b5;'>Contact</h3><p>info@company.com</p></div>", t:0, l:0, w:794, h:1123}
                ]
            }
        ],
        "Certificates": [
            {
                n:"Classic Award", bg:"#fffaf0", 
                els: [
                    {html:"<div style='border:20px solid #d4af37; height:100%; width:100%;'></div>", t:0, l:0, w:794, h:1123},
                    {html:"<div style='border:2px solid #d4af37; height:calc(100% - 10px); width:calc(100% - 10px); position:absolute; top:5px; left:5px;'></div>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='font-family:\"Cinzel\", serif; font-size:60px; text-align:center; color:#b8860b; margin-bottom:0;'>Certificate</h1>", t:150, l:100, w:600, h:100},
                    {html:"<h3 style='font-family:sans-serif; text-align:center; font-size:18px; letter-spacing:5px; margin-top:0;'>OF APPRECIATION</h3>", t:230, l:200, w:400, h:50},
                    {html:"<p style='text-align:center; font-style:italic; font-family:\"Playfair Display\"; font-size:20px;'>This is proudly presented to</p>", t:320, l:200, w:400, h:50},
                    {html:"<h2 style='text-align:center; font-family:\"Great Vibes\"; font-size:80px; color:#333; margin:0;'>Recipient Name</h2>", t:380, l:100, w:600, h:140},
                    {html:"<div style='width:400px; height:1px; background:#b8860b; margin:0 auto;'></div>", t:500, l:200, w:400, h:2},
                    {html:"<p style='text-align:center; font-family:\"Lato\"; color:#555;'>For outstanding performance and lasting contribution to the team.</p>", t:540, l:150, w:500, h:80},
                    {html:"<div style='border-top:1px solid black; width:200px; text-align:center; padding-top:5px; font-family:Arial;'>Date</div>", t:850, l:100, w:200, h:60},
                    {html:"<div style='border-top:1px solid black; width:200px; text-align:center; padding-top:5px; font-family:Arial;'>Signature</div>", t:850, l:500, w:200, h:60},
                    {html:"<div style='width:120px; height:120px; border-radius:50%; background:linear-gradient(45deg, #ffd700, #b8860b); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-family:\"Cinzel\"; border:4px double white; box-shadow:0 5px 10px rgba(0,0,0,0.3);'>GOLD<br>SEAL</div>", t:750, l:340, w:120, h:120}
                ]
            },
            {
                n:"Diploma", bg:"#fff",
                els: [
                    {html:"<div style='background:url(https://www.transparenttextures.com/patterns/cream-paper.png); width:100%; height:100%; opacity:0.5;'></div>", t:0, l:0, w:794, h:1123},
                     {html:"<div style='border:10px double #333; height:100%; width:100%; box-sizing:border-box;'></div>", t:20, l:20, w:754, h:1083},
                     {html:"<div style='font-size:100px; text-align:center; color:#333;'>🏛️</div>", t:80, l:350, w:100, h:120},
                     {html:"<h1 style='font-family:\"Old Standard TT\"; font-size:48px; text-align:center; text-transform:uppercase;'>University of Excellence</h1>", t:200, l:50, w:700, h:100},
                     {html:"<p style='text-align:center; font-family:\"Old Standard TT\"; font-size:18px;'>Upon the recommendation of the faculty, hereby confers upon</p>", t:320, l:100, w:600, h:80},
                     {html:"<h2 style='text-align:center; font-family:\"Pinyon Script\", cursive; font-size:50px; font-style:italic; border-bottom:1px solid #ccc;'>Student Name</h2>", t:400, l:100, w:600, h:100},
                     {html:"<p style='text-align:center; font-family:\"Old Standard TT\"; font-size:18px;'>the degree of</p>", t:520, l:200, w:400, h:50},
                     {html:"<h2 style='text-align:center; font-family:\"Old Standard TT\"; font-size:32px; font-weight:bold;'>Bachelor of Arts</h2>", t:570, l:100, w:600, h:80}
                ]
            },
            {
                n:"Gift Certificate", bg:"#f3e5f5",
                els: [
                     {html:"<div style='border:2px dashed #9c27b0; height:100%; width:100%;'></div>", t:10, l:10, w:774, h:300},
                     {html:"<h1 style='color:#9c27b0; font-family:serif; font-style:italic;'>Gift Certificate</h1>", t:50, l:50, w:400, h:60},
                     {html:"<div style='font-size:40px; font-weight:bold; color:#333;'>$50.00</div>", t:50, l:600, w:150, h:60},
                     {html:"<div style='border-bottom:1px solid #333; margin-top:20px;'>To:</div><br><div style='border-bottom:1px solid #333; margin-top:20px;'>From:</div>", t:120, l:50, w:600, h:120},
                     {html:"<div style='background:#9c27b0; color:white; padding:5px; text-align:center;'>Valid at all store locations</div>", t:250, l:50, w:300, h:40}
                ]
            },
            {
                n:"Employee of Month", bg:"#e3f2fd",
                els: [
                    {html:"<div style='border:10px solid #1976d2; height:100%; width:100%;'></div>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='text-align:center; color:#0d47a1; font-family:Arial; font-weight:900;'>EMPLOYEE<br>OF THE MONTH</h1>", t:100, l:100, w:600, h:150},
                    {html:"<div style='width:200px; height:200px; background:#ddd; border:5px solid #1976d2; margin:0 auto;'></div>", t:300, l:300, w:200, h:200},
                    {html:"<h2 style='text-align:center; color:#1976d2; border-bottom:2px solid #1976d2;'>JOHN SMITH</h2>", t:550, l:200, w:400, h:60},
                    {html:"<p style='text-align:center;'>In recognition of your hard work and dedication.</p>", t:650, l:200, w:400, h:80}
                ]
            }
        ],
        "Menus": [
            {
                n:"Chalkboard Menu", bg:"#333",
                els: [
                    {html:"<div style='border:5px solid #8B4513; width:100%; height:100%;'></div>", t:10, l:10, w:774, h:1103},
                    {html:"<h1 style='color:white; font-family:\"Patrick Hand\", cursive; text-align:center; font-size:60px; border-bottom:2px dashed #777; padding-bottom:10px;'>THE BURGER JOINT</h1>", t:50, l:50, w:700, h:120},
                    {html:"<h2 style='color:#ffcc00; font-family:\"Patrick Hand\"; font-size:30px;'>BURGERS</h2>", t:180, l:50, w:300, h:60},
                    {html:"<div style='color:white; font-family:\"Patrick Hand\"; font-size:20px;'><div style='display:flex; justify-content:space-between;'><span>Classic Beef</span><span>$12</span></div><p style='font-size:14px; color:#aaa; margin-top:0;'>Lettuce, tomato, cheese, secret sauce</p></div>", t:230, l:50, w:300, h:100},
                    {html:"<div style='color:white; font-family:\"Patrick Hand\"; font-size:20px;'><div style='display:flex; justify-content:space-between;'><span>Bacon Deluxe</span><span>$15</span></div><p style='font-size:14px; color:#aaa; margin-top:0;'>Double bacon, bbq sauce, onion rings</p></div>", t:330, l:50, w:300, h:100},
                    {html:"<h2 style='color:#ffcc00; font-family:\"Patrick Hand\"; font-size:30px;'>DRINKS</h2>", t:460, l:50, w:300, h:60},
                    {html:"<div style='color:white; font-family:\"Patrick Hand\"; font-size:20px;'><div style='display:flex; justify-content:space-between;'><span>Craft Beer</span><span>$8</span></div><div style='display:flex; justify-content:space-between;'><span>Milkshakes</span><span>$6</span></div></div>", t:510, l:50, w:300, h:120},
                    {html:"<img src='https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover; border:5px solid white; transform:rotate(5deg);'>", t:200, l:400, w:300, h:300}
                ]
            },
            {
                n:"Fine Dining", bg:"#fff",
                els: [
                    {html:"<div style='border:1px solid #000; height:95%; width:95%; position:absolute; top:2.5%; left:2.5%;'></div>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='font-family:\"Playfair Display\"; text-align:center; letter-spacing:5px; font-size:40px; margin-top:40px;'>LE GOURMET</h1>", t:50, l:200, w:400, h:100},
                    {html:"<div style='text-align:center; font-style:italic; font-family:serif; color:#777;'>Menu de Saison</div>", t:120, l:300, w:200, h:40},
                    {html:"<h3 style='text-align:center; font-family:\"Lato\"; letter-spacing:3px; font-size:16px; margin-top:50px;'>APPETIZERS</h3>", t:200, l:200, w:400, h:50},
                    {html:"<div style='text-align:center; font-family:serif; font-size:18px;'><b>French Onion Soup</b> . . . . $12</div><div style='text-align:center; font-size:12px; color:#555; font-style:italic;'>Gruyere crouton</div>", t:260, l:200, w:400, h:80},
                    {html:"<div style='text-align:center; font-family:serif; font-size:18px;'><b>Escargot</b> . . . . $16</div><div style='text-align:center; font-size:12px; color:#555; font-style:italic;'>Garlic herb butter</div>", t:340, l:200, w:400, h:80},
                    {html:"<h3 style='text-align:center; font-family:\"Lato\"; letter-spacing:3px; font-size:16px; margin-top:30px;'>MAIN COURSES</h3>", t:450, l:200, w:400, h:50},
                    {html:"<div style='text-align:center; font-family:serif; font-size:18px;'><b>Duck Confit</b> . . . . $32</div><div style='text-align:center; font-size:12px; color:#555; font-style:italic;'>Roasted potatoes, orange glaze</div>", t:510, l:200, w:400, h:80},
                     {html:"<div style='font-size:30px; text-align:center;'>❦</div>", t:700, l:370, w:50, h:60}
                ]
            },
            {
                n:"Coffee Shop", bg:"#d7ccc8",
                els: [
                    {html:"<h1 style='font-family:\"Courier New\"; text-align:center; font-size:50px; color:#3e2723;'>Morning Brew</h1>", t:50, l:100, w:600, h:80},
                    {html:"<div style='border-top:2px solid #3e2723; width:100%;'></div>", t:120, l:100, w:600, h:10},
                    {html:"<h2 style='color:#5d4037;'>Espresso</h2><p>Latte ... $4<br>Cappuccino ... $4<br>Mocha ... $5</p>", t:150, l:100, w:300, h:150},
                    {html:"<h2 style='color:#5d4037;'>Bakery</h2><p>Croissant ... $3<br>Muffin ... $3<br>Bagel ... $2</p>", t:150, l:450, w:300, h:150},
                    {html:"<img src='https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover; border-radius:50%;'>", t:400, l:250, w:300, h:300}
                ]
            },
            {
                n:"Cocktail Bar", bg:"#263238",
                els: [
                    {html:"<div style='border:2px solid #ffcc80; height:100%; width:100%;'></div>", t:20, l:20, w:754, h:1083},
                    {html:"<h1 style='color:#ffcc80; font-family:\"Righteous\"; text-align:center; font-size:60px; letter-spacing:5px;'>THE LOUNGE</h1>", t:80, l:50, w:700, h:100},
                    {html:"<h3 style='color:white; text-align:center; border-bottom:1px solid #555;'>SIGNATURE COCKTAILS</h3>", t:200, l:150, w:500, h:50},
                    {html:"<b style='color:#ffcc80; font-size:20px;'>Old Fashioned</b><span style='float:right; color:white;'>$14</span><br><i style='color:#ccc; font-size:14px;'>Bourbon, bitters, sugar</i>", t:270, l:150, w:500, h:80},
                    {html:"<b style='color:#ffcc80; font-size:20px;'>Martini</b><span style='float:right; color:white;'>$15</span><br><i style='color:#ccc; font-size:14px;'>Gin, vermouth, olive</i>", t:360, l:150, w:500, h:80},
                    {html:"<div style='text-align:center; color:#777; margin-top:50px;'>Happy Hour 5-7PM</div>", t:800, l:200, w:400, h:40}
                ]
            }
        ],
        "Calendars": [
            {
                n:"Monthly Planner", bg:"#fff",
                els: [
                     {html:"<div style='background:#ff6b6b; height:150px; width:100%; display:flex; align-items:center; justify-content:center; color:white; font-family:sans-serif; font-size:60px; font-weight:bold;'>JANUARY</div>", t:0, l:0, w:794, h:150},
                     {html:"<table style='width:100%; height:100%; text-align:left; font-family:Arial; border:1px solid #ccc;'><tr style='background:#eee; font-weight:bold; text-align:center;'><td style='height:30px;'>SUN</td><td>MON</td><td>TUE</td><td>WED</td><td>THU</td><td>FRI</td><td>SAT</td></tr><tr><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td></tr><tr><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td></tr><tr><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td><td>20</td><td>21</td></tr><tr><td>22</td><td>23</td><td>24</td><td>25</td><td>26</td><td>27</td><td>28</td></tr><tr><td>29</td><td>30</td><td>31</td><td></td><td></td><td></td><td></td></tr></table>", t:180, l:20, w:754, h:600},
                     {html:"<h3 style='font-family:sans-serif; color:#ff6b6b;'>Notes</h3><div style='border-bottom:1px solid #ccc; height:30px;'></div><div style='border-bottom:1px solid #ccc; height:30px;'></div><div style='border-bottom:1px solid #ccc; height:30px;'></div>", t:820, l:20, w:754, h:200}
                ]
            },
            {
                n:"Weekly Schedule", bg:"#e8f5e9",
                els: [
                    {html:"<h1 style='text-align:center; color:#2e7d32;'>Weekly Schedule</h1>", t:30, l:100, w:600, h:60},
                    {html:"<div style='background:white; border:1px solid #ccc; padding:10px;'><b style='color:#2e7d32;'>Monday</b><br><br><br></div>", t:100, l:50, w:200, h:150},
                    {html:"<div style='background:white; border:1px solid #ccc; padding:10px;'><b style='color:#2e7d32;'>Tuesday</b><br><br><br></div>", t:100, l:280, w:200, h:150},
                    {html:"<div style='background:white; border:1px solid #ccc; padding:10px;'><b style='color:#2e7d32;'>Wednesday</b><br><br><br></div>", t:100, l:510, w:200, h:150},
                    {html:"<div style='background:white; border:1px solid #ccc; padding:10px;'><b style='color:#2e7d32;'>Thursday</b><br><br><br></div>", t:300, l:50, w:200, h:150},
                    {html:"<div style='background:white; border:1px solid #ccc; padding:10px;'><b style='color:#2e7d32;'>Friday</b><br><br><br></div>", t:300, l:280, w:200, h:150},
                    {html:"<div style='background:white; border:1px solid #ccc; padding:10px;'><b style='color:#2e7d32;'>Weekend</b><br><br><br></div>", t:300, l:510, w:200, h:150}
                ]
            },
            {
                n:"Yearly View", bg:"#fff",
                els: [
                     {html:"<h1 style='text-align:center;'>2024</h1>", t:20, l:100, w:600, h:80},
                     // Simulated small months
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>JAN<br>1 2 3...</div>", t:120, l:50, w:150, h:120},
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>FEB<br>1 2 3...</div>", t:120, l:220, w:150, h:120},
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>MAR<br>1 2 3...</div>", t:120, l:390, w:150, h:120},
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>APR<br>1 2 3...</div>", t:120, l:560, w:150, h:120},
                     // Row 2
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>MAY<br>1 2 3...</div>", t:260, l:50, w:150, h:120},
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>JUN<br>1 2 3...</div>", t:260, l:220, w:150, h:120},
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>JUL<br>1 2 3...</div>", t:260, l:390, w:150, h:120},
                     {html:"<div style='font-size:10px; border:1px solid #ccc;'>AUG<br>1 2 3...</div>", t:260, l:560, w:150, h:120}
                ]
            }
        ],
        "Letterheads": [
            {
                n: "Modern Geo", bg:"#fff",
                els: [
                    {html:"<div style='background:linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); width:100%; height:100%; clip-path:polygon(0 0, 100% 0, 100% 15%, 0 35%);'></div>", t:0, l:0, w:794, h:300},
                    {html:"<div style='background:linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); width:100%; height:100%; clip-path:polygon(100% 100%, 0 100%, 0 85%, 100% 65%);'></div>", t:900, l:0, w:794, h:223},
                    {html:"<h1 style='color:white; font-family:sans-serif; margin:0;'>COMPANY NAME</h1>", t:30, l:40, w:400, h:60},
                    {html:"<div style='color:white; font-family:sans-serif; font-size:12px;'>123 Business Rd, Tech City</div>", t:90, l:40, w:300, h:40},
                    {html:"<div style='color:white; font-family:sans-serif; font-size:12px; text-align:right;'>www.company.com<br>info@company.com</div>", t:1000, l:500, w:250, h:60},
                    {html:"<div style='font-family:serif; font-size:12px; color:#333; line-height:2;'>Dear [Name],<br><br>Start typing your letter here...</div>", t:250, l:50, w:694, h:500}
                ]
            },
            {
                n: "Minimal Black", bg:"#fff",
                els: [
                    {html:"<div style='border-bottom:2px solid black;'></div>", t:100, l:50, w:694, h:2},
                    {html:"<h1 style='font-family:\"Helvetica\"; letter-spacing:2px; font-weight:bold;'>JOHN DOE</h1>", t:50, l:50, w:400, h:50},
                    {html:"<div style='text-align:right; font-size:12px; color:#555;'>123 Street Name<br>City, State, Zip<br>555-123-4567</div>", t:50, l:450, w:294, h:50},
                    {html:"<div style='font-family:sans-serif; font-size:12px; color:#333; line-height:1.6;'>To Whom It May Concern,<br><br>Body of the letter goes here...</div>", t:150, l:50, w:694, h:500}
                ]
            },
            {
                n: "Corporate Red", bg:"#fff",
                els: [
                    {html:"<div style='background:#d32f2f; height:100%; width:10px; position:absolute; left:0;'></div>", t:0, l:0, w:10, h:1123},
                    {html:"<h1 style='color:#d32f2f; font-family:sans-serif;'>Global Solutions</h1>", t:50, l:40, w:400, h:60},
                    {html:"<p style='color:#777; font-size:12px;'>Innovating for the future.</p>", t:110, l:40, w:300, h:30},
                    {html:"<div style='text-align:right; color:#d32f2f; font-weight:bold;'>CONFIDENTIAL</div>", t:50, l:500, w:250, h:30}
                ]
            },
            {
                n: "Legal", bg:"#fff",
                els: [
                    {html:"<div style='border-left:1px solid #ccc; height:100%; position:absolute; left:100px;'></div>", t:0, l:0, w:100, h:1123},
                    {html:"<h1 style='text-align:center; font-family:serif; text-transform:uppercase; font-size:24px; text-decoration:underline;'>Legal Document</h1>", t:50, l:100, w:600, h:50},
                    {html:"<p style='font-family:serif; line-height:2;'>1. This agreement is made between...</p>", t:150, l:120, w:600, h:500}
                ]
            }
        ],
        "Newsletters": [
            {
                n:"Classic 2-Col", bg:"#fff", 
                els: [
                    {html:"<h1 style='border-bottom:3px double black; font-size:40px; text-transform:uppercase; font-family:serif;'>The Daily News</h1>", t:40, l:40, w:714, h:100},
                    {html:"<h3 style='font-family:sans-serif; background:#eee; padding:5px;'>Top Story: Big Event Happens</h3>", t:150, l:40, w:340, h:50},
                    {html:"<p style='font-size:12px; text-align:justify;'>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>", t:210, l:40, w:340, h:200},
                    {html:"<img src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100px; object-fit:cover;'>", t:150, l:414, w:340, h:100},
                    {html:"<h3 style='font-family:sans-serif;'>Community Updates</h3><p style='font-size:12px;'>Upcoming events at the town hall.</p>", t:260, l:414, w:340, h:100}
                ]
            },
            {
                 n:"School Update", bg:"#fff3e0",
                 els: [
                     {html:"<div style='background:#ff9800; padding:10px;'><h1 style='color:white; text-align:center;'>SCHOOL NEWS</h1></div>", t:40, l:40, w:714, h:80},
                     {html:"<h2 style='color:#e65100;'>Principal's Note</h2><p>Welcome back students! We have an exciting year ahead.</p>", t:140, l:40, w:714, h:100},
                     {html:"<div style='background:white; border:1px solid orange; padding:10px;'><h3 style='margin:0;'>Important Dates</h3><ul><li>Sep 1: First Day</li><li>Oct 31: Halloween Party</li></ul></div>", t:250, l:40, w:300, h:150},
                     {html:"<img src='https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover;'>", t:250, l:360, w:394, h:150}
                 ]
            },
            {
                n:"Corporate Brief", bg:"#fff",
                els: [
                    {html:"<div style='background:#1a237e; width:100%; height:100%;'></div>", t:0, l:0, w:200, h:1123},
                    {html:"<h1 style='color:white; font-family:sans-serif; text-align:right; padding-right:20px;'>Q1 REPORT</h1>", t:50, l:0, w:180, h:80},
                    {html:"<div style='color:white; padding:20px;'><b>Highlights:</b><br><br>• Growth up 10%<br>• New Hire<br>• Office Party</div>", t:150, l:0, w:200, h:200},
                    {html:"<h1 style='color:#1a237e;'>Executive Summary</h1><p>We are pleased to announce record profits this quarter.</p>", t:50, l:250, w:500, h:150},
                    {html:"<img src='https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80' style='width:100%; height:100%; object-fit:cover;'>", t:250, l:250, w:500, h:200}
                ]
            },
            {
                n:"Tech Digest", bg:"#263238",
                els: [
                    {html:"<h1 style='color:#80cbc4; text-align:center;'>TECH DIGEST</h1>", t:50, l:50, w:700, h:80},
                    {html:"<div style='column-count:3; column-gap:20px; color:#eceff1;'><p>Latest Gadgets</p><p>Software Trends</p><p>Coding Tips</p></div>", t:150, l:50, w:700, h:800}
                ]
            }
        ],
        "Business Cards": [
            {
                n:"Modern (10up)", bg:"#fff", 
                els: Array.from({length: 5}, (_, i) => [
                    {html:"<div style='border:1px solid #ddd; width:100%; height:100%; padding:15px; background:#f9f9f9;'><b style='font-size:16px; color:#333;'>John Doe</b><br><span style='font-size:11px; color:#777; text-transform:uppercase;'>Creative Director</span><br><br><span style='font-size:11px;'>555-1234 • john@design.com</span><div style='width:30px; height:30px; background:#333; position:absolute; right:15px; top:15px; border-radius:50%;'></div></div>", t:50 + (i*210), l:50, w:320, h:180},
                    {html:"<div style='border:1px solid #ddd; width:100%; height:100%; padding:15px; background:#f9f9f9;'><b style='font-size:16px; color:#333;'>John Doe</b><br><span style='font-size:11px; color:#777; text-transform:uppercase;'>Creative Director</span><br><br><span style='font-size:11px;'>555-1234 • john@design.com</span><div style='width:30px; height:30px; background:#333; position:absolute; right:15px; top:15px; border-radius:50%;'></div></div>", t:50 + (i*210), l:400, w:320, h:180}
                ]).flat()
            },
            {
                n:"Dark (10up)", bg:"#fff", 
                els: Array.from({length: 5}, (_, i) => [
                    {html:"<div style='background:#222; color:white; width:100%; height:100%; padding:15px;'><b style='font-size:16px; color:#d4af37;'>JANE SMITH</b><br><span style='font-size:10px;'>CEO & Founder</span><br><div style='border-top:1px solid #444; margin:10px 0;'></div><span style='font-size:10px;'>jsmith@corp.com</span></div>", t:50 + (i*210), l:50, w:320, h:180},
                    {html:"<div style='background:#222; color:white; width:100%; height:100%; padding:15px;'><b style='font-size:16px; color:#d4af37;'>JANE SMITH</b><br><span style='font-size:10px;'>CEO & Founder</span><br><div style='border-top:1px solid #444; margin:10px 0;'></div><span style='font-size:10px;'>jsmith@corp.com</span></div>", t:50 + (i*210), l:400, w:320, h:180}
                ]).flat()
            },
            {
                n:"Photo (10up)", bg:"#fff", 
                els: Array.from({length: 5}, (_, i) => [
                    {html:"<div style='border:1px solid #ccc; width:100%; height:100%; overflow:hidden;'><div style='width:40%; height:100%; background:url(https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80); background-size:cover; float:left;'></div><div style='float:left; width:60%; padding:10px;'><b style='font-size:14px;'>Alex Lee</b><br><span style='font-size:10px;'>Photographer</span><br><br><span style='font-size:10px;'>555-SNAP</span></div></div>", t:50 + (i*210), l:50, w:320, h:180},
                    {html:"<div style='border:1px solid #ccc; width:100%; height:100%; overflow:hidden;'><div style='width:40%; height:100%; background:url(https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80); background-size:cover; float:left;'></div><div style='float:left; width:60%; padding:10px;'><b style='font-size:14px;'>Alex Lee</b><br><span style='font-size:10px;'>Photographer</span><br><br><span style='font-size:10px;'>555-SNAP</span></div></div>", t:50 + (i*210), l:400, w:320, h:180}
                ]).flat()
            },
            {
                n:"Bold (10up)", bg:"#fff",
                 els: Array.from({length: 5}, (_, i) => [
                    {html:"<div style='background:#ffeb3b; width:100%; height:100%; padding:15px; display:flex; align-items:center; justify-content:center; flex-direction:column;'><b style='font-size:20px; font-weight:900;'>HELLO.</b><span style='font-size:12px;'>I am a developer</span></div>", t:50 + (i*210), l:50, w:320, h:180},
                    {html:"<div style='background:#ffeb3b; width:100%; height:100%; padding:15px; display:flex; align-items:center; justify-content:center; flex-direction:column;'><b style='font-size:20px; font-weight:900;'>HELLO.</b><span style='font-size:12px;'>I am a developer</span></div>", t:50 + (i*210), l:400, w:320, h:180}
                ]).flat()
            }
        ],
        "Posters": [
            {
                n:"Motivational", bg:"#000",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; opacity:0.6;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:white; font-family:\"Oswald\"; font-size:120px; text-align:center; text-transform:uppercase; border:10px solid white; padding:20px;'>Dream<br>Big</h1>", t:200, l:100, w:600, h:400},
                    {html:"<p style='color:white; text-align:center; font-size:24px; font-style:italic;'>\"The only way to do great work is to love what you do.\"</p>", t:650, l:100, w:600, h:100}
                ]
            },
            {
                n:"Movie Poster", bg:"#1a237e",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; mix-blend-mode:overlay;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:#fff; font-family:\"Cinzel\"; font-size:80px; text-align:center; text-shadow:0 0 10px cyan;'>THE GALAXY</h1>", t:50, l:50, w:700, h:120},
                    {html:"<h3 style='color:#ccc; text-align:center; letter-spacing:10px;'>COMING SOON</h3>", t:160, l:100, w:600, h:60},
                    {html:"<div style='position:absolute; bottom:50px; width:100%; text-align:center; color:#aaa; font-size:12px;'>STARRING ACTOR NAME • DIRECTED BY DIRECTOR NAME</div>", t:1000, l:0, w:794, h:50}
                ]
            },
            {
                n:"Yoga Class", bg:"#e0f7fa",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&w=800&q=80' style='width:100%; height:500px; object-fit:cover; border-radius:0 0 300px 300px;'>", t:0, l:0, w:794, h:500},
                    {html:"<h1 style='text-align:center; color:#006064; font-family:sans-serif; font-weight:300; font-size:60px;'>Morning Yoga</h1>", t:550, l:100, w:600, h:100},
                    {html:"<p style='text-align:center; font-size:20px; color:#555;'>Find your balance.</p>", t:650, l:200, w:400, h:50},
                    {html:"<div style='background:#00bcd4; color:white; padding:15px; text-align:center; border-radius:50px; font-size:24px;'>First Class Free</div>", t:750, l:250, w:300, h:80}
                ]
            },
            {
                n:"Missing Person", bg:"#fff",
                els: [
                    {html:"<h1 style='background:red; color:white; text-align:center; font-size:80px; font-weight:bold;'>MISSING</h1>", t:50, l:50, w:700, h:120},
                    {html:"<div style='background:#ccc; width:100%; height:100%; display:flex; align-items:center; justify-content:center;'>PHOTO</div>", t:200, l:200, w:400, h:400},
                    {html:"<h2 style='text-align:center;'>JANE DOE</h2>", t:620, l:200, w:400, h:60},
                    {html:"<p style='text-align:center; font-size:20px;'>Last seen wearing a blue jacket.</p>", t:680, l:100, w:600, h:80},
                    {html:"<h1 style='text-align:center;'>CALL 911</h1>", t:800, l:200, w:400, h:100}
                ]
            },
            {
                n: "Art Exhibition", bg: "#212121",
                els: [
                     {html:"<h1 style='color:white; font-family:sans-serif; text-align:right; font-size:80px; margin-right:50px;'>MODERN<br>ART</h1>", t:50, l:200, w:500, h:200},
                     {html:"<div style='background:white; width:400px; height:400px; transform:rotate(10deg); margin:0 auto; border:10px solid #333;'></div>", t:300, l:200, w:400, h:400},
                     {html:"<p style='color:#777; text-align:center; margin-top:50px;'>Gallery Open Night</p>", t:800, l:200, w:400, h:50}
                ]
            }
        ],
        "Social Media": [
            {
                n:"Instagram Quote", bg:"#fff",
                els: [
                    {html:"<div style='width:100%; height:100%; background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);'></div>", t:0, l:0, w:794, h:794},
                    {html:"<div style='background:white; width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:40px;'><h1 style='font-family:\"Playfair Display\"; text-align:center; font-style:italic;'>\"Creativity is intelligence having fun.\"</h1></div>", t:100, l:100, w:600, h:600},
                    {html:"<p style='text-align:center; color:white; font-weight:bold;'>@yourhandle</p>", t:720, l:200, w:400, h:50}
                ]
            },
            {
                n:"YouTube Thumb", bg:"#fff",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover;'>", t:0, l:0, w:794, h:446},
                    {html:"<h1 style='color:white; font-family:Impact; font-size:100px; -webkit-text-stroke:3px black; text-shadow:5px 5px 0 black;'>EPIC VLOG!</h1>", t:50, l:50, w:700, h:150},
                    {html:"<div style='background:red; color:white; font-weight:bold; font-size:40px; padding:10px; display:inline-block; transform:rotate(-5deg);'>MUST WATCH</div>", t:250, l:50, w:300, h:80},
                    {html:"<img src='https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' style='border:5px solid white; border-radius:50%; width:100%; height:100%; object-fit:cover;'>", t:250, l:600, w:150, h:150}
                ]
            },
            {
                n:"Sale Story", bg:"#000",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; opacity:0.6;'>", t:0, l:0, w:794, h:1123},
                    {html:"<h1 style='color:white; font-family:sans-serif; font-size:150px; text-align:center; margin:0;'>SALE</h1>", t:100, l:50, w:700, h:200},
                    {html:"<h2 style='color:#ff00ff; text-align:center; font-size:60px;'>50% OFF</h2>", t:300, l:100, w:600, h:100},
                    {html:"<div style='border:2px solid white; color:white; padding:15px; text-align:center; border-radius:30px; margin-top:200px;'>SWIPE UP TO SHOP</div>", t:900, l:200, w:400, h:80}
                ]
            },
            {
                n:"Event Post", bg:"#3f51b5",
                els: [
                    {html:"<div style='background:white; width:100%; height:100%; clip-path:polygon(0 0, 100% 0, 100% 85%, 0 100%);'></div>", t:20, l:20, w:754, h:600},
                    {html:"<h1 style='color:#3f51b5; font-size:60px; text-align:center;'>WEBINAR</h1>", t:100, l:50, w:700, h:100},
                    {html:"<h3 style='color:#333; text-align:center;'>Learn Design in 30 Days</h3>", t:220, l:100, w:600, h:60},
                    {html:"<div style='text-align:center; color:white; font-size:24px;'>LINK IN BIO</div>", t:700, l:200, w:400, h:50}
                ]
            },
            {
                n: "Pinterest Pin", bg: "#f8bbd0",
                els: [
                    {html:"<img src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80' style='width:100%; height:100%; object-fit:cover; opacity:0.8;'>", t:0, l:0, w:794, h:1123},
                    {html:"<div style='background:white; opacity:0.9; padding:20px; text-align:center;'><h1 style='margin:0;'>10 Style Tips</h1><p>Look great for less.</p></div>", t:400, l:100, w:600, h:200}
                ]
            }
        ]
    };
    
    const catsDiv = document.getElementById('template-cats');
    const gridDiv = document.getElementById('template-grid');
    
    // Icon mapping for Font Awesome
    const icons = {
        "Resumes": "fa-user-tie",
        "Invitations": "fa-envelope-open-text",
        "Flyers": "fa-paper-plane",
        "Magazines": "fa-book-open",
        "Brochures": "fa-columns",
        "Certificates": "fa-certificate",
        "Menus": "fa-utensils",
        "Calendars": "fa-calendar-alt",
        "Letterheads": "fa-file-signature",
        "Newsletters": "fa-newspaper",
        "Business Cards": "fa-id-card",
        "Posters": "fa-image",
        "Social Media": "fa-share-alt"
    };

    Object.keys(tmplData).forEach(cat => {
        const btn = document.createElement('div');
        btn.className = 'cat-btn';
        
        // Add Icon if exists
        const iconClass = icons[cat] || "fa-file-alt";
        btn.innerHTML = `<i class="fas ${iconClass}"></i> ${cat}`;
        
        btn.onclick = (e) => loadCat(cat, e);
        catsDiv.appendChild(btn);
    });

    function loadCat(cat, e) {
        gridDiv.innerHTML = '';
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        
        // Handle active state
        if(e && e.currentTarget) e.currentTarget.classList.add('active');
        else if(!e && catsDiv.firstChild) catsDiv.firstChild.classList.add('active');
        
        tmplData[cat].forEach(t => {
            const div = document.createElement('div');
            div.className = 'tp-item';
            
            // --- PREVIEW LOGIC: Render scaled HTML ---
            let previewHTML = '';
            t.els.forEach(el => {
                // We construct the HTML structure exactly as it will appear
                previewHTML += `<div style="position:absolute; top:${el.t}px; left:${el.l}px; width:${el.w}px; height:${el.h}px; z-index:1;">${el.html}</div>`;
            });
            
            // Create a scaled container (A4 size scaled down)
            // A4 is 794x1123. 
            // To fit into 100px width, scale is approx 0.125
            const content = `
                <div style="
                    width: 794px; 
                    height: 1123px; 
                    background: ${t.bg}; 
                    transform: scale(0.125); 
                    transform-origin: 0 0; 
                    overflow: hidden; 
                    position: absolute; 
                    top: 0; left: 0;
                    pointer-events: none;
                ">
                    ${previewHTML}
                </div>
            `;

            div.innerHTML = `<div class="template-preview">${content}</div><div>${t.n}</div>`;
            div.onclick = () => loadTemplate(t);
            gridDiv.appendChild(div);
        });
    }
    // Trigger load of first category
    if(catsDiv.firstChild) loadCat(Object.keys(tmplData)[0]);
}

function loadTemplate(t) {
     if(confirm("Load template? This will replace your current page content.")) {
         state.pages[state.currentPageIndex] = serializeCurrentPage(); // Save current just in case
         
         const newElements = t.els.map(el => {
             return {
                 left: el.l + 'px', top: el.t + 'px',
                 width: el.w + 'px', height: el.h + 'px',
                 innerHTML: el.html,
                 transform: 'none', zIndex: 10,
                 scaleX: "1", scaleY: "1"
             };
         });
         
         const p = {
            id: Date.now(),
            width: '794px', height: '1123px',
            background: t.bg || '#ffffff',
            header: 'Header', footer: 'Footer', borderStyle: 'none',
            elements: newElements
         };
         
         renderPage(p);
         document.getElementById('template-modal').style.display = 'none';
         pushHistory();
     }
}

// --- ELEMENTS & MANIPULATION ---
function createWrapper(htmlContent) {
    const el = document.createElement('div');
    el.className = 'pub-element';
    el.style.left = '50px';
    el.style.top = '50px';
    el.style.width = '200px';
    el.style.height = '100px';
    el.style.zIndex = 10;
    
    // Default scale
    el.setAttribute('data-scaleX', "1");
    el.setAttribute('data-scaleY', "1");
    
    el.innerHTML = `
        <div class="element-content">${htmlContent}</div>
        <div class="resize-handle rh-nw" data-dir="nw"></div>
        <div class="resize-handle rh-n" data-dir="n"></div>
        <div class="resize-handle rh-ne" data-dir="ne"></div>
        <div class="resize-handle rh-e" data-dir="e"></div>
        <div class="resize-handle rh-se" data-dir="se"></div>
        <div class="resize-handle rh-s" data-dir="s"></div>
        <div class="resize-handle rh-sw" data-dir="sw"></div>
        <div class="resize-handle rh-w" data-dir="w"></div>
        <div class="rotate-stick"></div>
        <div class="rotate-handle"></div>
    `;
    paper.appendChild(el);
    selectElement(el);
    updateThumbnails();
    pushHistory();
    return el;
}

function addTextBox() { 
    createWrapper('<div style="padding:10px; height:100%; word-wrap:break-word;" contenteditable="true">Click to edit text</div>'); 
}

function initTablePicker() {
    const grid = document.getElementById('table-picker-grid');
    const label = document.getElementById('table-grid-label');
    
    // Generate 10x10 Grid
    for(let r=1; r<=10; r++) {
        for(let c=1; c<=10; c++) {
            const cell = document.createElement('div');
            cell.style.width = '18px';
            cell.style.height = '18px';
            cell.style.border = '1px solid #ccc';
            cell.style.backgroundColor = '#fff';
            cell.style.cursor = 'pointer';
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            cell.onmouseover = () => {
                label.innerText = `${c} x ${r} Table`;
                Array.from(grid.children).forEach(child => {
                    const cr = parseInt(child.dataset.r);
                    const cc = parseInt(child.dataset.c);
                    if(cr <= r && cc <= c) {
                        child.style.backgroundColor = '#cce8ff';
                        child.style.borderColor = '#0078d4';
                    } else {
                        child.style.backgroundColor = '#fff';
                        child.style.borderColor = '#ccc';
                    }
                });
            };
            
            cell.onclick = () => {
                insertTable(r, c);
                document.getElementById('table-dropdown').style.display = 'none';
            };
            
            grid.appendChild(cell);
        }
    }
}

function toggleTableMenu(btn) {
    const m = document.getElementById('table-dropdown');
    const r = btn.getBoundingClientRect();
    m.style.left = r.left + 'px'; m.style.top = (r.bottom+5) + 'px';
    m.style.display = (m.style.display === 'block' ? 'none' : 'block');
}

function promptCustomTable() {
    document.getElementById('table-dropdown').style.display = 'none';
    const cols = parseInt(prompt("Enter number of columns:", "5"));
    if(isNaN(cols) || cols < 1) return;
    
    const rows = parseInt(prompt("Enter number of rows:", "5"));
    if(isNaN(rows) || rows < 1) return;
    
    insertTable(rows, cols);
}

// FIXED: insertTable now uses "Separate but Locked" strategy to prevent disappearing lines on zoom
function insertTable(rows, cols) {
    let html = '<table style="width:100%; height:100%; border-spacing:0; table-layout:fixed; border-collapse:separate; border-top:1px solid #000; border-left:1px solid #000;">';
    for(let i=0; i<rows; i++) {
        html += '<tr>';
        for(let j=0; j<cols; j++) {
            html += '<td style="border-right:1px solid #000; border-bottom:1px solid #000; border-top:none; border-left:none; min-width:20px; height:20px; outline:none;" contenteditable="true">&nbsp;</td>';
        }
        html += '</tr>';
    }
    html += '</table>';
    createWrapper(html);
}

function addTable() { 
    // Fallback if needed, but UI uses insertTable
    insertTable(3,3); 
}

function addShapeElement(clip, bg) {
    const el = createWrapper(`<div style="width:100%; height:100%; background:${bg}; clip-path:${clip}"></div>`);
    el.style.width = '100px'; el.style.height = '100px';
    el.setAttribute('data-type', 'shape');
}

function triggerUpload() { document.getElementById('img-upload').click(); }

document.getElementById('img-upload').addEventListener('change', (e) => {
    if(e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            createWrapper(`<img src="${evt.target.result}">`);
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// --- CROP FEATURE ---
function toggleCrop() {
    if(!state.selectedEl) {
        alert("Please select an image to crop first.");
        return;
    }
    const el = state.selectedEl;
    const img = el.querySelector('.element-content img');
    
    if(!img) {
        alert("Only images can be cropped.");
        return;
    }

    state.cropMode = !state.cropMode;
    
    if(state.cropMode) {
        el.classList.add('cropping');
        document.getElementById('crop-btn').classList.add('active-tool');
        document.getElementById('status-msg').innerText = "Crop Mode: Drag handles to clip. Drag image to pan.";
        
        const w = img.offsetWidth;
        const h = img.offsetHeight;
        
        img.style.width = w + 'px';
        img.style.height = h + 'px';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
        img.style.position = 'absolute';
        if(!img.style.left) img.style.left = '0px';
        if(!img.style.top) img.style.top = '0px';
        
    } else {
        el.classList.remove('cropping');
        document.getElementById('crop-btn').classList.remove('active-tool');
        document.getElementById('status-msg').innerText = "Element Selected";
    }
}

// --- INTERACTION LOGIC ---
function handleMouseDown(e) {
    if(e.target === paper || e.target.classList.contains('margin-guides')) {
        deselect();
        return;
    }

    // Handle Cropping Logic
    if(state.cropMode && state.selectedEl) {
        if(e.target.classList.contains('resize-handle')) {
            state.dragMode = 'resize'; 
            state.dragData = {
                dir: e.target.dataset.dir,
                startX: e.clientX, startY: e.clientY,
                w: parseFloat(state.selectedEl.style.width),
                h: parseFloat(state.selectedEl.style.height),
                l: parseFloat(state.selectedEl.style.left),
                t: parseFloat(state.selectedEl.style.top)
            };
            e.preventDefault();
            return;
        }
        
        if(e.target.tagName === 'IMG' && e.target.closest('.pub-element') === state.selectedEl) {
            state.dragMode = 'pan-image';
            const img = e.target;
            state.dragData = {
                startX: e.clientX, startY: e.clientY,
                l: parseFloat(img.style.left) || 0,
                t: parseFloat(img.style.top) || 0
            };
            e.preventDefault();
            return;
        }
        
        if(!e.target.closest('.pub-element.cropping')) {
            toggleCrop();
        }
    }

    // Standard Logic (Resize/Rotate)
    if(e.target.classList.contains('rotate-handle') || e.target.classList.contains('resize-handle')) {
        if(e.target.classList.contains('rotate-handle')) {
            state.dragMode = 'rotate';
            const rect = state.selectedEl.getBoundingClientRect();
            state.dragData = { cx: rect.left + rect.width/2, cy: rect.top + rect.height/2 };
        } else {
            state.dragMode = 'resize';
            const content = state.selectedEl.querySelector('.element-content');
            // Store current scale state
            const curSX = parseFloat(state.selectedEl.getAttribute('data-scaleX')) || 1;
            const curSY = parseFloat(state.selectedEl.getAttribute('data-scaleY')) || 1;

            state.dragData = {
                dir: e.target.dataset.dir,
                startX: e.clientX, startY: e.clientY,
                w: parseFloat(state.selectedEl.style.width),
                h: parseFloat(state.selectedEl.style.height),
                l: parseFloat(state.selectedEl.style.left),
                t: parseFloat(state.selectedEl.style.top),
                scaleX: curSX,
                scaleY: curSY
            };
        }
        e.preventDefault(); 
        return;
    }

    const el = e.target.closest('.pub-element');
    if(el) {
        // If not already selected, select it
        const isSelected = (state.selectedEl === el);
        if(!isSelected) selectElement(el);
        
        // Click on WordArt to edit?
        if(el.querySelector('.wa-text') && isSelected) {
            // Do nothing here, allow drag, double click handles edit
        }

        // --- EDGE DRAG LOGIC (Robust) ---
        const isClipart = el.querySelector('svg');
        const isImage = el.querySelector('img');
        const isShape = el.getAttribute('data-type') === 'shape';
        
        // 1. NON-TEXT ITEMS: Always drag immediately
        if(isClipart || isImage || isShape) {
             state.dragMode = 'drag';
             state.dragData = {
                startX: e.clientX, startY: e.clientY,
                l: parseFloat(el.style.left), t: parseFloat(el.style.top)
             };
             e.preventDefault();
             return;
        }

        // 2. TEXT/EDITABLE ITEMS:
        // Drag if clicking edge OR using move cursor area
        const rect = el.getBoundingClientRect();
        const edgeSize = 15; 
        const x = e.clientX; 
        const y = e.clientY;
        
        const nearEdge = (x < rect.left + edgeSize) || (x > rect.right - edgeSize) || 
                         (y < rect.top + edgeSize) || (y > rect.bottom - edgeSize);
        
        // --- FIX: Allow dragging over and over unless specifically in text edit mode ---
        // If the user clicks inside, but isn't explicitly targeting a text cursor or selected text
        // we should allow drag. 
        const activeEl = document.activeElement;
        const isEditingText = activeEl && el.contains(activeEl) && (activeEl.isContentEditable);
        
        if (nearEdge || !isEditingText) {
            state.dragMode = 'drag';
            state.dragData = {
                startX: e.clientX, startY: e.clientY,
                l: parseFloat(el.style.left), t: parseFloat(el.style.top)
            };
            if(!isEditingText) e.preventDefault(); 
        }
    }
}

function handleMouseMove(e) {
    document.getElementById('coord-display').innerText = `X: ${e.clientX} | Y: ${e.clientY}`;
    
    // Cursor Update Logic
    if(!state.dragMode && !state.cropMode) {
        const el = e.target.closest('.pub-element');
        if(el) {
            const isShape = el.querySelector('img') || el.querySelector('svg') || el.getAttribute('data-type') === 'shape';
            const rect = el.getBoundingClientRect();
            
            if (isShape) {
                el.style.cursor = 'move';
            } else {
                // For text boxes, only edges are move
                const edgeSize = 15;
                const x = e.clientX; const y = e.clientY;
                const nearEdge = (x < rect.left + edgeSize) || (x > rect.right - edgeSize) || 
                                 (y < rect.top + edgeSize) || (y > rect.bottom - edgeSize);
                el.style.cursor = nearEdge ? 'move' : 'text';
            }
        }
    }

    if(!state.dragMode || !state.selectedEl) return;

    const zoom = state.zoom;
    
    if(state.dragMode === 'drag') {
        const dx = (e.clientX - state.dragData.startX) / zoom;
        const dy = (e.clientY - state.dragData.startY) / zoom;
        state.selectedEl.style.left = (state.dragData.l + dx) + 'px';
        state.selectedEl.style.top = (state.dragData.t + dy) + 'px';
        
        // Hide toolbar while dragging
        floatToolbar.style.display = 'none';
    }
    else if(state.dragMode === 'pan-image') {
        const dx = (e.clientX - state.dragData.startX) / zoom;
        const dy = (e.clientY - state.dragData.startY) / zoom;
        const img = state.selectedEl.querySelector('img');
        img.style.left = (state.dragData.l + dx) + 'px';
        img.style.top = (state.dragData.t + dy) + 'px';
    }
    else if(state.dragMode === 'rotate') {
        const angle = Math.atan2(e.clientY - state.dragData.cy, e.clientX - state.dragData.cx) * (180/Math.PI);
        state.selectedEl.style.transform = `rotate(${angle + 90}deg)`;
    }
    else if(state.dragMode === 'resize') {
        const dx = (e.clientX - state.dragData.startX) / zoom;
        const dy = (e.clientY - state.dragData.startY) / zoom;
        const d = state.dragData;
        
        // Calculate raw new dimensions
        let rawW = d.w;
        let rawH = d.h;
        let newL = d.l;
        let newT = d.t;
        
        // --- CROP MASKING LOGIC ---
        // If Cropping, dragging Left/Top handles changes container size/pos
        // We must move the inner image inversely to keep it "stationary" visually.
        const isCrop = state.cropMode;
        let imgDx = 0;
        let imgDy = 0;

        // Horizontal
        if (d.dir.includes('e')) {
            rawW = d.w + dx;
        } else if (d.dir.includes('w')) {
            rawW = d.w - dx;
            newL = d.l + dx;
            if(isCrop) imgDx = -dx;
        }
        
        // Vertical
        if (d.dir.includes('s')) {
            rawH = d.h + dy;
        } else if (d.dir.includes('n')) {
            rawH = d.h - dy;
            newT = d.t + dy;
            if(isCrop) imgDy = -dy;
        }

        if (isCrop) {
            // Update Image Position for Masking Effect
            const img = state.selectedEl.querySelector('img');
            if (imgDx !== 0) {
                 const curL = parseFloat(img.style.left) || 0;
                 img.style.left = (curL + imgDx) + 'px';
            }
            if (imgDy !== 0) {
                 const curT = parseFloat(img.style.top) || 0;
                 img.style.top = (curT + imgDy) + 'px';
            }
            // Apply Simple Container Resize
            if(rawW > 10) {
                state.selectedEl.style.width = rawW + 'px';
                state.selectedEl.style.left = newL + 'px';
            }
            if(rawH > 10) {
                state.selectedEl.style.height = rawH + 'px';
                state.selectedEl.style.top = newT + 'px';
            }
        } else {
            // --- NORMAL RESIZE WITH MIRRORING ---
            // Handle Mirroring (Negative Scale)
            let finalScaleX = d.scaleX;
            let finalScaleY = d.scaleY;
            
            if (rawW < 0) {
                rawW = Math.abs(rawW);
                if (d.dir.includes('e')) newL = d.l - rawW;
                finalScaleX = -1 * d.scaleX;
            } 
            if (rawH < 0) {
                rawH = Math.abs(rawH);
                if (d.dir.includes('s')) newT = d.t - rawH;
                finalScaleY = -1 * d.scaleY;
            }

            // Apply
            state.selectedEl.style.width = rawW + 'px';
            state.selectedEl.style.height = rawH + 'px';
            state.selectedEl.style.left = newL + 'px';
            state.selectedEl.style.top = newT + 'px';
            
            // Update Scale Transform on Content
            const content = state.selectedEl.querySelector('.element-content');
            content.style.transform = `scale(${finalScaleX}, ${finalScaleY})`;
            
            // Store state
            state.selectedEl.setAttribute('data-scaleX', finalScaleX);
            state.selectedEl.setAttribute('data-scaleY', finalScaleY);
        }

        floatToolbar.style.display = 'none';
    }
}

function handleMouseUp() {
    if(state.dragMode) {
        setTimeout(() => updateThumbnails(), 50);
        pushHistory(); 
        // Show toolbar again if item is selected
        if(state.selectedEl) showFloatToolbar();
    }
    state.dragMode = null;
}

function handleKeyUp(e) {
    if(e.target.isContentEditable) {
        if(this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            updateThumbnails();
            pushHistory();
        }, 1000);
    }
}

function selectElement(el) {
    if(state.selectedEl && state.selectedEl !== el) deselect();
    state.selectedEl = el;
    el.classList.add('selected');
    document.getElementById('status-msg').innerText = "Element Selected";
    
    showFloatToolbar();
}

function deselect() {
    if(state.cropMode) toggleCrop(); 

    if(state.selectedEl) {
        state.selectedEl.classList.remove('selected');
        const wa = state.selectedEl.querySelector('.wa-text');
        if(wa) {
             wa.classList.remove('editing');
             wa.setAttribute('contenteditable', 'false');
        }
    }
    state.selectedEl = null;
    document.getElementById('status-msg').innerText = "Ready";
    floatToolbar.style.display = 'none';
}

// Double Click Edit
document.addEventListener('dblclick', (e) => {
    const el = e.target.closest('.pub-element');
    if(el) {
        const wa = el.querySelector('.wa-text');
        if(wa) {
            wa.classList.add('editing');
            wa.setAttribute('contenteditable', 'true');
            wa.focus();
            return;
        }
        
        const content = el.querySelector('.element-content div, .element-content table');
        if(content) { 
            content.setAttribute('contenteditable', 'true');
            content.focus();
        }
    }
});

function showFloatToolbar() {
    if(!state.selectedEl) return;
    
    const el = state.selectedEl;
    const isImage = el.querySelector('img');
    const isSvg = el.querySelector('svg');
    const isShape = el.getAttribute('data-type') === 'shape';
    const isWordArt = el.querySelector('.wa-text');
    const isTable = el.querySelector('table');
    
    if(isImage || (isShape && !isWordArt && !isTable)) {
        floatToolbar.style.display = 'none';
        return;
    }
    
    if(isSvg && !isWordArt && !isShape) {
         floatToolbar.style.display = 'none';
         return;
    }

    const rect = state.selectedEl.getBoundingClientRect();
    floatToolbar.style.display = 'flex';
    
    let top = rect.top - 80; 
    let left = rect.left;
    
    if(top < 10) top = rect.bottom + 20; 
    if(left < 10) left = 10;
    
    floatToolbar.style.top = top + 'px';
    floatToolbar.style.left = left + 'px';
    
    updateFloatToolbarValues();
}

// --- MENU ACTIONS ---
function switchTab(t) {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.ribbon-toolbar').forEach(x => x.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('ribbon-'+t).classList.add('active');
}

function toggleMargins() {
    const g = document.getElementById('margin-guides');
    g.style.display = (g.style.display === 'none') ? 'block' : 'none';
}
function toggleRulers() {
    const c = document.getElementById('canvas-area');
    if(c.style.gridTemplateColumns === '0px 1fr') {
        c.style.gridTemplateColumns = '20px 1fr'; c.style.gridTemplateRows = '20px 1fr';
    } else {
        c.style.gridTemplateColumns = '0px 1fr'; c.style.gridTemplateRows = '0px 1fr';
    }
}
function toggleOrientation() {
    const currentW = paper.style.width;
    const currentH = paper.style.height;
    paper.style.width = currentH;
    paper.style.height = currentW;
    pushHistory();
}
function changeSize() {
     const size = prompt("Enter width,height (e.g. 800px,600px)", paper.style.width + "," + paper.style.height);
    if(size) {
        const [w, h] = size.split(',');
        paper.style.width = w; paper.style.height = h;
        pushHistory();
    }
}
function setPageSize(format) {
    if(format === 'A4') {
        paper.style.width = '794px'; paper.style.height = '1123px';
    } else if(format === 'Letter') {
        paper.style.width = '816px'; paper.style.height = '1056px';
    }
    pushHistory();
    document.getElementById('size-dropdown').style.display = 'none';
}
function setZoom(z) {
    state.zoom = z;
    paper.style.transform = `scale(${z})`;
}
function toggleGrid() { paper.classList.toggle('theme-grid'); }
function toggleBaselines() { paper.classList.toggle('theme-baselines'); }

function selectAllElements() {
    const all = document.querySelectorAll('.pub-element');
    if(all.length > 0) selectElement(all[0]); 
    alert("All elements selected (Bulk move not yet supported in this version)");
}

function deleteSelected() { 
    if(state.selectedEl) { 
        state.selectedEl.remove(); 
        state.selectedEl=null; 
        updateThumbnails();
        pushHistory();
        floatToolbar.style.display = 'none';
    } 
}
function copyEl() { if(state.selectedEl) state.copiedEl = state.selectedEl.cloneNode(true); }
function pasteEl() { 
    if(state.copiedEl) { 
        const n = state.copiedEl.cloneNode(true);
        n.style.left = (parseFloat(n.style.left)+20)+'px';
        n.style.top = (parseFloat(n.style.top)+20)+'px';
        paper.appendChild(n);
        selectElement(n);
        updateThumbnails();
        pushHistory();
    } 
}

function setTrueFontSize(val) {
    if (state.selectedEl) {
        // Ensure selection is restored for float bar operations
        if (state.lastRange) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(state.lastRange);
        }
        
        // --- FIXED: RELIABLE FONT SIZE CHANGE ---
        // execCommand('fontSize', 7) makes font <font size="7">
        document.execCommand("fontSize", false, "7"); 
        
        // Convert <font size="7"> to inline style with pixel value
        // Use a loop in case multiple blocks are selected
        const fontTags = state.selectedEl.querySelectorAll('font[size="7"]');
        fontTags.forEach(f => {
            f.removeAttribute("size");
            f.style.fontSize = val;
        });
        
        // If selection was just caret (no range), apply to container
        const sel = window.getSelection();
        if(sel.isCollapsed) {
             const content = state.selectedEl.querySelector('.element-content > div');
             if(content) content.style.fontSize = val;
        }
        
        pushHistory();
    }
}

function setFloatSize(val) {
    state.isProgrammaticUpdate = true;
    setTrueFontSize(val + 'px');
    setTimeout(() => { state.isProgrammaticUpdate = false; }, 100);
}

function setFloatFont(val) {
    state.isProgrammaticUpdate = true;
    if (state.lastRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(state.lastRange);
    }
    document.execCommand('fontName', false, val);
    setTimeout(() => { state.isProgrammaticUpdate = false; }, 100);
}

function execFloatCmd(cmd, val) {
    state.isProgrammaticUpdate = true;
    if (state.lastRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(state.lastRange);
    }
    execCmd(cmd, val);
    setTimeout(() => { state.isProgrammaticUpdate = false; }, 100);
}

function execCmd(cmd, val) { 
    if(cmd === 'foreColor' && state.selectedEl && state.selectedEl.getAttribute('data-type') === 'shape') {
        const shapeDiv = state.selectedEl.querySelector('.element-content div');
        if(shapeDiv) shapeDiv.style.background = val;
        const svgShape = state.selectedEl.querySelector('svg *');
        if(svgShape) svgShape.style.stroke = val;
        updateThumbnails();
        pushHistory();
        return;
    }
    document.execCommand(cmd, false, val); 
    
    const sel = window.getSelection();
    if(sel.rangeCount > 0) state.lastRange = sel.getRangeAt(0).cloneRange();
    
    if(!state.isProgrammaticUpdate) updateFloatToolbarValues();
}

function toggleSpellCheck() {
    state.spellCheck = !state.spellCheck;
    document.body.setAttribute('spellcheck', state.spellCheck);
    const status = state.spellCheck ? "ON" : "OFF";
    alert("Spell check toggled " + status);
}
function openThesaurus() { window.open('https://www.thesaurus.com/', '_blank'); }

function applyImgFilter(filter) {
    if(state.selectedEl) {
        const img = state.selectedEl.querySelector('img');
        if(img) {
            img.style.filter = filter;
            updateThumbnails();
            pushHistory();
        } else { alert("Please select an image first."); }
    }
}

function rotateSelectedImage() {
    if(state.selectedEl) {
        const currentTransform = state.selectedEl.style.transform || 'none';
        // Parse rotation
        let angle = 0;
        if(currentTransform.includes('rotate')) {
            const match = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
            if(match) angle = parseFloat(match[1]);
        }
        angle += 90;
        state.selectedEl.style.transform = `rotate(${angle}deg)`;
        updateThumbnails();
        pushHistory();
    } else {
        alert("Please select an object to rotate.");
    }
}

function bringFront() {
    if(state.selectedEl) {
        const els = Array.from(paper.querySelectorAll('.pub-element'));
        const maxZ = els.reduce((max, el) => Math.max(max, parseInt(el.style.zIndex) || 10), 0);
        state.selectedEl.style.zIndex = maxZ + 1;
        pushHistory();
    }
}

function sendBack() {
    if(state.selectedEl) {
        const els = Array.from(paper.querySelectorAll('.pub-element'));
        const minZ = els.reduce((min, el) => Math.min(min, parseInt(el.style.zIndex) || 10), 10000);
        state.selectedEl.style.zIndex = Math.max(1, minZ - 1);
        pushHistory();
    }
}

function showClipartModal() { document.getElementById('clipart-modal').style.display = 'flex'; }
function showWordArtModal() { document.getElementById('wordart-modal').style.display = 'flex'; }
function showAdModal() { document.getElementById('ad-modal').style.display = 'flex'; }
function showTemplateModal() { document.getElementById('template-modal').style.display = 'flex'; }
function closeModal(el) { el.style.display = 'none'; }

function toggleShapeMenu(btn) {
    const m = document.getElementById('shape-dropdown');
    const r = btn.getBoundingClientRect();
    m.style.left = r.left + 'px'; m.style.top = (r.bottom+5) + 'px';
    m.style.display = 'block';
}
function toggleBorderMenu(btn) {
    const m = document.getElementById('border-dropdown');
    const r = btn.getBoundingClientRect();
    m.style.left = r.left + 'px'; m.style.top = (r.bottom+5) + 'px';
    m.style.display = 'block';
}
function toggleRecolorMenu(btn) {
    const m = document.getElementById('recolor-dropdown');
    const r = btn.getBoundingClientRect();
    m.style.left = r.left + 'px'; m.style.top = (r.bottom+5) + 'px';
    m.style.display = 'block';
}
function toggleSizeMenu(btn) {
    const m = document.getElementById('size-dropdown');
    const r = btn.getBoundingClientRect();
    m.style.left = r.left + 'px'; m.style.top = (r.bottom+5) + 'px';
    m.style.display = 'block';
}

function initRulers() {
    const h = document.getElementById('ruler-h');
    const v = document.getElementById('ruler-v');
    for(let i=0; i<2000; i+=10) {
        let d = document.createElement('div'); d.className='tick tick-h'; d.style.left=i+'px'; d.style.height=(i%100==0?'100%':(i%50==0?'50%':'25%')); h.appendChild(d);
        if(i%100==0 && i>0) { let n = document.createElement('span'); n.className='tick-num'; n.innerText=i; n.style.left=(i+2)+'px'; h.appendChild(n); }
        let dv = document.createElement('div'); dv.className='tick tick-v'; dv.style.top=i+'px'; dv.style.width=(i%100==0?'100%':(i%50==0?'50%':'25%')); v.appendChild(dv);
    }
}

function saveDocument() {
    state.pages[state.currentPageIndex] = serializeCurrentPage();
    const docData = {
        title: document.getElementById('doc-title').innerText,
        pages: state.pages
    };
    const blob = new Blob([JSON.stringify(docData)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = docData.title + '.json';
    a.click();
}

function openDocument() { document.getElementById('file-open').click(); }

document.getElementById('file-open').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            document.getElementById('doc-title').innerText = data.title;
            state.pages = data.pages;
            state.currentPageIndex = 0;
            renderPage(state.pages[0]);
            setTimeout(() => {
                updateThumbnails();
                pushHistory(); 
            }, 500);
        } catch(err) { alert("Error opening file: " + err); }
    };
    reader.readAsText(file);
});

window.downloadPDF = async function() {
    deselect();
    const oldZoom = state.zoom;
    setZoom(1.0);
    
    const guides = document.getElementById('margin-guides');
    const wasVisible = guides.style.display !== 'none';
    guides.style.display = 'none';
    
    if (!state.headersVisible) {
        paper.querySelector('.page-header').style.display = 'none';
        paper.querySelector('.page-footer').style.display = 'none';
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [794, 1123] 
    });

    const canvas = await html2canvas(paper, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: paper.style.backgroundColor || '#ffffff'
    }); 
    
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    doc.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
    
    if(wasVisible) guides.style.display = 'block';
    if (!state.headersVisible) {
        paper.querySelector('.page-header').style.removeProperty('display');
        paper.querySelector('.page-footer').style.removeProperty('display');
    }
    setZoom(oldZoom);

    const name = document.getElementById('doc-title').innerText || 'Publication';
    doc.save(name + '.pdf');
};