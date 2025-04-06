let isEditing = false;
let currentEditingBlockId = null;

import { categoryTags } from './tagConfig.js';
import { tagHandler } from './tagHandler.js';
import { appManager } from './appManager.js';
import { overlayHandler } from './overlayHandler.js';
import { initUsesField } from './overlayHandler.js';

export const saveEditHandler = () => {
    console.log("✅ Save Edit Button Clicked!");

    // Retrieve and trim the title and text
    const titleInput = document.getElementById("title_input_edit_overlay").value.trim();
    const textInput = document.getElementById("block_text_edit_overlay").value.trim();

    // Extract typed tags from the input field, trimming and normalizing to lowercase
    let tagsInput = document.getElementById("tags_input_edit_overlay").value
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.toLowerCase());

    // Extract the selected tag buttons from the overlay and normalize them
    const selectedPredefinedTags = Array.from(
        document.querySelectorAll(".edit-block-overlay .tag-button.selected")
    ).map(tag => tag.dataset.tag.trim().toLowerCase());

    // Get the currently active tab
    const activeTab = appManager.getActiveTab();

    // Retrieve the blocks for the active tab and locate the block being edited
    let blocks = appManager.getBlocks(activeTab);
    const blockIndex = blocks.findIndex(block => block.id === currentEditingBlockId);
    if (blockIndex === -1) {
        console.error(`❌ Block with ID ${currentEditingBlockId} not found in active tab ${activeTab}.`);
        return;
    }

    // Normalize the existing tags already attached to this block
    const currentBlockTags = blocks[blockIndex].tags.map(tag => tag.trim().toLowerCase());

    // For Tab 3: filter out any typed tags that already exist in the dynamic overlay
    const exceptionTabs = ["tab3", "tab6", "tab7"];
    if (exceptionTabs.includes(activeTab)) {
            const dynamicTagsContainer = document.getElementById("dynamic_overlay_tags");
        let existingUserDefinedTags = [];
        if (dynamicTagsContainer) {
            existingUserDefinedTags = Array.from(
                dynamicTagsContainer.querySelectorAll(".tag-button.tag-user")
            ).map(el => el.dataset.tag.trim().toLowerCase());
        }
        tagsInput = tagsInput.filter(tag => !existingUserDefinedTags.includes(tag));
    }

    // Remove any typed tags that are already attached to the block
    tagsInput = tagsInput.filter(tag => !currentBlockTags.includes(tag));

    // Combine: include any remaining typed tags, selected tag buttons, and the block’s current tags
    const combinedTagsLowercase = [...new Set([...tagsInput, ...selectedPredefinedTags])];

    // Re-capitalize each tag (first letter uppercase, rest lowercase) for display purposes
    const allTags = combinedTagsLowercase.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));

    // Check for required fields
    if (!titleInput || !textInput) {
        alert("All fields (Title and Text) are required.");
        return;
    }

    if (!currentEditingBlockId) {
        console.error("❌ No block ID found for editing.");
        return;
    }

    // Save the edited block
    const usesState = JSON.parse(localStorage.getItem("uses_field_edit_overlay_state") || "[]");
    appManager.saveBlock(activeTab, titleInput, textInput, allTags, usesState, currentEditingBlockId, blocks[blockIndex].timestamp);
    console.log(`✅ Block updated successfully in ${activeTab} with tags:`, allTags);

    document.querySelector(".edit-block-overlay").classList.remove("show");

    const tabSuffix = activeTab.replace("tab", "");

    const selectedTags = tagHandler.getSelectedTags(activeTab);

    const searchInput = document.getElementById(`search_input_${tabSuffix}`);
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";

    let filteredBlocks = appManager.getBlocks(activeTab);

    if (searchQuery) {
        filteredBlocks = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(searchQuery) ||
            block.text.toLowerCase().includes(searchQuery) ||
            block.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
    }

    if (selectedTags.length > 0) {
        filteredBlocks = filteredBlocks.filter(block =>
            selectedTags.every(tag =>
                block.tags.some(blockTag =>
                    blockTag.charAt(0).toUpperCase() + blockTag.slice(1).toLowerCase() ===
                    tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()
                )
            )
        );
    }

    appManager.renderBlocks(activeTab, filteredBlocks);
    appManager.updateTags();

};

export let selectedFilterTags = []; // ✅ Stores the search & filter tags before editing

export const blockActionsHandler = (() => {
    const handleBlockActions = (event) => {
        const target = event.target;
        const blockId = target.getAttribute("data-id");

        if (!blockId) return;

        const selectedTags = tagHandler.getSelectedTags(); // ✅ Get selected tags
        const searchQuery = document.getElementById("search_input_${tabSuffix}")?.value.trim().toLowerCase(); // ✅ Get current search input

        const block = appManager.getBlocks().find(b => b.id === blockId);
        if (!block) {
            console.error(`❌ Block with ID ${blockId} not found.`);
            return;
        }

        if (target.classList.contains("duplicate_button")) {
            console.log("📄 Duplicating block:", blockId);
        
            const activeTab = appManager.getActiveTab();
            const blockTags = Array.isArray(block.tags) ? [...block.tags] : [];
        
            appManager.saveBlock(activeTab, `${block.title} (Copy)`, block.text, blockTags);
        
            reapplySearchAndFilters();
                                
        } else if (target.classList.contains("edit_button")) {
            console.log("📝 Editing block:", blockId);
            isEditing = true;
            currentEditingBlockId = blockId;
        
            selectedFilterTags = tagHandler.getSelectedTags();
            console.log("✅ Stored search & filter tags BEFORE editing:", selectedFilterTags);
        
            document.getElementById("title_input_edit_overlay").value = block.title;
            document.getElementById("block_text_edit_overlay").value = block.text;
        
            const usesFieldContainerEdit = document.getElementById("uses_field_edit_overlay");
            if (usesFieldContainerEdit) {
                // Store the current block's uses state (or an empty array if none exists)
                localStorage.setItem("uses_field_edit_overlay_state", JSON.stringify(block.uses || []));
                // Initialize the edit overlay uses field using the same initUsesField function
                initUsesField(usesFieldContainerEdit, "uses_field_edit_overlay_state");
            }            

            const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
            const userDefinedTags = block.tags.filter(tag => !predefinedTags.has(tag));
            const attachedPredefinedTags = block.tags.filter(tag => predefinedTags.has(tag));
        
            const activeTab = appManager.getActiveTab(); // (you already have this)

            const exceptionTabs = ["tab3", "tab6", "tab7"];
            if (exceptionTabs.includes(activeTab)) {
                document.getElementById("tags_input_edit_overlay").value = "";
            } else {
                document.getElementById("tags_input_edit_overlay").value = userDefinedTags.join(", ");
            }
                                
            // *** NEW: Initialize the overlay’s predefined tags for editing ***
            overlayHandler.initializeOverlayTagHandlers("predefined_tags_edit", block.tags);
        
            // Set a small delay to avoid premature deselection
            setTimeout(() => {
                const activeTab = appManager.getActiveTab();
                const predefinedTags = Object.values(categoryTags).flatMap(cat => cat.tags);
                
                document.querySelectorAll(".edit-block-overlay .tag-button").forEach(tagBtn => {
                    const tag = tagBtn.dataset.tag;
                    
                    if (block.tags.includes(tag)) {
                        tagBtn.classList.add("selected");
                    } else {
                        tagBtn.classList.remove("selected");
                    }
                });
            }, 100);
        
            console.log("🟢 Edit Block Overlay Opened Successfully");
            document.querySelector(".edit-block-overlay").classList.add("show");
        } else if (target.classList.contains("remove_button")) {
            console.log("🗑 Removing block:", blockId);
            appManager.removeBlock(blockId);
        
            reapplySearchAndFilters();
        }
    };

    function reapplySearchAndFilters() {
        const activeTab = appManager.getActiveTab();
        const selectedTags = tagHandler.getSelectedTags();
        const tabNumber = activeTab.replace("tab", "");
        const searchInput = document.getElementById(`search_input_${tabNumber}`);
        const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
        
        let filteredBlocks = appManager.getBlocks(activeTab);
    
        if (searchQuery) {
            filteredBlocks = filteredBlocks.filter(block =>
                block.title.toLowerCase().includes(searchQuery) ||
                block.text.toLowerCase().includes(searchQuery) ||
                block.tags.some(tag => tag.toLowerCase().includes(searchQuery))
            );
        }
    
        const normalizeTag = tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
    
        if (selectedTags.length > 0) {
            filteredBlocks = filteredBlocks.filter(block =>
                selectedTags.every(selectedTag =>
                    block.tags.some(blockTag =>
                        normalizeTag(blockTag) === normalizeTag(selectedTag)
                    )
                )
            );
        }
    
        appManager.renderBlocks(activeTab, filteredBlocks);
        appManager.updateTags();
    }

    const attachBlockActions = () => {
        document.querySelectorAll(".results-section").forEach(resultsSection => {
            resultsSection.removeEventListener("click", handleBlockActions); // Prevent duplicate listeners
            resultsSection.addEventListener("click", handleBlockActions);
        });
    
        console.log("✅ Block action handlers attached to all tabs!");
    };        

    return { attachBlockActions };
})();
