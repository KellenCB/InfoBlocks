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
    const handleBlockActions = () => {
        const resultsSection = document.getElementById("results_section");

        resultsSection.addEventListener("click", (event) => {
            const target = event.target;

            if (target.classList.contains("edit_button")) {
                const blockId = target.getAttribute("data-id");
                const blockToEdit = appManager.getBlocks().find(block => block.id === blockId);

                if (!blockToEdit) {
                    console.error(`❌ Block with ID ${blockId} not found.`);
                    return;
                }

                console.log(`🟢 Editing block: ${blockId}`);
                console.log("🔹 Block data before processing:", blockToEdit);

                isEditing = true;
                currentEditingBlockId = blockId;

                selectedFilterTags = tagHandler.getSelectedTags();
                console.log("✅ Stored search & filter tags BEFORE editing:", selectedFilterTags);

                document.getElementById("title_input_edit_overlay").value = blockToEdit.title;
                document.getElementById("block_text_edit_overlay").value = blockToEdit.text;

                const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));

                const userDefinedTags = blockToEdit.tags.filter(tag => !predefinedTags.has(tag));
                const attachedPredefinedTags = blockToEdit.tags.filter(tag => predefinedTags.has(tag));

                console.log("✅ User-defined tags (to appear in input field):", userDefinedTags);
                console.log("✅ Predefined tags (to appear selected):", attachedPredefinedTags);

                const tagInputField = document.getElementById("tags_input_edit_overlay");
                tagInputField.value = userDefinedTags.length > 0 ? userDefinedTags.join(", ") : "";

                console.log("🛠 Setting tags_input_edit_overlay to:", tagInputField.value);

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
            }
        });
    };

    return { handleBlockActions };
})();
