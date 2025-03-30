import { appManager } from './appManager.js';
import { blockActionsHandler, saveEditHandler } from './blockActionsHandler.js';
import { overlayHandler, handleSaveBlock } from './overlayHandler.js';
import { actionButtonHandlers } from './actionButtonHandlers.js';
import { tagHandler } from './tagHandler.js';
import { categoryTags } from './tagConfig.js';

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

// Sequential fade-in function
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
    const tabButtons = document.querySelectorAll(".tabs-nav .tab-button");
    const order = Array.from(tabButtons).map(button => button.dataset.tab);
    localStorage.setItem("tabOrder", JSON.stringify(order));
    console.log("Tab order saved:", order);
}

document.addEventListener("DOMContentLoaded", () => {
    // Restore tab order on page load if it exists
    const savedOrder = JSON.parse(localStorage.getItem("tabOrder"));
    const tabNav = document.querySelector(".tabs-nav");
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
        
            // Render blocks as before...
            if (targetTab !== "tab5") {
                // Retrieve blocks for the target tab
                let blocks = appManager.getBlocks(targetTab);
              
                // Apply search filtering for this tab if present
                const tabNumber = targetTab.replace("tab", "");
                const searchInput = document.getElementById(`search_input_${tabNumber}`);
                if (searchInput && searchInput.value.trim() !== "") {
                  const query = searchInput.value.trim().toLowerCase();
                  blocks = blocks.filter(block =>
                    block.title.toLowerCase().includes(query) ||
                    block.text.toLowerCase().includes(query)
                  );
                }
              
                // Apply tag filters using per-tab settings
                const selectedTags = tagHandler.getSelectedTags(targetTab);
                if (selectedTags.length > 0) {
                  blocks = blocks.filter(block =>
                    selectedTags.every(tag => block.tags.includes(tag))
                  );
                }
              
                // Render using the filtered list
                appManager.renderBlocks(targetTab, blocks);
                appManager.updateTags();
              } else {
                import('./diceRoller.js').then(module => {
                  module.initDiceRoller();
                });
              }
              
              // Update view toggle buttons if needed
              updateViewToggleButtons();
              
              setTimeout(() => {
                const computedStyle = window.getComputedStyle(targetContent);
                if (computedStyle.display === "none") {
                  targetContent.style.display = "flex";
                }
            }, 100);
        });
    });
                
    // Handle tab reordering
    document.querySelector(".tabs-nav").addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggingTab = document.querySelector(".dragging");
        const afterElement = getDragAfterElement(e.clientX);
        const tabNav = document.querySelector(".tabs-nav");
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
        const searchInput = document.getElementById(`search_input_${tabNumber}`);
        const clearSearchButton = document.getElementById(`clear_search_button_${tabNumber}`);
        const clearFiltersButton = document.getElementById(`clear_filters_button_${tabNumber}`);

        if (!searchInput) {
            return;
        }

        searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            const activeTab = `tab${tabNumber}`;

            const filteredBlocks = appManager.getBlocks(activeTab).filter(block =>
                block.title.toLowerCase().includes(query) || block.text.toLowerCase().includes(query)
            );

            const highlightMatch = (text, query) => {
                if (!query) return text;
                const regex = new RegExp(`(${query})`, "gi");
                return text.replace(regex, `<span class="highlight">$1</span>`);
            };

            const highlightedBlocks = filteredBlocks.map(block => ({
                ...block,
                title: highlightMatch(block.title, query),
                text: highlightMatch(block.text, query),
                highlighted: query.length > 0
            }));

            appManager.renderBlocks(activeTab, highlightedBlocks);
        });

        if (clearSearchButton) {
            clearSearchButton.addEventListener("click", () => {
                searchInput.value = "";
                const activeTab = `tab${tabNumber}`;
                appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
            });
        }

        if (clearFiltersButton) {
            clearFiltersButton.addEventListener("click", () => {
                document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag =>
                    tag.classList.remove("selected")
                );
                searchInput.value = "";
                tagHandler.clearSelectedTags();
                const activeTab = `tab${tabNumber}`;
                appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
            });
        }
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

// 📌 Handle tag filtering
const handleTagFilter = (event) => {
    const target = event.target;
    if (!target.classList.contains("tag-button")) return;

    const tag = target.dataset.tag;
    console.log("Filtering by tag:", tag);
    target.classList.toggle("selected");

    const selectedTags = [...document.querySelectorAll(".tag-button.selected")].map(t => t.dataset.tag);
    console.log("Selected Tags:", selectedTags);

    const filteredBlocks = selectedTags.length
        ? appManager.getBlocks().filter(block => selectedTags.every(t => block.tags.includes(t)))
        : appManager.getBlocks();

    appManager.renderBlocks();
};

// 📌 Handle search functionality
const handleSearch = () => {
    const searchInput = document.getElementById("search_input");
    if (!searchInput) {
        console.error("❌ Search input box not found!");
        return;
    }

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        console.log("🔍 Searching for:", query);

        const selectedTags = tagHandler.getSelectedTags();
        console.log("🟠 Currently Selected Tags:", selectedTags);

        let filteredBlocks = selectedTags.length
            ? appManager.getBlocks().filter(block =>
                  selectedTags.every(t =>
                      block.tags.map(bt => bt.trim().toLowerCase()).includes(t.toLowerCase())
                  )
              )
            : appManager.getBlocks();

        console.log("🟢 Blocks After Tag Filtering (Before Search):", filteredBlocks);

        const searchResults = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(query) ||
            block.text.toLowerCase().includes(query)
        );
                        
        console.log("✅ Final Search Results (Matching Search & Tags):", searchResults);

        const highlightMatch = (text, query) => {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, "gi");
            return text.replace(regex, `<span class="highlight">$1</span>`);
        };

        const highlightedBlocks = searchResults.map(block => ({
            ...block,
            title: highlightMatch(block.title, query),
            text: highlightMatch(block.text, query),
            highlighted: true
        }));
        
        appManager.renderBlocks(appManager.getActiveTab(), highlightedBlocks);
    });
};

// Clear filters and reset results for the specific tab
const clearFilters = (event) => {
    console.log("Clear Filters button clicked");
    const tabNumber = event.currentTarget.id.split("_").pop();
    document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag => tag.classList.remove("selected"));
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) {
        searchInput.value = "";
    }
    tagHandler.clearSelectedTags();
    const activeTab = `tab${tabNumber}`;
    appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
    const updatedTags = tagHandler.getSelectedTags(); 
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

// KEYBOARD SHORTCUTS //
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

            const saveBlockButton = document.getElementById("save_block_button");
            const cancelAddBlockButton = document.getElementById("cancel_add_block");
            const confirmClearButton = document.getElementById("confirm_clear_button");
            const cancelClearButton = document.getElementById("cancel_clear_button");
            const saveEditButton = document.getElementById("save_edit_button");
            const cancelEditButton = document.getElementById("cancel_edit_block");
            const saveSpellSlotButton = document.getElementById("save_spell_slot_changes");
            const cancelSpellSlotButton = document.getElementById("close_spell_slot_edit");

            if (addBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveBlockButton) {
                    saveBlockButton.click();
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
        });

        console.log("Keyboard shortcuts attached.");
    };

    return { handleKeyboardShortcuts };
})();

const updateBlocksViewState = (newState) => {
    const activeTab = appManager.getActiveTab();
    let blocks = appManager.getBlocks(activeTab);
    blocks.forEach(block => {
      block.viewState = newState;
    });
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
    appManager.renderBlocks(activeTab);
    localStorage.setItem(`activeViewState_${activeTab}`, newState);
};

const updateViewToggleButtons = () => {
    // Remove the active class from all buttons
    const expandedBtn = document.getElementById("view_expanded_button");
    const condensedBtn = document.getElementById("view_condensed_button");
    const minimizedBtn = document.getElementById("view_minimized_button");
    
    [expandedBtn, condensedBtn, minimizedBtn].forEach(btn => {
      btn.classList.remove("active");
    });
  
    const activeTab = appManager.getActiveTab();
    // Use the per‑tab key; default to "condensed" if nothing is stored.
    let savedViewState = localStorage.getItem(`activeViewState_${activeTab}`) || "condensed";
  
    if (savedViewState === "expanded") {
      expandedBtn.classList.add("active");
    } else if (savedViewState === "condensed") {
      condensedBtn.classList.add("active");
    } else if (savedViewState === "minimized") {
      minimizedBtn.classList.add("active");
    }
};  

const clearToggleClasses = () => {
    document.getElementById("view_condensed_button")?.classList.remove("active");
    document.getElementById("view_minimized_button")?.classList.remove("active");
};

document.getElementById("view_expanded_button")?.addEventListener("click", () => {
    updateBlocksViewState("expanded");
});

document.getElementById("view_condensed_button")?.addEventListener("click", () => {
    updateBlocksViewState("condensed");
    clearToggleClasses();
    document.getElementById("view_condensed_button")?.classList.add("active");
});

document.getElementById("view_minimized_button")?.addEventListener("click", () => {
    updateBlocksViewState("minimized");
    clearToggleClasses();
    document.getElementById("view_minimized_button")?.classList.add("active");
});

const savedViewState = localStorage.getItem("activeViewState") || "condensed";
updateBlocksViewState(savedViewState);

if (savedViewState === "condensed") {
    document.getElementById("view_condensed_button")?.classList.add("active");
} else if (savedViewState === "minimized") {
    document.getElementById("view_minimized_button")?.classList.add("active");
}

window.onload = async () => {
    console.log("🔄 Window Loaded - Initializing App");

    attachEventListeners();
    blockActionsHandler.attachBlockActions();

    const saveEditButton = document.getElementById("save_edit_button");
    if (saveEditButton) {
        saveEditButton.addEventListener("click", saveEditHandler);
    }

    const saveBlockButton = document.getElementById("save_block_button");
    if (saveBlockButton) {
        saveBlockButton.addEventListener("click", handleSaveBlock);
    }

    initializeDynamicTags();
    await appManager.loadBlocks();
    appManager.renderBlocks(appManager.getActiveTab());
    appManager.updateTags();

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
        if (!container) {
            return;
        }
        container.querySelectorAll('.toggle-circle').forEach((circle, index) => {
            const key = circle.getAttribute('data-storage-key') || `${tabId}_toggle_${index}`;
            let savedState = localStorage.getItem(key);
            if (savedState === null) {
                circle.classList.add('unfilled');
                localStorage.setItem(key, 'true');
            } else if (savedState === 'true') {
                circle.classList.add('unfilled');
            } else {
                circle.classList.remove('unfilled');
            }
        });
    }
                    
    ["tab1", "tab2", "tab3", "tab4", "tab5", "tab6", "tab7", "tab8"].forEach(tabId => {
        initializeEditableFields(tabId);
        initializeToggleCircles(tabId);
    });
};
