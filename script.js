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

// --- CUSTOM DRAGGABLE MODAL SYSTEM ---
const DialogSystem = {
    init: function() {
        // Inject the overlay into the body once
        if(!document.getElementById('custom-dialog-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'custom-dialog-overlay';
            overlay.id = 'custom-dialog-overlay';
            document.body.appendChild(overlay);
        }
    },
    show: function(title, contentHtml, onConfirm, isAlert = false) {
        const overlay = document.getElementById('custom-dialog-overlay');
        
        // Build the HTML structure
        overlay.innerHTML = `
            <div class="custom-dialog" id="custom-dialog-box" style="transform: translate(0px, 0px);">
                <div class="custom-dialog-header" id="custom-dialog-header">
                    <span>${title}</span>
                    <span class="custom-dialog-close" onclick="DialogSystem.close()"><i class="fas fa-times"></i></span>
                </div>
                <div class="custom-dialog-body">
                    ${contentHtml}
                </div>
                <div class="custom-dialog-footer">
                    <button class="btn-secondary" onclick="DialogSystem.close()" style="${isAlert ? 'display:none;' : ''}">Cancel</button>
                    <button class="btn-primary" id="custom-dialog-confirm">OK</button>
                </div>
            </div>
        `;
        
        overlay.style.display = 'flex';

        // Initialize dragging functionality
        this.makeDraggable(document.getElementById('custom-dialog-box'), document.getElementById('custom-dialog-header'));

        // Setup the OK button
        document.getElementById('custom-dialog-confirm').onclick = () => {
            if (onConfirm) onConfirm();
            this.close();
        };
    },
    alert: function(title, msg) {
        // Quick helper for simple alerts with only an OK button
        this.show(title, `<p style="margin:0;">${msg}</p>`, null, true);
    },
    close: function() {
        const overlay = document.getElementById('custom-dialog-overlay');
        if (overlay) overlay.style.display = 'none';
    },
    makeDraggable: function(elmnt, header) {
        let currentX = 0, currentY = 0, initialX = 0, initialY = 0;
        let xOffset = 0, yOffset = 0;

        header.onmousedown = dragStart;

        function dragStart(e) {
            e.preventDefault();
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            document.onmouseup = dragEnd;
            document.onmousemove = drag;
        }

        function drag(e) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            
            elmnt.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }

        function dragEnd() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
};

// --- INITIALIZATION ---
window.onload = function() {
    DialogSystem.init(); // Initialize the Modal System
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
    const activeId = document.activeElement ? document.activeElement.id : null;
    if(['float-font', 'float-size', 'font-size', 'ribbon-font-btn'].includes(activeId)) return;

    if(state.lastRange) {
        // Pinpoint the exact text node the cursor is touching
        let node = state.lastRange.startContainer;
        if (node.nodeType === 3) {
            node = node.parentNode;
        } else {
            // If the browser targets a wrapper, dig down to the exact child element
            const offset = state.lastRange.startOffset;
            if (node.childNodes.length > offset) {
                let child = node.childNodes[offset];
                if (child.nodeType === 3) child = child.parentNode;
                if (child && child.nodeType === 1) node = child;
            }
        }

        if(node && (node.nodeType === 1)) {
            const computed = window.getComputedStyle(node);
            const fam = computed.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
            
            // Update Font Family Labels
            document.getElementById('ribbon-font-label').innerText = fam;
            document.getElementById('float-font-label').innerText = fam;

            const fSize = parseInt(computed.fontSize);
            
            const floatSelect = document.getElementById('float-size');
            const ribbonInput = document.getElementById('font-size');

            // Force the float dropdown to accept custom numbers
            if (floatSelect) {
                let optionExists = Array.from(floatSelect.options).some(opt => parseInt(opt.value) === fSize);
                if(!optionExists) {
                    const newOpt = document.createElement('option');
                    newOpt.value = fSize;
                    newOpt.innerText = fSize;
                    floatSelect.appendChild(newOpt);
                    
                    // Sort options so the new number fits in naturally
                    const opts = Array.from(floatSelect.options);
                    opts.sort((a,b) => parseInt(a.value) - parseInt(b.value));
                    floatSelect.innerHTML = '';
                    opts.forEach(o => floatSelect.appendChild(o));
                }
                floatSelect.value = fSize;
            }
            
            // Update the Ribbon Input
            if (ribbonInput) {
                ribbonInput.value = fSize;
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
    
    DialogSystem.show('Delete Page', '<p>Are you sure you want to permanently delete this page?</p>', () => {
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
    });
}

function handleNewDocument() {
    const msg = `<p style="margin-top:0;">Create a new document?</p>
                 <p style="color:#555;"><strong>OK:</strong> Save to history and start fresh.<br>
                 <strong>Cancel:</strong> Abort.</p>`;
                 
    DialogSystem.show('New Document', msg, () => {
         state.pages = [];
         state.history = [];
         state.historyIndex = -1;
         addNewPage();
    });
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
            const el = createWrapper(`<div class="wa-wrapper"><div class="wa-text wa-style-${i}">Word Art</div></div>`);
            document.getElementById('wordart-modal').style.display = 'none';
            setTimeout(() => syncWordArt(el), 10); // NEW: Instantly format it!
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
    DialogSystem.show('Load Template', '<p>Load this template? This will replace your current page content.</p>', () => {
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
    });
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
    
    const formHtml = `
        <div class="input-group" style="margin-bottom:10px;">
            <label>Columns:</label>
            <input type="number" id="dialog-cols" value="5" min="1" max="20">
        </div>
        <div class="input-group">
            <label>Rows:</label>
            <input type="number" id="dialog-rows" value="5" min="1" max="50">
        </div>
    `;

    DialogSystem.show('Insert Custom Table', formHtml, () => {
        const cols = parseInt(document.getElementById('dialog-cols').value);
        const rows = parseInt(document.getElementById('dialog-rows').value);
        
        if(!isNaN(cols) && cols > 0 && !isNaN(rows) && rows > 0) {
            insertTable(rows, cols);
        }
    });
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
        DialogSystem.alert('Notice', "Please select an image to crop first.");
        return;
    }
    const el = state.selectedEl;
    const img = el.querySelector('.element-content img');
    
    if(!img) {
        DialogSystem.alert('Notice', "Only images can be cropped.");
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

            // NEW: Stretch WordArt while dragging
            if(state.selectedEl.querySelector('.wa-text')) {
                syncWordArt(state.selectedEl);
            }
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
             syncWordArt(state.selectedEl); // NEW: Stretch to fit box when done typing
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
            wa.style.transform = 'none'; // NEW: Snap back to natural size for typing
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
    const currentW = parseInt(paper.style.width) || 794;
    const currentH = parseInt(paper.style.height) || 1123;
    
    const formHtml = `
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button class="btn-secondary" onclick="document.getElementById('dialog-width').value=794; document.getElementById('dialog-height').value=1123; return false;" style="flex:1;">A4</button>
            <button class="btn-secondary" onclick="document.getElementById('dialog-width').value=816; document.getElementById('dialog-height').value=1056; return false;" style="flex:1;">Letter</button>
        </div>
        <div class="input-group" style="margin-bottom:10px;">
            <label>Width (px):</label>
            <input type="number" id="dialog-width" value="${currentW}">
        </div>
        <div class="input-group">
            <label>Height (px):</label>
            <input type="number" id="dialog-height" value="${currentH}">
        </div>
    `;

    DialogSystem.show('Resize Document', formHtml, () => {
        const newW = document.getElementById('dialog-width').value;
        const newH = document.getElementById('dialog-height').value;
        if(newW && newH) {
            paper.style.width = newW + 'px';
            paper.style.height = newH + 'px';
            pushHistory();
            const sizeDrop = document.getElementById('size-dropdown');
            if (sizeDrop) sizeDrop.style.display = 'none';
        }
    });
}
function setPageSize(format) {
    if(format === 'A4') {
        paper.style.width = '794px'; paper.style.height = '1123px';
    } else if(format === 'Letter') {
        paper.style.width = '816px'; paper.style.height = '1056px';
    }
    pushHistory();
    const sizeDrop = document.getElementById('size-dropdown');
    if(sizeDrop) sizeDrop.style.display = 'none';
}

function toggleGrid() { paper.classList.toggle('theme-grid'); }
function toggleBaselines() { paper.classList.toggle('theme-baselines'); }

function selectAllElements() {
    const all = document.querySelectorAll('.pub-element');
    if(all.length > 0) selectElement(all[0]); 
    DialogSystem.alert('Selection', "All elements selected (Bulk move not yet supported in this version).");
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
        const waText = state.selectedEl.querySelector('.wa-text');
        
        if (waText) {
            // NEW WORDART LOGIC: Change font size, then expand the container box to match!
            waText.style.fontSize = val;
            waText.style.transform = 'none'; 
            
            // Add 8px to account for the 4px padding on each side
            state.selectedEl.style.width = (waText.offsetWidth + 8) + 'px';
            state.selectedEl.style.height = (waText.offsetHeight + 8) + 'px';
            
            syncWordArt(state.selectedEl); 
            
        } else {
            // STANDARD TEXT LOGIC
            if (state.lastRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(state.lastRange);
            }
            
            // Trigger the browser's native resize
            document.execCommand("fontSize", false, "7"); 
            
            // Catch both standard <font> tags and browser-generated <span> tags
            const fontTags = state.selectedEl.querySelectorAll('font[size="7"], span[style*="xxx-large"], span[style*="48px"]');
            fontTags.forEach(f => {
                f.removeAttribute("size");
                f.style.fontSize = val;
            });
            
            // Fallback for collapsed selections
            const sel = window.getSelection();
            if(sel.isCollapsed) {
                 const content = state.selectedEl.querySelector('.element-content > div') || state.selectedEl.querySelector('.element-content');
                 if(content) content.style.fontSize = val;
            }
        }
        
        // Push exact number to both UI elements
        const numVal = parseInt(val);
        const floatSelect = document.getElementById('float-size');
        
        document.getElementById('font-size').value = numVal;
        
        // Ensure the dropdown has the option before setting it
        if (floatSelect) {
            let optionExists = Array.from(floatSelect.options).some(opt => parseInt(opt.value) === numVal);
            if(!optionExists) {
                const newOpt = document.createElement('option');
                newOpt.value = numVal;
                newOpt.innerText = numVal;
                floatSelect.appendChild(newOpt);
            }
            floatSelect.value = numVal;
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
    DialogSystem.alert('Spell Check', "Spell check toggled " + status);
}
function openThesaurus() { window.open('https://www.thesaurus.com/', '_blank'); }

function applyImgFilter(filter) {
    if(state.selectedEl) {
        const img = state.selectedEl.querySelector('img');
        if(img) {
            img.style.filter = filter;
            updateThumbnails();
            pushHistory();
        } else { DialogSystem.alert('Notice', "Please select an image first."); }
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
        DialogSystem.alert('Notice', "Please select an object to rotate.");
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

    const fileName = file.name.toLowerCase();

    // 1. Handle Publisher Files
    if (fileName.endsWith('.pub') || fileName.endsWith('.pubx')) {
        uploadAndConvertPub(file);
        e.target.value = ''; // Reset input
        return;
    }

    // 2. Handle Word Documents
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        uploadAndConvertDoc(file);
        e.target.value = ''; // Reset input
        return;
    }

    // 3. Handle standard JSON OpenPublisher files
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
        } catch(err) { 
            DialogSystem.alert('Error', "Error opening file: " + err); 
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
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

// --- NEW WORDART SYNC FUNCTION ---
function syncWordArt(el) {
    const text = el.querySelector('.wa-text');
    const wrapper = el.querySelector('.wa-wrapper');
    const content = el.querySelector('.element-content');
    if(!text) return;
    
    // Temporarily remove transform to measure its natural footprint
    text.style.transform = 'none';
    text.style.whiteSpace = 'nowrap'; // Keep it on one line
    
    // NEW: Force the containers to allow visual bleed (shadows, strokes) outside the box
    el.style.overflow = 'visible';
    if (content) content.style.overflow = 'visible';
    text.style.overflow = 'visible';
    
    // Ensure wrapper centers the scaled text perfectly within the padded area
    if (wrapper) {
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.justifyContent = 'center';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.overflow = 'visible'; // NEW: No clipping here either
    }
    
    // Keep the 4px padding on all sides (8px total) as a baseline buffer
    const cw = el.clientWidth - 8;
    const ch = el.clientHeight - 8;
    const tw = text.offsetWidth;
    const th = text.offsetHeight;
    
    if(tw > 0 && th > 0 && cw > 0 && ch > 0) {
        // Calculate the exact ratio to fill the inner padded box
        const scaleX = cw / tw;
        const scaleY = ch / th;
        text.style.transform = `scale(${scaleX}, ${scaleY})`;
    }
}
/* =========================================================================
   DYNAMIC RULER ENGINE (MATHEMATICAL REDRAW & CRISP TEXT)
   ========================================================================= */
function initRulers() {
    // Sync Rulers when scrolling or resizing
    const vp = document.getElementById('viewport');
    if(vp) vp.addEventListener('scroll', window.syncRulers);
    window.addEventListener('resize', window.syncRulers);
    
    // Guarantee rulers stay glued during layout shifts
    setInterval(window.syncRulers, 100);
    
    // Force the initial mathematical draw
    window.lastRulerZoom = -1; 
}

window.syncRulers = function() {
    const paperEl = document.getElementById('paper');
    if(!paperEl) return;
    const zoom = state.zoom || 1.0;
    
    // 1. If the zoom changed, perfectly redraw the rulers so text stays 100% crisp!
    if (window.lastRulerZoom !== zoom) {
        window.lastRulerZoom = zoom;
        window.drawCrispRulers(zoom);
    }

    // 2. Shift the rulers to track the paper perfectly
    const hRect = document.getElementById('ruler-h').getBoundingClientRect();
    const vRect = document.getElementById('ruler-v').getBoundingClientRect();
    const pRect = paperEl.getBoundingClientRect();
    
    const offsetX = pRect.left - hRect.left;
    const offsetY = pRect.top - vRect.top;
    
    const hInner = document.getElementById('ruler-h-inner');
    const vInner = document.getElementById('ruler-v-inner');
    
    // Only use translation. NO CSS scaling here, which permanently cures the blurry text bug!
    if (hInner) hInner.style.transform = `translateX(${offsetX}px)`;
    if (vInner) vInner.style.transform = `translateY(${offsetY}px)`;
};

/* =========================================================================
   CANVAS RULER ENGINE (Hardware Accelerated, 100% Crisp, Zero Lag)
   ========================================================================= */
window.initRulers = function() {
    const h = document.getElementById('ruler-h');
    const v = document.getElementById('ruler-v');
    if(!h || !v) return;

    // Inject raw hardware canvases instead of thousands of HTML divs!
    h.innerHTML = '<canvas id="ruler-h-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%;"></canvas>';
    v.innerHTML = '<canvas id="ruler-v-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%;"></canvas>';

    const vp = document.getElementById('viewport');
    if(vp) vp.addEventListener('scroll', window.syncRulers);
    window.addEventListener('resize', window.syncRulers);

    // Force the first draw
    setTimeout(window.syncRulers, 50);
};

window.syncRulers = function() {
    const hCanvas = document.getElementById('ruler-h-canvas');
    const vCanvas = document.getElementById('ruler-v-canvas');
    const paperEl = document.getElementById('paper');
    if(!hCanvas || !vCanvas || !paperEl) return;

    const hRect = hCanvas.parentElement.getBoundingClientRect();
    const vRect = vCanvas.parentElement.getBoundingClientRect();
    const pRect = paperEl.getBoundingClientRect();

    const zoom = state.zoom || 1.0;
    // Mathematical constants: 1 cm = 37.795275 pixels (at standard 96 web DPI)
    const pxPerMm = 37.795275 / 10;
    
    // High-DPI screen support for ultimate crispness (Retina displays)
    const dpr = window.devicePixelRatio || 1; 

    // Match physical canvas pixels to screen pixels
    hCanvas.width = hRect.width * dpr;
    hCanvas.height = hRect.height * dpr;
    vCanvas.width = vRect.width * dpr;
    vCanvas.height = vRect.height * dpr;

    const hCtx = hCanvas.getContext('2d');
    const vCtx = vCanvas.getContext('2d');
    hCtx.scale(dpr, dpr);
    vCtx.scale(dpr, dpr);

    // Clear canvases and paint the darker grey background (Matches the canvas backdrop)
    hCtx.fillStyle = '#eeeeee'; 
    hCtx.fillRect(0, 0, hRect.width, hRect.height);
    vCtx.fillStyle = '#eeeeee'; 

    // Typography & Line Styles
    hCtx.fillStyle = '#555';
    hCtx.font = '10px "Segoe UI", Roboto, sans-serif';
    hCtx.strokeStyle = '#9ca3af';
    hCtx.lineWidth = 1;

    vCtx.fillStyle = '#555';
    vCtx.font = '10px "Segoe UI", Roboto, sans-serif';
    vCtx.strokeStyle = '#9ca3af';
    vCtx.lineWidth = 1;

    // Optical Level of Detail (LOD) - Smart spacing based on zoom
    let labelStepMm = 10;
    let tickStepMm = 1;
    if (zoom >= 0.8) { 
        labelStepMm = 10; // Labels every 1cm
        tickStepMm = 1;   // Ticks every 1mm
    } else if (zoom >= 0.5) { 
        labelStepMm = 20; // Labels every 2cm
        tickStepMm = 5;   // Ticks every 5mm
    } else if (zoom >= 0.3) { 
        labelStepMm = 50; // Labels every 5cm
        tickStepMm = 10;  // Ticks every 10mm (1cm)
    } else { 
        labelStepMm = 100; // Labels every 10cm
        tickStepMm = 50;   // Ticks every 5cm
    }

    // Offsets (Where is the paper on the screen?)
    const offsetX = pRect.left - hRect.left;
    const offsetY = pRect.top - vRect.top;

    // Visible ranges (ONLY draw what is currently on screen for extreme performance!)
    const startMmH = Math.floor(-offsetX / (pxPerMm * zoom));
    const endMmH = Math.ceil((hRect.width - offsetX) / (pxPerMm * zoom));

    hCtx.beginPath();
    for (let mm = startMmH; mm <= endMmH; mm++) {
        // Only draw the required ticks, but ALWAYS guarantee the 1cm major marks
        if (mm % tickStepMm !== 0 && mm % 10 !== 0) continue;
        
        const pos = offsetX + (mm * pxPerMm * zoom);
        const lineX = Math.floor(pos) + 0.5; // +0.5 ensures perfectly crisp 1px lines in Canvas

        let tickH = 5;
        if (mm % 10 === 0) tickH = hRect.height;
        else if (mm % 5 === 0) tickH = hRect.height * 0.5;

        hCtx.moveTo(lineX, hRect.height - tickH);
        hCtx.lineTo(lineX, hRect.height);

        if (mm % labelStepMm === 0) {
            hCtx.fillText(mm / 10, lineX + 3, 10);
        }
    }
    hCtx.stroke();

    // Vertical Ruler
    const startMmV = Math.floor(-offsetY / (pxPerMm * zoom));
    const endMmV = Math.ceil((vRect.height - offsetY) / (pxPerMm * zoom));

    vCtx.beginPath();
    for (let mm = startMmV; mm <= endMmV; mm++) {
        if (mm % tickStepMm !== 0 && mm % 10 !== 0) continue;
        
        const pos = offsetY + (mm * pxPerMm * zoom);
        const lineY = Math.floor(pos) + 0.5;

        let tickW = 5;
        if (mm % 10 === 0) tickW = vRect.width;
        else if (mm % 5 === 0) tickW = vRect.width * 0.5;

        vCtx.moveTo(vRect.width - tickW, lineY);
        vCtx.lineTo(vRect.width, lineY);

        if (mm % labelStepMm === 0) {
            // Drawn upright (un-rotated), exactly like MS Publisher!
            vCtx.fillText(mm / 10, 2, lineY + 10);
        }
    }
    vCtx.stroke();
};

window.setZoom = function(z) {
    state.zoom = z;
    const paperEl = document.getElementById('paper');
    if (paperEl) paperEl.style.transform = `scale(${z})`;
    if (window.syncRulers) window.syncRulers();
};
/* =========================================================================
   WORD DOCUMENT CONVERSION ENDPOINT (.doc / .docx)
   (PRE-FLIGHT MENU + OPTICAL COLOR PICKER + PRINT SPOOLER COMPATIBLE)
   ========================================================================= */
function uploadAndConvertDoc(file) {
    
    // --- 1. THE PRE-FLIGHT MENU ---
    // Pauses the process to ask the user how they want to import
    // --- 1. THE PRE-FLIGHT MENU (NARROW-OPTIMIZED UI) ---
    const promptHtml = `
        <style>
            /* Fluid container that respects the parent's width */
            .op-import-modal { 
                font-family: 'Segoe UI', Roboto, Helvetica, sans-serif; 
                color: #334155; 
                text-align: left; 
                padding: 0; 
                width: 100%; 
                box-sizing: border-box; 
            }
            .op-import-modal p { margin-top: 0; font-size: 13px; margin-bottom: 12px; font-weight: 500; }
            
            /* Fluid Cards */
            .op-import-card {
                display: block; 
                padding: 10px;
                border: 2px solid #e2e8f0; 
                border-radius: 8px; 
                margin-bottom: 10px;
                cursor: pointer; 
                transition: all 0.2s ease; 
                background: #ffffff;
                width: 100%; 
                box-sizing: border-box; /* Crucial: stops borders/padding from adding to the width */
            }
            .op-import-card:hover { border-color: #94a3b8; background: #f8fafc; }
            .op-import-card:has(input:checked) { border-color: #0ea5e9; background: #f0f9ff; }
            
            .op-import-card.safe-mode { border-color: #fde68a; background: #fffbeb; }
            .op-import-card.safe-mode:hover { border-color: #fcd34d; background: #fef3c7; }
            .op-import-card.safe-mode:has(input:checked) { border-color: #f59e0b; background: #fef3c7; }

            /* Header Row */
            .op-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }

            .op-import-card input[type="radio"] {
                width: 16px; height: 16px; margin: 0; cursor: pointer; accent-color: #0ea5e9; flex-shrink: 0;
            }
            .op-import-card.safe-mode input[type="radio"] { accent-color: #d97706; }

            .op-import-icon {
                display: flex; align-items: center; justify-content: center;
                width: 28px; height: 28px; border-radius: 6px; font-size: 13px; flex-shrink: 0;
            }
            .icon-edit { background: #e0f2fe; color: #0284c7; }
            .icon-safe { background: #fef3c7; color: #d97706; }

            .op-import-title { font-weight: 600; font-size: 13px; color: #0f172a; line-height: 1.2; }
            .title-safe { color: #92400e; }

            /* Description that wraps safely */
            .op-import-desc { 
                font-size: 11.5px; 
                color: #64748b; 
                line-height: 1.4; 
                margin-left: 24px; 
                display: block;
                white-space: normal; /* Forces text to wrap instead of pushing out the side */
            }
            .desc-safe { color: #92400e; }

            /* Fluid Buttons */
            .op-import-actions { display: flex; gap: 8px; margin-top: 15px; width: 100%; box-sizing: border-box; }
            .op-btn {
                flex: 1; padding: 8px 0; border-radius: 6px; font-weight: 600; font-size: 12.5px;
                cursor: pointer; transition: all 0.2s; border: none; outline: none; text-align: center;
            }
            .op-btn-cancel { background: #f1f5f9; color: #475569; }
            .op-btn-cancel:hover { background: #e2e8f0; color: #0f172a; }
            .op-btn-start { background: #0ea5e9; color: white; }
            .op-btn-start:hover { background: #0284c7; }
        </style>

        <div class="op-import-modal">
            <p>Select how to process this document:</p>

            <label class="op-import-card">
                <div class="op-card-header">
                    <input type="radio" name="importMode" id="mode-editable" value="editable" checked>
                    <div class="op-import-icon icon-edit"><i class="fas fa-file-signature"></i></div>
                    <span class="op-import-title">Editable Text Mode</span>
                </div>
                <span class="op-import-desc">Extracts text and layout. Best for standard files that you need to edit.</span>
            </label>

            <label class="op-import-card safe-mode">
                <div class="op-card-header">
                    <input type="radio" name="importMode" id="mode-image" value="image">
                    <div class="op-import-icon icon-safe"><i class="fas fa-file-image"></i></div>
                    <span class="op-import-title title-safe">Flattened Image Mode</span>
                </div>
                <span class="op-import-desc desc-safe">Converts the document to a high-res, uneditable image. 100% accurate layout.</span>
            </label>

            <div class="op-import-actions">
                <button id="btn-cancel-import" class="op-btn op-btn-cancel">Cancel</button>
                <button id="btn-start-import" class="op-btn op-btn-start"><i class="fas fa-cloud-upload-alt" style="margin-right:6px;"></i>Start</button>
            </div>
        </div>
    `;

    DialogSystem.show('Import Options', promptHtml, null, true);
    
    // Safely expand the physical dialog window so our new cards fit perfectly!
    setTimeout(() => {
        const dialogContent = document.getElementById('custom-dialog-content');
        if (dialogContent && dialogContent.parentElement) {
            dialogContent.parentElement.style.width = '520px';
            dialogContent.parentElement.style.maxWidth = '95vw';
        }
    }, 10);    
    // Hide the default confirm button so we can use our custom ones
    const defaultConfirm = document.getElementById('custom-dialog-confirm');
    if (defaultConfirm) defaultConfirm.style.display = 'none';

    // Bind Cancel Button
    document.getElementById('btn-cancel-import').onclick = () => {
        DialogSystem.close();
    };

    // Bind Start Button
    document.getElementById('btn-start-import').onclick = () => {
        // Lock in the user's choice BEFORE the server is ever contacted!
        const isImageMode = document.getElementById('mode-image').checked;
        
        // --- 2. THE PROGRESS BAR ---
        // Swap the UI to the progress bar now that the choice is made
        const progressHtml = `
            <div style="text-align:center; padding: 10px;">
                <p id="convert-status" style="margin-bottom:15px; font-weight:bold;">Processing Document...</p>
                <div style="width:100%; background:#eee; border-radius:10px; overflow:hidden; height:10px;">
                    <div id="convert-progress" style="width:0%; height:100%; background:var(--selection); transition: width 0.3s;"></div>
                </div>
            </div>
        `;
        
        // CRASH FIX: Safely redraw the entire dialog using the native system
        DialogSystem.show('Processing Document...', progressHtml, null, true);
        const newConfirm = document.getElementById('custom-dialog-confirm');
        if (newConfirm) newConfirm.style.display = 'none';

        // --- 3. EXECUTE CONVERSION ---
        const formData = new FormData();
        formData.append('docFile', file); 

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://determine-regardless-passage-occurring.trycloudflare.com/api/convert-doc', true); 

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 40; 
                const progressBar = document.getElementById('convert-progress');
                if (progressBar) progressBar.style.width = percentComplete + '%';
                
                if (percentComplete >= 40) {
                    const statusText = document.getElementById('convert-status');
                    if (statusText) statusText.innerText = "Generating the layout...";
                    
                    let fakeProgress = 40;
                    window.convertInterval = setInterval(() => {
                        if(fakeProgress < 75) {
                            fakeProgress += 1;
                            const pb = document.getElementById('convert-progress');
                            if (pb) pb.style.width = fakeProgress + '%';
                        }
                    }, 800);
                }
            }
        };

        xhr.onload = async function() {
            clearInterval(window.convertInterval);
            
            if (xhr.status === 200) {
                const pb = document.getElementById('convert-progress');
                if (pb) pb.style.width = '85%';
                const statusText = document.getElementById('convert-status');
                if (statusText) statusText.innerText = "Processing Mapping...";
                
                try {
                    const data = JSON.parse(xhr.responseText);
                    
                    const binaryString = window.atob(data.pdfData);
                    const binaryLen = binaryString.length;
                    const bytes = new Uint8Array(binaryLen);
                    for (let i = 0; i < binaryLen; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
                    let opPages = [];

                    let hasImages = false;
                    const ops = pdfjsLib.OPS || { paintJpegXObject: 82, paintImageXObject: 85, paintImageMaskXObject: 83 };
                    const imageOps = [ops.paintJpegXObject, ops.paintImageXObject, ops.paintImageMaskXObject];

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const opList = await page.getOperatorList();
                        if (opList.fnArray.some(op => imageOps.includes(op))) {
                            hasImages = true;
                            break; 
                        }
                    }

                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.0 });
                        const ratio = 96 / 72;
                        
                        const pageWidth = Math.round(viewport.width * ratio);
                        const pageHeight = Math.round(viewport.height * ratio);

                        let elements = [];
                        let zIndexCounter = 10;
                        
                        // ==========================================
                        // THE FORK IN THE ROAD (IMAGE vs EDITABLE)
                        // ==========================================
                        if (isImageMode) {
                            // OPTION A: FLATTENED IMAGE MODE
                            const status = document.getElementById('convert-status');
                            if (status) status.innerText = `Rendering High-Res Image (Page ${pageNum})...`;
                            
                            const viewportImg = page.getViewport({ scale: 2.5 }); 
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = viewportImg.width; canvas.height = viewportImg.height;
                            await page.render({ canvasContext: ctx, viewport: viewportImg }).promise;
                            
                            const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);

                            elements.push({
                                left: "0px", top: "0px", width: "100%", height: "100%",
                                transform: "none", zIndex: "1", type: "box", 
                                innerHTML: "", imgSrc: imgDataUrl, clipPath: "", bg: "", cropMode: false,
                                imgStyle: { width: "100%", height: "100%", position: "absolute", pointerEvents: "none" },
                                scaleX: "1", scaleY: "1"
                            });

                        } else {
                            // OPTION B: EDITABLE TEXT MODE (WITH OPTICAL COLOR PICKER)
                            const status = document.getElementById('convert-status');
                            if (status) status.innerText = `Extracting Editable Text (Page ${pageNum})...`;

                            let bgImgData = null; 
                            let canvasWidth = 0;
                            let canvasHeight = 0;

                            // ALWAYS render the hidden canvas so our Optical Scanner has something to look at!
                            const viewportImg = page.getViewport({ scale: 2.0 }); 
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            canvas.width = viewportImg.width; canvas.height = viewportImg.height;
                            await page.render({ canvasContext: ctx, viewport: viewportImg }).promise;
                            
                            bgImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            canvasWidth = canvas.width;
                            canvasHeight = canvas.height;
                            
                            if (hasImages) {
                                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                elements.push({
                                    left: "0px", top: "0px", width: "100%", height: "100%",
                                    transform: "none", zIndex: "1", type: "box", 
                                    innerHTML: "", imgSrc: imgDataUrl, clipPath: "", bg: "", cropMode: false,
                                    imgStyle: { width: "100%", height: "100%", position: "absolute", pointerEvents: "none" },
                                    scaleX: "1", scaleY: "1"
                                });
                            }

                            await page.getOperatorList(); 
                            const textContent = await page.getTextContent();
                            
                            const items = [];
                            textContent.items.forEach(item => {
                                const str = item.str.trim().replace(/[\uE000-\uF8FF]/g, '•');
                                if (!str) return;

                                const tx = item.transform[4] * ratio;
                                const ty = (viewport.height - item.transform[5]) * ratio;
                                const fontSize = Math.abs(item.transform[0] || item.transform[3]) * ratio;
                                
                                let isItalicFont = Math.abs(item.transform[1]) > 0.1 || Math.abs(item.transform[2]) > 0.1;
                                let isBoldFont = false;

                                try {
                                    const rawFont = page.commonObjs.get(item.fontName) || page.objs.get(item.fontName);
                                    const realName = (rawFont?.name || rawFont?.fallbackName || "").toLowerCase();
                                    isBoldFont = realName.includes("bold") || realName.includes("black") || realName.includes("heavy");
                                    if (!isItalicFont) isItalicFont = realName.includes("italic") || realName.includes("oblique");
                                } catch(e) {}
                                
                                if (!isBoldFont || !isItalicFont) {
                                    const fallbackStyle = textContent.styles[item.fontName] || {};
                                    const fallbackName = (fallbackStyle.fontFamily || fallbackStyle.name || "").toLowerCase();
                                    if (!isBoldFont) isBoldFont = fallbackName.includes("bold") || fallbackName.includes("black") || fallbackName.includes("heavy");
                                    if (!isItalicFont) isItalicFont = fallbackName.includes("italic") || fallbackName.includes("oblique");
                                }

                                // --- THE OPTICAL COLOR PICKER ---
                                let optR = 0, optG = 0, optB = 0, samples = 0;
                                // Draw a virtual line through the physical center of the text on the hidden canvas
                                let py = Math.floor((ty - fontSize * 0.3) * (2.0 / ratio)); 
                                
                                if (py >= 0 && py < canvasHeight) {
                                    // Sample the pixels across the width of the text fragment
                                    for (let x = 0; x < (item.width * ratio); x += 2) {
                                        let px = Math.floor((tx + x) * (2.0 / ratio));
                                        if (px >= 0 && px < canvasWidth) {
                                            const idx = (py * canvasWidth + px) * 4;
                                            const r = bgImgData.data[idx];
                                            const g = bgImgData.data[idx+1];
                                            const b = bgImgData.data[idx+2];
                                            
                                            // Ignore the white background of the page! Only sample dark/colored ink pixels.
                                            if (r < 240 || g < 240 || b < 240) {
                                                optR += r; optG += g; optB += b;
                                                samples++;
                                            }
                                        }
                                    }
                                }
                                
                                // Calculate the true average ink color of the physical letters
                                let finalColor = 'black';
                                if (samples > 0) {
                                    finalColor = `rgb(${Math.round(optR/samples)}, ${Math.round(optG/samples)}, ${Math.round(optB/samples)})`;
                                }

                                const isFormLine = /^[_.\-|=☑\[\]]+$/.test(str.replace(/\s/g, ''));
                                items.push({ str, tx, ty, width: item.width * ratio, fontSize, isBold: isBoldFont, isItalic: isItalicFont, isFormLine, color: finalColor });
                            });

                            items.sort((a, b) => b.str.length - a.str.length);

                            const finalItems = [];
                            items.forEach(item => {
                                let isDup = false;
                                finalItems.forEach(existing => {
                                    const diffX = Math.abs(existing.tx - item.tx);
                                    const diffY = Math.abs(existing.ty - item.ty);
                                    
                                    if (diffY < (item.fontSize * 0.3) && diffX < (item.fontSize * 0.5)) {
                                        if (existing.str.includes(item.str) || item.str.includes(existing.str)) {
                                            isDup = true;
                                            if (diffX > 0.1 && diffX < 3.0) existing.isBold = true;
                                            if (item.isItalic) existing.isItalic = true;
                                            if (item.isBold) existing.isBold = true;
                                            
                                            if (item.str.length > existing.str.length) {
                                                existing.str = item.str;
                                                existing.width = item.width;
                                            }
                                        }
                                    }
                                });
                                if (!isDup) finalItems.push(item);
                            });

                            // Plot exactly to screen
                            finalItems.forEach(item => {
                                const safeWidth = (item.width * 1.05) + 10; 
                                const top = item.ty - (item.fontSize * 0.85);

                                let haloCSS = "text-shadow: none;";
                                
                                // Halo generation
                                if (hasImages && !item.isFormLine && bgImgData) {
                                    let px = Math.floor(item.tx * (2.0 / ratio));
                                    let py = Math.floor((item.ty - item.fontSize * 0.8) * (2.0 / ratio));
                                    
                                    if(px < 0) px = 0; if(py < 0) py = 0;
                                    if(px >= canvasWidth) px = canvasWidth - 1;
                                    if(py >= canvasHeight) py = canvasHeight - 1;
                                    
                                    const idx = (py * canvasWidth + px) * 4;
                                    const hColor = `rgb(${bgImgData.data[idx]}, ${bgImgData.data[idx+1]}, ${bgImgData.data[idx+2]})`;
                                    
                                    haloCSS = `text-shadow: 2px 0 2px ${hColor}, -2px 0 2px ${hColor}, 0 2px 2px ${hColor}, 0 -2px 2px ${hColor}, 2px 2px 2px ${hColor}, -2px -2px 2px ${hColor}, 2px -2px 2px ${hColor}, -2px 2px 2px ${hColor};`;
                                }
                                
                                const weightCSS = item.isBold ? "font-weight: bold !important;" : "font-weight: normal;";
                                const styleCSS = item.isItalic ? "font-style: italic !important;" : "font-style: normal;";

                                elements.push({
                                    left: `${item.tx.toFixed(1)}px`, 
                                    top: `${top.toFixed(1)}px`, 
                                    width: `${safeWidth.toFixed(1)}px`, 
                                    height: `${(item.fontSize * 1.2).toFixed(1)}px`, 
                                    transform: "none", zIndex: (zIndexCounter++).toString(), type: "box", 
                                    innerHTML: `<div style="width:100%; height:100%; font-family:sans-serif; color:${item.color}; font-size:${item.fontSize.toFixed(1)}px; line-height:1; white-space:nowrap; overflow:visible; background:transparent; ${haloCSS} padding: 0;"><span style="${weightCSS} ${styleCSS}">${item.str}</span></div>`, 
                                    imgSrc: "", clipPath: "", bg: "", cropMode: false, imgStyle: {}, scaleX: "1", scaleY: "1"
                                });
                            });
                        }

                        opPages.push({
                            id: Date.now() + pageNum,
                            width: `${pageWidth}px`, height: `${pageHeight}px`,
                            background: "#ffffff", elements: elements,
                            header: "", footer: "", borderStyle: "none", thumb: ""
                        });
                    }

                    const pb = document.getElementById('convert-progress');
                    if (pb) pb.style.width = '100%';
                    setTimeout(() => {
                        document.getElementById('doc-title').innerText = data.title;
                        state.pages = opPages;
                        state.currentPageIndex = 0;
                        renderPage(state.pages[0]);
                        
                        if(typeof updateThumbnails === 'function') updateThumbnails();
                        if(typeof pushHistory === 'function') pushHistory(); 
                        
                        DialogSystem.close(); 
                    }, 500);

                } catch(err) {
                    console.error(err);
                    DialogSystem.close();
                    DialogSystem.alert('Error', "Failed to assemble layout from the Word document.");
                }
            } else {
                DialogSystem.close();
                DialogSystem.alert('Error', "Conversion server failed to process the Word file.");
            }
        };

        xhr.onerror = function() {
            clearInterval(window.convertInterval);
            DialogSystem.close();
            DialogSystem.alert('Error', "Could not connect to the conversion server.");
        };

        xhr.send(formData);
    };
}

/* =========================================================================
   MULTI-SELECT MARQUEE ADDON (PASTE AT THE VERY BOTTOM OF SCRIPT.JS)
   ========================================================================= */

// 1. Ensure state can hold multiple items
state.multiSelected = state.multiSelected || [];

// 2. Override Mouse Down
function handleMouseDown(e) {
    if(e.target === paper || e.target.classList.contains('margin-guides') || e.target.id === 'viewport' || e.target.classList.contains('viewport')) {
        deselect();
        state.dragMode = 'marquee';
        state.dragData = { startX: e.clientX, startY: e.clientY };
        
        if(!document.getElementById('marquee-box')) {
            const box = document.createElement('div');
            box.id = 'marquee-box';
            box.style.position = 'fixed';
            box.style.border = '1px solid rgba(0, 118, 112, 0.8)';
            box.style.background = 'rgba(0, 118, 112, 0.2)';
            box.style.zIndex = '9999';
            box.style.pointerEvents = 'none';
            document.body.appendChild(box);
        }
        return;
    }

    if(state.cropMode && state.selectedEl) {
        if(e.target.classList.contains('resize-handle')) {
            state.dragMode = 'resize'; 
            state.dragData = {
                dir: e.target.dataset.dir, startX: e.clientX, startY: e.clientY,
                w: parseFloat(state.selectedEl.style.width), h: parseFloat(state.selectedEl.style.height),
                l: parseFloat(state.selectedEl.style.left), t: parseFloat(state.selectedEl.style.top)
            };
            e.preventDefault(); return;
        }
        if(e.target.tagName === 'IMG' && e.target.closest('.pub-element') === state.selectedEl) {
            state.dragMode = 'pan-image';
            const img = e.target;
            state.dragData = { startX: e.clientX, startY: e.clientY, l: parseFloat(img.style.left) || 0, t: parseFloat(img.style.top) || 0 };
            e.preventDefault(); return;
        }
        if(!e.target.closest('.pub-element.cropping')) toggleCrop();
    }

    if(e.target.classList.contains('rotate-handle') || e.target.classList.contains('resize-handle')) {
        if(e.target.classList.contains('rotate-handle')) {
            state.dragMode = 'rotate';
            const rect = state.selectedEl.getBoundingClientRect();
            state.dragData = { cx: rect.left + rect.width/2, cy: rect.top + rect.height/2 };
        } else {
            state.dragMode = 'resize';
            const curSX = parseFloat(state.selectedEl.getAttribute('data-scaleX')) || 1;
            const curSY = parseFloat(state.selectedEl.getAttribute('data-scaleY')) || 1;
            state.dragData = {
                dir: e.target.dataset.dir, startX: e.clientX, startY: e.clientY,
                w: parseFloat(state.selectedEl.style.width), h: parseFloat(state.selectedEl.style.height),
                l: parseFloat(state.selectedEl.style.left), t: parseFloat(state.selectedEl.style.top),
                scaleX: curSX, scaleY: curSY
            };
        }
        e.preventDefault(); return;
    }

    const el = e.target.closest('.pub-element');
    if(el) {
        const isMulti = state.multiSelected && state.multiSelected.includes(el);
        if (!isMulti) {
            const isSelected = (state.selectedEl === el);
            if(!isSelected) selectElement(el);
            if(state.multiSelected && state.multiSelected.length > 0) {
                state.multiSelected.forEach(m => m.classList.remove('selected'));
                state.multiSelected = [];
            }
        }
        
        const isClipart = el.querySelector('svg');
        const isImage = el.querySelector('img');
        const isShape = el.getAttribute('data-type') === 'shape';
        
        if(isClipart || isImage || isShape) {
             state.dragMode = 'drag';
             state.dragData = { startX: e.clientX, startY: e.clientY, l: parseFloat(el.style.left), t: parseFloat(el.style.top) };
             if(isMulti) state.dragData.multi = state.multiSelected.map(m => ({ el: m, l: parseFloat(m.style.left), t: parseFloat(m.style.top) }));
             e.preventDefault(); return;
        }

        const rect = el.getBoundingClientRect();
        const edgeSize = 15; 
        const nearEdge = (e.clientX < rect.left + edgeSize) || (e.clientX > rect.right - edgeSize) || 
                         (e.clientY < rect.top + edgeSize) || (e.clientY > rect.bottom - edgeSize);
        const activeEl = document.activeElement;
        const isEditingText = activeEl && el.contains(activeEl) && (activeEl.isContentEditable);
        
        if (nearEdge || !isEditingText) {
            state.dragMode = 'drag';
            state.dragData = { startX: e.clientX, startY: e.clientY, l: parseFloat(el.style.left), t: parseFloat(el.style.top) };
            if(isMulti) state.dragData.multi = state.multiSelected.map(m => ({ el: m, l: parseFloat(m.style.left), t: parseFloat(m.style.top) }));
            if(!isEditingText) e.preventDefault(); 
        }
    }
}

// 3. Override Mouse Move (with Page Clamping)
function handleMouseMove(e) {
    const coordDisplay = document.getElementById('coord-display');
    if(coordDisplay) coordDisplay.innerText = `X: ${e.clientX} | Y: ${e.clientY}`;
    
    if(!state.dragMode && !state.cropMode) {
        const el = e.target.closest('.pub-element');
        if(el) {
            const isShape = el.querySelector('img') || el.querySelector('svg') || el.getAttribute('data-type') === 'shape';
            const rect = el.getBoundingClientRect();
            if (isShape) { el.style.cursor = 'move'; } 
            else {
                const edgeSize = 15;
                const nearEdge = (e.clientX < rect.left + edgeSize) || (e.clientX > rect.right - edgeSize) || (e.clientY < rect.top + edgeSize) || (e.clientY > rect.bottom - edgeSize);
                el.style.cursor = nearEdge ? 'move' : 'text';
            }
        }
    }

    if(!state.dragMode) return;
    
    if(state.dragMode === 'marquee') {
        const box = document.getElementById('marquee-box');
        if(box) {
            // CLAMP TO PAPER EDGES
            const paperRect = paper.getBoundingClientRect();
            const clampedX = Math.max(paperRect.left, Math.min(e.clientX, paperRect.right));
            const clampedY = Math.max(paperRect.top, Math.min(e.clientY, paperRect.bottom));
            const startX = Math.max(paperRect.left, Math.min(state.dragData.startX, paperRect.right));
            const startY = Math.max(paperRect.top, Math.min(state.dragData.startY, paperRect.bottom));

            const x = Math.min(clampedX, startX);
            const y = Math.min(clampedY, startY);
            const w = Math.abs(clampedX - startX);
            const h = Math.abs(clampedY - startY);
            
            box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
        }
        return;
    }

    if(!state.selectedEl && (!state.multiSelected || state.multiSelected.length === 0)) return;

    const zoom = state.zoom;
    
    if(state.dragMode === 'drag') {
        const dx = (e.clientX - state.dragData.startX) / zoom;
        const dy = (e.clientY - state.dragData.startY) / zoom;
        if(state.dragData.multi && state.dragData.multi.length > 0) {
            state.dragData.multi.forEach(item => { item.el.style.left = (item.l + dx) + 'px'; item.el.style.top = (item.t + dy) + 'px'; });
        } else {
            state.selectedEl.style.left = (state.dragData.l + dx) + 'px';
            state.selectedEl.style.top = (state.dragData.t + dy) + 'px';
        }
        floatToolbar.style.display = 'none';
    }
    else if(state.dragMode === 'pan-image') {
        const dx = (e.clientX - state.dragData.startX) / zoom; const dy = (e.clientY - state.dragData.startY) / zoom;
        const img = state.selectedEl.querySelector('img');
        img.style.left = (state.dragData.l + dx) + 'px'; img.style.top = (state.dragData.t + dy) + 'px';
    }
    else if(state.dragMode === 'rotate') {
        const angle = Math.atan2(e.clientY - state.dragData.cy, e.clientX - state.dragData.cx) * (180/Math.PI);
        state.selectedEl.style.transform = `rotate(${angle + 90}deg)`;
    }
    else if(state.dragMode === 'resize') {
        const dx = (e.clientX - state.dragData.startX) / zoom; const dy = (e.clientY - state.dragData.startY) / zoom;
        const d = state.dragData;
        let rawW = d.w, rawH = d.h, newL = d.l, newT = d.t;
        const isCrop = state.cropMode;
        let imgDx = 0, imgDy = 0;

        if (d.dir.includes('e')) rawW = d.w + dx;
        else if (d.dir.includes('w')) { rawW = d.w - dx; newL = d.l + dx; if(isCrop) imgDx = -dx; }
        
        if (d.dir.includes('s')) rawH = d.h + dy;
        else if (d.dir.includes('n')) { rawH = d.h - dy; newT = d.t + dy; if(isCrop) imgDy = -dy; }

        if (isCrop) {
            const img = state.selectedEl.querySelector('img');
            if (imgDx !== 0) img.style.left = ((parseFloat(img.style.left) || 0) + imgDx) + 'px';
            if (imgDy !== 0) img.style.top = ((parseFloat(img.style.top) || 0) + imgDy) + 'px';
            if(rawW > 10) { state.selectedEl.style.width = rawW + 'px'; state.selectedEl.style.left = newL + 'px'; }
            if(rawH > 10) { state.selectedEl.style.height = rawH + 'px'; state.selectedEl.style.top = newT + 'px'; }
        } else {
            let finalScaleX = d.scaleX, finalScaleY = d.scaleY;
            if (rawW < 0) { rawW = Math.abs(rawW); if (d.dir.includes('e')) newL = d.l - rawW; finalScaleX = -1 * d.scaleX; } 
            if (rawH < 0) { rawH = Math.abs(rawH); if (d.dir.includes('s')) newT = d.t - rawH; finalScaleY = -1 * d.scaleY; }
            state.selectedEl.style.width = rawW + 'px'; state.selectedEl.style.height = rawH + 'px';
            state.selectedEl.style.left = newL + 'px'; state.selectedEl.style.top = newT + 'px';
            
            const content = state.selectedEl.querySelector('.element-content');
            content.style.transform = `scale(${finalScaleX}, ${finalScaleY})`;
            state.selectedEl.setAttribute('data-scaleX', finalScaleX); state.selectedEl.setAttribute('data-scaleY', finalScaleY);
            
            if(typeof syncWordArt === 'function' && state.selectedEl.querySelector('.wa-text')) syncWordArt(state.selectedEl);
        }
        floatToolbar.style.display = 'none';
    }
}

// 4. Override Mouse Up
function handleMouseUp() {
    if(state.dragMode === 'marquee') {
        const box = document.getElementById('marquee-box');
        if(box) {
            const rect = box.getBoundingClientRect();
            box.remove();
            
            state.multiSelected = [];
            paper.querySelectorAll('.pub-element').forEach(el => {
                const elRect = el.getBoundingClientRect();
                if (!(rect.right < elRect.left || rect.left > elRect.right || rect.bottom < elRect.top || rect.top > elRect.bottom)) {
                    state.multiSelected.push(el); el.classList.add('selected');
                }
            });
            
            if(state.multiSelected.length === 1) { selectElement(state.multiSelected[0]); state.multiSelected = []; } 
            else if(state.multiSelected.length > 1) {
                document.getElementById('status-msg').innerText = state.multiSelected.length + " Elements Selected";
                floatToolbar.style.display = 'none';
            }
        }
    } else if(state.dragMode) {
        setTimeout(() => updateThumbnails(), 50); pushHistory(); 
        if(state.selectedEl && (!state.multiSelected || state.multiSelected.length === 0)) showFloatToolbar();
    }
    state.dragMode = null;
}

// 5. Override Deselect
function deselect() {
    if(state.cropMode && typeof toggleCrop === 'function') toggleCrop(); 
    if(state.multiSelected) { state.multiSelected.forEach(el => el.classList.remove('selected')); state.multiSelected = []; }
    if(state.selectedEl) {
        state.selectedEl.classList.remove('selected');
        const wa = state.selectedEl.querySelector('.wa-text');
        if(wa) { wa.classList.remove('editing'); wa.setAttribute('contenteditable', 'false'); if(typeof syncWordArt === 'function') syncWordArt(state.selectedEl); }
    }
    state.selectedEl = null;
    document.getElementById('status-msg').innerText = "Ready";
    floatToolbar.style.display = 'none';
}

// 6. Override Delete
function deleteSelected() { 
    if(state.multiSelected && state.multiSelected.length > 0) {
        state.multiSelected.forEach(el => el.remove());
        state.multiSelected = [];
        updateThumbnails();
        pushHistory();
        floatToolbar.style.display = 'none';
    } else if(state.selectedEl) { 
        state.selectedEl.remove(); 
        state.selectedEl=null; 
        updateThumbnails();
        pushHistory();
        floatToolbar.style.display = 'none';
    } 
}
/* =========================================================================
   MULTI-PAGE PRINT SPOOLER ENGINE
   ========================================================================= */
function printFullDocument() {
    // 1. Create or find our secret print container
    let printSpooler = document.getElementById('op-print-spooler');
    if (!printSpooler) {
        printSpooler = document.createElement('div');
        printSpooler.id = 'op-print-spooler';
        document.body.appendChild(printSpooler);
    }
    
    // Clear out any old print jobs
    printSpooler.innerHTML = ''; 

    // 2. Loop through every page saved in the state memory
    state.pages.forEach((page) => {
        // Create a blank piece of paper for this page
        let pageWrapper = document.createElement('div');
        pageWrapper.className = 'op-print-page';
        pageWrapper.style.width = page.width;
        pageWrapper.style.height = page.height;
        pageWrapper.style.background = page.background || '#ffffff';
        pageWrapper.style.position = 'relative';

        // 3. Reconstruct every element on this specific page
        page.elements.forEach(el => {
            let elDiv = document.createElement('div');
            elDiv.style.position = 'absolute';
            elDiv.style.left = el.left;
            elDiv.style.top = el.top;
            elDiv.style.width = el.width;
            elDiv.style.height = el.height;
            elDiv.style.zIndex = el.zIndex;
            elDiv.style.transform = el.transform || 'none';
            
            // If it's a background image layer, rebuild the image
            if (el.imgSrc) {
                 let img = document.createElement('img');
                 img.src = el.imgSrc;
                 // Apply the exact styles (like opacity) from the state
                 if (el.imgStyle) {
                     Object.assign(img.style, el.imgStyle);
                 }
                 elDiv.appendChild(img);
            } else {
                 // Otherwise, it's text. Just dump the exact HTML inside!
                 elDiv.innerHTML = el.innerHTML;
            }
            pageWrapper.appendChild(elDiv);
        });
        
        // Add the finished page to our hidden stack
        printSpooler.appendChild(pageWrapper);
    });

    // 4. Trigger the browser's native Print Dialog!
    // Give the DOM 100 milliseconds to render the images before popping the dialog
    setTimeout(() => {
        window.print();
        
        // 5. Clean up the mess so we don't crash the browser's memory
        setTimeout(() => {
            printSpooler.innerHTML = '';
        }, 1000); 
    }, 100);
}
/* =========================================================================
   CONTEXT MENU ADDON (DYNAMIC RIGHT-CLICK SYSTEM)
========================================================================= */

const ContextMenuSystem = {
    init: function() {
        // 1. Inject Windows 11 / Publisher Green Theme CSS for the menu
        if(!document.getElementById('context-menu-css')) {
            const style = document.createElement('style');
            style.id = 'context-menu-css';
            style.innerHTML = `
                .pub-context-menu {
                    position: fixed;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    border: 1px solid #d2d2d2;
                    padding: 5px 0;
                    font-family: 'Segoe UI', sans-serif;
                    font-size: 13px;
                    min-width: 220px;
                    z-index: 10000;
                    display: none;
                    user-select: none;
                }
                .pub-context-item {
                    padding: 8px 15px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #333;
                    transition: background 0.1s;
                }
                .pub-context-item i { width: 16px; text-align: center; color: var(--pub-color); }
                .pub-context-item:hover { background: rgba(0, 118, 112, 0.1); color: var(--pub-color); }
                .pub-context-divider { height: 1px; background: #e1dfdd; margin: 5px 0; }
                .pub-context-item.disabled { color: #aaa; cursor: not-allowed; }
                .pub-context-item.disabled i { color: #aaa; }
                .pub-context-item.disabled:hover { background: transparent; }
            `;
            document.head.appendChild(style);
        }

        // 2. Create the DOM element
        this.menuEl = document.createElement('div');
        this.menuEl.className = 'pub-context-menu';
        document.body.appendChild(this.menuEl);

        // 3. Attach Global Event Listeners
        document.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        document.addEventListener('click', () => this.hide());
        // Hide on scroll or zoom
        window.addEventListener('wheel', () => this.hide()); 
    },

    handleRightClick: function(e) {
        // Only override if clicking on the workspace/paper
        const isPaper = e.target === paper || e.target.classList.contains('margin-guides');
        const el = e.target.closest('.pub-element');
        
        if (!isPaper && !el) return; // Let default browser menu happen on UI ribbons
        
        e.preventDefault();
        this.hide();

        // If right-clicking an element, select it first
        if(el && state.selectedEl !== el) selectElement(el);
        if(isPaper) deselect();

        // Build dynamic menu based on target
        let html = '';

        if (isPaper) {
            // --- 1. DEFAULT MENU (BLANK PAGE) ---
            const canPaste = state.copiedData || state.copiedEl ? '' : 'disabled';
            html += this.buildItem('Paste Options', 'fa-clipboard', `pasteEl()`, canPaste);
            html += this.buildDivider();
            html += this.buildItem('Insert Blank Page', 'fa-file-medical', 'addNewPage()');
            html += this.buildItem('Delete Current Page', 'fa-trash-alt', `deletePage(${state.currentPageIndex}, event)`);
            html += this.buildDivider();
            html += this.buildItem('Page Design / Size', 'fa-ruler-combined', 'changeSize()');
            html += this.buildItem('Format Background', 'fa-fill-drip', 'ContextMenuActions.formatBackground()');
        } 
        else if (el) {
            const isImage = el.querySelector('img');
            const isShape = el.getAttribute('data-type') === 'shape';
            const isWordArt = el.querySelector('.wa-text');
            const isText = !isImage && !isShape && !isWordArt;

            // --- 2. PICTURE CONTEXT MENU ---
            if (isImage) {
                html += this.buildItem('Change Picture...', 'fa-exchange-alt', 'ContextMenuActions.changePicture()');
                html += this.buildItem('Apply to Background (Fill)', 'fa-expand-arrows-alt', 'ContextMenuActions.bgFill()');
                html += this.buildItem('Apply to Background (Tile)', 'fa-th-large', 'ContextMenuActions.bgTile()');
                html += this.buildDivider();
                html += this.buildItem('Crop Image', 'fa-crop', 'toggleCrop()');
                html += this.buildItem('Insert Caption', 'fa-comment-alt', 'ContextMenuActions.insertCaption()');
            }
            // --- 3. TEXT BOX CONTEXT MENU ---
            else if (isText || isWordArt) {
                html += this.buildItem('Text Fit: Best Fit', 'fa-compress-arrows-alt', 'ContextMenuActions.bestFitText()');
                html += this.buildItem('Drop Cap', 'fa-heading', 'ContextMenuActions.dropCap()');
                html += this.buildDivider();
                html += this.buildItem('Format Text Box', 'fa-border-style', 'ContextMenuActions.formatTextBox()');
            }
            // --- 4. SHAPE CONTEXT MENU ---
            else if (isShape) {
                html += this.buildItem('Add/Edit Text', 'fa-font', 'ContextMenuActions.addShapeText()');
                html += this.buildItem('Set as Default Shape', 'fa-check-circle', 'ContextMenuActions.setDefaultShape()');
            }

            // --- 5. UNIVERSAL OBJECT FUNCTIONS ---
            html += this.buildDivider();
            html += this.buildItem('Bring to Front', 'fa-layer-group', 'bringFront()');
            html += this.buildItem('Send to Back', 'fa-layer-group', 'sendBack()');
            html += this.buildDivider();
            html += this.buildItem('Copy', 'fa-copy', 'copyEl()');
            html += this.buildItem('Delete', 'fa-trash', 'deleteSelected()');
            html += this.buildDivider();
            html += this.buildItem('Save as Picture...', 'fa-file-image', 'ContextMenuActions.saveAsPicture()');
            html += this.buildItem('Add to Building Blocks', 'fa-puzzle-piece', 'ContextMenuActions.addBuildingBlock()');
        }

        this.menuEl.innerHTML = html;
        this.menuEl.style.display = 'block';

        // Keep menu on screen (Clamp to viewport)
        const rect = this.menuEl.getBoundingClientRect();
        let x = e.clientX;
        let y = e.clientY;
        if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 5;
        if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 5;

        this.menuEl.style.left = x + 'px';
        this.menuEl.style.top = y + 'px';
    },

    buildItem: function(label, icon, action, disabledClass = '') {
        // If disabled, don't pass the action
        const clickAction = disabledClass ? '' : `onclick="${action}; ContextMenuSystem.hide();"`;
        return `<div class="pub-context-item ${disabledClass}" ${clickAction}><i class="fas ${icon}"></i> ${label}</div>`;
    },
    
    buildDivider: function() {
        return `<div class="pub-context-divider"></div>`;
    },

    hide: function() {
        if(this.menuEl) this.menuEl.style.display = 'none';
    }
};

// --- ACTION LOGIC FOR NEW CONTEXT FEATURES ---
const ContextMenuActions = {
    
    // -- Page Features --
    formatBackground: function() {
        const form = `<div class="input-group"><label>Solid Color:</label><input type="color" id="ctx-bg-color" value="#ffffff"></div>`;
        DialogSystem.show('Format Background', form, () => {
            paper.style.background = document.getElementById('ctx-bg-color').value;
            pushHistory();
        });
    },

    // -- Image Features --
    changePicture: function() {
        if(!state.selectedEl) return;
        const img = state.selectedEl.querySelector('img');
        if(!img) return;

        // Create a temporary hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            if(e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    img.src = evt.target.result;
                    setTimeout(() => { updateThumbnails(); pushHistory(); }, 100);
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        };
        input.click();
    },
    bgFill: function() {
        if(!state.selectedEl) return;
        const img = state.selectedEl.querySelector('img');
        if(img) {
            paper.style.background = `url(${img.src}) center center / cover no-repeat`;
            pushHistory();
        }
    },
    bgTile: function() {
        if(!state.selectedEl) return;
        const img = state.selectedEl.querySelector('img');
        if(img) {
            paper.style.background = `url(${img.src}) repeat`;
            pushHistory();
        }
    },
    insertCaption: function() {
        if(!state.selectedEl) return;
        const el = state.selectedEl;
        // Extend box height slightly and append a text area at the bottom
        const currentH = parseFloat(el.style.height) || 100;
        el.style.height = (currentH + 30) + 'px';
        
        const content = el.querySelector('.element-content');
        const caption = document.createElement('div');
        caption.setAttribute('contenteditable', 'true');
        caption.style.cssText = "position:absolute; bottom:0; width:100%; text-align:center; background:rgba(255,255,255,0.8); font-size:12px; padding:2px; font-family:Arial;";
        caption.innerText = "Type caption here...";
        content.appendChild(caption);
        pushHistory();
    },

    // -- Text Box Features --
    bestFitText: function() {
        if(!state.selectedEl) return;
        const el = state.selectedEl;
        const wa = el.querySelector('.wa-text');
        
        if (wa && typeof syncWordArt === 'function') {
            syncWordArt(el); // Use our custom WordArt engine
            pushHistory();
            return;
        }

        // Standard Text: Mathematically shrink/grow font until scrollHeight matches clientHeight
        const content = el.querySelector('.element-content > div') || el.querySelector('.element-content');
        if(!content) return;
        
        let size = 150; // Start huge
        content.style.fontSize = size + 'px';
        
        // Loop down until it fits without overflowing
        while((content.scrollHeight > el.clientHeight || content.scrollWidth > el.clientWidth) && size > 6) {
            size--;
            content.style.fontSize = size + 'px';
        }
        pushHistory();
    },
    dropCap: function() {
        // Simulates Publisher's Drop Cap by floating the first letter
        if(!state.selectedEl) return;
        const content = state.selectedEl.querySelector('.element-content > div') || state.selectedEl.querySelector('.element-content');
        if(!content || !content.innerText.trim()) return;

        const text = content.innerHTML.trim();
        if(text.startsWith('<span class="drop-cap"')) {
            DialogSystem.alert('Notice', 'Drop cap already applied.');
            return;
        }

        const firstChar = content.innerText.charAt(0);
        // We use string replacement to inject the drop cap HTML
        content.innerHTML = `<span class="drop-cap" style="float:left; font-size:3.5em; line-height:0.8; padding-right:8px; padding-top:4px; font-weight:bold; color:var(--pub-color);">${firstChar}</span>` + content.innerHTML.substring(1);
        pushHistory();
    },
    formatTextBox: function() {
        if(!state.selectedEl) return;
        const form = `
            <div class="input-group" style="margin-bottom:10px;"><label>Fill Color:</label><input type="color" id="ctx-box-bg" value="#ffffff"></div>
            <div class="input-group" style="margin-bottom:10px;"><label>Border Color:</label><input type="color" id="ctx-box-bc" value="#000000"></div>
            <div class="input-group"><label>Border Thickness (px):</label><input type="number" id="ctx-box-bt" value="0" min="0" max="20"></div>
        `;
        DialogSystem.show('Format Text Box', form, () => {
            const bg = document.getElementById('ctx-box-bg').value;
            const bc = document.getElementById('ctx-box-bc').value;
            const bt = document.getElementById('ctx-box-bt').value;
            const content = state.selectedEl.querySelector('.element-content');
            
            content.style.background = bg;
            content.style.border = bt > 0 ? `${bt}px solid ${bc}` : 'none';
            pushHistory();
        });
    },

    // -- Shape Features --
    addShapeText: function() {
        if(!state.selectedEl) return;
        const content = state.selectedEl.querySelector('.element-content');
        // Overlay a transparent flexbox text area perfectly over the shape
        if(!content.querySelector('.shape-text')) {
            content.insertAdjacentHTML('beforeend', `<div class="shape-text" contenteditable="true" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:white; font-family:Arial; font-weight:bold; text-align:center; z-index:2;">Edit Text</div>`);
        }
    },
    setDefaultShape: function() {
        if(!state.selectedEl) return;
        const shape = state.selectedEl.querySelector('.element-content div');
        if(shape) {
            state.defaultShapeStyle = {
                bg: shape.style.background,
                clip: shape.style.clipPath
            };
            DialogSystem.alert('Saved', 'Current color and shape saved as Default AutoShape.');
        }
    },

    // -- Universal Features --
    saveAsPicture: function() {
        if(!state.selectedEl) return;
        DialogSystem.alert('Exporting...', 'Generating high-resolution image of element...');
        
        // Use html2canvas to render just the selected element wrapper (ignoring resize handles)
        const el = state.selectedEl;
        const content = el.querySelector('.element-content');
        
        html2canvas(content, { backgroundColor: null, scale: 3 }).then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = 'publisher-element.png';
            a.click();
            DialogSystem.close(); // Close the exporting alert
        });
    },
    addBuildingBlock: function() {
        if(!state.selectedEl && (!state.multiSelected || state.multiSelected.length === 0)) return;
        // In a full backend system this would save to a database. For this web clone, we store in memory.
        DialogSystem.alert('Building Blocks', 'Layout saved to Building Blocks gallery!<br><br><small>(Note: As a browser app, this clears upon refresh).</small>');
    }
};

// Initialize the menu system on load
setTimeout(() => ContextMenuSystem.init(), 500);
/* =========================================================================
   THE MASTER ADDON: RIBBONS, MARQUEE, GROUPING, CROP-SCALE & WORDART
========================================================================= */

// --- 1. TAB SWITCHING FIX ---
window.switchTab = function(t) {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.ribbon-toolbar').forEach(x => x.classList.remove('active'));
    let targetTab = document.getElementById('tab-' + t); 
    if (!targetTab) {
        document.querySelectorAll('.tab').forEach(tab => {
            const clickAction = tab.getAttribute('onclick');
            if (clickAction && clickAction.includes("'" + t + "'")) targetTab = tab;
        });
    }
    if (targetTab) targetTab.classList.add('active');
    const toolbar = document.getElementById('ribbon-' + t);
    if(toolbar) toolbar.classList.add('active');
};

// --- 2. CONTEXTUAL RIBBONS & ACTIONS ---
window.ContextRibbonActions = {
    alignCenter: function() {
        if(!state.selectedEl) return;
        state.selectedEl.style.left = Math.max(0, (paper.clientWidth / 2) - (state.selectedEl.clientWidth / 2)) + 'px';
        pushHistory();
    },
    toggleGroup: function() {
        if(state.multiSelected && state.multiSelected.length > 1) {
            let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
            state.multiSelected.forEach(el => {
                const l = parseFloat(el.style.left), t = parseFloat(el.style.top), w = el.offsetWidth, h = el.offsetHeight;
                if(l < minL) minL = l; if(t < minT) minT = t; if(l + w > maxR) maxR = l + w + 10; if(t + h > maxB) maxB = t + h + 10;
            });
            const groupEl = createWrapper(`<div class="group-content" style="width:100%; height:100%; position:relative;"></div>`);
            groupEl.setAttribute('data-type', 'group'); groupEl.style.left = minL + 'px'; groupEl.style.top = minT + 'px';
            groupEl.style.width = (maxR - minL) + 'px'; groupEl.style.height = (maxB - minT) + 'px';
            const container = groupEl.querySelector('.group-content');
            state.multiSelected.forEach(el => {
                el.style.left = (parseFloat(el.style.left) - minL) + 'px'; el.style.top = (parseFloat(el.style.top) - minT) + 'px';
                el.classList.remove('selected'); el.querySelectorAll('.resize-handle, .rotate-handle, .rotate-stick').forEach(h => h.style.display = 'none');
                container.appendChild(el);
            });
            state.multiSelected = []; selectElement(groupEl); pushHistory();
        } else if(state.selectedEl && state.selectedEl.getAttribute('data-type') === 'group') {
            const groupEl = state.selectedEl, gL = parseFloat(groupEl.style.left), gT = parseFloat(groupEl.style.top);
            Array.from(groupEl.querySelectorAll('.group-content > .pub-element')).forEach(el => {
                el.style.left = (parseFloat(el.style.left) + gL) + 'px'; el.style.top = (parseFloat(el.style.top) + gT) + 'px';
                el.querySelectorAll('.resize-handle, .rotate-handle, .rotate-stick').forEach(h => h.style.display = 'block');
                paper.appendChild(el);
            });
            window.deselect(); groupEl.remove(); pushHistory();
        }
    },
    linkBoxMock: function() { if(typeof DialogSystem !== 'undefined') DialogSystem.alert('Link Text Box', 'Click on an empty text box to pour overflowing text into it.'); },
    setColumns: function() {
        if(!state.selectedEl) return;
        const content = state.selectedEl.querySelector('.element-content > div') || state.selectedEl.querySelector('.element-content');
        if(content && typeof DialogSystem !== 'undefined') {
            DialogSystem.show('Text Columns', '<div class="input-group"><label>Columns:</label><input type="number" id="ctx-cols" value="2" min="1" max="5"></div>', () => {
                content.style.columnCount = document.getElementById('ctx-cols').value; content.style.columnGap = '20px'; pushHistory();
            });
        }
    },
    openWordArtModal: function() {
        const floatBar = document.getElementById('float-toolbar'); if(floatBar) floatBar.style.display = 'none';
        const waModal = document.getElementById('wordart-modal'); if(waModal) { waModal.style.display = 'flex'; waModal.style.zIndex = '6000'; }
    },
    addDropShadow: function() { if(state.selectedEl && state.selectedEl.querySelector('img')) { state.selectedEl.querySelector('img').style.filter = state.selectedEl.querySelector('img').style.filter.includes('drop-shadow') ? 'none' : 'drop-shadow(5px 5px 10px rgba(0,0,0,0.6))'; pushHistory(); } },
    cropToShape: function() {
        if(state.selectedEl && state.selectedEl.querySelector('img') && typeof DialogSystem !== 'undefined') {
            DialogSystem.show('Crop to Shape', `<select id="ctx-crop-shape" style="width:100%; padding:8px;"><option value="none">Remove Crop</option><option value="circle(50%)">Circle / Oval</option><option value="polygon(50% 0%, 0% 100%, 100% 100%)">Triangle</option><option value="polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)">Star</option></select>`, () => {
                state.selectedEl.querySelector('img').style.clipPath = document.getElementById('ctx-crop-shape').value === 'none' ? 'none' : document.getElementById('ctx-crop-shape').value; pushHistory();
            });
        }
    },
    insertTableRow: function() { if(state.selectedEl && state.selectedEl.querySelector('table')) { const row = state.selectedEl.querySelector('table').insertRow(); for(let i=0; i<state.selectedEl.querySelector('table').rows[0].cells.length; i++) { const cell = row.insertCell(); cell.style.cssText = "border-right:1px solid #000; border-bottom:1px solid #000; height:20px; outline:none;"; cell.setAttribute('contenteditable', 'true'); } pushHistory(); } },
    insertTableCol: function() { if(state.selectedEl && state.selectedEl.querySelector('table')) { for(let i=0; i<state.selectedEl.querySelector('table').rows.length; i++) { const cell = state.selectedEl.querySelector('table').rows[i].insertCell(); cell.style.cssText = "border-right:1px solid #000; border-bottom:1px solid #000; min-width:20px; outline:none;"; cell.setAttribute('contenteditable', 'true'); } pushHistory(); } },
    tableStyle: function() { if(state.selectedEl && state.selectedEl.querySelector('table')) { const t = state.selectedEl.querySelector('table'); for(let i=0; i<t.rows.length; i++) { t.rows[i].style.background = (i % 2 === 0) ? '#f2f2f2' : '#ffffff'; if(i===0) { t.rows[i].style.background = 'var(--pub-color)'; t.rows[i].style.color='white'; t.rows[i].style.fontWeight='bold'; } } pushHistory(); } },
    tableBorders: function() { if(state.selectedEl && state.selectedEl.querySelector('table') && typeof DialogSystem !== 'undefined') { DialogSystem.show('Table Borders', '<div class="input-group"><label>Thickness (px):</label><input type="number" id="ctx-tbl-border" value="1" min="0" max="10"></div>', () => { const thic = document.getElementById('ctx-tbl-border').value; const t = state.selectedEl.querySelector('table'); t.style.borderTop = t.style.borderLeft = `${thic}px solid #000`; for(let r=0; r<t.rows.length; r++) { for(let c=0; c<t.rows[r].cells.length; c++) { t.rows[r].cells[c].style.borderRight = t.rows[r].cells[c].style.borderBottom = `${thic}px solid #000`; } } pushHistory(); }); } }
};

window.ContextRibbonSystem = {
    init: function() {
        if(!document.getElementById('context-ribbon-css')) {
            const style = document.createElement('style'); style.id = 'context-ribbon-css';
            style.innerHTML = `
                .contextual-tab { display: none; font-weight: bold; margin-left: 5px; border-top: 3px solid transparent; color: white !important; opacity: 0.9; }
                .contextual-tab.active { background: #fff !important; border-bottom: 2px solid #fff; color: #333 !important; opacity: 1; }
                .tab-text, .tab-pic, .tab-shape, .tab-table, .tab-wordart { border-top-color: var(--pub-color); }
                .tab-text.active, .tab-pic.active, .tab-shape.active, .tab-table.active, .tab-wordart.active { color: var(--pub-color) !important; }
                .contextual-toolbar { display: none; }
                .contextual-toolbar.active { display: flex; }
            `;
            document.head.appendChild(style);
        }

        const clipGroup = `<div class="group"><div class="tool-btn" onclick="copyEl()"><i class="fas fa-copy" style="color:var(--pub-color)"></i> Copy</div><div class="tool-btn" onclick="pasteEl()"><i class="fas fa-paste" style="color:var(--pub-color)"></i> Paste</div><div class="group-label">Clipboard</div></div>`;
        const arrGroup = `<div class="group"><div class="tool-btn" onclick="bringFront()"><i class="fas fa-arrow-up" style="color:var(--pub-color)"></i> Front</div><div class="tool-btn" onclick="sendBack()"><i class="fas fa-arrow-down" style="color:var(--pub-color)"></i> Back</div><div class="tool-btn" onclick="ContextRibbonActions.alignCenter()"><i class="fas fa-align-center" style="color:var(--pub-color)"></i> Align</div><div class="tool-btn" onclick="ContextRibbonActions.toggleGroup()"><i class="fas fa-object-group" style="color:var(--pub-color)"></i> Group</div><div class="group-label">Arrange</div></div>`;

        const tabsC = document.querySelector('.ribbon-tabs');
        if (tabsC && !document.getElementById('tab-format-text')) {
            tabsC.insertAdjacentHTML('beforeend', `<div class="tab contextual-tab tab-text" onclick="switchTab('format-text')" id="tab-format-text">Text Box Tools</div><div class="tab contextual-tab tab-wordart" onclick="switchTab('format-wordart')" id="tab-format-wordart">WordArt Tools</div><div class="tab contextual-tab tab-pic" onclick="switchTab('format-pic')" id="tab-format-pic">Picture Tools</div><div class="tab contextual-tab tab-shape" onclick="switchTab('format-shape')" id="tab-format-shape">Drawing Tools</div><div class="tab contextual-tab tab-table" onclick="switchTab('table-design')" id="tab-table-design">Table Design</div><div class="tab contextual-tab tab-table" onclick="switchTab('table-layout')" id="tab-table-layout">Table Layout</div>`);
        }

        const ribC = document.querySelector('.ribbon-container');
        if (ribC && !document.getElementById('ribbon-format-text')) {
            ribC.insertAdjacentHTML('beforeend', `
                <div class="ribbon-toolbar contextual-toolbar" id="ribbon-format-text">${clipGroup}<div class="group"><div class="tool-btn" onclick="ContextRibbonActions.linkBoxMock()"><i class="fas fa-link" style="color:var(--pub-color)"></i> Link</div><div class="tool-btn" onclick="if(typeof ContextMenuActions !== 'undefined') ContextMenuActions.bestFitText()"><i class="fas fa-compress-arrows-alt" style="color:var(--pub-color)"></i> Fit</div><div class="group-label">Text Flow</div></div><div class="group"><div class="tool-btn" onclick="if(typeof ContextMenuActions !== 'undefined') ContextMenuActions.dropCap()"><i class="fas fa-heading" style="color:var(--pub-color)"></i> Drop Cap</div><div class="tool-btn" onclick="ContextRibbonActions.setColumns()"><i class="fas fa-columns" style="color:var(--pub-color)"></i> Columns</div><div class="group-label">Typography</div></div>${arrGroup}</div>
                <div class="ribbon-toolbar contextual-toolbar" id="ribbon-format-wordart">${clipGroup}<div class="group"><div class="tool-btn" onclick="if(typeof ContextMenuActions !== 'undefined') ContextMenuActions.bestFitText()"><i class="fas fa-expand-arrows-alt" style="color:var(--pub-color)"></i> Fit to Box</div><div class="tool-btn" onclick="ContextRibbonActions.openWordArtModal()"><i class="fas fa-font" style="color:var(--pub-color)"></i> Change Style</div><div class="group-label">WordArt Options</div></div>${arrGroup}</div>
                <div class="ribbon-toolbar contextual-toolbar" id="ribbon-format-pic">${clipGroup}<div class="group"><div class="tool-btn" onclick="toggleRecolorMenu(this); event.stopPropagation();"><i class="fas fa-tint" style="color:var(--pub-color)"></i> Recolor</div><div class="tool-btn" onclick="if(typeof ContextMenuActions !== 'undefined') ContextMenuActions.changePicture()"><i class="fas fa-exchange-alt" style="color:var(--pub-color)"></i> Swap</div><div class="group-label">Adjust</div></div><div class="group"><div class="tool-btn" onclick="ContextRibbonActions.addDropShadow()"><i class="fas fa-clone" style="color:var(--pub-color)"></i> Shadow</div><div class="tool-btn" onclick="if(typeof toggleCrop === 'function') toggleCrop()"><i class="fas fa-crop" style="color:var(--pub-color)"></i> Crop</div><div class="tool-btn" onclick="ContextRibbonActions.cropToShape()"><i class="fas fa-draw-polygon" style="color:var(--pub-color)"></i> Shape Crop</div><div class="group-label">Picture Styles</div></div>${arrGroup}</div>
                <div class="ribbon-toolbar contextual-toolbar" id="ribbon-format-shape">${clipGroup}<div class="group"><div class="tool-btn" onclick="document.getElementById('shape-dropdown').style.display='block'"><i class="fas fa-shapes" style="color:var(--pub-color)"></i> Shapes</div><div class="tool-btn" onclick="if(typeof ContextMenuActions !== 'undefined') ContextMenuActions.formatTextBox()"><i class="fas fa-fill-drip" style="color:var(--pub-color)"></i> Fill Color</div><div class="group-label">Shape Styles</div></div>${arrGroup}</div>
                <div class="ribbon-toolbar contextual-toolbar" id="ribbon-table-design">${clipGroup}<div class="group"><div class="tool-btn" onclick="ContextRibbonActions.tableStyle()"><i class="fas fa-table" style="color:var(--pub-color)"></i> Styles</div><div class="tool-btn" onclick="ContextRibbonActions.tableBorders()"><i class="fas fa-border-all" style="color:var(--pub-color)"></i> Borders</div><div class="group-label">Table Formats</div></div>${arrGroup}</div>
                <div class="ribbon-toolbar contextual-toolbar" id="ribbon-table-layout">${clipGroup}<div class="group"><div class="tool-btn" onclick="ContextRibbonActions.insertTableRow()"><i class="fas fa-plus" style="color:var(--pub-color)"></i> Row</div><div class="tool-btn" onclick="ContextRibbonActions.insertTableCol()"><i class="fas fa-plus" style="color:var(--pub-color)"></i> Col</div><div class="group-label">Rows & Columns</div></div>${arrGroup}</div>
            `);
        }

        if (!window.originalSelectElementForRibbon) {
            window.originalSelectElementForRibbon = window.selectElement;
            window.originalDeselectForRibbon = window.deselect;
            window.selectElement = function(el) { if (window.originalSelectElementForRibbon) window.originalSelectElementForRibbon(el); window.ContextRibbonSystem.updateTabs(el); };
            window.deselect = function() { if (window.originalDeselectForRibbon) window.originalDeselectForRibbon(); window.ContextRibbonSystem.hideAllTabs(); };
        }
    },
    updateTabs: function(el) {
        this.hideAllTabs(false); if (!el) return;
        const isImage = el.querySelector('img'), isShape = el.getAttribute('data-type') === 'shape', isWordArt = el.querySelector('.wa-text'), isTable = el.querySelector('table'), isText = !isImage && !isShape && !isWordArt && !isTable;
        let tabIdToOpen = null;
        if (isImage) { document.getElementById('tab-format-pic').style.display = 'inline-block'; tabIdToOpen = 'format-pic'; } 
        else if (isTable) { document.getElementById('tab-table-design').style.display = 'inline-block'; document.getElementById('tab-table-layout').style.display = 'inline-block'; tabIdToOpen = 'table-design'; } 
        else if (isShape) { document.getElementById('tab-format-shape').style.display = 'inline-block'; tabIdToOpen = 'format-shape'; } 
        else if (isWordArt) { document.getElementById('tab-format-wordart').style.display = 'inline-block'; tabIdToOpen = 'format-wordart'; } 
        else if (isText) { document.getElementById('tab-format-text').style.display = 'inline-block'; tabIdToOpen = 'format-text'; }
        if (tabIdToOpen) window.switchTab(tabIdToOpen);
    },
    hideAllTabs: function(switchToHome = true) {
        document.querySelectorAll('.contextual-tab').forEach(tab => { tab.style.display = 'none'; });
        if (switchToHome) window.switchTab('home');
    }
};

// --- 3. MOUSE INTERACTION OVERRIDES (MARQUEE & PROPORTIONAL CROP) ---
window.handleMouseDown = function(e) {
    if(e.target === paper || e.target.classList.contains('margin-guides') || e.target.id === 'viewport' || e.target.classList.contains('viewport')) {
        window.deselect(); state.dragMode = 'marquee'; state.dragData = { startX: e.clientX, startY: e.clientY };
        if(!document.getElementById('marquee-box')) {
            const box = document.createElement('div'); box.id = 'marquee-box';
            box.style.cssText = 'position:fixed; border:1px solid rgba(0,118,112,0.8); background:rgba(0,118,112,0.2); z-index:9999; pointer-events:none;';
            document.body.appendChild(box);
        }
        return;
    }
    if(state.cropMode && state.selectedEl) {
        if(e.target.classList.contains('resize-handle')) {
            state.dragMode = 'resize'; state.dragData = { dir: e.target.dataset.dir, startX: e.clientX, startY: e.clientY, w: parseFloat(state.selectedEl.style.width), h: parseFloat(state.selectedEl.style.height), l: parseFloat(state.selectedEl.style.left), t: parseFloat(state.selectedEl.style.top) };
            e.preventDefault(); return;
        }
        if(e.target.tagName === 'IMG' && e.target.closest('.pub-element') === state.selectedEl) {
            state.dragMode = 'pan-image'; state.dragData = { startX: e.clientX, startY: e.clientY, l: parseFloat(e.target.style.left) || 0, t: parseFloat(e.target.style.top) || 0 };
            e.preventDefault(); return;
        }
        if(!e.target.closest('.pub-element.cropping')) if(typeof toggleCrop === 'function') toggleCrop();
    }
    if(e.target.classList.contains('rotate-handle') || e.target.classList.contains('resize-handle')) {
        if(e.target.classList.contains('rotate-handle')) {
            state.dragMode = 'rotate'; const rect = state.selectedEl.getBoundingClientRect(); state.dragData = { cx: rect.left + rect.width/2, cy: rect.top + rect.height/2 };
        } else {
            state.dragMode = 'resize';
            state.dragData = { dir: e.target.dataset.dir, startX: e.clientX, startY: e.clientY, w: parseFloat(state.selectedEl.style.width), h: parseFloat(state.selectedEl.style.height), l: parseFloat(state.selectedEl.style.left), t: parseFloat(state.selectedEl.style.top), scaleX: parseFloat(state.selectedEl.getAttribute('data-scaleX')) || 1, scaleY: parseFloat(state.selectedEl.getAttribute('data-scaleY')) || 1 };
            const img = state.selectedEl.querySelector('img');
            if (img && img.style.position === 'absolute' && img.style.maxWidth === 'none') {
                state.dragData.imgW = parseFloat(img.style.width) || img.offsetWidth; state.dragData.imgH = parseFloat(img.style.height) || img.offsetHeight; state.dragData.imgL = parseFloat(img.style.left) || 0; state.dragData.imgT = parseFloat(img.style.top) || 0;
            }
        }
        e.preventDefault(); return;
    }
    const el = e.target.closest('.pub-element');
    if(el) {
        const isMulti = state.multiSelected && state.multiSelected.includes(el);
        if (!isMulti) { if(state.selectedEl !== el) window.selectElement(el); if(state.multiSelected && state.multiSelected.length > 0) { state.multiSelected.forEach(m => m.classList.remove('selected')); state.multiSelected = []; } }
        if(el.querySelector('svg') || el.querySelector('img') || el.getAttribute('data-type') === 'shape') {
             state.dragMode = 'drag'; state.dragData = { startX: e.clientX, startY: e.clientY, l: parseFloat(el.style.left), t: parseFloat(el.style.top) };
             if(isMulti) state.dragData.multi = state.multiSelected.map(m => ({ el: m, l: parseFloat(m.style.left), t: parseFloat(m.style.top) }));
             e.preventDefault(); return;
        }
        const rect = el.getBoundingClientRect(), edgeSize = 15;
        const nearEdge = (e.clientX < rect.left + edgeSize) || (e.clientX > rect.right - edgeSize) || (e.clientY < rect.top + edgeSize) || (e.clientY > rect.bottom - edgeSize);
        const activeEl = document.activeElement, isEditingText = activeEl && el.contains(activeEl) && (activeEl.isContentEditable);
        if (nearEdge || !isEditingText) {
            state.dragMode = 'drag'; state.dragData = { startX: e.clientX, startY: e.clientY, l: parseFloat(el.style.left), t: parseFloat(el.style.top) };
            if(isMulti) state.dragData.multi = state.multiSelected.map(m => ({ el: m, l: parseFloat(m.style.left), t: parseFloat(m.style.top) }));
            if(!isEditingText) e.preventDefault(); 
        }
    }
};

window.handleMouseMove = function(e) {
    const cd = document.getElementById('coord-display'); if(cd) cd.innerText = `X: ${e.clientX} | Y: ${e.clientY}`;
    if(!state.dragMode && !state.cropMode) {
        const el = e.target.closest('.pub-element');
        if(el) {
            const isShape = el.querySelector('img') || el.querySelector('svg') || el.getAttribute('data-type') === 'shape', rect = el.getBoundingClientRect();
            if (isShape) { el.style.cursor = 'move'; } else { const edgeSize = 15; el.style.cursor = ((e.clientX < rect.left + edgeSize) || (e.clientX > rect.right - edgeSize) || (e.clientY < rect.top + edgeSize) || (e.clientY > rect.bottom - edgeSize)) ? 'move' : 'text'; }
        }
    }
    if(!state.dragMode) return;
    if(state.dragMode === 'marquee') {
        const box = document.getElementById('marquee-box');
        if(box) {
            const paperRect = paper.getBoundingClientRect();
            const clampedX = Math.max(paperRect.left, Math.min(e.clientX, paperRect.right)), clampedY = Math.max(paperRect.top, Math.min(e.clientY, paperRect.bottom));
            const startX = Math.max(paperRect.left, Math.min(state.dragData.startX, paperRect.right)), startY = Math.max(paperRect.top, Math.min(state.dragData.startY, paperRect.bottom));
            box.style.left = Math.min(clampedX, startX) + 'px'; box.style.top = Math.min(clampedY, startY) + 'px';
            box.style.width = Math.abs(clampedX - startX) + 'px'; box.style.height = Math.abs(clampedY - startY) + 'px';
        }
        return;
    }
    if(!state.selectedEl && (!state.multiSelected || state.multiSelected.length === 0)) return;
    const zoom = state.zoom, dx = (e.clientX - state.dragData.startX) / zoom, dy = (e.clientY - state.dragData.startY) / zoom;
    
    if(state.dragMode === 'drag') {
        if(state.dragData.multi && state.dragData.multi.length > 0) { state.dragData.multi.forEach(item => { item.el.style.left = (item.l + dx) + 'px'; item.el.style.top = (item.t + dy) + 'px'; }); } 
        else { state.selectedEl.style.left = (state.dragData.l + dx) + 'px'; state.selectedEl.style.top = (state.dragData.t + dy) + 'px'; }
        if(typeof floatToolbar !== 'undefined') floatToolbar.style.display = 'none';
    }
    else if(state.dragMode === 'pan-image') {
        const img = state.selectedEl.querySelector('img'); img.style.left = (state.dragData.l + dx) + 'px'; img.style.top = (state.dragData.t + dy) + 'px';
    }
    else if(state.dragMode === 'rotate') {
        state.selectedEl.style.transform = `rotate(${(Math.atan2(e.clientY - state.dragData.cy, e.clientX - state.dragData.cx) * (180/Math.PI)) + 90}deg)`;
    }
    else if(state.dragMode === 'resize') {
        const d = state.dragData; let rawW = d.w, rawH = d.h, newL = d.l, newT = d.t;
        let imgDx = 0, imgDy = 0;
        if (d.dir.includes('e')) rawW = d.w + dx; else if (d.dir.includes('w')) { rawW = d.w - dx; newL = d.l + dx; if(state.cropMode) imgDx = -dx; }
        if (d.dir.includes('s')) rawH = d.h + dy; else if (d.dir.includes('n')) { rawH = d.h - dy; newT = d.t + dy; if(state.cropMode) imgDy = -dy; }

        if (state.cropMode) {
            const img = state.selectedEl.querySelector('img');
            if (imgDx !== 0) img.style.left = ((parseFloat(img.style.left) || 0) + imgDx) + 'px';
            if (imgDy !== 0) img.style.top = ((parseFloat(img.style.top) || 0) + imgDy) + 'px';
            if(rawW > 10) { state.selectedEl.style.width = rawW + 'px'; state.selectedEl.style.left = newL + 'px'; }
            if(rawH > 10) { state.selectedEl.style.height = rawH + 'px'; state.selectedEl.style.top = newT + 'px'; }
        } else {
            let finalScaleX = d.scaleX, finalScaleY = d.scaleY;
            if (rawW < 0) { rawW = Math.abs(rawW); if (d.dir.includes('e')) newL = d.l - rawW; finalScaleX = -1 * d.scaleX; } 
            if (rawH < 0) { rawH = Math.abs(rawH); if (d.dir.includes('s')) newT = d.t - rawH; finalScaleY = -1 * d.scaleY; }
            if(rawW > 10) { state.selectedEl.style.width = rawW + 'px'; state.selectedEl.style.left = newL + 'px'; }
            if(rawH > 10) { state.selectedEl.style.height = rawH + 'px'; state.selectedEl.style.top = newT + 'px'; }

            const img = state.selectedEl.querySelector('img');
            if (img && d.imgW !== undefined) {
                const ratioX = rawW / Math.abs(d.w), ratioY = rawH / Math.abs(d.h);
                img.style.width = (d.imgW * ratioX) + 'px'; img.style.height = (d.imgH * ratioY) + 'px';
                img.style.left = (d.imgL * ratioX) + 'px'; img.style.top = (d.imgT * ratioY) + 'px';
            }
            state.selectedEl.querySelector('.element-content').style.transform = `scale(${finalScaleX}, ${finalScaleY})`;
            state.selectedEl.setAttribute('data-scaleX', finalScaleX); state.selectedEl.setAttribute('data-scaleY', finalScaleY);
            if(typeof syncWordArt === 'function' && state.selectedEl.querySelector('.wa-text')) syncWordArt(state.selectedEl);
        }
        if(typeof floatToolbar !== 'undefined') floatToolbar.style.display = 'none';
    }
};

window.handleMouseUp = function() {
    if(state.dragMode === 'marquee') {
        const box = document.getElementById('marquee-box');
        if(box) {
            const rect = box.getBoundingClientRect(); box.remove(); state.multiSelected = [];
            paper.querySelectorAll('.pub-element').forEach(el => {
                const elRect = el.getBoundingClientRect();
                if (!(rect.right < elRect.left || rect.left > elRect.right || rect.bottom < elRect.top || rect.top > elRect.bottom)) { state.multiSelected.push(el); el.classList.add('selected'); }
            });
            if(state.multiSelected.length === 1) { window.selectElement(state.multiSelected[0]); state.multiSelected = []; } 
            else if(state.multiSelected.length > 1) { document.getElementById('status-msg').innerText = state.multiSelected.length + " Elements Selected"; if(typeof floatToolbar !== 'undefined') floatToolbar.style.display = 'none'; }
        }
    } else if(state.dragMode) {
        setTimeout(() => { if(typeof updateThumbnails === 'function') updateThumbnails(); }, 50); if(typeof pushHistory === 'function') pushHistory(); 
        if(state.selectedEl && (!state.multiSelected || state.multiSelected.length === 0) && typeof showFloatToolbar === 'function') showFloatToolbar();
    }
    state.dragMode = null;
};

// --- 4. WORDART SWAP & SPELLCHECK FIX ---
window.initWordArt = function() {
    const grid = document.getElementById('wordart-grid'); if (!grid) return; grid.innerHTML = '';
    for(let i=1; i<=60; i++) {
        const item = document.createElement('div'); item.className = 'gallery-item'; item.style.height = '40px'; 
        item.innerHTML = `<div class="wa-text wa-style-${i}" style="font-size:24px;">Aa</div>`;
        item.onclick = () => {
            if (state.selectedEl && state.selectedEl.querySelector('.wa-text')) {
                const waText = state.selectedEl.querySelector('.wa-text');
                const classes = Array.from(waText.classList);
                classes.forEach(c => { if(c.startsWith('wa-style-')) waText.classList.remove(c); });
                waText.classList.add(`wa-style-${i}`);
                waText.setAttribute('spellcheck', 'false'); 
                document.getElementById('wordart-modal').style.display = 'none';
                if(typeof syncWordArt === 'function') syncWordArt(state.selectedEl);
                if(typeof pushHistory === 'function') pushHistory();
            } else {
                const el = createWrapper(`<div class="wa-wrapper"><div class="wa-text wa-style-${i}" spellcheck="false">Word Art</div></div>`);
                document.getElementById('wordart-modal').style.display = 'none';
                setTimeout(() => { if(typeof syncWordArt === 'function') syncWordArt(el); }, 10);
            }
        };
        grid.appendChild(item);
    }
};
/* =========================================================================
   DRAG AND DROP MEDIA & SAVE FILES ADDON
   ========================================================================= */
(function initDragAndDrop() {
    const dropZone = document.body; 

    // 1. Prevent the browser from opening the file in a new tab
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // 2. Add a subtle visual cue when hovering a file over the window
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            document.body.style.opacity = '0.8'; 
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            document.body.style.opacity = '1'; 
        }, false);
    });

    // 3. Handle the actual file drop
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files.length > 0) {
            handleFiles(files, e.clientX, e.clientY);
        }
    }, false);

    function handleFiles(files, mouseX, mouseY) {
        // Calculate the exact drop coordinates relative to the paper
        const paperEl = document.getElementById('paper');
        const rect = paperEl.getBoundingClientRect();
        const zoom = state.zoom || 1.0;
        
        let dropX = 50;
        let dropY = 50;
        
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
            dropX = (mouseX - rect.left) / zoom;
            dropY = (mouseY - rect.top) / zoom;
        }

        // Process each dropped file
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            const fileName = file.name.toLowerCase();

            // --- A. Handle Open Publisher Save Files (.json) ---
            if (fileName.endsWith('.json') || file.type === 'application/json') {
                reader.onload = (evt) => {
                    try {
                        const data = JSON.parse(evt.target.result);
                        document.getElementById('doc-title').innerText = data.title || 'Publication';
                        state.pages = data.pages;
                        state.currentPageIndex = 0;
                        renderPage(state.pages[0]);
                        setTimeout(() => {
                            updateThumbnails();
                            pushHistory(); 
                        }, 500);
                        if(typeof DialogSystem !== 'undefined') DialogSystem.alert('Success', 'Project loaded successfully!');
                    } catch(err) {
                        if(typeof DialogSystem !== 'undefined') DialogSystem.alert('Error', "Could not read project file: " + err);
                    }
                };
                reader.readAsText(file);
            } 
            
            // --- B. Handle Documents (.pub, .doc, .docx) ---
            else if (fileName.endsWith('.pub') || fileName.endsWith('.pubx')) {
                uploadAndConvertPub(file);
            }
            else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                uploadAndConvertDoc(file);
            }

            // --- C. Handle Images (.jpg, .png, .gif, .svg, .webp) ---
            else if (file.type.startsWith('image/')) {
                reader.onload = (evt) => {
                    const imgHtml = `<img src="${evt.target.result}" style="width:100%; height:100%; object-fit:stretch; position:absolute; top:0; left:0;">`;
                    const newEl = createWrapper(imgHtml);
                    
                    newEl.style.left = dropX + 'px';
                    newEl.style.top = dropY + 'px';
                };
                reader.readAsDataURL(file);
            }
            
            // --- D. Reject Unsupported Files ---
            else {
                if(typeof DialogSystem !== 'undefined') {
                    DialogSystem.alert('Unsupported File', 'You can only drop Images, Open Publisher Save Files (.json), or Documents (.pub, .doc, .docx).');
                }
            }
        });
    }
})();
// --- THE FILE UPLOAD TRAFFIC COP ---
function handleFileUpload(event) {
    // If it came from the input button, it's event.target.files. 
    // If it came from drag-and-drop, it might be event.dataTransfer.files!
    const files = event.target.files || (event.dataTransfer && event.dataTransfer.files);
    
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Clean up the file name just in case it has weird hidden spaces
    const fileName = file.name.toLowerCase().trim();
    
    // Log it to the console so we can see exactly what the browser sees
    console.log("Traffic Cop saw file:", fileName);

    if (fileName.endsWith('.pub')) {
        uploadAndConvertPub(file);
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        uploadAndConvertDoc(file);
    } else {
        // This will now pop up and tell you exactly what file name it rejected!
        DialogSystem.alert("Error", `Unsupported file type. The app saw: "${file.name}"`);
    }
}
/* =========================================================================
   PUB CONVERSION ADDON (image - Text Extraction)
   ========================================================================= */
function uploadAndConvertPub(file) {
    const progressHtml = `
        <div style="text-align:center; padding: 10px;">
            <p id="convert-status" style="margin-bottom:15px; font-weight:bold;">Processing...</p>
            <div style="width:100%; background:#eee; border-radius:10px; overflow:hidden; height:10px;">
                <div id="convert-progress" style="width:0%; height:100%; background:var(--pub-color); transition: width 0.3s;"></div>
            </div>
        </div>
    `;
    
    DialogSystem.show('Importing Publisher File', progressHtml, null, true);
    document.getElementById('custom-dialog-confirm').style.display = 'none'; 

    const formData = new FormData();
    formData.append('pubFile', file);

    const xhr = new XMLHttpRequest();
    // Connect to Cloudflare Tunnel
    xhr.open('POST', 'https://determine-regardless-passage-occurring.trycloudflare.com/api/convert-pub', true); 

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 40; 
            document.getElementById('convert-progress').style.width = percentComplete + '%';
            
            if (percentComplete >= 40) {
                document.getElementById('convert-status').innerText = "Decoding the publication...";
                let fakeProgress = 40;
                window.convertInterval = setInterval(() => {
                    if(fakeProgress < 75) {
                        fakeProgress += 1;
                        document.getElementById('convert-progress').style.width = fakeProgress + '%';
                    }
                }, 800);
            }
        }
    };

    xhr.onload = async function() {
        clearInterval(window.convertInterval);
        
        if (xhr.status === 200) {
            document.getElementById('convert-progress').style.width = '85%';
            document.getElementById('convert-status').innerText = "Extracting Text & Rendering images...";
            
            try {
                const data = JSON.parse(xhr.responseText);
                
                // 1. Decode PDF
                const binaryString = window.atob(data.pdfData);
                const binaryLen = binaryString.length;
                const bytes = new Uint8Array(binaryLen);
                for (let i = 0; i < binaryLen; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
                let opPages = [];
                const OP_PAGE_WIDTH = 794;  // OpenPublisher standard width
                const OP_PAGE_HEIGHT = 1123; // OpenPublisher standard height

                // 2. Loop through every page
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    
                    // --- PART A: Render Background Image ---
                    // Render at high resolution so it's crisp
                    const viewportImage = page.getViewport({ scale: 2.0 }); 
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = viewportImage.width;
                    canvas.height = viewportImage.height;
                    await page.render({ canvasContext: ctx, viewport: viewportImage }).promise;
                    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% quality to save RAM

                    let elements = [];
                    let zIndexCounter = 1;

                    // Push the flattened background layer first (Locked)
                    elements.push({
                        left: "0px", top: "0px", width: "100%", height: "100%",
                        transform: "none", zIndex: (zIndexCounter++).toString(), type: "box", 
                        innerHTML: "", imgSrc: imgDataUrl, clipPath: "", bg: "", cropMode: false,
                        imgStyle: {
                            width: "100%", height: "100%", top: "0px", left: "0px",
                            position: "absolute", filter: "none", maxWidth: "none", maxHeight: "none",
                            pointerEvents: "none" // Prevents the user from accidentally moving the background!
                        },
                        scaleX: "1", scaleY: "1"
                    });

                    // --- PART B: Extract Editable Text ---
                    const textContent = await page.getTextContent();
                    const viewportText = page.getViewport({ scale: 1.0 }); // Use 1.0 scale for accurate math

                    // Calculate the ratio between the PDF size and OpenPublisher's Canvas size
                    const scaleX = OP_PAGE_WIDTH / viewportText.width;
                    const scaleY = OP_PAGE_HEIGHT / viewportText.height;

                    textContent.items.forEach(item => {
                        const str = item.str.trim();
                        if (!str) return; // Ignore empty text blocks

                        // pdf.js uses bottom-left origin. We must convert it to OpenPublisher's top-left origin.
                        // item.transform array: [scaleX, skewY, skewX, scaleY, translateX, translateY]
                        const tx = item.transform[4] * scaleX;
                        let ty = (viewportText.height - item.transform[5]) * scaleY; 

                        // Extract Font Size
                        let fontSize = Math.abs(item.transform[3]) * scaleY;
                        
                        // Adjust Y coordinate up by the font size so it sits correctly on the baseline
                        ty = ty - fontSize; 

                        elements.push({
                            left: `${tx}px`, 
                            top: `${ty}px`, 
                            width: `${(item.width * scaleX) + 20}px`, // Add slight padding
                            height: `${fontSize + 10}px`,
                            transform: "none", 
                            zIndex: (zIndexCounter++).toString(), 
                            type: "box", 
                            innerHTML: `<div style="width:100%; height:100%; padding:2px; font-family:sans-serif; color:black; font-size:${fontSize.toFixed(1)}px; line-height:1;">${str}</div>`, 
                            imgSrc: "", clipPath: "", bg: "", cropMode: false, imgStyle: {}, scaleX: "1", scaleY: "1"
                        });
                    });

                    opPages.push({
                        id: Date.now() + pageNum,
                        thumb: "",
                        width: `${OP_PAGE_WIDTH}px`, height: `${OP_PAGE_HEIGHT}px`,
                        background: "#ffffff",
                        header: "", footer: "", borderStyle: "none",
                        elements: elements
                    });
                }

                // 3. Finalize and push to UI
                document.getElementById('convert-progress').style.width = '100%';
                setTimeout(() => {
                    document.getElementById('doc-title').innerText = data.title;
                    state.pages = opPages;
                    state.currentPageIndex = 0;
                    renderPage(state.pages[0]);
                    
                    if(typeof updateThumbnails === 'function') updateThumbnails();
                    if(typeof pushHistory === 'function') pushHistory(); 
                    
                    DialogSystem.close(); 
                }, 500);

            } catch(err) {
                console.error(err);
                DialogSystem.close();
                DialogSystem.alert('Error', "Failed to extract text from the document.");
            }
        } else {
            DialogSystem.close();
            DialogSystem.alert('Error', "I failed to process the file.");
        }
    };

    xhr.onerror = function() {
        clearInterval(window.convertInterval);
        DialogSystem.close();
        DialogSystem.alert('Error', "Could not connect to a Cloudflare server.");
    };

    xhr.send(formData);
}
/* =========================================================================
   OPENPUBLISHER ADDON: Automate Landscape mode
   ========================================================================= */
if (typeof window.originalRenderPage === 'undefined') {
    window.originalRenderPage = window.renderPage;
}

window.renderPage = function(page) {
    if (page && page.elements && page.elements.length > 0) {
        // Only run this heavy check once per page load
        if (!page._orientationChecked) {
            page._orientationChecked = true; 

            // Find the background photograph that LibreOffice generated
            const bgElement = page.elements.find(el => el.imgSrc && el.imgSrc.startsWith('data:image'));

            if (bgElement) {
                // Secretly load the image in the background to measure its true pixels
                const img = new Image();
                img.onload = function() {
                    
                    // CHECK: Is the photo wider than it is tall?
                    if (img.width > img.height) {
                        page.width = "1123px";
                        page.height = "794px";
                    } else {
                        page.width = "794px";
                        page.height = "1123px";
                    }

                    // Force the OpenPublisher HTML wrapper to change shape
                    const paperElement = document.getElementById('paper');
                    if (paperElement) {
                        paperElement.style.width = page.width;
                        paperElement.style.height = page.height;
                    }

                    // Now that the canvas is the correct shape, finish drawing the text!
                    if (typeof window.originalRenderPage === 'function') {
                        window.originalRenderPage(page);
                    }
                };
                img.src = bgElement.imgSrc;
                
                // Pause the app while the image loads!
                return; 
            }
        }
    }

    // Normal fallback for pages that have already been checked
    const paperElement = document.getElementById('paper');
    if (paperElement && page.width && page.height) {
        paperElement.style.width = page.width;
        paperElement.style.height = page.height;
    }

    if (typeof window.originalRenderPage === 'function') {
        window.originalRenderPage(page);
    }
};
/* =========================================================================
   OPENPUBLISHER ADDON: Unifide Orientation (noflicker)
   ========================================================================= */
// 1. Global registry to remember which pages we've already auto-fixed.
// This ensures we NEVER fight the user if they manually click the Orient button later!
window._orientedPagesRegistry = window._orientedPagesRegistry || new Set();

// --- MAIN CANVAS ENGINE ---
setInterval(() => {
    if (!state.pages || state.pages.length === 0) return;

    const currentPage = state.pages[state.currentPageIndex];
    if (!currentPage || !currentPage.id) return;
    
    // 2. If we haven't checked this specific page yet, check it!
    if (!window._orientedPagesRegistry.has(currentPage.id)) {
        window._orientedPagesRegistry.add(currentPage.id); // Lock it permanently for this session
        
        const bgEl = currentPage.elements.find(e => e.imgSrc && e.imgSrc.startsWith('data:image'));
        
        if (bgEl) {
            const img = new Image();
            img.onload = function() {
                let needsFix = false;
                
                if (img.width > img.height) { 
                    if (currentPage.width !== "1123px") {
                        currentPage.width = "1123px";
                        currentPage.height = "794px";
                        needsFix = true;
                    }
                } else { 
                    if (currentPage.width !== "794px") {
                        currentPage.width = "794px";
                        currentPage.height = "1123px";
                        needsFix = true;
                    }
                }

                if (needsFix) {
                    const paperEl = document.getElementById('paper');
                    if (paperEl) {
                        paperEl.style.width = currentPage.width;
                        paperEl.style.height = currentPage.height;
                    }
                    if (typeof window.renderPage === 'function') window.renderPage(currentPage);
                    if (typeof window.updateThumbnails === 'function') window.updateThumbnails(); 
                }
            };
            img.src = bgEl.imgSrc;
        }
    }
    // NOTE: The aggressive 50ms "Safety Catch" that was fighting your button has been removed!
}, 100);

// --- THUMBNAIL ENGINE (MutationObserver) ---
// Added a safety check to ensure it only boots up once, preventing double-bouncing!
if (!window._thumbObserverRunning) {
    const thumbObserver = new MutationObserver(() => {
        if (!state.pages || state.pages.length === 0) return;
        
        const thumbs = document.querySelectorAll('.page-thumb, .thumbnail, .thumb, .sidebar-thumb, .thumb-item');
        
        thumbs.forEach((thumbNode, index) => {
            const pageData = state.pages[index];
            if (!pageData) return;

            const pW = parseFloat(pageData.width) || 794;
            const pH = parseFloat(pageData.height) || 1123;
            const expectedRatio = `${pW} / ${pH}`;

            if (thumbNode.style.aspectRatio !== expectedRatio) {
                thumbNode.style.aspectRatio = expectedRatio;
                thumbNode.style.height = "auto";
            }

            const innerElements = thumbNode.querySelectorAll('canvas, img');
            innerElements.forEach(el => {
                if (el.style.objectFit !== "contain") {
                    el.style.width = "100%";
                    el.style.height = "100%";
                    el.style.objectFit = "contain";
                }
            });
        });
    });

    thumbObserver.observe(document.body, { childList: true, subtree: true });
    window._thumbObserverRunning = true; // Lock the observer
}/* =========================================================================
   OPENPUBLISHER ADDON: THE UNIFIED ORIENTATION ENGINE (MANUAL-OVERRIDE SAFE)
   ========================================================================= */

// 1. Global registry to remember which pages we've already auto-fixed.
// This ensures we NEVER fight the user if they manually click the Orient button later!
window._orientedPagesRegistry = window._orientedPagesRegistry || new Set();

// --- MAIN CANVAS ENGINE ---
setInterval(() => {
    if (!state.pages || state.pages.length === 0) return;

    const currentPage = state.pages[state.currentPageIndex];
    if (!currentPage || !currentPage.id) return;
    
    // 2. If we haven't checked this specific page yet, check it!
    if (!window._orientedPagesRegistry.has(currentPage.id)) {
        window._orientedPagesRegistry.add(currentPage.id); // Lock it permanently for this session
        
        const bgEl = currentPage.elements.find(e => e.imgSrc && e.imgSrc.startsWith('data:image'));
        
        if (bgEl) {
            const img = new Image();
            img.onload = function() {
                let needsFix = false;
                
                if (img.width > img.height) { 
                    if (currentPage.width !== "1123px") {
                        currentPage.width = "1123px";
                        currentPage.height = "794px";
                        needsFix = true;
                    }
                } else { 
                    if (currentPage.width !== "794px") {
                        currentPage.width = "794px";
                        currentPage.height = "1123px";
                        needsFix = true;
                    }
                }

                if (needsFix) {
                    const paperEl = document.getElementById('paper');
                    if (paperEl) {
                        paperEl.style.width = currentPage.width;
                        paperEl.style.height = currentPage.height;
                    }
                    if (typeof window.renderPage === 'function') window.renderPage(currentPage);
                    if (typeof window.updateThumbnails === 'function') window.updateThumbnails(); 
                }
            };
            img.src = bgEl.imgSrc;
        }
    }
    // NOTE: The aggressive 50ms "Safety Catch" that was fighting your button has been removed!
}, 100);

// --- THUMBNAIL ENGINE (MutationObserver) ---
// Added a safety check to ensure it only boots up once, preventing double-bouncing!
if (!window._thumbObserverRunning) {
    const thumbObserver = new MutationObserver(() => {
        if (!state.pages || state.pages.length === 0) return;
        
        const thumbs = document.querySelectorAll('.page-thumb, .thumbnail, .thumb, .sidebar-thumb, .thumb-item');
        
        thumbs.forEach((thumbNode, index) => {
            const pageData = state.pages[index];
            if (!pageData) return;

            const pW = parseFloat(pageData.width) || 794;
            const pH = parseFloat(pageData.height) || 1123;
            const expectedRatio = `${pW} / ${pH}`;

            if (thumbNode.style.aspectRatio !== expectedRatio) {
                thumbNode.style.aspectRatio = expectedRatio;
                thumbNode.style.height = "auto";
            }

            const innerElements = thumbNode.querySelectorAll('canvas, img');
            innerElements.forEach(el => {
                if (el.style.objectFit !== "contain") {
                    el.style.width = "100%";
                    el.style.height = "100%";
                    el.style.objectFit = "contain";
                }
            });
        });
    });

    thumbObserver.observe(document.body, { childList: true, subtree: true });
    window._thumbObserverRunning = true; // Lock the observer
}
/* =========================================================================
   INP FIX (Overrides for heavy functions)
   ========================================================================= */

// 1. Hijack the heavy canvas renderer
const originalUpdateThumbnails = updateThumbnails;
let thumbTimer;
updateThumbnails = function() {
    clearTimeout(thumbTimer);
    // Wait 500ms after the user stops interacting before freezing the main thread
    thumbTimer = setTimeout(() => {
        originalUpdateThumbnails();
    }, 500); 
};

// 2. Hijack the heavy history serializer
const originalPushHistory = pushHistory;
pushHistory = function() {
    // A 10ms timeout takes this off the main interaction thread. 
    // The browser instantly paints the UI change, THEN does the heavy math.
    setTimeout(() => {
        originalPushHistory();
    }, 10);
};

// 3. Hijack the synchronous layout thrashing from typing
const originalForceRepaint = forceRepaint;
forceRepaint = function() {
    // Same trick. Let the UI update the text, then fix the focus a split-second later.
    setTimeout(() => {
        originalForceRepaint();
    }, 10);
};
// Initialize Everything Once the DOM is Ready
setTimeout(() => {
    document.querySelectorAll('.wa-text').forEach(el => el.setAttribute('spellcheck', 'false'));
    if(window.initWordArt) window.initWordArt();
    if(window.ContextRibbonSystem) window.ContextRibbonSystem.init();
}, 500);