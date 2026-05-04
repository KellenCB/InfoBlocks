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
/* ========================= HP BAR SECTION ========================*/
/* ==================================================================*/

function initHpSection(tabPrefix) {
    const tabEl = document.getElementById(tabPrefix);
    if (!tabEl) return;

    const hpSection = tabEl.querySelector('.hp-section');
    if (!hpSection) return;

    const barArea    = hpSection.querySelector('.hp-bar-area');
    const barTint    = barArea.querySelector('.hp-bar-tint');
    const barFill    = barArea.querySelector('.hp-bar-fill');
    const barHl      = barArea.querySelector('.hp-bar-hl');
    const barTemp    = barArea.querySelector('.hp-bar-temp');
    const barTempHl  = barArea.querySelector('.hp-bar-temp-hl');
    const barGlow    = barArea.querySelector('.hp-bar-glow');
    const barText    = barArea.querySelector('.hp-bar-text');
    const maxEl      = hpSection.querySelector(`[data-storage-key="${tabPrefix}_maxhp"]`);
    const inputEl    = hpSection.querySelector('.hp-input-field');
    const actionBtns = hpSection.querySelectorAll('.hp-action-btn');

    const hdTypeEl     = hpSection.querySelector(`[data-storage-key="${tabPrefix}_hit_die"]`);
    const hdCurrentEl  = hpSection.querySelector(`[data-storage-key="${tabPrefix}_hit_die_current"]`);
    const hdMaxEl      = hpSection.querySelector(`[data-storage-key="${tabPrefix}_hit_die_max"]`);
    const hdQtyDisplay = hpSection.querySelector('.hd-qty-display');
    const hdMinusBtn   = hpSection.querySelector('.hd-minus');
    const hdPlusBtn    = hpSection.querySelector('.hd-plus');
    const hdRollBtn    = hpSection.querySelector('.hd-roll-btn');
    const hdRollDetail = hpSection.querySelector('.hd-roll-detail');


    // ── State ────────────────────────────────────────────────────────
    let currentHp = parseInt(localStorage.getItem(`${tabPrefix}_hp`)) || 0;
    let maxHp     = parseInt(localStorage.getItem(`${tabPrefix}_maxhp`)) || 0;
    let tempHp    = parseInt(localStorage.getItem(`${tabPrefix}_temp_hp`)) || 0;
    let hdQty      = 1;

    // ── Helpers ──────────────────────────────────────────────────────
    const getConMod  = () => parseInt(localStorage.getItem(`${tabPrefix}_con_bonus`)) || 0;

    const getHdSides = () => {
        const raw = hdTypeEl?.textContent || localStorage.getItem(`${tabPrefix}_hit_die`) || 'd8';
        const m = raw.match(/d(\d+)/i);
        return m ? parseInt(m[1]) : 8;
    };

    const getHdCurrent = () => parseInt(hdCurrentEl?.textContent) || 0;

const getBarColors = (pct) => {
        if (pct > 50) return {
            base: '#3b8a1e', bright: '#5ec430',
            highlight: 'rgba(180,255,130,0.3)',
            shadow: 'rgba(76,175,80,0.5)',
            tint: 'rgba(76,175,80,0.08)',
            edge: 'rgba(180,255,130,0.55)',
            edgeDim: 'rgba(180,255,130,0.3)'
        };
        if (pct > 25) return {
            base: '#b8760e', bright: '#e8a020',
            highlight: 'rgba(255,220,140,0.3)',
            shadow: 'rgba(244,162,97,0.5)',
            tint: 'rgba(244,162,97,0.08)',
            edge: 'rgba(255,220,140,0.55)',
            edgeDim: 'rgba(255,220,140,0.3)'
        };
        return {
            base: '#8b1a1a', bright: '#d43030',
            highlight: 'rgba(255,160,140,0.3)',
            shadow: 'rgba(255,80,80,0.5)',
            tint: 'rgba(255,80,80,0.08)',
            edge: 'rgba(255,160,140,0.55)',
            edgeDim: 'rgba(255,160,140,0.3)'
        };
    };

    // ── Bar rendering ────────────────────────────────────────────────
const renderBar = () => {
        const pct    = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0;
        const c      = getBarColors(pct);
        const pool   = Math.max(maxHp, currentHp + tempHp);
        const greenW = pool > 0 ? (currentHp / pool) * 100 : 0;
        const tempW  = tempHp > 0 && pool > 0 ? (tempHp / pool) * 100 : 0;
        const atEnd  = Math.round(greenW + tempW) >= 100;
        const isFull = tempHp === 0 && currentHp >= maxHp;

        barArea.classList.toggle('hp-full', isFull);
        barArea.classList.toggle('hp-temp-end', atEnd && tempHp > 0);

        // Tint
        barTint.style.background = c.tint;

        // Main fill
        barFill.style.width      = greenW + '%';
        barFill.style.background = `linear-gradient(90deg, ${c.bright} 0%, ${c.base} 60%)`;

        // Top highlight
        barHl.style.width      = greenW + '%';
        barHl.style.background = `linear-gradient(180deg, ${c.highlight} 0%, transparent 50%, rgba(0,0,0,0.15) 100%)`;

        // Outer glow
        barGlow.style.width     = greenW + '%';
        barGlow.style.boxShadow = greenW > 0
            ? `0 0 12px 2px ${c.shadow}, inset 0 1px 0 ${c.highlight}`
            : 'none';

        // Temp HP
        if (tempHp > 0) {
            barTemp.style.opacity    = '0.35';
            barTemp.style.left       = greenW + '%';
            barTemp.style.width      = tempW + '%';
            barTemp.style.background = `linear-gradient(90deg, ${c.bright} 0%, ${c.base} 70%)`;
            barTemp.style.boxShadow  = `inset 2px 0 4px ${c.edge}, inset -2px 0 4px ${c.edgeDim}`;

            barTempHl.style.opacity    = '0.35';
            barTempHl.style.left       = greenW + '%';
            barTempHl.style.width      = tempW + '%';
            barTempHl.style.background = `linear-gradient(180deg, ${c.highlight} 0%, transparent 50%, rgba(0,0,0,0.15) 100%)`;

            barText.innerHTML = `${currentHp}&nbsp;<span class="hp-bar-temp-text">+ ${tempHp}</span>`;
        } else {
            barTemp.style.opacity   = '0';
            barTemp.style.width     = '0%';
            barTemp.style.left      = greenW + '%';
            barTemp.style.boxShadow = 'none';
            barTempHl.style.opacity = '0';
            barTempHl.style.width   = '0%';
            barTempHl.style.left    = greenW + '%';

            barText.textContent = `${currentHp}`;
        }
    };
    
    

    const saveHp = () => {
        localStorage.setItem(`${tabPrefix}_hp`, currentHp);
        localStorage.setItem(`${tabPrefix}_temp_hp`, tempHp);
    };

    // ── Death saves ──────────────────────────────────────────────────
    const dsPanel          = hpSection.querySelector('.ds-panel');
    const dsSuccessCircles = hpSection.querySelectorAll('.ds-success');
    const dsFailCircles    = hpSection.querySelectorAll('.ds-fail');
    const dsRollBtn        = hpSection.querySelector('.ds-roll-btn');

    let dsSuccesses = parseInt(localStorage.getItem(`${tabPrefix}_ds_successes`)) || 0;
    let dsFailures  = parseInt(localStorage.getItem(`${tabPrefix}_ds_failures`))  || 0;

    const saveDs = () => {
        localStorage.setItem(`${tabPrefix}_ds_successes`, dsSuccesses);
        localStorage.setItem(`${tabPrefix}_ds_failures`, dsFailures);
    };

    const renderDs = () => {
        const active = currentHp === 0;
        dsPanel.classList.toggle('ds-active', active);

        dsSuccessCircles.forEach((c, i) => c.classList.toggle('filled', i < dsSuccesses));
        dsFailCircles.forEach((c, i) => c.classList.toggle('filled', i < dsFailures));

        if (dsFailures >= 3) {
            barText.innerHTML  = '<span class="hp-bar-dead">Dead</span>';
            dsRollBtn.disabled = true;
        } else if (dsSuccesses >= 3) {
            barText.innerHTML  = '<span class="hp-bar-stabilized">Stabilized</span>';
            dsRollBtn.disabled = true;
        } else {
            if (active) renderBar();
            dsRollBtn.disabled = !active;
        }
    };

    const resetDs = () => {
        dsSuccesses = 0;
        dsFailures  = 0;
        saveDs();
    };

    const addDsSuccess = (count = 1) => {
        dsSuccesses = Math.min(3, dsSuccesses + count);
        saveDs();
        renderDs();
    };

    const addDsFailure = (count = 1) => {
        dsFailures = Math.min(3, dsFailures + count);
        saveDs();
        renderDs();
    };

    // Manual circle toggling
    dsSuccessCircles.forEach((circle, i) => {
        circle.addEventListener('click', () => {
            if (dsFailures >= 3) return;
            dsSuccesses = circle.classList.contains('filled') ? i : i + 1;
            saveDs();
            renderDs();
        });
    });

    dsFailCircles.forEach((circle, i) => {
        circle.addEventListener('click', () => {
            if (dsSuccesses >= 3) return;
            dsFailures = circle.classList.contains('filled') ? i : i + 1;
            saveDs();
            renderDs();
        });
    });

    // Roll button — uses the app's dice roller
    dsRollBtn?.addEventListener('click', async () => {
        if (dsFailures >= 3 || dsSuccesses >= 3) return;

        try {
            const { rollDice } = await import('./diceRoller.js');
            const result = await rollDice([{ qty: 1, sides: 20 }], 0, 'Death Save');
            if (!result) return;

            const roll = result.rolls[0];

            if (roll === 20) {
                // Nat 20: regain 1 HP and exit death saves
                resetDs();
                currentHp = 1;
                saveHp();
                renderBar();
                flashBar();
                renderDs();
            } else if (roll === 1) {
                // Nat 1: two failures
                addDsFailure(2);
            } else if (roll >= 10) {
                addDsSuccess();
            } else {
                addDsFailure();
            }
        } catch (err) {
            console.error('Death save roll failed:', err);
        }
    });

    // ── Damage / Heal / Temp ─────────────────────────────────────────
    const applyAction = (mode) => {
        const v = parseInt(inputEl.value) || 0;
        if (v <= 0) return;

        if (mode === 'dmg') {
            let dmg = v;

            // Temp HP absorbs first
            if (tempHp > 0) {
                const absorbed = Math.min(tempHp, dmg);
                tempHp -= absorbed;
                dmg    -= absorbed;
            }

            const wasAboveZero = currentHp > 0;
            const overflow     = Math.max(0, dmg - currentHp);
            currentHp          = Math.max(0, currentHp - dmg);

            if (currentHp === 0) {
                if (wasAboveZero) {
                    if (overflow >= maxHp) {
                        // Massive damage → instant death
                        resetDs();
                        dsFailures = 3;
                        saveDs();
                    } else {
                        // Entered death saves — reset trackers
                        resetDs();
                    }
                } else {
                    // Already at 0 and took damage → auto-fail
                    addDsFailure();
                }
            }

        } else if (mode === 'heal') {
            const wasAtZero = currentHp === 0;
            currentHp = Math.min(maxHp, currentHp + v);
            if (wasAtZero && currentHp > 0) {
                resetDs();
            }

        } else if (mode === 'temp') {
            if (v > tempHp) tempHp = v;
        }

        inputEl.value = '';
        saveHp();
        renderBar();
        renderDs();
        flashBar();
    };

    // ── Hit dice rendering ───────────────────────────────────────────
    const renderHd = () => {
        const hdCur    = getHdCurrent();
        const conMod   = getConMod();
        const sides    = getHdSides();
        const totalCon = conMod * hdQty;
        const sign     = totalCon >= 0 ? '+ ' + totalCon : '− ' + Math.abs(totalCon);

        if (hdRollDetail) hdRollDetail.textContent = `${hdQty}d${sides} ${sign}`;
        hdRollBtn?.classList.toggle('hd-disabled', hdCur <= 0);

        if (hdQty > hdCur && hdCur > 0) {
            hdQty = hdCur;
            hdQtyDisplay.textContent = hdQty;
        }
    };

    // ── Event wiring ─────────────────────────────────────────────────

    // Action buttons — mousedown prevents blur so single-click works
    actionBtns.forEach(btn => {
        btn.addEventListener('pointerdown', e => e.preventDefault());
        btn.addEventListener('click', () => applyAction(btn.dataset.action));
    });

    // Max HP edit → re-render bar (save handled by generic input handler)
    maxEl?.addEventListener('input', () => {
        const newMax = Math.max(0, parseInt(maxEl.textContent) || 0);
        maxHp = newMax;
        if (currentHp > maxHp) currentHp = maxHp;
        saveHp();
        renderBar();
    });

    // Hit die quantity buttons
    hdMinusBtn?.addEventListener('click', () => {
        if (hdQty > 1) { hdQty--; hdQtyDisplay.textContent = hdQty; renderHd(); }
    });

    hdPlusBtn?.addEventListener('click', () => {
        if (hdQty < getHdCurrent()) { hdQty++; hdQtyDisplay.textContent = hdQty; renderHd(); }
    });

    // Hit die roll
    hdRollBtn?.addEventListener('click', async () => {
        let hdCur = getHdCurrent();
        if (hdCur <= 0) return;

        const count    = Math.min(hdQty, hdCur);
        const sides    = getHdSides();
        const conMod   = getConMod();
        const totalCon = conMod * count;

        try {
            const { rollDice } = await import('./diceRoller.js');
            const result = await rollDice([{ qty: count, sides }], totalCon, 'Hit Dice');
            if (!result) return;

            const total = Math.max(count, result.total + totalCon);

            hdCur -= count;
            if (hdCurrentEl) {
                hdCurrentEl.textContent = hdCur;
                localStorage.setItem(`${tabPrefix}_hit_die_current`, String(hdCur));
            }

            const wasAtZero = currentHp === 0;
            currentHp = Math.min(maxHp, currentHp + total);
            if (wasAtZero && currentHp > 0) resetDs();
            saveHp();
            renderDs();

            hdQty = 1;
            hdQtyDisplay.textContent = hdQty;
            renderBar();
            flashBar();
            renderHd();

            const originalText = hdRollBtn.innerHTML;
            hdRollBtn.innerHTML = `<span class="hd-roll-fadeout">${originalText}</span>`;
            setTimeout(() => {
                hdRollBtn.innerHTML = `<span class="hd-roll-result">+${total} HP</span>`;
                setTimeout(() => {
                    hdRollBtn.innerHTML = `<span class="hd-roll-fadein">${originalText}</span>`;
                    setTimeout(() => { hdRollBtn.innerHTML = originalText; }, 300);
                }, 3000);
            }, 300);
        } catch (err) {
            console.error('Hit die roll failed:', err);
        }
    });

    // Manual edits to hit die fields → re-render
    hdCurrentEl?.addEventListener('input', () => renderHd());
    hdTypeEl?.addEventListener('input', () => renderHd());

    // ── Long rest listener ───────────────────────────────────────────
    document.addEventListener('longRest', () => {
        // Refill HP to max
        currentHp = maxHp;

        // Remove temp HP
        tempHp = 0;

        // Recover half total hit dice (minimum 1) — 5e rules
        const hdMax     = parseInt(hdMaxEl?.textContent) || 0;
        const hdCur     = getHdCurrent();
        const recovered = Math.max(1, Math.floor(hdMax / 2));
        const newHdCur  = Math.min(hdMax, hdCur + recovered);
        if (hdCurrentEl) {
            hdCurrentEl.textContent = newHdCur;
            localStorage.setItem(`${tabPrefix}_hit_die_current`, String(newHdCur));
        }

        // Reset death saves
        resetDs();

        saveHp();
        renderBar();
        renderHd();
        renderDs();
        flashBar();
    });

    // ── Initial render ───────────────────────────────────────────────
    renderBar();
    renderHd();
    renderDs();
}

// Initialise after all editable fields have loaded from localStorage
window.addEventListener("load", () => {
    setTimeout(() => {
        initHpSection('tab4');
        initHpSection('tab8');
        console.log('✅ HP bar sections initialised.');
    }, 0);
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

        document.dispatchEvent(new CustomEvent('longRest'));

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
        document.getElementById('header-row').appendChild(popup);

        const moonRect = longRestBtn.getBoundingClientRect();
        popup.style.top    = `${moonRect.top - 5}px`;
        popup.style.height = `${moonRect.height + 10}px`;
        popup.style.left  = `${moonRect.left - 6}px`;

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

            const charName = localStorage.getItem('tab4_character_name') || 'InfoBlocks';
            let filename = prompt('Enter a name for your file:', charName);
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

    console.log('✅ Upload/Download handlers initialized.');
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