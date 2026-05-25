// layoutMode.js
// Handles the automatic landscape / portrait layout.
// Uses body.landscape-mode class to drive CSS — keeps JS and CSS in sync.

import { appManager } from './appManager.js';
import { repositionAllSliders } from './main.js';

const CHAR_TABS = new Set(['tab4', 'tab8']);
const LIST_TABS = ['tab9', 'tab3', 'tab6', 'tab7']; // priority order for default

// ── Initialise ─────────────────────────────────────────────────────────────

export function initLayoutMode() {
    // Force split view always active
    localStorage.setItem('splitViewActive', 'true');
    updateBodyClass();
    ensureNavsVisible();

    let prevLandscape = isLandscape();

    window.addEventListener('resize', () => {
        updateBodyClass();
        const nowLandscape = isLandscape();
        if (!prevLandscape && nowLandscape)  onEnterLandscape();
        if (prevLandscape  && !nowLandscape) onExitLandscape();
        prevLandscape = nowLandscape;
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

/** Show one char-sheet tab, hide the other; update UCH active states. */
export function activateCharTab(tabId) {
    CHAR_TABS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const show = id === tabId;

        // Cancel any in-flight delta popups before the tab is hidden, so they don't restart when the tab is shown again.
        if (!show) {
            el.querySelectorAll('.hp-drag-delta').forEach(d => {
                d.style.animation = 'none';
                d.className = 'hp-drag-delta';
            });
            el.querySelectorAll('.coin-delta-popup').forEach(d => {
                d.style.animation = 'none';
                d.className = 'coin-delta-popup';
            });
        }

        el.classList.toggle('active', show);
        el.style.display = show ? 'flex' : 'none';
    });

    document.querySelectorAll('#uch-char-tabs [data-tab]').forEach(btn => {
        btn.classList.toggle('uch-selected', btn.dataset.tab === tabId);
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
    clearPanelInlineStyles();

    // Close char overlay if it was open in portrait
    const charPanel = document.getElementById('char-sheet-panel');
    const rightPanel = document.getElementById('right-panel');
    charPanel?.classList.remove('cs-overlay-open', 'cs-overlay-closing', 'frosted-glass');
    charPanel?.style.removeProperty('top');

    // Ensure both panels are visible for fade-in
    if (charPanel) charPanel.classList.add('visible');
    if (rightPanel) rightPanel.classList.add('visible');

    activateCharTab(localStorage.getItem('activeCharTab') || 'tab4');
    ensureListTabActive();

    const currentListTab = localStorage.getItem('activeTab') || LIST_TABS[0];
    document.querySelectorAll('#uch-char-tabs .tab-button').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.toggle('uch-selected', btn.dataset.tab === (localStorage.getItem('activeCharTab') || 'tab4'));
    });
    document.querySelectorAll('#uch-list-tabs .tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentListTab);
    });

    repositionAllSliders();
}

/** Called when rotating / resizing out of landscape. */
function onExitLandscape() {
    const charPanel   = document.getElementById('char-sheet-panel');
    const tabsContent = document.getElementById('right-panel');

    // Close char overlay if open
    charPanel?.classList.remove('cs-overlay-open', 'cs-overlay-closing', 'frosted-glass');
    charPanel?.style.removeProperty('top');

    // Show right panel with active list tab
    const activeListTab = localStorage.getItem('activeTab') || 'tab9';
    if (charPanel)   { charPanel.style.display = 'none'; }
    if (tabsContent) { tabsContent.style.display = 'flex'; tabsContent.classList.add('visible'); }

    // Set button states: only the active list tab is active
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'uch-selected');
        btn.classList.toggle('active', btn.dataset.tab === activeListTab);
    });

    repositionAllSliders();
}

/**
 * Ensure the UCH header and layout panels have the .visible class
 * so opacity: 0 from .fade-in doesn't persist.
 */
function ensureNavsVisible() {
    ['header-row', 'char-sheet-panel', 'right-panel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('visible');
    });
}

/**
 * Remove inline display styles so CSS landscape rules take effect.
 */
function clearPanelInlineStyles() {
    const charPanel   = document.getElementById('char-sheet-panel');
    const tabsContent = document.getElementById('right-panel');
    if (charPanel)   charPanel.style.display   = '';
    if (tabsContent) tabsContent.style.display = '';
}

/**
 * If no list tab is currently active, click the first available list tab.
 */
function ensureListTabActive() {
    const current = localStorage.getItem('activeTab');
    if (!current || CHAR_TABS.has(current)) {
        const defaultTabId = LIST_TABS[0];
        const btn = document.querySelector(`#uch-list-tabs [data-tab="${defaultTabId}"]`)
                 || document.querySelector(`.tab-button[data-tab="${defaultTabId}"]`);
        if (btn) btn.click();
    }
}