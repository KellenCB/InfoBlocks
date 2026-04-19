let isEditing = false;
let currentEditingBlockId = null;

import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { filterManager } from './filterManager.js';
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
    const predefinedTagsMap = new Map(
        Object.values(categoryTags).flatMap(cat => cat.tags).map(t => [t.toLowerCase(), t])
    );
    const allTags = combinedTagsLowercase.map(tag => {
        const predefined = predefinedTagsMap.get(tag);
        if (predefined) return predefined;
        return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
    });

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
    const blockTypeRequiredTabs = ['tab3', 'tab6', 'tab7', 'tab9'];
    if (tabBTConfig && blockTypeRequiredTabs.includes(activeTab)) {
        const selectedTypeBtn = document.querySelector('#character_type_tags_edit .tag-button.selected');
        if (!selectedTypeBtn) {
            alert(`Please select a block type: ${tabBTConfig.types.join(", ")}.`);
            return;
        }
    }

    const usesState = JSON.parse(localStorage.getItem("uses_field_edit_overlay_state") || "[]");

    const propertiesInput = document.getElementById("properties_input_edit_overlay").value
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

const blockType = tabBTConfig
        ? (tabBTConfig.singleSelect
            ? (document.querySelector('#character_type_tags_edit .tag-button.selected')?.dataset.tag || null)
            : Array.from(document.querySelectorAll('#character_type_tags_edit .tag-button.selected')).map(b => b.dataset.tag))
        : null;

    // Inventory-specific booleans (tab6 only) — carry through safety clears
    let inventoryExtras = null;
    if (activeTab === 'tab6') {
        const requiresAttunement = !!document.getElementById('requires_attunement_edit')?.checked;
        const equipable          = !!document.getElementById('equipable_edit')?.checked;
        const attuned            = document.getElementById('attuned_btn_edit')?.dataset.on === 'true';
        const equipped           = document.getElementById('equipped_btn_edit')?.dataset.on === 'true';
        inventoryExtras = {
            requiresAttunement,
            equipable,
            attuned:  requiresAttunement ? attuned  : false,
            equipped: equipable          ? equipped : false
        };
    }

    appManager.saveBlock(
        activeTab, titleInput, textInput, allTags, usesState, propertiesInput, blockType, blockId, blocks[blockIndex].timestamp, inventoryExtras
    );
    console.log(`✅ Block updated in ${activeTab} with tags:`, allTags);

    editOverlay.classList.remove("show");

    // Clear panel context from overlay
    delete editOverlay.dataset.activePanel;
    delete editOverlay.dataset.activeTab;
    delete editOverlay.dataset.blockId;

    // ── Refresh the correct view ──────────────────────────────────────────────
    filterManager.applyFilters(activeTab.replace('tab', ''));
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
            reapplySearchAndFilters(tab);
            document.getElementById("menu_overlay")?.classList.remove("active");
            document.getElementById("Menu_button")?.classList.remove("menu-button-open");
        };
    };

    const recordLastDeleted = (tab, block) => {
        lastDeletedBlock = { tab, block };
    };
    
    document.addEventListener("DOMContentLoaded", initUndoLastDelete);

    const handleBlockActions = (event) => {
        const target  = event.target.closest('.action-button') || event.target;
        const blockId = target.getAttribute("data-id");
        if (!blockId) return;

        const tabContent = target.closest('.tab-content');
        const activeTab  = tabContent?.id || appManager.getActiveTab();
        const block = appManager.getBlocks(activeTab).find(b => b.id === blockId);
        if (!block) {
            console.error(`❌ Block with ID ${blockId} not found.`);
            return;
        }

        if (target.classList.contains('pin-button')) {
            const blocks = appManager.getBlocks(activeTab);
            const idx    = blocks.findIndex(b => b.id === blockId);
            if (idx !== -1) {
                blocks[idx].pinned = !blocks[idx].pinned;
                localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
                reapplySearchAndFilters(activeTab);   // ← was reapplySearchAndFilters()
            }
            return;
        }

        if (target.classList.contains("duplicate-button")) {
            const blockTags = Array.isArray(block.tags) ? [...block.tags] : [];
            // For tab6, also carry through the inventory booleans so the copy
            // matches the original's state
            let inventoryExtras = null;
            if (activeTab === 'tab6') {
                inventoryExtras = {
                    requiresAttunement: block.requiresAttunement === true,
                    equipable:          block.equipable === true,
                    attuned:            block.attuned === true,
                    equipped:           block.equipped === true
                };
            }
            const result = appManager.saveBlock(activeTab, `${block.title} (Copy)`, block.text, blockTags, block.uses || [], block.properties || [], block.blockType || null, null, null, inventoryExtras);
            // On tab6, auto-select the newly created copy
            if (activeTab === 'tab6' && typeof result === 'string') {
                appManager.setActiveInventoryBlock(result);
            }
            reapplySearchAndFilters(activeTab);

        } else if (target.classList.contains("edit-button")) {

            isEditing = true;
            currentEditingBlockId = blockId;
        
            selectedFilterTags = filterManager.getSelectedTags();
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

            document.getElementById("properties_input_edit_overlay").value = (block.properties || []).join(", ");

            const editOverlay = document.querySelector(".edit-block-overlay");
            if (editOverlay) {
                editOverlay.dataset.activeTab = activeTab;
                editOverlay.dataset.blockId   = blockId;
            }

            overlayHandler.initializeOverlayTagHandlers("predefined_tags_edit", block.tags);

            // Populate block type buttons for this tab from config, then open overlay
overlayHandler.populateBlockTypeOverlay("character_type_tags_edit");

            // Inventory pill — show, hide, and hydrate from the block
            const reqEdit = document.getElementById('requires_attunement_edit');
            const eqEdit  = document.getElementById('equipable_edit');
            const attBtnEdit = document.getElementById('attuned_btn_edit');
            const eqBtnEdit  = document.getElementById('equipped_btn_edit');
            if (activeTab === 'tab6') {
                if (reqEdit) reqEdit.checked = !!block.requiresAttunement;
                if (eqEdit)  {
                    eqEdit.checked = !!block.equipable;
                    eqEdit.dataset.userTouched = 'true';
                }
                if (attBtnEdit) attBtnEdit.dataset.on = block.attuned  === true ? 'true' : 'false';
                if (eqBtnEdit)  eqBtnEdit.dataset.on  = block.equipped === true ? 'true' : 'false';
            } else {
                if (reqEdit) reqEdit.checked = false;
                if (eqEdit)  { eqEdit.checked = false; eqEdit.dataset.userTouched = ''; }
                if (attBtnEdit) attBtnEdit.dataset.on = 'false';
                if (eqBtnEdit)  eqBtnEdit.dataset.on  = 'false';
            }
            overlayHandler.setupInventoryOverlayOptions("edit");
            
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
    };  

    function reapplySearchAndFilters(tabOverride = null) {
        const activeTab = tabOverride || appManager.getActiveTab();
        filterManager.applyFilters(activeTab.replace('tab', ''));
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

    const attachBlockActions = () => {
        initUndoLastDelete();
        initDeleteConfirmation();

        document.querySelectorAll(".results-section").forEach(resultsSection => {
            resultsSection.removeEventListener("click", handleBlockActions);
            resultsSection.addEventListener("click", handleBlockActions);
        });

        console.log("✅ Block action handlers attached to all tabs!");
    };
    
    return { attachBlockActions, recordLastDeleted };

})();

document.addEventListener('click', e => {
    const trigger = e.target.closest('.actions-trigger');
    if (trigger) {
        e.stopPropagation();
        const menu = trigger.closest('.block-actions-menu');
        const isOpen = menu.classList.contains('menu-open');
        document.querySelectorAll('.block-actions-menu.menu-open')
            .forEach(m => m.classList.remove('menu-open'));
        if (!isOpen) menu.classList.add('menu-open');
        return;
    }
    if (!e.target.closest('.block')) {
        document.querySelectorAll('.block-actions-menu.menu-open')
            .forEach(m => m.classList.remove('menu-open'));
    }
});