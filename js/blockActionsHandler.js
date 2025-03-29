let isEditing = false;
let currentEditingBlockId = null;

import { categoryTags } from './tagConfig.js';
import { tagHandler } from './tagHandler.js';
import { appManager } from './appManager.js';
import { overlayHandler } from './overlayHandler.js';

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
    const allTags = [...new Set([...tagsInput, ...selectedPredefinedTags])];

    if (!titleInput || !textInput) {
        alert("All fields (Title and Text) are required.");
        return;
    }

    if (!currentEditingBlockId) {
        console.error("❌ No block ID found for editing.");
        return;
    }

    // ✅ Get the currently active tab
    const activeTab = appManager.getActiveTab();
    let blocks = appManager.getBlocks(activeTab);

    // ✅ Find the block in the active tab
    const blockIndex = blocks.findIndex(block => block.id === currentEditingBlockId);

    if (blockIndex === -1) {
        console.error(`❌ Block with ID ${currentEditingBlockId} not found in active tab ${activeTab}.`);
        return;
    }

    // ✅ Save the edited block while keeping its original timestamp
    appManager.saveBlock(activeTab, titleInput, textInput, allTags, currentEditingBlockId, blocks[blockIndex].timestamp);
    console.log(`✅ Block updated successfully in ${activeTab} with tags:`, allTags);

    // ✅ Close the edit overlay
    document.querySelector(".edit-block-overlay").classList.remove("show");

    // ✅ Preserve search input and selected tags
    const selectedTags = tagHandler.getSelectedTags();
    const searchQuery = document.getElementById("search_input")?.value.trim().toLowerCase();

    let filteredBlocks = appManager.getBlocks(activeTab);

    // ✅ Apply search filter
    if (searchQuery) {
        filteredBlocks = filteredBlocks.filter(block =>
            block.title.toLowerCase().includes(searchQuery) ||
            block.text.toLowerCase().includes(searchQuery) ||
            block.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
    }

    // ✅ Apply tag filters
    if (selectedTags.length > 0) {
        filteredBlocks = filteredBlocks.filter(block =>
            selectedTags.every(tag => block.tags.includes(tag))
        );
    }

    // ✅ Render only filtered blocks
    setTimeout(() => {
        appManager.renderBlocks();
        appManager.updateTags();
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
        
            const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab1"; // ✅ Ensure activeTab is defined
            const blockTags = Array.isArray(block.tags) ? [...block.tags] : [];
        
            appManager.saveBlock(activeTab, `${block.title} (Copy)`, block.text, blockTags);
                        
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
        
            const activeTab = appManager.getActiveTab(); // (you already have this)

            if (activeTab === "tab3") {
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
        }

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
        appManager.renderBlocks();
        appManager.updateTags();
    };

    const attachBlockActions = () => {
        document.querySelectorAll(".results-section").forEach(resultsSection => {
            resultsSection.removeEventListener("click", handleBlockActions); // Prevent duplicate listeners
            resultsSection.addEventListener("click", handleBlockActions);
        });
    
        console.log("✅ Block action handlers attached to all tabs!");
    };        

    return { attachBlockActions };
})();
