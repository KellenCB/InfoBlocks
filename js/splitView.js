// splitView.js
// Split view is controlled by layoutMode.js + the split-view-button.
// This module is kept for import compatibility — blockActionsHandler.js and
// overlayHandler.js import isSplitActive / refreshPanelsShowingTab dynamically.

export function isSplitActive() {
    return localStorage.getItem('splitViewActive') === 'true';
}

export function initSplitView() { /* no-op — layout is handled by layoutMode.js */ }

export const panelState     = { left: { activeTab: null }, right: { activeTab: null } };
export const SINGLETON_TABS = new Set();

export function refreshPanelsShowingTab(tabId) {
    import('./appManager.js').then(({ appManager }) => {
        appManager.renderBlocks(tabId);
        appManager.updateTags();
    });
}