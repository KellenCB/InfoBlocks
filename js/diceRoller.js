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

/**
 * Initialize the dice roller functionality.
 * Call this after the DOM is loaded and #tab5 is present.
 */
export function initDiceRoller() {
  if (diceRollerInitialized) return;
  diceRollerInitialized = true;

  const tab5 = document.getElementById("tab5");
  if (!tab5) {
    console.warn("Tab 5 not found in DOM. Dice roller not initialized.");
    return;
  }

  const diceButtons = tab5.querySelectorAll(".dice-button");
  const selectedDiceContainer = tab5.querySelector(".selected-dice-container");
  const rollButton = tab5.querySelector("#roll-button");
  const clearButton = tab5.querySelector("#clear-selected-button");
  const rollResult = tab5.querySelector(".roll-result");

  // Attach event listeners for dice selection buttons
  diceButtons.forEach(button => {
    button.addEventListener("click", () => {
      const sides = parseInt(button.dataset.dice, 10);
      selectedDice.push(sides);
      renderSelectedDice(selectedDiceContainer);
    });
  });

  // Attach event listener for the Roll button
  if (rollButton) {
    rollButton.addEventListener("click", () => {
      if (selectedDice.length === 0) {
        rollResult.textContent = "No dice selected!";
        return;
      }
      let total = 0;
      const rollsContainer = document.createElement("div");
      rollsContainer.classList.add("rolls-container");
      // For each selected die, roll it and create a result element
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
      rollResult.innerHTML = `<h3>Roll Results</h3>`;
      rollResult.appendChild(rollsContainer);
      rollResult.innerHTML += `<div class="total">Total: ${total}</div>`;
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
