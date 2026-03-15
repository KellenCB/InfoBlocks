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

  const activeTab = document.querySelector(".tab-button.active")?.dataset.tab || "tab4";
  const blocks = JSON.parse(localStorage.getItem(`userBlocks_${activeTab}`)) || [];
  const block = blocks.find(b => b.id === blockId);
  if (!block) return;
  if (!Array.isArray(block.uses)) block.uses = [];
  block.uses[idx] = newState;
  localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
}
window.toggleBlockUse = toggleBlockUse;

// ==============================
// Suit Uses Circle Section
// ==============================
const circleContainer = document.querySelector('.circle-section');
if (circleContainer) {
  let circleStates = JSON.parse(localStorage.getItem('circleStates')) || {};
  let totalCircles = localStorage.getItem('totalCircles')
    ? parseInt(localStorage.getItem('totalCircles'))
    : 3;

  const circlesWrapper = document.getElementById('suit_uses_circles');

  // Render circles in the main section from saved state
  const renderMainCircles = () => {
    circlesWrapper.innerHTML = "";
    for (let i = 0; i < totalCircles; i++) {
      const circle = document.createElement('div');
      circle.classList.add('circle');
      if (circleStates[i] ?? true) circle.classList.add('unfilled');
      circle.addEventListener('click', () => {
        circle.classList.toggle('unfilled');
        circleStates[i] = circle.classList.contains('unfilled');
        localStorage.setItem('circleStates', JSON.stringify(circleStates));
      });
      circlesWrapper.appendChild(circle);
    }
  };
  
  renderMainCircles();
  console.log("✅ Suit uses circles initialised.");

  // Overlay logic
  const editBtn   = document.getElementById('edit_suit_uses_button');
  const overlay   = document.querySelector('.suit-uses-edit-overlay');
  const editGroup = document.getElementById('suit_uses_edit_group');
  const saveBtn   = document.getElementById('save_suit_uses');
  const cancelBtn = document.getElementById('close_suit_uses_edit');

  if (!editBtn || !overlay || !editGroup || !saveBtn || !cancelBtn) {
    console.warn('Suit uses overlay elements not found.');
  } else {

    const renderOverlayCircles = () => {
      editGroup.querySelectorAll('.circle').forEach(c => c.remove());

      let overlayTotal  = totalCircles;
      let overlayStates = { ...circleStates };

      const addButton = document.createElement('div');
      addButton.classList.add('circle', 'circle-button');
      addButton.innerHTML = "+";

      const removeButton = document.createElement('div');
      removeButton.classList.add('circle', 'circle-button');
      removeButton.innerHTML = "−";

      editGroup.appendChild(addButton);
      editGroup.appendChild(removeButton);

      const drawCircles = () => {
        editGroup.querySelectorAll('.circle:not(.circle-button)').forEach(c => c.remove());
        for (let i = 0; i < overlayTotal; i++) {
          const circle = document.createElement('div');
          circle.classList.add('circle');
          if (overlayStates[i] ?? true) circle.classList.add('unfilled');
          circle.addEventListener('click', () => {
            circle.classList.toggle('unfilled');
            overlayStates[i] = circle.classList.contains('unfilled');
          });
          editGroup.appendChild(circle);
        }
      };

      drawCircles();

      addButton.addEventListener('click', () => {
        overlayStates[overlayTotal] = true;
        overlayTotal++;
        drawCircles();
      });

      removeButton.addEventListener('click', () => {
        if (overlayTotal > 0) {
          overlayTotal--;
          delete overlayStates[overlayTotal];
          drawCircles();
        }
      });

      saveBtn.onclick = () => {
        totalCircles = overlayTotal;
        circleStates = { ...overlayStates };
        localStorage.setItem('totalCircles', totalCircles);
        localStorage.setItem('circleStates', JSON.stringify(circleStates));
        renderMainCircles();
        overlay.classList.remove('show');
      };
    };

    editBtn.addEventListener('click', () => {
      renderOverlayCircles();
      overlay.classList.add('show');
    });

    cancelBtn.addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }
}

// ==============================
// Circle Toggles for Stats, Saves & Skills (Tab 4 & Tab 8)
// ==============================

document.addEventListener('DOMContentLoaded', () => {
  // --- Tab 4 Toggles ---
  const tab4Circles = document.querySelectorAll('#tab4 .toggle-circle');
  tab4Circles.forEach((circle, index) => {
    const key = circle.getAttribute('data-storage-key') || `tab4Toggle_${index}`;
    const saved = localStorage.getItem(key) === 'true';
    circle.classList.add(saved ? 'filled' : 'unfilled');

    circle.addEventListener('click', () => {
      const isNowFilled = circle.classList.toggle('filled');
      circle.classList.toggle('unfilled', !isNowFilled);
      localStorage.setItem(key, isNowFilled.toString());
      if (typeof updateTab4Saves === 'function') updateTab4Saves();
      if (typeof updateTab4Skills === 'function') updateTab4Skills();
    });
  });
  console.log('✅ Tab 4 toggle-circles bound');

  // --- Tab 8 Toggles ---
  const tab8Circles = document.querySelectorAll('#tab8 .toggle-circle');
  tab8Circles.forEach((circle, index) => {
    const key = circle.getAttribute('data-storage-key') || `tab8Toggle_${index}`;
    const saved = localStorage.getItem(key) === 'true';
    circle.classList.add(saved ? 'filled' : 'unfilled');

    circle.addEventListener('click', () => {
      const isNowFilled = circle.classList.toggle('filled');
      circle.classList.toggle('unfilled', !isNowFilled);
      localStorage.setItem(key, isNowFilled.toString());
      if (typeof updateTab8Saves === 'function') updateTab8Saves();
      if (typeof updateTab8Skills === 'function') updateTab8Skills();
    });
  });
  console.log('✅ Tab 8 toggle-circles bound');

  // --- Initial Recalculation ---
  if (typeof updateTab4Saves === 'function') updateTab4Saves();
  if (typeof updateTab4Skills === 'function') updateTab4Skills();
  if (typeof updateTab8Saves === 'function') updateTab8Saves();
  if (typeof updateTab8Skills === 'function') updateTab8Skills();
});