import { dataManager } from './dataManager.js';
import { uiManager } from './uiManager.js';
import { blockActionsHandler } from './handlers/blockActionsHandler.js';
import { overlayHandler } from './handlers/overlayHandler.js';
import { keyboardShortcutsHandler } from './handlers/keyboardShortcutsHandler.js';
import { actionButtonHandlers } from './handlers/actionButtonHandlers.js';
import { tagHandler } from './handlers/tagHandler.js';


// Expose uiManager and dataManager for debugging in the browser console
window.uiManager = uiManager;
window.dataManager = dataManager;

console.log("main.js loaded");

// Attach all event listeners
const attachEventListeners = () => {
    console.log("Attaching event listeners");

    tagHandler.handleTagClick();

    // Attach keyboard shortcuts
    keyboardShortcutsHandler.handleKeyboardShortcuts({
        addBlockOverlay: document.querySelector(".add-block-overlay"),
        clearDataOverlay: document.querySelector(".cleardata-overlay"),
        editBlockOverlay: document.querySelector(".edit-block-overlay"), // Added
        saveBlockButton: document.getElementById("save_block_button"),
        cancelAddBlockButton: document.getElementById("cancel_add_block"),
        confirmClearButton: document.getElementById("confirm_clear_button"),
        cancelClearButton: document.getElementById("cancel_clear_button"),
        saveEditButton: document.getElementById("save_edit_button"), // Added
        cancelEditButton: document.getElementById("cancel_edit_block") // Added
    });
    actionButtonHandlers.attachActionButtonListeners();

    // Attach search input listener
    document.getElementById("search_input").addEventListener("input", (event) => {
        const searchQuery = event.target.value.toLowerCase();
        const filteredBlocks = dataManager.getBlocks().filter(block =>
            block.title.toLowerCase().includes(searchQuery) || block.text.toLowerCase().includes(searchQuery)
        );
        uiManager.renderBlocks(filteredBlocks);
    });

    // Attach clear tags button listener
    document.getElementById("clear_tags_button").addEventListener("click", () => {
        overlayHandler.clearSelectedTags();
    });
};

// Consolidated DOMContentLoaded Listener
document.addEventListener("DOMContentLoaded", async () => {
    console.log("main.js initialized");

    // Initialize handlers
    blockActionsHandler.handleBlockActions();

    // Load blocks (ensure async if needed)
    await dataManager.loadBlocks();

    // Get loaded blocks and render them
    const blocks = dataManager.getBlocks();
    console.log("Loaded blocks:", blocks);
    uiManager.renderBlocks(blocks);

    // Update and render tags
    uiManager.updateTags();

    // Explicitly refresh predefined tags (if required)
    uiManager.renderTags(dataManager.getFilteredTags("partType"), "part_type_tags_list");
    uiManager.renderTags(dataManager.getFilteredTags("actionType"), "action_type_tags_list");
    uiManager.renderTags(dataManager.getFilteredTags("abilityType"), "ability_type_tags_list");

    // Initialize other handlers
    overlayHandler.initializeOverlayTagHandlers();
    overlayHandler.initializeEventHandlers();
    overlayHandler.attachKeyboardShortcuts();

    // Attach additional event listeners
    attachEventListeners();

    // Debug: Check predefined tags and containers
    console.log("Checking containers...");
    console.log("Part Type Tags:", document.getElementById("part_type_tags_overlay"));
    console.log("Action Type Tags:", document.getElementById("action_type_tags_overlay"));
    console.log("Ability Type Tags:", document.getElementById("ability_type_tags_overlay"));

    console.log("Predefined Part Type Tags:", dataManager.getPredefinedTags("partType"));
    console.log("Predefined Action Type Tags:", dataManager.getPredefinedTags("actionType"));
    console.log("Predefined Ability Type Tags:", dataManager.getPredefinedTags("abilityType"));

    console.log("Predefined Part Type Tags:", dataManager.getFilteredTags("partType"));
    console.log("Predefined Action Type Tags:", dataManager.getFilteredTags("actionType"));
    console.log("Predefined Ability Type Tags:", dataManager.getFilteredTags("abilityType"));


});
