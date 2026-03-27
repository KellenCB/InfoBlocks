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
    assetPath:      '/assets/',
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

  const container = document.querySelector("#dice-panel .dice-roller-container");
  if (!container) { console.warn("Dice panel container not found."); return; }

  const diceButtons           = container.querySelectorAll(".dice-button");
  const selectedDiceContainer = container.querySelector(".selected-dice-container");
  const rollButton            = container.querySelector("#roll-button");
  const clearButton           = container.querySelector("#clear-selected-button");
  const rollResult            = container.parentElement.querySelector(".roll-results");

  // Refresh onclick closures after any mutation so indices stay correct.
  // Only sets a property — no DOM mutations, no repaints.
  function refreshOnclicks() {
    Array.from(selectedDiceContainer.children).forEach((el, i) => {
      el.onclick = () => {
        selectedDice.splice(i, 1);
        el.remove();
        refreshOnclicks();
      };
    });
  }

  // Build a single selected-die element with inline SVG
  function makeDieElement(sides) {
    const el = document.createElement("div");
    el.classList.add("selected-die");
    el.innerHTML = `
      <div class="selected-die-wrapper" data-dice="${sides}">
        ${getSvg(sides)}
        <span class="dice-label">D${sides}</span>
      </div>`;
    return el;
  }

  diceButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const sides = parseInt(btn.dataset.dice, 10);
      selectedDice.push(sides);
      // Ensure SVG cache is ready before injecting — resolves instantly
      // after the first load since svgsReady is already settled
      await svgsReady;
      selectedDiceContainer.appendChild(makeDieElement(sides));
      refreshOnclicks();
    });
  });

  if (rollButton) {
    rollButton.addEventListener("click", async () => {
      if (isRolling) return;

      if (selectedDice.length === 0) {
        appendResult("No dice selected!");
        return;
      }

      isRolling           = true;
      rollButton.disabled = true;

      const counts = {};
      selectedDice.forEach(s => { counts[s] = (counts[s] || 0) + 1; });

      const notation = Object.entries(counts).map(([sides, count]) => ({
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
        const results = await box.roll(notation);

        const rolls = results.map(r => r.value);
        const sides = results.map(r => r.sides);
        const total = rolls.reduce((a, b) => a + b, 0);
        appendHistoryEntry(rolls, sides, total);

        fadeOutDice();

      } catch (err) {
        console.error('Dice-box error:', err);
        appendResult('Error rolling dice — check console.');
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
          const results = await box.roll(notation);
          const rolls   = results.map(r => r.value);
          const sides   = results.map(r => r.sides);
          const total   = rolls.reduce((a, b) => a + b, 0);
          appendHistoryEntry(rolls, sides, total, modifier, label);
          fadeOutDice();
      } catch (err) {
          console.error('Dice-box error:', err);
          appendResult('Error rolling dice — check console.');
      } finally {
          isRolling = false;
      }
  };


  if (clearButton) {
    clearButton.addEventListener("click", () => {
      selectedDice = [];
      selectedDiceContainer.replaceChildren();
      // Don't call clearDiceBox() here — clearDice() is async and calling it
      // outside the roll flow breaks dice-box internal state. The roll
      // handler's own clearDiceBox() cleans up before the next roll.
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
    entry.textContent = msg;
    insertHistoryEntry(entry);
  }

  function appendHistoryEntry(rolls, sides, total, modifier = 0, label = null) {
    const entry = document.createElement("div");
    entry.classList.add("roll-history-entry", "new-entry");

    const rollsContainer = document.createElement("div");
    rollsContainer.classList.add("rolls-container");

    rolls.forEach((roll, i) => {
      const el = document.createElement("div");
      el.classList.add("roll-die");
      el.innerHTML = `
        <div class="roll-die-wrapper" data-dice="${sides[i]}">
          <img src="${diceImages[sides[i]]}" alt="D${sides[i]}" />
          <span class="roll-number">${roll}</span>
        </div>`;
      rollsContainer.appendChild(el);
    });

    const totalDiv = document.createElement("div");
    totalDiv.classList.add("total");
    const prefix = label || 'Total';
    if (modifier !== 0) {
        const sign       = modifier > 0 ? '+' : '';
        const finalTotal = total + modifier;
        totalDiv.innerHTML = `<span style="opacity:0.3">${prefix}:</span> (${total} ${sign}${modifier}) = ${finalTotal}`;
    } else {
        totalDiv.innerHTML = `<span style="opacity:0.3">${prefix}:</span> ${total}`;
    }

    entry.appendChild(rollsContainer);
    entry.appendChild(totalDiv);
    insertHistoryEntry(entry);

    entry.addEventListener("animationend", () => entry.classList.remove("new-entry"));
  }
  
  function insertHistoryEntry(entry) {
    entry.style.position   = 'absolute';
    entry.style.visibility = 'hidden';
    rollResult.insertBefore(entry, rollResult.children[1]);
    const newHeight = entry.offsetHeight;
    entry.style.removeProperty('position');
    entry.style.removeProperty('visibility');

    const others = Array.from(rollResult.querySelectorAll(".roll-history-entry")).slice(1);
    others.forEach(el => { el.style.transform = `translateY(${newHeight}px)`; });
    requestAnimationFrame(() => others.forEach(el => { el.style.transform = ''; }));

    entry.style.transform = `translateY(-${newHeight}px)`;
    entry.style.opacity   = '0';
    requestAnimationFrame(() => {
      entry.style.transform = '';
      entry.style.opacity   = '1';
    });

    while (rollResult.children.length > 1 + 5) {
      rollResult.removeChild(rollResult.lastChild);
    }
  }
}

/* ── Keyboard shortcuts ─────────────────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  const panel = document.getElementById('dice-panel');
  if (!panel?.classList.contains('open')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    panel.classList.remove('open');
    document.getElementById('dice-menu-button')?.classList.remove('active');
    document.activeElement.blur();
  } else if (e.key === 'Enter') {
    // Don't roll if any overlay is open
    const overlayOpen = document.querySelector(
      '.add-block-overlay.show, .edit-block-overlay.show, .cleardata-overlay.show, ' +
      '.remove-block-overlay.show, .spell-slot-edit-overlay.show, ' +
      '.suit-uses-edit-overlay.show, #menu_overlay.active'
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

const DICE_PATTERN = /(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/gi;

export function applyInlineDiceRolls(container) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (node.parentElement?.closest('.inline-dice-roll')) return NodeFilter.FILTER_REJECT;
                if (!node.parentElement?.closest('.block-body'))       return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        DICE_PATTERN.lastIndex = 0;
        if (!DICE_PATTERN.test(text)) return;
        DICE_PATTERN.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match;

        while ((match = DICE_PATTERN.exec(text)) !== null) {
            const [full, qty, sides, sign, modStr] = match;
            const modifier = modStr
                ? (sign === '-' ? -parseInt(modStr, 10) : parseInt(modStr, 10))
                : 0;

            if (match.index > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
            }

            const btn = document.createElement('button');
            btn.className        = 'inline-dice-roll';
            btn.textContent      = full.trim();
            btn.dataset.qty      = qty;
            btn.dataset.sides    = sides;
            btn.dataset.modifier = modifier;
            btn.title            = `Roll ${qty}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`;
            frag.appendChild(btn);

            lastIdx = match.index + full.length;
        }

        if (lastIdx < text.length) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }

        textNode.parentNode.replaceChild(frag, textNode);
    });
}

document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.inline-dice-roll');
    if (!btn) return;

    const qty      = parseInt(btn.dataset.qty,      10);
    const sides    = parseInt(btn.dataset.sides,    10);
    const modifier = parseInt(btn.dataset.modifier, 10) || 0;
    const label    = btn.closest('.block')?.querySelector('h4')?.textContent?.trim() || null;

    const dicePanel = document.getElementById('dice-panel');
    if (dicePanel && !dicePanel.classList.contains('open')) {
        document.getElementById('dice-menu-button')?.click();
    }

    try {
        await rollDice([{ qty, sides }], modifier, label);
    } catch (err) {
        console.error('Inline dice roll failed:', err);
    }
});