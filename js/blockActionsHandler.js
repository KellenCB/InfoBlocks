let isEditing = false;
let currentEditingBlockId = null;

import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { tagHandler } from './tagHandler.js';
import { appManager } from './appManager.js';
import { overlayHandler, getOverlayTargetTab } from './overlayHandler.js';
import { initUsesField } from './overlayHandler.js';
import { stripHTML } from './appManager.js';

export const saveEditHandler = () => {
    console.log("✅ Save Edit Button Clicked!");

    const editOverlay = document.querySelector(".edit-block-overlay");

    // Resolve the correct tab — split view carries data-active-tab on the overlay
    const activeTab = getOverlayTargetTab(editOverlay);

    const titleInput = document.getElementById("title_input_edit_overlay").value.trim();
    const textInput  = document.getElementById("block_text_edit_overlay").innerHTML.trim();

    let tagsInput = document.getElementById("tags_input_edit_overlay").value
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.toLowerCase());

    const selectedPredefinedTags = Array.from(
        document.querySelectorAll(".edit-block-overlay .tag-button.selected")
    ).filter(tag => !tag.closest('#character_type_tags_edit'))
     .map(tag => tag.dataset.tag.trim().toLowerCase());

    let blocks = appManager.getBlocks(activeTab);

    // In split view the block id is on the overlay; otherwise use the module-level var
    const blockId = editOverlay?.dataset?.blockId || currentEditingBlockId;
    const blockIndex = blocks.findIndex(block => block.id === blockId);

    if (blockIndex === -1) {
        console.error(`❌ Block with ID ${blockId} not found in ${activeTab}.`);
        return;
    }

    const currentBlockTags = blocks[blockIndex].tags.map(tag => tag.trim().toLowerCase());

    const exceptionTabs = ["tab3", "tab5", "tab6", "tab7", "tab9"];
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

    tagsInput = tagsInput.filter(tag => !currentBlockTags.includes(tag));

    const combinedTagsLowercase = [...new Set([...tagsInput, ...selectedPredefinedTags])];
    const allTags = combinedTagsLowercase.map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));

    if (
        !titleInput ||
        (activeTab !== "tab6" && !textInput)
    ) {
        alert(
            activeTab === "tab6"
                ? "A title is required."
                : "All fields (Title and Text) are required."
        );
        return;
    }

    const tabBTConfig = blockTypeConfig[activeTab];
    if (tabBTConfig) {
        const selectedTypeBtn = document.querySelector('#character_type_tags_edit .tag-button.selected');
        if (!selectedTypeBtn) {
            alert(`Please select a block type: ${tabBTConfig.types.join(", ")}.`);
            return;
        }
    }

    const usesState = JSON.parse(localStorage.getItem("uses_field_edit_overlay_state") || "[]");

    const blockType = tabBTConfig
        ? Array.from(document.querySelectorAll('#character_type_tags_edit .tag-button.selected')).map(b => b.dataset.tag)
        : null;

    appManager.saveBlock(
        activeTab, titleInput, textInput, allTags,
        usesState, blockType, blockId, blocks[blockIndex].timestamp
    );
    console.log(`✅ Block updated in ${activeTab} with tags:`, allTags);

    editOverlay.classList.remove("show");

    // Clear panel context from overlay
    delete editOverlay.dataset.activePanel;
    delete editOverlay.dataset.activeTab;
    delete editOverlay.dataset.blockId;

    // ── Refresh the correct view ──────────────────────────────────────────────
    import('./splitView.js').then(({ isSplitActive, refreshPanelsShowingTab }) => {
        if (isSplitActive()) {
            refreshPanelsShowingTab(activeTab);
        } else {
            // Original behaviour — reapply search and filters in main view
            const tabSuffix    = activeTab.replace("tab", "");
            const selectedTags = tagHandler.getSelectedTags(activeTab);
            const searchInput  = document.getElementById(`search_input_${tabSuffix}`);
            const searchQuery  = searchInput ? searchInput.value.trim().toLowerCase() : "";

            let filteredBlocks = appManager.getBlocks(activeTab);

            if (searchQuery) {
                filteredBlocks = filteredBlocks.filter(block => {
                    return block.title.toLowerCase().includes(searchQuery) ||
                           stripHTML(block.text).toLowerCase().includes(searchQuery) ||
                           block.tags.some(tag => tag.toLowerCase().includes(searchQuery));
                });
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
        }
    });
};

export let selectedFilterTags = [];

export const blockActionsHandler = (() => {
    let pendingDeleteBlockId = null;
    let lastDeletedBlock    = null;
    
    const initUndoLastDelete = () => {
        const undoBtn = document.getElementById("undo_delete_button");
        if (!undoBtn) return;
        undoBtn.onclick = () => {
            console.log("UNDO CLICKED ▶️", lastDeletedBlock);
            if (!lastDeletedBlock?.block) {
                window.alert("Nothing to undo");
                return;
            }
            const { tab, block } = lastDeletedBlock;
            document.querySelector(`.tab-button[data-tab="${tab}"]`)?.click();
            appManager.restoreBlock(block);
            lastDeletedBlock = null;
            reapplySearchAndFilters();
            document.getElementById("menu_overlay")?.classList.remove("active");
            document.getElementById("Menu_button")?.classList.remove("menu-button-open");
        };
    };
    
    document.addEventListener("DOMContentLoaded", initUndoLastDelete);

    const handleBlockActions = (event) => {
        const target  = event.target;
        const blockId = target.getAttribute("data-id");
        if (!blockId) return;

        const activeTab = appManager.getActiveTab();
        const block = appManager.getBlocks(activeTab).find(b => b.id === blockId);
        if (!block) {
            console.error(`❌ Block with ID ${blockId} not found.`);
            return;
        }

        if (target.classList.contains("duplicate-button")) {
            console.log("📄 Duplicating block:", blockId);
            const blockTags = Array.isArray(block.tags) ? [...block.tags] : [];
            appManager.saveBlock(activeTab, `${block.title} (Copy)`, block.text, blockTags, block.uses || [], block.blockType || null);
            reapplySearchAndFilters();
                                
        } else if (target.classList.contains("edit-button")) {
            console.log("📝 Editing block:", blockId);
            isEditing = true;
            currentEditingBlockId = blockId;
        
            selectedFilterTags = tagHandler.getSelectedTags();
            console.log("✅ Stored search & filter tags BEFORE editing:", selectedFilterTags);
        
            document.getElementById("title_input_edit_overlay").value = block.title;
            const editBody = document.getElementById("block_text_edit_overlay");
            editBody.innerHTML = block.text.replace(/\n/g, "<br>");
            editBody.dispatchEvent(new Event('input'));
                    
            const usesFieldContainerEdit = document.getElementById("uses_field_edit_overlay");
            if (usesFieldContainerEdit) {
                localStorage.setItem("uses_field_edit_overlay_state", JSON.stringify(block.uses || []));
                initUsesField(usesFieldContainerEdit, "uses_field_edit_overlay_state");
            }            

            const predefinedTags    = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
            const userDefinedTags   = block.tags.filter(tag => !predefinedTags.has(tag));
            const attachedPredefinedTags = block.tags.filter(tag => predefinedTags.has(tag));
        
            const exceptionTabs = ["tab3", "tab5", "tab6", "tab7", "tab9"];
            if (exceptionTabs.includes(activeTab)) {
                document.getElementById("tags_input_edit_overlay").value = "";
            } else {
                document.getElementById("tags_input_edit_overlay").value = userDefinedTags.join(", ");
            }
                                
            overlayHandler.initializeOverlayTagHandlers("predefined_tags_edit", block.tags);

            // Populate block type buttons for this tab from config, then open overlay
            overlayHandler.populateBlockTypeOverlay("character_type_tags_edit");

            setTimeout(() => {
                // Re-apply selected state for regular tags
                document.querySelectorAll(".edit-block-overlay .tag-button").forEach(tagBtn => {
                    const tag = tagBtn.dataset.tag;
                    if (tag && !tagBtn.closest('#character_type_tags_edit')) {
                        tagBtn.classList.toggle("selected", block.tags.includes(tag));
                    }
                });

                // Apply selected state for block type buttons (config-driven)
                const tabBTConfig = blockTypeConfig[activeTab];
                if (tabBTConfig) {
                    const blockTypes = Array.isArray(block.blockType)
                        ? block.blockType
                        : (block.blockType ? [block.blockType] : []);
                    document.querySelectorAll('#character_type_tags_edit .tag-button').forEach(btn => {
                        btn.classList.toggle('selected', blockTypes.includes(btn.dataset.tag));
                    });
                }
            }, 100);
        
            console.log("🟢 Edit Block Overlay Opened Successfully");
            document.querySelector(".edit-block-overlay").classList.add("show");

        } else if (target.classList.contains("remove-button")) {
            pendingDeleteBlockId = blockId;
            const overlay = document.querySelector(".remove-block-overlay");
            overlay && overlay.classList.add("show");
        }
          
        const initDeleteConfirmation = () => {
            const confirmBtn = document.getElementById("confirm_remove_button");
            const cancelBtn  = document.getElementById("cancel_remove_button");
            if (confirmBtn && cancelBtn) {
                confirmBtn.addEventListener("click", () => {
                    if (pendingDeleteBlockId) {
                        const deletedTab   = appManager.getActiveTab();
                        const deletedBlock = appManager.removeBlock(pendingDeleteBlockId);
                        lastDeletedBlock   = { tab: deletedTab, block: deletedBlock };
                        pendingDeleteBlockId = null;
                        reapplySearchAndFilters();
                    }
                    document.querySelector(".remove-block-overlay").classList.remove("show");
                });
                cancelBtn.addEventListener("click", () => {
                    pendingDeleteBlockId = null;
                    document.querySelector(".remove-block-overlay").classList.remove("show");
                });
            }
        };
                                    
        initDeleteConfirmation();
    };  

    function reapplySearchAndFilters() {
        const activeTab    = appManager.getActiveTab();
        const selectedTags = tagHandler.getSelectedTags(activeTab);
        const tabNumber    = activeTab.replace("tab", "");
        const searchInput  = document.getElementById(`search_input_${tabNumber}`);
        const searchQuery  = searchInput ? searchInput.value.trim().toLowerCase() : "";
        
        let filteredBlocks = appManager.getBlocks(activeTab);
    
        if (searchQuery) {
            filteredBlocks = filteredBlocks.filter(block =>
                block.title.toLowerCase().includes(searchQuery) ||
                stripHTML(block.text).toLowerCase().includes(searchQuery) ||
                block.tags.some(tag => tag.toLowerCase().includes(searchQuery))
            );
        }
    
        const normalizeTag = tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();

        // Block type filtering — config-driven
        const tabBTConfig = blockTypeConfig[activeTab];
        if (tabBTConfig) {
            const selectedTypes = [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected`)]
                .map(b => b.dataset.tag);
            if (selectedTypes.length > 0) {
                filteredBlocks = filteredBlocks.filter(block => {
                    const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                    return selectedTypes.every(t => types.includes(t));
                });
            }
        }

        // Regular tag filtering
        if (selectedTags.length > 0) {
            filteredBlocks = filteredBlocks.filter(block =>
                selectedTags.every(selectedTag =>
                    block.tags.some(blockTag => normalizeTag(blockTag) === normalizeTag(selectedTag))
                )
            );
        }
    
        appManager.renderBlocks(activeTab, filteredBlocks);
        appManager.updateTags();
    }

    const attachBlockActions = () => {
        initUndoLastDelete();

        document.querySelectorAll(".results-section").forEach(resultsSection => {
            resultsSection.removeEventListener("click", handleBlockActions);
            resultsSection.addEventListener("click", handleBlockActions);
        });

        console.log("✅ Block action handlers attached to all tabs!");
    };
    
    return { attachBlockActions };
})();