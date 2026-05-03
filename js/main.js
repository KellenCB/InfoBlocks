import { initSplitView } from './layoutMode.js';
import { appManager, actionButtonHandlers } from './appManager.js';
import { blockActionsHandler } from './blockActionsHandler.js';
import { filterManager } from './filterManager.js';
import { blockTypeConfig } from './tagConfig.js';
import { stripHTML } from './appManager.js';
import { initScrollFades, setupSearchInput, initDragToScroll } from './appManager.js';
import { initDiceRoller } from './diceRoller.js';
import { evaluateStatExpression } from './uiHandlers.js';
import { initLayoutMode, activateCharTab } from './layoutMode.js';
export function repositionAllSliders() {
    requestAnimationFrame(() => {
        document.querySelectorAll('.tab-nav').forEach(nav => {
            const slider = nav.querySelector('.tab-nav-slider');
            const activeBtn = nav.querySelector('.tab-button.active');
            if (!slider || !activeBtn) return;
            slider.style.transition = 'none';
            const navRect = nav.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            slider.style.left = (btnRect.left - navRect.left + nav.scrollLeft) + 'px';
            slider.style.top = (btnRect.top - navRect.top) + 'px';
            slider.style.width = btnRect.width + 'px';
            slider.style.height = btnRect.height + 'px';
            requestAnimationFrame(() => {
                slider.style.transition = '';
            });
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

function applyHighlights(tabNumber, query) {
    if (!query) return;
    const sec = document.getElementById(`results_section_${tabNumber}`);
    if (!sec) return;
    sec.querySelectorAll('.block-title').forEach(el => { el.innerHTML = highlightInText(el.innerHTML, query); });
    sec.querySelectorAll('.block-body').forEach(el => { el.innerHTML = highlightInHTML(el.innerHTML, query); });
    sec.querySelectorAll('.block-property').forEach(el => { el.innerHTML = highlightInHTML(el.innerHTML, query); });
}

function applyViewerHighlights(query) {
    const viewer  = document.getElementById('session_log_viewer');
    if (!viewer) return;
    const titleEl = viewer.querySelector('.session-viewer-title');
    const bodyEl  = viewer.querySelector('#session_viewer_body');
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
    const query = document.getElementById(`search_input_${tabNumber}`)?.value.trim() || '';
    applyHighlights(tabNumber, query);
});

document.addEventListener('sessionViewerRendered', () => {
    const query = document.getElementById('search_input_7')?.value.trim() || '';
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
const menuCloseButton = document.getElementById("menu_close_button");

function closeMenu() {
    menuOverlay.classList.remove("active");
    menuButton.classList.remove("menu-button-open");
}

if (menuButton && menuOverlay) {
    menuButton.addEventListener("click", () => {
    menuOverlay.classList.toggle("active");
    menuButton.classList.toggle("menu-button-open");
    });

    menuOverlay.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-content")) closeMenu();
    });

    menuCloseButton?.addEventListener("click", closeMenu);
}

/* ===================================================================*/
/* ================= CENTRAL OVERLAY CANCEL BUTTONS =================*/
/* ===================================================================*/

// All overlays whose cancel/close button simply dismisses the overlay.
// Note: cancel_remove_button is handled in blockActionsHandler because it
// also needs to clear pendingDeleteBlockId.
const overlayCloseConfigs = [
    { buttonId: 'cancel_clear_button',         overlaySelector: '.cleardata-overlay' },
    { buttonId: 'close_spell_slot_edit',       overlaySelector: '.spell-slot-edit-overlay' },
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
/* ========================= DICE ROLLER PANEL =======================*/
/* ===================================================================*/

const diceMenuButton = document.getElementById("dice-menu-button");
const dicePanel      = document.getElementById("dice-panel");
const diceMenuImg    = diceMenuButton?.querySelector("img");

function setDicePanelState(open) {
    dicePanel.classList.toggle("open", open);
    diceMenuButton.classList.toggle("active", open);
    if (diceMenuImg) {
        diceMenuImg.src = open ? "images/Dice_Button_v2_Green.svg" : "images/Dice_Button_v2.svg";
    }
    localStorage.setItem("dicePanelOpen", open);
    if (open) {
        setTimeout(() => {
            initScrollFades('.roll-results', '--dice-fade-top-opacity', '--dice-fade-bottom-opacity', '_diceFadeHandler');
        }, 100);
    }
}

if (diceMenuButton && dicePanel) {
  diceMenuButton.addEventListener("click", () => {
    setDicePanelState(!dicePanel.classList.contains("open"));
  });
}
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
/* ===================== TAB NAV FUNCTIONS ===========================*/
/* ===================================================================*/

function initTabNavSlider(nav) {
    const slider = document.createElement('div');
    slider.classList.add('tab-nav-slider');
    nav.style.position = 'relative';
    nav.insertBefore(slider, nav.firstChild);

    function moveSlider(btn) {
        const navRect = nav.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        slider.style.left = (btnRect.left - navRect.left + nav.scrollLeft) + 'px';
        slider.style.top = (btnRect.top - navRect.top) + 'px';
        slider.style.width = btnRect.width + 'px';
        slider.style.height = btnRect.height + 'px';
    }

    const activeBtn = nav.querySelector('.tab-button.active');
    if (activeBtn) {
        slider.style.transition = 'none';
        requestAnimationFrame(() => {
            moveSlider(activeBtn);
            requestAnimationFrame(() => {
                slider.style.transition = '';
            });
        });
    }

    nav.addEventListener('click', e => {
        const btn = e.target.closest('.tab-button');
        if (btn) moveSlider(btn);
    });

    new ResizeObserver(() => {
        const active = nav.querySelector('.tab-button.active');
        if (!active) return;
        slider.style.transition = 'none';
        moveSlider(active);
        requestAnimationFrame(() => {
            slider.style.transition = '';
        });
    }).observe(nav);
}

function saveTabOrder() {
    // Only read from the main nav, not split view navs
    const mainNav = document.querySelector(".tab-nav:not(.split-tab-nav)");
    if (!mainNav) return;
    const order = Array.from(mainNav.querySelectorAll(".tab-button"))
        .map(button => button.dataset.tab);
    localStorage.setItem("tabOrder", JSON.stringify(order));
    console.log("Tab order saved:", order);
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

    // Restore tab order on page load if it exists
    const savedOrder = JSON.parse(localStorage.getItem("tabOrder"));
    const tabNav = document.querySelector(".tab-nav");
    if (savedOrder && tabNav) {
        savedOrder.forEach(tabId => {
            const button = tabNav.querySelector(`.tab-button[data-tab="${tabId}"]`);
            if (button) tabNav.appendChild(button);
        });
        console.log("Tab order restored:", savedOrder);
    }

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

    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach(button => {
        button.addEventListener("dragstart", () => button.classList.add("dragging"));
        button.addEventListener("dragend", () => {
            button.classList.remove("dragging");
            saveTabOrder();
        });
    });

    document.querySelectorAll('.tab-nav').forEach(nav => initTabNavSlider(nav));

    const tabContents = document.querySelectorAll(".tab-content");

    const storedActiveTab = localStorage.getItem("activeTab");
    const validTabs = ["tab3", "tab4", "tab6", "tab7", "tab8", "tab9"];
    const defaultActiveTab = tabContents.length > 0 ? tabContents[0].id : null;
    const activeTabId = (storedActiveTab && validTabs.includes(storedActiveTab))
        ? storedActiveTab
        : defaultActiveTab;

    // Hide all tab contents initially.
    // In landscape the CSS media query will override these inline styles for
    // the char-panel tabs, so it's safe to set them all to none here.
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

        // Portrait panel routing: show the right top-level container.
        // In landscape the CSS media query keeps both containers visible
        // regardless of these inline styles.
        if (CHAR_TABS.has(activeTabId)) {
            if (charPanel)   charPanel.style.display   = 'flex';
            if (tabsContent) tabsContent.style.display = 'none';
        } else {
            if (charPanel) charPanel.style.display = 'none';
            // tabsContent defaults to visible — nothing to set.
        }
    }

    // Update tab buttons
    tabButtons.forEach(button => {
        if (button.dataset.tab === activeTabId) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });

    tabButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const targetTab     = event.currentTarget.dataset.tab;
            const targetContent = document.getElementById(targetTab);
            if (!targetTab) {
                console.error("❌ Error: targetTab is undefined.");
                return;
            }

            // Char-sheet-nav buttons are handled by layoutMode.js — don't
            // interfere with them here.
            if (event.currentTarget.closest('#char-sheet-nav')) return;

            const inLandscape = document.body.classList.contains('landscape-mode');

            // Remove active class from ALL tab buttons (both navs).
            tabButtons.forEach(btn => {
                if (inLandscape && btn.closest('#char-sheet-nav')) return;
                btn.classList.remove("active");
            });

            // Hide all tab-contents — but in landscape don't touch the char-panel
            // tabs because the CSS media query controls their visibility there.
            tabContents.forEach(content => {
                if (inLandscape && CHAR_TABS.has(content.id)) return;
                content.classList.remove("active");
                content.style.display = "none";
            });

            // Show the target tab.
            event.currentTarget.classList.add("active");
            if (targetContent) {
                targetContent.classList.add("active");
                targetContent.style.display = "flex";
            }

            // Portrait panel routing.
            // In landscape both containers are always visible (CSS !important),
            // so these inline styles are harmlessly overridden.
            if (!inLandscape) {
                if (CHAR_TABS.has(targetTab)) {
                    if (charPanel)    charPanel.style.display   = 'flex';
                    if (tabsContent)  tabsContent.style.display = 'none';
                } else {
                    if (charPanel)    charPanel.style.display   = 'none';
                    if (tabsContent)  tabsContent.style.display = '';
                }
            }

            localStorage.setItem("activeTab", targetTab);
        
            appManager.updateTags();
            actionButtonHandlers.attachActionButtonListeners();

            const tabSuffix = targetTab.replace("tab", "");
            filterManager.applyFilters(tabSuffix);
            appManager.updateViewToggleDropdown(tabSuffix);
            setTimeout(() => {
                const cs = window.getComputedStyle(targetContent);
                if (cs.display === "none") targetContent.style.display = "flex";
            }, 100);
        });
    });
    
    // Handle tab reordering
    document.querySelector(".tab-nav").addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingTab = document.querySelector(".dragging");
        const afterElement = getDragAfterElement(e.clientX);
        const tabNav = document.querySelector(".tab-nav");
        if (afterElement == null) {
            tabNav.appendChild(draggingTab);
        } else {
            tabNav.insertBefore(draggingTab, afterElement);
        }
    });

    function getDragAfterElement(x) {
        const draggableElements = [...document.querySelectorAll(".tab-button:not(.dragging)")];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
      
    function setupTabSearchAndFilters(tabNumber) {
        const searchInput       = document.getElementById(`search_input_${tabNumber}`);
        const clearSearchButton = document.getElementById(`clear_search_button_${tabNumber}`);

        if (!searchInput) return;

        setupSearchInput(
            searchInput,
            clearSearchButton,
            (value) => {
                filterManager.applyFilters(tabNumber);
                applyHighlights(tabNumber, value.trim());
            },
            () => {
                filterManager.applyFilters(tabNumber);
            }
        );
        // clearFiltersButton is handled by the module-level clearFilters listener below.
    }
            
    [4, 6, 7, 8, 9].forEach(tabNumber => setupTabSearchAndFilters(tabNumber));

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
    if (e.target.closest(".tag-accordion-chip")) return;

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
        if (chipsContainer) {
            chipsContainer.innerHTML = "";
        } else {
            group.querySelectorAll(":scope > .tag-accordion-chip").forEach(c => c.remove());
        }

        const body = group.querySelector(".tag-accordion-body");
        if (!body) return;
        const tagClass = [...group.classList]
            .find(c => c !== "tag-accordion-group" && c !== "open") || "";
        const target = chipsContainer || group;
        body.querySelectorAll(".tag-button.selected, .tag-button.selected-or").forEach(btn => {
            const chip = document.createElement("button");
            chip.classList.add("tag-accordion-chip");
            if (tagClass) chip.classList.add(tagClass);
            if (btn.classList.contains("selected-or")) chip.classList.add("selected-or");
            chip.dataset.tag = btn.dataset.tag;
            chip.textContent = btn.dataset.tag;
            target.appendChild(chip);
        });
    }
    // When opening: chips stay in DOM, CSS hides them via visibility:hidden
});

// Chip click — deselect the tag without opening the group.
// Runs in capture phase so it intercepts before any tag-button handler fires.
document.addEventListener("click", (e) => {
    const chip = e.target.closest(".tag-accordion-chip");
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

    if (localStorage.getItem("dicePanelOpen") === "true" && diceMenuButton && dicePanel) {
        setDicePanelState(true);
    }

    fadeInElementsSequentially();

    repositionAllSliders();

};