let isEditing = false;
let currentEditingBlockId = null;

import { dataManager } from '../dataManager.js';
import { uiManager } from '../uiManager.js';

export const blockActionsHandler = (() => {
    const handleBlockActions = () => {
        const resultsSection = document.getElementById("results_section");

        resultsSection.addEventListener("click", (event) => {
            const target = event.target;

            if (target.classList.contains("remove_button")) {
                console.log("Remove button clicked");
                const blockId = target.getAttribute("data-id");
                if (blockId) {
                    dataManager.removeBlock(blockId); // Remove the block by ID
            
                    // Re-render blocks in the UI
                    uiManager.renderBlocks(dataManager.getBlocks());
            
                    // Filter user-defined tags (exclude predefined tags)
                    const userDefinedTags = dataManager.getTags().filter(tag =>
                        !dataManager.getPredefinedTags("partType").includes(tag) &&
                        !dataManager.getPredefinedTags("actionType").includes(tag) &&
                        !dataManager.getPredefinedTags("abilityType").includes(tag)
                    );
            
                    // Re-render the filtered tags in the "tags_list"
                    uiManager.renderTags(userDefinedTags, "tags_list");
            
                    // Re-render predefined tags in their respective lists
                    uiManager.renderTags(dataManager.getFilteredTags("partType"), "part_type_tags_list");
                    uiManager.renderTags(dataManager.getFilteredTags("actionType"), "action_type_tags_list");
                    uiManager.renderTags(dataManager.getFilteredTags("abilityType"), "ability_type_tags_list");
            
                    console.log(`Block with ID "${blockId}" removed.`);
                } else {
                    console.error("No ID found for the block to remove.");
                }
            }
            

            if (target.classList.contains("duplicate_button")) {
                const blockId = target.getAttribute("data-id");
                const blockToDuplicate = dataManager.getBlocks().find(block => block.id === blockId);
                if (blockToDuplicate) {
                    // Create a duplicate block with a unique ID
                    const duplicateBlock = {
                        ...blockToDuplicate,
                        id: crypto.randomUUID(), // Generate a new unique ID
                    };
            
                    // Save the duplicated block
                    dataManager.saveBlock(duplicateBlock.title, duplicateBlock.text, duplicateBlock.tags);
            
                    // Re-render blocks and tags
                    uiManager.renderBlocks(dataManager.getBlocks());
            
                    // Re-render user-defined tags in the "tags_list"
                    const userDefinedTags = dataManager.getTags().filter(tag =>
                        !dataManager.getPredefinedTags("partType").includes(tag) &&
                        !dataManager.getPredefinedTags("actionType").includes(tag) &&
                        !dataManager.getPredefinedTags("abilityType").includes(tag)
                    );
                    uiManager.renderTags(userDefinedTags, "tags_list");
            
                    // Re-render predefined tags in their respective lists
                    uiManager.renderTags(dataManager.getFilteredTags("partType"), "part_type_tags_list");
                    uiManager.renderTags(dataManager.getFilteredTags("actionType"), "action_type_tags_list");
                    uiManager.renderTags(dataManager.getFilteredTags("abilityType"), "ability_type_tags_list");
            
                    console.log(`Block with ID "${blockId}" duplicated as new block with ID "${duplicateBlock.id}".`);
                } else {
                    console.error(`Block with ID "${blockId}" not found for duplication.`);
                }
            }
            

            if (target.classList.contains("edit_button")) {
                const blockId = target.getAttribute("data-id");
                const blockToEdit = dataManager.getBlocks().find(block => block.id === blockId);
            
                if (blockToEdit) {
                    // Set editing context
                    isEditing = true;
                    currentEditingBlockId = blockId;
            
                    const titleInputOverlay = document.getElementById("title_input_edit_overlay");
                    const blockTextOverlay = document.getElementById("block_text_edit_overlay");
                    const tagsInputOverlay = document.getElementById("tags_input_edit_overlay");
                    const editBlockOverlay = document.querySelector(".edit-block-overlay");
                    const saveEditButton = document.getElementById("save_edit_button");
            
                    // Pre-fill text inputs with block data
                    titleInputOverlay.value = blockToEdit.title;
                    blockTextOverlay.value = blockToEdit.text;
            
                    // Render predefined tags and mark attached tags as selected
                    const markSelectedTags = (tags, containerId) => {
                        const container = document.getElementById(containerId);
                        if (!container) return;
                    
                        // Render tags in the container
                        container.innerHTML = tags
                            .map(tag => `
                                <button 
                                    class="tag-button ${blockToEdit.tags.includes(tag) ? "selected" : ""}" 
                                    data-tag="${tag}">
                                    ${tag}
                                </button>
                            `)
                            .join("");
                    
                        // Attach click event listeners for tag buttons
                        container.querySelectorAll(".tag-button").forEach(button => {
                            button.addEventListener("click", () => {
                                const tag = button.getAttribute("data-tag");
                                if (button.classList.contains("selected")) {
                                    button.classList.remove("selected");
                                    console.log(`Tag "${tag}" deselected.`);
                                } else {
                                    button.classList.add("selected");
                                    console.log(`Tag "${tag}" selected.`);
                                }
                            });
                        });
                    };
                    
            
                    markSelectedTags(dataManager.getPredefinedTags("partType"), "part_type_tags_edit_overlay");
                    markSelectedTags(dataManager.getPredefinedTags("actionType"), "action_type_tags_edit_overlay");
                    markSelectedTags(dataManager.getPredefinedTags("abilityType"), "ability_type_tags_edit_overlay");
            
                    // Populate user-defined tags in the input field
                    const userDefinedTags = blockToEdit.tags.filter(tag =>
                        !dataManager.getPredefinedTags("partType").includes(tag) &&
                        !dataManager.getPredefinedTags("actionType").includes(tag) &&
                        !dataManager.getPredefinedTags("abilityType").includes(tag)
                    );
                    tagsInputOverlay.value = userDefinedTags.join(", ");
            
                    // Show the Edit Overlay
                    editBlockOverlay.classList.add("show");
            
                    const saveEditHandler = () => {
                        const newTitle = titleInputOverlay.value.trim();
                        const newText = blockTextOverlay.value.trim();
                        const newTagsInput = tagsInputOverlay.value
                            .split(",")
                            .map(tag => tag.trim())
                            .filter(tag => tag.length > 0);
                    
                        // Validation
                        if (!newTitle || !newText) {
                            alert("All fields (Title and Text) are required to save changes.");
                            return;
                        }
                    
                        // Collect selected predefined tags
                        const selectedPredefinedTags = [
                            ...Array.from(document.querySelectorAll("#part_type_tags_edit_overlay .tag-button.selected"))
                                .map(button => button.getAttribute("data-tag")),
                            ...Array.from(document.querySelectorAll("#action_type_tags_edit_overlay .tag-button.selected"))
                                .map(button => button.getAttribute("data-tag")),
                            ...Array.from(document.querySelectorAll("#ability_type_tags_edit_overlay .tag-button.selected"))
                                .map(button => button.getAttribute("data-tag")),
                        ];
                    
                        // Combine all tags
                        const allTags = [...new Set([...newTagsInput, ...selectedPredefinedTags])];
                    
                        // Save updated block to local storage
                        const success = dataManager.saveBlock(newTitle, newText, allTags, currentEditingBlockId);
                    
                        if (success) {
                            console.log("Save successful. Re-fetching and rendering tags...");
                    
                            // Fetch and re-render user-defined tags
                            const userDefinedTags = dataManager.getUserDefinedTags();
                            uiManager.renderTags(userDefinedTags, "tags_list");
                    
                            // Re-render predefined tags in their respective lists
                            uiManager.renderTags(dataManager.getFilteredTags("partType"), "part_type_tags_list");
                            uiManager.renderTags(dataManager.getFilteredTags("actionType"), "action_type_tags_list");
                            uiManager.renderTags(dataManager.getFilteredTags("abilityType"), "ability_type_tags_list");
                    
                            // Re-render blocks
                            uiManager.renderBlocks(dataManager.getBlocks());
                    
                            // Reset editing state
                            isEditing = false;
                            currentEditingBlockId = null;
                            editBlockOverlay.classList.remove("show");
                            saveEditButton.removeEventListener("click", saveEditHandler);
                        } else {
                            console.error("Failed to save the edited block.");
                        }
                    };
            
                    // Attach Save Edit Handler
                    saveEditButton.removeEventListener("click", saveEditHandler);
                    saveEditButton.addEventListener("click", saveEditHandler);
                } else {
                    console.error(`Block with ID "${blockId}" not found for editing.`);
                }
            }
                     
            
        });
    };

    return { handleBlockActions };
})();
