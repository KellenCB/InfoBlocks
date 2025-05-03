document.addEventListener('DOMContentLoaded', () => {
    function initSpellSlotSection() {
      // =======================================
      // Tab 2: Spell Slot Section with 9 Groups
      // =======================================
      const spellSlotSection = document.querySelector('.spell-slot-section');
        if (spellSlotSection) {
            // Utility function to check and hide empty spell-slot-groups
            const updateGroupVisibility = (groupContainer) => {
            const circles = groupContainer.querySelectorAll('.circle:not(.circle-button)');
            if (circles.length === 0) {
                groupContainer.classList.add('hidden');
            } else {
                groupContainer.classList.remove('hidden');
            }
            };
    
            // Process each of the nine spell slot groups
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
    
            // Initialize circles for the current group
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
            
            // Save button for the spell slot edit overlay
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
    
                // Remove all circles (but keep the title)
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
  
    // Attach the event listener for opening the spell slot edit overlay
    // to the existing edit_tab_button from the header.
    const editTabButton = document.getElementById('edit_tab_button');
    if (editTabButton) {
      editTabButton.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
        if (activeTab === 'tab2') {
          console.log('✏️ Spell Slot Edit Button Clicked via edit_tab_button in Tab 2');
          const overlay = document.querySelector('.spell-slot-edit-overlay');
          console.log('Overlay element:', overlay);
          const mainSpellSlots = document.querySelectorAll('.spell-slot-group');
          const overlaySpellSlots = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');
    
          if (overlay) {
            overlay.classList.add('show');
    
            // Copy data from each main group to its overlay counterpart
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
              // Store the current active tab in the overlay's dataset.
              actionsOverlay.dataset.activeTab = activeTab;
              const overlayContent = actionsOverlay.querySelector('.overlay-content') || actionsOverlay;
              const headerElem = overlayContent.querySelector('h2');
              const paraElem = overlayContent.querySelector('p');
              
              // Query for the actions grid in the source tab (either tab4 or tab8)
              const sourceactionsGrid = document.querySelector('#' + activeTab + ' .actions-grid');
              if (sourceactionsGrid) {
                const actionsGridClone = sourceactionsGrid.cloneNode(true);
                actionsGridClone.querySelectorAll('.action-name, .action-label, .action-description')
                  .forEach(field => {
                    field.contentEditable = "true";
                      // re-attach placeholder behavior on empty fields
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
    // Retrieve the active tab from the overlay's dataset.
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
        // Remove all drag handle elements from each row.
        newGrid.querySelectorAll('.drag-handle').forEach(handle => handle.remove());
        
        // Filter out completely empty rows.
        let rows = Array.from(newGrid.querySelectorAll('.action-row')).filter(row => !isactionRowCompletelyEmpty(row));

        // Re-index each remaining row sequentially starting from 1 using currentTab as prefix.
        rows.forEach((row, index) => {
          const newIndex = index + 1;
          reNumberactionRow(row, newIndex, currentTab);
        });

        // ─── Strip unwanted inline styles (e.g. text-wrap-mode: nowrap) ───
        rows.forEach(row => {
          row.querySelectorAll('[style]').forEach(el => {
            const style = el.getAttribute('style');
            // remove any text-wrap-mode declarations
            const cleaned = style.replace(/text-wrap-mode\s*:\s*nowrap;?/gi, '');
            if (cleaned.trim()) {
              el.setAttribute('style', cleaned);
            } else {
              el.removeAttribute('style');
            }
          });
        });

        // Build new HTML content from the re-indexed rows.
        const newHTML = rows.map(row => row.outerHTML).join('');
        
        // Update the actions grid in the source tab (currentTab) with the new content.
        const targetGrid = document.querySelector('#' + currentTab + ' .actions-grid');
        if (targetGrid) {
          targetGrid.innerHTML = newHTML;
            // ─── CLEAN UP PLACEHOLDER FIELDS ───
            targetGrid
              .querySelectorAll('.action-name, .action-label, .action-description')
              .forEach(field => {
                const txt = field.textContent.trim();
                // If it's one of the placeholders, wipe it out
                if (
                  txt === 'Enter action name here...' ||
                  txt === '+/-' ||
                  txt === 'Enter action description here...'
                ) {
                  field.textContent = '';
                }
                // Remove any leftover inline style (opacity, etc)
                field.removeAttribute('style');
                // And lock it down
                field.contentEditable = "false";
              });

          console.log('✅ actions grid updated in ' + currentTab + ' with re-indexed rows.');
          
          // Set fields to be non-editable when saved.
          targetGrid.querySelectorAll('.action-name, .action-label, .action-description').forEach(field => {
            field.contentEditable = "false";
          });
          
          // Update localStorage for every element with a data-storage-key.
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

// CANCEL BUTTON functionality for both the Spell Slot Edit Overlay and the Actions Edit Overlay
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

// ---------------- Helper functions for dynamic action rows ----------------

// Helper: Placeholder trext for empty rows.
function attachPlaceholder(element, placeholderText) {
    // Initialize the element with the placeholder if it's empty.
    if (!element.textContent.trim()) {
      element.textContent = placeholderText;
      element.style.opacity = "0.5";
    }
    
    element.addEventListener('focus', function () {
      // Only clear if it’s still showing the placeholder
      if (this.textContent.trim() === placeholderText) {
        this.textContent = "";
        this.style.opacity = "1";
      }
    });
    
    element.addEventListener('blur', function () {
      // If the field is left empty on blur, reapply the placeholder text
      if (this.textContent.trim() === "") {
        this.textContent = placeholderText;
        this.style.opacity = "0.5";
      }
    });
  }
  
// Helper: Check if row is empty.
function isactionRowCompletelyEmpty(row) {
    const nameField = row.querySelector('.action-name');
    const labelField = row.querySelector('.action-label');
    const descField = row.querySelector('.action-description');

    const nameEmpty = !nameField || nameField.textContent.trim() === "" || nameField.textContent.trim() === "Enter action name here...";
    const labelEmpty = !labelField || labelField.textContent.trim() === "" || labelField.textContent.trim() === "+/-";
    const descEmpty = !descField || descField.textContent.trim() === "" || descField.textContent.trim() === "Enter action description here...";

    return nameEmpty && labelEmpty && descEmpty;
}

// Helper: Create empty rows.
function createEmptyactionRow(nextIndex, tabPrefix) {
  if (!tabPrefix) {
    console.error("createEmptyactionRow: No tabPrefix provided.");
    return document.createElement('div'); // Fallback: empty div
  }
  
  const row = document.createElement('div');
  row.classList.add('action-row');

  // Create and append the drag-handle first.
  const dragHandle = document.createElement('span');
  dragHandle.setAttribute('tabindex', '0');
  dragHandle.setAttribute('draggable', 'true');
  dragHandle.innerHTML = "&#9776;";
  row.appendChild(dragHandle);

  // Create the toggle-action-view button and append it next to the drag handle.
  const toggleButton = document.createElement('button');
  toggleButton.classList.add('toggle-action-view', 'action-button');
  toggleButton.innerHTML = "+";  // Set the default symbol
  row.appendChild(toggleButton);

  // Create the action name field.
  const actionName = document.createElement('span');
  actionName.contentEditable = true;
  actionName.classList.add('action-name');
  actionName.setAttribute('data-storage-key', `${tabPrefix}_action_name_${nextIndex}`);
  attachPlaceholder(actionName, "Enter action name here...");

  // Create the action label field.
  const actionLabel = document.createElement('span');
  actionLabel.contentEditable = true;
  actionLabel.classList.add('action-label');
  actionLabel.setAttribute('data-storage-key', `${tabPrefix}_action_label_${nextIndex}`);
  attachPlaceholder(actionLabel, "+/-");

  // Create the action description field.
  const actionDescription = document.createElement('span');
  actionDescription.contentEditable = true;
  actionDescription.classList.add('action-description');
  actionDescription.setAttribute('data-storage-key', `${tabPrefix}_action_description_${nextIndex}`);
  attachPlaceholder(actionDescription, "Enter action description here...");

  // Append the editable fields to the row.
  row.appendChild(actionName);
  row.appendChild(actionLabel);
  row.appendChild(actionDescription);

  // Listen for input events so that a new empty row is appended as needed.
  row.addEventListener('input', () => {
    ensureExtraEmptyactionRow();
  });

  return row;
}


// Helper: Drag to reorder rows.
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
  });
}

function initializeActionRowToggles() {
  console.log("initializeActionRowToggles executing.");

  // Set the initial state (condensed) for all existing .action-row elements.
  const actionRows = document.querySelectorAll('.action-row');
  actionRows.forEach(row => {
    row.classList.add('condensed');
    row.classList.remove('expanded');

    // Find the toggle button within the row
    const toggleButton = row.querySelector('button');
    if (toggleButton) {
      toggleButton.innerHTML = "+";
      toggleButton.classList.add('toggle-action-view', 'action-button');
      
      // Ensure the button appears at the top by inserting it as the first child.
      row.insertBefore(toggleButton, row.firstChild);
    } else {
      console.warn("No toggle button found in action-row:", row);
    }
  });

  // Use event delegation on the document to catch clicks on any .action-row button,
  // ensuring that even dynamically added rows (e.g. in an edit overlay) have toggle functionality.
  document.addEventListener('click', function(e) {
    const toggleButton = e.target.closest('.action-row button');
    if (toggleButton) {
      e.preventDefault();
      const row = toggleButton.closest('.action-row');
      if (!row) {
        console.warn("Toggle button clicked, but no parent .action-row found.");
        return;
      }
      // Toggle between expanded and condensed states and update button symbol accordingly.
      if (row.classList.contains('expanded')) {
        row.classList.remove('expanded');
        row.classList.add('condensed');
        toggleButton.textContent = "+";
        console.log(`Action row containing button "${toggleButton.textContent}" toggled to condensed.`);
      } else {
        row.classList.remove('condensed');
        row.classList.add('expanded');
        toggleButton.textContent = "-";
        console.log(`Action row containing button "${toggleButton.textContent}" toggled to expanded.`);
      }
    }
  });
}

function initializeRowDragAndDrop() {
  const grid = document.querySelector('.actions-edit-overlay .actions-edit-container .actions-grid');
  if (!grid) return;
  let dragSrcEl = null;

  // ─── Clean up previous listeners & draggable flags ───
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

  // ─── Arm each row when its handle is pressed ───
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
      // clean up any leftover indicator
      document.querySelectorAll('.drop-indicator').forEach(d => d.remove());
    };
    row.addEventListener('dragend', onDragEnd);
    row._dragend = onDragEnd;
  });

  // ─── One single between-row indicator ───
  const dropIndicator = document.createElement('div');
  dropIndicator.className = 'drop-indicator';

  // ─── dragover: only show indicator if it would change position ───
// ─── Delegate dragover to show indicator only when it would actually move the row ───
grid.addEventListener('dragover', e => {
  e.preventDefault();
  const row = e.target.closest('.action-row');
  if (!row) return;

  // 1) get the full static ordering of rows (including the one being dragged)
  const allRows      = Array.from(grid.querySelectorAll('.action-row'));
  const originalIdx  = allRows.indexOf(dragSrcEl);
  const targetIdx    = allRows.indexOf(row);

  // 2) if you're over the dragged row itself or an unknown element, hide indicator
  if (targetIdx < 0 || targetIdx === originalIdx) {
    if (dropIndicator.parentNode) dropIndicator.parentNode.removeChild(dropIndicator);
    return;
  }

  // 3) calculate pointer offset within that row
  const { top, height } = row.getBoundingClientRect();
  const offset = e.clientY - top;

  // 4) suppress indicator on the “near” half of the adjacent row
  const isAboveNeighbor = targetIdx === originalIdx - 1;
  const isBelowNeighbor = targetIdx === originalIdx + 1;
  if ((isAboveNeighbor && offset >= height/2) ||
      (isBelowNeighbor && offset <  height/2)) {
    if (dropIndicator.parentNode) dropIndicator.parentNode.removeChild(dropIndicator);
    return;
  }

  // 5) otherwise place it in the proper gap
  if (dropIndicator.parentNode) {
    dropIndicator.parentNode.removeChild(dropIndicator);
  }
  if (offset < height/2) {
    row.parentNode.insertBefore(dropIndicator, row);
  } else {
    row.parentNode.insertBefore(dropIndicator, row.nextSibling);
  }
});

  // ─── drop: insert at the indicator, if present ───
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

// Helper: Re-number a given action row to use a new sequential index.
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

// Ensures that the grid in the Actions Edit Overlay always has one extra empty row at the end.
function ensureExtraEmptyactionRow() {
  const grid = document.querySelector('.actions-edit-overlay .actions-edit-container .actions-grid');
  if (!grid) return;

  // Retrieve the current tab prefix from the overlay's dataset.
  const actionsOverlay = document.querySelector('.actions-edit-overlay');
  if (!actionsOverlay || !actionsOverlay.dataset.activeTab) {
      console.error("ensureExtraEmptyactionRow: Active tab is not defined in the overlay's dataset.");
      return;
  }
  const tabPrefix = actionsOverlay.dataset.activeTab;

  const rows = grid.querySelectorAll('.action-row');
  if (rows.length === 0) {
      // If there are no rows, create the first empty row with index 1.
      const newRow = createEmptyactionRow(1, tabPrefix);
      grid.appendChild(newRow);
      return;
  }
  const lastRow = rows[rows.length - 1];
  if (!isactionRowCompletelyEmpty(lastRow)) {
      // Retrieve the index number from the last row's action name field.
      const key = lastRow.querySelector('.action-name').getAttribute('data-storage-key'); // e.g. "tab4_action_name_3"
      const parts = key.split('_');
      let index = parseInt(parts[parts.length - 1], 10);
      if (isNaN(index)) {
          index = rows.length;
      }
      const newRow = createEmptyactionRow(index + 1, tabPrefix);
      grid.appendChild(newRow);
  }
}
  
  // Call on initialization to add listeners to any existing rows and ensure an extra empty row.
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
  