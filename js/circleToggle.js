document.addEventListener('DOMContentLoaded', () => {
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
      // Expecting nine child containers with class "spell-slot-group"
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
          if (circles.length > 0) {
            const circleToRemove = circles.pop();
            if (circleToRemove) {
              groupContainer.removeChild(circleToRemove);
              delete circleStates[totalCircles - 1];
              totalCircles--;
              localStorage.setItem(totalKey, totalCircles);
              localStorage.setItem(stateKey, JSON.stringify(circleStates));
            }
          }
        };
  
        // Create add/remove buttons for each group
        const addButton = document.createElement('div');
        addButton.classList.add('circle', 'circle-button');
        addButton.innerHTML = "+";
        addButton.addEventListener('click', addCircle);
  
        const removeButton = document.createElement('div');
        removeButton.classList.add('circle', 'circle-button');
        removeButton.innerHTML = "−";
        removeButton.addEventListener('click', removeCircle);
  
        groupContainer.insertBefore(addButton, groupContainer.firstChild);
        groupContainer.insertBefore(removeButton, addButton.nextSibling);
  
        // Initialize circles for this group
        for (let i = 0; i < totalCircles; i++) {
          createCircle(i, circleStates[i] ?? true, false);
        }
        console.log(`✅ Spell slot group ${groupId} initialized with ${totalCircles} circles.`);
      });
    }
  });
  