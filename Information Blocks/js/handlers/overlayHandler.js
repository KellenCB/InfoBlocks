import { dataManager } from '../dataManager.js';
import { uiManager } from '../uiManager.js';
import { keyboardShortcutsHandler } from './keyboardShortcutsHandler.js';

export const overlayHandler = (() => {
    const selectedOverlayTags = {
        partType: [],
        actionType: [],
        abilityType: []
    };

    const attachKeyboardShortcuts = () => {
        const addBlockOverlay = document.querySelector(".add-block-overlay");
        const clearDataOverlay = document.querySelector(".cleardata-overlay");
        const editBlockOverlay = document.querySelector(".edit-block-overlay");
        const saveBlockButton = document.getElementById("save_block_button");
        const cancelAddBlockButton = document.getElementById("cancel_add_block");
        const confirmClearButton = document.getElementById("confirm_clear_button");
        const cancelClearButton = document.getElementById("cancel_clear_button");
        const saveEditButton = document.getElementById("save_edit_button");
        const cancelEditButton = document.getElementById("cancel_edit_block");
    
        console.log({ addBlockOverlay, clearDataOverlay, editBlockOverlay, saveBlockButton, cancelAddBlockButton, confirmClearButton, cancelClearButton, saveEditButton, cancelEditButton });
    
        keyboardShortcutsHandler.handleKeyboardShortcuts({
            addBlockOverlay,
            clearDataOverlay,
            editBlockOverlay,
            saveBlockButton,
            cancelAddBlockButton,
            confirmClearButton,
            cancelClearButton,
            saveEditButton,
            cancelEditButton
        });
    };
    



    const handleSaveBlock = () => {
        const saveBlockButton = document.getElementById("save_block_button");
        if (!saveBlockButton) return;
    
        saveBlockButton.addEventListener("click", () => {
            const titleInput = document.getElementById("title_input_overlay").value.trim();
            const textInput = document.getElementById("block_text_overlay").value.trim();
            const tagsInput = document.getElementById("tags_input_overlay").value
                .split(",")
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);
    
            // Validation
            if (!titleInput || !textInput) {
                alert("All fields (Title and Text) are required.");
                return;
            }
    
            // Collect selected predefined tags
            const selectedPredefinedTags = [
                ...Array.from(document.querySelectorAll("#part_type_tags_overlay .tag-button.selected"))
                    .map(button => button.getAttribute("data-tag")),
                ...Array.from(document.querySelectorAll("#action_type_tags_overlay .tag-button.selected"))
                    .map(button => button.getAttribute("data-tag")),
                ...Array.from(document.querySelectorAll("#ability_type_tags_overlay .tag-button.selected"))
                    .map(button => button.getAttribute("data-tag")),
            ];
    
            // Combine all tags
            const allTags = [...new Set([...tagsInput, ...selectedPredefinedTags])];
    
            // Save the new block
            const success = dataManager.saveBlock(titleInput, textInput, allTags);
    
            if (success) {
                console.log("Block saved successfully. Updating tags...");
    
                // Re-render the blocks
                uiManager.renderBlocks(dataManager.getBlocks());
    
                // Re-render user-defined tags
                const userDefinedTags = dataManager.getUserDefinedTags();
                uiManager.renderTags(userDefinedTags, "tags_list");
    
                // Re-render predefined tags in their respective lists
                uiManager.renderTags(dataManager.getFilteredTags("partType"), "part_type_tags_list");
                uiManager.renderTags(dataManager.getFilteredTags("actionType"), "action_type_tags_list");
                uiManager.renderTags(dataManager.getFilteredTags("abilityType"), "ability_type_tags_list");
    
                // Clear input fields
                document.getElementById("title_input_overlay").value = "";
                document.getElementById("block_text_overlay").value = "";
                document.getElementById("tags_input_overlay").value = "";
    
                // Clear selected tags in the overlay
                ["part_type_tags_overlay", "action_type_tags_overlay", "ability_type_tags_overlay"].forEach(listId => {
                    const tagList = document.getElementById(listId);
                    if (tagList) {
                        const selectedTags = tagList.querySelectorAll(".tag-button.selected");
                        selectedTags.forEach(tag => tag.classList.remove("selected"));
                    }
                });
    
                // Hide the Add Block Overlay
                const addBlockOverlay = document.querySelector(".add-block-overlay");
                addBlockOverlay.classList.remove("show");
            } else {
                console.error("Failed to save the block.");
            }
        });
    };

    const handleClearBlock = () => {
        const clearBlockButton = document.getElementById("clear_block_button");
        if (!clearBlockButton) return;

        clearBlockButton.addEventListener("click", () => {
            const titleInput = document.getElementById("title_input_overlay");
            const textInput = document.getElementById("block_text_overlay");
            const tagsInput = document.getElementById("tags_input_overlay");

            titleInput.value = "";
            textInput.value = "";
            tagsInput.value = "";

            const overlayTagLists = [
                "part_type_tags_overlay",
                "action_type_tags_overlay",
                "ability_type_tags_overlay"
            ];

            overlayTagLists.forEach(listId => {
                const tagsList = document.getElementById(listId);
                if (tagsList) {
                    const tagButtons = tagsList.querySelectorAll(".tag-button");
                    tagButtons.forEach(button => button.classList.remove("selected"));
                }
            });

            Object.keys(selectedOverlayTags).forEach(type => {
                selectedOverlayTags[type] = [];
            });

            console.log("Overlay inputs and selected tags cleared.");
        });
    };

    const handleCancelBlock = () => {
        const cancelAddBlockButton = document.getElementById("cancel_add_block");
        if (!cancelAddBlockButton) return;

        cancelAddBlockButton.addEventListener("click", () => {
            console.log("Cancel button clicked");
            const addBlockOverlay = document.querySelector(".add-block-overlay");
            addBlockOverlay.classList.remove("show");
        });
    };



    const handleClearEditOverlay = () => {
        const clearEditButton = document.getElementById("clear_edit_button");
        if (!clearEditButton) return;
    
        clearEditButton.addEventListener("click", () => {
            const titleInput = document.getElementById("title_input_edit_overlay");
            const textInput = document.getElementById("block_text_edit_overlay");
            const tagsInput = document.getElementById("tags_input_edit_overlay");
    
            // Clear all input fields
            titleInput.value = "";
            textInput.value = "";
            tagsInput.value = "";
    
            console.log("Edit overlay fields cleared.");
        });
    };

    const handleCancelEditOverlay = () => {
        const cancelEditButton = document.getElementById("cancel_edit_block");
        if (!cancelEditButton) return;
    
        cancelEditButton.addEventListener("click", () => {
            const editBlockOverlay = document.querySelector(".edit-block-overlay");
    
            // Hide the Edit Overlay
            editBlockOverlay.classList.remove("show");
    
            console.log("Edit overlay canceled and closed.");
        });
    };


    const handleTagSelection = (containerId, type) => {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        container.addEventListener("click", (event) => {
            const target = event.target;
    
            // Stop propagation to prevent unintended bubbling
            event.stopPropagation();
    
            if (target.classList.contains("tag-button")) {
                const tag = target.getAttribute("data-tag");
    
                // Check if the tag is already selected
                if (selectedOverlayTags[type].includes(tag)) {
                    console.log(`Removing tag "${tag}" from ${type}`);
                    selectedOverlayTags[type] = selectedOverlayTags[type].filter(t => t !== tag);
                    target.classList.remove("selected");
                } else {
                    console.log(`Adding tag "${tag}" to ${type}`);
                    selectedOverlayTags[type].push(tag);
                    target.classList.add("selected");
                }
    
                console.log(`Updated tags for ${type}:`, selectedOverlayTags[type]);
            }
        });
    };
    
    

    const initializeOverlayTagHandlers = () => {
        handleTagSelection("part_type_tags_overlay", "partType");
        handleTagSelection("action_type_tags_overlay", "actionType");
        handleTagSelection("ability_type_tags_overlay", "abilityType");
    };

    const initializeEventHandlers = () => {
        handleSaveBlock();
        handleClearBlock();
        handleCancelBlock();
        handleClearEditOverlay();
        handleCancelEditOverlay();    
    };

    return { attachKeyboardShortcuts, initializeOverlayTagHandlers, initializeEventHandlers };
})();
