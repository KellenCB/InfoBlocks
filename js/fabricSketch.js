/**
 * fabricSketch.js — Shared Fabric.js canvas utilities used by both
 * the detective board (tab3) and the inventory bag (tab6).
 *
 * Requires window.fabric (Fabric.js 5.x) to be loaded before calling
 * applySketchSetup / flattenAfterErase.
 */

/* ==================================================================*/
/* ==================== splitIntoRegions ============================*/
/* ==================================================================*/

/**
 * Scans a rendered canvas for connected opaque regions using flood-fill.
 * Returns an array of { canvas, x, y } objects — one per region, each
 * cropped to its bounding box and positioned relative to the source canvas.
 *
 * Used by the eraser to flatten destination-out compositing into discrete
 * image objects that Fabric can manage without compositing tricks.
 */
export function splitIntoRegions(sourceCanvas) {
    const w = sourceCanvas.width, h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    const data = ctx.getImageData(0, 0, w, h).data;
    const labels = new Int32Array(w * h);
    let nextLabel = 1;
    const regions = [];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (labels[idx] !== 0 || data[idx * 4 + 3] <= 10) continue;
            const queue = [idx];
            labels[idx] = nextLabel;
            let minX = x, maxX = x, minY = y, maxY = y;
            while (queue.length) {
                const i = queue.pop();
                const cx = i % w, cy = (i - cx) / w;
                if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                    const ni = ny * w + nx;
                    if (labels[ni] === 0 && data[ni * 4 + 3] > 10) {
                        labels[ni] = nextLabel;
                        queue.push(ni);
                    }
                }
            }
            regions.push({ minX, maxX, minY, maxY, label: nextLabel });
            nextLabel++;
        }
    }

    return regions.map(r => {
        const rw = r.maxX - r.minX + 1, rh = r.maxY - r.minY + 1;
        const c = document.createElement('canvas');
        c.width = rw; c.height = rh;
        const src = ctx.getImageData(r.minX, r.minY, rw, rh);
        for (let py = 0; py < rh; py++) {
            for (let px = 0; px < rw; px++) {
                if (labels[(r.minY + py) * w + (r.minX + px)] !== r.label) {
                    src.data[(py * rw + px) * 4 + 3] = 0;
                }
            }
        }
        c.getContext('2d').putImageData(src, 0, 0);
        return { canvas: c, x: r.minX, y: r.minY };
    });
}

/* ==================================================================*/
/* ==================== updateSketchScale ===========================*/
/* ==================================================================*/

/**
 * Updates the DPI buffer and CSS display sizes on an existing Fabric canvas.
 * Safe to call multiple times (e.g. from a ResizeObserver).
 * Does NOT re-patch brush event handlers — use applySketchSetup for that.
 *
 * @param {fabric.Canvas} fc
 * @param {number} logicalW  - Canvas logical width (drawing coordinates)
 * @param {number} logicalH  - Canvas logical height
 * @param {number} [displayW] - CSS display width (defaults to logicalW)
 * @param {number} [displayH] - CSS display height (defaults to logicalH)
 */
export function updateSketchScale(fc, logicalW, logicalH, displayW, displayH) {
    const dW = displayW ?? logicalW;
    const dH = displayH ?? logicalH;
    const dpr = window.devicePixelRatio || 1;
    const bufW = Math.round(dW * dpr);
    const bufH = Math.round(dH * dpr);
    const scaleX = bufW / logicalW;
    const scaleY = bufH / logicalH;

    fc._displayScale = dW / logicalW;

    fc.lowerCanvasEl.setAttribute('width',  bufW);
    fc.lowerCanvasEl.setAttribute('height', bufH);
    fc.upperCanvasEl.setAttribute('width',  bufW);
    fc.upperCanvasEl.setAttribute('height', bufH);
    fc.contextContainer.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    fc.contextTop.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    fc.getRetinaScaling = () => scaleX;

    fc.lowerCanvasEl.style.width  = dW + 'px';
    fc.lowerCanvasEl.style.height = dH + 'px';
    fc.upperCanvasEl.style.width  = dW + 'px';
    fc.upperCanvasEl.style.height = dH + 'px';
    fc.wrapperEl.style.width  = dW + 'px';
    fc.wrapperEl.style.height = dH + 'px';
}

/* ==================================================================*/
/* ==================== applySketchSetup ============================*/
/* ==================================================================*/

/**
 * Applies DPI-aware scaling, a custom brush cursor, and capped-speed
 * brush smoothing to a freshly created Fabric canvas.
 * Call once, immediately after `new fabric.Canvas(...)`.
 *
 * Mutates fc:
 *   fc._updateDrawCursor()  — regenerate cursor after changing brush props
 *   fc._displayScale        — displayW / logicalW
 *
 * Also registers a 'mouse:up' handler that cleans up internal brush state.
 *
 * @param {fabric.Canvas} fc
 * @param {object} opts
 * @param {number} opts.logicalW   - Canvas logical width (drawing coordinates)
 * @param {number} opts.logicalH   - Canvas logical height
 * @param {number} [opts.displayW] - CSS display width  (defaults to logicalW)
 * @param {number} [opts.displayH] - CSS display height (defaults to logicalH)
 */
export function applySketchSetup(fc, { logicalW, logicalH, displayW, displayH }) {
    // ── DPI scaling + CSS sizes ───────────────────────────────────
    updateSketchScale(fc, logicalW, logicalH, displayW, displayH);

    // ── Re-render at new scale instead of stretching bitmap cache ─
    window.fabric.Object.prototype.noScaleCache = true;

    // ── Eraser target selection helper ───────────────────────────
    // Re-applies fc._eraserTargets as the active Fabric selection so the
    // highlight stays visible while in eraser mode.  Filters out objects
    // that have already been fully erased from the canvas.  Safe to call
    // in drawing mode — Fabric renders active-object highlights regardless.
    fc._applyEraserSelection = function () {
        if (!this._eraserTargets?.length) return;
        const live = this._eraserTargets.filter(o => this.getObjects().includes(o));
        this._eraserTargets = live;
        if (!live.length) return;
        // Discard first so Fabric restores each object's absolute left/top from
        // any previous ActiveSelection group coordinate system.  Without this,
        // creating a new ActiveSelection uses group-relative coords and the
        // bounding box lands at (0,0) instead of the objects' real positions.
        this.discardActiveObject();
        if (live.length === 1) {
            this.setActiveObject(live[0]);
        } else {
            this.setActiveObject(
                new window.fabric.ActiveSelection(live, { canvas: this })
            );
        }
        this.renderAll();
    };

    // ── Custom draw cursor ────────────────────────────────────────
    fc._updateDrawCursor = function () {
        if (!this.freeDrawingBrush) return;
        const size  = this.freeDrawingBrush.width;
        const scale = this._displayScale || 1;
        // width is the stroke diameter in logical units; half of that × scale
        // gives the correct radius in CSS pixels to match the actual brush size.
        const r     = Math.max((size / 2) * scale, 2);
        const d     = Math.ceil(r * 2 + 4);
        const c     = d / 2;
        const dpr2  = window.devicePixelRatio || 1;
        const tmp   = document.createElement('canvas');
        tmp.width   = d * dpr2;
        tmp.height  = d * dpr2;
        const ctx   = tmp.getContext('2d');
        ctx.scale(dpr2, dpr2);
        if (this._isEraserActive) {
            ctx.beginPath();
            ctx.arc(c, c, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(c, c, r, 0, Math.PI * 2);
            ctx.fillStyle = this.freeDrawingBrush.color || 'rgba(255,255,255,0.5)';
            ctx.fill();
        }
        this.freeDrawingCursor =
            'url(' + tmp.toDataURL() + ') ' + (c * dpr2) + ' ' + (c * dpr2) + ', crosshair';
        this.upperCanvasEl.style.cursor = this.freeDrawingCursor;
    };

    // ── Clamp pointer to logical canvas bounds ────────────────────
    const W = logicalW, H = logicalH;
    const origGetPointer = fc.getPointer.bind(fc);
    fc.getPointer = function (e, ignoreZoom) {
        const p = origGetPointer(e, ignoreZoom);
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));
        return p;
    };

    // ── Capped-speed brush smoothing ──────────────────────────────
    let _brushPos = null, _cursorPos = null, _brushRAF = null;
    const MAX_BRUSH_SPEED = 2.5;

    function brushTick() {
        if (!fc._isCurrentlyDrawing || !fc.isDrawingMode ||
            !_brushPos || !_cursorPos || fc._isEraserActive) {
            _brushRAF = null; return;
        }
        const dx = _cursorPos.x - _brushPos.x, dy = _cursorPos.y - _brushPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.3) {
            const move  = Math.max(0.15, Math.min(MAX_BRUSH_SPEED, dist * 0.10));
            const angle = Math.atan2(dy, dx);
            _brushPos.x += Math.cos(angle) * move;
            _brushPos.y += Math.sin(angle) * move;
            fc.freeDrawingBrush.onMouseMove(
                { x: _brushPos.x, y: _brushPos.y },
                { e: { shiftKey: false }, pointer: { x: _brushPos.x, y: _brushPos.y } }
            );
        }
        _brushRAF = requestAnimationFrame(brushTick);
    }

    const _origMouseDown = fc._onMouseDownInDrawingMode;
    fc._onMouseDownInDrawingMode = function (e) {
        _origMouseDown.call(this, e);
        if (this.isDrawingMode && this._isCurrentlyDrawing && !this._isEraserActive) {
            const p = this.getPointer(e);
            _brushPos  = { x: p.x, y: p.y };
            _cursorPos = { x: p.x, y: p.y };
            if (!_brushRAF) _brushRAF = requestAnimationFrame(brushTick);
        }
    };

    let _drawingOutside = false;
    const _origDrawMove = fc._onMouseMoveInDrawingMode;
    fc._onMouseMoveInDrawingMode = function (e) {
        if (this._isEraserActive) {
            const p       = origGetPointer(e);
            const outside = p.x < 0 || p.x >= W || p.y < 0 || p.y >= H;
            if (this._isCurrentlyDrawing && outside && !_drawingOutside) {
                _drawingOutside = true;
                this.freeDrawingBrush.onMouseUp({ e, pointer: this.getPointer(e) });
            } else if (!outside && _drawingOutside) {
                _drawingOutside = false;
                if (e.buttons > 0) {
                    this._isCurrentlyDrawing = true;
                    const pointer = this.getPointer(e);
                    this.freeDrawingBrush.onMouseDown(pointer, { e, pointer });
                }
            } else if (!outside) {
                _origDrawMove.call(this, e);
            }
            return;
        }
        const p       = origGetPointer(e);
        const clamped = { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) };
        const outside = p.x < 0 || p.x >= W || p.y < 0 || p.y >= H;
        if (this._isCurrentlyDrawing && outside && !_drawingOutside) {
            _drawingOutside = true;
            cancelAnimationFrame(_brushRAF); _brushRAF = null;
            this.freeDrawingBrush.onMouseUp({ e, pointer: _brushPos || clamped });
        } else if (!outside && _drawingOutside) {
            _drawingOutside = false;
            if (e.buttons > 0) {
                this._isCurrentlyDrawing = true;
                _brushPos  = { x: clamped.x, y: clamped.y };
                _cursorPos = { x: clamped.x, y: clamped.y };
                this.freeDrawingBrush.onMouseDown(clamped, { e, pointer: clamped });
                if (!_brushRAF) _brushRAF = requestAnimationFrame(brushTick);
            }
        } else if (!outside && this._isCurrentlyDrawing) {
            _cursorPos = { x: clamped.x, y: clamped.y };
            if (this.freeDrawingCursor) this.upperCanvasEl.style.cursor = this.freeDrawingCursor;
        }
    };

    const _origMouseUpDraw = fc._onMouseUpInDrawingMode;
    fc._onMouseUpInDrawingMode = function (e) {
        cancelAnimationFrame(_brushRAF); _brushRAF = null;
        _origMouseUpDraw.call(this, e);
    };

    fc.on('mouse:up', () => {
        _brushPos = null; _cursorPos = null;
        cancelAnimationFrame(_brushRAF); _brushRAF = null;
        _drawingOutside = false;
        if (fc.contextTop) fc.clearContext(fc.contextTop);
        fc.renderAll();
    });

    // ── Pre-draw state capture for snapshot-based undo ────────────
    // Capture the full canvas JSON before each stroke starts so that
    // path:created can push a pre-state snapshot instead of an object
    // reference.  This keeps the undo stack consistent after loadFromJSON
    // restores a prior state (object refs become stale; snapshots don't).
    fc.on('mouse:down', () => {
        if (fc.isDrawingMode && !fc._isEraserActive) {
            fc._prePathState = JSON.stringify(fc.toJSON(['_isEraser']));
        }
    });

    // ── Per-pixel hit detection ───────────────────────────────────
    // Default bounding-box selection means clicking inside a circle's empty
    // interior still selects the circle.  Per-pixel mode tests actual rendered
    // pixels instead, so only clicks near the stroke itself register as a hit.
    // targetFindTolerance adds a px radius around the cursor so thin lines
    // are still easy to click without having to land exactly on them.
    fc.targetFindTolerance = 8;
    fc.on('object:added', (e) => {
        if (e.target && e.target.type === 'path') {
            e.target.perPixelTargetFind = true;
        }
    });

    // Fabric's perPixelTargetFind reads pixels from its internal cache canvas
    // on every hover event.  Replace the cache context with willReadFrequently
    // to suppress the browser's repeated performance warning.
    if (fc.cacheCanvas) {
        const wrf = document.createElement('canvas');
        wrf.width  = fc.cacheCanvas.width  || 1;
        wrf.height = fc.cacheCanvas.height || 1;
        fc.cacheCanvas  = wrf;
        fc.contextCache = wrf.getContext('2d', { willReadFrequently: true });
    }
}

/* ==================================================================*/
/* ==================== flattenAfterErase ===========================*/
/* ==================================================================*/

/**
 * Handles the eraser path:created flow:
 *   1. Marks the path as destination-out eraser
 *   2. Renders everything to a scratch canvas
 *   3. Splits into disconnected opaque regions (splitIntoRegions)
 *   4. Clears the Fabric canvas and rebuilds it from those region images
 *   5. Calls onComplete(preState) when the rebuild is finished
 *
 * @param {fabric.Canvas} fc
 * @param {number}         logicalW    Canvas logical width
 * @param {number}         logicalH    Canvas logical height
 * @param {fabric.Path}    eraserPath  The path from the path:created event
 * @param {string}         preState    JSON snapshot captured before this erase
 * @param {function}       onComplete  Called with preState when rebuild is done
 */
export function flattenAfterErase(fc, logicalW, logicalH, eraserPath, preState, onComplete) {
    eraserPath.set({
        globalCompositeOperation: 'destination-out',
        stroke: 'rgba(255,255,255,1)',
        strokeUniform: true,
        _isEraser: true,
    });

    const eraserRect = eraserPath.getBoundingRect();

    // Partition canvas objects into:
    //   toComposite — bounding box overlaps the eraser stroke → rendered to an
    //                 off-screen canvas and rebuilt as image region(s).
    //   toKeep      — no overlap → left untouched as vector Fabric objects.
    // This means paths that weren't hit by the eraser retain their vector data
    // and stay fully scalable.
    const toComposite = [];
    const toKeep      = [];

    fc.getObjects().forEach(obj => {
        if (obj === eraserPath) return; // handled separately below
        const r   = obj.getBoundingRect();
        const hit = !(
            r.left           >= eraserRect.left + eraserRect.width  ||
            r.left + r.width  <= eraserRect.left                    ||
            r.top            >= eraserRect.top  + eraserRect.height ||
            r.top  + r.height <= eraserRect.top
        );
        (hit ? toComposite : toKeep).push(obj);
    });

    // If the eraser stroke missed every object, just discard it and bail
    if (!toComposite.length) {
        fc.remove(eraserPath);
        fc.renderAll();
        onComplete(preState);
        return;
    }

    // Hide the objects that should stay as vectors so Fabric's renderAll only
    // draws the affected objects + eraser.  Capturing fc.lowerCanvasEl after that
    // gives us exactly what the user already sees — Fabric's full rendering
    // pipeline with correct DPI scaling, retina transforms, and anti-aliasing —
    // rather than trying to replicate it via obj.render() on a raw context.
    toKeep.forEach(obj => { obj.visible = false; });
    fc.renderAll();

    const lower = fc.lowerCanvasEl;
    const bufW  = lower.width;   // logicalW × (dpr × retinaScale) from updateSketchScale
    const bufH  = lower.height;
    const tmp   = document.createElement('canvas');
    tmp.width   = bufW;
    tmp.height  = bufH;
    tmp.getContext('2d', { willReadFrequently: true }).drawImage(lower, 0, 0);

    // Restore visibility before touching the object list
    toKeep.forEach(obj => { obj.visible = true; });

    // Remove only composited objects + eraser; kept vectors stay untouched
    toComposite.forEach(obj => fc.remove(obj));
    fc.remove(eraserPath);

    // scale converts buffer pixels → logical coords  (≈ 1 / dpr)
    const scale = logicalW / bufW;
    const parts = splitIntoRegions(tmp);

    if (!parts.length) {
        fc.renderAll();
        onComplete(preState);
        return;
    }

    let loaded = 0;
    parts.forEach(part => {
        window.fabric.Image.fromURL(part.canvas.toDataURL('image/png'), img => {
            img.set({
                left:    part.x * scale,
                top:     part.y * scale,
                scaleX:  scale,
                scaleY:  scale,
                originX: 'left',
                originY: 'top',
            });
            fc.add(img);
            fc.sendToBack(img); // image regions sit below surviving vector paths
            loaded++;
            if (loaded === parts.length) {
                fc.renderAll();
                onComplete(preState);
            }
        });
    });
}

/* ==================================================================*/
/* ==================== eraseFromPaths ==============================*/
/* ==================================================================*/

/**
 * Vector-preserving eraser.  Called from the path:created handler when the
 * eraser tool is active.
 *
 * How it works:
 *  1. Renders the eraser stroke (source-over) to an off-screen canvas to build
 *     a pixel-coverage map without touching the live Fabric canvas.
 *  2. Walks every drawn path on the canvas, converts each path command's
 *     endpoint from path-local → canvas-logical space, then pixel-samples the
 *     coverage map to decide whether that command is "inside" the eraser.
 *  3. Splits each affected path at covered/uncovered transitions.  Surviving
 *     segments become new fabric.Path objects with identical stroke style.
 *     Fully-erased paths are simply removed.  Untouched paths are unchanged.
 *  4. Removes the eraser path and calls fc.renderAll().
 *
 * Undo: capture fc.toJSON() *before* calling this, then push
 *   { _flatten: true, _state: preState } onto your undo stack.
 *
 * @param {fabric.Canvas}    fc
 * @param {number}           logicalW      Canvas logical width  (drawing coords)
 * @param {number}           logicalH      Canvas logical height
 * @param {fabric.Path}      eraserPath    The path from the path:created event
 * @param {fabric.Object[]?} targets       When provided (and non-empty), only these
 *                                         objects are candidates for erasing.  Pass
 *                                         null / undefined to erase across all objects.
 */
export function eraseFromPaths(fc, logicalW, logicalH, eraserPath, targets = null) {
    const dpr = window.devicePixelRatio || 1;

    // ── 1. Build pixel-coverage map ───────────────────────────────
    // Render the eraser stroke into a scratch canvas (source-over, solid black)
    // so every pixel the eraser covers has alpha > 0.  We pixel-sample this
    // map instead of doing Bézier-intersection math.
    const scratch = document.createElement('canvas');
    scratch.width  = Math.round(logicalW * dpr);
    scratch.height = Math.round(logicalH * dpr);
    const sCtx = scratch.getContext('2d', { willReadFrequently: true });
    sCtx.scale(dpr, dpr);

    // Temporarily disable caching and set source-over so the stroke renders
    // as solid opaque pixels regardless of the canvas compositing state.
    eraserPath.set({ globalCompositeOperation: 'source-over', stroke: '#000', objectCaching: false });
    eraserPath.render(sCtx);

    const bufW    = scratch.width;
    const bufH    = scratch.height;
    const pixels  = sCtx.getImageData(0, 0, bufW, bufH).data;

    /** Returns true when canvas-logical point (cx, cy) is inside the eraser. */
    function isCovered(cx, cy) {
        const px = Math.round(cx * dpr);
        const py = Math.round(cy * dpr);
        if (px < 0 || py < 0 || px >= bufW || py >= bufH) return false;
        return pixels[(py * bufW + px) * 4 + 3] > 10;
    }

    // ── 2. Process each drawn path ────────────────────────────────
    const toRemove = [];
    const toAdd    = [];

    // When targets are provided, restrict erasing to those objects (filtered to
    // ones still on the canvas — earlier erase strokes may have removed some).
    const liveObjects = fc.getObjects();
    const candidates = (targets && targets.length > 0)
        ? targets.filter(o => liveObjects.includes(o))
        : liveObjects;

    candidates.forEach(obj => {
        if (obj === eraserPath || obj._isEraser || obj.type !== 'path') return;
        const cmds = obj.path;
        if (!cmds || cmds.length < 2) return;

        const matrix = obj.calcTransformMatrix();
        const off    = obj.pathOffset || { x: 0, y: 0 };

        /** Converts a path-local coordinate to canvas-logical space. */
        function toCanvas(lx, ly) {
            return window.fabric.util.transformPoint({ x: lx - off.x, y: ly - off.y }, matrix);
        }

        // Walk the command list, recording each command's endpoint and coverage.
        // We transform every coordinate pair to canvas-logical space so that new
        // sub-paths created from those coordinates render at the correct position
        // regardless of the original object's scaleX / scaleY.
        let cx = 0, cy = 0; // path-local cursor
        const parsed = cmds.map(cmd => {
            let ex, ey;          // path-local endpoint
            let canvasCmd;       // same command with all coords in canvas space

            switch (cmd[0]) {
                case 'M': {
                    ex = cmd[1]; ey = cmd[2];
                    const p0 = toCanvas(ex, ey);
                    canvasCmd = ['M', p0.x, p0.y];
                    break;
                }
                case 'L': {
                    ex = cmd[1]; ey = cmd[2];
                    const p0 = toCanvas(ex, ey);
                    canvasCmd = ['L', p0.x, p0.y];
                    break;
                }
                case 'Q': {
                    ex = cmd[3]; ey = cmd[4];
                    const pc = toCanvas(cmd[1], cmd[2]); // control point
                    const pe = toCanvas(ex, ey);
                    canvasCmd = ['Q', pc.x, pc.y, pe.x, pe.y];
                    break;
                }
                case 'C': {
                    ex = cmd[5]; ey = cmd[6];
                    const pc1 = toCanvas(cmd[1], cmd[2]);
                    const pc2 = toCanvas(cmd[3], cmd[4]);
                    const pe  = toCanvas(ex, ey);
                    canvasCmd = ['C', pc1.x, pc1.y, pc2.x, pc2.y, pe.x, pe.y];
                    break;
                }
                default:
                    ex = cx; ey = cy;
                    canvasCmd = [cmd[0]];
                    break;
            }

            // Canvas-space endpoint (used for coverage check and M commands)
            const cep = toCanvas(ex, ey);

            // Also check mid-point of Q segments for better accuracy on long curves
            let midCovered = false;
            if (cmd[0] === 'Q') {
                const mx = 0.25*cx + 0.5*cmd[1] + 0.25*ex;
                const my = 0.25*cy + 0.5*cmd[2] + 0.25*ey;
                const mp = toCanvas(mx, my);
                midCovered = isCovered(mp.x, mp.y);
            }

            // Canvas-space start (for fallback M when starting a new sub-path mid-stroke)
            const csp = toCanvas(cx, cy);

            const entry = {
                canvasCmd,
                csx: csp.x, csy: csp.y,  // canvas-space start of this segment
                cex: cep.x, cey: cep.y,  // canvas-space end of this segment
                type: cmd[0],
                covered: cmd[0] !== 'M' && (isCovered(cep.x, cep.y) || midCovered),
            };
            cx = ex; cy = ey;
            return entry;
        });

        if (!parsed.some(p => p.covered)) return; // not hit at all

        toRemove.push(obj);

        // Split into sub-paths at covered/uncovered transitions.
        // All coordinates are now in canvas-logical space.
        const subPaths = [];
        let current    = null;

        parsed.forEach(p => {
            if (p.type === 'M') {
                if (current && current.length > 1) subPaths.push(current);
                current = [['M', p.cex, p.cey]];
                return;
            }
            if (p.covered) {
                if (current && current.length > 1) subPaths.push(current);
                // Resume from the canvas-space endpoint of the erased command
                current = [['M', p.cex, p.cey]];
            } else {
                if (!current) current = [['M', p.csx, p.csy]];
                current.push(p.canvasCmd);
            }
        });
        if (current && current.length > 1) subPaths.push(current);

        // Create a new Fabric path for each surviving segment.
        // No scaleX/scaleY — coordinates are already in canvas space.
        subPaths.forEach(cmdArray => {
            const pathStr = cmdArray.map(c => c.join(' ')).join(' ');
            const newPath = new window.fabric.Path(pathStr, {
                stroke:           obj.stroke,
                strokeWidth:      obj.strokeWidth,
                strokeLineCap:    obj.strokeLineCap,
                strokeLineJoin:   obj.strokeLineJoin,
                strokeMiterLimit: obj.strokeMiterLimit,
                strokeDashArray:  obj.strokeDashArray,
                fill:             null,
                strokeUniform:    true,
            });
            toAdd.push(newPath);
        });
    });

    // ── 3. Apply changes ──────────────────────────────────────────
    fc.remove(eraserPath);
    toRemove.forEach(obj => fc.remove(obj));
    toAdd.forEach(obj    => fc.add(obj));

    // When the canvas becomes completely empty after erasing, Fabric can
    // leave _isCurrentlyDrawing in a stale true state because the normal
    // post-path cleanup path (fc.add) that implicitly flushes that flag
    // never runs.  Force-reset both the drawing flag and the brush's
    // in-progress point list so the next pointermove doesn't continue
    // an already-ended stroke.
    if (fc.getObjects().length === 0) {
        fc._isCurrentlyDrawing = false;
        if (fc.freeDrawingBrush) fc.freeDrawingBrush._points = [];
        if (fc.contextTop) fc.clearContext(fc.contextTop);
    }

    fc.renderAll();

    // Return the new fragment objects so callers can update their eraser-target
    // list: originals are gone, fragments are their replacements.
    return toAdd;
}

/* ==================================================================*/
/* ==================== updateDrawCursor ============================*/
/* ==================================================================*/

/**
 * Convenience wrapper — call after changing fc.freeDrawingBrush color/width
 * or toggling _isEraserActive to regenerate the custom dot cursor.
 *
 * @param {fabric.Canvas} fc
 */
export function updateDrawCursor(fc) {
    fc._updateDrawCursor?.();
}

/* ==================================================================*/
/* ==================== wireAltClone ================================*/
/* ==================================================================*/

/**
 * Wires Alt+drag duplication onto a Fabric sketch canvas.
 * Holding Alt while dragging a selected object leaves a clone behind at the
 * original position and moves the original.  The operation is a single undo
 * step — it sets fc._suppressNextTransform so the object:modified handler
 * skips pushing a redundant transform entry on top of the flatten snapshot.
 *
 * @param {fabric.Canvas} fc
 * @param {object}   opts
 * @param {function} [opts.onClone]  Called once when the drag ends (use to
 *                                   run any post-clone side-effects).
 */
export function wireAltClone(fc, { onClone } = {}) {
    let _altCloneActive = false;

    fc.on('object:moving', (opt) => {
        if (!opt.e.altKey || _altCloneActive) return;
        _altCloneActive = true;

        // One flatten snapshot covers both the clone addition and the move —
        // suppress the transform undo entry that object:modified would push.
        fc._suppressNextTransform = true;
        fc._pushFlatten?.();

        const sel = fc.getActiveObject();
        if (!sel) return;
        if (sel.type === 'activeSelection') {
            sel.getObjects().forEach(obj => {
                obj.clone(cloned => {
                    cloned.set({ left: sel.left + obj.left, top: sel.top + obj.top, strokeUniform: true });
                    fc.add(cloned);
                });
            });
        } else {
            sel.clone(cloned => {
                cloned.set({ strokeUniform: true });
                fc.add(cloned);
            });
        }
        fc.renderAll();
    });

    fc.on('mouse:up', () => {
        if (_altCloneActive) {
            _altCloneActive = false;
            onClone?.();
        }
    });
}

/* ==================================================================*/
/* ==================== wireSketchKeyboard ==========================*/
/* ==================================================================*/

// Shared clipboard — copy in one sketch, paste into another works too.
let _sketchClipboard = null;

/**
 * Wires standard keyboard shortcuts onto a Fabric sketch canvas and returns
 * the keyHandler so the caller can remove it with removeEventListener.
 *
 * Shortcuts provided:
 *   Ctrl/Cmd + Z         → fc._bagUndo()
 *   Ctrl/Cmd + C         → copy selected paths to shared clipboard
 *   Ctrl/Cmd + V         → paste clipboard paths onto canvas
 *   Backspace / Delete   → delete selected objects (select mode only;
 *                          snapshots via fc._pushFlatten for undo)
 *
 * @param {fabric.Canvas} fc
 * @param {object}   opts
 * @param {function} [opts.guard]               Called first — return false to skip all handling.
 *                                              Use this for per-sketch focus guards.
 * @param {function} [opts.onDelete]            Called after objects are deleted.
 * @param {function} [opts.onPaste]             Called after objects are pasted.
 * @param {function} [opts.getPasteStrokeColor] If provided, its return value overrides
 *                                              the stroke colour of every pasted path.
 *                                              When omitted the original colours are kept.
 */
export function wireSketchKeyboard(fc, { guard, onDelete, onPaste, getPasteStrokeColor, onToolShortcut } = {}) {
    const keyHandler = (e) => {
        if (guard && !guard()) return;

        const tag    = document.activeElement?.tagName;
        const isText = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        const mod    = e.ctrlKey || e.metaKey;

        // ── Ctrl+Z — undo ────────────────────────────────────────
        if (mod && e.key === 'z') {
            e.preventDefault();
            fc._bagUndo?.();
            return;
        }

        // ── Ctrl+C — copy selected paths ─────────────────────────
        if (mod && e.key === 'c') {
            if (isText) return;
            const sel = fc.getActiveObject();
            if (!sel) return;
            const objects = fc.getActiveObjects().filter(o => !o._isEraser);
            if (!objects.length) return;
            e.preventDefault();
            _sketchClipboard = (sel.type === 'activeSelection')
                ? objects.map(obj => {
                    const d  = obj.toObject();
                    d.left   = sel.left + obj.left;
                    d.top    = sel.top  + obj.top;
                    return d;
                  })
                : [sel.toObject()];
            return;
        }

        // ── Ctrl+V — paste ───────────────────────────────────────
        if (mod && e.key === 'v' && _sketchClipboard?.length) {
            e.preventDefault();
            fc._pushFlatten?.(); // snapshot pre-paste state so undo works in one step
            window.fabric.util.enlivenObjects(_sketchClipboard, (objects) => {
                fc.discardActiveObject();
                objects.forEach(obj => {
                    if (getPasteStrokeColor) obj.set({ stroke: getPasteStrokeColor() });
                    obj.set({ strokeUniform: true });
                    fc.add(obj);
                });
                if (objects.length === 1) {
                    fc.setActiveObject(objects[0]);
                } else if (objects.length > 1) {
                    fc.setActiveObject(new window.fabric.ActiveSelection(objects, { canvas: fc }));
                }
                fc.renderAll();
                onPaste?.();
            });
            return;
        }

        // ── Tool shortcuts — v / b / e (plain key, not in a text field) ─
        if (!mod && !isText && onToolShortcut &&
                (e.key === 'v' || e.key === 'b' || e.key === 'e')) {
            e.preventDefault();
            onToolShortcut(e.key);
            return;
        }

        // ── Backspace / Delete — remove selected (select mode only) ─
        if ((e.key === 'Backspace' || e.key === 'Delete') && !fc.isDrawingMode) {
            if (isText) return;
            const active = fc.getActiveObjects();
            if (active.length) {
                e.preventDefault();
                fc._pushFlatten?.(); // snapshot so delete is undoable
                active.forEach(obj => fc.remove(obj));
                fc.discardActiveObject();
                fc.renderAll();
                onDelete?.();
            }
        }
    };

    document.addEventListener('keydown', keyHandler);
    return keyHandler;
}
