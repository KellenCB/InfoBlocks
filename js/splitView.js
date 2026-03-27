// splitView.js
// Split view has been replaced by the automatic landscape layout in layoutMode.js.
// This module is kept only for import compatibility — blockActionsHandler.js and
// other files import isSplitActive / refreshPanelsShowingTab dynamically.

export function isSplitActive()  { return false; }
export function initSplitView()  { /* no-op — layout is now CSS + layoutMode.js */ }

export const panelState     = { left: { activeTab: null }, right: { activeTab: null } };
export const SINGLETON_TABS = new Set();

export function refreshPanelsShowingTab(tabId) {
    // In the new system a simple re-render is all that's needed.
    import('./appManager.js').then(({ appManager }) => {
        appManager.renderBlocks(tabId);
        appManager.updateTags();
    });
}