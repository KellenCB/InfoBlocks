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

    // Search functionality
    document.getElementById("search_input")?.addEventListener("input", handleSearch);

    // Clear filters
    document.getElementById("clear_filters_button")?.addEventListener("click", clearFilters);
};



// 📌 Tab functionality
document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    // ✅ Hide all tab contents except the first one
    tabContents.forEach(content => {
        content.classList.remove("active");
        content.style.display = "none";
    });

    if (tabContents.length > 0) {
        tabContents[0].classList.add("active");
        tabContents[0].style.display = "flex";
    }

    tabButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            const targetTab = event.currentTarget.dataset.tab; // ✅ Ensures `targetTab` is properly defined
            const targetContent = document.getElementById(targetTab);
    
            if (!targetTab) {
                console.error("❌ Error: targetTab is undefined.");
                return;
            }
    
            if (!targetContent) {
                console.error(`❌ Error: Tab content with ID "${targetTab}" not found.`);
                return;
            }
    
            // ✅ Hide all tab contents before switching
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => {
                content.classList.remove("active");
                content.style.display = "none";
            });
    
            // ✅ Show the new active tab
            button.classList.add("active");
            targetContent.classList.add("active");
            targetContent.style.display = "flex";
    
            console.log(`✅ Switched to Tab: ${targetTab}`);
    
            // ✅ Ensure blocks refresh when switching tabs
            if (typeof appManager !== "undefined" && appManager.renderBlocks) {
                console.log("📦 Refreshing UI: Calling renderBlocks() for", targetTab);
                appManager.renderBlocks(targetTab);
                appManager.updateTags(); // ✅ Also refresh tags if applicable
            } else {
                console.warn("⚠️ appManager.renderBlocks() is not defined or not callable.");
            }
    
            // Lazy load the dice roller module only when Tab 5 is activated
            if (targetTab === "tab5") {
                import('./diceRoller.js')
                    .then(module => {
                        module.initDiceRoller();
                    })
                    .catch(err => console.error("Failed to load diceRoller module:", err));
            }
    
            // ✅ Ensure the UI updates properly
            setTimeout(() => {
                console.log(`📌 Checking if content is visible for ${targetTab}`);
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

    // Search functionality per tab
    document.querySelectorAll(".search-container input").forEach(input => {
        input.addEventListener("input", () => {
            const tabNumber = input.id.split("_").pop();
            const activeTab = `tab${tabNumber}`;
            const query = input.value.trim().toLowerCase();
    
            let filteredBlocks = appManager.getBlocks(activeTab).filter(block =>
                block.title.toLowerCase().includes(query) || block.text.toLowerCase().includes(query)
            );
    
            // Call renderBlocks so the header is re-added
            appManager.renderBlocks(activeTab, filteredBlocks);
        });
    });
    
    // Initial render
    appManager.renderBlocks(targetTab);
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

        // ✅ Get currently selected tags
        const selectedTags = tagHandler.getSelectedTags();
        console.log("🟠 Currently Selected Tags:", selectedTags);

        // ✅ First, filter blocks based on selected tags
        let filteredBlocks = selectedTags.length
            ? appManager.getBlocks().filter(block =>
                selectedTags.every(t =>
                    block.tags.map(bt => bt.trim().toLowerCase()).includes(t.toLowerCase())
                )
            )
            : appManager.getBlocks(); // ✅ If no tags selected, show all blocks

        console.log("🟢 Blocks After Tag Filtering (Before Search):", filteredBlocks);

        // ✅ Now apply the search query **only within filteredBlocks**
        const searchResults = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(query) ||
            block.text.toLowerCase().includes(query)
        );

        console.log("✅ Final Search Results (Matching Search & Tags):", searchResults);

        // ✅ Highlight matching text
        const highlightMatch = (text, query) => {
            if (!query) return text; // If no search text, return original text
            const regex = new RegExp(`(${query})`, "gi"); // Case-insensitive match
            return text.replace(regex, `<span class="highlight">$1</span>`); // Wrap match in <span>
        };

        // ✅ Modify block rendering to include highlighted text
        const highlightedBlocks = searchResults.map(block => ({
            ...block,
            title: highlightMatch(block.title, query),
            text: highlightMatch(block.text, query)
        }));

        // ✅ Re-render the UI with highlighted search results
        appManager.renderBlocks(highlightedBlocks);
    });
};

// Clear search input and refresh UI for the specific tab
const clearSearch = (event) => {
    
    // Extract tab number from the button's id (e.g. "clear_search_button_1" -> "1")
    const tabNumber = event.currentTarget.id.split("_").pop();
    
    // Target the correct search input using the tab number
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) {
        searchInput.value = "";
    }
    
    // Re-render blocks for the specific tab
    const activeTab = `tab${tabNumber}`;
    appManager.renderBlocks(activeTab, appManager.getBlocks(activeTab));
};

// Attach clear search event listeners to all clear search buttons
document.querySelectorAll(".clear-search").forEach(button => {
    button.addEventListener("click", clearSearch);
});

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

    // ✅ Iterate through each tab
    [1, 2, 3, 4, 5].forEach(tabNumber => {
        const tagsSection = document.getElementById(`dynamic_tags_section_${tabNumber}`);
        if (!tagsSection) {
            console.warn(`⚠️ Warning: dynamic_tags_section_${tabNumber} container not found. Skipping.`);
            return;
        }

        // ✅ Clear previous content before appending new tags
        tagsSection.innerHTML = "";

        // ✅ Append tag categories dynamically
        Object.keys(categoryTags).forEach(category => {
            const tagContainer = document.createElement("div");
            tagContainer.classList.add("tag-section");
            tagContainer.id = `${category}_tags_list_${tabNumber}`;

            // ✅ Generate tag buttons
            tagContainer.innerHTML = categoryTags[category].tags.map(tag =>
                `<button class="tag-button ${categoryTags[category].className}" data-tag="${tag}">${tag}</button>`
            ).join("");

            // ✅ Append tag container to the correct dynamic_tags_section
            tagsSection.appendChild(tagContainer);
        });

        console.log(`✅ Populated dynamic_tags_section_${tabNumber} with all predefined tags.`);
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

            const saveBlockButton = document.getElementById("save_block_button");
            const cancelAddBlockButton = document.getElementById("cancel_add_block");
            const confirmClearButton = document.getElementById("confirm_clear_button");
            const cancelClearButton = document.getElementById("cancel_clear_button");
            const saveEditButton = document.getElementById("save_edit_button");
            const cancelEditButton = document.getElementById("cancel_edit_block");

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
        });

        console.log("Keyboard shortcuts attached.");
    };

    return { handleKeyboardShortcuts };
})();

window.onload = async () => {
    console.log("🔄 Window Loaded - Initializing App");

    attachEventListeners(); 
    blockActionsHandler.attachBlockActions();
    console.log("✅ Block Actions Handler Attached!");

    const saveEditButton = document.getElementById("save_edit_button");
    if (saveEditButton) {
        saveEditButton.addEventListener("click", saveEditHandler);
        console.log("✅ Save Edit Button Listener Attached on Load!");
    }

    const saveBlockButton = document.getElementById("save_block_button");
    if (saveBlockButton) {
        saveBlockButton.addEventListener("click", handleSaveBlock);
        console.log("✅ Save Block Button Listener Attached on Load!");
    }

    initializeDynamicTags();
    await appManager.loadBlocks();
    appManager.renderBlocks(appManager.getActiveTab()); 
    appManager.updateTags();

    console.log("✅ All event listeners successfully attached.");
};
