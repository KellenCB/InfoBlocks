import { initSplitView } from './layoutMode.js';
import { appManager, actionButtonHandlers } from './appManager.js';
import { blockActionsHandler } from './blockActionsHandler.js';
import { filterManager } from './filterManager.js';
import { blockTypeConfig } from './tagConfig.js';
import { initScrollFades, initDragToScroll } from './appManager.js';
import { initDiceRoller } from './diceRoller.js';
import { evaluateStatExpression } from './uiHandlers.js';
import { initLayoutMode, activateCharTab } from './layoutMode.js';
export function repositionAllSliders() {
    requestAnimationFrame(() => {
        document.querySelectorAll('.uch-tab-group').forEach(group => {
            const slider = group.querySelector('.uch-slider');
            const activeBtn = group.querySelector('.tab-button.active, .tab-button.uch-selected');
            if (!slider || !activeBtn) return;
            slider.style.transition = 'none';
            const groupRect = group.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            slider.style.left = (btnRect.left - groupRect.left) + 'px';
            slider.style.top = (btnRect.top - groupRect.top) + 'px';
            slider.style.width = btnRect.width + 'px';
            slider.style.height = btnRect.height + 'px';
            requestAnimationFrame(() => { slider.style.transition = ''; });
        });
    });
}

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightInText = (text, query) => {
    if (!query) return text;
    const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(re, '<span class="highlight">$1</span>');
};

const highlightInHTML = (html, query) => {
    if (!query) return html;
    const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
    const container = document.createElement('div');
    container.innerHTML = html;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
        const parent = node.parentNode;
        let last = 0;
        const frag = document.createDocumentFragment();
        const txt = node.nodeValue;
        txt.replace(re, (match, p1, offset) => {
            if (offset > last) frag.appendChild(document.createTextNode(txt.slice(last, offset)));
            const span = document.createElement('span');
            span.className = 'highlight';
            span.textContent = match;
            frag.appendChild(span);
            last = offset + match.length;
        });
        if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
        if (frag.childNodes.length) parent.replaceChild(frag, node);
    });
    return container.innerHTML;
};

function stripHighlightsFrom(el) {
    el.querySelectorAll('.highlight').forEach(span => span.replaceWith(span.textContent));
    el.normalize();
}

function applyHighlights(tabNumber, query) {
    const sec = document.getElementById(`results_section_${tabNumber}`);
    if (!sec) return;

    // Strip old highlights from the elements we're about to process
    sec.querySelectorAll('.block-title, .block-body, .block-property').forEach(stripHighlightsFrom);

    if (!query) return;
    sec.querySelectorAll('.block-title').forEach(el => { el.innerHTML = highlightInText(el.innerHTML, query); });
    sec.querySelectorAll('.block-body').forEach(el => { el.innerHTML = highlightInHTML(el.innerHTML, query); });
    sec.querySelectorAll('.block-property').forEach(el => { el.innerHTML = highlightInHTML(el.innerHTML, query); });
}

function applyViewerHighlights(query) {
    const viewer  = document.getElementById('session_log_viewer');
    if (!viewer) return;
    const titleEl = viewer.querySelector('.session-viewer-title');
    const bodyEl  = viewer.querySelector('#session_viewer_body');

    if (titleEl) stripHighlightsFrom(titleEl);
    if (bodyEl) stripHighlightsFrom(bodyEl);

    if (!query) return;
    if (titleEl && titleEl.contentEditable !== 'true') {
        titleEl.innerHTML = highlightInText(titleEl.innerHTML, query);
    }
    if (bodyEl && bodyEl.contentEditable !== 'true') {
        bodyEl.innerHTML = highlightInHTML(bodyEl.innerHTML, query);
    }
}

// Re-apply highlights whenever filterManager re-renders blocks
document.addEventListener('blocksRerendered', e => {
    const tabNumber = e.detail.tab.replace('tab', '');
    const query = document.getElementById('uch-search')?.value.trim() || '';
    applyHighlights(tabNumber, query);
});

document.addEventListener('sessionViewerRendered', () => {
    const query = document.getElementById('uch-search')?.value.trim() || '';
    if (query) applyViewerHighlights(query);
});

// 📌 Attach event listeners efficiently
const attachEventListeners = () => {
    console.log("Attaching event listeners");

    actionButtonHandlers.attachActionButtonListeners();
    keyboardShortcutsHandler.handleKeyboardShortcuts();

    blockActionsHandler.attachBlockActions();
};

/* ===================================================================*/
/* ========================== MENU BUTTON ============================*/
/* ===================================================================*/

const menuButton = document.getElementById("Menu_button");
const menuOverlay = document.getElementById("menu_overlay");

function closeMenu() {
    closePopoverAnimated(menuOverlay, 'active');
    menuButton?.classList.remove("menu-button-open");
}

function openMenu() {
    closeAllUchPopovers('menu');
    positionPopoverBelow(menuOverlay, menuButton);
    menuOverlay.classList.add("active");
    menuButton.classList.add("menu-button-open");
}

if (menuButton && menuOverlay) {
    menuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (menuOverlay.classList.contains("active")) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    menuOverlay.addEventListener("click", (e) => e.stopPropagation());
    setupPopoverHover(menuButton, menuOverlay, closeMenu);
}

// Click outside to close menu popover
document.addEventListener("click", (e) => {
    if (menuOverlay?.classList.contains("active") && !e.target.closest("#menu_overlay") && !e.target.closest("#Menu_button")) {
        closeMenu();
    }
});

/* ===================================================================*/
/* ================= CENTRAL OVERLAY CANCEL BUTTONS =================*/
/* ===================================================================*/

// All overlays whose cancel/close button simply dismisses the overlay.
// Note: cancel_remove_button is handled in blockActionsHandler because it
// also needs to clear pendingDeleteBlockId.
const overlayCloseConfigs = [
    { buttonId: 'cancel_clear_button',         overlaySelector: '.cleardata-overlay:not(.long-rest-overlay)' },
    { buttonId: 'close_spell_slot_edit',       overlaySelector: '.spell-slot-edit-overlay' },
    { buttonId: 'cancel_long_rest_button',     overlaySelector: '.long-rest-overlay' },
];

function initOverlayCancelButtons() {
    overlayCloseConfigs.forEach(({ buttonId, overlaySelector }) => {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.querySelector(overlaySelector)?.classList.remove('show');
            });
        } else {
            console.warn(`initOverlayCancelButtons: button "${buttonId}" not found.`);
        }
    });
    console.log('✅ Overlay cancel buttons initialised centrally.');
}

/* ===================================================================*/
/* ======================= DICE ROLLER POPOVERS =======================*/
/* ===================================================================*/

const diceMenuButton    = document.getElementById("dice-menu-button");
const diceHistoryButton = document.getElementById("dice-history-button");
const dicePanel         = document.getElementById("dice-panel");
const diceHistoryPanel  = document.getElementById("dice-history-popover");
const diceMenuImg       = diceMenuButton?.querySelector("img");

function positionPopoverBelow(popover, button) {
    const rect = button.getBoundingClientRect();
    const popWidth = popover.offsetWidth || 340;
    let left = rect.left + rect.width / 2 - popWidth / 2;
    if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;
    if (left < 10) left = 10;
    popover.style.top = (rect.bottom + 8) + 'px';
    popover.style.left = left + 'px';
}

function positionPopoverAbove(popover, button) {
    const rect = button.getBoundingClientRect();
    const popWidth = popover.offsetWidth || 340;
    const popHeight = popover.offsetHeight || 200;
    let left = rect.left + rect.width / 2 - popWidth / 2;
    if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;
    if (left < 10) left = 10;
    popover.style.top = (rect.top - popHeight - 8) + 'px';
    popover.style.left = left + 'px';
}

/** Animate a popover closed, then remove the open class */
function closePopoverAnimated(el, openClass = 'open') {
    if (!el || !el.classList.contains(openClass) || el.classList.contains('closing')) return;
    el.classList.add('closing');
    el.addEventListener('animationend', () => {
        el.classList.remove(openClass, 'closing', 'popover-above');
    }, { once: true });
    // Fallback if animationend doesn't fire
    setTimeout(() => el.classList.remove(openClass, 'closing', 'popover-above'), 250);
}

/** Close every UCH popover except the named one */
function closeAllUchPopovers(except) {
    const sortPop = document.getElementById('uch-sort-popover');
    const viewPop = document.getElementById('uch-view-popover');
    if (except !== 'sort' && sortPop?.classList.contains('open'))
        closePopoverAnimated(sortPop);
    if (except !== 'view' && viewPop?.classList.contains('open'))
        closePopoverAnimated(viewPop);
    if (except !== 'menu' && menuOverlay?.classList.contains('active')) {
        closePopoverAnimated(menuOverlay, 'active');
        menuButton?.classList.remove('menu-button-open');
    }
    if (except !== 'dice' && dicePanel?.classList.contains('open')) {
        closePopoverAnimated(dicePanel);
        diceMenuButton?.classList.remove('active');
        if (diceMenuImg) diceMenuImg.src = "images/Dice_Button_v2.svg";
    }
    if (except !== 'history' && diceHistoryPanel?.classList.contains('open')) {
        closePopoverAnimated(diceHistoryPanel);
        diceHistoryButton?.classList.remove('active');
    }
    if (except !== 'latest') closeLatestRoll();
}

/** Hover delay: close popover after mouse leaves both button and popover */
function setupPopoverHover(button, popover, closeFn) {
    let hoverTimer = null;
    const startClose = () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(closeFn, 300);
    };
    const cancelClose = () => clearTimeout(hoverTimer);
    button.addEventListener('mouseleave', startClose);
    button.addEventListener('mouseenter', cancelClose);
    popover.addEventListener('mouseenter', cancelClose);
    popover.addEventListener('mouseleave', startClose);
}

function setDicePanelState(open) {
    if (open) {
        closeAllUchPopovers('dice');
        dicePanel.classList.add("open", "popover-above");
        diceMenuButton.classList.toggle("active", true);
        if (diceMenuImg) diceMenuImg.src = "images/Dice_Button_v2_Green.svg";
        positionPopoverAbove(dicePanel, diceMenuButton);
    } else {
        closePopoverAnimated(dicePanel);
        diceMenuButton.classList.remove("active");
        if (diceMenuImg) diceMenuImg.src = "images/Dice_Button_v2.svg";
    }
}

const diceLatestRoll = document.getElementById('dice-latest-roll');
let latestRollTimer = null;

function setDiceHistoryState(open) {
    if (open) {
        closeAllUchPopovers('history');
        closeLatestRoll();
        diceHistoryPanel.classList.add("open", "popover-above");
        diceHistoryButton.classList.toggle("active", true);
        positionPopoverAbove(diceHistoryPanel, diceHistoryButton);
        setTimeout(() => {
            initScrollFades('.roll-results', '--dice-fade-top-opacity', '--dice-fade-bottom-opacity', '_diceFadeHandler');
        }, 100);
    } else {
        closePopoverAnimated(diceHistoryPanel);
        diceHistoryButton.classList.remove("active");
    }
}

function showLatestRoll() {
    const latestEntry = document.querySelector('#dice-history-popover .roll-history-entry.latest-roll');
    if (!latestEntry || !diceLatestRoll) return;

    clearTimeout(latestRollTimer);
    diceLatestRoll.innerHTML = '';
    const clone = latestEntry.cloneNode(true);
    clone.classList.remove('new-entry');
    clone.style.cssText = 'margin-bottom: 0;';
    diceLatestRoll.appendChild(clone);
    diceLatestRoll.classList.add('open', 'popover-above');
    positionPopoverAbove(diceLatestRoll, document.getElementById('dice-floating-pill'));

    latestRollTimer = setTimeout(() => closeLatestRoll(), 3000);
}

function closeLatestRoll() {
    clearTimeout(latestRollTimer);
    if (diceLatestRoll?.classList.contains('open')) {
        closePopoverAnimated(diceLatestRoll);
    }
}

if (diceMenuButton && dicePanel) {
    diceMenuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dicePanel.classList.contains("open")) {
            setDicePanelState(false);
        } else {
            setDicePanelState(true);
        }
    });
}

if (diceHistoryButton && diceHistoryPanel) {
    diceHistoryButton.addEventListener("click", (e) => {
        e.stopPropagation();
        closeLatestRoll();
        if (diceHistoryPanel.classList.contains("open")) {
            setDiceHistoryState(false);
        } else {
            setDiceHistoryState(true);
        }
    });
}

// Show latest roll result when any dice are rolled
document.addEventListener("diceRolled", () => {
    // If full history is open, just let the new entry appear there
    if (diceHistoryPanel?.classList.contains("open")) return;
    showLatestRoll();
});

// Click outside to close dice popovers
document.addEventListener("click", (e) => {
    if (dicePanel?.classList.contains("open") && !e.target.closest("#dice-panel") && !e.target.closest("#dice-menu-button")) {
        setDicePanelState(false);
    }
    if (diceHistoryPanel?.classList.contains("open") && !e.target.closest("#dice-history-popover") && !e.target.closest("#dice-history-button")) {
        setDiceHistoryState(false);
    }
    if (diceLatestRoll?.classList.contains("open") && !e.target.closest("#dice-latest-roll")) {
        closeLatestRoll();
    }
});

// Stop clicks inside popovers from bubbling
dicePanel?.addEventListener("click", (e) => e.stopPropagation());
diceHistoryPanel?.addEventListener("click", (e) => e.stopPropagation());
diceLatestRoll?.addEventListener("click", (e) => e.stopPropagation());

// Hover delay close
if (diceMenuButton && dicePanel) setupPopoverHover(diceMenuButton, dicePanel, () => setDicePanelState(false));
if (diceHistoryButton && diceHistoryPanel) setupPopoverHover(diceHistoryButton, diceHistoryPanel, () => setDiceHistoryState(false));

// Pause latest-roll auto-close when hovering it
diceLatestRoll?.addEventListener("mouseenter", () => clearTimeout(latestRollTimer));
diceLatestRoll?.addEventListener("mouseleave", () => {
    latestRollTimer = setTimeout(() => closeLatestRoll(), 3000);
});

initDiceRoller();

/* ===================================================================*/
/* ===================== SEQUENTIAL FADE IN ==========================*/
/* ===================================================================*/

const fadeInElementsSequentially = (container = document) => {
    const allFadeInElements = container.querySelectorAll('.fade-in');
    const visibleElements = Array.from(allFadeInElements).filter(el => el.offsetParent !== null);
    console.log("Found visible fade-in elements:", visibleElements.length);
    visibleElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('visible');
        }, index * 300);
    });
};

/* ===================================================================*/
/* =================== UCH SLIDER FUNCTIONS =========================*/
/* ===================================================================*/

function initUchSlider(group) {
    const slider = document.createElement('div');
    slider.classList.add('uch-slider');
    group.style.position = 'relative';
    group.insertBefore(slider, group.firstChild);

    function moveSlider(btn) {
        const groupRect = group.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        slider.style.left = (btnRect.left - groupRect.left) + 'px';
        slider.style.top = (btnRect.top - groupRect.top) + 'px';
        slider.style.width = btnRect.width + 'px';
        slider.style.height = btnRect.height + 'px';
    }

    const activeBtn = group.querySelector('.tab-button.active, .tab-button.uch-selected');
    if (activeBtn) {
        slider.style.transition = 'none';
        requestAnimationFrame(() => {
            moveSlider(activeBtn);
            requestAnimationFrame(() => { slider.style.transition = ''; });
        });
    }

    group.addEventListener('click', e => {
        const btn = e.target.closest('.tab-button');
        if (btn) moveSlider(btn);
    });

    new ResizeObserver(() => {
        const active = group.querySelector('.tab-button.active, .tab-button.uch-selected');
        if (!active) return;
        slider.style.transition = 'none';
        moveSlider(active);
        requestAnimationFrame(() => { slider.style.transition = ''; });
    }).observe(group);
}

/* ===================================================================*/
/* ====================== DATA MIGRATION =============================*/
/* ===================================================================*/

function migrateToTab9() {
    if (localStorage.getItem("migration_tab9_done")) return;

    console.log("🔄 Running tab9 migration...");

    const sources = [
        { key: "userBlocks_tab1", blockType: "Magic Item" },
        { key: "userBlocks_tab2", blockType: "Spell" },
        { key: "userBlocks_tab4", blockType: "Hazard" },
        { key: "userBlocks_tab8", blockType: "Crank" },
    ];

    let merged = JSON.parse(localStorage.getItem("userBlocks_tab9") || "[]");

    sources.forEach(({ key, blockType }) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
            const blocks = JSON.parse(raw);
            if (!Array.isArray(blocks)) return;
            blocks.forEach(block => { block.blockType = blockType; });
            merged = merged.concat(blocks);
            localStorage.removeItem(key);
            console.log(`✅ Migrated ${blocks.length} blocks from ${key} with type "${blockType}"`);
        } catch (e) {
            console.error(`❌ Failed to migrate ${key}:`, e);
        }
    });

    localStorage.setItem("userBlocks_tab9", JSON.stringify(merged));
    localStorage.setItem("migration_tab9_done", "true");
    console.log(`✅ Tab9 migration complete. ${merged.length} total blocks in tab9.`);
}

function migrateTab5ToTab3() {
    if (localStorage.getItem("migration_tab5_to_tab3_done")) return;

    console.log("🔄 Running tab5 → tab3 migration...");

    const raw = localStorage.getItem("userBlocks_tab5");
    if (raw) {
        try {
            const tab5Blocks = JSON.parse(raw);
            if (Array.isArray(tab5Blocks)) {
                tab5Blocks.forEach(block => {
                    block.blockType = block.blockType || ["Quest"];
                    // Ensure blockType is always an array
                    if (!Array.isArray(block.blockType)) {
                        block.blockType = [block.blockType];
                    }
                });
                const existing = JSON.parse(localStorage.getItem("userBlocks_tab3") || "[]");
                const merged = existing.concat(tab5Blocks);
                localStorage.setItem("userBlocks_tab3", JSON.stringify(merged));
                localStorage.removeItem("userBlocks_tab5");
                console.log(`✅ Migrated ${tab5Blocks.length} blocks from tab5 to tab3 with type "Quest"`);
            }
        } catch (e) {
            console.error("❌ Failed to migrate tab5 blocks:", e);
        }
    }

    localStorage.setItem("migration_tab5_to_tab3_done", "true");
    console.log("✅ Tab5→Tab3 migration complete.");
}

/* ===================================================================*/
/* ============= BLOCK TYPE FILTER BUTTONS (from config) =============*/
/* ===================================================================*/

function migrateTab3Schema() {
    if (localStorage.getItem("migration_tab3_schema_done")) return;

    console.log("🔄 Running tab3 schema migration...");

    const raw = localStorage.getItem("userBlocks_tab3");
    if (raw) {
        try {
            const blocks = JSON.parse(raw);
            if (Array.isArray(blocks)) {
                blocks.forEach(block => {
                    // 1. Normalize blockType to array
                    if (!Array.isArray(block.blockType)) {
                        block.blockType = block.blockType ? [block.blockType] : [];
                    }

                    // 2. Rename "Other" → "Notes"
                    block.blockType = block.blockType.map(t => t === "Other" ? "Notes" : t);

                    // 3. Add location field on every tab3 block (null = no location)
                    if (!('location' in block)) {
                        block.location = null;
                    }

                    // 4. Quest-specific fields
                    if (block.blockType.includes("Quest")) {
                        if (!('status' in block)) {
                            block.status = "active";
                        }
                        if (!('objectives' in block)) {
                            const parsed = parseObjectivesFromText(block.text);
                            block.objectives   = parsed.objectives;
                            block.text         = parsed.remainingText;
                        }
                    }
                });

                localStorage.setItem("userBlocks_tab3", JSON.stringify(blocks));
                console.log(`✅ Migrated ${blocks.length} tab3 blocks (rename, location, quest fields)`);
            }
        } catch (e) {
            console.error("❌ Failed to migrate tab3 schema:", e);
        }
    }

    localStorage.setItem("migration_tab3_schema_done", "true");
    console.log("✅ Tab3 schema migration complete.");
}

function parseObjectivesFromText(text) {
    if (!text || typeof text !== "string") {
        return { objectives: [], remainingText: text || "" };
    }

    const tmp = document.createElement("div");
    tmp.innerHTML = text;

    const objectives = [];
    tmp.querySelectorAll("ul, ol").forEach(list => {
        list.querySelectorAll("li").forEach(li => {
            const itemText = (li.textContent || "").trim();
            if (itemText) objectives.push({ text: itemText, done: false });
        });
        list.remove();
    });

    return {
        objectives,
        remainingText: tmp.innerHTML.trim()
    };
}

// Populate the block-type-tags filter divs in each tab's filter panel
// and wire up their click handlers — driven entirely by blockTypeConfig.
function initBlockTypeFilterButtons() {
    Object.entries(blockTypeConfig).forEach(([tabId, config]) => {
        const tabNum = tabId.replace("tab", "");
        const container = document.getElementById(`character_type_tags_${tabNum}`);
        if (!container) return;
        container.innerHTML = config.types.map(type =>
            `<button class="tag-button ${config.className}" data-tag="${type}">${type}</button>`
        ).join("");
        // filterManager.handleTagClick handles all interaction including shift+click
    });
}

/* ===================================================================*/
/* ========================= DOM CONTENT LOADED ======================*/
/* ===================================================================*/

document.addEventListener("DOMContentLoaded", () => {

    const CHAR_TABS  = new Set(['tab4', 'tab8']);
    const charPanel  = document.getElementById('char-sheet-panel');
    const tabsContent = document.getElementById('right-panel');

    // Restore filter section visibility for each tab
    [4, 6, 7, 8, 9].forEach(num => {
        const tabId = `tab${num}`;
        const saved = localStorage.getItem(`filterVisible_${tabId}`);
        if (saved === "false") {
            const tab = document.getElementById(tabId);
            if (!tab) return;
            const wrapper = tab.querySelector('.filter-section-wrapper');
            if (!wrapper) return;
            wrapper.classList.add('filter-panel-closed');
        }
    });

    // Init UCH sliders (green glow behind active tab)
    document.querySelectorAll('.uch-tab-group').forEach(group => initUchSlider(group));

    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    const storedActiveTab = localStorage.getItem("activeTab");
    const validTabs = ["tab3", "tab4", "tab6", "tab7", "tab8", "tab9"];
    const defaultActiveTab = tabContents.length > 0 ? tabContents[0].id : null;
    const activeTabId = (storedActiveTab && validTabs.includes(storedActiveTab))
        ? storedActiveTab
        : defaultActiveTab;

    // Hide all tab contents initially
    tabContents.forEach(content => {
        content.classList.remove("active");
        content.style.display = "none";
    });

    if (activeTabId) {
        const activeContent = document.getElementById(activeTabId);
        if (activeContent) {
            activeContent.classList.add("active");
            activeContent.style.display = "flex";
        }

        // Panel routing — explicitly set display and ensure .visible for fade-in
        if (CHAR_TABS.has(activeTabId)) {
            if (charPanel)   { charPanel.style.display = 'flex'; charPanel.classList.add('visible'); }
            if (tabsContent) { tabsContent.style.display = 'none'; }
        } else {
            if (charPanel)   { charPanel.style.display = 'none'; }
            if (tabsContent) { tabsContent.style.display = 'flex'; tabsContent.classList.add('visible'); }
        }
    }

    // Set initial active state on UCH buttons
    const inLandscapeInit = document.body.classList.contains('landscape-mode');
    tabButtons.forEach(button => {
        if (inLandscapeInit) {
            const activeCharTab = localStorage.getItem('activeCharTab') || 'tab4';
            const activeListTab = localStorage.getItem('activeTab') || 'tab9';
            if (CHAR_TABS.has(button.dataset.tab)) {
                button.classList.toggle('uch-selected', button.dataset.tab === activeCharTab);
                button.classList.remove('active');
            } else {
                button.classList.toggle('active', button.dataset.tab === activeListTab);
                button.classList.remove('uch-selected');
            }
        } else {
            button.classList.toggle('active', button.dataset.tab === activeTabId);
        }
    });

    // ── UCH tab click handler ──────────────────────────────────────────────
    tabButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const targetTab     = event.currentTarget.dataset.tab;
            const targetContent = document.getElementById(targetTab);
            if (!targetTab) return;

            const inLandscape = document.body.classList.contains('landscape-mode');
            const isCharTab   = CHAR_TABS.has(targetTab);

            if (inLandscape) {
                if (isCharTab) {
                    document.querySelectorAll('#uch-char-tabs .tab-button').forEach(btn => {
                        btn.classList.remove('active', 'uch-selected');
                    });
                    event.currentTarget.classList.add('uch-selected');
                    activateCharTab(targetTab);
                } else {
                    document.querySelectorAll('#uch-list-tabs .tab-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    event.currentTarget.classList.add('active');

                    tabContents.forEach(content => {
                        if (CHAR_TABS.has(content.id)) return;
                        content.classList.remove("active");
                        content.style.display = "none";
                    });
                    if (targetContent) {
                        targetContent.classList.add("active");
                        targetContent.style.display = "flex";
                    }
                    localStorage.setItem("activeTab", targetTab);
                }
            } else {
                // Portrait: one active tab at a time
                tabButtons.forEach(btn => btn.classList.remove("active", "uch-selected"));
                event.currentTarget.classList.add("active");

                tabContents.forEach(content => {
                    content.classList.remove("active");
                    content.style.display = "none";
                });
                if (targetContent) {
                    targetContent.classList.add("active");
                    targetContent.style.display = "flex";
                }

                // Panel routing — always use explicit display values + ensure .visible
                if (isCharTab) {
                    if (charPanel)   { charPanel.style.display = 'flex'; charPanel.classList.add('visible'); }
                    if (tabsContent) { tabsContent.style.display = 'none'; }
                    activateCharTab(targetTab);
                } else {
                    if (charPanel)   { charPanel.style.display = 'none'; }
                    if (tabsContent) { tabsContent.style.display = 'flex'; tabsContent.classList.add('visible'); }
                }
                localStorage.setItem("activeTab", targetTab);
            }

            appManager.updateTags();
            actionButtonHandlers.attachActionButtonListeners();

            const tabSuffix = targetTab.replace("tab", "");
            filterManager.applyFilters(tabSuffix);
            appManager.updateViewToggleDropdown(tabSuffix);
            if (targetContent) {
                setTimeout(() => {
                    const cs = window.getComputedStyle(targetContent);
                    if (cs.display === "none") targetContent.style.display = "flex";
                }, 100);
            }
        });
    });

    // ── UCH universal search bar ────────────────────────────────────────────
    const uchSearch = document.getElementById('uch-search');
    const uchSearchClear = document.getElementById('uch-search-clear');
    if (uchSearch) {
        uchSearch.addEventListener('input', () => {
            const activeTab = appManager.getActiveTab();
            const tabSuffix = activeTab.replace('tab', '');
            filterManager.applyFilters(tabSuffix);
            applyHighlights(tabSuffix, uchSearch.value.trim());
            uchSearch.classList.toggle('has-value', uchSearch.value.trim().length > 0);
        });
        uchSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                uchSearch.value = '';
                uchSearch.classList.remove('has-value');
                const activeTab = appManager.getActiveTab();
                const tabSuffix = activeTab.replace('tab', '');
                filterManager.applyFilters(tabSuffix);
                applyHighlights(tabSuffix, '');
                uchSearch.blur();
            }
        });
    }
    if (uchSearchClear) {
        uchSearchClear.addEventListener('click', () => {
            uchSearch.value = '';
            uchSearch.classList.remove('has-value');
            const activeTab = appManager.getActiveTab();
            const tabSuffix = activeTab.replace('tab', '');
            filterManager.applyFilters(tabSuffix);
            applyHighlights(tabSuffix, '');
            uchSearch.focus();
        });
    }

    // ── UCH universal add button ─────────────────────────────────────────────
    const uchAddBtn = document.getElementById('uch-add-button');
    if (uchAddBtn) {
        uchAddBtn.addEventListener('click', () => {
            const activeTab = appManager.getActiveTab();
            if (activeTab === 'tab9') {
                appManager.startInlineAdd();
            } else if (activeTab === 'tab3') {
                appManager.startNotesAdd();
            } else if (activeTab === 'tab6') {
                appManager.startInventoryAdd();
            } else if (activeTab === 'tab7') {
                document.getElementById('add_block_button_7')?.click();
            }
        });
    }

    // ── UCH sort button (popover dropdown) ───────────────────────────────────
    const uchSortBtn = document.getElementById('uch-sort-button');
    if (uchSortBtn) {
        const sortPopover = document.createElement('div');
        sortPopover.className = 'uch-dropdown-popover';
        sortPopover.id = 'uch-sort-popover';
        sortPopover.innerHTML = `
            <button class="sort-item" data-sort="newest">Newest</button>
            <button class="sort-item" data-sort="oldest">Oldest</button>
            <button class="sort-item" data-sort="alpha">A–Z</button>
            <button class="sort-item" data-sort="unalpha">Z–A</button>
        `;
        document.body.appendChild(sortPopover);

        const closeSortPopover = () => closePopoverAnimated(sortPopover);

        uchSortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sortPopover.classList.contains('open')) {
                closeSortPopover();
            } else {
                closeAllUchPopovers('sort');
                sortPopover.classList.add('open');
                positionPopoverBelow(sortPopover, uchSortBtn);
            }
        });

        sortPopover.addEventListener('click', (e) => {
            const item = e.target.closest('.sort-item');
            if (!item) return;
            e.stopPropagation();
            const mode = item.dataset.sort;
            const activeTab = appManager.getActiveTab();
            localStorage.setItem(`activeSortOrder_${activeTab}`, mode);
            sortPopover.querySelectorAll('.sort-item').forEach(i => i.classList.toggle('selected', i === item));
            closeSortPopover();
            const tabSuffix = activeTab.replace('tab', '');
            filterManager.applyFilters(tabSuffix);
        });

        document.addEventListener('click', () => { if (sortPopover.classList.contains('open')) closeSortPopover(); });
        sortPopover.addEventListener('click', (e) => e.stopPropagation());
        setupPopoverHover(uchSortBtn, sortPopover, closeSortPopover);
    }

    // ── UCH viewstate button (popover dropdown) ──────────────────────────────
    const uchViewBtn = document.getElementById('uch-view-button');
    if (uchViewBtn) {
        const viewPopover = document.createElement('div');
        viewPopover.className = 'uch-dropdown-popover';
        viewPopover.id = 'uch-view-popover';
        viewPopover.innerHTML = `
            <button class="view-toggle-item" data-state="expanded">Expand all</button>
            <button class="view-toggle-item" data-state="condensed">Condense all</button>
            <button class="view-toggle-item" data-state="minimized">Minimize all</button>
        `;
        document.body.appendChild(viewPopover);

        const closeViewPopover = () => closePopoverAnimated(viewPopover);

        uchViewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (viewPopover.classList.contains('open')) {
                closeViewPopover();
            } else {
                closeAllUchPopovers('view');
                viewPopover.classList.add('open');
                positionPopoverBelow(viewPopover, uchViewBtn);
            }
        });

        viewPopover.addEventListener('click', (e) => {
            const item = e.target.closest('.view-toggle-item');
            if (!item) return;
            e.stopPropagation();
            const state = item.dataset.state;
            appManager.updateBlocksViewState(state);
            closeViewPopover();
        });

        document.addEventListener('click', () => { if (viewPopover.classList.contains('open')) closeViewPopover(); });
        viewPopover.addEventListener('click', (e) => e.stopPropagation());
        setupPopoverHover(uchViewBtn, viewPopover, closeViewPopover);
    }

    appManager.renderBlocks(activeTabId);
});

// 📌 Make character sheet editable fields more user friendly
document.querySelectorAll("#tab4 .editable, #tab8 .editable").forEach(field => {
    field.addEventListener("focus", function () {
        if (this.classList.contains('stat-subvalue') && this.dataset.rawExpression !== undefined) {
            this.textContent = this.dataset.rawExpression;
            this.dataset.initialValue = this.dataset.rawExpression;
        } else {
            this.dataset.initialValue = this.textContent;
        }
        const range = document.createRange();
        range.selectNodeContents(this);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        this.style.opacity = "1";
    });

    field.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            this.blur();
            window.getSelection().removeAllRanges();
        } else if (e.key === "Escape") {
            e.preventDefault();
            if (this.dataset.initialValue !== undefined) {
                this.textContent = this.dataset.initialValue;
            }
            this.blur();
            window.getSelection().removeAllRanges();
        }
    });
});
    
// Clear filters and reset results for the specific tab
const clearFilters = (event) => {
    const tabNumber = event.currentTarget.id.split("_").pop();
    // Also clear block-type button selections (these live only in the DOM)
    document.getElementById(`character_type_tags_${tabNumber}`)
        ?.querySelectorAll('.tag-button.selected')
        .forEach(b => b.classList.remove('selected'));
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) searchInput.value = '';
    filterManager.clearSelectedTags(`tab${tabNumber}`);
    filterManager.applyFilters(tabNumber);
};

document.querySelectorAll(".clear_filters_button").forEach(button => {
    button.addEventListener("click", clearFilters);
});

// Toggle group open/closed.
// On collapse: read selected tags from the body and build chips dynamically.
// On expand: remove any existing chips.
document.addEventListener("click", (e) => {
    // Only toggle when clicking the header row (filter) or pill (overlay)
    const trigger = e.target.closest(".tag-accordion-header, .tag-accordion-pill");
    if (!trigger) return;
    if (e.target.closest(".tag-button")) return;

    const group = trigger.closest(".tag-accordion-group");
    if (!group) return;

    const wasOpen = group.classList.contains("open");
    group.classList.toggle("open");

    const container = group.closest('[id^="dynamic_tags_section"]')
        || group.closest('[id^="split-tags"]');
    if (container) {
        let tabId = null;
        if (container.id.startsWith('dynamic_tags_section_')) {
            tabId = `tab${container.id.replace('dynamic_tags_section_', '')}`;
        } else if (container.id.startsWith('split-tags-')) {
            const parts = container.id.split('-');
            tabId = `tab${parts[parts.length - 1]}`;
        }
        if (tabId) {
            const openCats = [...container.querySelectorAll('.tag-accordion-group.open')]
                .map(g => g.dataset.category);
            localStorage.setItem(`accordionOpen_${tabId}`, JSON.stringify(openCats));
        }
    }

    if (wasOpen) {
        // Just collapsed — clear stale chips and rebuild for current selected state
        const chipsContainer = group.querySelector(".tag-accordion-chips");
        if (chipsContainer) chipsContainer.innerHTML = "";

        const body = group.querySelector(".tag-accordion-body");
        if (!body) return;
        const tagClass = [...group.classList]
            .find(c => c !== "tag-accordion-group" && c !== "open") || "";
        const target = chipsContainer || group;
        body.querySelectorAll(".tag-button.selected, .tag-button.selected-or").forEach(btn => {
            const chip = document.createElement("button");
            chip.classList.add("tag-button", "selected");
            if (tagClass) chip.classList.add(tagClass);
            if (btn.classList.contains("selected-or")) { chip.classList.remove("selected"); chip.classList.add("selected-or"); }
            chip.dataset.tag = btn.dataset.tag;
            chip.textContent = btn.dataset.tag;
            target.appendChild(chip);
            const naturalWidth = chip.offsetWidth;
            chip.style.maxWidth = '0px';
            chip.style.overflow = 'hidden';
            chip.style.opacity = '0';
            chip.style.padding = '2px 0';
            void chip.offsetHeight;
            chip.style.transition = 'max-width 0.2s ease, opacity 0.18s ease 0.04s, padding 0.2s ease';
            chip.style.maxWidth = naturalWidth + 'px';
            chip.style.opacity = '1';
            chip.style.padding = '';
            setTimeout(() => chip.removeAttribute('style'), 250);
        });
    }
    // When opening: chips stay in DOM, CSS hides them via visibility:hidden
});

// Chip click — deselect the tag without opening the group.
// Runs in capture phase so it intercepts before any tag-button handler fires.
document.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-accordion-chips .tag-button");
    if (!chip) return;
    e.stopPropagation();
    const group = chip.closest(".tag-accordion-group");
    if (!group) return;
    const tag = chip.dataset.tag;
    const bodyBtn = group.querySelector(`.tag-accordion-body .tag-button[data-tag="${tag}"]`);
    if (bodyBtn) {
        chip.style.opacity = '0';
        chip.style.pointerEvents = 'none';
        bodyBtn.click(); // triggers applyFilters → _applySelectionClasses which rebuilds chips
    }
}, true);

/* ==================================================================*/
/* ======================= KEYBOARD SHORTCUTS =======================*/
/* ==================================================================*/
const keyboardShortcutsHandler = (() => {
    const handleKeyboardShortcuts = () => {
        document.addEventListener("keydown", (event) => {
            const clearDataOverlay       = document.querySelector(".cleardata-overlay");
            const spellSlotEditOverlay   = document.querySelector(".spell-slot-edit-overlay");
            const confirmClearButton     = document.getElementById("confirm_clear_button");
            const cancelClearButton      = document.getElementById("cancel_clear_button");
            const saveSpellSlotButton    = document.getElementById("save_spell_slot_changes");
            const cancelSpellSlotButton  = document.getElementById("close_spell_slot_edit");
            const removeBlockOverlay     = document.querySelector(".remove-block-overlay");
            const cancelRemoveButton     = document.getElementById("cancel_remove_button");
            const confirmRemoveButton    = document.getElementById("confirm_remove_button");
            const menuOverlay            = document.getElementById("menu_overlay");
            const menuButton             = document.getElementById("Menu_button");

            if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

            if (clearDataOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && confirmClearButton) {
                    confirmClearButton.click();
                } else if (event.key === "Escape" && cancelClearButton) {
                    cancelClearButton.click();
                }
            }

            if (spellSlotEditOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveSpellSlotButton) {
                    saveSpellSlotButton.click();
                } else if (event.key === "Escape" && cancelSpellSlotButton) {
                    cancelSpellSlotButton.click();
                }
            }

            if (removeBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && confirmRemoveButton) {
                    event.preventDefault();
                    confirmRemoveButton.click();
                } else if (event.key === "Escape" && cancelRemoveButton) {
                    cancelRemoveButton.click();
                }
            }

            if (event.key === "Escape" && menuOverlay?.classList.contains("active")) {
                menuOverlay.classList.remove("active");
                menuButton?.classList.remove("menu-button-open");
            }            
        });

        console.log("Keyboard shortcuts attached.");
    };

    return { handleKeyboardShortcuts };
})();

/* ==================================================================*/
/* ============================== FIN ================================*/
/* ===================================================================*/


window.onload = async () => {
    console.log("🔄 Window Loaded - Initializing App");

    initLayoutMode();

    initDragToScroll();

    // Run migrations before anything else
    migrateToTab9();
    migrateTab5ToTab3();
    migrateTab3Schema();

    initOverlayCancelButtons();

    attachEventListeners();
    blockActionsHandler.attachBlockActions();

    initBlockTypeFilterButtons();

    filterManager.registerRenderer(
        (tab, blocks, skipTagUpdate) => appManager.renderBlocks(tab, blocks, skipTagUpdate),
        ()            => appManager.updateTags(),
        (tab)         => appManager.getBlocks(tab)
    );
    filterManager.applyFilters(appManager.getActiveTab().replace('tab', ''));
    actionButtonHandlers.attachActionButtonListeners();

    function initializeEditableFields(tabId) {
        const container = document.getElementById(tabId);
        if (!container) return;
        container.querySelectorAll('.editable').forEach(el => {
            const key = el.getAttribute('data-storage-key');
            if (key) {
                const defaultValue = el.closest('.descriptor-grid') ? "XX" : "00";
                const isSubvalue = el.classList.contains('stat-subvalue');
                let savedValue = localStorage.getItem(key);
                if (savedValue !== null && savedValue !== "") {
                    if (isSubvalue) {
                        el.dataset.rawExpression = savedValue;
                        const evaluated = evaluateStatExpression(savedValue);
                        el.textContent = evaluated !== null ? String(evaluated) : savedValue;
                    } else {
                        el.textContent = savedValue;
                    }
                    el.style.opacity = (savedValue === defaultValue) ? "0.5" : "1";
                } else {
                    el.textContent = defaultValue;
                    if (isSubvalue) el.dataset.rawExpression = defaultValue;
                    el.style.opacity = "0.5";
                    localStorage.setItem(key, defaultValue);
                }
                el.addEventListener('blur', () => {
                    let newValue = el.textContent.trim();
                    if (newValue === "") {
                        newValue = defaultValue;
                        el.textContent = newValue;
                        el.style.opacity = "0.5";
                        if (isSubvalue) el.dataset.rawExpression = newValue;
                    } else {
                        if (isSubvalue) {
                            el.dataset.rawExpression = newValue;
                            const evaluated = evaluateStatExpression(newValue);
                            if (evaluated !== null) el.textContent = String(evaluated);
                        }
                        el.style.opacity = (newValue === defaultValue) ? "0.5" : "1";
                    }
                    localStorage.setItem(key, newValue);
                });
            }
        });
    }
                
    function initializeToggleCircles(tabId) {
        const container = document.getElementById(tabId);
        if (!container) return;
        
        container.querySelectorAll('.toggle-circle').forEach((circle, index) => {
            const key = circle.getAttribute('data-storage-key') || `${tabId}_toggle_${index}`;
            if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, 'false');
            }
            const isFilled = localStorage.getItem(key) === 'true';
            circle.classList.add(isFilled ? 'filled' : 'unfilled');
            circle.classList.remove(isFilled ? 'unfilled' : 'filled');
        });
    }
                          
    [3, 4, 6, 7, 8, 9].forEach(tabId => {
        initializeEditableFields(`tab${tabId}`);
        initializeToggleCircles(`tab${tabId}`);
    });

    initSplitView();

    fadeInElementsSequentially();

    repositionAllSliders();

};