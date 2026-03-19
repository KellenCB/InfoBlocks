// diceRoller.js

let diceRollerInitialized = false;
let diceBox          = null;
let diceBoxReady     = false;
let diceContainer    = null;
let fadeTimer        = null;
let isRolling        = false;

const diceImages = {
  4:  "images/d_4.svg",
  6:  "images/d_6.svg",
  8:  "images/d_8.svg",
  10: "images/d_10.svg",
  12: "images/d_12.svg",
  20: "images/d_20.svg"
};

let selectedDice = [];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function getCanvasDimensions() {
  const s       = window.getComputedStyle(document.body);
  const pT      = parseFloat(s.paddingTop);
  const pR      = parseFloat(s.paddingRight);
  const pB      = parseFloat(s.paddingBottom);
  const pL      = parseFloat(s.paddingLeft);
  const BLEED = { top: 50, right: 20, bottom: 50, left: 20 };
  return {
    W:       window.innerWidth  - pL - pR + BLEED.left + BLEED.right,
    H:       window.innerHeight - pT - pB + BLEED.top  + BLEED.bottom,
    offsetX: pL - BLEED.left,
    offsetY: pT - BLEED.top,
  };
}

// Always query the canvas through the container so we never hit the wrong one
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
  diceBox       = null;
  diceBoxReady  = false;
  isRolling     = false;
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

  // Pre-inject CSS so BabylonJS reads correct clientWidth/clientHeight
  // the instant it creates and appends its canvas to body.
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
    scale:          3.5,
    gravity:        1,
    mass:           1,
    friction:       0.6,
    restitution:    0.1,
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

  // Remove preStyle — replace with inline styles that include the opacity transition
  preStyle.remove();

  const canvas = getDiceCanvas();
  console.log('🎲 Canvas after init:', canvas);
  console.log(`🎲 Canvas buffer:  ${canvas?.width} × ${canvas?.height}`);
  console.log(`🎲 Canvas display: ${canvas?.clientWidth} × ${canvas?.clientHeight}`);

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
      outline:       '0px solid red',   // DEBUG — remove when done
    });
  }

  diceBox      = box;
  diceBoxReady = true;

  return diceBox;
}

// ── Eager load at module import time ──────────────────────────────────────────
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
        console.log('🎲 Dice canvas reinitialised after resize');
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

  diceButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      selectedDice.push(parseInt(btn.dataset.dice, 10));
      renderSelectedDice(selectedDiceContainer);
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
      const notation = Object.entries(counts)
        .map(([sides, count]) => `${count}d${sides}`)
        .join('+');

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
      clearDiceBox();
      const canvas = getDiceCanvas();
      if (canvas) {
        if (fadeTimer) clearTimeout(fadeTimer);
        canvas.style.opacity = '0';
      }
      renderSelectedDice(selectedDiceContainer);
    });
  }

  function renderSelectedDice(container) {
    container.innerHTML = "";
    selectedDice.forEach((sides, index) => {
      const el = document.createElement("div");
      el.classList.add("selected-die");
      el.innerHTML = `
        <div class="selected-die-wrapper" data-dice="${sides}">
          <img src="${diceImages[sides]}" alt="D${sides}" />
          <span class="dice-label">D${sides}</span>
        </div>`;
      el.addEventListener("click", () => {
        selectedDice.splice(index, 1);
        renderSelectedDice(container);
      });
      container.appendChild(el);
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
    document.getElementById('roll-button')?.click();
    document.activeElement.blur();
  }
});