import { appManager, actionButtonHandlers } from './appManager.js';
import { blockActionsHandler, saveEditHandler } from './blockActionsHandler.js';
import { overlayHandler, handleSaveBlock } from './overlayHandler.js';
import { tagHandler } from './tagHandler.js';
import { categoryTags } from './tagConfig.js';
import './resizeHandle.js';
import { stripHTML } from './appManager.js';

// 📌 Attach event listeners efficiently
const attachEventListeners = () => {
    console.log("Attaching event listeners");

    // Attach core event handlers
    actionButtonHandlers.attachActionButtonListeners();
    overlayHandler.initializeEventHandlers();
    keyboardShortcutsHandler.handleKeyboardShortcuts();

    // Block action buttons (Duplicate, Edit, Remove)
    blockActionsHandler.attachBlockActions();

    // Tag selection for filtering
    document.getElementById("dynamic_tags_section")?.addEventListener("click", handleTagFilter);
};

/* ===================================================================*/
/* ========================== MENU BUTTON ============================*/
/* ===================================================================*/

const menuButton = document.getElementById("Menu_button");
const menuOverlay = document.getElementById("menu_overlay");

if (menuButton && menuOverlay) {
  menuButton.addEventListener("click", () => {
    menuOverlay.classList.toggle("active");
    menuButton.classList.toggle("menu-button-open");
  });
}

/* ===================================================================*/
/* ========================== DICE ROLELR OVERLAY ============================*/
/* ===================================================================*/

// AFTER: dice overlay open/close
const diceMenuButton = document.getElementById("dice-menu-button");
const diceOverlay    = document.getElementById("dice-overlay");
const closeDiceBtn   = document.getElementById("close-dice-overlay");

if (diceMenuButton && diceOverlay) {
  diceMenuButton.addEventListener("click", () => {
    diceOverlay.classList.toggle("show");
    if (diceOverlay.classList.contains("show")) {
      import('./diceRoller.js').then(mod => mod.initDiceRoller());
    }
  });
}

if (closeDiceBtn && diceOverlay) {
  closeDiceBtn.addEventListener("click", () => {
    diceOverlay.classList.remove("show");
  });
}

// Close when clicking the backdrop
diceOverlay
  ?.querySelector('.overlay-backdrop')
  .addEventListener('click', () => diceOverlay.classList.remove('show'));

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

fadeInElementsSequentially();

// Function to save the current tab order to localStorage
function saveTabOrder() {
    const tabButtons = document.querySelectorAll(".tab-nav .tab-button");
    const order = Array.from(tabButtons).map(button => button.dataset.tab);
    localStorage.setItem("tabOrder", JSON.stringify(order));
    console.log("Tab order saved:", order);
}

document.addEventListener("DOMContentLoaded", () => {
    // Restore tab order on page load if it exists
    const savedOrder = JSON.parse(localStorage.getItem("tabOrder"));
    const tabNav = document.querySelector(".tab-nav");
    if (savedOrder && tabNav) {
        savedOrder.forEach(tabId => {
            const button = tabNav.querySelector(`.tab-button[data-tab="${tabId}"]`);
            if (button) {
                tabNav.appendChild(button);
            }
        });
        console.log("Tab order restored:", savedOrder);
    }

    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach(button => {
        button.addEventListener("dragstart", () => {
            button.classList.add("dragging");
        });
        button.addEventListener("dragend", () => {
            button.classList.remove("dragging");
            // Save the new order when dragging ends
            saveTabOrder();
        });
    });
    const tabContents = document.querySelectorAll(".tab-content");

    // Get stored active tab (if any) or default to the first tab's id.
    const storedActiveTab = localStorage.getItem("activeTab");
    const defaultActiveTab = tabContents.length > 0 ? tabContents[0].id : null;
    const activeTabId = storedActiveTab || defaultActiveTab;

    // Hide all tab contents
    tabContents.forEach(content => {
        content.classList.remove("active");
        content.style.display = "none";
    });

    // Activate the stored (or default) tab content
    if (activeTabId) {
        const activeContent = document.getElementById(activeTabId);
        if (activeContent) {
            activeContent.classList.add("active");
            activeContent.style.display = "flex";
        }
    }

    // Update the tab buttons accordingly: remove all active classes and then mark the one that matches
    tabButtons.forEach(button => {
        if (button.dataset.tab === activeTabId) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });

    tabButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const targetTab = event.currentTarget.dataset.tab;
            const targetContent = document.getElementById(targetTab);
            if (!targetTab) {
                console.error("❌ Error: targetTab is undefined.");
                return;
            }
            // Hide all tabs, remove active classes, etc.
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => {
                content.classList.remove("active");
                content.style.display = "none";
            });
            // Show the new active tab
            event.currentTarget.classList.add("active");
            targetContent.classList.add("active");
            targetContent.style.display = "flex";
            localStorage.setItem("activeTab", targetTab);
        
            appManager.renderBlocks(targetTab);
            appManager.updateTags();
            actionButtonHandlers.attachActionButtonListeners();
              
            const tabSuffix = targetTab.replace("tab", "");
            appManager.updateViewToggleDropdown(tabSuffix);
            
            setTimeout(() => {
            const computedStyle = window.getComputedStyle(targetContent);
            if (computedStyle.display === "none") {
                targetContent.style.display = "flex";
            }
            }, 100);
        });
    });

    // Restore Tab4 actions grid from localStorage
    ["tab4", "tab8"].forEach(tabId => {
        const savedactionsGridHTML = localStorage.getItem(tabId + "_actions_grid");
        if (savedactionsGridHTML) {
          const actionsGrid = document.querySelector("#" + tabId + " .actions-grid");
          if (actionsGrid) {
            actionsGrid.innerHTML = savedactionsGridHTML;
            console.log("✅ actions grid restored from localStorage for " + tabId);
            // Lock the fields so they aren't editable on the main screen.
            actionsGrid.querySelectorAll('.action-name, .action-label, .action-description')
              .forEach(field => field.contentEditable = "false");
          } else {
            console.warn("actions grid element not found in " + tabId);
          }
        }
        // ─── PLACEHOLDER FOR EMPTY ACTIONS GRID ───
        const wrapper = document.querySelector("#" + tabId + " .actions-grid-wrapper");
        if (wrapper) {
            // only add once
            if (!wrapper.querySelector('.actions-placeholder') &&
                wrapper.querySelectorAll('.actions-grid .action-row').length === 0) {
            const p = document.createElement('p');
            p.classList.add('actions-placeholder');
            p.textContent = 'Use the edit tab button to add actions here…';
            p.style.position  = 'absolute';
            p.style.top       = '50%';
            p.style.left      = '50%';
            p.style.transform = 'translate(-50%, -50%)';
            p.style.opacity   = '0.25';
            wrapper.appendChild(p);
            }
        }
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
      
    // Function to attach search and clear event listeners for a specific tab
    function setupTabSearchAndFilters(tabNumber) {
        const searchInput        = document.getElementById(`search_input_${tabNumber}`);
        const clearSearchButton  = document.getElementById(`clear_search_button_${tabNumber}`);
        const clearFiltersButton = document.getElementById(`clear_filters_button_${tabNumber}`);
      
        if (!searchInput) return;
      
        // escape user input for Regex
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
        // highlight inside plain text (for titles)
        const highlightInText = (text, query) => {
          if (!query) return text;
          const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
          return text.replace(re, `<span class="highlight">$1</span>`);
        };
      
        // highlight inside an HTML snippet by walking its text nodes
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
              // append preceding text
              if (offset > lastIndex) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
              }
              // append highlighted span
              const span = document.createElement('span');
              span.className = 'highlight';
              span.textContent = match;
              frag.appendChild(span);
              lastIndex = offset + match.length;
            });
            // append any trailing text
            if (lastIndex < text.length) {
              frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            // only replace if we actually matched
            if (frag.childNodes.length) parent.replaceChild(frag, node);
          });
      
          return container.innerHTML;
        };
      
        searchInput.addEventListener('input', () => {
          const query     = searchInput.value.trim().toLowerCase();
          const activeTab = `tab${tabNumber}`;
          const allBlocks = appManager.getBlocks(activeTab);
      
          // 1) filter on plain-text
          const filtered = allBlocks.filter(block => {
            return block.title.toLowerCase().includes(query)
                || stripHTML(block.text).toLowerCase().includes(query);
          });
      
          // 2) highlight inside the HTML (for body) and in plain text (for title)
          const highlighted = filtered.map(block => ({
            ...block,
            title: highlightInText(block.title, query),
            text:  highlightInHTML(block.text, query),
            highlighted: query.length > 0
          }));
      
          appManager.renderBlocks(activeTab, highlighted);
        });
      
        clearSearchButton?.addEventListener('click', () => {
          searchInput.value = '';
          const activeTab = `tab${tabNumber}`;
          appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
        });
      
        clearFiltersButton?.addEventListener('click', () => {
            document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`)
                .forEach(tag => tag.classList.remove('selected'));
          
            searchInput.value = '';
            tagHandler.clearSelectedTags(`tab${tabNumber}`);
            const activeTab = `tab${tabNumber}`;
            appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
        });
      }
          
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(tabNumber => setupTabSearchAndFilters(tabNumber));

    if (activeTabId === "tab5") {
        import('./diceRoller.js').then(module => {
            module.initDiceRoller();
        });
    } else {
        appManager.renderBlocks(activeTabId);
    }
});

// 📌 Make character sheet editable fields more user friendly 
document.querySelectorAll("#tab4 .editable, #tab8 .editable").forEach(field => {
    field.addEventListener("focus", function () {
        // Highlight all text
        const range = document.createRange();
        range.selectNodeContents(this);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        // Ensure full opacity while editing
        this.style.opacity = "1";
        // Store the initial value
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
    const target = event.target;
    if (!target.classList.contains("tag-button")) return;

    // Toggle the selected class for this tag button
    target.classList.toggle("selected");

    // Determine the active tab and its corresponding dynamic tags container
    const activeTab = appManager.getActiveTab(); // e.g., "tab3"
    const tabNumber = activeTab.replace("tab", "");
    const container = document.getElementById(`dynamic_tags_section_${tabNumber}`);
    
    // Query only within that container
    const selectedTags = container 
        ? [...container.querySelectorAll(".tag-button.selected")].map(t => t.dataset.tag)
        : [];

    console.log("Selected Tags:", selectedTags);

    // Get blocks for the active tab and filter them
    const filteredBlocks = selectedTags.length
        ? appManager.getBlocks(activeTab).filter(block =>
              selectedTags.every(t => block.tags.includes(t))
          )
        : appManager.getBlocks(activeTab);

    appManager.renderBlocks(activeTab, filteredBlocks);
};

// Clear filters and reset results for the specific tab
const clearFilters = (event) => {
    console.log("Clear Filters button clicked");
    const tabNumber = event.currentTarget.id.split("_").pop();
    document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag =>
        tag.classList.remove("selected")
    );
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) {
        searchInput.value = "";
    }
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

    [1, 2, 3, 4, 5, 6, 7, 8].forEach(tabNumber => {
        const tagsSection = document.getElementById(`dynamic_tags_section_${tabNumber}`);
        if (!tagsSection) return;
    
        tagsSection.innerHTML = "";
    
        Object.keys(categoryTags).forEach(category => {
            if (!categoryTags[category].tabs.includes(`tab${tabNumber}`)) return;
    
            const tagContainer = document.createElement("div");
            tagContainer.classList.add("tag-section");
            tagContainer.id = `${category}_tags_list_${tabNumber}`;
    
            categoryTags[category].tags.forEach(tag => {
                const button = document.createElement("button");
                button.classList.add("tag-button", categoryTags[category].className);
                button.dataset.tag = tag;
                button.textContent = tag;
                tagContainer.appendChild(button);
            });
    
            tagsSection.appendChild(tagContainer);
        });
    });
};

/* ==================================================================*/
/* ======================= KEYBOARD SHORTCUTS =======================*/
/* ==================================================================*/
const keyboardShortcutsHandler = (() => {
    const handleKeyboardShortcuts = () => {
        document.addEventListener("keydown", (event) => {
            if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            const addBlockOverlay = document.querySelector(".add-block-overlay");
            const clearDataOverlay = document.querySelector(".cleardata-overlay");
            const editBlockOverlay = document.querySelector(".edit-block-overlay");
            const spellSlotEditOverlay = document.querySelector(".spell-slot-edit-overlay");
            const actionsEditOverlay = document.querySelector(".actions-edit-overlay");

            const saveBlockButton = document.getElementById("save-block-button");
            const cancelAddBlockButton = document.getElementById("cancel_add_block");
            const confirmClearButton = document.getElementById("confirm_clear_button");
            const cancelClearButton = document.getElementById("cancel_clear_button");
            const saveEditButton = document.getElementById("save-edit-button");
            const cancelEditButton = document.getElementById("cancel_edit_block");
            const saveSpellSlotButton = document.getElementById("save_spell_slot_changes");
            const cancelSpellSlotButton = document.getElementById("close_spell_slot_edit");
            const saveActionButton = document.getElementById("save_action_changes");
            const cancelActionButton = document.getElementById("close_action_edit");

            if (addBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveBlockButton) {
                    // if inside a bullet or numbered list, let Enter create a new list item
                    const inUL = document.queryCommandState('insertUnorderedList');
                    const inOL = document.queryCommandState('insertOrderedList');
                    if (!(inUL || inOL)) {
                        event.preventDefault();
                        saveBlockButton.click();
                    }
                } else if (event.key === "Escape" && cancelAddBlockButton) {
                    cancelAddBlockButton.click();
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
                    saveEditButton.click();
                } else if (event.key === "Escape" && cancelEditButton) {
                    cancelEditButton.click();
                }
            }

            if (spellSlotEditOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveSpellSlotButton) {
                    saveSpellSlotButton.click();
                } else if (event.key === "Escape" && cancelSpellSlotButton) {
                    cancelSpellSlotButton.click();
                }
            }

            if (actionsEditOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveActionButton) {
                    saveActionButton.click();
                } else if (event.key === "Escape" && cancelActionButton) {
                    cancelActionButton.click();
                }
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
    await appManager.loadBlocks();
    appManager.renderBlocks(appManager.getActiveTab());
    appManager.updateTags();
    actionButtonHandlers.attachActionButtonListeners();

    function initializeEditableFields(tabId) {
        const container = document.getElementById(tabId);
        if (!container) {
            return;
        }
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
            // If no value in storage, assume NOT filled → store false
            if (localStorage.getItem(key) === null) {
            localStorage.setItem(key, 'false');
            }
        
            // Now read it as a boolean and add exactly one class
            const isFilled = localStorage.getItem(key) === 'true';
            circle.classList.add(isFilled ? 'filled' : 'unfilled');
            circle.classList.remove(isFilled ? 'unfilled' : 'filled');
        });
    }
                          
    ["tab1", "tab2", "tab3", "tab4", "tab5", "tab6", "tab7", "tab8"].forEach(tabId => {
        initializeEditableFields(tabId);
        initializeToggleCircles(tabId);
    });
};
