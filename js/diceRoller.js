// diceRoller.js

let diceRollerInitialized = false;
let diceBox      = null;
let diceBoxReady = false;
let fadeTimer    = null;
let isRolling    = false;

const diceImages = {
  4:  "images/d_4.svg",
  6:  "images/d_6.svg",
  8:  "images/d_8.svg",
  10: "images/d_10.svg",
  12: "images/d_12.svg",
  20: "images/d_20.svg"
};

const diceColors = {
  4:  '#f4a261',
  6:  '#06ade4',
  8:  '#f0c040',
  10: '#4CAF50',
  12: '#bf5eff',
  20: '#ff6b6b',
};

let selectedDice = [];

let _rollDiceFn = null;

export async function rollDice(groups, modifier = 0, label = null) {
    if (!_rollDiceFn) throw new Error('Dice roller not initialized yet');
    return _rollDiceFn(groups, modifier, label);
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG PRELOAD
   Fetch raw SVG markup at module load time. Inline SVG is used in the
   selected-dice-wrapper so icon and label paint in the same frame with no
   image pipeline delay. svgsReady is a Promise — awaited before first use.
───────────────────────────────────────────────────────────────────────────── */

const svgCache = {};
const svgsReady = Promise.all(
  Object.entries(diceImages).map(async ([sides, src]) => {
    try {
      const res  = await fetch(src);
      let markup = await res.text();
      // Namespace all CSS class names with the die type so inline <style>
      // blocks from multiple SVGs don't collide in the global document scope.
      // e.g. .cls-1 → .d4-cls-1 in both the <style> block and class attributes
      const prefix = `d${sides}-`;
      markup = markup.replace(
        /\.([a-zA-Z][\w-]*)\s*\{/g,
        (_, cls) => `.${prefix}${cls}{`
      );
      markup = markup.replace(
        /class="([^"]+)"/g,
        (_, classes) => `class="${classes.split(/\s+/).map(c => `${prefix}${c}`).join(' ')}"`
      );
      svgCache[sides] = markup;
    } catch {
      svgCache[sides] = `<img src="${src}" alt="D${sides}">`;
    }
  })
);

function getSvg(sides) {
  return svgCache[sides] ?? `<img src="${diceImages[sides]}" alt="D${sides}">`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function getCanvasDimensions() {
  const s  = window.getComputedStyle(document.body);
  const pT = parseFloat(s.paddingTop);
  const pR = parseFloat(s.paddingRight);
  const pB = parseFloat(s.paddingBottom);
  const pL = parseFloat(s.paddingLeft);
  const BLEED = { top: 50, right: 20, bottom: 50, left: 20 };
  return {
    W:       window.innerWidth  - pL - pR + BLEED.left + BLEED.right,
    H:       window.innerHeight - pT - pB + BLEED.top  + BLEED.bottom,
    offsetX: pL - BLEED.left,
    offsetY: pT - BLEED.top,
  };
}

function getDiceCanvas() {
  return document.querySelector('.dice-box-canvas') ?? null;
}

function clearDiceBox() {
  if (!diceBox) return;
  try {
    if (typeof diceBox.clearDice === 'function') diceBox.clearDice();
    else if (typeof diceBox.clear === 'function') diceBox.clear();
  } catch (err) {
    console.warn('clearDiceBox error:', err);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   TEARDOWN
───────────────────────────────────────────────────────────────────────────── */

function tearDown() {
  diceBox      = null;
  diceBoxReady = false;
  isRolling    = false;
  document.querySelectorAll('.dice-box-canvas, #dice-canvas').forEach(el => el.remove());
  document.getElementById('dice-canvas-presize')?.remove();
}

/* ─────────────────────────────────────────────────────────────────────────────
   DICE-BOX INIT
───────────────────────────────────────────────────────────────────────────── */

async function loadDiceBox() {
  if (diceBox && diceBoxReady) return diceBox;

  if (diceBox && !diceBoxReady) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (diceBoxReady) { clearInterval(check); resolve(); }
      }, 50);
    });
    return diceBox;
  }

  diceBoxReady = false;

  const { default: DiceBox } = await import(
    'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.3/dist/dice-box.es.js'
  );

  tearDown();

  const { W, H, offsetX, offsetY } = getCanvasDimensions();

  const preStyle = document.createElement('style');
  preStyle.id = 'dice-canvas-presize';
  preStyle.textContent = `
    .dice-box-canvas {
      width:          ${W}px !important;
      height:         ${H}px !important;
      position:       fixed !important;
      top:            ${offsetY}px !important;
      left:           ${offsetX}px !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(preStyle);

  const box = new DiceBox({
    id:             'dice-canvas',
    selector:       'body',
    assetPath: new URL('./assets/', window.location.href).pathname,
    theme:          'default',
    offscreen:      false,
    width:          W,
    height:         H,
    scale:          3,
    gravity:        1,
    mass:           1,
    friction:       0.6,
    restitution:    0.3,
    angularDamping: 0.4,
    linearDamping:  0.4,
    spinForce:      4,
    throwForce:     3,
    startingHeight: 8,
    settleTimeout:  5000,
    delay:          0,
    lightIntensity: 1,
    enableShadows:  true,
    shadowTransparency: 0.8,
  });

  await box.init();

  preStyle.remove();

  const canvas = getDiceCanvas();
  if (canvas) {
    Object.assign(canvas.style, {
      position:      'fixed',
      top:           `${offsetY}px`,
      left:          `${offsetX}px`,
      width:         `${W}px`,
      height:        `${H}px`,
      zIndex:        '99999',
      pointerEvents: 'none',
      opacity:       '1',
      transition:    'opacity 1.5s ease',
    });
  }

  diceBox      = box;
  diceBoxReady = true;

  return diceBox;
}

loadDiceBox().catch(err => console.warn('Dice-box eager init failed:', err));

/* ─────────────────────────────────────────────────────────────────────────────
   RESIZE
───────────────────────────────────────────────────────────────────────────── */

let resizeTimer = null;
window.addEventListener('resize', () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(async () => {
    const wasActive = diceBox !== null;
    tearDown();
    if (wasActive) {
      try {
        await loadDiceBox();
      } catch (err) {
        console.warn('Dice canvas reinit failed:', err);
      }
    }
  }, 150);
});

/* ─────────────────────────────────────────────────────────────────────────────
   FADE OUT
───────────────────────────────────────────────────────────────────────────── */

function fadeOutDice() {
  const canvas = getDiceCanvas();
  if (!canvas) return;
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    canvas.style.opacity = '0';
    setTimeout(() => {
      clearDiceBox();
      canvas.style.opacity = '1';
    }, 1500);
  }, 3000);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN INIT
───────────────────────────────────────────────────────────────────────────── */

export function initDiceRoller() {
  if (diceRollerInitialized) return;
  diceRollerInitialized = true;

  const container  = document.querySelector("#dice-panel .dice-roller-container");
  if (!container) { console.warn("Dice panel container not found."); return; }

  const diceButtons = container.querySelectorAll(".dice-button");
  const rollButton  = container.querySelector("#roll-button");
  const clearButton = container.querySelector("#clear-selected-button");
  const rollResult  = document.querySelector("#dice-panel .roll-results");

  // Count-based selection — keyed by die sides
  const diceSelections = {};

  function totalSelected() {
    return Object.values(diceSelections).reduce((a, b) => a + b, 0);
  }

  function updateBadge(btn, sides) {
    const count = diceSelections[sides] || 0;
    let badge = btn.querySelector('.dice-count-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'dice-count-badge text-label';
        badge.title = 'Click to remove one';
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          diceSelections[sides] = Math.max(0, (diceSelections[sides] || 0) - 1);
          updateBadge(btn, sides);
        });
        btn.appendChild(badge);
      }
      badge.textContent = count;
      btn.classList.add('has-selection');
    } else {
      badge?.remove();
      btn.classList.remove('has-selection');
    }
  }

  diceButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (e.target.classList.contains('dice-count-badge')) return;
      const sides = parseInt(btn.dataset.dice, 10);
      diceSelections[sides] = (diceSelections[sides] || 0) + 1;
      updateBadge(btn, sides);
    });

    // Right-click = remove one
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const sides = parseInt(btn.dataset.dice, 10);
      if ((diceSelections[sides] || 0) === 0) return;
      diceSelections[sides]--;
      updateBadge(btn, sides);
    });
  });

  if (rollButton) {
    rollButton.addEventListener("click", async () => {
      if (isRolling) return;

      if (totalSelected() === 0) {
        appendResult("No dice selected");
        return;
      }

      isRolling           = true;
      rollButton.disabled = true;

      const notation = Object.entries(diceSelections)
        .filter(([, n]) => n > 0)
        .map(([sides, count]) => ({
          qty:        count,
          sides:      parseInt(sides),
          themeColor: diceColors[sides] ?? '#ffffff',
        }));

      try {
        const box = await loadDiceBox();

        const canvas = getDiceCanvas();
        if (canvas) {
          if (fadeTimer) clearTimeout(fadeTimer);
          canvas.style.opacity = '1';
        }

        clearDiceBox();
        const results = await Promise.race([
          box.roll(notation),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Roll timed out')), 6000)
          )
        ]);

        const rolls = results.map(r => r.value);
        const sides = results.map(r => r.sides);
        const total = rolls.reduce((a, b) => a + b, 0);
        appendHistoryEntry(rolls, sides, total);

        fadeOutDice();

      } catch (err) {
        console.error('Dice-box error:', err);
        appendResult('Error rolling dice');
      } finally {
        isRolling           = false;
        rollButton.disabled = false;
      }
    });
  }

  _rollDiceFn = async (groups, modifier = 0, label = null) => {
    if (isRolling) return;
    isRolling = true;

    const notation = groups.map(({ qty, sides }) => ({
      qty,
      sides,
      themeColor: diceColors[sides] ?? '#ffffff',
    }));

    try {
      const box = await loadDiceBox();
      const canvas = getDiceCanvas();
      if (canvas) {
        if (fadeTimer) clearTimeout(fadeTimer);
        canvas.style.opacity = '1';
      }
      clearDiceBox();
      const results = await Promise.race([
        box.roll(notation),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Roll timed out')), 6000)
        )
      ]);
      const rolls = results.map(r => r.value);
      const sides = results.map(r => r.sides);
      const total = rolls.reduce((a, b) => a + b, 0);
      appendHistoryEntry(rolls, sides, total, modifier, label);
      fadeOutDice();
      return { rolls, total };
    } catch (err) {
      console.error('Dice-box error:', err);
      appendResult('Error rolling dice');
    } finally {
      isRolling = false;
    }
  };

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      Object.keys(diceSelections).forEach(k => { diceSelections[k] = 0; });
      diceButtons.forEach(btn => {
        btn.querySelector('.dice-count-badge')?.remove();
        btn.classList.remove('has-selection');
      });
      const canvas = getDiceCanvas();
      if (canvas) {
        if (fadeTimer) clearTimeout(fadeTimer);
        canvas.style.opacity = '0';
      }
    });
  }

  function appendResult(msg) {
    const entry = document.createElement("div");
    entry.classList.add("roll-history-entry");
    const chip = document.createElement("span");
    chip.classList.add("roll-error", "text-label");
    chip.innerHTML = `<svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:rgba(255,107,107,0.6)"><circle cx="8" cy="8" r="6.5"/><line x1="8" y1="5.5" x2="8" y2="9"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none"/></svg>${msg}`;
    entry.appendChild(chip);
    insertHistoryEntry(entry);
  }

  // Die polygon points within a 32×32 viewBox
  const dieShapes = {
    4:  { type: 'polygon', points: '16,5 30,29 2,29' },
    6:  { type: 'rect',    x: 3, y: 3, width: 26, height: 26, rx: 2 },
    8:  { type: 'polygon', points: '16,3 27,10 27,22 16,29 5,22 5,10' },
    10: { type: 'polygon', points: '16,2 30,16 16,30 2,16' },
    12: { type: 'polygon', points: '3,16 5,8 12,4 20,4 27,8 29,16 27,24 20,28 12,28 5,24' },
    20: { type: 'polygon', points: '16,3 27,10 27,22 16,29 5,22 5,10' },
  };

  function makeDieChip(roll, sides) {
    const ns  = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('roll-die-chip');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.style.setProperty('--chip-color', diceColors[sides] ?? '#888');

    const def = dieShapes[sides] ?? dieShapes[20];
    let shape;
    if (def.type === 'rect') {
      shape = document.createElementNS(ns, 'rect');
      shape.setAttribute('x',      def.x);
      shape.setAttribute('y',      def.y);
      shape.setAttribute('width',  def.width);
      shape.setAttribute('height', def.height);
      shape.setAttribute('rx',     def.rx);
    } else {
      shape = document.createElementNS(ns, 'polygon');
      shape.setAttribute('points', def.points);
    }
    shape.classList.add('die-shape');
    svg.appendChild(shape);

    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', '16');
    text.setAttribute('y', sides === 4 ? '66%' : '50%');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.classList.add('die-number', 'text-body');
    text.textContent = roll;
    svg.appendChild(text);

    return svg;
  }

  function appendHistoryEntry(rolls, sides, total, modifier = 0, label = null) {
    const entry = document.createElement("div");
    entry.classList.add("roll-history-entry");

    const finalTotal = total + modifier;
    const displayLabel = label
      ? label
          .replace(/\bSkill check\b/gi, 'check')
          .replace(/\s*[\(\[](STR|DEX|CON|INT|WIS|CHA|PROF|PB|INIT)[\)\]]/gi, '')
          .trim()
      : null;
    // Show modifier chip for any non-zero modifier, or always when the roll is
    // a named roll (label present) — +0 is meaningful info for a stat check.
    const showModifierChip = modifier !== 0 || displayLabel !== null;
    const showBreakdown = rolls.length > 1 || showModifierChip;

    // ── Label row (full width, only when present) ─────────────────────────────
    if (displayLabel) {
      const labelEl = document.createElement("div");
      labelEl.classList.add("roll-label", "text-label");
      labelEl.textContent = displayLabel;
      entry.appendChild(labelEl);
    }

    // ── Content row: number + optional divider + chips ────────────────────────
    const contentRow = document.createElement("div");
    contentRow.classList.add("roll-content");

    const valueEl = document.createElement("div");
    valueEl.classList.add("roll-value", "text-xl");
    valueEl.textContent = finalTotal;
    contentRow.appendChild(valueEl);

    if (showBreakdown) {
      const divider = document.createElement("div");
      divider.classList.add("roll-divider");
      contentRow.appendChild(divider);

      const breakdown = document.createElement("div");
      breakdown.classList.add("rolls-breakdown");

      rolls.forEach((roll, i) => {
        breakdown.appendChild(makeDieChip(roll, sides[i]));
      });

      if (showModifierChip) {
        const sign = modifier >= 0 ? '+' : '';
        const modChip = document.createElement("span");
        modChip.classList.add("roll-chip", "modifier", "text-body");
        modChip.textContent = `${sign}${modifier}`;
        breakdown.appendChild(modChip);
      }

      contentRow.appendChild(breakdown);
    }

    entry.appendChild(contentRow);
    insertHistoryEntry(entry);
  }
  
  function insertHistoryEntry(entry) {
    // Mark as latest roll (remove from previous)
    rollResult.querySelector('.latest-roll')?.classList.remove('latest-roll');
    entry.classList.add('latest-roll');

    // Append at full height to measure, then trim
    rollResult.append(entry);
    const allEntries = rollResult.querySelectorAll('.roll-history-entry');
    if (allEntries.length > 20) {
      for (let i = 0; i < allEntries.length - 20; i++) allEntries[i].remove();
    }

    // Only run the grow animation when the panel is visible.
    // Applying CSS animations to elements inside display:none can cause
    // the panel to briefly flash in some browsers.
    const panelVisible = document.getElementById('dice-panel')?.classList.contains('open');

    if (panelVisible) {
      // Collapse entry to zero so the grow animation starts from nothing
      entry.style.maxHeight     = '0';
      entry.style.paddingBottom = '0';
      entry.style.overflow      = 'hidden';
      entry.style.opacity       = '0';

      requestAnimationFrame(() => {
        entry.style.maxHeight     = '';
        entry.style.paddingBottom = '';
        entry.style.overflow      = '';
        entry.style.opacity       = '';
        entry.classList.add('new-entry');
        entry.addEventListener('animationend', () => {
          entry.classList.remove('new-entry');
          rollResult.scrollTo({ top: rollResult.scrollHeight, behavior: 'smooth' });
        }, { once: true });
      });
    } else {
      // Panel is hidden — just scroll silently to the new entry
      rollResult.scrollTop = rollResult.scrollHeight;
    }

    // Notify the app that a roll completed
    document.dispatchEvent(new CustomEvent('diceRolled'));
  }
}

/* ── Keyboard shortcuts ─────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  const panel = document.getElementById('dice-panel');
  const historyPanel = document.getElementById('dice-history-popover');
  const rollerOpen = panel?.classList.contains('open');
  const historyOpen = historyPanel?.classList.contains('open');
  if (!rollerOpen && !historyOpen) return;
  if (e.key === 'Escape') {
    const overlayOpen = document.querySelector(
      '.cleardata-overlay.show, .remove-block-overlay.show, ' +
      '.spell-slot-edit-overlay.show, #menu_overlay.active'
    );
    if (overlayOpen) return;
    e.preventDefault();
    if (rollerOpen) {
        panel.classList.remove('open');
        document.getElementById('dice-menu-button')?.classList.remove('active');
    }
    if (historyOpen) {
        historyPanel.classList.remove('open');
        document.getElementById('dice-history-button')?.classList.remove('active');
    }
    document.activeElement.blur();
  } else if (e.key === 'Enter' && rollerOpen) {
    // Don't roll if any overlay is open
    const overlayOpen = document.querySelector(
      '.cleardata-overlay.show, .remove-block-overlay.show, ' +
      '.spell-slot-edit-overlay.show, #menu_overlay.active'
    );
    if (overlayOpen) return;
    // Don't roll if focus is inside an input, textarea, or contenteditable
    const active = document.activeElement;
    if (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.isContentEditable
    ) return;
    e.preventDefault();
    if (!isRolling) document.getElementById('roll-button')?.click();
    document.activeElement.blur();
  }
});

// ── Inline dice roll pattern & applier ───────────────────────────────────────

// SPELL = the sheet's spell attack bonus. It needs a word boundary (\b) so
// text like "1d8 + spellcasting modifier" isn't read as "1d8 + SPELL".
const STAT_WORDS = 'STR|DEX|CON|INT|WIS|CHA|PROF|PB|INIT|SPELL\\b';

// A stat word reads the block's own character sheet (Hazard → tab4,
// Crank → tab8). Putting a name in front reads that character instead,
// e.g. "2d10 +HAZARD INT" on a Crank block uses Hazard's INT.
const CHARACTER_TABS = { HAZARD: 'tab4', CRANK: 'tab8' };
const STAT_NAMES = `(?:(?:HAZARD|CRANK)\\s+)?(?:${STAT_WORDS})`;

const DICE_PATTERN = new RegExp(
    `(\\d+)d(\\d+)((?:\\s*[+\\-]\\s*(?:\\d+|${STAT_NAMES}))*)`,
    'gi'
);

// "+X to hit" — X can be one term or several added together,
// e.g. "+10 to hit", "+SPELL to hit", "+PROF +INT +2 to hit".
const HIT_PATTERN = new RegExp(
    `([+\\-]\\s*(?:\\d+|${STAT_NAMES})(?:\\s*[+\\-]\\s*(?:\\d+|${STAT_NAMES}))*)\\s+to\\s+hit`,
    'gi'
);

// "DC SPELL" — shows the sheet's spell save DC (display only, not a roll).
// "DC HAZARD SPELL" / "DC CRANK SPELL" pick a character explicitly.
const DC_PATTERN = /\bDC\s+(?:(HAZARD|CRANK)\s+)?SPELL\b/gi;
// ─────────────────────────────────────────────────────────────────────────────

/** Parse a stored sheet value: "+4" → 4, and typed sums like "4+5+1" → 10. */
function safeInt(val) {
    if (val === null || val === undefined) return 0;
    const terms = String(val).replace(/\s/g, '').match(/[+\-]?\d+(?:\.\d+)?/g);
    if (!terms) return 0;
    return Math.round(terms.reduce((sum, t) => sum + parseFloat(t), 0)) || 0;
}

function resolveStatValue(statName, tabPrefix) {
    // "HAZARD INT" / "CRANK PROF" → read that character's sheet instead
    const named = /^(HAZARD|CRANK)\s+(\w+)$/i.exec(statName.trim());
    if (named) {
        tabPrefix = CHARACTER_TABS[named[1].toUpperCase()];
        statName  = named[2];
    }
    const statMap = {
        STR:  `${tabPrefix}_str_bonus`,
        DEX:  `${tabPrefix}_dex_bonus`,
        CON:  `${tabPrefix}_con_bonus`,
        INT:  `${tabPrefix}_int_bonus`,
        WIS:  `${tabPrefix}_wis_bonus`,
        CHA:  `${tabPrefix}_cha_bonus`,
        PROF: `${tabPrefix}_prof`,
        PB:   `${tabPrefix}_prof`,
        INIT: `${tabPrefix}_initiative`,
        SPELL: `${tabPrefix}_spell_attack`,
    };
    const key = statMap[statName.toUpperCase()];
    return key ? safeInt(localStorage.getItem(key)) : 0;
}

function parseModifierString(modStr, tabPrefix) {
    if (!modStr) return { total: 0, display: '' };
    const termRe = new RegExp(`([+\\-])\\s*(\\d+|${STAT_NAMES})`, 'gi');
    let total = 0, m;
    while ((m = termRe.exec(modStr)) !== null) {
        const sign = m[1] === '+' ? 1 : -1;
        total += /^\d+$/.test(m[2])
            ? sign * parseInt(m[2], 10)
            : sign * resolveStatValue(m[2], tabPrefix);
    }
    const display = total === 0 ? '' : (total > 0 ? '+' : '') + total;
    return { total, display };
}

/** Look up blockType array for a block by id from localStorage. */
function getBlockTypes(blockId, tab) {
    if (!blockId || !tab) return [];
    const blocks = JSON.parse(localStorage.getItem(`userBlocks_${tab}`) || '[]');
    const block  = blocks.find(b => b.id === blockId);
    if (!block) return [];
    return Array.isArray(block.blockType)
        ? block.blockType
        : (block.blockType ? [block.blockType] : []);
}

// Buttons keep the text they were made from (data-mod-expr / data-hit-*) so
// refreshInlineRollButton can re-read the sheet whenever stats change.
function makeInlineButton(qty, sides, modStr, tabPrefix, colorClass, originalText) {
    const btn = document.createElement('button');
    btn.className        = `inline-dice-roll ${colorClass}`;
    btn.dataset.qty      = qty;
    btn.dataset.sides    = sides;
    btn.dataset.modExpr  = modStr || '';
    btn.dataset.tab      = tabPrefix;
    btn.title            = originalText;
    refreshInlineRollButton(btn);
    return btn;
}

// hitExpr is the "+PROF +INT +2" part; originalText is the whole "+PROF +INT +2 to hit".
// A single plain number ("+10 to hit") is shown exactly as written.
function computeHit(hitExpr, tabPrefix, originalText) {
    const { total } = parseModifierString(hitExpr, tabPrefix);
    if (/^[+\-]\s*\d+$/.test(hitExpr.trim())) {
        return { modifier: total, text: originalText };
    }
    const signedStr = total < 0 ? String(total) : `+${total}`;
    return { modifier: total, text: signedStr + originalText.slice(hitExpr.length) };
}

function makeHitButton(hitExpr, tabPrefix, originalText) {
    const btn = document.createElement('button');
    btn.className          = 'inline-dice-roll hit';
    btn.dataset.hitExpr    = hitExpr;
    btn.dataset.hitText    = originalText;
    btn.dataset.tab        = tabPrefix;
    btn.title              = originalText;
    refreshInlineRollButton(btn);
    return btn;
}

// "DC SPELL" → a non-clickable "DC 18" label that follows the sheet
function makeSpellDCLabel(tabPrefix, colorClass, originalText) {
    const span = document.createElement('span');
    span.className   = `inline-stat-value ${colorClass}`;
    span.dataset.tab = tabPrefix;
    span.dataset.original = originalText;   // restored when a session log is edited
    span.dataset.tooltip = `${tabPrefix === 'tab8' ? 'Crank' : 'Hazard'}'s spell save DC`;
    refreshInlineRollButton(span);
    return span;
}

/** Recalculate one button's modifier and label from the current sheet values. */
function refreshInlineRollButton(btn) {
    const tabPrefix = btn.dataset.tab;
    if (btn.classList.contains('inline-stat-value')) {
        btn.textContent = `DC ${safeInt(localStorage.getItem(`${tabPrefix}_spell_save`))}`;
        return;
    }
    if (btn.classList.contains('hit')) {
        if (btn.dataset.hitExpr === undefined) return;
        const { modifier, text } = computeHit(btn.dataset.hitExpr, tabPrefix, btn.dataset.hitText || '');
        btn.dataset.modifier = modifier;
        // Condensed header chips drop " to hit" — the blue colour already says it
        btn.textContent = btn.closest('.roll-summary-source')
            ? text.replace(/\s*to\s+hit\s*$/i, '')
            : text;
    } else {
        if (btn.dataset.modExpr === undefined) return;
        const { total, display } = parseModifierString(btn.dataset.modExpr, tabPrefix);
        btn.dataset.modifier = total;
        btn.textContent      = `${btn.dataset.qty}d${btn.dataset.sides}${display}`;
    }
}

/** Refresh every inline roll button under root (e.g. after a sheet stat changes). */
export function refreshInlineRollValues(root = document) {
    root.querySelectorAll('.inline-dice-roll, .inline-stat-value').forEach(refreshInlineRollButton);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Roll summary (condensed block header chips) ─────────────────────────────
// Reads a block's stored HTML and lists the rolls to show as chips in its
// condensed header. Order: "+X to hit" rolls first, then every other roll in
// the order it appears. Rolls on lines starting with "Upcast" are skipped.
// Each entry keeps the bold label at the start of its line (e.g. "One Handed")
// so it can be shown on hover now, or next to the chip later.
// Returns plain-text roll strings; applyInlineDiceRolls turns them into
// buttons exactly as it does for rolls in the block body.

const LINE_BREAK_TAGS = /^(LI|P|DIV|UL|OL|H[1-6]|TR|BLOCKQUOTE)$/;

function isBoldElement(el, root) {
    for (let e = el; e && e !== root; e = e.parentElement) {
        if (e.tagName === 'B' || e.tagName === 'STRONG') return true;
        const fw = e.style?.fontWeight;
        if (fw && (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600)) return true;
    }
    return false;
}

// Split parsed block HTML into visual lines (<br>, list items, paragraphs...),
// recording each line's full text and its leading bold text.
function splitIntoLines(root) {
    const lines = [];
    let cur = { text: '', label: '', labelDone: false };
    const flush = () => {
        if (cur.text.trim()) lines.push(cur);
        cur = { text: '', label: '', labelDone: false };
    };
    const walk = (node) => {
        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                const t = child.textContent;
                if (!cur.labelDone) {
                    if (isBoldElement(child.parentElement, root)) cur.label += t;
                    else if (t.trim()) cur.labelDone = true;
                }
                cur.text += t;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                if (child.tagName === 'BR') { flush(); return; }
                const breaksLine = LINE_BREAK_TAGS.test(child.tagName);
                if (breaksLine) flush();
                walk(child);
                if (breaksLine) flush();
            }
        });
    };
    walk(root);
    flush();
    return lines;
}

export function extractRollSummary(html) {
    if (!html) return [];
    // DOMParser builds an inert document — nothing in the block HTML loads or runs.
    const doc   = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const lines = splitIntoLines(doc.body);

    const hits   = [];
    const dcs    = [];
    const others = [];

    lines.forEach(line => {
        const text = line.text.replace(/\u00a0/g, ' ');
        if (/^\s*upcast\b/i.test(text)) return;

        const label = line.label.replace(/\u00a0/g, ' ').trim().replace(/:$/, '').trim();
        const found = [];
        let m;

        // Same patterns and precedence as the inline buttons: dice first,
        // then "to hit" matches that don't overlap a dice match.
        const dice = new RegExp(DICE_PATTERN.source, 'gi');
        while ((m = dice.exec(text)) !== null) {
            found.push({ start: m.index, end: m.index + m[0].length, text: m[0].trim(), kind: 'dice' });
        }
        const hit = new RegExp(HIT_PATTERN.source, 'gi');
        while ((m = hit.exec(text)) !== null) {
            const start = m.index;
            const end   = start + m[0].length;
            if (found.some(f => start < f.end && end > f.start)) continue;
            found.push({ start, end, text: m[0].trim(), kind: 'hit' });
        }
        const dc = new RegExp(DC_PATTERN.source, 'gi');
        while ((m = dc.exec(text)) !== null) {
            found.push({ start: m.index, end: m.index + m[0].length, text: m[0].trim(), kind: 'dc' });
        }

        found.sort((a, b) => a.start - b.start).forEach(f => {
            const list = f.kind === 'hit' ? hits : f.kind === 'dc' ? dcs : others;
            list.push({ text: f.text, label, kind: f.kind });
        });
    });

    // To-hit first, then save DCs, then everything else in reading order
    return [...hits, ...dcs, ...others];
}
// ─────────────────────────────────────────────────────────────────────────────

export function applyInlineDiceRolls(container, tab = null) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (node.parentElement?.closest('.inline-dice-roll, .inline-stat-value')) return NodeFilter.FILTER_REJECT;
                if (!node.parentElement?.closest('.block-body, .roll-summary-source')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    const blockTypeCache = {};

    // ── Pass 1: dice notation (e.g. 2d6+STR) ────────────────────────────────
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        DICE_PATTERN.lastIndex = 0;
        if (!DICE_PATTERN.test(text)) return;
        DICE_PATTERN.lastIndex = 0;

        const blockEl  = textNode.parentElement?.closest('.block[data-id]');
        const blockId  = blockEl?.dataset.id;
        if (blockId && !(blockId in blockTypeCache)) {
            blockTypeCache[blockId] = getBlockTypes(blockId, tab);
        }
        const blockTypes = blockId ? (blockTypeCache[blockId] || []) : [];
        const hasHazard  = blockTypes.includes('Hazard');
        const hasCrank   = blockTypes.includes('Crank');

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match;

        while ((match = DICE_PATTERN.exec(text)) !== null) {
            const [full, qty, sides, modStr] = match;
            const originalText = full.trim();

            if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }

            if (hasCrank && !hasHazard) {
                frag.appendChild(makeInlineButton(qty, sides, modStr, 'tab8', 'crank', originalText));
            } else if (hasHazard && hasCrank) {
                frag.appendChild(makeInlineButton(qty, sides, modStr, 'tab4', 'hazard', originalText));
                frag.appendChild(makeInlineButton(qty, sides, modStr, 'tab8', 'crank', originalText));
            } else {
                frag.appendChild(makeInlineButton(qty, sides, modStr, 'tab4', 'hazard', originalText));
            }

            lastIdx = match.index + full.length;
        }

        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        textNode.parentNode.replaceChild(frag, textNode);
    });

    // ── Pass 2: +X to hit pattern ────────────────────────────────────────────
    const walker2 = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (node.parentElement?.closest('.inline-dice-roll, .inline-stat-value')) return NodeFilter.FILTER_REJECT;
                if (!node.parentElement?.closest('.block-body, .roll-summary-source')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const hitNodes = [];
    while ((node = walker2.nextNode())) hitNodes.push(node);

    hitNodes.forEach(textNode => {
        const text = textNode.textContent;
        HIT_PATTERN.lastIndex = 0;
        if (!HIT_PATTERN.test(text)) return;
        HIT_PATTERN.lastIndex = 0;

        const blockEl = textNode.parentElement?.closest('.block[data-id]');
        const blockId = blockEl?.dataset.id;
        if (blockId && !(blockId in blockTypeCache)) {
            blockTypeCache[blockId] = getBlockTypes(blockId, tab);
        }
        const blockTypes = blockId ? (blockTypeCache[blockId] || []) : [];
        const hasHazard  = blockTypes.includes('Hazard');
        const hasCrank   = blockTypes.includes('Crank');

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match;

        while ((match = HIT_PATTERN.exec(text)) !== null) {
            const [full, hitExpr] = match;
            const originalText = full.trim();

            if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }

            if (hasCrank && !hasHazard) {
                frag.appendChild(makeHitButton(hitExpr, 'tab8', originalText));
            } else if (hasHazard && hasCrank) {
                frag.appendChild(makeHitButton(hitExpr, 'tab4', originalText));
                frag.appendChild(makeHitButton(hitExpr, 'tab8', originalText));
            } else {
                frag.appendChild(makeHitButton(hitExpr, 'tab4', originalText));
            }

            lastIdx = match.index + full.length;
        }

        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        textNode.parentNode.replaceChild(frag, textNode);
    });

    // ── Pass 3: "DC SPELL" → spell save DC label ─────────────────────────────
    const walker3 = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (node.parentElement?.closest('.inline-dice-roll, .inline-stat-value')) return NodeFilter.FILTER_REJECT;
                if (!node.parentElement?.closest('.block-body, .roll-summary-source')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const dcNodes = [];
    while ((node = walker3.nextNode())) dcNodes.push(node);

    dcNodes.forEach(textNode => {
        const text = textNode.textContent;
        DC_PATTERN.lastIndex = 0;
        if (!DC_PATTERN.test(text)) return;
        DC_PATTERN.lastIndex = 0;

        const blockEl = textNode.parentElement?.closest('.block[data-id]');
        const blockId = blockEl?.dataset.id;
        if (blockId && !(blockId in blockTypeCache)) {
            blockTypeCache[blockId] = getBlockTypes(blockId, tab);
        }
        const blockTypes = blockId ? (blockTypeCache[blockId] || []) : [];
        const hasHazard  = blockTypes.includes('Hazard');
        const hasCrank   = blockTypes.includes('Crank');

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match;

        while ((match = DC_PATTERN.exec(text)) !== null) {
            const [full, owner] = match;

            if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }

            if (owner) {
                // Named character ("DC HAZARD SPELL") — one label from that sheet
                const ownerTab = CHARACTER_TABS[owner.toUpperCase()];
                frag.appendChild(makeSpellDCLabel(ownerTab, ownerTab === 'tab8' ? 'crank' : 'hazard', full));
            } else if (hasCrank && !hasHazard) {
                frag.appendChild(makeSpellDCLabel('tab8', 'crank', full));
            } else if (hasHazard && hasCrank) {
                frag.appendChild(makeSpellDCLabel('tab4', 'hazard', full));
                frag.appendChild(makeSpellDCLabel('tab8', 'crank', full));
            } else {
                frag.appendChild(makeSpellDCLabel('tab4', 'hazard', full));
            }

            lastIdx = match.index + full.length;
        }

        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        textNode.parentNode.replaceChild(frag, textNode);
    });

    // ── Bring every button up to date ────────────────────────────────────────
    // Blocks that didn't change are reused between renders, so their buttons
    // may hold old sheet values — recalculate them all (cheap). This also drops
    // " to hit" from condensed header chips now that they're in the page.
    refreshInlineRollValues(container);

    // Condensed header chips show their line's bold label on hover (app
    // tooltip), or what was written when the line has no label. Body buttons
    // keep their title — the session log editor reads it to restore the text.
    container.querySelectorAll('.roll-summary-source .inline-dice-roll').forEach(btn => {
        const label = btn.closest('.roll-summary-source')?.dataset.rollLabel;
        // (this runs on every render, so keep a tooltip set on an earlier pass)
        btn.dataset.tooltip = label || btn.dataset.tooltip || btn.dataset.hitText || btn.title;
        btn.removeAttribute('title');
    });
    container.querySelectorAll('.roll-summary-source .inline-stat-value').forEach(span => {
        const label = span.closest('.roll-summary-source')?.dataset.rollLabel;
        if (label) span.dataset.tooltip = label;
    });
}

// ── Live refresh when the character sheet changes ────────────────────────────
// Sheet fields save on blur/input and the stat breakdown popover saves on
// click/input, so after any of those inside a sheet field or the popover,
// re-read the sheet for every inline roll on the page (batched).
let rollRefreshTimer = null;
const SHEET_FIELD_SELECTOR = '[data-storage-key^="tab4_"], [data-storage-key^="tab8_"], #stat-breakdown-popover';
['focusout', 'input', 'change', 'click'].forEach(type => {
    document.addEventListener(type, (e) => {
        if (!e.target?.closest?.(SHEET_FIELD_SELECTOR)) return;
        clearTimeout(rollRefreshTimer);
        rollRefreshTimer = setTimeout(() => refreshInlineRollValues(document), 100);
    });
});

// ── Click handler ────────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.inline-dice-roll');
    if (!btn) return;

    refreshInlineRollButton(btn);   // always roll with the sheet's current values
    const modifier = parseInt(btn.dataset.modifier, 10) || 0;
    const label    = btn.closest('.block')?.querySelector('h3')?.textContent?.trim() || null;
    const isHit    = btn.classList.contains('hit');
    const qty      = isHit ? 1   : parseInt(btn.dataset.qty,   10);
    const sides    = isHit ? 20  : parseInt(btn.dataset.sides, 10);

    const dicePanel = document.getElementById('dice-panel');

    try {
        await rollDice([{ qty, sides }], modifier, label);
    } catch (err) {
        console.error('Inline dice roll failed:', err);
    }
});

// ── Edit-mode highlighting ───────────────────────────────────────────────────
// While a block's text is being edited, colour anything that will become an
// inline roll / DC label, so you can see it's been recognised. Uses the CSS
// Custom Highlight API: it paints over text ranges without changing the DOM,
// so the caret, typing and the saved HTML are all unaffected. Styles are the
// ::highlight(...) rules in buttons.css. Browsers without the API just show
// plain text, as before.
//
// Matching mirrors applyInlineDiceRolls: per text node, dice first, then
// "to hit", then "DC SPELL", skipping anything overlapping an earlier match.

const EDITOR_SELECTOR = '.inline-edit-body, .notes-edit-body, #session_viewer_body[contenteditable="true"]';
const HIGHLIGHT_NAMES = ['roll-edit-hazard', 'roll-edit-crank', 'roll-edit-hit', 'roll-edit-dc-hazard', 'roll-edit-dc-crank'];
const highlightsSupported = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

// Which character the form currently says this block belongs to (block-type
// buttons in the tab9 edit form). Mirrors the colouring rules for real rolls.
function editorCharacter(editor) {
    const form = editor.closest('.block, .notes-viewer, .notes-edit-form') || editor.parentElement;
    const selected = [...(form?.querySelectorAll('.inline-edit-block-types .tag-button.selected') || [])]
        .map(b => b.dataset.tag);
    return selected.includes('Crank') && !selected.includes('Hazard') ? 'crank' : 'hazard';
}

function collectEditorRanges(editor, buckets) {
    const character = editorCharacter(editor);
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
        const text = textNode.textContent;
        if (!text.trim()) continue;
        const taken = [];
        const add = (pattern, bucket, ownerGroup) => {
            const re = new RegExp(pattern.source, 'gi');
            let m;
            while ((m = re.exec(text)) !== null) {
                const start = m.index;
                const end   = start + m[0].length;
                if (taken.some(t => start < t.end && end > t.start)) continue;
                taken.push({ start, end });
                let name = bucket;
                if (bucket === 'dc') {
                    const owner = ownerGroup ? (m[ownerGroup] || '').toUpperCase() : '';
                    const who   = owner ? (owner === 'CRANK' ? 'crank' : 'hazard') : character;
                    name = `roll-edit-dc-${who}`;
                }
                const range = new Range();
                range.setStart(textNode, start);
                range.setEnd(textNode, end);
                buckets[name].push(range);
            }
        };
        add(DICE_PATTERN, `roll-edit-${character}`);
        add(HIT_PATTERN,  'roll-edit-hit');
        add(DC_PATTERN,   'dc', 1);
    }
}

function refreshEditHighlights() {
    if (!highlightsSupported) return;
    const buckets = Object.fromEntries(HIGHLIGHT_NAMES.map(n => [n, []]));
    document.querySelectorAll(EDITOR_SELECTOR).forEach(editor => {
        if (editor.isContentEditable) collectEditorRanges(editor, buckets);
    });
    HIGHLIGHT_NAMES.forEach(name => {
        if (buckets[name].length) CSS.highlights.set(name, new Highlight(...buckets[name]));
        else CSS.highlights.delete(name);
    });
}

if (highlightsSupported) {
    let highlightQueued = false;
    const queueHighlight = () => {
        if (highlightQueued) return;
        highlightQueued = true;
        requestAnimationFrame(() => { highlightQueued = false; refreshEditHighlights(); });
    };
    // Typing in an editor
    document.addEventListener('input', (e) => {
        if (e.target?.closest?.(EDITOR_SELECTOR)) queueHighlight();
    });
    // Toggling Hazard / Crank in the edit form changes the colour
    document.addEventListener('click', (e) => {
        if (e.target?.closest?.('.inline-edit-block-types')) queueHighlight();
    });
    // Edit forms opening/closing (and the session log switching to edit mode).
    // Only does work when an editor is on the page.
    new MutationObserver(() => {
        if (document.querySelector(EDITOR_SELECTOR) || CSS.highlights.size) queueHighlight();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] });
}