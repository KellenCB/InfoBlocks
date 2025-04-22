import {
  updateTab4Saves,
  updateTab8Saves,
  updateTab4Skills,
  updateTab8Skills
} from './CharacterSheetCalulations.js';

// ==============================
// Blocks
// ==============================
export function toggleBlockUse(blockId, idx, event, element) {
  event.stopPropagation();
  element.classList.toggle('unfilled');
  const newState = element.classList.contains('unfilled');

  const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab1";
  const blocks = JSON.parse(localStorage.getItem(`userBlocks_${activeTab}`)) || [];
  const block = blocks.find(b => b.id === blockId);
  if (!block) return;
  if (!Array.isArray(block.uses)) block.uses = [];
  block.uses[idx] = newState;
  localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
}
window.toggleBlockUse = toggleBlockUse;

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
// Circle Toggles for Stats, Saves & Skills (Tab 4 & Tab 8)
// ==============================

document.addEventListener('DOMContentLoaded', () => {
  // --- Tab 4 Toggles ---
  const tab4Circles = document.querySelectorAll('#tab4 .toggle-circle');
  tab4Circles.forEach((circle, index) => {
    const key = circle.getAttribute('data-storage-key') || `tab4Toggle_${index}`;
    const saved = localStorage.getItem(key) === 'true';
    circle.classList.add(saved ? 'filled' : 'unfilled');

    circle.addEventListener('click', () => {
      const isNowFilled = circle.classList.toggle('filled');
      circle.classList.toggle('unfilled', !isNowFilled);
      localStorage.setItem(key, isNowFilled.toString());
      // Recalculate Tab 4 saves & skills
      if (typeof updateTab4Saves === 'function') updateTab4Saves();
      if (typeof updateTab4Skills === 'function') updateTab4Skills();
    });
  });
  console.log('✅ Tab 4 toggle-circles bound');

  // --- Tab 8 Toggles ---
  const tab8Circles = document.querySelectorAll('#tab8 .toggle-circle');
  tab8Circles.forEach((circle, index) => {
    const key = circle.getAttribute('data-storage-key') || `tab8Toggle_${index}`;
    const saved = localStorage.getItem(key) === 'true';
    circle.classList.add(saved ? 'filled' : 'unfilled');

    circle.addEventListener('click', () => {
      const isNowFilled = circle.classList.toggle('filled');
      circle.classList.toggle('unfilled', !isNowFilled);
      localStorage.setItem(key, isNowFilled.toString());
      // Recalculate Tab 8 saves & skills
      if (typeof updateTab8Saves === 'function') updateTab8Saves();
      if (typeof updateTab8Skills === 'function') updateTab8Skills();
    });
  });
  console.log('✅ Tab 8 toggle-circles bound');

  // --- Initial Recalculation ---
  if (typeof updateTab4Saves === 'function') updateTab4Saves();
  if (typeof updateTab4Skills === 'function') updateTab4Skills();
  if (typeof updateTab8Saves === 'function') updateTab8Saves();
  if (typeof updateTab8Skills === 'function') updateTab8Skills();
});
