import { appManager } from './appManager.js';
import { filterManager } from './filterManager.js';
import { categoryTags, blockTypeConfig } from './tagConfig.js';

// Returns the correct tab for an overlay save operation.
// In split view the overlay carries data-active-tab; otherwise fall back to
// the globally active tab.
export function getOverlayTargetTab(overlayEl) {
    const splitTab = overlayEl?.dataset?.activeTab;
    if (splitTab) return splitTab;
    return appManager.getActiveTab();
}

// ── Populate (or clear) the block-type-tags div inside an overlay ──
// Call this every time an overlay opens so it reflects the current active tab.
function populateBlockTypeOverlay(containerId, selectedTypes = [], tabOverride = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const activeTab = tabOverride || appManager.getActiveTab();
    const config = blockTypeConfig[activeTab];

    if (!config || !config.types.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = config.types.map(type => {
        const isSelected = selectedTypes.includes(type) ? "selected" : "";
        return `<button class="tag-button ${config.className} ${isSelected}" data-tag="${type}">${type}</button>`;
    }).join("");
}

function initUsesField(overlayElement, storageKeyPrefix, defaultSlots = 5) {
    let usesState = JSON.parse(localStorage.getItem(storageKeyPrefix)) || [];
  
    overlayElement.innerHTML = "";
  
    const usesRow = document.createElement("div");
    usesRow.classList.add("uses-row");

    const controlsContainer = document.createElement("div");
    controlsContainer.classList.add("uses-controls-container");

    const addButton = document.createElement("div");
    addButton.classList.add("circle", "circle-button");
    addButton.innerHTML = "+";
    addButton.addEventListener("click", () => {
        usesState.push(false);
        localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
        renderCircles();
    });
    controlsContainer.appendChild(addButton);

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

    const circlesContainer = document.createElement("div");
    circlesContainer.classList.add("uses-circles-container");

    function renderCircles() {
        circlesContainer.innerHTML = "";
        usesState.forEach((state, index) => {
            const circle = document.createElement("div");
            circle.classList.add("circle");
            if (state) circle.classList.add("unfilled");
            circle.addEventListener("click", () => {
                circle.classList.toggle("unfilled");
                usesState[index] = circle.classList.contains("unfilled");
                localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
            });
            circlesContainer.appendChild(circle);
        });
    }
  
    renderCircles();

    usesRow.appendChild(controlsContainer);
    usesRow.appendChild(circlesContainer);
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
    const saveBlockButton = document.getElementById("save-block-button");
    if (!saveBlockButton) return;

    saveBlockButton.replaceWith(saveBlockButton.cloneNode(true));
    const newSaveBlockButton = document.getElementById("save-block-button");

    newSaveBlockButton.addEventListener("click", () => {
        console.log("✅ Save Block Button Clicked!");

        const addBlockOverlay  = document.querySelector(".add-block-overlay");
        const activeTab        = getOverlayTargetTab(addBlockOverlay);

        const titleElement = document.getElementById("title_input_overlay");
        const textElement  = document.getElementById("block_text_overlay");
        const titleInput   = titleElement?.value.trim()  || "";
        const textInput    = textElement?.innerHTML.trim() || "";

        if (
            titleInput === "" ||
            (activeTab !== "tab6" && textInput === "")
        ) {
            alert(activeTab === "tab6"
                ? "A title is required."
                : "All fields (Title and Text) are required."
            );
            return;
        }

        // Validate block type selection if this tab uses block types
        const tabBTConfig = blockTypeConfig[activeTab];
        if (tabBTConfig) {
            const selectedTypeBtn = document.querySelector('#character_type_tags_add .tag-button.selected');
            if (!selectedTypeBtn) {
                alert(`Please select a block type: ${tabBTConfig.types.join(", ")}.`);
                return;
            }
        }

        // Tag processing
        let tagsInput = document.getElementById("tags_input_overlay").value
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
            .map(tag => tag.toLowerCase());

        const selectedPredefinedTags = Array.from(
            document.querySelectorAll(".add-block-overlay .tag-button.selected")
        ).filter(tag => !tag.closest('#character_type_tags_add'))
         .map(tag => tag.dataset.tag.trim().toLowerCase());

        const exceptionTabs = ["tab3", "tab5", "tab6", "tab7", "tab9"];
        if (exceptionTabs.includes(activeTab)) {
            const dynamicTagsContainer = document.getElementById("add_block_overlay_tags");
            let existingUserDefinedTags = [];
            if (dynamicTagsContainer) {
                existingUserDefinedTags = Array.from(
                    dynamicTagsContainer.querySelectorAll(".tag-button.tag-user")
                ).map(el => el.dataset.tag.trim().toLowerCase());
            }
            tagsInput = tagsInput.filter(tag => !existingUserDefinedTags.includes(tag));
        }

        const combinedTagsLowercase = [...new Set([...tagsInput, ...selectedPredefinedTags])];
        const predefinedTagsMap = new Map(
            Object.values(categoryTags).flatMap(cat => cat.tags).map(t => [t.toLowerCase(), t])
        );
        const allTags = combinedTagsLowercase.map(tag => {
            const predefined = predefinedTagsMap.get(tag);
            if (predefined) return predefined;
            return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        });

        const usesState = JSON.parse(localStorage.getItem("uses_field_overlay_state") || "[]");

        const blockType = tabBTConfig
            ? Array.from(document.querySelectorAll('#character_type_tags_add .tag-button.selected')).map(b => b.dataset.tag)
            : null;

        const propertiesInput = document.getElementById("properties_input_overlay").value
            .split(",")
            .map(p => p.trim())
            .filter(p => p.length > 0);

        const success = appManager.saveBlock(activeTab, titleInput, textInput, allTags, usesState, propertiesInput, blockType);

        if (success) {
            console.log("✅ Block saved successfully with tags:", allTags);

            // Capture panel context BEFORE clearing the overlay
            const savedPanelSide = addBlockOverlay?.dataset?.activePanel;
            const savedActiveTab = activeTab;

            // Reset overlay
            titleElement.value = "";
            textElement.innerHTML = "";
            textElement.dispatchEvent(new Event('input'));
            document.getElementById("tags_input_overlay").value = "";
            document.getElementById("properties_input_overlay").value = "";
            document.querySelectorAll(".add-block-overlay .tag-button.selected")
                .forEach(tag => tag.classList.remove("selected"));
            addBlockOverlay.classList.remove("show");
            // Clear panel context
            delete addBlockOverlay.dataset.activePanel;
            delete addBlockOverlay.dataset.activeTab;

            // ── Refresh the correct view ──────────────────────────────────────
            import('./splitView.js').then(({ isSplitActive, refreshPanelsShowingTab }) => {
                if (isSplitActive() && savedPanelSide) {
                    refreshPanelsShowingTab(savedActiveTab);
                } else {
                    appManager.renderBlocks(savedActiveTab);
                }
            });
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
        const addBlockOverlay  = document.querySelector(".add-block-overlay");
        const clearDataOverlay = document.querySelector(".cleardata-overlay");
        const editBlockOverlay = document.querySelector(".edit-block-overlay");
        const saveBlockButton  = document.getElementById("save-block-button");
        const cancelAddBlockButton = document.getElementById("cancel_add_block");
        const confirmClearButton   = document.getElementById("confirm_clear_button");
        const cancelClearButton    = document.getElementById("cancel_clear_button");
        const saveEditButton       = document.getElementById("save-edit-button");
        const cancelEditButton     = document.getElementById("cancel_edit_block");

        keyboardShortcutsHandler.handleKeyboardShortcuts({
            addBlockOverlay, clearDataOverlay, editBlockOverlay,
            saveBlockButton, cancelAddBlockButton,
            confirmClearButton, cancelClearButton,
            saveEditButton, cancelEditButton
        });
    };
                            
    const handleClearBlock = () => {
        const clearBlockButton = document.getElementById("clear_block_button");
        if (!clearBlockButton) return;
    
        clearBlockButton.addEventListener("click", () => {
            const titleInput = document.getElementById("title_input_overlay");
            const textInput  = document.getElementById("block_text_overlay");
            const tagsInput  = document.getElementById("tags_input_overlay");
            const propertiesInput = document.getElementById("properties_input_overlay");
    
            titleInput.value = "";
            textInput.value  = "";
            tagsInput.value  = "";
            propertiesInput.value = "";
    
            document.querySelectorAll(".add-block-overlay .tag-button.selected").forEach(tag => {
                tag.classList.remove("selected");
            });
    
            console.log("Overlay inputs and selected tags cleared.");
        });
    };
    


    const handleClearEditOverlay = () => {
        const clearEditButton = document.getElementById("clear_edit-button");
        if (!clearEditButton) return;
    
        clearEditButton.addEventListener("click", () => {
            const titleInput = document.getElementById("title_input_edit_overlay");
            const textInput  = document.getElementById("block_text_edit_overlay").innerHTML.trim();
            const tagsInput  = document.getElementById("tags_input_edit_overlay");
            const propertiesInput = document.getElementById("properties_input_edit_overlay");
    
            titleInput.value = "";
            textInput.value  = "";
            tagsInput.value  = "";
            propertiesInput.value = "";
    
            console.log("Edit overlay fields cleared.");
        });
    };



    const handleTagSelection = (containerId, type) => {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        container.addEventListener("click", (event) => {
            const target = event.target;
            event.stopPropagation();
    
            if (target.classList.contains("tag-button")) {
                const tag = target.getAttribute("data-tag");
    
                if (selectedOverlayTags[type].includes(tag)) {
                    selectedOverlayTags[type] = selectedOverlayTags[type].filter(t => t !== tag);
                    target.classList.remove("selected");
                } else {
                    selectedOverlayTags[type].push(tag);
                    target.classList.add("selected");
                }
            }
        });
    };

    const initializeOverlayTagHandlers = (containerId = "predefined_tags_edit", blockTags = [], tabOverride = null) => {
        const tagsContainer = document.getElementById(containerId);
        if (!tagsContainer) return;

        tagsContainer.innerHTML = "";
        const activeTab = tabOverride || appManager.getActiveTab();
        const exceptionTabs = ["tab3", "tab5", "tab6", "tab7", "tab9"];
    
        const predefinedTagList = Object.entries(categoryTags)
            .filter(([_, data]) => data.tabs.includes(activeTab))
            .flatMap(([_, data]) => data.tags);
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
                    
        if (containerId === "dynamic_overlay_tags" || containerId === "add_block_overlay_tags") {
            // Add overlay — all groups collapsed by default, no pre-selected tags
            let html = "";
            Object.entries(categoryTags).forEach(([category, data]) => {
                if (!data.tabs.includes(activeTab)) return;
                const label = data.label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                html += `<div class="tag-accordion-group ${data.className}" data-category="${category}">`;
                html += `<button class="tag-accordion-pill" data-category="${category}">${label}</button>`;
                html += `<div class="tag-accordion-body">`;
                html += `<span class="tag-accordion-label">${label}</span>`;
                html += data.tags.map(tag =>
                    `<button class="tag-button ${data.className}" data-tag="${tag}">${tag}</button>`
                ).join("");
                html += `</div></div>`;
            });

            if (userDefinedTags.length > 0) {
                html += `<div class="tag-category user-tags">`;
                html += userDefinedTags.map(tag =>
                    `<button class="tag-button tag-user" data-tag="${tag}">${tag}</button>`
                ).join("");
                html += `</div>`;
            }
            tagsContainer.innerHTML = html;

        } else if (containerId === "predefined_tags_edit") {
            // Edit overlay — open groups that have a tag already on the block
            const predefinedTagSet = new Set(predefinedTagList);
            if (!exceptionTabs.includes(activeTab)) {
                blockTags = blockTags.filter(tag => predefinedTagSet.has(tag));
            }

            let html = "";
            Object.entries(categoryTags).forEach(([category, data]) => {
                if (!data.tabs.includes(activeTab)) return;
                const label = data.label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                html += `<div class="tag-accordion-group ${data.className}" data-category="${category}">`;
                html += `<button class="tag-accordion-pill" data-category="${category}">${label}</button>`;
                html += `<div class="tag-accordion-body">`;
                html += `<span class="tag-accordion-label">${label}</span>`;
                html += data.tags.map(tag => {
                    const isSelected = blockTags.includes(tag) ? " selected" : "";
                    return `<button class="tag-button ${data.className}${isSelected}" data-tag="${tag}">${tag}</button>`;
                }).join("");
                html += `</div></div>`;
            });
            
            if (exceptionTabs.includes(activeTab) && userDefinedTags.length > 0) {
                html += `<div class="tag-category user-tags-edit">`;
                html += userDefinedTags.map(tag =>
                    `<button class="tag-button tag-user${blockTags.includes(tag) ? " selected" : ""}" data-tag="${tag}">${tag}</button>`
                ).join("");
                html += `</div>`;
            }

            tagsContainer.innerHTML = html;
            // Inject chips into collapsed groups that have selected tags
            tagsContainer.querySelectorAll('.tag-accordion-group:not(.open)').forEach(group => {
                const pill = group.querySelector('.tag-accordion-pill');
                const body = group.querySelector('.tag-accordion-body');
                if (!pill || !body) return;
                const tagClass = [...group.classList].find(c => c !== 'tag-accordion-group') || '';
                body.querySelectorAll('.tag-button.selected').forEach(btn => {
                    const chip = document.createElement('button');
                    chip.classList.add('tag-accordion-chip');
                    if (tagClass) chip.classList.add(tagClass);
                    chip.dataset.tag = btn.dataset.tag;
                    chip.textContent = btn.dataset.tag;
                    pill.appendChild(chip);
                });
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
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    };
    
    const initializeTextareas = () => {
        document.querySelectorAll(".auto-resize").forEach(textarea => {
            autoResizeTextarea(textarea);
            textarea.addEventListener("input", function () {
                autoResizeTextarea(this);
            });
        });
    };

    const addOverlayListeners = () => {
        const addBlockOverlay  = document.querySelector(".add-block-overlay");
        const editBlockOverlay = document.querySelector(".edit-block-overlay");
    
        const observeOverlay = (overlay) => {
            if (!overlay) return;
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "class" && overlay.classList.contains("show")) {
                        initializeTextareas();
                    }
                });
            });
            observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
        };
    
        observeOverlay(addBlockOverlay);
        observeOverlay(editBlockOverlay);

        // Populate block type buttons whenever the add overlay opens
        if (addBlockOverlay) {
            const addObserver = new MutationObserver(() => {
                if (addBlockOverlay.classList.contains("show")) {
                    populateBlockTypeOverlay("character_type_tags_add");
                }
            });
            addObserver.observe(addBlockOverlay, { attributes: true, attributeFilter: ["class"] });
        }

        // Populate block type buttons whenever the edit overlay opens
        // (selected types are applied later by blockActionsHandler after it knows the block)
        if (editBlockOverlay) {
            const editObserver = new MutationObserver(() => {
                if (editBlockOverlay.classList.contains("show")) {
                    // selectedTypes are set by blockActionsHandler — here we just ensure
                    // the buttons exist with the right set for the active tab.
                    // Do NOT reset selected state here; blockActionsHandler sets it.
                }
            });
            editObserver.observe(editBlockOverlay, { attributes: true, attributeFilter: ["class"] });
        }
    };


/* ==================================================================*/
/* ========================== TEXT TOOLBAR ==========================*/
/* ==================================================================*/

function addFormatToolbar() {
    const configs = [
      { formSel: '.add-block-form', textareaId: 'block_text_overlay' },
      { formSel: '.edit-block-form', textareaId: 'block_text_edit_overlay' }
    ];
  
    configs.forEach(({ formSel, textareaId }) => {
      const form = document.querySelector(formSel);
      if (!form) return;
      const editor = form.querySelector(`#${textareaId}`);
      if (!editor) return;
  
      const toolbar = document.createElement('div');
      toolbar.className = 'text-toolbar';
      toolbar.innerHTML = `
        <button type="button" data-action="bold" data-tooltip="Bold"><i class="fas fa-bold"></i></button>
        <button type="button" data-action="italic" data-tooltip="Italic"><i class="fas fa-italic"></i></button>
        <button type="button" data-action="underline" data-tooltip="Underline"><i class="fas fa-underline"></i></button>
        <button type="button" data-action="link" data-tooltip="Link"><i class="fas fa-link"></i></button>
        <button type="button" data-action="insertUnorderedList" data-tooltip="Unordered List"><i class="fas fa-list-ul"></i></button>
        <button type="button" data-action="insertOrderedList" data-tooltip="Ordered List"><i class="fas fa-list-ol"></i></button>
        <button type="button" data-action="increaseFont" data-tooltip="Increase Font"><i class="fas fa-arrow-up"></i></button>
        <select id="font-size-select">
            <option value="3">16px</option>
            <option value="4">18px</option>
            <option value="5">24px</option>
            <option value="6">32px</option>
            <option value="7">48px</option>
        </select>
        <button type="button" data-action="decreaseFont" data-tooltip="Decrease Font"><i class="fas fa-arrow-down"></i></button>
        <button type="button" data-action="uppercase" data-tooltip="Uppercase">A↑</button>
        <button type="button" data-action="sentencecase" data-tooltip="Sentence case">Aa</button>
        <button type="button" data-action="lowercase" data-tooltip="Lowercase">a↓</button>
        <button type="button" data-action="removeStyling" data-tooltip="Remove styling">✕</button>
        <button type="button" data-action="findReplace" data-tooltip="Find and Replace">A→B</button>
      `;
  
      const wrapper = document.createElement('div');
      wrapper.className = 'editor-toolbar-wrapper';
      editor.parentNode.replaceChild(wrapper, editor);
      wrapper.appendChild(toolbar);
      wrapper.appendChild(editor);

      const frPanel = document.createElement('div');
      frPanel.className = 'find-replace-panel hidden';
      frPanel.innerHTML = `
        <div class="find-replace-row">
            <input type="text" class="fr-find" placeholder="Find..." />
            <input type="text" class="fr-replace" placeholder="Replace..." />
            <button type="button" class="fr-btn fr-find-next">Find Next</button>
            <button type="button" class="fr-btn fr-replace-one">Replace One</button>
            <button type="button" class="fr-btn fr-replace-all">Replace All</button>
            <button type="button" class="fr-btn fr-close">✕</button>
        </div>
        <div class="fr-feedback"></div>
      `;
      wrapper.insertBefore(frPanel, editor);

      let frMatches = [];
      let frIndex = -1;

      const frFind    = frPanel.querySelector('.fr-find');
      const frReplace = frPanel.querySelector('.fr-replace');
      const frFeedback = frPanel.querySelector('.fr-feedback');
      frFeedback.style.display = 'none';

      const clearFrHighlights = () => {
        editor.querySelectorAll('span.fr-highlight, span.fr-highlight-active').forEach(span => {
          span.replaceWith(...span.childNodes);
        });
        editor.normalize();
      };

      const findTextMatches = () => {
        const results = [];
        const query = frFind.value;
        if (!query) return results;
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const walk = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            let match;
            while ((match = regex.exec(text)) !== null) {
              results.push({ node, index: match.index, length: match[0].length });
            }
          } else {
            if (node.nodeType === Node.ELEMENT_NODE &&
                (node.classList.contains('fr-highlight') || node.classList.contains('fr-highlight-active'))) {
              results.push({ node: node.firstChild, index: 0, length: node.textContent.length });
              return;
            }
            node.childNodes.forEach(walk);
          }
        };
        walk(editor);
        return results;
      };

      const highlightAll = (activeIdx = -1) => {
        clearFrHighlights();
        if (frMatches.length === 0) return;
        [...frMatches].reverse().forEach(({ node, index, length }, reversedI) => {
          const actualI = frMatches.length - 1 - reversedI;
          if (!node || !node.parentNode) return;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + length);
          const span = document.createElement('span');
          span.className = actualI === activeIdx ? 'fr-highlight-active' : 'fr-highlight';
          range.surroundContents(span);
        });
        if (activeIdx >= 0) {
          const active = editor.querySelector('span.fr-highlight-active');
          if (active) active.scrollIntoView({ block: 'nearest' });
        }
      };

      const buildMatches = () => {
        clearFrHighlights();
        frMatches = findTextMatches();
        frIndex = -1;
        frFeedback.textContent = '';
        if (frMatches.length === 0) {
          if (frFind.value) frFeedback.textContent = 'No matches found';
        } else {
          frFeedback.textContent = `${frMatches.length} match${frMatches.length !== 1 ? 'es' : ''} found`;
          highlightAll();
        }
      };

      frFind.addEventListener('input', () => {
        if (!frFind.value) {
          clearFrHighlights();
          frMatches = [];
          frIndex = -1;
          frFeedback.textContent = '';
          frFeedback.style.display = 'none';
          return;
        }
        frFeedback.style.display = '';
        buildMatches();
      });

      frPanel.querySelector('.fr-find-next').addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        clearFrHighlights();
        frMatches = findTextMatches();
        if (frMatches.length === 0) { frFeedback.textContent = 'No matches found'; return; }
        frIndex = (frIndex + 1) % frMatches.length;
        highlightAll(frIndex);
        frFeedback.style.display = '';
        frFeedback.textContent = frIndex === frMatches.length - 1
          ? `Match ${frIndex + 1} of ${frMatches.length} — no more matches after this`
          : `Match ${frIndex + 1} of ${frMatches.length}`;
      });

      frPanel.querySelector('.fr-replace-one').addEventListener('mousedown', e => {
        e.preventDefault();
        if (frIndex < 0 || frMatches.length === 0) { frFeedback.textContent = 'Use Find Next to select a match first'; return; }
        const active = editor.querySelector('span.fr-highlight-active');
        if (!active) { frFeedback.textContent = 'Use Find Next to select a match first'; return; }
        const replacedIndex = frIndex;
        const replaceText = frReplace.value;
        active.textContent = replaceText;
        active.className = 'fr-highlight-active';
        editor.querySelectorAll('span.fr-highlight').forEach(span => span.replaceWith(...span.childNodes));
        editor.normalize();
        frMatches = findTextMatches();
        if (frMatches.length === 0) {
          frIndex = -1;
          frFeedback.textContent = 'No more matches';
          editor.querySelectorAll('span.fr-highlight-active').forEach(span => span.replaceWith(...span.childNodes));
          editor.normalize();
        } else {
          frIndex = replacedIndex - 1;
          if (frIndex < -1) frIndex = frMatches.length - 1;
          frFeedback.textContent = `${frMatches.length} match${frMatches.length !== 1 ? 'es' : ''} remaining — use Find Next to continue`;
          editor.querySelectorAll('span.fr-highlight').forEach(span => span.replaceWith(...span.childNodes));
          editor.normalize();
          frMatches = findTextMatches();
          [...frMatches].reverse().forEach(({ node, index, length }) => {
            if (!node || !node.parentNode) return;
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + length);
            const span = document.createElement('span');
            span.className = 'fr-highlight';
            range.surroundContents(span);
          });
        }
      });

      frPanel.querySelector('.fr-replace-all').addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        clearFrHighlights();
        frMatches = findTextMatches();
        if (frMatches.length === 0) { frFeedback.textContent = 'No matches found'; return; }
        const count = frMatches.length;
        const replaceText = frReplace.value;
        [...frMatches].reverse().forEach(({ node, index, length }) => {
          if (!node || !node.parentNode) return;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + length);
          const span = document.createElement('span');
          span.className = 'fr-highlight';
          range.surroundContents(span);
          span.textContent = replaceText;
        });
        editor.normalize();
        frMatches = [];
        frIndex = -1;
        frFeedback.textContent = `${count} replacement${count !== 1 ? 's' : ''} made`;
      });

      frPanel.querySelector('.fr-close').addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        clearFrHighlights();
        frPanel.classList.add('hidden');
        frMatches = [];
        frIndex = -1;
        frFeedback.textContent = '';
        frFeedback.style.display = 'none';
        frFind.value = '';
        frReplace.value = '';
      });

      const buttons = toolbar.querySelectorAll('button');
      const sizeSelect = toolbar.querySelector('#font-size-select');
  
      sizeSelect.addEventListener('change', () => {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontSize', false, sizeSelect.value);
        updateToolbarState();
      });
  
      function updateToolbarState() {
        buttons.forEach(btn => {
          const action = btn.dataset.action;
          const active = document.queryCommandState(action);
          btn.classList.toggle('selected', active);
        });
        const sel = window.getSelection();
        if (sel.rangeCount && sel.toString()) {
          const node = sel.getRangeAt(0).startContainer.parentNode;
          const sizePx = window.getComputedStyle(node).fontSize;
          const map = { '10px':'1','13px':'2','16px':'3','18px':'4','24px':'5','32px':'6','48px':'7' };
          if (map[sizePx]) sizeSelect.value = map[sizePx];
        }
      }
  
      let activeTooltip = null;
      buttons.forEach(btn => {
        const tooltipText = btn.dataset.tooltip;
        if (tooltipText) {
          btn.addEventListener('mouseenter', () => {
            clearTimeout(btn._tooltipTimer);
            btn._tooltipTimer = setTimeout(() => {
              const tip = document.createElement('div');
              tip.classList.add('text-tooltip');
              tip.textContent = tooltipText;
              document.body.appendChild(tip);
              const rect = btn.getBoundingClientRect();
              tip.style.left = `${rect.left}px`;
              tip.style.top  = `${rect.bottom + 5}px`;
              activeTooltip = tip;
            }, 750);
          });
          btn.addEventListener('mouseleave', () => {
            clearTimeout(btn._tooltipTimer);
            if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
          });
        }

        btn.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
          const action = btn.dataset.action;
          if (action === 'link') {
            const url = prompt('Enter URL');
            if (url) document.execCommand('createLink', false, url.startsWith('http') ? url : `https://${url}`);
          } else if (action === 'increaseFont') {
            let idx = sizeSelect.selectedIndex;
            if (idx < sizeSelect.options.length - 1) { sizeSelect.selectedIndex = idx + 1; sizeSelect.dispatchEvent(new Event('change')); }
          } else if (action === 'decreaseFont') {
            let idx = sizeSelect.selectedIndex;
            if (idx > 0) { sizeSelect.selectedIndex = idx - 1; sizeSelect.dispatchEvent(new Event('change')); }
          } else if (action === 'removeStyling') {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const selectedText = range.toString();
            if (!selectedText) return;
            const frag = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(frag);
            tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
            tempDiv.querySelectorAll('p, div, li').forEach(el => { el.insertAdjacentText('afterend', '\n'); el.replaceWith(el.textContent); });
            tempDiv.querySelectorAll('ul, ol').forEach(el => el.replaceWith(el.textContent));
            tempDiv.querySelectorAll('*').forEach(el => el.replaceWith(el.textContent));
            const newFrag = document.createDocumentFragment();
            const lines = tempDiv.textContent.split('\n');
            lines.forEach((line, i) => {
              newFrag.appendChild(document.createTextNode(line));
              if (i < lines.length - 1) newFrag.appendChild(document.createElement('br'));
            });
            range.deleteContents();
            range.insertNode(newFrag);
          } else if (action === 'findReplace') {
            frPanel.classList.toggle('hidden');
            if (!frPanel.classList.contains('hidden')) {
              frFind.focus();
            } else {
              clearFrHighlights();
              frMatches = [];
              frIndex = -1;
              frFeedback.textContent = '';
            }
          } else if (['uppercase','sentencecase','lowercase'].includes(action)) {
            // fallback span-transform if needed
          } else {
            document.execCommand(action, false, null);
          }
          updateToolbarState();
        });
      });

      editor.addEventListener('keyup', updateToolbarState);
      editor.addEventListener('mouseup', updateToolbarState);

      editor.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !frPanel.classList.contains('hidden')) {
          e.stopPropagation();
          clearFrHighlights();
          frPanel.classList.add('hidden');
          frMatches = [];
          frIndex = -1;
          frFeedback.textContent = '';
        }
      });

      frPanel.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          clearFrHighlights();
          frPanel.classList.add('hidden');
          frMatches = [];
          frIndex = -1;
          frFeedback.textContent = '';
          frFind.value = '';
          frReplace.value = '';
        }
      });

      editor.addEventListener('paste', e => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        let cleaned = '';
        if (html) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          tempDiv.querySelectorAll('*').forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('color');
            el.removeAttribute('face');
            el.removeAttribute('size');
            el.removeAttribute('bgcolor');
            el.removeAttribute('background');
            el.removeAttribute('class');
          });
          tempDiv.querySelectorAll('span').forEach(span => span.replaceWith(...span.childNodes));
          tempDiv.querySelectorAll('font').forEach(font => font.replaceWith(...font.childNodes));
          tempDiv.querySelectorAll('a').forEach(a => a.replaceWith(...a.childNodes));
          cleaned = tempDiv.innerHTML;
        } else {
          cleaned = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        }
        document.execCommand('insertHTML', false, cleaned);
        updateToolbarState();
      });
    });
}
    
function initCEPlaceholder(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const update = () => {
        const txt = el.textContent.replace(/\u200B/g, '').trim();
        el.classList.toggle('empty', txt === '');
    };
    el.addEventListener('input', update);
    el.addEventListener('focus', update);
    el.addEventListener('blur', update);
    update();
}
    

    const initializeEventHandlers = () => {
        handleSaveBlock();
        handleClearBlock();
        handleClearEditOverlay();
        handleTagSelection();
        initializeTextareas();
        addOverlayListeners();
        addFormatToolbar();   
        initCEPlaceholder('block_text_overlay');
        initCEPlaceholder('block_text_edit_overlay');     
    };

    return { 
        attachKeyboardShortcuts, 
        initializeOverlayTagHandlers,
        initializeEventHandlers,
        populateBlockTypeOverlay   // exported so blockActionsHandler can call it
    };
})();

export { initUsesField };