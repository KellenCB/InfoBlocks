export const keyboardShortcutsHandler = (() => {
    const handleKeyboardShortcuts = () => {
        document.addEventListener("keydown", (event) => {
            // Ignore shortcuts if a modifier key is pressed
            if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
                return;
            }

            const addBlockOverlay = document.querySelector(".add-block-overlay");
            const clearDataOverlay = document.querySelector(".cleardata-overlay");
            const editBlockOverlay = document.querySelector(".edit-block-overlay");

            const saveBlockButton = document.getElementById("save_block_button");
            const cancelAddBlockButton = document.getElementById("cancel_add_block");
            const confirmClearButton = document.getElementById("confirm_clear_button");
            const cancelClearButton = document.getElementById("cancel_clear_button");
            const saveEditButton = document.getElementById("save_edit_button");
            const cancelEditButton = document.getElementById("cancel_edit_block");

            if (addBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveBlockButton) {
                    saveBlockButton.click();
                } else if (event.key === "Escape" && cancelAddBlockButton) {
                    cancelAddBlockButton.click();
                }
            }

            if (clearDataOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && confirmClearButton) {
                    confirmClearButton.click();
                } else if (event.key === "Escape" && cancelClearButton) {
                    cancelClearButton.click();
                }
            }

            if (editBlockOverlay?.classList.contains("show")) {
                if (event.key === "Enter" && saveEditButton) {
                    saveEditButton.click();
                } else if (event.key === "Escape" && cancelEditButton) {
                    cancelEditButton.click();
                }
            }
        });

        console.log("Keyboard shortcuts attached.");
    };

    return { handleKeyboardShortcuts };
})();
