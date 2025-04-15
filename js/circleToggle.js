// ==============================
// Blocks
// ==============================
export function toggleBlockUse(blockId, idx, event, element) {
  event.stopPropagation();

  element.classList.toggle('unfilled');
  const newState = element.classList.contains('unfilled');

  const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab1";
  let blocks = JSON.parse(localStorage.getItem(`userBlocks_${activeTab}`)) || [];

  const block = blocks.find(b => b.id === blockId);
  if (!block) return;

  if (!Array.isArray(block.uses)) block.uses = [];
  block.uses[idx] = newState;

  localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
}

// 👇 This makes it usable from inline onclick="..." attributes
window.toggleBlockUse = toggleBlockUse;

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
    createCircle(circles.length, false, false);
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
  
// ==============================
// Tab 4: Character Sheet Toggle Circles
// ==============================
const tab4ToggleCircles = document.querySelectorAll('#tab4 .toggle-circle');
if (tab4ToggleCircles) {
    tab4ToggleCircles.forEach((circle, index) => {
        // Use the data attribute if available; otherwise, fall back to an index-based key.
        const key = circle.getAttribute('data-storage-key') || `tab4Toggle_${index}`;

        // On load, set the circle state from localStorage
        const savedState = localStorage.getItem(key);
        if (savedState === 'true') {
            circle.classList.add('unfilled');
        } else {
            circle.classList.remove('unfilled');
        }

        // Save the state on click and log the event
        circle.addEventListener('click', (e) => {
            console.log(`circleToggle.js (Tab 4): Click event fired for circle with key "${key}".`);
            circle.classList.toggle('unfilled');
            const state = circle.classList.contains('unfilled');
            localStorage.setItem(key, state);
        });
    });
    console.log("✅ Toggle functionality added for Tab 4 toggle circles with localStorage.");
}

// ==============================
// Tab 8: Character Sheet Toggle Circles
// ==============================
const tab8ToggleCircles = document.querySelectorAll('#tab8 .toggle-circle');
if (tab8ToggleCircles) {
    tab8ToggleCircles.forEach((circle, index) => {
        // Use the data attribute if available; otherwise, fall back to an index-based key.
        const key = circle.getAttribute('data-storage-key') || `tab8Toggle_${index}`;

        // On load, set the circle state from localStorage
        const savedState = localStorage.getItem(key);
        if (savedState === 'true') {
            circle.classList.add('unfilled');
        } else {
            circle.classList.remove('unfilled');
        }

        // Save the state on click
        circle.addEventListener('click', () => {
            circle.classList.toggle('unfilled');
            const state = circle.classList.contains('unfilled');
            localStorage.setItem(key, state);
        });
      });
      console.log("✅ Toggle functionality added for Tab 4 toggle circles with localStorage.");
}

});