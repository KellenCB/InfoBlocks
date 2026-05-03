import { filterManager } from './filterManager.js';
import { appManager } from './appManager.js';

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
                const nowPinned = !blocks[idx].pinned;
                blocks[idx].pinned = nowPinned;
                localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));

                // Maintain pinned order — new pins go to end, unpins are removed
                const orderKey = `pinnedBlockOrder_${activeTab}`;
                const order = JSON.parse(localStorage.getItem(orderKey) || '[]');
                if (nowPinned) {
                    if (!order.includes(blockId)) order.push(blockId);
                } else {
                    const filtered = order.filter(id => id !== blockId);
                    localStorage.setItem(orderKey, JSON.stringify(filtered));
                }
                if (nowPinned) localStorage.setItem(orderKey, JSON.stringify(order));

                reapplySearchAndFilters(activeTab);
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
            
            // Tab9: inline editing instead of overlay
            if (activeTab === 'tab9') {
                appManager.enterInlineEdit(blockId);
                return;
            }

            // Tab6: edit in the inventory viewer panel
            if (activeTab === 'tab6') {
                appManager.enterInventoryEdit(blockId);
                return;
            }

            // Tab3: edit in the notes viewer (wide) or inline (narrow)
            if (activeTab === 'tab3') {
                appManager.enterNotesEdit(blockId);
                return;
            }

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