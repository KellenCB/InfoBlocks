let isEditing = false;
let currentEditingBlockId = null;

import { categoryTags, blockTypeConfig, DEFAULT_BOOK_ACCENT } from './tagConfig.js';
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

    const selTypeBtnEdit = document.querySelector('#character_type_tags_edit .tag-button.selected');
    const isTab3QuestEdit = activeTab === 'tab3' && selTypeBtnEdit?.dataset.tag === 'Quest';
    const isTab3MapEdit   = activeTab === 'tab3' && selTypeBtnEdit?.dataset.tag === 'Map';
    const textOptionalEdit = activeTab === "tab6" || isTab3QuestEdit || isTab3MapEdit;

    if (!titleInput) {
        alert("A title is required.");
        return;
    }
    if (!textOptionalEdit && !textInput) {
        alert("Title and text are required.");
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

    // Tab3-specific fields (location + quest state + book state)
    let tab3Extras = null;
    if (activeTab === 'tab3') {
        const loc = document.getElementById('location_input_edit')?.value.trim();
        tab3Extras = { location: loc || null };

        const blockTypesArr = Array.isArray(blockType) ? blockType : (blockType ? [blockType] : []);
        if (blockTypesArr.includes('Quest')) {
            const selPill = document.querySelector('#status_buttons_edit .quest-status-pill.selected');
            tab3Extras.status = selPill?.dataset.status || 'active';

            const rows = document.querySelectorAll('#objectives_editor_edit .quest-objective-editor-row');
            tab3Extras.objectives = Array.from(rows).map(row => ({
                text: row.querySelector('.quest-objective-input')?.value.trim() || '',
                done: row.dataset.done === 'true'
            })).filter(o => o.text !== '');
        }
        if (blockTypesArr.includes('Book')) {
            const descEdit  = document.getElementById('description_input_edit')?.value.trim() || '';
            const selSwatch = document.querySelector('#book_accent_swatches_edit .book-accent-swatch.selected');
            tab3Extras.description = descEdit;
            tab3Extras.bookColor   = selSwatch?.dataset.colorId || DEFAULT_BOOK_ACCENT;
        }
        if (blockTypesArr.includes('Notes')) {
            const descEdit = document.getElementById('description_input_edit')?.value.trim() || '';
            tab3Extras.description = descEdit;
        }
        if (blockTypesArr.includes('Map')) {
            const urlEdit = document.getElementById('url_input_edit')?.value.trim() || '';
            if (!urlEdit) {
                alert('A link URL is required for Map blocks.');
                return;
            }
            tab3Extras.url = urlEdit;
        }
    }

    appManager.saveBlock(
        activeTab, titleInput, textInput, allTags, usesState, propertiesInput, blockType, blockId, blocks[blockIndex].timestamp, inventoryExtras, tab3Extras
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

    // ── Delete confirmation popup (replaces the full-screen overlay) ──
    const showDeletePopup = (blockId, clickEvent) => {
        document.getElementById('delete-confirm-popup')?.remove();

        const popup = document.createElement('div');
        popup.id = 'delete-confirm-popup';
        popup.className = 'delete-confirm-popup';
        popup.innerHTML = `
            <span class="delete-confirm-message">Are you sure you want<br>to delete this block?</span>
            <div class="delete-confirm-buttons">
                <button class="delete-confirm-yes"><span>Yes</span></button>
                <button class="delete-confirm-no">No</button>
            </div>
        `;
        document.body.appendChild(popup);

        // Position above the click point
        const popupRect = popup.getBoundingClientRect();
        let top  = clickEvent.clientY - popupRect.height - 10;
        let left = clickEvent.clientX - (popupRect.width / 2);

        if (top < 4) top = clickEvent.clientY + 14;
        if (left < 4) left = 4;
        if (left + popupRect.width > window.innerWidth - 4) {
            left = window.innerWidth - popupRect.width - 4;
        }

        popup.style.top  = `${top}px`;
        popup.style.left = `${left}px`;
        popup.classList.add('visible');

        const dismiss = () => {
            popup.classList.remove('visible');
            setTimeout(() => popup.remove(), 400);
            document.removeEventListener('mousedown', onOutside);
        };
        const onOutside = (e) => {
            if (!popup.contains(e.target)) dismiss();
        };
        setTimeout(() => document.addEventListener('mousedown', onOutside), 0);

        // Yes button: must hover for 0.5s before it becomes clickable
        const yesBtn = popup.querySelector('.delete-confirm-yes');
        let yesArmed = false;
        let armTimer = null;

        yesBtn.addEventListener('mouseenter', () => {
            yesArmed = false;
            yesBtn.classList.remove('armed');
            armTimer = setTimeout(() => {
                yesArmed = true;
                yesBtn.classList.add('armed');
            }, 500);
        });

        yesBtn.addEventListener('mouseleave', () => {
            clearTimeout(armTimer);
            yesArmed = false;
            yesBtn.classList.remove('armed');
        });

        yesBtn.addEventListener('click', () => {
            if (!yesArmed) return;
            const deletedTab   = appManager.getActiveTab();
            const deletedBlock = appManager.removeBlock(blockId);
            lastDeletedBlock   = { tab: deletedTab, block: deletedBlock };
            reapplySearchAndFilters();
            dismiss();
        });

        popup.querySelector('.delete-confirm-no').addEventListener('click', dismiss);
    };

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
            // For tab6, carry through the inventory booleans
            let inventoryExtras = null;
            if (activeTab === 'tab6') {
                inventoryExtras = {
                    requiresAttunement: block.requiresAttunement === true,
                    equipable:          block.equipable === true,
                    attuned:            block.attuned === true,
                    equipped:           block.equipped === true
                };
            }
            // For tab3, carry through all type-specific fields
            let tab3Extras = null;
            if (activeTab === 'tab3') {
                tab3Extras = { location: block.location || null };
                const blockTypesArr = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                if (blockTypesArr.includes('Quest')) {
                    tab3Extras.status = block.status || 'active';
                    tab3Extras.objectives = Array.isArray(block.objectives)
                        ? block.objectives.map(o => ({ text: o.text || '', done: false }))
                        : [];
                }
                if (blockTypesArr.includes('Book')) {
                    tab3Extras.description = block.description || '';
                    tab3Extras.bookColor   = block.bookColor || 'orange';
                }
                if (blockTypesArr.includes('Notes')) {
                    tab3Extras.description = block.description || '';
                }
            }
            const result = appManager.saveBlock(activeTab, `${block.title} (Copy)`, block.text, blockTags, block.uses || [], block.properties || [], block.blockType || null, null, null, inventoryExtras, tab3Extras);
            // On tab6, auto-select the newly created copy in the viewer
            if (activeTab === 'tab6' && typeof result === 'string') {
                appManager.setActiveInventoryBlock(result);
            }
            // On tab3, auto-select the duplicate in the viewer (wide mode)
            if (activeTab === 'tab3' && typeof result === 'string') {
                appManager.setActiveNotesBlock(result);
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
            overlayHandler.setupQuestOverlayOptions("edit");
            
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
            showDeletePopup(blockId, event);
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