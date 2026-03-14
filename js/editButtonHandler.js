document.addEventListener('DOMContentLoaded', () => {
    function initSpellSlotSection() {
      // =======================================
      // Tab 9: Spell Slot Section with 9 Groups
      // =======================================
      const spellSlotSection = document.querySelector('.spell-slot-section');
        if (spellSlotSection) {
            const updateGroupVisibility = (groupContainer) => {
            const circles = groupContainer.querySelectorAll('.circle:not(.circle-button)');
            if (circles.length === 0) {
                groupContainer.classList.add('hidden');
            } else {
                groupContainer.classList.remove('hidden');
            }
            };
    
            const groups = spellSlotSection.querySelectorAll('.spell-slot-group');
            groups.forEach((groupContainer, idx) => {
            const groupId = groupContainer.dataset.group || (idx + 1);
            let circles = [];
            const stateKey = `spellSlotStates_group_${groupId}`;
            const totalKey = `spellSlotTotalCircles_group_${groupId}`;
            let circleStates = JSON.parse(localStorage.getItem(stateKey)) || {};
            let totalCircles = localStorage.getItem(totalKey)
                ? parseInt(localStorage.getItem(totalKey), 10)
                : 0;
                                          
            const createCircle = (index, state = true, prepend = false) => {
                const circle = document.createElement('div');
                circle.classList.add('circle');
                if (state) circle.classList.add('unfilled');
    
                circle.addEventListener('click', () => {
                circle.classList.toggle('unfilled');
                circleStates[index] = circle.classList.contains('unfilled');
                localStorage.setItem(stateKey, JSON.stringify(circleStates));
                });
    
                if (prepend) {
                circles.unshift(circle);
                groupContainer.insertBefore(circle, groupContainer.firstChild);
                } else {
                circles.push(circle);
                groupContainer.appendChild(circle);
                }
            };
    
            for (let i = 0; i < totalCircles; i++) {
                createCircle(i, circleStates[i] ?? true, false);
            }
    
            updateGroupVisibility(groupContainer);
            });
    
            const visibleGroups = spellSlotSection.querySelectorAll('.spell-slot-group:not(.hidden)');
            if (visibleGroups.length === 0) {
              const placeholder = document.createElement('p');
              placeholder.textContent = 'Use the edit tab button to add spell slots here…';
              placeholder.style.margin = 'auto';
              placeholder.style.textAlign = 'center';
              placeholder.style.opacity = '0.25';
              spellSlotSection.appendChild(placeholder);
            }
            
            const saveButton = document.getElementById('save_spell_slot_changes');
            if (saveButton) {
            saveButton.addEventListener('click', () => {
                const overlaySpellSlots = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');
                const mainSpellSlots = document.querySelectorAll('.spell-slot-section .spell-slot-group');
    
                overlaySpellSlots.forEach((overlayGroup, index) => {
                const mainGroup = mainSpellSlots[index];
                if (!mainGroup) return;
    
                let titleElement = mainGroup.querySelector('.spell-slot-title');
                if (!titleElement) {
                    titleElement = document.createElement('span');
                    titleElement.classList.add('spell-slot-title');
                    titleElement.textContent = `Level ${index + 1}`;
                    mainGroup.appendChild(titleElement);
                }
    
                mainGroup.querySelectorAll('.circle:not(.circle-button)').forEach(circle => circle.remove());
    
                let circleStates = [];
    
                overlayGroup.querySelectorAll('.circle:not(.circle-button)').forEach((circle, circleIndex) => {
                    const newCircle = document.createElement('div');
                    newCircle.classList.add('circle');
                    if (circle.classList.contains('unfilled')) {
                    newCircle.classList.add('unfilled');
                    }
                    newCircle.addEventListener('click', () => {
                    newCircle.classList.toggle('unfilled');
                    circleStates[circleIndex] = newCircle.classList.contains('unfilled');
                    localStorage.setItem(`spellSlotStates_group_${index + 1}`, JSON.stringify(circleStates));
                    });
                    mainGroup.appendChild(newCircle);
                    circleStates.push(newCircle.classList.contains('unfilled'));
                });
    
                localStorage.setItem(`spellSlotStates_group_${index + 1}`, JSON.stringify(circleStates));
                localStorage.setItem(`spellSlotTotalCircles_group_${index + 1}`, circleStates.length);
                updateGroupVisibility(mainGroup);
                });
    
                console.log('✅ Spell slot changes saved to localStorage.');
                const overlay = document.querySelector('.spell-slot-edit-overlay');
                if (overlay) {
                overlay.classList.remove('show');
                }
            });
            } else {
            console.warn('Save button with id "save_spell_slot_changes" not found.');
            }
        }
    }
  
    initSpellSlotSection();
    initializeActionRowToggles();
  
    const editTabButton = document.getElementById('edit_tab_button');
    if (editTabButton) {
      editTabButton.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
        if (activeTab === 'tab9') {
          console.log('✏️ Spell Slot Edit Button Clicked via edit_tab_button in Tab 9');
          const overlay = document.querySelector('.spell-slot-edit-overlay');
          console.log('Overlay element:', overlay);
          const mainSpellSlots = document.querySelectorAll('.spell-slot-group');
          const overlaySpellSlots = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');
    
          if (overlay) {
            overlay.classList.add('show');
    
            mainSpellSlots.forEach((mainGroup, index) => {
              const overlayGroup = overlaySpellSlots[index];
              if (!overlayGroup) return;
    
              const titleElement = mainGroup.querySelector('.spell-slot-title');
              const titleText = titleElement ? titleElement.textContent : `Level ${index + 1}`;
              overlayGroup.innerHTML = `<span class="spell-slot-title">${titleText}</span>`;
    
              const mainCircles = mainGroup.querySelectorAll('.circle:not(.circle-button)');
              mainCircles.forEach((circle) => {
                const newCircle = document.createElement('div');
                newCircle.classList.add('circle');
                if (circle.classList.contains('unfilled')) {
                  newCircle.classList.add('unfilled');
                }
                newCircle.addEventListener('click', () => {
                  newCircle.classList.toggle('unfilled');
                });
                overlayGroup.appendChild(newCircle);
              });
    
              const addButton = document.createElement('div');
              addButton.classList.add('circle', 'circle-button');
              addButton.innerHTML = "+";
              addButton.addEventListener('click', () => {
                const newCircle = document.createElement('div');
                newCircle.classList.add('circle');
                newCircle.addEventListener('click', () => {
                  newCircle.classList.toggle('unfilled');
                });
                overlayGroup.appendChild(newCircle);
              });
    
              const removeButton = document.createElement('div');
              removeButton.classList.add('circle', 'circle-button');
              removeButton.innerHTML = "−";
              removeButton.addEventListener('click', () => {
                const circles = overlayGroup.querySelectorAll('.circle:not(.circle-button)');
                if (circles.length > 0) {
                  overlayGroup.removeChild(circles[circles.length - 1]);
                }
              });
    
              overlayGroup.insertBefore(addButton, overlayGroup.children[1] || null);
              overlayGroup.insertBefore(removeButton, addButton.nextSibling);
            });
    
            console.log('✅ Spell slot groups copied to overlay.');
          } else {
            console.warn('Spell slot edit overlay not found.');
          }
        } else if (activeTab === 'tab4' || activeTab === 'tab8') {
            console.log('🛠 Actions Edit Button Clicked via edit_tab_button in ' + activeTab);
            const actionsOverlay = document.querySelector('.actions-edit-overlay');
            if (actionsOverlay) {
              actionsOverlay.dataset.activeTab = activeTab;
              const overlayContent = actionsOverlay.querySelector('.overlay-content') || actionsOverlay;
              const headerElem = overlayContent.querySelector('h2');
              const paraElem = overlayContent.querySelector('p');
              
              const sourceactionsGrid = document.querySelector('#' + activeTab + ' .actions-grid');
              if (sourceactionsGrid) {
                const actionsGridClone = sourceactionsGrid.cloneNode(true);
                actionsGridClone.querySelectorAll('.action-name, .action-label, .action-description')
                  .forEach(field => {
                    field.contentEditable = "true";
                      const placeholder =
                        field.classList.contains('action-name')
                          ? 'Enter action name here...'
                          : field.classList.contains('action-label')
                            ? '+/-'
                            : 'Enter action description here...';
                      attachPlaceholder(field, placeholder);
                    });
                                    
                let container = overlayContent.querySelector('.actions-edit-container');
                if (!container) {
                  container = document.createElement('div');
                  container.classList.add('actions-edit-container');
                }
                container.innerHTML = "";
                container.appendChild(actionsGridClone);
                
                if (paraElem) {
                  paraElem.parentNode.insertBefore(container, paraElem.nextSibling);
                } else if (headerElem) {
                  headerElem.parentNode.insertBefore(container, headerElem.nextSibling);
                } else {
                  overlayContent.insertBefore(container, overlayContent.firstChild);
                }
                
                addDragHandlesToOverlay();
                initializeDynamicactionRows();
                initializeRowDragAndDrop();
              } else {
                console.warn('No actions grid found in ' + activeTab + '.');
              }
              actionsOverlay.classList.add('show');
            } else {
              console.warn('Actions edit overlay not found.');
            }
        } else {
          console.warn('Edit tab button clicked, but no overlay is defined for this tab.');
        }
      });
    } else {
      console.error('Edit tab button with id "edit_tab_button" not found.');
    }
});

// SAVE CHANGES functionality for the Actions Edit Overlay
const saveActionsButton = document.getElementById('save_action_changes');
if (saveActionsButton) {
  saveActionsButton.addEventListener('click', () => {
    const actionsOverlay = document.querySelector('.actions-edit-overlay');
    const currentTab = actionsOverlay ? actionsOverlay.dataset.activeTab : null;
    if (!currentTab) {
      console.warn('Active tab not stored on the overlay.');
      return;
    }
    
    const container = document.querySelector('.actions-edit-overlay .actions-edit-container');
    if (container) {
      const newGrid = container.querySelector('.actions-grid');
      if (newGrid) {
        newGrid.querySelectorAll('.drag-handle').forEach(handle => handle.remove());
        newGrid.querySelectorAll('.remove-action-button').forEach(btn => btn.remove());
        
        let rows = Array.from(newGrid.querySelectorAll('.action-row')).filter(row => !isactionRowCompletelyEmpty(row));

        rows.forEach((row, index) => {
          const newIndex = index + 1;
          reNumberactionRow(row, newIndex, currentTab);
        });

        rows.forEach(row => {
          row.querySelectorAll('[style]').forEach(el => {
            const style = el.getAttribute('style');
            const cleaned = style.replace(/text-wrap-mode\s*:\s*nowrap;?/gi, '');
            if (cleaned.trim()) {
              el.setAttribute('style', cleaned);
            } else {
              el.removeAttribute('style');
            }
          });
        });

        const newHTML = rows.map(row => {
          row.querySelectorAll('.action-name, .action-label, .action-description').forEach(field => {
            if (field.dataset.fullContent) field.innerHTML = field.dataset.fullContent;
          });
          return row.outerHTML;
        }).join('');
        
        const targetGrid = document.querySelector('#' + currentTab + ' .actions-grid');
        if (targetGrid) {
          targetGrid.innerHTML = newHTML;
            targetGrid
              .querySelectorAll('.action-name, .action-label, .action-description')
              .forEach(field => {
                const txt = field.textContent.trim();
                if (
                  txt === 'Enter action name here...' ||
                  txt === '+/-' ||
                  txt === 'Enter action description here...'
                ) {
                  field.textContent = '';
                }
                field.removeAttribute('style');
                field.contentEditable = "false";
              });

          console.log('✅ actions grid updated in ' + currentTab + ' with re-indexed rows.');
          
          targetGrid.querySelectorAll('.action-name, .action-label, .action-description').forEach(field => {
            field.contentEditable = "false";
          });
          
          targetGrid.querySelectorAll('[data-storage-key]').forEach(el => {
            const key = el.getAttribute('data-storage-key');
            const value = el.textContent.trim();
            localStorage.setItem(key, value);
          });
        } else {
          console.warn('actions grid not found in ' + currentTab + '.');
        }
        
        localStorage.setItem(currentTab + '_actions_grid', newHTML);
        console.log('✅ actions grid changes saved to localStorage for ' + currentTab + '.');
      } else {
        console.warn('No cloned actions grid found in the overlay container.');
      }
    } else {
      console.warn('actions edit container not found in the actions edit overlay.');
    }
    
    if (actionsOverlay) {
      actionsOverlay.classList.remove('show');
    }
  });
} else {
  console.warn('Save button with id "save_action_changes" not found.');
}

const overlayCancelConfigs = [
    {
      cancelId: 'close_spell_slot_edit',
      overlaySelector: '.spell-slot-edit-overlay',
      overlayName: 'Spell slot edit overlay'
    },
    {
      cancelId: 'close_action_edit',
      overlaySelector: '.actions-edit-overlay',
      overlayName: 'Actions edit overlay'
    }
  ];
  
  overlayCancelConfigs.forEach(({ cancelId, overlaySelector, overlayName }) => {
    const cancelButton = document.getElementById(cancelId);
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        console.log(`❌ ${overlayName} cancelled.`);
        const overlay = document.querySelector(overlaySelector);
        if (overlay) {
          overlay.classList.remove('show');
        }
      });
    } else {
      console.warn(`Cancel button with id "${cancelId}" not found.`);
    }
});

function attachPlaceholder(element, placeholderText) {
    if (!element.textContent.trim()) {
      element.textContent = placeholderText;
      element.style.opacity = "0.5";
    }
    
    element.addEventListener('focus', function () {
      if (this.textContent.trim() === placeholderText) {
        this.textContent = "";
        this.style.opacity = "1";
      }
    });
    
    element.addEventListener('blur', function () {
      if (this.textContent.trim() === "") {
        this.textContent = placeholderText;
        this.style.opacity = "0.5";
      }
    });
  }
  
function isactionRowCompletelyEmpty(row) {
    const nameField = row.querySelector('.action-name');
    const labelField = row.querySelector('.action-label');
    const descField = row.querySelector('.action-description');

    const nameEmpty = !nameField || nameField.textContent.trim() === "" || nameField.textContent.trim() === "Enter action name here...";
    const labelEmpty = !labelField || labelField.textContent.trim() === "" || labelField.textContent.trim() === "+/-";
    const descEmpty = !descField || descField.textContent.trim() === "" || descField.textContent.trim() === "Enter action description here...";

    return nameEmpty && labelEmpty && descEmpty;
}

function createEmptyactionRow(nextIndex, tabPrefix) {
  if (!tabPrefix) {
    console.error("createEmptyactionRow: No tabPrefix provided.");
    return document.createElement('div');
  }
  
  const row = document.createElement('div');
  row.classList.add('action-row');

  const dragHandle = document.createElement('span');
  dragHandle.classList.add('drag-handle');
  dragHandle.setAttribute('tabindex', '0');
  dragHandle.setAttribute('draggable', 'true');
  dragHandle.innerHTML = "&#9776;";
  row.appendChild(dragHandle);

  const toggleButton = document.createElement('button');
  toggleButton.classList.add('toggle-action-view', 'action-button');
  toggleButton.innerHTML = "+";
  row.appendChild(toggleButton);

  const actionName = document.createElement('span');
  actionName.contentEditable = true;
  actionName.classList.add('action-name');
  actionName.setAttribute('data-storage-key', `${tabPrefix}_action_name_${nextIndex}`);
  attachPlaceholder(actionName, "Enter action name here...");

  const actionLabel = document.createElement('span');
  actionLabel.contentEditable = true;
  actionLabel.classList.add('action-label');
  actionLabel.setAttribute('data-storage-key', `${tabPrefix}_action_label_${nextIndex}`);
  attachPlaceholder(actionLabel, "+/-");

  const actionDescription = document.createElement('span');
  actionDescription.contentEditable = true;
  actionDescription.classList.add('action-description');
  actionDescription.setAttribute('data-storage-key', `${tabPrefix}_action_description_${nextIndex}`);
  attachPlaceholder(actionDescription, "Enter action description here...");

  row.appendChild(actionName);
  row.appendChild(actionLabel);
  row.appendChild(actionDescription);

  row.addEventListener('input', () => {
    ensureExtraEmptyactionRow();
    if (!isactionRowCompletelyEmpty(row) && !row.querySelector('.remove-action-button')) {
      const removeButton = document.createElement('button');
      removeButton.classList.add('action-button', 'red-button', 'remove-action-button');
      removeButton.textContent = '×';
      row.appendChild(removeButton);
    }
  });
  return row;
}

function addDragHandlesToOverlay() {
  const grid = document.querySelector('.actions-edit-overlay .actions-edit-container .actions-grid');
  if (!grid) return;
  grid.querySelectorAll('.action-row').forEach(row => {
    if (!row.querySelector('.drag-handle')) {
        const dragHandle = document.createElement('span');
        dragHandle.classList.add('drag-handle');
        dragHandle.setAttribute('tabindex', '0');
        dragHandle.setAttribute('draggable', 'true');
        dragHandle.innerHTML = "&#9776;";
        row.insertBefore(dragHandle, row.firstChild);
    }
    if (!row.querySelector('.remove-action-button') && !isactionRowCompletelyEmpty(row)) {
        const removeButton = document.createElement('button');
        removeButton.classList.add('action-button', 'red-button', 'remove-action-button');
        removeButton.textContent = '×';
        row.appendChild(removeButton);
    }
  });
}

function initializeActionRowToggles() {
  console.log("initializeActionRowToggles executing.");

  const actionRows = document.querySelectorAll('.action-row');
  actionRows.forEach(row => {
    if (!row.dataset.viewState) {
      row.classList.add('condensed');
      row.classList.remove('expanded');
    }

    const toggleButton = row.querySelector('button');
    if (toggleButton) {
      toggleButton.innerHTML = "+";
      toggleButton.classList.add('toggle-action-view', 'action-button');
      row.insertBefore(toggleButton, row.firstChild);
    } else {
      console.warn("No toggle button found in action-row:", row);
    }
  });

  document.addEventListener('click', function(e) {
    const toggleButton = e.target.closest('.action-row button');
    if (toggleButton) {
      e.preventDefault();
      const row = toggleButton.closest('.action-row');
      if (!row) {
        console.warn("Toggle button clicked, but no parent .action-row found.");
        return;
      }
      if (row.classList.contains('expanded')) {
        row.classList.remove('expanded');
        row.classList.add('condensed');
        row.dataset.viewState = 'condensed';
        toggleButton.textContent = "+";
        row.querySelectorAll('.action-name, .action-label, .action-description').forEach(field => {
          if (!field.dataset.fullContent) field.dataset.fullContent = field.innerHTML;
          field.innerHTML = field.innerHTML.split('<br>')[0];
        });
      } else {
        row.classList.remove('condensed');
        row.classList.add('expanded');
        row.dataset.viewState = 'expanded';
        toggleButton.textContent = "-";
        row.querySelectorAll('.action-name, .action-label, .action-description').forEach(field => {
          if (field.dataset.fullContent) field.innerHTML = field.dataset.fullContent;
        });
      }
      const actionsGrid = row.closest('.actions-grid');
      const tabContent = row.closest('.tab-content');
      if (actionsGrid && tabContent) {
        const rows = Array.from(actionsGrid.querySelectorAll('.action-row'));
        const html = rows.map(r => {
          const clone = r.cloneNode(true);
          clone.querySelectorAll('.action-name, .action-label, .action-description').forEach(field => {
              if (field.dataset.fullContent) field.innerHTML = field.dataset.fullContent;
          });
          clone.querySelectorAll('[style]').forEach(el => {
            const style = el.getAttribute('style');
            const cleaned = style.replace(/text-wrap-mode\s*:\s*nowrap;?/gi, '');
            if (cleaned.trim()) {
              el.setAttribute('style', cleaned);
            } else {
              el.removeAttribute('style');
            }
          });
          const state = clone.dataset.viewState || 'condensed';
          clone.classList.remove('condensed', 'expanded');
          clone.classList.add(state);
          return clone.outerHTML;
        }).join('');
        localStorage.setItem(tabContent.id + '_actions_grid', html);
      }
    }
  });
}

function initializeRowDragAndDrop() {
  const grid = document.querySelector('.actions-edit-overlay .actions-edit-container .actions-grid');
  if (!grid) return;
  let dragSrcEl = null;

  grid.querySelectorAll('.action-row').forEach(row => {
    row.removeAttribute('draggable');
    if (row._dragstart) {
      row.removeEventListener('dragstart', row._dragstart);
      delete row._dragstart;
    }
    if (row._dragend) {
      row.removeEventListener('dragend', row._dragend);
      delete row._dragend;
    }
  });

  grid.querySelectorAll('.action-row').forEach(row => {
    const handle = row.querySelector('.drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', () => {
      row.setAttribute('draggable', 'true');
    });
    handle.addEventListener('mouseup', () => {
      row.removeAttribute('draggable');
    });

    const onDragStart = e => {
      dragSrcEl = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    };
    row.addEventListener('dragstart', onDragStart);
    row._dragstart = onDragStart;

    const onDragEnd = () => {
      row.classList.remove('dragging');
      row.removeAttribute('draggable');
      document.querySelectorAll('.drop-indicator').forEach(d => d.remove());
    };
    row.addEventListener('dragend', onDragEnd);
    row._dragend = onDragEnd;
  });

  const dropIndicator = document.createElement('div');
  dropIndicator.className = 'drop-indicator';

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    const row = e.target.closest('.action-row');
    if (!row) return;

    const allRows      = Array.from(grid.querySelectorAll('.action-row'));
    const originalIdx  = allRows.indexOf(dragSrcEl);
    const targetIdx    = allRows.indexOf(row);

    if (targetIdx < 0 || targetIdx === originalIdx) {
      if (dropIndicator.parentNode) dropIndicator.parentNode.removeChild(dropIndicator);
      return;
    }

    const { top, height } = row.getBoundingClientRect();
    const offset = e.clientY - top;

    const isAboveNeighbor = targetIdx === originalIdx - 1;
    const isBelowNeighbor = targetIdx === originalIdx + 1;
    if ((isAboveNeighbor && offset >= height/2) ||
        (isBelowNeighbor && offset <  height/2)) {
      if (dropIndicator.parentNode) dropIndicator.parentNode.removeChild(dropIndicator);
      return;
    }

    if (dropIndicator.parentNode) {
      dropIndicator.parentNode.removeChild(dropIndicator);
    }
    if (offset < height/2) {
      row.parentNode.insertBefore(dropIndicator, row);
    } else {
      row.parentNode.insertBefore(dropIndicator, row.nextSibling);
    }
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    if (!dropIndicator.parentNode) return;

    const ref = dropIndicator.nextSibling;
    dropIndicator.parentNode.removeChild(dropIndicator);
    grid.insertBefore(dragSrcEl, ref);

    dragSrcEl.classList.remove('dragging');
    dragSrcEl.removeAttribute('draggable');
  });
}

function reNumberactionRow(row, newIndex, tabPrefix) {
  const nameField = row.querySelector('.action-name');
  if (nameField) {
    nameField.setAttribute('data-storage-key', `${tabPrefix}_action_name_${newIndex}`);
  }
  const labelField = row.querySelector('.action-label');
  if (labelField) {
    labelField.setAttribute('data-storage-key', `${tabPrefix}_action_label_${newIndex}`);
  }
  const descField = row.querySelector('.action-description');
  if (descField) {
    descField.setAttribute('data-storage-key', `${tabPrefix}_action_description_${newIndex}`);
  }
}    

function ensureExtraEmptyactionRow() {
  const grid = document.querySelector('.actions-edit-overlay .actions-edit-container .actions-grid');
  if (!grid) return;

  const actionsOverlay = document.querySelector('.actions-edit-overlay');
  if (!actionsOverlay || !actionsOverlay.dataset.activeTab) {
      console.error("ensureExtraEmptyactionRow: Active tab is not defined in the overlay's dataset.");
      return;
  }
  const tabPrefix = actionsOverlay.dataset.activeTab;

  const rows = grid.querySelectorAll('.action-row');
  if (rows.length === 0) {
      const newRow = createEmptyactionRow(1, tabPrefix);
      grid.appendChild(newRow);
      return;
  }
  const lastRow = rows[rows.length - 1];
  if (!isactionRowCompletelyEmpty(lastRow)) {
      const key = lastRow.querySelector('.action-name').getAttribute('data-storage-key');
      const parts = key.split('_');
      let index = parseInt(parts[parts.length - 1], 10);
      if (isNaN(index)) {
          index = rows.length;
      }
      const newRow = createEmptyactionRow(index + 1, tabPrefix);
      grid.appendChild(newRow);
  }
}

let pendingRemoveRow = null;

document.addEventListener('click', e => {
    const removeBtn = e.target.closest('.remove-action-button');
    if (!removeBtn) return;
    pendingRemoveRow = removeBtn.closest('.action-row');
    const overlay = document.querySelector('.remove-action-overlay');
    if (overlay) overlay.classList.add('show');
});

const confirmRemoveAction = document.getElementById('confirm_remove_action_button');
const cancelRemoveAction = document.getElementById('cancel_remove_action_button');

if (confirmRemoveAction) {
    confirmRemoveAction.onclick = () => {
        if (pendingRemoveRow) {
            pendingRemoveRow.remove();
            pendingRemoveRow = null;
        }
        document.querySelector('.remove-action-overlay').classList.remove('show');
    };
}

if (cancelRemoveAction) {
    cancelRemoveAction.onclick = () => {
        pendingRemoveRow = null;
        document.querySelector('.remove-action-overlay').classList.remove('show');
    };
}

function initializeDynamicactionRows() {
  const grid = document.querySelector('.actions-edit-overlay .actions-edit-container .actions-grid');
  if (!grid) return;
  const rows = grid.querySelectorAll('.action-row');
  rows.forEach(row => {
    row.addEventListener('input', () => {
      ensureExtraEmptyactionRow();
    });
  });
  ensureExtraEmptyactionRow();
}