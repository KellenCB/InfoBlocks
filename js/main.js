import { initSplitView } from './splitView.js';
import { appManager, actionButtonHandlers } from './appManager.js';
import { blockActionsHandler, saveEditHandler } from './blockActionsHandler.js';
import { overlayHandler, handleSaveBlock } from './overlayHandler.js';
import { tagHandler } from './tagHandler.js';
import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { stripHTML } from './appManager.js';
import { initDiceRoller } from './diceRoller.js';
import { initLayoutMode, activateCharTab } from './layoutMode.js';

function filterAndRender(tabNumber) {
    const activeTab = `tab${tabNumber}`;
    let blocks = appManager.getBlocks(activeTab);
  
    // 1) by block types (from blockTypeConfig)
    const tabBTConfig = blockTypeConfig[activeTab];
    if (tabBTConfig) {
        const selectedTypes = [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected`)]
            .map(b => b.dataset.tag);
        if (selectedTypes.length) {
            blocks = blocks.filter(block => {
                const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                return selectedTypes.every(t => types.includes(t));
            });
        }
    }

    // 2) by tags
    const sel = tagHandler.getSelectedTags(activeTab);
    if (sel.length) {
        const normalizeTag = t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        blocks = blocks.filter(b =>
            sel.every(t => b.tags.some(bt => normalizeTag(bt) === normalizeTag(t)))
        );
    }
  
    // 3) by search
    const query = document
        .getElementById(`search_input_${tabNumber}`)
        ?.value.trim().toLowerCase() || "";
            if (query) {
                blocks = blocks.filter(b =>
                    b.title.toLowerCase().includes(query) ||
                    stripHTML(b.text).toLowerCase().includes(query) ||
                    (b.properties || []).some(p => p.toLowerCase().includes(query))
                );
            }
  
    appManager.renderBlocks(activeTab, blocks);
}

// 📌 Attach event listeners efficiently
const attachEventListeners = () => {
    console.log("Attaching event listeners");

    actionButtonHandlers.attachActionButtonListeners();
    overlayHandler.initializeEventHandlers();
    keyboardShortcutsHandler.handleKeyboardShortcuts();

    blockActionsHandler.attachBlockActions();

    document.getElementById("dynamic_tags_section")?.addEventListener("click", handleTagFilter);
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
/* ========================= TAB ORDER ===============================*/
/* ===================================================================*/

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

// Populate the block-type-tags filter divs in each tab's filter panel
// and wire up their click handlers — driven entirely by blockTypeConfig.
function initBlockTypeFilterButtons() {
    Object.entries(blockTypeConfig).forEach(([tabId, config]) => {
        const tabNum = tabId.replace("tab", "");
        const container = document.getElementById(`character_type_tags_${tabNum}`);
        if (!container) return;

        // Render buttons
        container.innerHTML = config.types.map(type =>
            `<button class="tag-button ${config.className}" data-tag="${type}">${type}</button>`
        ).join("");

        // Wire click: toggle selected + re-filter
        container.addEventListener("click", e => {
            const btn = e.target.closest(".tag-button");
            if (!btn) return;
            btn.classList.toggle("selected");
            filterAndRender(parseInt(tabNum));
            appManager.updateTags();
        });
    });
}

/* ===================================================================*/
/* ========================= DOM CONTENT LOADED ======================*/
/* ===================================================================*/

document.addEventListener("DOMContentLoaded", () => {

    const CHAR_TABS  = new Set(['tab4', 'tab8']);
    const charPanel  = document.getElementById('char-sheet-panel');
    const tabsContent = document.querySelector('.tabs-content');

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
    [3, 4, 6, 7, 8, 9].forEach(num => {
        const tabId = `tab${num}`;
        const saved = localStorage.getItem(`filterVisible_${tabId}`);
        if (saved === "false") {
            const tab = document.getElementById(tabId);
            if (!tab) return;
            const button = tab.querySelector(".toggle-filter-button");
            const container = tab.querySelector(".filter-and-results");
            if (!button || !container) return;

            const selectors = [
                ".filter-section",
                ".filter-section-wrapper",
                ".filter-section-overlay-top",
                ".filter-section-overlay-bottom"
            ].join(", ");

            container.querySelectorAll(selectors).forEach(el => el.classList.add("hidden"));
            button.innerHTML = '<img src="./images/Filter_Open_Icon.svg" alt="Filter icon">';
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
            const allBlocks = appManager.getBlocks(targetTab);
            const searchInput = document.getElementById(`search_input_${tabSuffix}`);
            const query = searchInput?.value.trim().toLowerCase() || "";
    
            let filtered = query
              ? allBlocks.filter(block =>
                  block.title.toLowerCase().includes(query) ||
                  stripHTML(block.text).toLowerCase().includes(query)
                )
              : allBlocks;
    
            const selectedTags = tagHandler.getSelectedTags(targetTab);
            if (selectedTags.length) {
              filtered = filtered.filter(block =>
                selectedTags.every(tag => block.tags.includes(tag))
              );
            }
    
            appManager.renderBlocks(targetTab, filtered);
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
        const searchInput        = document.getElementById(`search_input_${tabNumber}`);
        const clearSearchButton  = document.getElementById(`clear_search_button_${tabNumber}`);
        const clearFiltersButton = document.getElementById(`clear_filters_button_${tabNumber}`);
      
        if (!searchInput) return;
      
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
        const highlightInText = (text, query) => {
          if (!query) return text;
          const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
          return text.replace(re, `<span class="highlight">$1</span>`);
        };
      
        const highlightInHTML = (html, query) => {
          if (!query) return html;
          const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
          const container = document.createElement('div');
          container.innerHTML = html;
          const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
          const textNodes = [];
          while (walker.nextNode()) textNodes.push(walker.currentNode);
      
          textNodes.forEach(node => {
            const parent = node.parentNode;
            let lastIndex = 0;
            const frag = document.createDocumentFragment();
            const text = node.nodeValue;
            text.replace(re, (match, p1, offset) => {
              if (offset > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
              }
              const span = document.createElement('span');
              span.className = 'highlight';
              span.textContent = match;
              frag.appendChild(span);
              lastIndex = offset + match.length;
            });
            if (lastIndex < text.length) {
              frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            if (frag.childNodes.length) parent.replaceChild(frag, node);
          });
      
          return container.innerHTML;
        };
      
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            filterAndRender(tabNumber);

            const resultsSection = document.getElementById(`results_section_${tabNumber}`);
            resultsSection.querySelectorAll('.block-title').forEach(el => {
                el.innerHTML = highlightInText(el.innerHTML, query);
            });
            resultsSection.querySelectorAll('.block-body').forEach(el => {
                el.innerHTML = highlightInHTML(el.innerHTML, query);
            });
            resultsSection.querySelectorAll('.block-property').forEach(el => {
                el.innerHTML = highlightInHTML(el.innerHTML, query);
            });
        });
                          
        clearSearchButton?.addEventListener('click', () => {
            searchInput.value = '';
            filterAndRender(tabNumber);
            const resultsSection = document.getElementById(`results_section_${tabNumber}`);
            resultsSection.querySelectorAll('.highlight').forEach(span => {
                span.replaceWith(document.createTextNode(span.textContent));
            });
        });
                  
        clearFiltersButton?.addEventListener('click', () => {
            const btContainer = document.getElementById(`character_type_tags_${tabNumber}`);
            if (btContainer) {
                btContainer.querySelectorAll('.tag-button.selected')
                    .forEach(b => b.classList.remove('selected'));
            }
            document
                .querySelectorAll(`#tab${tabNumber} .tag-button.selected`)
                .forEach(b => b.classList.remove('selected'));
            document
                .querySelectorAll(`#tab${tabNumber} .tag-accordion-chip`)
                .forEach(c => c.remove());
            tagHandler.clearSelectedTags(`tab${tabNumber}`);
            searchInput.value = '';
            filterAndRender(tabNumber);
        });
    }
          
    [3, 4, 6, 7, 8, 9].forEach(tabNumber => setupTabSearchAndFilters(tabNumber));

    appManager.renderBlocks(activeTabId);
});

// 📌 Make character sheet editable fields more user friendly
document.querySelectorAll("#tab4 .editable, #tab8 .editable").forEach(field => {
    field.addEventListener("focus", function () {
        const range = document.createRange();
        range.selectNodeContents(this);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        this.style.opacity = "1";
        this.dataset.initialValue = this.textContent;
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

// 📌 Handle tag filtering
const handleTagFilter = (event) => {
    const btn = event.target;
    if (!btn.classList.contains("tag-button")) return;
    btn.classList.toggle("selected");
  
    const tabNumber = appManager.getActiveTab().replace("tab", "");
    const selected = [...document
      .getElementById(`dynamic_tags_section_${tabNumber}`)
      .querySelectorAll(".tag-button.selected")]
      .map(b => b.dataset.tag);
    tagHandler.setSelectedTags(`tab${tabNumber}`, selected);
  
    filterAndRender(tabNumber);
};
    
// Clear filters and reset results for the specific tab
const clearFilters = (event) => {
    console.log("Clear Filters button clicked");
    const tabNumber = event.currentTarget.id.split("_").pop();
    document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag =>
        tag.classList.remove("selected")
    );
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) searchInput.value = "";
    tagHandler.clearSelectedTags(`tab${tabNumber}`);
    const activeTab = `tab${tabNumber}`;
    appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
    const updatedTags = tagHandler.getSelectedTags(`tab${tabNumber}`); 
    console.log("🔵 Currently selected tags:", updatedTags);
};

document.querySelectorAll(".clear_filters_button").forEach(button => {
    button.addEventListener("click", clearFilters);
});

// 📌 Initialize dynamic tags and overlays
const initializeDynamicTags = () => {
    console.log("Initializing dynamic tags and overlays");

    [3, 4, 6, 7, 8, 9].forEach(tabNumber => {
        const tagsSection = document.getElementById(`dynamic_tags_section_${tabNumber}`);
        if (!tagsSection) return;

        tagsSection.innerHTML = "";

        Object.keys(categoryTags).forEach(category => {
            if (!categoryTags[category].tabs.includes(`tab${tabNumber}`)) return;

            const label = categoryTags[category].label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

            const group = document.createElement("div");
            group.classList.add("tag-accordion-group", categoryTags[category].className);
            group.dataset.category = category;

            const pill = document.createElement("button");
            pill.classList.add("tag-accordion-pill");
            pill.dataset.category = category;
            pill.textContent = label;

            const body = document.createElement("div");
            body.classList.add("tag-accordion-body");
            body.id = `${category}_tags_list_${tabNumber}`;

            const labelEl = document.createElement("span");
            labelEl.classList.add("tag-accordion-label");
            labelEl.textContent = label;
            body.appendChild(labelEl);

            categoryTags[category].tags.forEach(tag => {
                const button = document.createElement("button");
                button.classList.add("tag-button", categoryTags[category].className);
                button.dataset.tag = tag;
                button.textContent = tag;
                body.appendChild(button);
            });

            group.appendChild(pill);
            group.appendChild(body);
            tagsSection.appendChild(group);
        });
    });
};

// Toggle group open/closed.
// On collapse: read selected tags from the body and build chips dynamically.
// On expand: remove any existing chips.
document.addEventListener("click", (e) => {
    const group = e.target.closest(".tag-accordion-group");
    if (!group) return;
    if (e.target.closest(".tag-button")) return;
    if (e.target.closest(".tag-accordion-chip")) return;

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

    // Remove stale chips from inside the pill either way before possibly re-adding
    group.querySelector(".tag-accordion-pill")
        ?.querySelectorAll(".tag-accordion-chip").forEach(c => c.remove());

    if (wasOpen) {
        // Just collapsed — add a chip inside the pill for every selected tag in the body
        const pill = group.querySelector(".tag-accordion-pill");
        const body = group.querySelector(".tag-accordion-body");
        if (!pill || !body) return;
        const tagClass = [...group.classList]
            .find(c => c !== "tag-accordion-group" && c !== "open") || "";
        body.querySelectorAll(".tag-button.selected").forEach(btn => {
            const chip = document.createElement("button");
            chip.classList.add("tag-accordion-chip");
            if (tagClass) chip.classList.add(tagClass);
            chip.dataset.tag = btn.dataset.tag;
            chip.textContent = btn.dataset.tag;
            pill.appendChild(chip);
        });
    }
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
        chip.remove();   // remove immediately (overlays won't re-render themselves)
        bodyBtn.click(); // fire existing filter / toggle logic as normal
    }
}, true);

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
        chip.remove();   // remove immediately (overlays won't re-render themselves)
        bodyBtn.click(); // fire existing filter / toggle logic as normal
    }
}, true);

/* ==================================================================*/
/* ======================= KEYBOARD SHORTCUTS =======================*/
/* ==================================================================*/
const keyboardShortcutsHandler = (() => {
    const handleKeyboardShortcuts = () => {
        document.addEventListener("keydown", (event) => {
            const addBlockOverlay        = document.querySelector(".add-block-overlay");
            const clearDataOverlay       = document.querySelector(".cleardata-overlay");
            const editBlockOverlay       = document.querySelector(".edit-block-overlay");
            const spellSlotEditOverlay   = document.querySelector(".spell-slot-edit-overlay");
            const saveBlockButton        = document.getElementById("save-block-button");
            const cancelAddBlockButton   = document.getElementById("cancel_add_block");
            const confirmClearButton     = document.getElementById("confirm_clear_button");
            const cancelClearButton      = document.getElementById("cancel_clear_button");
            const saveEditButton         = document.getElementById("save-edit-button");
            const cancelEditButton       = document.getElementById("cancel_edit_block");
            const saveSpellSlotButton    = document.getElementById("save_spell_slot_changes");
            const cancelSpellSlotButton  = document.getElementById("close_spell_slot_edit");
            const removeBlockOverlay     = document.querySelector(".remove-block-overlay");
            const cancelRemoveButton     = document.getElementById("cancel_remove_button");
            const confirmRemoveButton    = document.getElementById("confirm_remove_button");
            const menuOverlay            = document.getElementById("menu_overlay");
            const menuButton             = document.getElementById("Menu_button");

            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (addBlockOverlay?.classList.contains("show") && saveBlockButton) {
                    saveBlockButton.click();
                } else if (editBlockOverlay?.classList.contains("show") && saveEditButton) {
                    saveEditButton.click();
                }
                return;
            }

            if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

            if (addBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveBlockButton) {
                    const inUL = document.queryCommandState('insertUnorderedList');
                    const inOL = document.queryCommandState('insertOrderedList');
                    if (!(inUL || inOL)) {
                        event.preventDefault();
                        saveBlockButton.click();
                    }
                } else if (event.key === "Escape" && cancelAddBlockButton) {
                    const openFrPanel = addBlockOverlay.querySelector('.find-replace-panel:not(.hidden)');
                    if (!openFrPanel) cancelAddBlockButton.click();
                }
            }

            if (clearDataOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && confirmClearButton) {
                    confirmClearButton.click();
                } else if (event.key === "Escape" && cancelClearButton) {
                    cancelClearButton.click();
                }
            }

            if (editBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveEditButton) {
                    const inUL = document.queryCommandState('insertUnorderedList');
                    const inOL = document.queryCommandState('insertOrderedList');
                    if (!(inUL || inOL)) {
                        event.preventDefault();
                        saveEditButton.click();
                    }
                } else if (event.key === "Escape" && cancelEditButton) {
                    const openFrPanel = editBlockOverlay.querySelector('.find-replace-panel:not(.hidden)');
                    if (!openFrPanel) cancelEditButton.click();
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

            const suitUsesOverlay   = document.querySelector('.suit-uses-edit-overlay');
            const saveSuitUsesBtn   = document.getElementById('save_suit_uses');
            const cancelSuitUsesBtn = document.getElementById('close_suit_uses_edit');

            if (suitUsesOverlay?.classList.contains('show')) {
                if (event.key === 'Enter' && saveSuitUsesBtn) {
                    event.preventDefault();
                    saveSuitUsesBtn.click();
                } else if (event.key === 'Escape' && cancelSuitUsesBtn) {
                    cancelSuitUsesBtn.click();
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
/* ====================== RESIZE HANDLE =============================*/
/* ==================================================================*/

/*
document.addEventListener("DOMContentLoaded", function() {
  const resizableTabs = ["tab4", "tab8"];
  const isLandscape = () => window.innerWidth > window.innerHeight;

  resizableTabs.forEach(function(tabId) {
    const tab = document.getElementById(tabId);
    if (!tab) return;

    const tabNum      = tabId.replace("tab", "");
    const wrapper     = tab.querySelector(".actions-grid-wrapper");
    const resultsGrid = document.getElementById(`results_section_${tabNum}`);
    const handle      = tab.querySelector(".resizable-handle");
    if (!wrapper || !resultsGrid || !handle) return;

    let isDragging   = false;
    let startY, initActionsH, initResultsH;

    handle.addEventListener("mousedown", function(e) {
      if (isLandscape()) return;

      isDragging      = true;
      startY          = e.clientY;
      initActionsH    = wrapper.getBoundingClientRect().height;
      initResultsH    = resultsGrid.getBoundingClientRect().height;
      document.body.style.cursor     = "row-resize";
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", function(e) {
      if (!isDragging) return;
      if (isLandscape()) {
        isDragging = false;
        cleanup();
        return;
      }

      const delta       = e.clientY - startY;
      const containerH  = tab.getBoundingClientRect().height;
      const minH        = 50;
      let newActionsH   = Math.max(minH, Math.min(initActionsH + delta, containerH - handle.offsetHeight - minH));
      let newResultsH   = containerH - newActionsH - handle.offsetHeight;

      wrapper.style.height     = newActionsH + "px";
      resultsGrid.style.height = newResultsH + "px";
    });

    document.addEventListener("mouseup", function() {
      if (!isDragging) return;
      isDragging = false;
      cleanup();
    });

    window.addEventListener("resize", () => {
      if (isLandscape()) {
        wrapper.style.height     = "";
        resultsGrid.style.height = "";
      }
    });

    function cleanup() {
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    }
  });
});
*/

/* ==================================================================*/
/* ============================== FIN ================================*/
/* ===================================================================*/


window.onload = async () => {
    console.log("🔄 Window Loaded - Initializing App");

    initLayoutMode();

    // Run migrations before anything else
    migrateToTab9();
    migrateTab5ToTab3();

    attachEventListeners();
    blockActionsHandler.attachBlockActions();

    const saveEditButton = document.getElementById("save-edit-button");
    if (saveEditButton) {
        saveEditButton.addEventListener("click", saveEditHandler);
    }

    const saveBlockButton = document.getElementById("save-block-button");
    if (saveBlockButton) {
        saveBlockButton.addEventListener("click", handleSaveBlock);
    }

    initializeDynamicTags();
    initBlockTypeFilterButtons();

    await appManager.loadBlocks();
    appManager.renderBlocks(appManager.getActiveTab());
    appManager.updateTags();
    actionButtonHandlers.attachActionButtonListeners();

    function initializeEditableFields(tabId) {
        const container = document.getElementById(tabId);
        if (!container) return;
        container.querySelectorAll('.editable').forEach(el => {
            const key = el.getAttribute('data-storage-key');
            if (key) {
                const defaultValue = el.closest('.descriptor-grid') ? "XX" : "00";
                let savedValue = localStorage.getItem(key);
                if (savedValue !== null && savedValue !== "") {
                    el.textContent = savedValue;
                    el.style.opacity = (savedValue === defaultValue) ? "0.5" : "1";
                } else {
                    el.textContent = defaultValue;
                    el.style.opacity = "0.5";
                    localStorage.setItem(key, defaultValue);
                }
                el.addEventListener('blur', () => {
                    let newValue = el.textContent.trim();
                    if (newValue === "") {
                        newValue = defaultValue;
                        el.textContent = newValue;
                        el.style.opacity = "0.5";
                    } else {
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

};