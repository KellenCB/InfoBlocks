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
                ? parseInt(localStorage.getItem(totalKey))
                : 10;
    
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
              
              // Query for the attacks grid in the source tab (either tab4 or tab8)
              const sourceAttacksGrid = document.querySelector('#' + activeTab + ' .attacks-grid');
              if (sourceAttacksGrid) {
                const attacksGridClone = sourceAttacksGrid.cloneNode(true);
                attacksGridClone.querySelectorAll('.attack-name, .attack-label, .attack-description')
                  .forEach(field => field.contentEditable = "true");
                
                let container = overlayContent.querySelector('.attacks-edit-container');
                if (!container) {
                  container = document.createElement('div');
                  container.classList.add('attacks-edit-container');
                }
                container.innerHTML = "";
                container.appendChild(attacksGridClone);
                
                if (paraElem) {
                  paraElem.parentNode.insertBefore(container, paraElem.nextSibling);
                } else if (headerElem) {
                  headerElem.parentNode.insertBefore(container, headerElem.nextSibling);
                } else {
                  overlayContent.insertBefore(container, overlayContent.firstChild);
                }
                
                addDragHandlesToOverlay();
                initializeDynamicAttackRows();
                initializeRowDragAndDrop();
              } else {
                console.warn('No attacks grid found in ' + activeTab + '.');
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
    
    const container = document.querySelector('.actions-edit-overlay .attacks-edit-container');
    if (container) {
      const newGrid = container.querySelector('.attacks-grid');
      if (newGrid) {
        // Remove all drag handle elements from each row.
        newGrid.querySelectorAll('.drag-handle').forEach(handle => handle.remove());
        
        // Filter out completely empty rows.
        let rows = Array.from(newGrid.querySelectorAll('.attack-row')).filter(row => !isAttackRowCompletelyEmpty(row));

        // Re-index each remaining row sequentially starting from 1 using currentTab as prefix.
        rows.forEach((row, index) => {
          const newIndex = index + 1;
          reNumberAttackRow(row, newIndex, currentTab);
        });

        // Build new HTML content from the re-indexed rows.
        const newHTML = rows.map(row => row.outerHTML).join('');
        
        // Update the attacks grid in the source tab (currentTab) with the new content.
        const targetGrid = document.querySelector('#' + currentTab + ' .attacks-grid');
        if (targetGrid) {
          targetGrid.innerHTML = newHTML;
          console.log('✅ Attacks grid updated in ' + currentTab + ' with re-indexed rows.');
          
          // Set fields to be non-editable when saved.
          targetGrid.querySelectorAll('.attack-name, .attack-label, .attack-description').forEach(field => {
            field.contentEditable = "false";
          });
          
          // Update localStorage for every element with a data-storage-key.
          targetGrid.querySelectorAll('[data-storage-key]').forEach(el => {
            const key = el.getAttribute('data-storage-key');
            const value = el.textContent.trim();
            localStorage.setItem(key, value);
          });
        } else {
          console.warn('Attacks grid not found in ' + currentTab + '.');
        }
        
        localStorage.setItem(currentTab + '_attacks_grid', newHTML);
        console.log('✅ Attacks grid changes saved to localStorage for ' + currentTab + '.');
      } else {
        console.warn('No cloned attacks grid found in the overlay container.');
      }
    } else {
      console.warn('Attacks edit container not found in the actions edit overlay.');
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


// ---------------- Helper functions for dynamic attack rows ----------------

// Helper: Placeholder trext for empty rows.
function attachPlaceholder(element, placeholderText) {
    // Initialize the element with the placeholder if it's empty.
    if (!element.textContent.trim()) {
      element.textContent = placeholderText;
      element.style.opacity = "0.5";
    }
    
    element.addEventListener('focus', function () {
      // Immediately clear the field on focus
      this.textContent = "";
      this.style.opacity = "1";
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
function isAttackRowCompletelyEmpty(row) {
    const nameField = row.querySelector('.attack-name');
    const labelField = row.querySelector('.attack-label');
    const descField = row.querySelector('.attack-description');

    const nameEmpty = !nameField || nameField.textContent.trim() === "" || nameField.textContent.trim() === "Enter action name here...";
    const labelEmpty = !labelField || labelField.textContent.trim() === "" || labelField.textContent.trim() === "+/-";
    const descEmpty = !descField || descField.textContent.trim() === "" || descField.textContent.trim() === "Enter action description here...";

    return nameEmpty && labelEmpty && descEmpty;
}

// Helper: Create empty rows.
function createEmptyAttackRow(nextIndex, tabPrefix) {
    if (!tabPrefix) {
        console.error("createEmptyAttackRow: No tabPrefix provided.");
        return document.createElement('div'); // Return an empty div as a fallback
    }
    
    const row = document.createElement('div');
    row.classList.add('attack-row');

    // Create and append the drag-handle.
    const dragHandle = document.createElement('span');
    dragHandle.classList.add('drag-handle');
    dragHandle.setAttribute('draggable', 'true');
    dragHandle.innerHTML = "&#9776;";
    row.appendChild(dragHandle);

    // Create the attack name field.
    const attackName = document.createElement('span');
    attackName.contentEditable = true;
    attackName.classList.add('attack-name');
    attackName.setAttribute('data-storage-key', `${tabPrefix}_attack_name_${nextIndex}`);
    attachPlaceholder(attackName, "Enter action name here...");

    // Create the attack label field.
    const attackLabel = document.createElement('span');
    attackLabel.contentEditable = true;
    attackLabel.classList.add('attack-label');
    attackLabel.setAttribute('data-storage-key', `${tabPrefix}_attack_label_${nextIndex}`);
    attachPlaceholder(attackLabel, "+/-");

    // Create the attack description field.
    const attackDescription = document.createElement('span');
    attackDescription.contentEditable = true;
    attackDescription.classList.add('attack-description');
    attackDescription.setAttribute('data-storage-key', `${tabPrefix}_attack_description_${nextIndex}`);
    attachPlaceholder(attackDescription, "Enter action description here...");

    // Append the fields in order: attack name, attack label, then attack description.
    row.appendChild(attackName);
    row.appendChild(attackLabel);
    row.appendChild(attackDescription);

    // Listen for input events so that a new empty row is appended as needed.
    row.addEventListener('input', () => {
        ensureExtraEmptyAttackRow();
    });

    return row;
}


// Helper: Drag to reorder rows.
function addDragHandlesToOverlay() {
    const grid = document.querySelector('.actions-edit-overlay .attacks-edit-container .attacks-grid');
    if (!grid) return;
    grid.querySelectorAll('.attack-row').forEach(row => {
        if (!row.querySelector('.drag-handle')) {
            const dragHandle = document.createElement('span');
            dragHandle.classList.add('drag-handle');
            dragHandle.setAttribute('draggable', 'true');
            dragHandle.innerHTML = "&#9776;";
            row.insertBefore(dragHandle, row.firstChild);
        }
    });
}

function initializeRowDragAndDrop() {
    const grid = document.querySelector('.actions-edit-overlay .attacks-edit-container .attacks-grid');
    if (!grid) return;
    let dragSrcEl = null;
  
    grid.querySelectorAll('.attack-row').forEach(row => {
      const handle = row.querySelector('.drag-handle');
      if (handle) {
        handle.addEventListener('dragstart', (e) => {
          dragSrcEl = row;
          row.classList.add('dragging'); // Add visual indication here.
          e.dataTransfer.effectAllowed = 'move';
          // Set some dummy data to satisfy Firefox requirements.
          e.dataTransfer.setData('text/html', row.outerHTML);
        });
        handle.addEventListener('dragend', () => {
          row.classList.remove('dragging'); // Remove visual indication.
        });
      }
  
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
  
      row.addEventListener('drop', (e) => {
        e.stopPropagation();
        if (dragSrcEl && dragSrcEl !== row) {
          // Determine insertion position
          const bounding = row.getBoundingClientRect();
          const offset = e.clientY - bounding.top;
          if (offset > bounding.height / 2) {
            row.parentNode.insertBefore(dragSrcEl, row.nextSibling);
          } else {
            row.parentNode.insertBefore(dragSrcEl, row);
          }
        }
        return false;
      });
    });
  }    

// Helper: Re-number a given attack row to use a new sequential index.
function reNumberAttackRow(row, newIndex, tabPrefix) {
    const nameField = row.querySelector('.attack-name');
    if (nameField) {
      nameField.setAttribute('data-storage-key', `${tabPrefix}_attack_name_${newIndex}`);
    }
    const labelField = row.querySelector('.attack-label');
    if (labelField) {
      labelField.setAttribute('data-storage-key', `${tabPrefix}_attack_label_${newIndex}`);
    }
    const descField = row.querySelector('.attack-description');
    if (descField) {
      descField.setAttribute('data-storage-key', `${tabPrefix}_attack_description_${newIndex}`);
    }
  }    

// Ensures that the grid in the Actions Edit Overlay always has one extra empty row at the end.
function ensureExtraEmptyAttackRow() {
    const grid = document.querySelector('.actions-edit-overlay .attacks-edit-container .attacks-grid');
    if (!grid) return;
  
    // Retrieve the current tab prefix from the overlay's dataset.
    const actionsOverlay = document.querySelector('.actions-edit-overlay');
    if (!actionsOverlay || !actionsOverlay.dataset.activeTab) {
        console.error("ensureExtraEmptyAttackRow: Active tab is not defined in the overlay's dataset.");
        return;
    }
    const tabPrefix = actionsOverlay.dataset.activeTab;
  
    const rows = grid.querySelectorAll('.attack-row');
    if (rows.length === 0) {
        // If there are no rows, create the first empty row with index 1.
        const newRow = createEmptyAttackRow(1, tabPrefix);
        grid.appendChild(newRow);
        return;
    }
    const lastRow = rows[rows.length - 1];
    if (!isAttackRowCompletelyEmpty(lastRow)) {
        // Retrieve the index number from the last row's attack name field.
        const key = lastRow.querySelector('.attack-name').getAttribute('data-storage-key'); // e.g. "tab4_attack_name_3"
        const parts = key.split('_');
        let index = parseInt(parts[parts.length - 1], 10);
        if (isNaN(index)) {
            index = rows.length;
        }
        const newRow = createEmptyAttackRow(index + 1, tabPrefix);
        grid.appendChild(newRow);
    }
}
  
  // Call on initialization to add listeners to any existing rows and ensure an extra empty row.
  function initializeDynamicAttackRows() {
    const grid = document.querySelector('.actions-edit-overlay .attacks-edit-container .attacks-grid');
    if (!grid) return;
    const rows = grid.querySelectorAll('.attack-row');
    rows.forEach(row => {
      row.addEventListener('input', () => {
        ensureExtraEmptyAttackRow();
      });
    });
    ensureExtraEmptyAttackRow();
  }
  