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
    // Select all elements with the class 'fade-in' within the provided container
    const allFadeInElements = container.querySelectorAll('.fade-in');
    // Filter to only include elements that are visible (offsetParent is not null)
    const visibleElements = Array.from(allFadeInElements).filter(el => el.offsetParent !== null);
    console.log("Found visible fade-in elements:", visibleElements.length);
    visibleElements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('visible');
        }, index * 300); // adjust the delay as needed
    });
};

fadeInElementsSequentially();

// 📌 Tab functionality
document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-button");
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
    
            // Hide all tab contents and remove active class from buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => {
                content.classList.remove("active");
                content.style.display = "none";
            });
    
            // Show the new active tab
            event.currentTarget.classList.add("active");
            targetContent.classList.add("active");
            targetContent.style.display = "flex";
    
            console.log(`✅ Switched to Tab: ${targetTab}`);
    
            // Save the active tab so it persists on refresh
            localStorage.setItem("activeTab", targetTab);
    
            // Refresh blocks and update tags as needed
            if (typeof appManager !== "undefined" && appManager.renderBlocks) {
                console.log("📦 Refreshing UI: Calling renderBlocks() for", targetTab);
                appManager.renderBlocks(targetTab);
                appManager.updateTags();
            } else {
                console.warn("⚠️ appManager.renderBlocks() is not defined or not callable.");
            }
        
            // Ensure the UI updates properly
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(targetContent);
                if (computedStyle.display === "none") {
                    console.warn(`⚠️ Tab ${targetTab} content is still hidden. Fixing visibility.`);
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

        if (afterElement == null) {
            document.querySelector(".tabs-nav").appendChild(draggingTab);
        } else {
            document.querySelector(".tabs-nav").insertBefore(draggingTab, afterElement);
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

        // Attach event listener for the search input to filter blocks and apply highlighting as the user types
        searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        const activeTab = `tab${tabNumber}`;
    
        // Filter blocks based on the query
        const filteredBlocks = appManager.getBlocks(activeTab).filter(block =>
            block.title.toLowerCase().includes(query) || block.text.toLowerCase().includes(query)
        );
    
        // Helper function to wrap matching text with <span class="highlight">
        const highlightMatch = (text, query) => {
            if (!query) return text;
            const regex = new RegExp(`(${query})`, "gi");
            return text.replace(regex, `<span class="highlight">$1</span>`);
        };
    
        // Map the filtered blocks to new objects with highlighted title and text,
        // and set a flag so blockTemplate knows not to reapply other formatting.
        const highlightedBlocks = filteredBlocks.map(block => ({
            ...block,
            title: highlightMatch(block.title, query),
            text: highlightMatch(block.text, query),
            highlighted: query.length > 0
        }));
    
        appManager.renderBlocks(activeTab, highlightedBlocks);
        });
    
        // Attach event listener for the clear search button to reset the search field and re-render blocks without highlighting
        if (clearSearchButton) {
        clearSearchButton.addEventListener("click", () => {
            searchInput.value = "";
            const activeTab = `tab${tabNumber}`;
            appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
        });
        }
    
        // Attach event listener for the clear filters button to remove tag selections, clear the search field, and re-render blocks
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
  
  // Loop through each tab (assuming tabs 1 through 5) to attach the search and clear listeners
  [1, 2, 3, 4, 5, 6, 7, 8].forEach(tabNumber => setupTabSearchAndFilters(tabNumber));
    
    // Initial render
    appManager.renderBlocks(activeTabId);
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
        : appManager.getBlocks(); // Show all if no filters are active

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

        // Get currently selected tags
        const selectedTags = tagHandler.getSelectedTags();
        console.log("🟠 Currently Selected Tags:", selectedTags);

        // First, filter blocks based on selected tags
        let filteredBlocks = selectedTags.length
            ? appManager.getBlocks().filter(block =>
                  selectedTags.every(t =>
                      block.tags.map(bt => bt.trim().toLowerCase()).includes(t.toLowerCase())
                  )
              )
            : appManager.getBlocks(); // If no tags selected, show all blocks

        console.log("🟢 Blocks After Tag Filtering (Before Search):", filteredBlocks);

        // Now apply the search query only within filteredBlocks
        const searchResults = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(query) ||
            block.text.toLowerCase().includes(query)
        );
                        
        console.log("✅ Final Search Results (Matching Search & Tags):", searchResults);

        // Highlight matching text
        const highlightMatch = (text, query) => {
            if (!query) return text; // If no search text, return original text
            const regex = new RegExp(`(${query})`, "gi"); // Case-insensitive match
            return text.replace(regex, `<span class="highlight">$1</span>`);
        };

        // Modify block rendering to include highlighted text
        const highlightedBlocks = searchResults.map(block => ({
            ...block,
            title: highlightMatch(block.title, query),
            text: highlightMatch(block.text, query),
            highlighted: true
        }));
        
        // IMPORTANT: Pass the active tab id as the first parameter,
        // and the highlighted blocks array as the second parameter.
        appManager.renderBlocks(appManager.getActiveTab(), highlightedBlocks);
    });
};

// Clear filters and reset results for the specific tab
const clearFilters = (event) => {
    console.log("Clear Filters button clicked");
    
    // Extract the tab number from the button's id
    const tabNumber = event.currentTarget.id.split("_").pop();
    
    // Remove 'selected' class from all tag buttons within the specific tab
    document.querySelectorAll(`#tab${tabNumber} .tag-button.selected`).forEach(tag => tag.classList.remove("selected"));
    
    // Clear the search input for the current tab
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) {
        searchInput.value = "";
    }
    
    // Clear selected tags in the tagHandler
    tagHandler.clearSelectedTags();
    
    // Re-render blocks for the specific tab
    const activeTab = `tab${tabNumber}`;
    appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
    
    const updatedTags = tagHandler.getSelectedTags(); 
    console.log("🔵 Currently selected tags:", updatedTags);
};

// Attach clear filters event listeners to all clear filters buttons
document.querySelectorAll(".clear_filters_button").forEach(button => {
    button.addEventListener("click", clearFilters);
});


// 📌 Initialize dynamic tags and overlays
const initializeDynamicTags = () => {
    console.log("Initializing dynamic tags and overlays");

    // Iterate through each tab
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(tabNumber => {
        const tagsSection = document.getElementById(`dynamic_tags_section_${tabNumber}`);
        if (!tagsSection) return; // ✅ Shorter and clearer
    
        tagsSection.innerHTML = ""; // ✅ Clear previous content
    
        Object.keys(categoryTags).forEach(category => {
            if (!categoryTags[category].tabs.includes(`tab${tabNumber}`)) return; // ✅ Use directly
    
            const tagContainer = document.createElement("div");
            tagContainer.classList.add("tag-section");
            tagContainer.id = `${category}_tags_list_${tabNumber}`;
    
            // ✅ More efficient way to append buttons
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
            // Ignore shortcuts if a modifier key is pressed
            if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            const addBlockOverlay = document.querySelector(".add-block-overlay");
            const clearDataOverlay = document.querySelector(".cleardata-overlay");
            const editBlockOverlay = document.querySelector(".edit-block-overlay");
            const spellSlotEditOverlay = document.querySelector(".spell-slot-edit-overlay"); // New Overlay

            const saveBlockButton = document.getElementById("save_block_button");
            const cancelAddBlockButton = document.getElementById("cancel_add_block");
            const confirmClearButton = document.getElementById("confirm_clear_button");
            const cancelClearButton = document.getElementById("cancel_clear_button");
            const saveEditButton = document.getElementById("save_edit_button");
            const cancelEditButton = document.getElementById("cancel_edit_block");
            const saveSpellSlotButton = document.getElementById("save_spell_slot_changes"); // New Save Button
            const cancelSpellSlotButton = document.getElementById("close_spell_slot_edit"); // New Cancel Button

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

            // 🔹 New: Spell Slot Edit Overlay Keyboard Shortcuts
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

// Function to update the viewState of all blocks in the active tab and re-render them
const updateBlocksViewState = (newState) => {
    const activeTab = appManager.getActiveTab();
    let blocks = appManager.getBlocks(activeTab);
    // Update viewState for each block
    blocks.forEach(block => {
        block.viewState = newState;
    });
    // Save the updated blocks to localStorage for the active tab
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
    // Re-render the blocks for the active tab
    appManager.renderBlocks(activeTab);
};

// Attach the new event listeners to the view state buttons
document.getElementById("view_expanded_button")?.addEventListener("click", () => {
    updateBlocksViewState("expanded");
});
document.getElementById("view_condensed_button")?.addEventListener("click", () => {
    updateBlocksViewState("condensed");
});
document.getElementById("view_minimized_button")?.addEventListener("click", () => {
    updateBlocksViewState("minimized");
});


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
};
