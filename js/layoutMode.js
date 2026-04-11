// layoutMode.js
// Handles the automatic landscape / portrait layout.
// Uses body.landscape-mode class to drive CSS — keeps JS and CSS in sync.

import { appManager } from './appManager.js';
import { repositionAllSliders } from './main.js';

const CHAR_TABS = new Set(['tab4', 'tab8']);
const LIST_TABS = ['tab9', 'tab3', 'tab6', 'tab7']; // priority order for default

// ── Initialise ─────────────────────────────────────────────────────────────

export function initLayoutMode() {
    updateBodyClass();
    ensureNavsVisible();

    // ── Wire the split-view button ──────────────────────────────────────────
    const splitBtn = document.getElementById('split-view-button');
    if (splitBtn) {
        // Apply saved state to button appearance on load
        const savedEnabled = localStorage.getItem('splitViewActive') === 'true';
        splitBtn.classList.toggle('active', savedEnabled);

        splitBtn.addEventListener('click', () => {
            const nowEnabled = localStorage.getItem('splitViewActive') === 'true';
            const next = !nowEnabled;
            localStorage.setItem('splitViewActive', String(next));
            splitBtn.classList.toggle('active', next);

            // Re-evaluate landscape state after the toggle
            const wasLandscape = prevLandscape;
            updateBodyClass();
            const nowLandscape = isLandscape();
            if (!wasLandscape && nowLandscape) onEnterLandscape();
            if (wasLandscape && !nowLandscape) onExitLandscape();
            prevLandscape = nowLandscape;
        });
    }

    let prevLandscape = isLandscape();

    window.addEventListener('resize', () => {
        updateBodyClass();
        const nowLandscape = isLandscape();
        if (!prevLandscape && nowLandscape)  onEnterLandscape();
        if (prevLandscape  && !nowLandscape) onExitLandscape();
        prevLandscape = nowLandscape;
    });

    // Wire the left-panel Hazard / Crank toggle.
    document.getElementById('char-sheet-nav')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-tab]');
        if (!btn || !CHAR_TABS.has(btn.dataset.tab)) return;
        activateCharTab(btn.dataset.tab);
    });

    if (isLandscape()) {
        clearPanelInlineStyles();
        activateCharTab(localStorage.getItem('activeCharTab') || 'tab4');
        ensureListTabActive();
    }

    // Stamp the correct activeTab on the add-block overlay when a + button
    // inside the char panel is clicked.
    document.getElementById('char-sheet-panel')?.addEventListener('click', e => {
        const addBtn = e.target.closest('.add-block-button');
        if (!addBtn) return;
        const tabContent = addBtn.closest('.tab-content');
        if (!tabContent) return;
        const overlay = document.querySelector('.add-block-overlay');
        if (overlay) overlay.dataset.activeTab = tabContent.id;
    });
}

// ── Split view compatibility exports ───────────────────────────────────────

export function isSplitActive() {
    return localStorage.getItem('splitViewActive') === 'true';
}

export function initSplitView() { /* no-op — layout is handled by initLayoutMode() */ }

export const panelState     = { left: { activeTab: null }, right: { activeTab: null } };
export const SINGLETON_TABS = new Set();

export function refreshPanelsShowingTab(tabId) {
    appManager.renderBlocks(tabId);
    appManager.updateTags();
}

// ── Public helpers ─────────────────────────────────────────────────────────

export function isLandscape() {
    return window.innerWidth >= 1220 && localStorage.getItem('splitViewActive') === 'true';
}

/** Show one char-sheet tab, hide the other; update nav active states. */
export function activateCharTab(tabId) {
    CHAR_TABS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const show = id === tabId;
        el.classList.toggle('active', show);
        el.style.display = show ? 'flex' : 'none';
    });

    document.querySelectorAll('#char-sheet-nav [data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    localStorage.setItem('activeCharTab', tabId);
    appManager.renderBlocks(tabId);
    appManager.updateTags();
}

// ── Private ────────────────────────────────────────────────────────────────

function updateBodyClass() {
    document.body.classList.toggle('landscape-mode', isLandscape());
}

/** Called when rotating / resizing into landscape. */
function onEnterLandscape() {
    ensureNavsVisible();
    clearPanelInlineStyles();
    activateCharTab(localStorage.getItem('activeCharTab') || 'tab4');
    ensureListTabActive();

    // Re-apply active class to the correct #list-tab-nav button.
    const currentTab = localStorage.getItem('activeTab') || LIST_TABS[0];
    document.querySelectorAll('#list-tab-nav .tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });

    repositionAllSliders();
}

/** Called when rotating / resizing out of landscape.
 *  Prioritises the left (char-sheet) panel — whichever of tab4/tab8
 *  was last active is shown, and the right panel is hidden. */
function onExitLandscape() {
    ensureNavsVisible();

    const activeCharTab = localStorage.getItem('activeCharTab') || 'tab4';
    const charPanel     = document.getElementById('char-sheet-panel');
    const tabsContent   = document.getElementById('right-panel');

    if (charPanel)   charPanel.style.display   = 'flex';
    if (tabsContent) tabsContent.style.display = 'none';

    // Ensure the correct char-sheet tab is active and rendered.
    activateCharTab(activeCharTab);

    // Re-apply active class to the correct main nav button.
    document.querySelectorAll('.tab-nav .tab-button').forEach(btn => {
        const isActive = btn.dataset.tab === activeCharTab
            && !btn.closest('#char-sheet-nav')
            && !btn.closest('#list-tab-nav');
        btn.classList.toggle('active', isActive);
    });

    repositionAllSliders();
}

/**
 * Ensure every .tab-nav AND its .fade-in ancestor containers have the
 * .visible class so opacity: 0 doesn't persist.
 */
function ensureNavsVisible() {
    document.querySelectorAll('.tab-nav').forEach(nav => {
        nav.classList.add('visible');
        let el = nav.parentElement;
        while (el && el !== document.body) {
            if (el.classList.contains('fade-in')) el.classList.add('visible');
            el = el.parentElement;
        }
    });
}

/**
 * Remove inline display styles set by main.js portrait-routing code so the
 * body.landscape-mode CSS rules can take effect unobstructed.
 */
function clearPanelInlineStyles() {
    const charPanel   = document.getElementById('char-sheet-panel');
    const tabsContent = document.getElementById('right-panel');
    if (charPanel)   charPanel.style.display   = '';
    if (tabsContent) tabsContent.style.display = '';
}

/**
 * If no list tab is currently active, click the first available list tab
 * so the right panel is never left blank.
 */
function ensureListTabActive() {
    const current = localStorage.getItem('activeTab');
    if (!current || CHAR_TABS.has(current)) {
        const defaultTabId = LIST_TABS[0];
        const btn = document.querySelector(`#list-tab-nav [data-tab="${defaultTabId}"]`)
                 || document.querySelector(`.tab-nav .tab-button[data-tab="${defaultTabId}"]`);
        if (btn) btn.click();
    }
}