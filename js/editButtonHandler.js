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
  
    const editTabButton = document.getElementById('edit_tab_button');

    // Contextual edit buttons — wire each to trigger the same logic
    // as edit_tab_button would for its specific tab.
    document.getElementById('edit_spell_slots_button')?.addEventListener('click', () => {
        console.log('✏️ Spell Slot Edit Button clicked');
        const overlay = document.querySelector('.spell-slot-edit-overlay');
        const mainSpellSlots   = document.querySelectorAll('.spell-slot-group');
        const overlaySpellSlots = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');
        if (overlay) {
            overlay.classList.add('show');
            mainSpellSlots.forEach((mainGroup, index) => {
                const overlayGroup = overlaySpellSlots[index];
                if (!overlayGroup) return;
                const titleElement = mainGroup.querySelector('.spell-slot-title');
                const titleText = titleElement ? titleElement.textContent : `Level ${index + 1}`;
                overlayGroup.innerHTML = `<span class="spell-slot-title">${titleText}</span>`;
                mainGroup.querySelectorAll('.circle:not(.circle-button)').forEach(circle => {
                    const newCircle = document.createElement('div');
                    newCircle.classList.add('circle');
                    if (circle.classList.contains('unfilled')) newCircle.classList.add('unfilled');
                    newCircle.addEventListener('click', () => newCircle.classList.toggle('unfilled'));
                    overlayGroup.appendChild(newCircle);
                });
                const addButton = document.createElement('div');
                addButton.classList.add('circle', 'circle-button');
                addButton.innerHTML = "+";
                addButton.addEventListener('click', () => {
                    const newCircle = document.createElement('div');
                    newCircle.classList.add('circle');
                    newCircle.addEventListener('click', () => newCircle.classList.toggle('unfilled'));
                    overlayGroup.appendChild(newCircle);
                });
                const removeButton = document.createElement('div');
                removeButton.classList.add('circle', 'circle-button');
                removeButton.innerHTML = "−";
                removeButton.addEventListener('click', () => {
                    const circles = overlayGroup.querySelectorAll('.circle:not(.circle-button)');
                    if (circles.length > 0) overlayGroup.removeChild(circles[circles.length - 1]);
                });
                overlayGroup.insertBefore(addButton, overlayGroup.children[1] || null);
                overlayGroup.insertBefore(removeButton, addButton.nextSibling);
            });
            console.log('✅ Spell slot groups copied to overlay.');
        } else {
            console.warn('Spell slot edit overlay not found.');
        }
    });

    if (editTabButton) {
      editTabButton.addEventListener('click', () => {
        const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;        if (activeTab === 'tab9') {
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
        } else {
          console.warn('Edit tab button clicked, but no overlay is defined for this tab.');
        }
      });
    } else {
      console.error('Edit tab button with id "edit_tab_button" not found.');
    }
});