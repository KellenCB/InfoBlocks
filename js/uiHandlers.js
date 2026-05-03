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
});
    
/* ==================================================================*/
/* ============ RESOURCES STRIP INLINE EDIT MODE ====================*/
/* ==================================================================*/

document.addEventListener('DOMContentLoaded', () => {
    const strip = document.querySelector('.resources-strip');
    if (!strip) return;

    const circlesWrapper   = document.getElementById('suit_uses_circles');
    const spellSlotSection = strip.querySelector('.spell-slot-section');

        const updateFirstInRow = () => {
        requestAnimationFrame(() => {
            const suitSection = strip.querySelector('.circle-section');
            let lastTop = suitSection ? suitSection.offsetTop : null;

            spellSlotSection.querySelectorAll('.spell-slot-group').forEach(group => {
                if (group.classList.contains('hidden')) {
                    group.classList.remove('first-in-row');
                    return;
                }
                const top = group.offsetTop;
                const isFirstInRow = lastTop !== null && Math.abs(top - lastTop) > 2;
                group.classList.toggle('first-in-row', isFirstInRow);
                lastTop = top;
            });
        });
    };

    new ResizeObserver(() => updateFirstInRow()).observe(strip);

    const editSpellBtn     = document.getElementById('edit_spell_slots_button');
    if (!circlesWrapper || !spellSlotSection) return;

    // ── State helpers ──────────────────────────────────────────────────
    const getSuitTotal  = () => parseInt(localStorage.getItem('totalCircles') || '3', 10);
    const getSuitStates = () => JSON.parse(localStorage.getItem('circleStates') || '{}');
    const saveSuit = (states, total) => {
        localStorage.setItem('circleStates', JSON.stringify(states));
        localStorage.setItem('totalCircles', String(total));
    };

    const getLevelTotal  = (n) => parseInt(localStorage.getItem(`spellSlotTotalCircles_group_${n}`) || '0', 10);
    const getLevelStates = (n) => JSON.parse(localStorage.getItem(`spellSlotStates_group_${n}`) || '{}');
    const saveLevel = (n, states, total) => {
        localStorage.setItem(`spellSlotStates_group_${n}`, JSON.stringify(states));
        localStorage.setItem(`spellSlotTotalCircles_group_${n}`, String(total));
    };

    // ── Element factories ──────────────────────────────────────────────
    const makeCircle = (unfilled, onToggle) => {
        const c = document.createElement('div');
        c.classList.add('circle');
        if (unfilled) c.classList.add('unfilled');
        c.addEventListener('click', () => {
            c.classList.toggle('unfilled');
            onToggle(c.classList.contains('unfilled'));
        });
        return c;
    };

    const makeButton = (extraClass, symbol, onClick) => {
        const b = document.createElement('div');
        b.classList.add('circle', 'circle-button', extraClass);
        b.innerHTML = symbol;
        b.addEventListener('click', onClick);
        return b;
    };

    // ── Renderers ──────────────────────────────────────────────────────
    const renderSuit = (editMode) => {
        circlesWrapper.innerHTML = '';
        const total  = getSuitTotal();
        const states = getSuitStates();

        if (editMode) {
            circlesWrapper.appendChild(makeButton('circle-add', '+', () => {
                const t = getSuitTotal();
                const s = getSuitStates();
                const newStates = { 0: false };
                for (let i = 0; i < t; i++) newStates[i + 1] = s[i] ?? true;
                saveSuit(newStates, t + 1);
                renderSuit(true);
            }));
            circlesWrapper.appendChild(makeButton('circle-remove', '−', () => {
                const t = getSuitTotal();
                if (t <= 0) return;
                const s = getSuitStates();
                delete s[t - 1];
                saveSuit(s, t - 1);
                renderSuit(true);
            }));
        }

        for (let i = 0; i < total; i++) {
            const unfilled = states[i] ?? true;
            circlesWrapper.appendChild(makeCircle(unfilled, (nowUnfilled) => {
                const s = getSuitStates();
                s[i] = nowUnfilled;
                saveSuit(s, getSuitTotal());
            }));
        }
    };

    const renderLevel = (n, editMode) => {
        const group = spellSlotSection.querySelector(`.spell-slot-group[data-group="${n}"]`);
        if (!group) return;
        group.querySelectorAll('.circle, .circle-button').forEach(el => el.remove());

        const total  = getLevelTotal(n);
        const states = getLevelStates(n);

        if (editMode && total > 0) {
            group.appendChild(makeButton('circle-add', '+', () => {
                const t = getLevelTotal(n);
                const s = getLevelStates(n);
                const newStates = { 0: false };
                for (let i = 0; i < t; i++) newStates[i + 1] = s[i] ?? true;
                saveLevel(n, newStates, t + 1);
                renderLevel(n, true);
            }));
            group.appendChild(makeButton('circle-remove', '−', () => {
                const t = getLevelTotal(n);
                if (t <= 0) return;
                const s = getLevelStates(n);
                delete s[t - 1];
                saveLevel(n, s, t - 1);
                renderLevel(n, true);
                if (t - 1 === 0) renderGhostChips();
            }));
        }

        for (let i = 0; i < total; i++) {
            const unfilled = states[i] ?? true;
            group.appendChild(makeCircle(unfilled, (nowUnfilled) => {
                const s = getLevelStates(n);
                s[i] = nowUnfilled;
                saveLevel(n, s, getLevelTotal(n));
            }));
        }

        group.classList.toggle('hidden', total === 0);
    };

    const renderGhostChips = () => {
        spellSlotSection.querySelectorAll('.ghost-chip').forEach(c => c.remove());
        for (let n = 1; n <= 9; n++) {
            if (getLevelTotal(n) > 0) continue;
            const chip = document.createElement('div');
            chip.classList.add('ghost-chip');
            chip.innerHTML = `<span>${n}</span><span class="ghost-chip-plus">+</span>`;
            chip.addEventListener('click', () => {
                saveLevel(n, { 0: false }, 1);
                renderLevel(n, true);
                chip.remove();
            });
            spellSlotSection.appendChild(chip);
        }
    };

    // ── Mode toggling ──────────────────────────────────────────────────
    const enterEditMode = () => {
        strip.classList.add('edit-mode');
        spellSlotSection.querySelectorAll('p').forEach(p => p.remove()); // drop legacy placeholder
        renderSuit(true);
        for (let n = 1; n <= 9; n++) renderLevel(n, true);
        renderGhostChips();
        if (editSpellBtn) editSpellBtn.textContent = '✓';
    };

    const exitEditMode = () => {
        strip.classList.remove('edit-mode');
        spellSlotSection.querySelectorAll('.ghost-chip').forEach(c => c.remove());
        renderSuit(false);
        for (let n = 1; n <= 9; n++) renderLevel(n, false);
        if (editSpellBtn) editSpellBtn.textContent = '✎';
    };

    const toggleEditMode = () => {
        if (strip.classList.contains('edit-mode')) exitEditMode();
        else enterEditMode();
    };

    // ── Wire buttons + Escape ──────────────────────────────────────────
    editSpellBtn?.addEventListener('click', toggleEditMode);

    // ── Long rest: inline arming ────────────────────────────────────────
    const longRestBtn = document.getElementById('long_rest_button');

    const MOON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const SUN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>`;

    let iconSwapTimer = null;
    const swapIcon = (newSvgHTML) => {
        clearTimeout(iconSwapTimer);
        longRestBtn.classList.add('swapping');
        iconSwapTimer = setTimeout(() => {
            const wrap = longRestBtn.querySelector('.lr-icon-wrap');
            if (wrap) wrap.innerHTML = newSvgHTML;
            longRestBtn.classList.remove('swapping');
        }, 250);
    };

    let armTimer = null;

    const doRefill = () => {
        const suitTotal = getSuitTotal();
        const suitStates = {};
        for (let i = 0; i < suitTotal; i++) suitStates[i] = false;
        saveSuit(suitStates, suitTotal);

        for (let n = 1; n <= 9; n++) {
            const total = getLevelTotal(n);
            const states = {};
            for (let i = 0; i < total; i++) states[i] = false;
            saveLevel(n, states, total);
        }

        const inEdit = strip.classList.contains('edit-mode');
        renderSuit(inEdit);
        for (let n = 1; n <= 9; n++) renderLevel(n, inEdit);
        if (inEdit) renderGhostChips();

        console.log('✅ Long rest — all slots refilled.');
    };

    const startArmTimer = () => {
        clearTimeout(armTimer);
        longRestBtn.classList.remove('armed', 'filling');
        void longRestBtn.offsetWidth;
        longRestBtn.classList.add('filling');
        armTimer = setTimeout(() => {
            longRestBtn.classList.add('armed');
        }, 500);
    };

    const cancelArmTimer = () => {
        clearTimeout(armTimer);
        longRestBtn.classList.remove('armed', 'filling');
    };

    const dismissLongRest = () => {
        cancelArmTimer();
        longRestBtn.classList.remove('arming');
        clearTimeout(iconSwapTimer);
        longRestBtn.classList.remove('swapping');
        const wrap = longRestBtn.querySelector('.lr-icon-wrap');
        if (wrap) wrap.innerHTML = MOON_SVG;
        const popup = document.getElementById('long-rest-popup');
        if (popup) {
            popup.classList.remove('visible');
            setTimeout(() => popup.remove(), 200);
        }
        document.removeEventListener('mousedown', onLongRestOutside);
    };

    longRestBtn?.addEventListener('mouseleave', () => {
        if (!longRestBtn.classList.contains('arming')) return;
        dismissLongRest();
    });

    const onLongRestOutside = (e) => {
        if (e.target === longRestBtn || longRestBtn.contains(e.target)) return;
        dismissLongRest();
    };

    const enterLongRestArming = () => {
        longRestBtn.classList.add('arming');
        swapIcon(SUN_SVG);

        const popup = document.createElement('div');
        popup.id = 'long-rest-popup';
        popup.className = 'long-rest-popup';
        popup.innerHTML = `<span class="long-rest-popup-message">Long rest — refill all<br>suit uses and spell slots?</span>`;
        document.body.appendChild(popup);

        const moonRect = longRestBtn.getBoundingClientRect();
        popup.style.top    = `${moonRect.top - 5}px`;
        popup.style.height = `${moonRect.height + 10}px`;
        popup.style.right  = `${window.innerWidth - moonRect.right - 6}px`;

        requestAnimationFrame(() => popup.classList.add('visible'));
        setTimeout(() => document.addEventListener('mousedown', onLongRestOutside), 0);
        startArmTimer();
    };

    longRestBtn?.addEventListener('click', () => {
        if (!longRestBtn.classList.contains('arming')) {
            enterLongRestArming();
        } else if (longRestBtn.classList.contains('armed')) {
            doRefill();
            dismissLongRest();
        }
    });

    longRestBtn?.addEventListener('mouseenter', () => {
        if (!longRestBtn.classList.contains('arming')) return;
        startArmTimer();
    });

    longRestBtn?.addEventListener('mouseleave', () => {
        if (!longRestBtn.classList.contains('arming')) return;
        cancelArmTimer();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && strip.classList.contains('edit-mode')) exitEditMode();
    });

    // ── Initial render: overwrites legacy handlers from older init code ─
    renderSuit(false);
    for (let n = 1; n <= 9; n++) renderLevel(n, false);

    console.log('✅ Resources strip inline edit mode initialised.');
});

/* ==================================================================*/
/* ==================== UPLOAD / DOWNLOAD ===========================*/

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

            const circleSection = document.querySelector('.spell-slot-group');
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

// ── Forgiving click targets for small circles ──
// If a click lands inside a circle container but misses every circle,
// trigger the nearest one.
document.addEventListener('click', (e) => {
    if (e.target.closest('.circle')) return;
    const container = e.target.closest('.block-uses, .spell-slot-group, #suit_uses_circles');
    if (!container) return;

    const circles = container.querySelectorAll('.circle:not(.circle-button)');
    if (circles.length === 0) return;

    let closest = null;
    let closestDist = Infinity;
    for (const c of circles) {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (d < closestDist) { closestDist = d; closest = c; }
    }

    if (closest && closestDist < 20) {
        closest.click();
    }
});