// diceRoller.js

let diceRollerInitialized = false;

// Helper function to roll a die with a given number of sides
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// Mapping from die type to the corresponding SVG image source
const diceImages = {
  4: "images/d_4.svg",
  6: "images/d_6.svg",
  8: "images/d_8.svg",
  10: "images/d_10.svg",
  12: "images/d_12.svg",
  20: "images/d_20.svg"
};

// Array to store selected dice (each entry is the number of sides)
let selectedDice = [];


/* Initialize the dice roller functionality.*/

export function initDiceRoller() {
  if (diceRollerInitialized) return;
  diceRollerInitialized = true;

  const container = document.querySelector("#dice-overlay .dice-roller-container");
  if (!container) {
    console.warn("Dice overlay container not found.");
    return;
  }

  const diceButtons           = container.querySelectorAll(".dice-button");
  const selectedDiceContainer = container.querySelector(".selected-dice-container");
  const rollButton            = container.querySelector("#roll-button");
  const clearButton           = container.querySelector("#clear-selected-button");
  const rollResult            = container.parentElement.querySelector(".roll-results");

  // Attach event listeners for dice selection buttons
  diceButtons.forEach(button => {
    button.addEventListener("click", () => {
      const sides = parseInt(button.dataset.dice, 10);
      selectedDice.push(sides);
      renderSelectedDice(selectedDiceContainer);
    });
  });

  // Helper to trim history to last 5 entries
  function pruneHistory() {
    // rollResult.children[0] is the <h3> header
    while (rollResult.children.length > 1 + 5) {
      rollResult.removeChild(rollResult.lastChild);
    }
  }

  // Attach event listener for the Roll button
  if (rollButton) {
    rollButton.addEventListener("click", () => {
      // ─── Build the new entry ───────────────────────────────
      const entry = document.createElement("div");
      entry.classList.add("roll-history-entry", "new-entry");
  
      if (selectedDice.length === 0) {
        entry.textContent = "No dice selected!";
      } else {
        let total = 0;
        const rollsContainer = document.createElement("div");
        rollsContainer.classList.add("rolls-container");
  
        selectedDice.forEach(sides => {
          const roll = rollDie(sides);
          total += roll;
          const rollDieElement = document.createElement("div");
          rollDieElement.classList.add("roll-die");
          rollDieElement.innerHTML = `
            <div class="roll-die-wrapper" data-dice="${sides}">
              <img src="${diceImages[sides]}" alt="D${sides}" />
              <span class="roll-number">${roll}</span>
            </div>
          `;
          rollsContainer.appendChild(rollDieElement);
        });
  
        entry.appendChild(rollsContainer);
        const totalDiv = document.createElement("div");
        totalDiv.classList.add("total");
        totalDiv.textContent = `Total: ${total}`;
        entry.appendChild(totalDiv);
      }
  
      // ─── Measure its height ────────────────────────────────
      entry.style.position   = 'absolute';
      entry.style.visibility = 'hidden';
      rollResult.insertBefore(entry, rollResult.children[1]);
      const newHeight = entry.offsetHeight;
      entry.style.removeProperty('position');
      entry.style.removeProperty('visibility');
  
      // ─── Shift existing entries DOWN ───────────────────────
      const others = Array.from(
        rollResult.querySelectorAll(".roll-history-entry")
      ).slice(1); // skip the just‑inserted new one
  
      // 1) Jump them down instantly
      others.forEach(el => {
        el.style.transform = `translateY(${newHeight}px)`;
      });
  
      // 2) On next frame, clear transform so they animate into place
      requestAnimationFrame(() => {
        others.forEach(el => {
          el.style.transform = '';
        });
      });
  
      // ─── SLIDE THE NEW ENTRY IN ────────────────────────────
      // Start it above + invisible
      entry.style.transform = `translateY(-${newHeight}px)`;
      entry.style.opacity   = '0';
  
      requestAnimationFrame(() => {
        // Animate to natural spot + full opacity
        entry.style.transform = '';
        entry.style.opacity   = '1';
      });
  
      // ─── Trim history as before ─────────────────────────────
      pruneHistory();
    entry.addEventListener("animationend", () => {
      entry.classList.remove("new-entry");
    }); 
  });
   
  }  
  
  // Attach event listener for the Clear All button
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      selectedDice = [];
      renderSelectedDice(selectedDiceContainer);
    });
  }

  // Render the selected dice using the referenced images
  function renderSelectedDice(container) {
    container.innerHTML = "";
    selectedDice.forEach((sides, index) => {
      const dieElement = document.createElement("div");
      dieElement.classList.add("selected-die");
      dieElement.innerHTML = `
        <div class="selected-die-wrapper" data-dice="${sides}">
          <img src="${diceImages[sides]}" alt="D${sides}" />
          <span class="dice-label">D${sides}</span>
        </div>
      `;
      // Allow removal of a die if it's clicked
      dieElement.addEventListener("click", () => {
        selectedDice.splice(index, 1);
        renderSelectedDice(container);
      });
      container.appendChild(dieElement);
    });
  }
}

// ─── Dice Overlay Keyboard Shortcuts ───────────────────────────────────
document.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('dice-overlay');
  if (!overlay?.classList.contains('show')) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    overlay.classList.remove('show');
    // blur any focused element so no outline remains
    document.activeElement.blur();
  }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const rollBtn = document.getElementById('roll-button');
    if (rollBtn) {
      rollBtn.click();            // run your Roll! logic :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
      document.activeElement.blur();  // remove focus ring from dice button
    }
  }
});
