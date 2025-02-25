import { appManager } from './appManager.js';
import { tagHandler } from './tagHandler.js';
import { overlayHandler } from './overlayHandler.js';

export let selectedFilterTagsBeforeAdd = [];

export const actionButtonHandlers = (() => {
    const attachActionButtonListeners = () => {
        const elements = {
            addBlockButton: document.getElementById("add_block_button"),
            binButtons: document.querySelectorAll(".bin-button"),
            addBlockOverlay: document.querySelector(".add-block-overlay"),
            clearDataOverlay: document.querySelector(".cleardata-overlay"),
            confirmClearButton: document.getElementById("confirm_clear_button"),
            cancelClearButton: document.getElementById("cancel_clear_button"),
        };

        // Add Block Button
        if (elements.addBlockButton && elements.addBlockOverlay) {
            elements.addBlockButton.addEventListener("click", () => {
                console.log("➕ Add Block Button Clicked - Resetting Overlay");
        
                // Store selected filter tags before opening the overlay
                selectedFilterTagsBeforeAdd = tagHandler.getSelectedTags();
                console.log("✅ Stored search & filter tags BEFORE adding a block:", selectedFilterTagsBeforeAdd);
        
                // Deselect all overlay tags
                document.querySelectorAll(".add-block-overlay .tag-button.selected").forEach(tag => {
                    tag.classList.remove("selected");
                });
        
                // Clear input fields
                const titleInput = document.getElementById("title_input_overlay");
                const textInput = document.getElementById("block_text_overlay");
                const tagInputField = document.getElementById("tags_input_overlay");
        
                if (titleInput) titleInput.value = "";
                if (textInput) textInput.value = "";
                if (tagInputField) tagInputField.value = "";
        
                // Clear stored overlay tags if defined
                if (window.selectedOverlayTags && typeof selectedOverlayTags === "object") {
                    Object.keys(selectedOverlayTags).forEach(category => {
                        selectedOverlayTags[category] = [];
                    });
                    console.log("✅ Cleared stored selectedOverlayTags.");
                }
        
                // *** NEW: Initialize the overlay’s predefined tags using the correct container ***
                overlayHandler.initializeOverlayTagHandlers("dynamic_overlay_tags");
        
                // Open overlay
                elements.addBlockOverlay.classList.add("show");
        
                // Focus title input after opening
                if (titleInput) setTimeout(() => titleInput.focus(), 50);
            });
        } else {
            console.error("❌ Error: Add Block button or overlay not found.");
        }
                
        // Bin Buttons (Delete Data)
        if (elements.binButtons.length > 0 && elements.clearDataOverlay) {
            elements.binButtons.forEach(binButton => {
                binButton.addEventListener("click", () => {
                    console.log("🗑 Bin button clicked");
                    elements.clearDataOverlay.classList.add("show");
                });
            });
        } else {
            console.error("❌ Error: Bin button(s) or clear data overlay not found.");
        }

        // Confirm Clear Data
        if (elements.confirmClearButton && elements.clearDataOverlay) {
            elements.confirmClearButton.addEventListener("click", () => {
                console.log("✅ Confirm Clear Data button clicked");
                appManager.clearData();
                appManager.renderBlocks([]);
                appManager.renderTags([], "tags_list");
                elements.clearDataOverlay.classList.remove("show");
                alert("All data has been cleared.");
            });
        } else {
            console.error("❌ Error: Confirm Clear button not found.");
        }

        // Cancel Clear Data
        if (elements.cancelClearButton && elements.clearDataOverlay) {
            elements.cancelClearButton.addEventListener("click", () => {
                console.log("❌ Cancel Clear Data button clicked");
                elements.clearDataOverlay.classList.remove("show");
            });
        } else {
            console.error("❌ Error: Cancel Clear button not found.");
        }

        console.log("✅ Action button event listeners attached");
    };

    return { attachActionButtonListeners };
})();
