import { dataManager } from '../dataManager.js';
import { uiManager } from '../uiManager.js';

export const actionButtonHandlers = (() => {
    const attachActionButtonListeners = () => {
        const addBlockButton = document.getElementById("add_block_button");
        const binButton = document.querySelector(".bin-button");
        const addBlockOverlay = document.querySelector(".add-block-overlay");
        const clearDataOverlay = document.querySelector(".cleardata-overlay");
        const confirmClearButton = document.getElementById("confirm_clear_button");
        const cancelClearButton = document.getElementById("cancel_clear_button");

        // Add Block Button
        addBlockButton.addEventListener("click", () => {
            console.log("Add Block button clicked");
            addBlockOverlay.classList.add("show");
        });
        
        // Bin Button
        binButton.addEventListener("click", () => {
            console.log("Bin button clicked");
            clearDataOverlay.classList.add("show");
        });

        // Confirm Clear Data
        confirmClearButton.addEventListener("click", () => {
            console.log("Confirm Clear Data button clicked");
            dataManager.clearData();
            uiManager.renderBlocks([]);
            uiManager.renderTags([], []);
            clearDataOverlay.classList.remove("show");
            alert("All data has been cleared.");
        });

        // Cancel Clear Data
        cancelClearButton.addEventListener("click", () => {
            console.log("Cancel Clear Data button clicked");
            clearDataOverlay.classList.remove("show");
        });

        console.log("Action button event listeners attached");
    };

    return { attachActionButtonListeners };
})();
