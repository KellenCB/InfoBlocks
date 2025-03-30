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
    
            const addCircle = () => {
                createCircle(circles.length, true, false);
                totalCircles++;
                localStorage.setItem(totalKey, totalCircles);
            };
    
            const removeCircle = () => {
                const existingCircles = groupContainer.querySelectorAll('.circle:not(.circle-button)');
                if (existingCircles.length > 0) {
                const circleToRemove = existingCircles[existingCircles.length - 1];
                if (circleToRemove) {
                    groupContainer.removeChild(circleToRemove);
                    delete circleStates[totalCircles - 1];
                    totalCircles--;
                    localStorage.setItem(totalKey, totalCircles);
                    localStorage.setItem(stateKey, JSON.stringify(circleStates));
                }
                }
                updateGroupVisibility(groupContainer);
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
                // ensures tab 2 is active
                const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                if (activeTab !== 'tab2') {
                  console.warn('🛑 Edit tab button clicked, but Tab 2 is not active.');
                  return;
                }
            console.log('✏️ Spell Slot Edit Button Clicked via edit_tab_button');
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
                    newCircle.classList.add('circle', 'unfilled');
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
            }
            });
        } else {
            console.error('Edit tab button with id "edit_tab_button" not found.');
        }
    });
  
    // CANCEL BUTTON functionality for the spell slot overlay
    const cancelButton = document.getElementById('close_spell_slot_edit');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        console.log('❌ Spell slot edit overlay cancelled.');
        const overlay = document.querySelector('.spell-slot-edit-overlay');
        if (overlay) {
          overlay.classList.remove('show');
        }
      });
    } else {
      console.warn('Cancel button with id "close_spell_slot_edit" not found.');
    }