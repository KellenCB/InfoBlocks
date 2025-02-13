import { appManager } from './appManager.js';
import { blockActionsHandler, saveEditHandler } from './blockActionsHandler.js';
import { overlayHandler, handleSaveBlock } from './overlayHandler.js';
import { keyboardShortcutsHandler } from './keyboardShortcutsHandler.js';
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
    document.addEventListener("click", handleBlockActions);

    // Tag selection for filtering
    document.getElementById("dynamic_tags_section")?.addEventListener("click", handleTagFilter);

    // Search functionality
    document.getElementById("search_input")?.addEventListener("input", handleSearch);

    // Clear filters
    document.getElementById("clear_filters_button")?.addEventListener("click", clearFilters);
};

// 📌 Handle block actions (Duplicate, Edit, Remove)
const handleBlockActions = (event) => {
    const target = event.target;
    const blockId = target.dataset.id;

    if (!blockId) return;

    const selectedTags = tagHandler.getSelectedTags(); // ✅ Get currently selected tags
    const searchQuery = document.getElementById("search_input")?.value.trim().toLowerCase(); // ✅ Get current search input

    if (target.classList.contains("duplicate_button")) {
        console.log("Duplicating block:", blockId);
        const block = appManager.getBlocks().find(b => b.id === blockId);
        if (block) {
            appManager.saveBlock(block.title + " (Copy)", block.text, block.tags, null, block.timestamp);
        }
    } else if (target.classList.contains("edit_button")) {
        console.log("Editing block:", blockId);
        const block = appManager.getBlocks().find(b => b.id === blockId);
        if (block) {
            document.getElementById("title_input_edit_overlay").value = block.title;
            document.getElementById("block_text_edit_overlay").value = block.text;
            const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
            const userDefinedTags = block.tags.filter(tag => !predefinedTags.has(tag));
            
            document.getElementById("tags_input_edit_overlay").value = userDefinedTags.length > 0 ? userDefinedTags.join(", ") : "";
            document.querySelector(".edit-block-overlay").classList.add("show");
        }
    } else if (target.classList.contains("remove_button")) {
        console.log("Removing block:", blockId);
        appManager.removeBlock(blockId);
    }

    // ✅ Ensure blocks are filtered correctly after any action
    let filteredBlocks = appManager.getBlocks();

    // ✅ Apply search filter if there's a query
    if (searchQuery) {
        filteredBlocks = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(searchQuery) ||
            block.text.toLowerCase().includes(searchQuery) ||
            block.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
    }

    // ✅ Apply tag filter if tags are selected
    if (selectedTags.length > 0) {
        filteredBlocks = filteredBlocks.filter(block =>
            selectedTags.every(tag => block.tags.includes(tag))
        );
    }

    // ✅ Render only filtered blocks
    appManager.renderBlocks(filteredBlocks);
    appManager.updateTags();
};

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

window.onload = async () => {
    console.log("🔄 Window Loaded - Initializing App");

    attachEventListeners(); 
    blockActionsHandler.handleBlockActions();
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
