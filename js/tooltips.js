// tooltips.js
//
// App-wide tooltip. Give any element a data-tooltip="Text" attribute and it
// gets the same glass tooltip as the header buttons (.uch-tooltip), with the
// same hover delay and fade. Use this for every new tooltip instead of title="".
//
// One shared tooltip element lives on <body> with position: fixed, so it is
// never clipped by blocks (which have overflow: hidden) and it works on
// elements added to the page later. It sits centred below the element, or
// above it when there isn't room below, and is kept inside the window.
// Styles: .uch-tooltip + .app-tooltip in base-layout.css.

const GAP  = 8;   // px between the element and the tooltip (matches the header tooltips)
const EDGE = 4;   // px to keep clear of the window edges

let tipEl         = null;
let currentTarget = null;

function getTip() {
    if (!tipEl) {
        tipEl = document.createElement('span');
        tipEl.className = 'uch-tooltip app-tooltip text-body-sm';
        tipEl.setAttribute('role', 'tooltip');
        document.body.appendChild(tipEl);
    }
    return tipEl;
}

function positionTip(target) {
    const tip = getTip();
    const r   = target.getBoundingClientRect();
    const t   = tip.getBoundingClientRect();

    let top = r.bottom + GAP;
    if (top + t.height > window.innerHeight - EDGE) top = r.top - GAP - t.height;

    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - t.width - EDGE));

    tip.style.top  = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
}

function showTip(target) {
    const text = target.getAttribute('data-tooltip');
    if (!text) { hideTip(); return; }

    const tip = getTip();
    // Restart the hover delay for each new element, like the header tooltips
    tip.style.transition = 'none';
    tip.classList.remove('visible');
    void tip.offsetWidth;
    tip.style.transition = '';

    currentTarget   = target;
    tip.textContent = text;
    positionTip(target);
    tip.classList.add('visible');
}

function hideTip() {
    currentTarget = null;
    tipEl?.classList.remove('visible');
}

document.addEventListener('mouseover', (e) => {
    const target = e.target.closest?.('[data-tooltip]') || null;
    if (target === currentTarget) return;
    if (target) showTip(target);
    else hideTip();
});

document.addEventListener('mouseout', (e) => {
    if (!currentTarget) return;
    if (e.relatedTarget && currentTarget.contains(e.relatedTarget)) return;
    hideTip();
});

// Clicking, scrolling or leaving the window hides it (same as the header buttons)
document.addEventListener('pointerdown', hideTip, true);
document.addEventListener('scroll', hideTip, true);
window.addEventListener('blur', hideTip);
