// detectiveBoard.js — Detective cork board for tab3
import { applySketchSetup, updateSketchScale, updateDrawCursor, eraseFromPaths, wireSketchKeyboard, wireAltClone } from './fabricSketch.js';

/* ==================================================================*/
/* ======================== CONSTANTS ================================*/
/* ==================================================================*/

const BOARD_KEY  = 'boardState_tab3';
const BLOCKS_KEY = 'userBlocks_tab3';
const VIEW_KEY   = 'boardView_tab3';
const CARD_W     = 240;

// Colour palette offered by the string picker (swatch order = display order)
const STRING_COLORS = [
    '#c0392b', // red (default)
    '#e67e22', // amber
    '#f1c40f', // yellow
    '#27ae60', // green
    '#2980b9', // blue
    '#8e44ad', // purple
    '#ecf0f1', // white
];

// Convert a 6-digit hex colour to rgba(…) with the given alpha
function hexGlow(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

/* ==================================================================*/
/* ======================== PERSISTENCE =============================*/
/* ==================================================================*/

function getBoardState() {
    try { return JSON.parse(localStorage.getItem(BOARD_KEY)) || { cards: {}, connections: [], _canvas: true }; }
    catch { return { cards: {}, connections: [], _canvas: true }; }
}
function saveBoardState(state) {
    state._canvas = true;
    localStorage.setItem(BOARD_KEY, JSON.stringify(state));
}

function getViewState() {
    try { return JSON.parse(localStorage.getItem(VIEW_KEY)) || {}; }
    catch { return {}; }
}
function saveViewState(panX, panY, zoom) {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ panX, panY, zoom }));
}

// Keep for the one-time % migration only
function pctToPx(pct, dim) { return (pct / 100) * dim; }

function getAllBlocks() {
    try { return JSON.parse(localStorage.getItem(BLOCKS_KEY)) || []; }
    catch { return []; }
}

/* ==================================================================*/
/* ======================== HELPERS ==================================*/
/* ==================================================================*/

// Migrate old-format block to new sections[] format
function migrateBlock(block) {
    if (Array.isArray(block.sections)) return block;
    const sections = [];
    const oldType = Array.isArray(block.blockType) ? block.blockType[0] : (block.blockType || 'Notes');

    if (oldType === 'Sketch') {
        sections.push({ id: crypto.randomUUID(), type: 'sketch', sketchData: block.sketchData || null });
    } else if (oldType === 'Quest') {
        if (Array.isArray(block.objectives) && block.objectives.length > 0) {
            sections.push({
                id: crypto.randomUUID(),
                type: 'objectives',
                groups: [{
                    id: crypto.randomUUID(),
                    title: '',
                    items: block.objectives.map(o => ({ id: crypto.randomUUID(), text: o.text || '', done: !!o.done }))
                }]
            });
        }
        if (block.text) {
            sections.push({ id: crypto.randomUUID(), type: 'notes', content: block.text });
        }
    } else {
        let content = '';
        if (block.description) content += block.description;
        if (block.text) content += (content ? '<br>' : '') + block.text;
        if (block.url) content += (content ? '<br>' : '') + `<a href="${block.url}" target="_blank">${block.url}</a>`;
        if (content) sections.push({ id: crypto.randomUUID(), type: 'notes', content });
    }

    return { ...block, blockType: ['block'], sections };
}

// Expand legacy `objectives` container-sections into individual `objective` sections.
// Called once per block render; saves back only when a migration is needed.
function migrateObjectiveSections(block) {
    if (!Array.isArray(block.sections)) return block;
    const hasOld = block.sections.some(s => s.type === 'objectives');
    if (!hasOld) return block;
    const expanded = block.sections.flatMap(s => {
        if (s.type !== 'objectives') return [s];
        const items = s.items || (s.groups || []).flatMap(g => g.items || []);
        return items.map(item => ({
            id:   item.id || crypto.randomUUID(),
            type: 'objective',
            text: item.text || '',
            done: !!item.done,
        }));
    });
    block.sections = expanded;
    updateBlock(block.id, b => { b.sections = expanded; });
    return block;
}

// Directly update a block in localStorage without triggering a full render
function updateBlock(id, fn) {
    const blocks = getAllBlocks();
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    fn(blocks[idx]);
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
}

// Center of the current view in canvas-space px — where new cards appear
function centerPos(boardEl, panX, panY, zoom) {
    const bW = (boardEl && boardEl.offsetWidth)  || 800;
    const bH = (boardEl && boardEl.offsetHeight) || 600;
    // Convert the viewport centre to canvas-space
    const cx = (bW / 2 - panX) / zoom;
    const cy = (bH / 2 - panY) / zoom;
    return {
        x: cx - CARD_W / 2 + (Math.random() - 0.5) * 120,
        y: cy - 100        + (Math.random() - 0.5) * 80,
        w: CARD_W,
    };
}

// Canvas-space node position — works directly from card CSS px, which are
// already in canvas coordinates regardless of the current zoom level.
function nodePos(cardEl, side) {
    const l = parseFloat(cardEl.style.left) || 0;
    const t = parseFloat(cardEl.style.top)  || 0;
    const w = cardEl.offsetWidth;
    const h = cardEl.offsetHeight;
    if (side === 'top')    return { x: l + w / 2, y: t };
    if (side === 'right')  return { x: l + w,     y: t + h / 2 };
    if (side === 'bottom') return { x: l + w / 2, y: t + h };
    return { x: l, y: t + h / 2 }; // left
}

function sideVec(side) {
    if (side === 'top')    return [0, -1];
    if (side === 'right')  return [1,  0];
    if (side === 'bottom') return [0,  1];
    return [-1, 0];
}

function bestSides(aEl, bEl) {
    const sides = ['top', 'right', 'bottom', 'left'];
    let best = null, bd = Infinity;
    sides.forEach(sa => sides.forEach(sb => {
        const pa = nodePos(aEl, sa), pb = nodePos(bEl, sb);
        const d = (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2;
        if (d < bd) { bd = d; best = { sa, sb }; }
    }));
    return best;
}

function cubicPath(x1, y1, s1, x2, y2, s2) {
    const [vx1, vy1] = sideVec(s1), [vx2, vy2] = sideVec(s2);
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const len  = Math.min(dist * 0.42, 100);
    return `M${x1},${y1} C${x1 + vx1 * len},${y1 + vy1 * len} ${x2 + vx2 * len},${y2 + vy2 * len} ${x2},${y2}`;
}

// Derive a bezier tangent direction from a fractional position within a card.
// Used only when there's no live vector available (e.g. during dot-drag preview).
function sideFromFrac(fx, fy) {
    const dl = fx, dr = 1 - fx, dt = fy, db = 1 - fy;
    const m  = Math.min(dl, dr, dt, db);
    if (m === dl) return 'left';
    if (m === dr) return 'right';
    if (m === dt) return 'top';
    return 'bottom';
}

// Derive a bezier tangent direction from the vector between two canvas points.
// Used for rendered connections so the curve adapts as cards move.
function sideFromVector(fromPt, toPt) {
    const dx = toPt.x - fromPt.x;
    const dy = toPt.y - fromPt.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
}

// Given a canvas-space point on a card, return a fraction object that anchors
// to whichever .board-section the point falls within.  If the point is on the
// header (above all sections) we fall back to a card-relative fraction.
// The sectionId field lets resolveEndpoint recompute the position even after
// sections above are added, removed, resized, or reordered.
function cardFracFromCanvasPoint(cardEl, canvasX, canvasY) {
    const l = parseFloat(cardEl.style.left) || 0;
    const t = parseFloat(cardEl.style.top)  || 0;
    const w = cardEl.offsetWidth;
    const fx = Math.max(0, Math.min(1, (canvasX - l) / w));

    for (const secEl of cardEl.querySelectorAll('.board-section')) {
        const secTop = secEl.offsetTop;
        const secH   = secEl.offsetHeight;
        if (canvasY >= t + secTop && canvasY < t + secTop + secH) {
            return {
                sectionId: secEl.dataset.sectionId,
                fx,
                fy: Math.max(0, Math.min(1, (canvasY - t - secTop) / (secH || 1))),
            };
        }
    }
    // Header area or outside sections — card-relative fallback
    return {
        fx,
        fy: Math.max(0, Math.min(1, (canvasY - t) / (cardEl.offsetHeight || 80))),
    };
}

// Snap a point to the nearest edge midpoint of a collapsed card, given the
// position of the other endpoint so we know which face is "towards" it.
function snapCollapsedEdge(cardEl, otherPt) {
    const l  = parseFloat(cardEl.style.left) || 0;
    const t  = parseFloat(cardEl.style.top)  || 0;
    const w  = cardEl.offsetWidth;
    const h  = cardEl.offsetHeight;
    const cx = l + w / 2;
    const cy = t + h / 2;
    const dx = otherPt.x - cx;
    const dy = otherPt.y - cy;
    // Pick the face whose normalised distance is greatest
    if (Math.abs(dx) / w >= Math.abs(dy) / h) {
        return dx >= 0 ? { x: l + w, y: cy } : { x: l, y: cy };
    } else {
        return dy >= 0 ? { x: cx, y: t + h } : { x: cx, y: t };
    }
}

// Resolve a connection endpoint to a canvas {x,y} point.
// Connections drawn by the connect tool store fractional positions (paf/pbf).
// If paf/pbf carry a sectionId the position is computed relative to that section's
// current offsetTop, so it tracks the section through reorders/resizes.
// Legacy connections store a side name (sa/sb) and use nodePos.
function resolveEndpoint(cardEl, frac, side) {
    const l = parseFloat(cardEl.style.left) || 0;
    const t = parseFloat(cardEl.style.top)  || 0;
    const w = cardEl.offsetWidth;
    if (frac) {
        const x = l + frac.fx * w;
        if (frac.sectionId) {
            const secEl = cardEl.querySelector(`.board-section[data-section-id="${frac.sectionId}"]`);
            if (secEl) {
                return { x, y: t + secEl.offsetTop + frac.fy * (secEl.offsetHeight || 1) };
            }
        }
        // No sectionId (old data or header click) — card-relative fraction
        return { x, y: t + frac.fy * (cardEl.offsetHeight || 80) };
    }
    return nodePos(cardEl, side);
}

function sampleBezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, n = 24) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n, t2 = t * t, t3 = t2 * t, mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
        pts.push({
            x: mt3 * x1 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x2,
            y: mt3 * y1 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y2,
        });
    }
    return pts;
}

function segmentsIntersect(p1, p2, p3, p4) {
    const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-10) return false;
    const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function cutCrossesPath(cutPts, pathD) {
    const m = pathD.match(/M([-\d.]+),([-\d.]+)\s+C([-\d.]+),([-\d.]+)\s+([-\d.]+),([-\d.]+)\s+([-\d.]+),([-\d.]+)/);
    if (!m) return false;
    const [, x1, y1, cx1, cy1, cx2, cy2, x2, y2] = m.map(Number);
    const bezPts = sampleBezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, 24);
    for (let i = 0; i < bezPts.length - 1; i++)
        for (let j = 0; j < cutPts.length - 1; j++)
            if (segmentsIntersect(bezPts[i], bezPts[i + 1], cutPts[j], cutPts[j + 1])) return true;
    return false;
}

// Returns true if the pointer event is within `threshold` px of any card edge
function isNearEdge(e, cardEl, threshold = 11) {
    const r = cardEl.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    return x <= threshold || x >= r.width - threshold ||
           y <= threshold || y >= r.height - threshold;
}

// Returns true if the pointer is within `threshold` px of the top edge only
function isTopEdge(e, cardEl, threshold = 11) {
    const r = cardEl.getBoundingClientRect();
    return (e.clientY - r.top) <= threshold;
}

// Returns which side of a card ('top','right','bottom','left') a client point is nearest to
function nearestSide(clientX, clientY, cardEl) {
    const r = cardEl.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    const dists = { top: y, bottom: r.height - y, left: x, right: r.width - x };
    return Object.keys(dists).reduce((a, b) => dists[a] < dists[b] ? a : b);
}

/* ==================================================================*/
/* ======================== HTML BUILDERS ===========================*/
/* ==================================================================*/

function buildCardHTML(block) {
    const title = block.title || 'Untitled';
    const titleEsc  = title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const titleDisp = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
        <div class="board-card-header">
            <div class="board-card-title-wrap">
                <span class="board-card-title">${titleDisp}</span>
                <input class="board-card-title-input" value="${titleEsc}" placeholder="Untitled" />
            </div>
            <div class="board-card-actions">
                <button class="board-card-btn board-card-collapse-btn" title="Toggle collapse">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>

                <button class="board-card-btn board-card-delete-btn" data-id="${block.id}" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>

        <div class="board-card-body">
            ${buildSectionsHTML(block.sections || [])}
            <button class="board-card-add-section-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="11" height="11"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add section
            </button>
        </div>

    `;
}

function buildSectionsHTML(sections) {
    if (!sections || sections.length === 0) return '';
    return sections.map(buildSectionHTML).join('');
}

function buildSectionHTML(section) {
    return `
        <div class="board-section" data-section-id="${section.id}" data-section-type="${section.type}">
            <button class="board-section-drag-btn" title="Drag to reorder" aria-label="Drag to reorder section">
                <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                    <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
            </button>
            ${buildSectionBodyHTML(section)}
        </div>
    `;
}

function buildSectionBodyHTML(section) {
    if (section.type === 'objective') {
        const textDisp = (section.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const textEsc  = (section.text || '').replace(/"/g, '&quot;');
        return `
            <div class="board-section-objective${section.done ? ' done' : ''}">
                <span class="board-obj-checkbox">
                    <svg class="board-obj-tick" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7 8 1.5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span class="board-obj-item-text">${textDisp || ''}</span>
                <input class="board-obj-item-input" value="${textEsc}" placeholder="Objective…" />
            </div>
        `;
    }
    if (section.type === 'notes') {
        const content = section.content || '';
        return `<div class="board-section-notes" contenteditable="false" data-section-id="${section.id}">${content}</div>`;
    }
    if (section.type === 'objectives') {
        // Migrate old group-based data on the fly
        const items = section.items || (section.groups || []).flatMap(g => g.items || []);
        return `
            <div class="board-section-objectives" data-section-id="${section.id}">
                <div class="board-obj-items">
                    ${items.map(buildObjectiveItemHTML).join('')}
                </div>
                <button class="board-add-obj-item-btn">+ Add objective</button>
            </div>
        `;
    }
    if (section.type === 'sketch') {
        return `
            <div class="board-section-sketch" data-section-id="${section.id}">
                <div class="board-sketch-toolbar">
                    <button class="board-sketch-tool-btn" data-tool="select" title="Select / Move">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51z"/><path d="M13 13l6 6"/></svg>
                    </button>
                    <div class="board-sketch-sep"></div>
                    <button class="board-sketch-tool-btn active" data-tool="fine-pen" title="Fine pen">
                        <div class="board-sketch-dot" style="width:2px;height:2px"></div>
                    </button>
                    <button class="board-sketch-tool-btn" data-tool="pen" title="Pen">
                        <div class="board-sketch-dot" style="width:5px;height:5px"></div>
                    </button>
                    <button class="board-sketch-tool-btn" data-tool="eraser" title="Eraser">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><g transform="translate(12,10) rotate(-15)"><rect x="-4" y="-9" width="8" height="18" rx="1"/><line x1="-4" y1="3" x2="4" y2="3"/></g><line x1="3" y1="21" x2="9" y2="21" opacity="0.35" stroke-dasharray="2 2"/><line x1="15" y1="21" x2="21" y2="21"/></svg>
                    </button>
                    <button class="board-sketch-tool-btn" data-tool="undo" title="Undo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><path d="M3 10h10a5 5 0 0 1 0 10H9"/><path d="M3 10l4-4M3 10l4 4"/></svg>
                    </button>
                    <button class="board-sketch-tool-btn" data-tool="clear" title="Clear all">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><path d="M3 6h18M8 6V4h8v2M5 6v14a1 1 0 001 1h12a1 1 0 001-1V6"/></svg>
                    </button>
                    <div class="board-sketch-sep"></div>
                    ${['#ffffff','#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff'].map(c =>
                        `<div class="board-sketch-color-dot${c === '#ffffff' ? ' active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></div>`
                    ).join('')}
                </div>
                <div class="board-sketch-canvas-wrap" data-section-id="${section.id}">
                    <canvas></canvas>
                </div>
            </div>
        `;
    }
    return '';
}


function buildObjectiveItemHTML(item) {
    const textDisp = (item.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const textEsc  = (item.text || '').replace(/"/g, '&quot;');
    return `
        <div class="board-obj-item${item.done ? ' done' : ''}" data-item-id="${item.id}">
            <span class="board-obj-checkbox">
                <svg class="board-obj-tick" viewBox="0 0 9 9"><path d="M1 4.5L3.5 7 8 1.5" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="board-obj-item-text">${textDisp}</span>
            <input class="board-obj-item-input" value="${textEsc}" placeholder="Objective…" />
        </div>
    `;
}

/* ==================================================================*/
/* ======================== HELPERS (UI) ============================*/
/* ==================================================================*/

// Wires hold-to-confirm behaviour on a .hold-to-confirm button.
// cb fires only after the pointer has hovered for 500 ms (matching the CSS fill).
function wireHoldToConfirm(btn, cb) {
    let armed = false, timer = null;
    btn.addEventListener('mouseenter', () => {
        armed = false;
        btn.classList.remove('armed');
        timer = setTimeout(() => { armed = true; btn.classList.add('armed'); }, 500);
    });
    btn.addEventListener('mouseleave', () => {
        clearTimeout(timer);
        armed = false;
        btn.classList.remove('armed');
    });
    btn.addEventListener('click', (e) => { if (armed) cb(e); });
}

/* ==================================================================*/
/* ======================== BOARD MODULE ============================*/
/* ==================================================================*/

export const detectiveBoard = (() => {

    let boardEl       = null;
    let boardCanvasEl = null;   // inner transform layer
    let svgEl         = null;
    let svgDotsEl     = null;
    let cbs           = {};
    let cutPts        = null;
    let cutLineEl     = null;
    let connectToolActive = false;
    let setConnectTool    = null; // assigned in init once the toolbar button exists
    let fabricCanvases     = {};
    let lastActiveSketchId = null;

    // Pan / zoom state
    let panX = 0, panY = 0, zoom = 1;

    const applyTransform = () => {
        const t = `translate(${panX}px, ${panY}px) scale(${zoom})`;
        boardCanvasEl.style.transform = t;
        // SVGs live outside the canvas layer but share the same transform so
        // their canvas-space coordinates stay in sync with the card positions.
        if (svgEl)     svgEl.style.transform     = t;
        if (svgDotsEl) svgDotsEl.style.transform = t;
        const label = boardEl.querySelector('.board-zoom-label');
        if (label) label.textContent = Math.round(zoom * 100) + '%';
    };

    // Snap zoom to a round value if within 5% of one
    const SNAP_ZOOMS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
    const snapZoom = (z) => {
        for (const s of SNAP_ZOOMS) {
            if (Math.abs(z - s) / s < 0.05) return s;
        }
        return z;
    };

    // Zoom centred on a point (boardX/Y in board-element px)
    const zoomAt = (boardX, boardY, factor) => {
        const newZoom = snapZoom(Math.max(0.15, Math.min(4, zoom * factor)));
        panX = boardX - (boardX - panX) * (newZoom / zoom);
        panY = boardY - (boardY - panY) * (newZoom / zoom);
        zoom = newZoom;
        applyTransform();
        saveViewState(panX, panY, zoom);
    };

    // Screen → canvas-space conversion
    const toCanvas = (screenX, screenY) => {
        const br = boardEl.getBoundingClientRect();
        return {
            x: (screenX - br.left - panX) / zoom,
            y: (screenY - br.top  - panY) / zoom,
        };
    };

    /* ── Migrate board state to canvas-px format ───────────────── */

    const migrateBoardState = () => {
        const state = getBoardState();
        if (state._canvas) return; // already in canvas-px format

        const bW = boardEl.offsetWidth  || 1200;
        const bH = boardEl.offsetHeight || 600;

        Object.values(state.cards || {}).forEach(c => {
            if (state._pct) {
                // Old % format → canvas px (using current viewport size so cards
                // appear exactly where they were before the migration)
                c.x = pctToPx(c.x || 0,     bW);
                c.y = pctToPx(c.y || 0,     bH);
                c.w = pctToPx(c.w || 20,    bW);
                // h is already in px — leave it
            }
            // else: even older absolute-px format (pass through)
        });

        delete state._pct;
        saveBoardState(state); // sets _canvas: true
    };

    /* ── Init ──────────────────────────────────────────────────── */

    const init = (container, callbacks) => {
        cbs = callbacks;
        container.innerHTML = '';

        const board = document.createElement('div');
        board.className = 'detective-board';
        container.appendChild(board);
        boardEl = board;

        migrateBoardState();

        // ── Inner canvas — everything pan/zoomable lives here ────
        const canvas = document.createElement('div');
        canvas.className = 'board-canvas';
        board.appendChild(canvas);
        boardCanvasEl = canvas;

        // SVG layers are direct children of boardEl (NOT boardCanvasEl).
        // This keeps them outside the GPU compositing layer of boardCanvasEl
        // (which has will-change:transform), preventing compositor clipping.
        // applyTransform() applies the same CSS transform to them as to
        // boardCanvasEl, keeping canvas-space coordinates in sync.
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'board-svg');
        board.appendChild(svg);
        svgEl = svg;

        const svgDots = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgDots.setAttribute('class', 'board-svg-dots');
        board.appendChild(svgDots);
        svgDotsEl = svgDots;

        // ── Zoom controls (outside canvas — always fixed in corner) ─
        const zoomControls = document.createElement('div');
        zoomControls.className = 'board-zoom-controls';
        zoomControls.innerHTML = `
            <button class="board-zoom-btn" data-action="out" title="Zoom out">−</button>
            <span class="board-zoom-label">100%</span>
            <button class="board-zoom-btn" data-action="in"  title="Zoom in">+</button>
        `;
        board.appendChild(zoomControls);

        // ── Board toolbar (bottom-right) ─────────────────────────
        const boardToolbar = document.createElement('div');
        boardToolbar.className = 'board-toolbar';
        boardToolbar.innerHTML = `
            <button class="board-toolbar-btn board-connect-tool-btn" title="Connect tool — drag between cards to draw a string">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
            </button>
        `;
        board.appendChild(boardToolbar);

        const connectBtn = boardToolbar.querySelector('.board-connect-tool-btn');
        setConnectTool = (on) => {
            connectToolActive = on;
            connectBtn.classList.toggle('active', on);
            boardEl.classList.toggle('board-connect-tool-on', on);
            // Exit edit mode on all cards so text fields don't intercept clicks
            if (on) {
                boardEl.querySelectorAll('.board-section-editing').forEach(s => s.classList.remove('board-section-editing'));
                boardEl.querySelectorAll('.board-card-editing').forEach(c => c.classList.remove('board-card-editing'));
                if (document.activeElement?.closest?.('.detective-board')) document.activeElement.blur();
            }
        };

        connectBtn.addEventListener('click', () => setConnectTool(!connectToolActive));

        zoomControls.querySelector('[data-action="in"]').addEventListener('click', () => {
            zoomAt(boardEl.offsetWidth / 2, boardEl.offsetHeight / 2, 1.25);
        });
        zoomControls.querySelector('[data-action="out"]').addEventListener('click', () => {
            zoomAt(boardEl.offsetWidth / 2, boardEl.offsetHeight / 2, 0.8);
        });
        // Click the % label to reset to 100% (pan stays, zoom centres on board midpoint)
        zoomControls.querySelector('.board-zoom-label').addEventListener('click', () => {
            const bx = boardEl.offsetWidth  / 2;
            const by = boardEl.offsetHeight / 2;
            panX = bx - (bx - panX) * (1 / zoom);
            panY = by - (by - panY) * (1 / zoom);
            zoom = 1;
            applyTransform();
            saveViewState(panX, panY, zoom);
        });

        // ── Restore saved view ───────────────────────────────────
        const v = getViewState();
        panX = v.panX ?? 0;
        panY = v.panY ?? 0;
        zoom = v.zoom ?? 1;
        applyTransform();

        new ResizeObserver(() => updateStrings()).observe(boardEl);
        wireBoardEvents();
    };

    /* ── Render ─────────────────────────────────────────────────── */

    const render = (filteredBlocks) => {
        if (!boardEl) return;

        const allBlocks = getAllBlocks();
        const shown     = new Set((filteredBlocks || allBlocks).map(b => b.id));
        const state     = getBoardState();

        boardCanvasEl.querySelectorAll('.board-card').forEach(card => {
            if (!shown.has(card.dataset.id)) {
                card.style.opacity = '0';
                card.style.transition = 'opacity 0.3s ease';
                setTimeout(() => card.remove(), 300);
            }
        });

        const blocks = filteredBlocks || allBlocks;

        blocks.forEach(block => {
            block = migrateObjectiveSections(migrateBlock(block));
            const existing = boardCanvasEl.querySelector(`.board-card[data-id="${block.id}"]`);
            if (existing) {
                refreshCardContent(existing, block);
            } else {
                if (!state.cards[block.id]) {
                    state.cards[block.id] = centerPos(boardEl, panX, panY, zoom);
                    saveBoardState(state);
                }
                const card = buildCard(block, state.cards[block.id]);
                boardCanvasEl.appendChild(card);
                wireCardHeightAnimation(card);
            }
        });

        let hint = boardEl.querySelector('.board-empty-hint');
        if (blocks.length === 0) {
            if (!hint) {
                hint = document.createElement('div');
                hint.className = 'board-empty-hint';
                hint.innerHTML = `
                    <div class="board-empty-hint-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                        </svg>
                    </div>
                    <p>Double-click anywhere to add a block</p>
                `;
                boardEl.appendChild(hint);
            }
        } else if (hint) {
            hint.remove();
        }

        cleanOrphanConnections(state, blocks);
        updateStrings();
    };

    /* ── Create a block inline at a % position ──────────────────── */

    const createBlockAtPos = (pos) => {
        const id = crypto.randomUUID();
        const block = {
            id,
            title: 'Untitled',
            timestamp: Date.now(),
            blockType: ['block'],
            sections: [],
            tags: [],
            uses: [],
            properties: [],
        };
        const blocks = getAllBlocks();
        blocks.push(block);
        localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));

        const state = getBoardState();
        state.cards[id] = pos;
        saveBoardState(state);

        boardEl.querySelector('.board-empty-hint')?.remove();

        const card = buildCard(block, pos);
        card.classList.add('board-card-editing');
        boardCanvasEl.appendChild(card);
        wireCardHeightAnimation(card);
        updateStrings();

        requestAnimationFrame(() => activateTitleEdit(card, block));
    };

    /* ── Animate card height on any content change ──────────────── */

    const wireCardHeightAnimation = (card) => {
        let prevH  = Math.round(card.getBoundingClientRect().height);
        let blocked = false;

        const body = card.querySelector('.board-card-body');

        new ResizeObserver(() => {
            if (blocked) return;
            const newH = Math.round(card.getBoundingClientRect().height);
            if (Math.abs(newH - prevH) < 2) return;

            const fromH = prevH;
            prevH = newH;
            blocked = true;

            // Clip both the card and the body so no scrollbar appears while
            // the card is constrained to a height shorter than its content.
            card.style.overflow = 'hidden';
            if (body) body.style.overflowY = 'hidden';

            // Snap to old height, then transition to new
            card.style.transition = 'none';
            card.style.height = fromH + 'px';
            void card.offsetHeight; // reflow
            card.style.transition = 'height 0.22s ease';
            card.style.height = newH + 'px';

            setTimeout(() => {
                card.style.transition = 'none';
                card.style.height = '';
                card.style.overflow = '';
                void card.offsetHeight;
                card.style.transition = '';
                if (body) body.style.overflowY = '';
                prevH = Math.round(card.getBoundingClientRect().height);
                blocked = false;
            }, 240);
        }).observe(card);
    };

    /* ── Build a card element ───────────────────────────────────── */

    const buildCard = (block, pos) => {
        block = migrateObjectiveSections(migrateBlock(block));
        const card = document.createElement('div');
        card.className = 'board-card';
        card.dataset.id   = block.id;
        card.dataset.type = 'block';
        card.style.left  = (pos.x || 0) + 'px';
        card.style.top   = (pos.y || 0) + 'px';
        card.style.width = (pos.w || CARD_W) + 'px';
        if (pos.h) card.style.height = pos.h + 'px';
        if (pos.collapsed) card.classList.add('board-card-collapsed');
        card.innerHTML = buildCardHTML(block);
        wireCardLevelEvents(card, block.id);  // card-level only — called once
        wireCardEvents(card, block);           // child elements
        return card;
    };

    /* ── Refresh inner content of existing card ─────────────────── */

    const refreshCardContent = (card, block) => {
        block = migrateObjectiveSections(migrateBlock(block));
        const collapsed = card.classList.contains('board-card-collapsed');
        // Clean up any Fabric canvases for this card's sections
        card.querySelectorAll('.board-section[data-section-type="sketch"]').forEach(el => {
            const sid = el.dataset.sectionId;
            if (fabricCanvases[sid]) {
                if (fabricCanvases[sid].keyHandler) document.removeEventListener('keydown', fabricCanvases[sid].keyHandler);
                if (fabricCanvases[sid].resizeObs) fabricCanvases[sid].resizeObs.disconnect();
                try { fabricCanvases[sid].fc.dispose(); } catch {}
                delete fabricCanvases[sid];
            }
        });
        card.innerHTML = buildCardHTML(block);
        if (collapsed) card.classList.add('board-card-collapsed');
        wireCardEvents(card, block);  // child elements only — safe to re-call
    };

    /* ── Activate title inline editing ─────────────────────────── */

    const activateTitleEdit = (card, block) => {
        const span  = card.querySelector('.board-card-title');
        const input = card.querySelector('.board-card-title-input');
        if (!span || !input) return;
        span.style.display  = 'none';
        input.style.display = 'block';
        input.focus();
        input.select();
    };

    /* ── Card-level events — attached once per card element lifetime */

    const wireCardLevelEvents = (card, blockId) => {
        // ── Unified pointer down: header → drag ──────────────────
        //
        // CAPTURE PHASE (true) is critical here.  Several child elements (notes
        // editors, inputs, sketch canvas) call e.stopPropagation() on pointerdown
        // in their own bubble-phase handlers — which would silently kill the event
        // before it ever reached this listener in bubble phase.
        //
        // By listening in capture phase we always fire first.
        let lastHeaderTap = 0; // tracks timing for double-tap title edit

        card.addEventListener('pointerdown', (e) => {
            const inHeader = !!e.target.closest('.board-card-header');

            // .board-card-title-wrap is only excluded from dragging when edit mode is
            // active — otherwise the title area is static text and should drag the card.
            const titleWrapBlocks = card.classList.contains('board-card-editing')
                ? !!e.target.closest('.board-card-title-wrap')
                : false;
            if (inHeader &&
                       !titleWrapBlocks &&
                       !e.target.closest('.board-card-actions, input, button, [contenteditable]')) {
                // ── Card drag via header (capture phase) ─────────
                e.preventDefault();
                e.stopPropagation();

                const state  = getBoardState();
                const startX = e.clientX, startY = e.clientY;
                const origL  = parseFloat(card.style.left) || 0;
                const origT  = parseFloat(card.style.top)  || 0;
                let moved = false;

                card.classList.add('board-card-dragging');
                card.style.zIndex = '20';
                card.setPointerCapture(e.pointerId);

                const onMove = (me) => {
                    const dx = (me.clientX - startX) / zoom;
                    const dy = (me.clientY - startY) / zoom;
                    if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return;
                    moved = true;
                    card.style.left = (origL + dx) + 'px';
                    card.style.top  = (origT + dy) + 'px';
                    updateStrings();
                };
                const onUp = (ue) => {
                    card.classList.remove('board-card-dragging');
                    card.style.zIndex = '';
                    card.releasePointerCapture(ue.pointerId);
                    card.removeEventListener('pointermove', onMove);
                    card.removeEventListener('pointerup',   onUp);
                    card.removeEventListener('pointercancel', onUp);
                    if (moved) {
                        state.cards[blockId] = state.cards[blockId] || {};
                        state.cards[blockId].x = parseFloat(card.style.left);
                        state.cards[blockId].y = parseFloat(card.style.top);
                        saveBoardState(state);
                    } else {
                        // Detect double-tap: setPointerCapture redirects pointerup to
                        // the card, so dblclick never fires — track it manually here.
                        const now = Date.now();
                        if (now - lastHeaderTap < 350) {
                            lastHeaderTap = 0;
                            card.dispatchEvent(new CustomEvent('header-doubletap', { bubbles: false }));
                        } else {
                            lastHeaderTap = now;
                        }
                    }
                };
                card.addEventListener('pointermove', onMove);
                card.addEventListener('pointerup',   onUp);
                card.addEventListener('pointercancel', onUp);

            }
            // For all other clicks (non-edge, non-header): do nothing in capture —
            // let the event propagate to children (notes, inputs, buttons, etc.).
        }, true /* capture phase */);
    };

    /* ── Child-element events — safe to re-call on content refresh ─ */

    const wireCardEvents = (card, block) => {
        block = migrateObjectiveSections(migrateBlock(block));
        const blockId = block.id;

        // ── Title inline editing ─────────────────────────────────
        const titleSpan  = card.querySelector('.board-card-title');
        const titleInput = card.querySelector('.board-card-title-input');

        // Double-tap the header fires a custom 'header-doubletap' event from the
        // drag handler (dblclick is suppressed by setPointerCapture + preventDefault).
        card.addEventListener('header-doubletap', () => {
            if (connectToolActive) return;
            card.classList.add('board-card-editing');
            activateTitleEdit(card, block);
        });

        titleInput?.addEventListener('pointerdown', e => e.stopPropagation());
        titleInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  { e.preventDefault(); titleInput.blur(); }
            if (e.key === 'Escape') { titleInput.value = block.title || 'Untitled'; titleInput.blur(); }
        });
        titleInput?.addEventListener('blur', () => {
            const val = titleInput.value.trim() || 'Untitled';
            titleInput.value    = val;
            titleSpan.textContent = val;
            titleSpan.style.display  = '';
            titleInput.style.display = 'none';
            if (val !== block.title) {
                block.title = val;
                updateBlock(blockId, b => { b.title = val; });
                cbs.onSaved();
            }
        });

        // ── Collapse ─────────────────────────────────────────────
        card.querySelector('.board-card-collapse-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.toggle('board-card-collapsed');
            const isCollapsed = card.classList.contains('board-card-collapsed');
            const state = getBoardState();
            state.cards[blockId] = state.cards[blockId] || {};
            state.cards[blockId].collapsed = isCollapsed;
            if (isCollapsed) {
                card.style.height = '';
            } else {
                if (state.cards[blockId].h) card.style.height = state.cards[blockId].h + 'px';
            }
            saveBoardState(state);
            updateStrings();
        });

        // ── Delete ───────────────────────────────────────────────
        card.querySelector('.board-card-delete-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            // If the popup is already open, clicking again closes it
            const existing = document.getElementById('delete-confirm-popup');
            if (existing) { existing.remove(); return; }
            import('./blockActionsHandler.js').then(({ blockActionsHandler }) => {
                blockActionsHandler.showDeletePopup(blockId, e, (id) => {
                    const state = getBoardState();
                    delete state.cards[id];
                    state.connections = (state.connections || []).filter(c => c.a !== id && c.b !== id);
                    saveBoardState(state);
                    cbs.removeBlock(id);
                    cbs.onSaved();
                });
            });
        });

        // ── Section events ────────────────────────────────────────
        wireSectionEvents(card, block);

        // ── Add section button ────────────────────────────────────
        card.querySelector('.board-card-add-section-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openSectionPicker(card, block);
        });
    };

    /* ── Section events ─────────────────────────────────────────── */

    const wireSectionEvents = (card, block) => {
        card.querySelectorAll('.board-section').forEach(sectionEl => {
            const sectionId   = sectionEl.dataset.sectionId;
            const sectionType = sectionEl.dataset.sectionType;
            const section     = (block.sections || []).find(s => s.id === sectionId);
            if (!section) return;
            wireSingleSectionEl(sectionEl, card, block, section);
        });
    };

    const wireSingleSectionEl = (sectionEl, card, block, section) => {
        const blockId   = block.id;
        const sectionId = section.id;

        // ── Drag to reorder (FLIP, mirrors pinned-block reorder) ─────
        const dragBtn = sectionEl.querySelector('.board-section-drag-btn');
        if (dragBtn) {
            const DRAG_THRESHOLD = 4;

            dragBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.setPointerCapture(e.pointerId);

                const startX   = e.clientX, startY = e.clientY;
                const cardBody = card.querySelector('.board-card-body');
                let didDrag    = false;
                let placeholder = null;

                let ghost = null;
                let offsetY = 0;

                const onMove = (me) => {
                    if (!didDrag) {
                        if (Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY) < DRAG_THRESHOLD) return;
                        didDrag = true;

                        const rect = sectionEl.getBoundingClientRect();
                        offsetY = me.clientY - rect.top;

                        // Placeholder holds the target slot
                        placeholder = document.createElement('div');
                        placeholder.className = 'board-section-drag-placeholder';
                        placeholder.style.height = (rect.height / zoom) + 'px';
                        sectionEl.parentNode.insertBefore(placeholder, sectionEl);

                        // Ghost: fixed clone that follows the cursor
                        ghost = sectionEl.cloneNode(true);
                        ghost.classList.add('board-section-ghost');
                        ghost.style.width = rect.width + 'px';
                        ghost.style.top   = (me.clientY - offsetY) + 'px';
                        ghost.style.left  = rect.left + 'px';

                        // For sketch sections: replace the cloned canvas with a static
                        // screenshot so the ghost shows the drawing instead of a blank canvas.
                        if (section.type === 'sketch') {
                            const lowerCanvas = sectionEl.querySelector('canvas.lower-canvas');
                            const ghostWrap   = ghost.querySelector('.board-sketch-canvas-wrap');
                            if (lowerCanvas && ghostWrap) {
                                try {
                                    const img = document.createElement('img');
                                    img.src = lowerCanvas.toDataURL();
                                    img.style.cssText = 'width:100%;display:block;border-radius:6px;';
                                    ghostWrap.innerHTML = '';
                                    ghostWrap.appendChild(img);
                                } catch {}
                            }
                            // Disconnect ResizeObserver BEFORE display:none so Fabric's canvas
                            // doesn't get resized to 0 while the section is hidden.
                            const entry = fabricCanvases[sectionId];
                            if (entry?.resizeObs) entry.resizeObs.disconnect();
                        }

                        document.body.appendChild(ghost);

                        // Hide the original in place
                        sectionEl.classList.add('board-section-dragging');
                    }

                    // Ghost follows cursor
                    ghost.style.top = (me.clientY - offsetY) + 'px';

                    // ── Move placeholder + FLIP-animate displaced sections ─
                    const siblings = [...cardBody.querySelectorAll(
                        '.board-section:not(.board-section-dragging)'
                    )];

                    // 1. Cancel any in-flight animations → snap all to natural positions
                    siblings.forEach(el => { el.style.transition = 'none'; el.style.transform = ''; });
                    void cardBody.offsetHeight;

                    // 2. Snapshot natural (unanimated) positions
                    const oldTops = new Map(siblings.map(el => [el, el.getBoundingClientRect().top]));

                    // 3. Find insertion target using natural positions
                    let target = null;
                    for (const s of siblings) {
                        const r = s.getBoundingClientRect();
                        if (me.clientY < r.top + r.height * 0.5) { target = s; break; }
                    }

                    // 4. Move placeholder
                    if (target) {
                        cardBody.insertBefore(placeholder, target);
                    } else {
                        const addBtn = cardBody.querySelector('.board-card-add-section-btn');
                        cardBody.insertBefore(placeholder, addBtn || null);
                    }

                    // 5. Compute deltas from natural → new DOM positions.
                    // getBoundingClientRect() is viewport px; divide by zoom to get local px.
                    const toPlay = [];
                    siblings.forEach(el => {
                        const delta = oldTops.get(el) - el.getBoundingClientRect().top;
                        if (Math.abs(delta) > 0.5) {
                            el.style.transform = `translateY(${delta / zoom}px)`;
                            toPlay.push(el);
                        }
                    });

                    // 6. Batch reflow, then animate all displaced elements together
                    if (toPlay.length) {
                        void cardBody.offsetHeight;
                        toPlay.forEach(el => {
                            el.style.transition = 'transform 0.15s ease';
                            el.style.transform  = '';
                        });
                    }
                };

                const onUp = () => {
                    card.releasePointerCapture(e.pointerId);
                    card.removeEventListener('pointermove', onMove);
                    card.removeEventListener('pointerup',   onUp);
                    card.removeEventListener('pointercancel', onUp);

                    if (didDrag && placeholder) {
                        ghost?.remove();
                        ghost = null;
                        placeholder.parentNode.insertBefore(sectionEl, placeholder);
                        placeholder.remove();
                        sectionEl.classList.remove('board-section-dragging');

                        // Reconnect sketch ResizeObserver now that the section is visible again
                        if (section.type === 'sketch') {
                            const entry = fabricCanvases[sectionId];
                            if (entry?.resizeObs) {
                                const wrap = sectionEl.querySelector('.board-sketch-canvas-wrap');
                                if (wrap) entry.resizeObs.observe(wrap);
                            }
                        }

                        // Clear any residual FLIP transforms
                        cardBody.querySelectorAll('.board-section').forEach(el => {
                            el.style.transition = '';
                            el.style.transform  = '';
                        });

                        // Persist new order
                        const newOrder = [...card.querySelectorAll('.board-section')].map(s => s.dataset.sectionId);
                        updateBlock(blockId, b => {
                            b.sections = newOrder.map(id => b.sections.find(s => s.id === id)).filter(Boolean);
                        });
                        block.sections = newOrder.map(id => block.sections.find(s => s.id === id)).filter(Boolean);

                        updateStrings();
                    }
                };

                card.addEventListener('pointermove', onMove);
                card.addEventListener('pointerup',   onUp);
                card.addEventListener('pointercancel', onUp);
            });
        }

        // Helper: remove this section entirely (cleans up Fabric if needed)
        const removeSection = () => {
            if (section.type === 'sketch' && fabricCanvases[sectionId]) {
                if (fabricCanvases[sectionId].keyHandler) document.removeEventListener('keydown', fabricCanvases[sectionId].keyHandler);
                if (fabricCanvases[sectionId].resizeObs) fabricCanvases[sectionId].resizeObs.disconnect();
                try { fabricCanvases[sectionId].fc.dispose(); } catch {}
                delete fabricCanvases[sectionId];
            }
            updateBlock(blockId, b => { b.sections = b.sections.filter(s => s.id !== sectionId); });
            block.sections = block.sections.filter(s => s.id !== sectionId);
            sectionEl.remove();

            // Remove any connections whose endpoint was anchored to this section.
            // paf/pbf carry an optional sectionId when the user dropped the connector
            // onto a specific section rather than the card header.
            const bst = getBoardState();
            const before = (bst.connections || []).length;
            bst.connections = (bst.connections || []).filter(
                c => c.paf?.sectionId !== sectionId && c.pbf?.sectionId !== sectionId
            );
            if (bst.connections.length !== before) {
                saveBoardState(bst);
                updateStrings();
            }
        };

        if (section.type === 'notes') {
            const editor = sectionEl.querySelector('.board-section-notes');
            if (editor) {
                // Only block pointer events when actively editing (so card drag works otherwise)
                editor.addEventListener('pointerdown', e => {
                    if (editor.contentEditable === 'true') e.stopPropagation();
                });
                // Double-click → activate editing
                editor.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    editor.contentEditable = 'true';
                    editor.focus();
                });
                let saveTimer = null;
                editor.addEventListener('input', () => {
                    clearTimeout(saveTimer);
                    saveTimer = setTimeout(() => {
                        updateBlock(blockId, b => {
                            const s = b.sections.find(s => s.id === sectionId);
                            if (s) s.content = editor.innerHTML;
                        });
                    }, 600);
                });
                // Blur → exit editing; delete section if empty
                editor.addEventListener('blur', () => {
                    editor.contentEditable = 'false';
                    if (!editor.textContent.trim() && !editor.querySelector('img, br + br')) {
                        removeSection();
                    }
                });
            }
        }

        if (section.type === 'objectives') {
            wireObjectivesSection(sectionEl, blockId, section);
        }

        if (section.type === 'objective') {
            const wrap     = sectionEl.querySelector('.board-section-objective');
            const checkbox = sectionEl.querySelector('.board-obj-checkbox');
            const textSpan = sectionEl.querySelector('.board-obj-item-text');
            const input    = sectionEl.querySelector('.board-obj-item-input');

            // Checkbox: toggle done state
            checkbox?.addEventListener('click', (e) => {
                e.stopPropagation();
                section.done = !section.done;
                wrap.classList.toggle('done', section.done);
                updateBlock(blockId, b => {
                    const s = b.sections.find(s => s.id === sectionId);
                    if (s) s.done = section.done;
                });
            });

            // Double-click text span → activate inline edit
            textSpan?.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                textSpan.style.display = 'none';
                input.style.display    = 'block';
                input.focus();
                input.select();
            });

            input?.addEventListener('pointerdown', e => e.stopPropagation());
            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
                if (e.key === 'Escape') { input.value = section.text || ''; input.blur(); }
            });
            input?.addEventListener('blur', () => {
                const val = input.value.trim();
                if (!val) { removeSection(); return; }
                section.text = val;
                textSpan.textContent   = val;
                textSpan.style.display = '';
                input.style.display    = 'none';
                updateBlock(blockId, b => {
                    const s = b.sections.find(s => s.id === sectionId);
                    if (s) s.text = val;
                });
            });

            // New objective: no text yet — show input immediately
            if (!section.text) {
                requestAnimationFrame(() => {
                    if (!textSpan || !input) return;
                    textSpan.style.display = 'none';
                    input.style.display    = 'block';
                    input.focus();
                });
            }
        }

        if (section.type === 'sketch') {
            // Use manual double-tap on pointerdown (capture phase) instead of dblclick.
            // Fabric's upper canvas intercepts pointer events before dblclick can fire,
            // and setPointerCapture in drawing mode suppresses the dblclick entirely.
            // Capture phase on pointerdown fires before Fabric sees anything.
            let lastSketchTap = 0;
            let sketchWasEditing = false;

            // Watch for board-section-editing being added or removed.
            // Added  → mark as having been activated (covers both double-tap and
            //           programmatic activation from addSectionToCard).
            // Removed → if it was activated and the canvas is empty, delete the
            //           section, mirroring notes (blur+empty) and objectives (blur+empty text).
            const sketchEditObs = new MutationObserver(() => {
                if (sectionEl.classList.contains('board-section-editing')) {
                    sketchWasEditing = true;
                } else if (sketchWasEditing) {
                    sketchWasEditing = false;
                    const entry = fabricCanvases[sectionId];
                    if (entry?.fc && entry.fc.getObjects().length === 0) {
                        sketchEditObs.disconnect();
                        removeSection();
                    }
                }
            });
            sketchEditObs.observe(sectionEl, { attributes: true, attributeFilter: ['class'] });

            sectionEl.addEventListener('pointerdown', (e) => {
                if (e.button !== 0 || e.target.closest('.board-section-drag-btn')) return;
                const now = Date.now();
                if (now - lastSketchTap < 350) {
                    lastSketchTap = 0;
                    if (!sectionEl.classList.contains('board-section-editing')) {
                        // Deactivate any other sketch section in this card first
                        card.querySelectorAll('.board-section-editing').forEach(s => s.classList.remove('board-section-editing'));
                        sectionEl.classList.add('board-section-editing');
                        if (!card.classList.contains('board-card-editing')) {
                            card.classList.add('board-card-editing');
                        }
                    }
                } else {
                    lastSketchTap = now;
                }
            }, true /* capture */);
            initSketchSection(card, sectionEl, sectionId, section.sketchData, blockId);
        }
    };

    /* ── Objectives ─────────────────────────────────────────────── */

    const wireObjectivesSection = (sectionEl, blockId, section) => {
        // Migrate old group-based data to flat items
        if (!section.items && section.groups) {
            section.items = (section.groups || []).flatMap(g => g.items || []);
            updateBlock(blockId, b => {
                const s = b.sections.find(s => s.id === section.id);
                if (s) { s.items = section.items; delete s.groups; }
            });
        }
        section.items = section.items || [];

        const itemsContainer = sectionEl.querySelector('.board-obj-items');
        const addBtn = sectionEl.querySelector('.board-add-obj-item-btn');

        addBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const newItem = { id: crypto.randomUUID(), text: '', done: false };
            section.items.push(newItem);
            updateBlock(blockId, b => {
                const s = b.sections.find(s => s.id === section.id);
                if (s) { s.items = s.items || []; s.items.push(newItem); }
            });
            const div = document.createElement('div');
            div.innerHTML = buildObjectiveItemHTML(newItem).trim();
            const itemEl = div.firstElementChild;
            itemsContainer.appendChild(itemEl);
            wireItemEl(itemEl, blockId, section, newItem);
            const inp = itemEl.querySelector('.board-obj-item-input');
            if (inp) {
                itemEl.querySelector('.board-obj-item-text').style.display = 'none';
                inp.style.display = 'block';
                inp.focus();
            }
        });

        sectionEl.querySelectorAll('.board-obj-item').forEach(itemEl => {
            const item = section.items.find(i => i.id === itemEl.dataset.itemId);
            if (item) wireItemEl(itemEl, blockId, section, item);
        });
    };

    const wireItemEl = (itemEl, blockId, section, item) => {
        const checkbox  = itemEl.querySelector('.board-obj-checkbox');
        const textSpan  = itemEl.querySelector('.board-obj-item-text');
        const input     = itemEl.querySelector('.board-obj-item-input');

        checkbox?.addEventListener('click', (e) => {
            e.stopPropagation();
            item.done = !item.done;
            itemEl.classList.toggle('done', item.done);
            updateBlock(blockId, b => {
                const s = b.sections.find(s => s.id === section.id);
                const it = s?.items?.find(i => i.id === item.id);
                if (it) it.done = item.done;
            });
        });

        textSpan?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            textSpan.style.display = 'none';
            input.style.display    = 'block';
            input.focus();
            input.select();
        });

        input?.addEventListener('pointerdown', e => e.stopPropagation());
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = item.text; input.blur(); }
        });
        input?.addEventListener('blur', () => {
            const val = input.value.trim();
            if (!val) {
                section.items = section.items.filter(i => i.id !== item.id);
                updateBlock(blockId, b => {
                    const s = b.sections.find(s => s.id === section.id);
                    if (s) s.items = s.items.filter(i => i.id !== item.id);
                });
                itemEl.remove();
                return;
            }
            item.text = val;
            textSpan.textContent   = val;
            textSpan.style.display = '';
            input.style.display    = 'none';
            updateBlock(blockId, b => {
                const s = b.sections.find(s => s.id === section.id);
                const it = s?.items?.find(i => i.id === item.id);
                if (it) it.text = val;
            });
        });

    };

    /* ── Section picker ─────────────────────────────────────────── */

    const openSectionPicker = (card, block) => {
        const existing = card.querySelector('.board-section-picker');
        if (existing) {
            existing.remove();
            card.querySelector('.board-card-add-section-btn').style.display = '';
            return;
        }

        const addBtn = card.querySelector('.board-card-add-section-btn');

        addBtn.style.display = 'none';

        const picker = document.createElement('div');
        picker.className = 'board-section-picker';
        picker.innerHTML = `
            <button class="board-section-picker-item" data-type="notes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" width="12" height="12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Notes
            </button>
            <button class="board-section-picker-item" data-type="objective">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" width="12" height="12"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Objective
            </button>
            <button class="board-section-picker-item" data-type="sketch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" width="12" height="12"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                Sketch
            </button>
        `;
        addBtn.insertAdjacentElement('beforebegin', picker);

        // ── Close helper ──────────────────────────────────────────
        let isClosing = false;
        const closePicker = (cb) => {
            if (isClosing) return;
            isClosing = true;
            document.removeEventListener('click', outsideClick, true);

            picker.classList.add('is-exiting');
            setTimeout(() => {
                picker.remove();
                addBtn.style.display = '';
                addBtn.classList.add('is-appearing');
                addBtn.addEventListener('animationend', () => addBtn.classList.remove('is-appearing'), { once: true });
                cb?.();
            }, 180);
        };

        // Outside-click: only close if the click landed outside the picker.
        // Using capture so we see it first — but we must NOT fire if the
        // target is inside the picker (the button's own handler covers that).
        const outsideClick = (e) => {
            if (!picker.contains(e.target)) closePicker();
        };

        picker.addEventListener('mouseleave', () => closePicker());

        picker.querySelectorAll('.board-section-picker-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                closePicker(() => addSectionToCard(card, block, type));
            });
        });

        setTimeout(() => document.addEventListener('click', outsideClick, true), 0);
    };

    const addSectionToCard = (card, block, type) => {
        let newSection;
        if (type === 'notes')           newSection = { id: crypto.randomUUID(), type: 'notes',     content: '' };
        else if (type === 'objective')  newSection = { id: crypto.randomUUID(), type: 'objective', text: '', done: false };
        else if (type === 'sketch')     newSection = { id: crypto.randomUUID(), type: 'sketch',    sketchData: null };
        else return;

        block.sections = block.sections || [];
        block.sections.push(newSection);
        updateBlock(block.id, b => { b.sections = b.sections || []; b.sections.push(newSection); });

        const div = document.createElement('div');
        div.innerHTML = buildSectionHTML(newSection).trim();
        const sectionEl = div.firstElementChild;
        const addBtn = card.querySelector('.board-card-add-section-btn');
        addBtn.insertAdjacentElement('beforebegin', sectionEl);

        wireSingleSectionEl(sectionEl, card, block, newSection);

        // Auto-focus / auto-activate
        if (type === 'notes') {
            requestAnimationFrame(() => {
                const el = sectionEl.querySelector('.board-section-notes');
                if (el) { el.contentEditable = 'true'; el.focus(); }
            });
        }
        // 'objective' sections auto-focus themselves inside wireSingleSectionEl

        if (type === 'sketch') {
            // Enter edit mode immediately so the user can start drawing right away.
            // Use rAF so Fabric has finished initialising the canvas first.
            // The MutationObserver in wireSingleSectionEl picks up the class addition
            // and sets sketchWasEditing automatically.
            requestAnimationFrame(() => {
                if (!card.classList.contains('board-card-editing')) {
                    card.classList.add('board-card-editing');
                }
                card.querySelectorAll('.board-section-editing').forEach(s => s.classList.remove('board-section-editing'));
                sectionEl.classList.add('board-section-editing');
            });
        }
    };

    /* ── Sketch (Fabric.js) ─────────────────────────────────────── */

    const initSketchSection = (card, sectionEl, sectionId, savedData, blockId) => {
        const wrap = sectionEl.querySelector('.board-sketch-canvas-wrap');
        if (!wrap) return;
        const canvasEl = wrap.querySelector('canvas');
        if (!canvasEl) return;

        const setup = () => setupFabricSection(card, sectionEl, sectionId, canvasEl, savedData, blockId);

        if (window.fabric) {
            setup();
        } else {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
            s.onload = setup;
            document.head.appendChild(s);
        }
    };

    const setupFabricSection = (card, sectionEl, sectionId, canvasEl, savedData, blockId) => {
        const wrap = sectionEl.querySelector('.board-sketch-canvas-wrap');
        // Let CSS enforce the 3:2 ratio — no JS height-setting needed, which
        // means we never mutate the DOM inside the ResizeObserver (avoids loops).
        if (wrap) wrap.style.aspectRatio = '3 / 2';
        let logicalW = (wrap && wrap.offsetWidth > 0) ? wrap.offsetWidth : 216;
        let logicalH  = (wrap && wrap.offsetHeight > 0) ? wrap.offsetHeight : Math.round(logicalW * 2 / 3);

        const fc = new window.fabric.Canvas(canvasEl, {
            isDrawingMode: true,
            selection: true,
            width: logicalW,
            height: logicalH,
            backgroundColor: 'transparent',
        });

        applySketchSetup(fc, { logicalW, logicalH });
        fc.wrapperEl.style.overflow = 'hidden';

        // Fabric sets inline pointer-events on its canvas elements which overrides
        // our CSS. Clear them so the CSS chain (.board-sketch-canvas-wrap and
        // .board-card-editing .board-sketch-canvas-wrap) controls interactivity.
        requestAnimationFrame(() => {
            [fc.wrapperEl, fc.lowerCanvasEl, fc.upperCanvasEl].forEach(el => {
                if (el) el.style.pointerEvents = '';
            });
        });

        // Selection handle style
        window.fabric.Object.prototype.set({
            borderColor: 'rgba(255,255,255,0.6)',
            cornerColor: '#ffffff',
            cornerSize: 8,
            transparentCorners: false,
        });

        // Initial brush — fine-pen, white
        fc.freeDrawingBrush.color = '#ffffff';
        fc.freeDrawingBrush.width = 1.8;
        fc._isEraserActive = false;
        updateDrawCursor(fc);

        const entry = { fc, color: '#ffffff', mode: 'fine-pen', keyHandler: null };
        fabricCanvases[sectionId] = entry;

        // ── Save helper ──────────────────────────────────────────
        const saveSketch = () => {
            const paths = fc.getObjects().filter(o => o.type === 'path' && !o._isEraser);
            if (!paths.length) {
                // Empty canvas — remove the sketch section entirely
                removeSection();
                return;
            }
            const json = JSON.stringify(fc.toJSON(['_isEraser']));
            updateBlock(blockId, b => {
                const s = b.sections.find(s => s.id === sectionId);
                if (s) s.sketchData = json;
            });
        };

        // ── Undo stack ───────────────────────────────────────────
        const undoStack = [];

        // Full-canvas snapshot — used before destructive ops (erase, Backspace-delete)
        const pushFlatten = () => {
            undoStack.push({ _flatten: true, _state: JSON.stringify(fc.toJSON(['_isEraser'])) });
        };
        fc._pushFlatten = pushFlatten; // expose so keyHandler can call it

        fc._bagUndo = () => {
            if (!undoStack.length) return;
            const top = undoStack.pop();
            // All entries are full JSON snapshots — just restore and leave the
            // rest of the stack intact so earlier history is never lost.
            fc.loadFromJSON(top._state, () => {
                fc.backgroundColor = 'transparent';
                fc.getObjects().forEach(obj => obj.set({ strokeUniform: true }));
                fc.renderAll();
                saveSketch();
            });
        };

        // Capture a full canvas snapshot before any move/scale/rotate begins
        let _preTransformState = null;
        fc.on('before:transform', () => {
            _preTransformState = JSON.stringify(fc.toJSON(['_isEraser']));
        });

        // ── path:created ─────────────────────────────────────────
        fc.on('path:created', (e) => {
            if (fc._isEraserActive) {
                // Remove the eraser stroke from the canvas before snapshotting so the
                // snapshot doesn't include it — otherwise undo restores the visible stroke.
                // eraseFromPaths only needs the path object for its pixel coverage map,
                // not for it to be present on the canvas.
                fc.remove(e.path);
                const preState = JSON.stringify(fc.toJSON(['_isEraser']));
                const newFragments = eraseFromPaths(fc, logicalW, logicalH, e.path, fc._eraserTargets || null);
                // Originals are removed and replaced by fragments — fold the new
                // fragments into _eraserTargets so the selection follows them.
                if (fc._eraserTargets?.length) {
                    fc._eraserTargets = [...fc._eraserTargets, ...newFragments];
                }
                fc._applyEraserSelection?.();
                undoStack.push({ _flatten: true, _state: preState });
                saveSketch();
                return;
            }
            e.path.set({ strokeUniform: true });
            // Push the pre-draw snapshot captured in mouse:down
            if (fc._prePathState !== undefined) {
                undoStack.push({ _flatten: true, _state: fc._prePathState });
                fc._prePathState = undefined;
            }
            fc.renderAll();
            saveSketch();
        });

        // ── object:modified ──────────────────────────────────────
        fc.on('object:modified', () => {
            // Skip transform entry when wireAltClone already pushed a flatten
            if (!fc._suppressNextTransform && _preTransformState) {
                undoStack.push({ _flatten: true, _state: _preTransformState });
            }
            fc._suppressNextTransform = false;
            _preTransformState = null;
            saveSketch();
        });

        // ── Load saved data ──────────────────────────────────────
        if (savedData) {
            fc.loadFromJSON(savedData, () => fc.renderAll());
        }

        // ── Toolbar wiring ───────────────────────────────────────
        // Declared before wireSketchKeyboard so onToolShortcut can reference it.
        const toolbar = sectionEl.querySelector('.board-sketch-toolbar');
        if (!toolbar) return;

        // ── Keyboard shortcuts ───────────────────────────────────
        // guard routes all shortcuts to whichever sketch the user last touched.
        // Tool shortcuts (v/b/e) use a looser guard — they fire whenever this
        // section is the last active sketch OR when it's the only sketch on the
        // board, so the user doesn't have to click the canvas before picking a tool.
        const keyHandler = wireSketchKeyboard(fc, {
            guard:    () => lastActiveSketchId === sectionId,
            onDelete: saveSketch,
            onPaste:  saveSketch,
            onToolShortcut: (key) => {
                // Tool shortcuts only need a weaker check: this sketch must be
                // the last one touched (or the only one on the board).
                if (lastActiveSketchId !== sectionId &&
                        lastActiveSketchId !== null) return;
                let tool;
                if (key === 'v') {
                    tool = 'select';
                } else if (key === 'e') {
                    tool = 'eraser';
                } else if (key === 'b') {
                    // Cycle: small pen → big pen → small pen
                    tool = entry.mode === 'fine-pen' ? 'pen' : 'fine-pen';
                }
                if (!tool) return;
                toolbar.querySelector(`.board-sketch-tool-btn[data-tool="${tool}"]`)?.click();
            },
        });
        entry.keyHandler = keyHandler;

        // ── Alt+drag duplication ─────────────────────────────────
        wireAltClone(fc, { onClone: saveSketch });

        // Track last active sketch — set on first pointer interaction with canvas.
        fc.wrapperEl.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            lastActiveSketchId = sectionId;
        });

        const setActiveTool = (tool) => {
            toolbar.querySelectorAll('.board-sketch-tool-btn').forEach(b => b.classList.remove('active'));
            toolbar.querySelector(`.board-sketch-tool-btn[data-tool="${tool}"]`)?.classList.add('active');
        };

        toolbar.querySelectorAll('.board-sketch-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tool = btn.dataset.tool;

                if (tool === 'undo') { fc._bagUndo(); return; }

                if (tool === 'clear') {
                    fc.clear();
                    fc.backgroundColor = 'transparent';
                    undoStack.length = 0;
                    saveSketch();
                    return;
                }

                setActiveTool(tool);

                if (tool === 'select') {
                    fc.isDrawingMode = false;
                    fc._isEraserActive = false;
                    fc._eraserTargets  = null;
                    entry.mode = 'select';
                } else if (tool === 'fine-pen') {
                    fc.isDrawingMode = true;
                    fc._isEraserActive = false;
                    fc._eraserTargets  = null;
                    fc.freeDrawingBrush.color = entry.color;
                    fc.freeDrawingBrush.width = 1.8;
                    entry.mode = 'fine-pen';
                    updateDrawCursor(fc);
                } else if (tool === 'pen') {
                    fc.isDrawingMode = true;
                    fc._isEraserActive = false;
                    fc._eraserTargets  = null;
                    fc.freeDrawingBrush.color = entry.color;
                    fc.freeDrawingBrush.width = 5;
                    entry.mode = 'pen';
                    updateDrawCursor(fc);
                } else if (tool === 'eraser') {
                    // Capture any current selection before entering drawing mode
                    // (Fabric calls discardActiveObject when isDrawingMode is set).
                    fc._eraserTargets = fc.getActiveObjects()
                        .filter(o => o.type === 'path' && !o._isEraser);
                    fc.isDrawingMode = true;
                    fc._isEraserActive = true;
                    fc.freeDrawingBrush.color = 'rgba(0,0,0,1)';
                    fc.freeDrawingBrush.width = 16;
                    entry.mode = 'eraser';
                    updateDrawCursor(fc);
                    // Re-apply selection so the highlight stays visible in eraser mode.
                    fc._applyEraserSelection?.();
                }
            });
        });

        // ── Color dots ───────────────────────────────────────────
        toolbar.querySelectorAll('.board-sketch-color-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                toolbar.querySelectorAll('.board-sketch-color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                entry.color = dot.dataset.color;
                if (entry.mode === 'fine-pen' || entry.mode === 'pen') {
                    fc.freeDrawingBrush.color = entry.color;
                    updateDrawCursor(fc);
                }
            });
        });

        // ── Canvas resize — scale drawings to fill new dimensions ─
        // When the card is resized, the wrap changes size.  We scale every
        // object proportionally so the drawing fills the new canvas area.
        // logicalW / logicalH are kept in sync so eraseFromPaths always
        // receives the current canvas dimensions.
        let _resizeTimer = null;
        const sketchResizeObs = new ResizeObserver(() => {
            // Read both dimensions from the DOM — CSS aspect-ratio: 3/2 keeps
            // them in sync without any JS writes, so no observer loop is triggered.
            const newW = wrap.offsetWidth  || logicalW;
            const newH = wrap.offsetHeight || logicalH;
            if (newW === logicalW && newH === logicalH) return;
            if (newW < 10 || newH < 10) return;

            const scaleX = newW / logicalW;
            const scaleY = newH / logicalH;

            fc.getObjects().forEach(obj => {
                obj.set({
                    left:   obj.left   * scaleX,
                    top:    obj.top    * scaleY,
                    scaleX: obj.scaleX * scaleX,
                    scaleY: obj.scaleY * scaleY,
                });
                obj.setCoords();
            });

            logicalW = newW;
            logicalH = newH;

            fc.width  = logicalW;
            fc.height = logicalH;
            updateSketchScale(fc, logicalW, logicalH);
            fc.renderAll();

            // Debounce the save so we don't hammer localStorage mid-drag
            clearTimeout(_resizeTimer);
            _resizeTimer = setTimeout(saveSketch, 150);
        });
        sketchResizeObs.observe(wrap);
        entry.resizeObs = sketchResizeObs;
    };

    /* ── String management ──────────────────────────────────────── */

    const addConnection = (idA, idB, sa, sb, paf, pbf) => {
        if (idA === idB) return;
        const state = getBoardState();
        state.connections = state.connections || [];
        // Each connection gets a unique ID so multiple connections between the same
        // pair of cards are allowed and can be individually moved / cut.
        const conn = { id: Math.random().toString(36).slice(2, 9), a: idA, b: idB };
        if (paf && pbf) {
            conn.paf = paf;
            conn.pbf = pbf;
        } else {
            if (!sa || !sb) {
                const aEl = boardCanvasEl.querySelector(`.board-card[data-id="${idA}"]`);
                const bEl = boardCanvasEl.querySelector(`.board-card[data-id="${idB}"]`);
                const s = (aEl && bEl) ? bestSides(aEl, bEl) : { sa: 'right', sb: 'left' };
                sa = sa || s.sa;
                sb = sb || s.sb;
            }
            conn.sa = sa;
            conn.sb = sb;
        }
        state.connections.push(conn);
        saveBoardState(state);
        updateStrings();
    };

    const cleanOrphanConnections = (state, blocks) => {
        const ids = new Set(blocks.map(b => b.id));
        const cleaned = (state.connections || []).filter(c => ids.has(c.a) && ids.has(c.b));
        if (cleaned.length !== (state.connections || []).length) {
            state.connections = cleaned;
            saveBoardState(state);
        }
    };

    /* ── String colour picker ───────────────────────────────────── */

    let _activeStringPicker = null;

    const showStringPicker = (e, conn) => {
        e.stopPropagation();

        // Dismiss any previously open picker first
        if (_activeStringPicker) {
            _activeStringPicker.remove();
            _activeStringPicker = null;
        }

        const picker = document.createElement('div');
        picker.className = 'board-string-picker';

        const currentColor = conn.color || STRING_COLORS[0];

        // Colour swatches
        STRING_COLORS.forEach(hex => {
            const swatch = document.createElement('div');
            swatch.className = 'board-string-picker-swatch' + (hex === currentColor ? ' active' : '');
            swatch.style.background = hex;
            swatch.addEventListener('click', (se) => {
                se.stopPropagation();
                const st = getBoardState();
                const c = (st.connections || []).find(c => c.id === conn.id);
                if (c) { c.color = hex; saveBoardState(st); updateStrings(); }
                picker.remove();
                _activeStringPicker = null;
            });
            picker.appendChild(swatch);
        });

        // Separator + delete
        const sep = document.createElement('div');
        sep.className = 'board-string-picker-sep';
        picker.appendChild(sep);

        const del = document.createElement('button');
        del.className = 'board-string-picker-delete';
        del.title = 'Remove connection';
        del.textContent = '×';
        del.addEventListener('click', (de) => {
            de.stopPropagation();
            const st = getBoardState();
            st.connections = (st.connections || []).filter(c => c.id !== conn.id);
            saveBoardState(st);
            updateStrings();
            picker.remove();
            _activeStringPicker = null;
        });
        picker.appendChild(del);

        // Position: just above the click point, clamped to viewport
        const PW = 8 * 13 + 7 * 5 + 18 + 20; // rough width estimate
        const left = Math.min(e.clientX - PW / 2, window.innerWidth - PW - 8);
        picker.style.left = Math.max(8, left) + 'px';
        picker.style.top  = (e.clientY - 48) + 'px';
        document.body.appendChild(picker);
        _activeStringPicker = picker;

        // Dismiss on outside click
        setTimeout(() => {
            const outside = (oe) => {
                if (!picker.contains(oe.target)) {
                    picker.remove();
                    _activeStringPicker = null;
                    document.removeEventListener('click', outside, true);
                }
            };
            document.addEventListener('click', outside, true);
        }, 0);
    };

    const updateStrings = () => {
        if (!svgDotsEl) return;
        svgDotsEl.querySelectorAll('.board-string, .board-string-hit, .board-string-dot').forEach(el => el.remove());

        const state = getBoardState();
        (state.connections || []).forEach(conn => {
            const aEl = boardCanvasEl.querySelector(`.board-card[data-id="${conn.a}"]`);
            const bEl = boardCanvasEl.querySelector(`.board-card[data-id="${conn.b}"]`);
            if (!aEl || !bEl) return;

            // Resolve dot positions first (they're just card-relative fractions)
            let pa = resolveEndpoint(aEl, conn.paf, conn.sa || 'right');
            let pb = resolveEndpoint(bEl, conn.pbf, conn.sb || 'left');
            // For collapsed cards snap each endpoint to the nearest facing edge.
            // Use card *centres* (not the raw resolved points) to decide which face
            // to snap to — raw resolved points on collapsed cards are unreliable
            // because hidden sections have offsetHeight=0.
            const aCollapsed = aEl.classList.contains('board-card-collapsed');
            const bCollapsed = bEl.classList.contains('board-card-collapsed');
            if (aCollapsed || bCollapsed) {
                const aCx = (parseFloat(aEl.style.left) || 0) + aEl.offsetWidth  / 2;
                const aCy = (parseFloat(aEl.style.top)  || 0) + aEl.offsetHeight / 2;
                const bCx = (parseFloat(bEl.style.left) || 0) + bEl.offsetWidth  / 2;
                const bCy = (parseFloat(bEl.style.top)  || 0) + bEl.offsetHeight / 2;
                if (aCollapsed) pa = snapCollapsedEdge(aEl, { x: bCx, y: bCy });
                if (bCollapsed) pb = snapCollapsedEdge(bEl, { x: aCx, y: aCy });
            }
            // Derive tangent directions live from the current vector between points,
            // so the curve re-routes naturally as cards are dragged around.
            const sa = conn.paf ? sideFromVector(pa, pb) : (conn.sa || bestSides(aEl, bEl).sa);
            const sb = conn.pbf ? sideFromVector(pb, pa) : (conn.sb || bestSides(aEl, bEl).sb);
            const d  = cubicPath(pa.x, pa.y, sa, pb.x, pb.y, sb);

            // Cut: remove by unique connection ID so only this connection is deleted
            const onCut = (e) => {
                e.stopPropagation();
                const state2 = getBoardState();
                state2.connections = (state2.connections || []).filter(c => c.id !== conn.id);
                saveBoardState(state2);
                updateStrings();
            };

            // Tag all elements with the connection ID so drag can hide them as a group
            const cid = conn.id || `${conn.a}-${conn.b}`; // fallback for legacy connections

            // Wide invisible hit zone
            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('class', 'board-string-hit');
            hitPath.setAttribute('d', d);
            hitPath.dataset.cid = cid;
            hitPath.addEventListener('click', onCut);
            svgDotsEl.appendChild(hitPath);

            // Visual path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'board-string');
            path.setAttribute('d', d);
            path.dataset.cid = cid;
            svgDotsEl.appendChild(path);

            // Connector dots — always draggable to reposition endpoints
            [['a', pa, conn.paf, conn.a, pb, conn.pbf, conn.b],
             ['b', pb, conn.pbf, conn.b, pa, conn.paf, conn.a]].forEach(([ep, pt, frac, cardId, otherPt, otherFrac, otherCardId]) => {
                const thisCardEl = boardCanvasEl.querySelector(`.board-card[data-id="${cardId}"]`);
                const isCollapsed = thisCardEl?.classList.contains('board-card-collapsed') ?? false;
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('class', 'board-string-dot' + (isCollapsed ? ' is-collapsed' : ''));
                dot.setAttribute('cx', pt.x);
                dot.setAttribute('cy', pt.y);
                dot.setAttribute('r', '3.5');
                dot.dataset.cid = cid;

                dot.addEventListener('click', onCut);

                // ── Drag to reposition endpoint ──
                dot.addEventListener('pointerdown', (dragEvt) => {
                    if (dragEvt.button !== 0) return;
                    // Disallow moving dots on collapsed cards
                    const thisCardEl = boardCanvasEl.querySelector(`.board-card[data-id="${cardId}"]`);
                    if (thisCardEl?.classList.contains('board-card-collapsed')) return;
                    dragEvt.preventDefault();
                    dragEvt.stopPropagation();
                    boardEl.setPointerCapture(dragEvt.pointerId);

                    // Hide the original connection — replace with live dashed preview
                    svgDotsEl.querySelectorAll(`[data-cid="${cid}"]`).forEach(el => el.remove());

                    // Resolve the fixed other endpoint's current canvas position
                    const otherCardEl = boardCanvasEl.querySelector(`.board-card[data-id="${otherCardId}"]`);
                    const getFixedPt  = () => otherCardEl
                        ? resolveEndpoint(otherCardEl, otherFrac, otherFrac ? sideFromFrac(otherFrac.fx, otherFrac.fy) : 'right')
                        : otherPt;

                    // Live dashed bezier preview
                    const livePreview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    livePreview.setAttribute('class', 'board-string-preview');
                    svgDotsEl.appendChild(livePreview);

                    const updatePreview = (clientX, clientY) => {
                        const cursorPt = toCanvas(clientX, clientY);
                        const fixedPt  = getFixedPt();
                        // Derive a tangent direction for the fixed end; use cursor direction for moving end
                        const fixedSide = otherFrac ? sideFromFrac(otherFrac.fx, otherFrac.fy) : 'right';
                        const dx = cursorPt.x - fixedPt.x, dy = cursorPt.y - fixedPt.y;
                        const movingSide = Math.abs(dx) >= Math.abs(dy)
                            ? (dx >= 0 ? 'left' : 'right')   // cursor is to the left/right of fixed
                            : (dy >= 0 ? 'top'  : 'bottom');  // cursor is above/below fixed
                        livePreview.setAttribute('d', cubicPath(fixedPt.x, fixedPt.y, fixedSide, cursorPt.x, cursorPt.y, movingSide));
                    };

                    updatePreview(dragEvt.clientX, dragEvt.clientY);

                    const onMove = (me) => updatePreview(me.clientX, me.clientY);

                    const onUp = (ue) => {
                        boardEl.releasePointerCapture(ue.pointerId);
                        boardEl.removeEventListener('pointermove', onMove);
                        boardEl.removeEventListener('pointerup',   onUp);
                        livePreview.remove();

                        // Find which card was released on
                        let targetCard = null;
                        for (const el of document.elementsFromPoint(ue.clientX, ue.clientY)) {
                            if (el.classList.contains('board-card')) { targetCard = el; break; }
                            const p = el.closest?.('.board-card');
                            if (p) { targetCard = p; break; }
                        }
                        // Must land on a different card from the fixed endpoint
                        if (!targetCard || targetCard.dataset.id === otherCardId) {
                            updateStrings();
                            return;
                        }

                        const tgtPt  = toCanvas(ue.clientX, ue.clientY);
                        const newFrac = cardFracFromCanvasPoint(targetCard, tgtPt.x, tgtPt.y);

                        const st = getBoardState();
                        const c  = st.connections.find(c => c.id === conn.id);
                        if (!c) return;
                        if (ep === 'a') { c.a = targetCard.dataset.id; c.paf = newFrac; }
                        else            { c.b = targetCard.dataset.id; c.pbf = newFrac; }
                        saveBoardState(st);
                        updateStrings();
                    };

                    boardEl.addEventListener('pointermove', onMove);
                    boardEl.addEventListener('pointerup',   onUp);
                });

                svgDotsEl.appendChild(dot);
            });
        });
    };


    /* ── Board events ───────────────────────────────────────────── */

    const wireBoardEvents = () => {

        // Click outside any editing card → close edit mode
        document.addEventListener('click', (e) => {
            boardEl.querySelectorAll('.board-card-editing').forEach(card => {
                if (!card.contains(e.target)) {
                    card.classList.remove('board-card-editing');
                    card.querySelectorAll('.board-section-editing').forEach(s => s.classList.remove('board-section-editing'));
                }
            });
        }, true);

        // Clicking outside an active notes editor or objective input → blur it.
        // Runs in capture phase so it fires before the target element's own handlers,
        // ensuring the blur (and its save logic) completes before any new focus opens.
        document.addEventListener('pointerdown', (e) => {
            const active = document.activeElement;
            if (!active || !boardEl.contains(active)) return;
            if (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') {
                if (!active.contains(e.target)) active.blur();
            }
        }, true);

        // ── Keyboard shortcuts for the board ─────────────────────
        document.addEventListener('keydown', (e) => {
            // Only fire when this board's tab is active and focus isn't in a text field
            if (!boardEl.closest('#tab3')?.offsetParent) return;
            const isText = e.target.isContentEditable
                        || ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);

            if (e.key === 'Escape' && connectToolActive) {
                setConnectTool(false);
                return;
            }

            if (e.key === 'c' && !isText && !e.metaKey && !e.ctrlKey) {
                setConnectTool(!connectToolActive);
            }
        });

        // ── Connect tool: left-drag from card to card ─────────────
        //
        // Fires in capture phase so it intercepts before card-level handlers.
        // Only active when connectToolActive is true.
        boardEl.addEventListener('pointerdown', (e) => {
            if (!connectToolActive) return;
            if (e.button !== 0 || e.shiftKey) return;

            const sourceCard = e.target.closest?.('.board-card');
            if (!sourceCard) return;
            // Let header drags, resize handle, and interactive children pass through
            if (e.target.closest('.board-card-header, .board-card-resize, button, input, [contenteditable], select')) return;

            e.preventDefault();
            e.stopPropagation();
            boardEl.setPointerCapture(e.pointerId);

            const blockId  = sourceCard.dataset.id;
            const startPt  = toCanvas(e.clientX, e.clientY);

            const preview = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            preview.setAttribute('class', 'board-string-preview');
            preview.setAttribute('x1', startPt.x);
            preview.setAttribute('y1', startPt.y);
            preview.setAttribute('x2', startPt.x);
            preview.setAttribute('y2', startPt.y);
            svgDotsEl.appendChild(preview);

            const onMove = (me) => {
                const p = toCanvas(me.clientX, me.clientY);
                preview.setAttribute('x2', p.x);
                preview.setAttribute('y2', p.y);
            };

            const onUp = (ue) => {
                boardEl.releasePointerCapture(ue.pointerId);
                boardEl.removeEventListener('pointermove', onMove);
                boardEl.removeEventListener('pointerup',   onUp);
                preview.remove();

                let targetCard = null;
                for (const el of document.elementsFromPoint(ue.clientX, ue.clientY)) {
                    if (el.classList.contains('board-card')) { targetCard = el; break; }
                    const p = el.closest?.('.board-card');
                    if (p) { targetCard = p; break; }
                }
                if (targetCard && targetCard !== sourceCard) {
                    // Store exact fractional positions anchored to the section they were dropped on
                    const paf = cardFracFromCanvasPoint(sourceCard, startPt.x, startPt.y);
                    const tgtPt = toCanvas(ue.clientX, ue.clientY);
                    const pbf = cardFracFromCanvasPoint(targetCard, tgtPt.x, tgtPt.y);
                    addConnection(blockId, targetCard.dataset.id, null, null, paf, pbf);
                }
            };

            boardEl.addEventListener('pointermove', onMove);
            boardEl.addEventListener('pointerup',   onUp);
        }, true /* capture */);

        // ── Double-click on empty board → create block ───────────
        boardEl.addEventListener('dblclick', (e) => {
            if (e.target.closest('.board-card, .board-zoom-controls, .board-toolbar')) return;
            const c = toCanvas(e.clientX, e.clientY);
            createBlockAtPos({ x: c.x - CARD_W / 2, y: c.y - 20, w: CARD_W });
        });

        // ── Pointer down: pan (middle mouse) or cut (Shift+left) ───
        // Pan is middle-mouse-only so left-drag is available for the connect tool.
        boardEl.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.board-card, .board-zoom-controls, .board-toolbar')) return;
            // Let clicks on strings/dots fall through to their own handlers
            const tag = e.target.tagName.toLowerCase();
            if (tag === 'path' || tag === 'circle') return;

            // Accept left/middle mouse (pan) or Shift+left (cut gesture)
            const isMiddle = e.button === 1;
            const isCut    = e.button === 0 && e.shiftKey;
            const isPan    = e.button === 0 && !e.shiftKey;
            if (!isMiddle && !isCut && !isPan) return;

            e.preventDefault();
            boardEl.setPointerCapture(e.pointerId);

            if (isCut) {
                // ── Shift + left drag = cut gesture (canvas-space coords) ─
                const start = toCanvas(e.clientX, e.clientY);
                cutPts = [start];
                let cutting = false;

                const onMove = (me) => {
                    const p = toCanvas(me.clientX, me.clientY);
                    cutPts.push(p);
                    if (!cutting && Math.hypot(p.x - start.x, p.y - start.y) > 6) {
                        cutting = true;
                        boardEl.style.cursor = 'crosshair';
                        cutLineEl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                        cutLineEl.setAttribute('class', 'board-cut-line');
                        svgEl.appendChild(cutLineEl);
                    }
                    if (cutting && cutLineEl) {
                        cutLineEl.setAttribute('points', cutPts.map(p => `${p.x},${p.y}`).join(' '));
                    }
                };
                const onUp = () => {
                    boardEl.releasePointerCapture(e.pointerId);
                    boardEl.removeEventListener('pointermove', onMove);
                    boardEl.removeEventListener('pointerup',   onUp);
                    boardEl.style.cursor = '';
                    cutLineEl?.remove();
                    cutLineEl = null;
                    if (cutting && cutPts && cutPts.length > 1) {
                        const state = getBoardState();
                        const before = (state.connections || []).length;
                        const cutIds = new Set();
                        (state.connections || []).forEach(conn => {
                            const aEl = boardCanvasEl.querySelector(`.board-card[data-id="${conn.a}"]`);
                            const bEl = boardCanvasEl.querySelector(`.board-card[data-id="${conn.b}"]`);
                            if (!aEl || !bEl) { cutIds.add(conn.id); return; }
                            const pa = resolveEndpoint(aEl, conn.paf, conn.sa || 'right');
                            const pb = resolveEndpoint(bEl, conn.pbf, conn.sb || 'left');
                            const sa = conn.paf ? sideFromVector(pa, pb) : (conn.sa || bestSides(aEl, bEl).sa);
                            const sb = conn.pbf ? sideFromVector(pb, pa) : (conn.sb || bestSides(aEl, bEl).sb);
                            if (cutCrossesPath(cutPts, cubicPath(pa.x, pa.y, sa, pb.x, pb.y, sb))) cutIds.add(conn.id);
                        });
                        state.connections = (state.connections || []).filter(conn => {
                            return !cutIds.has(conn.id);
                        });
                        if (state.connections.length !== before) saveBoardState(state);
                        updateStrings();
                    }
                    cutPts = null;
                };
                boardEl.addEventListener('pointermove', onMove);
                boardEl.addEventListener('pointerup',   onUp);

            } else {
                // ── Left / middle mouse drag = pan ────────────────────
                const startX  = e.clientX, startY = e.clientY;
                const startPX = panX,      startPY = panY;
                boardEl.style.cursor = 'grabbing';

                const onMove = (me) => {
                    panX = startPX + (me.clientX - startX);
                    panY = startPY + (me.clientY - startY);
                    applyTransform();
                };
                const onUp = () => {
                    boardEl.releasePointerCapture(e.pointerId);
                    boardEl.removeEventListener('pointermove', onMove);
                    boardEl.removeEventListener('pointerup',   onUp);
                    boardEl.style.cursor = '';
                    saveViewState(panX, panY, zoom);
                };
                boardEl.addEventListener('pointermove', onMove);
                boardEl.addEventListener('pointerup',   onUp);
            }
        });

        // ── Mouse-wheel zoom ──────────────────────────────────────
        boardEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            const br = boardEl.getBoundingClientRect();
            const bx = e.clientX - br.left;
            const by = e.clientY - br.top;
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            zoomAt(bx, by, factor);
        }, { passive: false });

        // ── Pinch zoom (touch) ────────────────────────────────────
        let _pinchDist = null;
        boardEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) { _pinchDist = null; }
        }, { passive: true });
        boardEl.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 2) return;
            e.preventDefault();
            const t = e.touches;
            const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
            const midX = (t[0].clientX + t[1].clientX) / 2;
            const midY = (t[0].clientY + t[1].clientY) / 2;
            const br   = boardEl.getBoundingClientRect();
            if (_pinchDist !== null) {
                zoomAt(midX - br.left, midY - br.top, dist / _pinchDist);
            }
            _pinchDist = dist;
        }, { passive: false });
        boardEl.addEventListener('touchend', () => { _pinchDist = null; }, { passive: true });
    };

    /* ── Public interface ───────────────────────────────────────── */

    const startAdd = () => createBlockAtPos(centerPos(boardEl, panX, panY, zoom));

    const editCard = (blockId) => {
        const card = boardCanvasEl?.querySelector(`.board-card[data-id="${blockId}"]`);
        if (!card) return;
        const blocks = getAllBlocks();
        const block = blocks.find(b => b.id === blockId);
        if (block) activateTitleEdit(card, migrateBlock(block));
    };

    return { init, render, startAdd, editCard };

})();
