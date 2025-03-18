document.addEventListener('DOMContentLoaded', () => {
    // ==============================
    // Function to check and hide empty spell-slot-groups
    // ==============================
    const updateGroupVisibility = (groupContainer) => {
        const circles = groupContainer.querySelectorAll('.circle:not(.circle-button)');
        if (circles.length === 0) {
            groupContainer.classList.add('hidden'); // Hide empty groups
        } else {
            groupContainer.classList.remove('hidden'); // Show groups with circles
        }
    };

    // ==============================
    // Tab 1: Single Circle Section
    // ==============================
    const circleContainer = document.querySelector('.circle-section');
    if (circleContainer) {
      let circles = []; // Store circle elements
      let circleStates = JSON.parse(localStorage.getItem('circleStates')) || {};
      let totalCircles = localStorage.getItem('totalCircles')
        ? parseInt(localStorage.getItem('totalCircles'))
        : 3;
  
      const createCircle = (index, state = true, prepend = false) => {
        const circle = document.createElement('div');
        circle.classList.add('circle');
        if (state) circle.classList.add('unfilled');
  
        circle.addEventListener('click', () => {
          circle.classList.toggle('unfilled');
          circleStates[index] = circle.classList.contains('unfilled');
          localStorage.setItem('circleStates', JSON.stringify(circleStates));
        });
  
        if (prepend) {
          circles.unshift(circle);
          circleContainer.insertBefore(circle, circleContainer.firstChild);
        } else {
          circles.push(circle);
          circleContainer.appendChild(circle);
        }
      };
  
      const addCircle = () => {
        createCircle(circles.length, true, false);
        totalCircles++;
        localStorage.setItem('totalCircles', totalCircles);
      };
  
      const removeCircle = () => {
        if (circles.length > 0) {
          const circleToRemove = circles.pop();
          if (circleToRemove) {
            circleContainer.removeChild(circleToRemove);
            delete circleStates[totalCircles - 1];
            totalCircles--;
            localStorage.setItem('totalCircles', totalCircles);
            localStorage.setItem('circleStates', JSON.stringify(circleStates));
          }
        }
      };
  
      // Create add/remove buttons
      const addButton = document.createElement('div');
      addButton.classList.add('circle', 'circle-button');
      addButton.innerHTML = "+";
      addButton.addEventListener('click', addCircle);
  
      const removeButton = document.createElement('div');
      removeButton.classList.add('circle', 'circle-button');
      removeButton.innerHTML = "−";
      removeButton.addEventListener('click', removeCircle);
  
      circleContainer.insertBefore(addButton, circleContainer.firstChild);
      circleContainer.insertBefore(removeButton, addButton.nextSibling);
  
      // Initialize circles for Tab 1
      for (let i = 0; i < totalCircles; i++) {
        createCircle(i, circleStates[i] ?? true, false);
      }
      console.log("✅ Circle controls updated for Tab 1.");
    }
  
// =======================================
// Tab 2: Spell Slot Section with 9 Groups
// =======================================
const spellSlotSection = document.querySelector('.spell-slot-section');
if (spellSlotSection) {
  // Create the new edit button
  const editButton = document.createElement('div');
  editButton.classList.add('circle', 'circle-button');
  // Use Font Awesome pencil icon; make sure Font Awesome is loaded in your HTML
  editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
  editButton.addEventListener('click', () => {
    console.log('✏️ Spell Slot Edit Button Clicked');

    const overlay = document.querySelector('.spell-slot-edit-overlay');
    const mainSpellSlots = document.querySelectorAll('.spell-slot-group');
    const overlaySpellSlots = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');

    if (overlay) {
        overlay.classList.add('show');

        // Copy data from each main group to its overlay counterpart
        mainSpellSlots.forEach((mainGroup, index) => {
            const overlayGroup = overlaySpellSlots[index];
            if (!overlayGroup) return;

            // Get the title text from the main group
            const titleElement = mainGroup.querySelector('.spell-slot-title');
            const titleText = titleElement ? titleElement.textContent : `Level ${index + 1}`;
            // Clear the overlay group and re-add the title span
            overlayGroup.innerHTML = `<span class="spell-slot-title">${titleText}</span>`;

            // Copy all circles from the main group (skip the title)
            const mainCircles = mainGroup.querySelectorAll('.circle:not(.circle-button)');
            mainCircles.forEach((circle) => {
                const newCircle = document.createElement('div');
                newCircle.classList.add('circle');
                if (circle.classList.contains('unfilled')) {
                    newCircle.classList.add('unfilled');
                }
                // Allow toggling in overlay (changes won’t affect the main section)
                newCircle.addEventListener('click', () => {
                    newCircle.classList.toggle('unfilled');
                });
                overlayGroup.appendChild(newCircle);
            });

            // === Add Add/Remove Buttons (they go after the title) ===
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

            // Insert the buttons after the title (which is the first child)
            overlayGroup.insertBefore(addButton, overlayGroup.children[1] || null);
            overlayGroup.insertBefore(removeButton, addButton.nextSibling);
        });

        console.log('✅ Spell slot groups copied to overlay.');
    }
});
    
  // Insert the edit button as the first child of the spell-slot-section container
  spellSlotSection.insertBefore(editButton, spellSlotSection.firstChild);
  
    // Function to check and hide empty spell-slot-groups
    const updateGroupVisibility = (groupContainer) => {
        const circles = groupContainer.querySelectorAll('.circle:not(.circle-button)');
        if (circles.length === 0) {
            groupContainer.classList.add('hidden'); // Hide empty groups
        } else {
            groupContainer.classList.remove('hidden'); // Show groups with circles
        }
    };

  // Process the nine spell slot groups (existing code)
  const groups = spellSlotSection.querySelectorAll('.spell-slot-group');
  groups.forEach((groupContainer, idx) => {
    // Use the data-group attribute or fallback to index+1
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
    
        updateGroupVisibility(groupContainer); // ✅ Hide group if empty
    };
      
// Get all spell-slot-groups inside the edit overlay
const overlaySpellSlotGroups = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');

// Loop through each group inside the edit overlay and add buttons
overlaySpellSlotGroups.forEach((groupContainer) => {
    // Create add/remove buttons for the edit overlay
    const addButton = document.createElement('div');
    addButton.classList.add('circle', 'circle-button');
    addButton.innerHTML = "+";
    addButton.addEventListener('click', () => {
        createCircle(groupContainer, true);
    });

    const removeButton = document.createElement('div');
    removeButton.classList.add('circle', 'circle-button');
    removeButton.innerHTML = "−";
    removeButton.addEventListener('click', () => {
        const circles = groupContainer.querySelectorAll('.circle:not(.circle-button)');
        if (circles.length > 0) {
            groupContainer.removeChild(circles[circles.length - 1]);
        }
    });

    // Insert buttons into the spell-slot-group in the edit overlay only
    groupContainer.insertBefore(addButton, groupContainer.firstChild);
    groupContainer.insertBefore(removeButton, addButton.nextSibling);
});

// Initialize circles for this group
for (let i = 0; i < totalCircles; i++) {
    createCircle(i, circleStates[i] ?? true, false);
}

updateGroupVisibility(groupContainer); // ✅ Ensure hidden groups stay hidden

  });
}

// Close button for Spell Slot Edit Overlay
const closeEditButton = document.getElementById('close_spell_slot_edit');
if (closeEditButton) {
  closeEditButton.addEventListener('click', () => {
    const overlay = document.querySelector('.spell-slot-edit-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      console.log('Spell Slot Edit Overlay closed.');
    }
  });
}

// Save changes from the edit overlay back to the main spell-slot-section and local storage
document.getElementById('save_spell_slot_changes').addEventListener('click', () => {
    const overlaySpellSlots = document.querySelectorAll('.spell-slot-edit-overlay .spell-slot-group');
    const mainSpellSlots = document.querySelectorAll('.spell-slot-section .spell-slot-group');

    overlaySpellSlots.forEach((overlayGroup, index) => {
        const mainGroup = mainSpellSlots[index];
        if (!mainGroup) return;

        // Keep the title (find existing or re-add it)
        let titleElement = mainGroup.querySelector('.spell-slot-title');
        if (!titleElement) {
            titleElement = document.createElement('span');
            titleElement.classList.add('spell-slot-title');
            titleElement.textContent = `Level ${index + 1}`;
            mainGroup.appendChild(titleElement);
        }

        // Clear only circles, keeping the title
        mainGroup.querySelectorAll('.circle:not(.circle-button)').forEach(circle => circle.remove());

        // Create an array to store circle states for localStorage
        let circleStates = [];

        // Copy all circles from the overlay group back to the main group
        overlayGroup.querySelectorAll('.circle:not(.circle-button)').forEach((circle, circleIndex) => {
            const newCircle = document.createElement('div');
            newCircle.classList.add('circle');
            if (circle.classList.contains('unfilled')) {
                newCircle.classList.add('unfilled');
            }

            // Allow toggling inside the main section
            newCircle.addEventListener('click', () => {
                newCircle.classList.toggle('unfilled');
                circleStates[circleIndex] = newCircle.classList.contains('unfilled');
                localStorage.setItem(`spellSlotStates_group_${index + 1}`, JSON.stringify(circleStates));
            });

            mainGroup.appendChild(newCircle);
            circleStates.push(newCircle.classList.contains('unfilled'));
        });

        // Save updated circle states in localStorage
        localStorage.setItem(`spellSlotStates_group_${index + 1}`, JSON.stringify(circleStates));

        // Save total number of circles
        localStorage.setItem(`spellSlotTotalCircles_group_${index + 1}`, circleStates.length);

        updateGroupVisibility(mainGroup); // ✅ Ensure empty groups are hidden
    });

    console.log('✅ Spell slot changes saved to localStorage.');

    // Hide the overlay
    document.querySelector('.spell-slot-edit-overlay').classList.remove('show');
});


});

  