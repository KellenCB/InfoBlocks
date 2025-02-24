let isEditing = false;
let currentEditingBlockId = null;

import { categoryTags } from './tagConfig.js';
import { tagHandler } from './tagHandler.js';
import { appManager } from './appManager.js';

export const saveEditHandler = () => {
    console.log("✅ Save Edit Button Clicked!");

    const titleInput = document.getElementById("title_input_edit_overlay").value.trim();
    const textInput = document.getElementById("block_text_edit_overlay").value.trim();
    const tagsInput = document.getElementById("tags_input_edit_overlay").value
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    const selectedPredefinedTags = Array.from(document.querySelectorAll(".edit-block-overlay .tag-button.selected"))
        .map(tag => tag.dataset.tag);

    const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
    const filteredUserDefinedTags = tagsInput.map(tag => predefinedTags.has(tag) ? tag : tag);
    const allTags = [...new Set([...filteredUserDefinedTags, ...selectedPredefinedTags])];
    
    if (!titleInput || !textInput) {
        alert("All fields (Title and Text) are required.");
        return;
    }

    if (!currentEditingBlockId) {
        console.error("❌ No block ID found for editing.");
        return;
    }

    let blocks = appManager.getBlocks();
    const blockIndex = blocks.findIndex(block => block.id === currentEditingBlockId);

    if (blockIndex === -1) {
        console.error(`❌ Block with ID ${currentEditingBlockId} not found.`);
        return;
    }

    // ✅ Save the edited block while keeping its original timestamp
    appManager.saveBlock(titleInput, textInput, allTags, currentEditingBlockId, blocks[blockIndex].timestamp);
    console.log("✅ Block updated successfully with tags:", allTags);

    // ✅ Close the edit overlay
    document.querySelector(".edit-block-overlay").classList.remove("show");

    // ✅ Preserve search input and selected tags
    const selectedTags = tagHandler.getSelectedTags(); // ✅ Get selected tags
    const searchQuery = document.getElementById("search_input")?.value.trim().toLowerCase(); // ✅ Get search input
    
    let filteredBlocks = appManager.getBlocks();

    // ✅ Apply search filter
    if (searchQuery) {
        filteredBlocks = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(searchQuery) ||
            block.text.toLowerCase().includes(searchQuery) ||
            block.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
    }

    // ✅ Apply tag filters (ensures all selected tags must be present)
    if (selectedTags.length > 0) {
        filteredBlocks = filteredBlocks.filter(block =>
            selectedTags.every(tag => block.tags.includes(tag))
        );
    }

    // ✅ Render only filtered blocks
    setTimeout(() => {
        appManager.renderBlocks(filteredBlocks);
        appManager.updateTags(); // Ensure the tags are refreshed correctly
    }, 50);
};

export let selectedFilterTags = []; // ✅ Stores the search & filter tags before editing

export const blockActionsHandler = (() => {
    const handleBlockActions = (event) => {
        const target = event.target;
        const blockId = target.getAttribute("data-id");

        if (!blockId) return;

        const selectedTags = tagHandler.getSelectedTags(); // ✅ Get selected tags
        const searchQuery = document.getElementById("search_input")?.value.trim().toLowerCase(); // ✅ Get current search input

        const block = appManager.getBlocks().find(b => b.id === blockId);
        if (!block) {
            console.error(`❌ Block with ID ${blockId} not found.`);
            return;
        }

        if (target.classList.contains("duplicate_button")) {
            console.log("📄 Duplicating block:", blockId);
            appManager.saveBlock(block.title + " (Copy)", block.text, block.tags, null, block.timestamp);

        } else if (target.classList.contains("edit_button")) {
            console.log("📝 Editing block:", blockId);
            isEditing = true;
            currentEditingBlockId = blockId;

            selectedFilterTags = tagHandler.getSelectedTags();
            console.log("✅ Stored search & filter tags BEFORE editing:", selectedFilterTags);

            document.getElementById("title_input_edit_overlay").value = block.title;
            document.getElementById("block_text_edit_overlay").value = block.text;

            const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
            const userDefinedTags = block.tags.filter(tag => !predefinedTags.has(tag));
            const attachedPredefinedTags = block.tags.filter(tag => predefinedTags.has(tag));

            document.getElementById("tags_input_edit_overlay").value = userDefinedTags.length > 0 ? userDefinedTags.join(", ") : "";

            // ✅ Set a small delay to avoid premature deselection
            setTimeout(() => {
                document.querySelectorAll(".edit-block-overlay .tag-button").forEach(button => {
                    button.classList.remove("selected");
                    if (attachedPredefinedTags.includes(button.dataset.tag)) {
                        button.classList.add("selected");
                    }
                });
            }, 100); // Prevents premature clearing

            console.log("🟢 Edit Block Overlay Opened Successfully");
            document.querySelector(".edit-block-overlay").classList.add("show");

        } else if (target.classList.contains("remove_button")) {
            console.log("🗑 Removing block:", blockId);
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

    const attachBlockActions = () => {
        const resultsSection = document.getElementById("results_section");
        resultsSection.addEventListener("click", handleBlockActions);
        console.log("✅ Block action handlers attached!");
    };

    return { attachBlockActions };
})();
