import { appManager } from './appManager.js';
import { tagHandler } from './tagHandler.js';
import { categoryTags } from './tagConfig.js';

function initUsesField(overlayElement, storageKeyPrefix, defaultSlots = 5) {
    let usesState = JSON.parse(localStorage.getItem(storageKeyPrefix)) || [];
  
    // Clear any existing content and add a header
    overlayElement.innerHTML = "";
  
  // Create a new row container that will hold both controls and circles
  const usesRow = document.createElement("div");
  usesRow.classList.add("uses-row");

  // Create the container for the add/remove controls
  const controlsContainer = document.createElement("div");
  controlsContainer.classList.add("uses-controls-container");

  // Add button (+)
  const addButton = document.createElement("div");
  addButton.classList.add("circle", "circle-button");
  addButton.innerHTML = "+";
  addButton.addEventListener("click", () => {
    usesState.push(false);
    localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
    renderCircles();
  });
  controlsContainer.appendChild(addButton);

  // Remove button (−)
  const removeButton = document.createElement("div");
  removeButton.classList.add("circle", "circle-button");
  removeButton.innerHTML = "−";
  removeButton.addEventListener("click", () => {
    if (usesState.length > 0) {
      usesState.pop();
      localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
      renderCircles();
    }
  });
  controlsContainer.appendChild(removeButton);

  // Create the container for the circles
  const circlesContainer = document.createElement("div");
  circlesContainer.classList.add("uses-circles-container");

  // Function to render the circles based on the current state
  function renderCircles() {
    circlesContainer.innerHTML = "";
    usesState.forEach((state, index) => {
      const circle = document.createElement("div");
      circle.classList.add("circle");
      if (state) {
        circle.classList.add("unfilled");
      }
      circle.addEventListener("click", () => {
        circle.classList.toggle("unfilled");
        usesState[index] = circle.classList.contains("unfilled");
        localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
      });
      circlesContainer.appendChild(circle);
    });
  }
  
  // Initial render of circles
  renderCircles();

  // Append controls and circles to the row container
  usesRow.appendChild(controlsContainer);
  usesRow.appendChild(circlesContainer);

  // Append the row container to the overlay element
  overlayElement.appendChild(usesRow);
}

const addBlockOverlay = document.querySelector(".add-block-overlay");
if (addBlockOverlay) {
    const usesFieldContainer = document.getElementById("uses_field_overlay");
    if (usesFieldContainer) {
        localStorage.setItem("uses_field_overlay_state", JSON.stringify([]));
        initUsesField(usesFieldContainer, "uses_field_overlay_state");
    }
}
  
export const handleSaveBlock = () => {
    const saveBlockButton = document.getElementById("save_block_button");
    if (!saveBlockButton) return;

    // Remove any duplicate event listeners
    saveBlockButton.replaceWith(saveBlockButton.cloneNode(true));
    const newSaveBlockButton = document.getElementById("save_block_button");

    newSaveBlockButton.addEventListener("click", () => {
        console.log("✅ Save Block Button Clicked!");

        // Retrieve and trim title and text inputs
        const titleElement = document.getElementById("title_input_overlay");
        const textElement = document.getElementById("block_text_overlay");
        if (!titleElement || !textElement) {
            console.error("❌ Input elements not found!");
            return;
        }
        const titleInput = titleElement.value.trim();
        const textInput = textElement.value.trim();

        if (titleInput === "" || textInput === "") {
            alert("All fields (Title and Text) are required.");
            return;
        }

        // --- Tag Processing Starts Here ---

        // 1. Extract typed tags from the input field, trim and normalize to lowercase.
        let tagsInput = document.getElementById("tags_input_overlay").value
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.toLowerCase());

        // 2. Extract selected tags from the overlay's buttons and normalize them.
        const selectedPredefinedTags = Array.from(
            document.querySelectorAll(".add-block-overlay .tag-button.selected")
        ).map(tag => tag.dataset.tag.trim().toLowerCase());

        // 3. Get the active tab.
        const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab1";

        // 4. For Tab 3: filter out any typed tags that already exist in the dynamic overlay.
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
        
        // 5. Combine typed and selected tags using a Set to remove duplicates.
        const combinedTagsLowercase = [...new Set([...tagsInput, ...selectedPredefinedTags])];

        // 6. Re-capitalize tags for display (first letter uppercase, rest lowercase).
        const allTags = combinedTagsLowercase.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));

        // --- Tag Processing Ends Here ---

        // Retrieve the current uses state from localStorage.
        const usesState = JSON.parse(localStorage.getItem("uses_field_overlay_state") || "[]");

        // Save the new block using appManager.saveBlock (assumes this function handles adding a new block)
        const activeTabFromDOM = activeTab; // Use activeTab determined earlier.
        const success = appManager.saveBlock(activeTabFromDOM, titleInput, textInput, allTags, usesState);

        if (success) {
            console.log("✅ Block saved successfully with tags:", allTags);
            appManager.renderBlocks(activeTabFromDOM);

            // Clear inputs & close overlay.
            titleElement.value = "";
            textElement.value = "";
            document.getElementById("tags_input_overlay").value = "";
            // Remove selection from any tag buttons in the overlay.
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

    const initializeOverlayTagHandlers = (containerId = "predefined_tags_edit", blockTags = []) => {
        const tagsContainer = document.getElementById(containerId);
        if (!tagsContainer) return;
    
        tagsContainer.innerHTML = "";
        const activeTab = appManager.getActiveTab();
        const exceptionTabs = ["tab3", "tab6", "tab7"];
    
        // Get predefined and user-defined tags
        const predefinedTagList = Object.values(categoryTags).flatMap(cat => cat.tags);
        const userDefinedTags = [
            ...new Set(
                appManager.getBlocks(activeTab)
                    .flatMap(block => block.tags)
                    .map(tag => tag.toLowerCase())
            )
        ].filter(tag =>
            !predefinedTagList.map(t => t.toLowerCase()).includes(tag)
        )
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase())
        .sort((a, b) => a.localeCompare(b));
                    
        if (containerId === "dynamic_overlay_tags") {
            if (exceptionTabs.includes(activeTab)) {
                let html = "";
                // Add user-defined tags, if any:
                if (userDefinedTags.length > 0) {
                    html += userDefinedTags.map(tag =>
                        `<button class="tag-button tag-user" data-tag="${tag}">${tag}</button>`
                    ).join("");
                }
                // Then add predefined tags for the active tab:
                Object.entries(categoryTags).forEach(([category, data]) => {
                    if (!data.tabs.includes(activeTab)) return;
                    html += data.tags.map(tag =>
                        `<button class="tag-button ${data.className}" data-tag="${tag}">${tag}</button>`
                    ).join("");
                });
                tagsContainer.innerHTML = html;
            } else {
                Object.entries(categoryTags).forEach(([category, data]) => {
                    if (!data.tabs.includes(activeTab)) return;
        
                    const categoryDiv = document.createElement("div");
                    categoryDiv.classList.add("tag-category");
        
                    categoryDiv.innerHTML = data.tags.map(tag =>
                        `<button class="tag-button ${data.className}" data-tag="${tag}">${tag}</button>`
                    ).join("");
        
                    tagsContainer.appendChild(categoryDiv);
                });
            }        
        } else if (containerId === "predefined_tags_edit") {
            // For non-exception tabs, filter out any user-defined tags from blockTags.
            const predefinedTagSet = new Set(predefinedTagList);
            if (!exceptionTabs.includes(activeTab)) {
                blockTags = blockTags.filter(tag => predefinedTagSet.has(tag));
            }
    
            // Populate user-defined tags only for exception tabs.
            if (exceptionTabs.includes(activeTab)) {
                if (userDefinedTags.length > 0) {
                    const userDiv = document.createElement("div");
                    userDiv.classList.add("tag-category", "user-tags-edit");
    
                    userDiv.innerHTML = userDefinedTags.map(tag =>
                        `<button class="tag-button tag-user${blockTags.includes(tag) ? " selected" : ""}" data-tag="${tag}">${tag}</button>`
                    ).join("");
    
                    tagsContainer.appendChild(userDiv);
                }
            }
    
            // Populate predefined tags (applies to all tabs).
            Object.entries(categoryTags).forEach(([category, data]) => {
                if (!data.tabs.includes(activeTab)) return;
    
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("tag-category");
    
                categoryDiv.innerHTML = data.tags.map(tag =>
                    `<button class="tag-button ${data.className}${blockTags.includes(tag) ? " selected" : ""}" data-tag="${tag}">${tag}</button>`
                ).join("");
    
                tagsContainer.appendChild(categoryDiv);
            });
        }
    
        tagsContainer.addEventListener("click", (event) => {
            const target = event.target;
            if (target.classList.contains("tag-button")) {
                target.classList.toggle("selected");
            }
        });
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

    // Modify overlay listeners to **resize before showing**
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

export { initUsesField };