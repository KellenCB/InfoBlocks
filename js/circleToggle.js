import {
  updateTab4Saves,
  updateTab8Saves,
  updateTab4Skills,
  updateTab8Skills
} from './CharacterSheetCalulations.js';

// ==============================
// Blocks (Tab 1 usage toggles)
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
