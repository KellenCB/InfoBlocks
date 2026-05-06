// swipeGesture.js
// Reusable horizontal swipe gesture detection with two-stage preview.
// Works with both mouse and touch input.
//
// Usage:
//   import { registerSwipe } from './swipeGesture.js';
//   registerSwipe(element, {
//       threshold: 50,
//       onSwipeLeft:    () => { /* committed left swipe  */ },
//       onSwipeRight:   () => { /* committed right swipe */ },
//       onPreviewLeft:  (active) => { /* preview state changed */ },
//       onPreviewRight: (active) => { /* preview state changed */ },
//       canSwipeLeft:   () => true,
//       canSwipeRight:  () => true,
//   });

let _gestureActive = false;

/**
 * Returns true while a horizontal swipe gesture is being tracked.
 * Other drag systems (e.g. drag-to-scroll) should check this and yield.
 */
export function isSwipeGestureActive() {
    return _gestureActive;
}

/**
 * Register horizontal swipe detection on an element.
 *
 * @param {HTMLElement} element  – the element to listen on
 * @param {Object}      opts
 * @param {number}      [opts.threshold=50]     – px of horizontal travel to trigger preview
 * @param {number}      [opts.deadZone=8]       – px of movement before direction is decided
 * @param {Function}    [opts.onSwipeLeft]       – called when a left swipe is committed (released past threshold)
 * @param {Function}    [opts.onSwipeRight]      – called when a right swipe is committed
 * @param {Function}    [opts.onPreviewLeft]     – (active: boolean) called when preview state changes during drag
 * @param {Function}    [opts.onPreviewRight]    – (active: boolean) called when preview state changes during drag
 * @param {Function}    [opts.canSwipeLeft]      – () => boolean — checked before any left preview/commit
 * @param {Function}    [opts.canSwipeRight]     – () => boolean — checked before any right preview/commit
 */
export function registerSwipe(element, opts = {}) {
    const {
        threshold      = 50,
        deadZone       = 8,
        onSwipeLeft    = null,
        onSwipeRight   = null,
        onPreviewLeft  = null,
        onPreviewRight = null,
        canSwipeLeft   = () => true,
        canSwipeRight  = () => true,
    } = opts;

    // Mark element so drag-to-scroll can detect it and yield on horizontal drags
    element.setAttribute('data-swipe-enabled', '');

    let tracking       = false;
    let locked         = false;
    let direction      = null;   // 'horizontal' | 'vertical'
    let startX         = 0;
    let startY         = 0;
    let previewShowing = false;
    let previewDir     = null;   // 'left' | 'right'
    let didSwipe       = false;  // for click suppression after a committed swipe

    // ── Core gesture logic ────────────────────────────────────────────

    const begin = (x, y) => {
        tracking       = true;
        locked         = false;
        direction      = null;
        startX         = x;
        startY         = y;
        previewShowing = false;
        previewDir     = null;
    };

    const move = (x, y) => {
        if (!tracking) return;

        const dx   = x - startX;
        const dy   = y - startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Still inside the dead zone — do nothing yet
        if (!locked) {
            if (absDx < deadZone && absDy < deadZone) return;
            locked    = true;
            direction = absDx >= absDy ? 'horizontal' : 'vertical';
            if (direction === 'horizontal') {
                _gestureActive = true;
            } else {
                // Vertical intent — this module is done for this gesture
                tracking = false;
                return;
            }
        }

        if (direction !== 'horizontal') return;

        const swipeDir      = dx < 0 ? 'left' : 'right';
        const pastThreshold = absDx >= threshold;
        const allowed       = swipeDir === 'left' ? canSwipeLeft() : canSwipeRight();

        if (pastThreshold && allowed && !previewShowing) {
            // Crossed threshold — enter preview
            previewShowing = true;
            previewDir     = swipeDir;
            if (swipeDir === 'left'  && onPreviewLeft)  onPreviewLeft(true);
            if (swipeDir === 'right' && onPreviewRight) onPreviewRight(true);

        } else if ((!pastThreshold || !allowed) && previewShowing) {
            // Dropped back inside threshold — exit preview
            if (previewDir === 'left'  && onPreviewLeft)  onPreviewLeft(false);
            if (previewDir === 'right' && onPreviewRight) onPreviewRight(false);
            previewShowing = false;
            previewDir     = null;
        }
    };

    const end = () => {
        if (!tracking && !_gestureActive) return;

        if (previewShowing) {
            // Remove the preview first
            if (previewDir === 'left'  && onPreviewLeft)  onPreviewLeft(false);
            if (previewDir === 'right' && onPreviewRight) onPreviewRight(false);
            // Then commit
            if (previewDir === 'left'  && onSwipeLeft)  onSwipeLeft();
            if (previewDir === 'right' && onSwipeRight) onSwipeRight();
        }

        if (direction === 'horizontal') didSwipe = true;

        tracking       = false;
        locked         = false;
        direction      = null;
        previewShowing = false;
        previewDir     = null;
        _gestureActive = false;
    };

    const cancel = () => {
        // Abandon gesture — remove any preview without committing
        if (previewShowing) {
            if (previewDir === 'left'  && onPreviewLeft)  onPreviewLeft(false);
            if (previewDir === 'right' && onPreviewRight) onPreviewRight(false);
        }
        tracking       = false;
        locked         = false;
        direction      = null;
        previewShowing = false;
        previewDir     = null;
        _gestureActive = false;
    };

    // ── Ignored interactive targets ───────────────────────────────────

    const INTERACTIVE = 'button, input, select, textarea, [contenteditable="true"], .toggle-circle';

    // ── Mouse events ──────────────────────────────────────────────────

    element.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        if (e.target.closest(INTERACTIVE)) return;
        begin(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', e => {
        if (!tracking) return;
        move(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => end());

    // ── Touch events ──────────────────────────────────────────────────

    element.addEventListener('touchstart', e => {
        if (e.target.closest(INTERACTIVE)) return;
        if (e.touches.length !== 1) return;
        begin(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    element.addEventListener('touchmove', e => {
        if (!tracking || e.touches.length !== 1) return;
        move(e.touches[0].clientX, e.touches[0].clientY);
        // Prevent native vertical scroll while we own a horizontal gesture
        if (direction === 'horizontal') e.preventDefault();
    }, { passive: false });

    element.addEventListener('touchend',    () => end());
    element.addEventListener('touchcancel', () => cancel());

    // ── Click suppression after a committed swipe ─────────────────────

    document.addEventListener('click', e => {
        if (didSwipe) {
            e.stopPropagation();
            e.preventDefault();
            didSwipe = false;
        }
    }, true);
}