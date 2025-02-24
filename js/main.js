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
    const tabNav = document.querySelector(".tabs-nav");
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    // Handle tab switching
    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetTab = button.dataset.tab;

            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            // Activate the clicked tab
            button.classList.add("active");
            document.getElementById(targetTab).classList.add("active");
        });

        // Enable dragging
        button.setAttribute("draggable", "true");

        button.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", button.dataset.tab);
            button.classList.add("dragging");
        });

        button.addEventListener("dragend", () => {
            button.classList.remove("dragging");
        });
    });

    // Handle tab reordering
    tabNav.addEventListener("dragover", (e) => {
        e.preventDefault(); // Allow dropping
        const draggingTab = document.querySelector(".dragging");
        const afterElement = getDragAfterElement(tabNav, e.clientX);

        if (afterElement == null) {
            tabNav.appendChild(draggingTab);
        } else {
            tabNav.insertBefore(draggingTab, afterElement);
        }
    });

    // Find the closest tab based on cursor position
    function getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll(".tab-button:not(.dragging)")];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;

            return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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
        : appManager.getBlocks(); // Show all if no filters are active

    appManager.renderBlocks(filteredBlocks);
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

// Clear search input and refresh UI
const clearSearch = () => {
    document.getElementById("search_input").value = "";
    appManager.renderBlocks(appManager.getBlocks()); // Reset to all blocks
};

document.getElementById("clear_search_button")?.addEventListener("click", clearSearch);

// 📌 Clear filters and reset results
const clearFilters = () => {
    console.log("Clear Filters button clicked");
    document.querySelectorAll(".tag-button.selected").forEach(tag => tag.classList.remove("selected"));
    document.getElementById("search_input").value = "";
    tagHandler.clearSelectedTags();
    appManager.renderBlocks(appManager.getBlocks());
    const updatedTags = tagHandler.getSelectedTags(); 
    console.log("🔵 Currently selected tags:", updatedTags);
};

// 📌 Initialize dynamic tags and overlays
const initializeDynamicTags = () => {
    console.log("Initializing dynamic tags and overlays");

    const tagsSection = document.getElementById("dynamic_tags_section");
    Object.keys(categoryTags).forEach(category => {
        const tagContainer = document.createElement("div");
        tagContainer.classList.add("tag-section");
        tagContainer.id = `${category}_tags_list`;
        tagsSection.appendChild(tagContainer);
        appManager.renderTags(categoryTags[category]?.tags || [], tagContainer.id);
    });

    ["dynamic_overlay_tags", "dynamic_edit_overlay_tags"].forEach(sectionId => {
        const section = document.getElementById(sectionId);
        Object.keys(categoryTags).forEach(category => {
            const overlayContainer = document.createElement("div");
            overlayContainer.classList.add("tag-section");
            overlayContainer.id = `${category}_tags_${sectionId.includes("edit") ? "edit_" : ""}overlay`;
            section.appendChild(overlayContainer);
            appManager.renderTags(categoryTags[category]?.tags || [], overlayContainer.id);
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
    appManager.renderBlocks(appManager.getBlocks());
    appManager.updateTags();

    console.log("✅ All event listeners successfully attached.");
};
