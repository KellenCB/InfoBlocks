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

  const container = document.querySelector("#dice-overlay .dice-roller-container");
  if (!container) { console.warn("Dice overlay container not found."); return; }

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

  function appendHistoryEntry(rolls, sides, total) {
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
    totalDiv.textContent = `Total: ${total}`;

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
  const overlay = document.getElementById('dice-overlay');
  if (!overlay?.classList.contains('show')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    overlay.classList.remove('show');
    document.activeElement.blur();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (!isRolling) document.getElementById('roll-button')?.click();
    document.activeElement.blur();
  }
});