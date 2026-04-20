// uiHandlers.js
// Combines: CharacterSheetCalulations.js, circleToggle.js, editButtonHandler.js, pageUtils.js

/* ==================================================================*/
/* ================ CHARACTER SHEET CALCULATIONS ====================*/
/* ==================================================================*/

// Determine if a save or skill toggle is proficient

export function evaluateStatExpression(expr) {
    const trimmed = expr.trim();
    if (!/[+\-]/.test(trimmed)) return null;
    if (!/^[+\-]?[\d\.]+(\s*[+\-]\s*[\d\.]+)*$/.test(trimmed)) return null;
    const matches = trimmed.match(/[+\-]?\s*[\d\.]+/g);
    if (!matches) return null;
    const result = matches.reduce((sum, part) => sum + parseFloat(part.replace(/\s/g, '')), 0);
    if (isNaN(result)) return null;
    return Number.isInteger(result) ? result : parseFloat(result.toFixed(2));
}

function syncHitDieMax(tabPrefix) {
    const level = localStorage.getItem(`${tabPrefix}_level`) || '';
    const el = document.querySelector(`[data-storage-key="${tabPrefix}_hit_die_max"]`);
    if (el) el.textContent = level;
}

function isProficient(toggleKey) {
    const toggle = document.querySelector(`[data-storage-key="${toggleKey}"]`);
    return toggle && toggle.classList.contains("filled");
}

// Compute and display a saving throw: stat bonus + proficiency (if active)
function calculateSavingThrow(statBonusKey, toggleKey, profKey, saveKey) {
    const statBonus = parseInt(localStorage.getItem(statBonusKey) || "0", 10);
    const profBonus = parseInt(localStorage.getItem(profKey) || "0", 10);
    const total = statBonus + (isProficient(toggleKey) ? profBonus : 0);
    const el = document.querySelector(`[data-storage-key="${saveKey}"]`);
    if (el) el.textContent = (total >= 0 ? "+" : "") + total;
}

// Compute and display a skill total: ability bonus + proficiency (if active)
function calculateSkill(skillKey, abilityBonusKey, toggleKey, profKey) {
    const abilityBonus = parseInt(localStorage.getItem(abilityBonusKey) || "0", 10);
    const profBonus    = parseInt(localStorage.getItem(profKey) || "0", 10);
    const total = abilityBonus + (isProficient(toggleKey) ? profBonus : 0);
    const el = document.querySelector(`[data-storage-key="${skillKey}"]`);
    if (el) el.textContent = (total >= 0 ? "+" : "") + total;
}

// Calculate D&D ability modifier from score; blank or "00" yields "00"
function calculateAbilityBonus(scoreKey, bonusKey) {
    const raw = localStorage.getItem(scoreKey);
    const el = document.querySelector(`[data-storage-key="${bonusKey}"]`);
    if (!raw || raw.trim() === "" || raw.trim() === "00") {
        localStorage.setItem(bonusKey, "0");
        if (el) el.textContent = "00";
        return;
    }
    const evaluated = evaluateStatExpression(raw);
    const score = evaluated !== null ? evaluated : parseInt(raw, 10);
    const mod = Math.floor((score - 10) / 2);
    localStorage.setItem(bonusKey, mod);
    if (el) el.textContent = (mod >= 0 ? "+" : "") + mod;
}

// Update ability modifiers for Tab 4
function updateTab4AbilityBonuses() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
        calculateAbilityBonus(`tab4_${ab}_score`, `tab4_${ab}_bonus`)
    );
}

// Update ability modifiers for Tab 8
function updateTab8AbilityBonuses() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
        calculateAbilityBonus(`tab8_${ab}_score`, `tab8_${ab}_bonus`)
    );
}

// Update all saving throws for Tab 4
function updateTab4Saves() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
        calculateSavingThrow(`tab4_${ab}_bonus`, `tab4_save_${ab}_toggle`, `tab4_prof`, `tab4_save_${ab}`)
    );
}

// Update all saving throws for Tab 8
function updateTab8Saves() {
    ["str","dex","con","int","wis","cha"].forEach(ab =>
        calculateSavingThrow(`tab8_${ab}_bonus`, `tab8_save_${ab}_toggle`, `tab8_prof`, `tab8_save_${ab}`)
    );
}

// Update all skills for Tab 4
function updateTab4Skills() {
    const skills = [
        ["acrobatics","dex"],
        ["animal_handling","wis"],
        ["arcana","int"],
        ["athletics","str"],
        ["deception","cha"],
        ["history","int"],
        ["insight","wis"],
        ["intimidation","cha"],
        ["investigation","int"],
        ["medicine","wis"],
        ["nature","int"],
        ["perception","wis"],
        ["performance","cha"],
        ["persuasion","cha"],
        ["religion","int"],
        ["sleight_of_hand","dex"],
        ["stealth","dex"],
        ["survival","wis"]
    ];
    skills.forEach(([skill, ab]) =>
        calculateSkill(`tab4_skill_${skill}`, `tab4_${ab}_bonus`, `tab4_skill_${skill}_toggle`, `tab4_prof`)
    );
}

// Update all skills for Tab 8
function updateTab8Skills() {
    const skills = [
        ["acrobatics","dex"],
        ["animal_handling","wis"],
        ["arcana","int"],
        ["athletics","str"],
        ["deception","cha"],
        ["history","int"],
        ["insight","wis"],
        ["intimidation","cha"],
        ["investigation","int"],
        ["medicine","wis"],
        ["nature","int"],
        ["perception","wis"],
        ["performance","cha"],
        ["persuasion","cha"],
        ["religion","int"],
        ["sleight_of_hand","dex"],
        ["stealth","dex"],
        ["survival","wis"]
    ];
    skills.forEach(([skill, ab]) =>
        calculateSkill(`tab8_skill_${skill}`, `tab8_${ab}_bonus`, `tab8_skill_${skill}_toggle`, `tab8_prof`)
    );
}

// Wire click-to-roll on every save and skill row in tabs 4 and 8
function initSaveSkillRollHandlers() {
    const rows = document.querySelectorAll(
        '#tab4 .save-row, #tab4 .skill-row, #tab8 .save-row, #tab8 .skill-row'
    );

    rows.forEach(row => {
        row.addEventListener('click', async (e) => {
            // Don't intercept proficiency toggle circle clicks
            if (e.target.closest('.toggle-circle')) return;

            const isSave   = row.classList.contains('save-row');
            const labelEl  = row.querySelector('.save-label, .skill-label');
            const bonusEl  = row.querySelector('.skill-plus');
            if (!labelEl || !bonusEl) return;

            const label     = labelEl.textContent.trim();
            const modifier  = parseInt(bonusEl.textContent.trim(), 10) || 0;
            const rollLabel = `${label} ${isSave ? 'Saving Throw' : 'Skill Check'}`;

            // Open dice panel if closed — consistent with inline dice buttons
            const dicePanel = document.getElementById('dice-panel');
            if (dicePanel && !dicePanel.classList.contains('open')) {
                document.getElementById('dice-menu-button')?.click();
            }

            const { rollDice } = await import('./diceRoller.js');
            rollDice([{ qty: 1, sides: 20 }], modifier, rollLabel);
        });
    });
}

// Initial calculation after all load handlers
window.addEventListener("load", () => {
    setTimeout(() => {
        syncHitDieMax('tab4');
        syncHitDieMax('tab8');
        updateTab4AbilityBonuses();
        updateTab8AbilityBonuses();
        updateTab4Saves();
        updateTab8Saves();
        updateTab4Skills();
        updateTab8Skills();
        initSaveSkillRollHandlers();
    }, 0);
});

// Recalc on editable input
document.addEventListener("input", (e) => {
    if (!e.target.matches("[contenteditable=true]")) return;
    const key = e.target.getAttribute("data-storage-key");
    if (!key) return;
    localStorage.setItem(key, e.target.textContent);
    if (key === 'tab4_level') syncHitDieMax('tab4');
    else if (key === 'tab8_level') syncHitDieMax('tab8');
    if (key.endsWith("_score")) {
        if (key.startsWith("tab4_")) updateTab4AbilityBonuses();
        else if (key.startsWith("tab8_")) updateTab8AbilityBonuses();
    }
    updateTab4Saves();
    updateTab8Saves();
    updateTab4Skills();
    updateTab8Skills();
});

/* ==================================================================*/
/* ========================= CIRCLE TOGGLE ==========================*/
/* ==================================================================*/

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

export function toggleObjective(blockId, idx, event, element) {
  event.stopPropagation();

  const blocks = JSON.parse(localStorage.getItem('userBlocks_tab3')) || [];
  const block = blocks.find(b => b.id === blockId);
  if (!block || !Array.isArray(block.objectives) || !block.objectives[idx]) return;

  block.objectives[idx].done = !block.objectives[idx].done;
  localStorage.setItem('userBlocks_tab3', JSON.stringify(blocks));

  // Update the objective row in place
  element.classList.toggle('done', block.objectives[idx].done);

  // Update progress bar + count inside the same block (expanded AND mini progress)
  const blockEl = element.closest('.block');
  if (blockEl) {
    const total = block.objectives.length;
    const done  = block.objectives.filter(o => o.done).length;
    const pct   = total > 0 ? (done / total) * 100 : 0;

    blockEl.querySelectorAll('.quest-progress-fill').forEach(fill => {
      fill.style.width = `${pct}%`;
    });
    blockEl.querySelectorAll('.quest-progress-count').forEach(count => {
      count.textContent = `${done} / ${total}`;
    });
  }
}
window.toggleObjective = toggleObjective;

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

/* ==================================================================*/
/* ========================= EDIT BUTTON HANDLER ====================*/
/* ==================================================================*/

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
        const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
        if (activeTab === 'tab9') {
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

/* ==================================================================*/
/* ==================== UPLOAD / DOWNLOAD ===========================*/
/* ==================================================================*/

document.addEventListener('DOMContentLoaded', () => {

    /* ── Download ──────────────────────────────────────────────────── */

    document.getElementById('download_button')?.addEventListener('click', () => {
        try {
            const data = Object.fromEntries(
                Array.from({ length: localStorage.length }, (_, i) => {
                    const key = localStorage.key(i);
                    try { return [key, JSON.parse(localStorage.getItem(key))]; }
                    catch { return [key, localStorage.getItem(key)]; }
                })
            );

            data.pageTitle     = document.querySelector('.title-section h1')?.textContent.trim() || 'InformationBlocks';
            data.resultsTitles = Object.fromEntries(
                [...document.querySelectorAll("[id^='results_title_']")]
                    .map(el => [el.id, el.textContent.trim()])
            );

            const circleSection = document.querySelector('.circle-section');
            if (circleSection) {
                const circles = [...circleSection.querySelectorAll('.circle:not(.circle-button)')];
                data.circleData = {
                    totalCircles: circles.length,
                    states: circles.map(c => c.classList.contains('unfilled') ? 0 : 1)
                };
            }

            const pageTitle = data.pageTitle;
            let filename = prompt('Enter a name for your file:', `InfoBlocks_${pageTitle}`);
            if (!filename) return;
            if (!filename.endsWith('.json')) filename += '.json';

            const a   = Object.assign(document.createElement('a'), {
                href:     URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })),
                download: filename
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

            console.log(`✅ Data downloaded as: ${filename}`);
        } catch (err) {
            console.error('❌ Error exporting data:', err);
            alert('An error occurred while exporting data.');
        }
    });

    /* ── Upload ────────────────────────────────────────────────────── */

    document.getElementById('upload_button')?.addEventListener('click', () => {
        const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/json' });

        input.addEventListener('change', ({ target: { files: [file] } }) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ({ target: { result } }) => {
                try {
                    const data = JSON.parse(result);
                    if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Data must be an object.');

                    Object.entries(data).forEach(([key, value]) => {
                        if (key === 'resultsTitles' && typeof value === 'object') {
                            Object.entries(value).forEach(([id, text]) => {
                                const el = document.getElementById(id);
                                if (el) el.textContent = text;
                            });
                        } else if (key === 'pageTitle') {
                            const el = document.querySelector('.title-section h1');
                            if (el) el.textContent = value;
                        }
                        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    });

                    alert('✅ Data uploaded successfully.');
                    location.reload();
                } catch (err) {
                    console.error('❌ Error uploading data:', err);
                    alert('Invalid JSON file or data structure.');
                }
            };
            reader.readAsText(file);
        });

        input.click();
    });

    /* ── Page Title ────────────────────────────────────────────────── */

    const pageTitle = document.getElementById('page_title');
    if (!pageTitle) { console.error('❌ Page title element not found.'); return; }

    pageTitle.textContent = localStorage.getItem('pageTitle') || '';

    pageTitle.addEventListener('blur', () => {
        const val = pageTitle.textContent.trim();
        val ? localStorage.setItem('pageTitle', val) : localStorage.removeItem('pageTitle');
    });

    pageTitle.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); pageTitle.blur(); }
    });

    console.log('✅ Page title initialized.');
});