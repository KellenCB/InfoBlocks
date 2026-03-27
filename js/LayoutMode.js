// layoutMode.js
// Handles the automatic landscape / portrait layout.
// Uses body.landscape-mode class to drive CSS — keeps JS and CSS in sync.

import { appManager } from './appManager.js';

const CHAR_TABS = new Set(['tab4', 'tab8']);
const LIST_TABS = ['tab9', 'tab3', 'tab6', 'tab7']; // priority order for default

// ── Initialise ─────────────────────────────────────────────────────────────

export function initLayoutMode() {
    updateBodyClass();

    // Always make all tab navs visible — fixes the case where fade-in
    // skipped navs that were inside a CSS-hidden container on page load.
    ensureNavsVisible();

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

// ── Public helpers ─────────────────────────────────────────────────────────

export function isLandscape() {
    return window.innerWidth >= 1220;
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
}

/** Called when rotating / resizing into portrait. */
function onExitLandscape() {
    ensureNavsVisible();

    // Re-apply portrait panel routing based on the currently stored active tab.
    const currentTab  = localStorage.getItem('activeTab') || LIST_TABS[0];
    const charPanel   = document.getElementById('char-sheet-panel');
    const tabsContent = document.querySelector('.tabs-content');

    if (CHAR_TABS.has(currentTab)) {
        if (charPanel)   charPanel.style.display   = 'flex';
        if (tabsContent) tabsContent.style.display = 'none';
    } else {
        if (charPanel)   charPanel.style.display   = 'none';
        if (tabsContent) tabsContent.style.display = '';
    }

    // Re-apply active class to the correct main nav button.
    // In landscape the main nav was hidden so active state may have drifted.
    document.querySelectorAll('.tab-nav .tab-button').forEach(btn => {
        const isActive = btn.dataset.tab === currentTab
            && !btn.closest('#char-sheet-nav')
            && !btn.closest('#list-tab-nav');
        btn.classList.toggle('active', isActive);
    });
}

/**
 * Ensure every .tab-nav AND its .fade-in ancestor containers have the
 * .visible class so opacity: 0 doesn't persist.
 * fadeInElementsSequentially() skips elements whose offsetParent is null
 * (hidden containers on landscape load), so we force-show them here.
 */
function ensureNavsVisible() {
    document.querySelectorAll('.tab-nav').forEach(nav => {sd
        nav.classList.add('visible');
        // Walk up and make any fade-in ancestor containers visible too.
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
    const tabsContent = document.querySelector('.tabs-content');
    if (charPanel)   charPanel.style.display   = '';
    if (tabsContent) tabsContent.style.display = '';
}

/**
 * If no list tab is currently active (e.g. the user was on a char-sheet tab
 * in portrait before rotating), click the first available list tab so the
 * right panel is never left blank.
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