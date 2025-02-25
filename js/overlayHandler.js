import { appManager } from './appManager.js';
import { tagHandler } from './tagHandler.js';
import { categoryTags } from './tagConfig.js';
import { selectedFilterTagsBeforeAdd } from './actionButtonHandlers.js';

export const handleSaveBlock = () => {
    const saveBlockButton = document.getElementById("save_block_button");
    if (!saveBlockButton) return;

    // ✅ Remove any existing event listener to prevent multiple triggers
    saveBlockButton.replaceWith(saveBlockButton.cloneNode(true)); 
    const newSaveBlockButton = document.getElementById("save_block_button");

    newSaveBlockButton.addEventListener("click", () => {
        console.log("✅ Save Block Button Clicked!");

        // ✅ Ensure inputs are properly retrieved
        const titleElement = document.getElementById("title_input_overlay");
        const textElement = document.getElementById("block_text_overlay");
        
        if (!titleElement || !textElement) {
            console.error("❌ Input elements not found!");
            return;
        }

        // ✅ Get values and ensure trimming is properly handled
        const titleInput = titleElement.value.trim();
        const textInput = textElement.value.trim();

        console.log("🔹 Title:", titleInput);
        console.log("🔹 Text:", textInput);

        if (titleInput === "" || textInput === "") {
            alert("All fields (Title and Text) are required.");
            return;
        }

        let tagsInputElement = document.getElementById("tags_input_overlay");
        let tagsInput = tagsInputElement ? tagsInputElement.value.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
        
        const selectedPredefinedTags = Array.from(document.querySelectorAll(".add-block-overlay .tag-button.selected"))
            .map(tag => tag.dataset.tag);

        const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
        tagsInput = tagsInput.map(tag => predefinedTags.has(tag) ? tag : tag); // Ensure predefined tags stay
        const allTags = [...new Set([...tagsInput, ...selectedPredefinedTags])];
        
        // ✅ Save the new block
        const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab1";
        const success = appManager.saveBlock(activeTab, titleInput, textInput, allTags);
        
        if (success) {
            console.log("✅ Block saved successfully with tags:", allTags);

            // ✅ Refresh UI after editing a block
            appManager.renderBlocks(appManager.getBlocks());

            // ✅ Reapply currently selected filters using the correct variable
            console.log("🔍 Reapplying selected filters after edit using:", tagHandler.getSelectedTags());
            tagHandler.applyFiltersAfterSave(tagHandler.getSelectedTags());
            
            // ✅ Clear inputs & close overlay
            titleElement.value = "";
            textElement.value = "";
            document.getElementById("tags_input_overlay").value = "";

            document.querySelectorAll(".add-block-overlay .tag-button.selected").forEach(tag => {
                tag.classList.remove("selected");
            });

            document.querySelector(".add-block-overlay").classList.remove("show");
        } else {
            console.error("❌ Failed to save the block.");
        }
    });
};

export const overlayHandler = (() => {
    const selectedOverlayTags = Object.keys(categoryTags).reduce((acc, category) => {
        acc[category] = [];
        return acc;
    }, {});
    
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

        console.log("Save Block Button:", saveBlockButton);
        console.log("Clear Block Button:", clearBlockButton);
        console.log("Cancel Add Block Button:", cancelAddBlockButton);
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
    
            // ✅ Ensure predefined tags are also deselected
            document.querySelectorAll(".add-block-overlay .tag-button.selected").forEach(tag => {
                tag.classList.remove("selected");
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

    const handleTagSelection = (containerId, type) => { // FOR OVERLAYS
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

    const initializeOverlayTagHandlers = (containerId = "predefined_tags_edit") => {
        const predefinedTagsContainer = document.getElementById(containerId);
        
        if (predefinedTagsContainer) {
            predefinedTagsContainer.innerHTML = ""; // Clear previous content
    
            Object.entries(categoryTags).forEach(([category, data]) => {
                if (Array.isArray(data.tags)) {
                    const categoryDiv = document.createElement("div");
                    categoryDiv.classList.add("tag-category");
    
                    // Create tag buttons dynamically
                    categoryDiv.innerHTML = data.tags.map(tag =>
                        `<button class="tag-button ${data.className}" data-tag="${tag}">${tag}</button>`
                    ).join("");
    
                    predefinedTagsContainer.appendChild(categoryDiv);
                }
            });
    
            // Add click event listeners to predefined tags
            predefinedTagsContainer.addEventListener("click", (event) => {
                const target = event.target;
                if (target.classList.contains("tag-button")) {
                    target.classList.toggle("selected"); // Toggle selection state
                }
            });
        }
    };
    
    const autoResizeTextarea = (textarea) => {
        textarea.style.height = "auto"; // Reset height
        textarea.style.height = textarea.scrollHeight + "px"; // Expand based on content
    };
    
    // Function to resize all textareas **before** the overlay appears
    const initializeTextareas = () => {
        document.querySelectorAll(".auto-resize").forEach(textarea => {
            autoResizeTextarea(textarea);
            textarea.addEventListener("input", function () {
                autoResizeTextarea(this);
            });
        });
    };
    
    // ✅ Modify overlay listeners to **resize before showing**
    const addOverlayListeners = () => {
        const addBlockOverlay = document.querySelector(".add-block-overlay");
        const editBlockOverlay = document.querySelector(".edit-block-overlay");
    
        const observeOverlay = (overlay) => {
            if (!overlay) return;
    
            // Observe when the "show" class is added **before** making the overlay visible
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "class" && overlay.classList.contains("show")) {
                        initializeTextareas(); // Resize BEFORE it appears
                    }
                });
            });
    
            observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
        };
    
        observeOverlay(addBlockOverlay);
        observeOverlay(editBlockOverlay);
    };

    const initializeEventHandlers = () => {
        handleSaveBlock();
        handleClearBlock();
        handleCancelBlock();
        handleClearEditOverlay();
        handleCancelEditOverlay();
        handleTagSelection();
        initializeTextareas();
        addOverlayListeners();        
    };

    return { 
        attachKeyboardShortcuts, 
        initializeOverlayTagHandlers,
        initializeEventHandlers};
})();