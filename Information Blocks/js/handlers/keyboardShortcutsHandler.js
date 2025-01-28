export const keyboardShortcutsHandler = (() => {
    const handleKeyboardShortcuts = ({
        addBlockOverlay,
        clearDataOverlay,
        editBlockOverlay,
        saveBlockButton,
        cancelAddBlockButton,
        confirmClearButton,
        cancelClearButton,
        saveEditButton,
        cancelEditButton
    }) => {
        if (
            !addBlockOverlay ||
            !clearDataOverlay ||
            !editBlockOverlay ||
            !saveBlockButton ||
            !cancelAddBlockButton ||
            !confirmClearButton ||
            !cancelClearButton ||
            !saveEditButton ||
            !cancelEditButton
        ) {
            console.error("One or more required elements for keyboard shortcuts are missing.");
            return;
        }

        document.addEventListener("keydown", (event) => {
            const isAddBlockVisible = addBlockOverlay.classList.contains("show");
            const isClearDataVisible = clearDataOverlay.classList.contains("show");
            const isEditBlockVisible = editBlockOverlay.classList.contains("show");

            if (isAddBlockVisible) {
                if (event.key === "Enter") {
                    saveBlockButton.click();
                } else if (event.key === "Escape") {
                    cancelAddBlockButton.click();
                }
            }

            if (isClearDataVisible) {
                if (event.key === "Enter") {
                    confirmClearButton.click();
                } else if (event.key === "Escape") {
                    cancelClearButton.click();
                }
            }

            if (isEditBlockVisible) {
                if (event.key === "Enter") {
                    saveEditButton.click();
                } else if (event.key === "Escape") {
                    cancelEditButton.click();
                }
            }
        });

        console.log("Keyboard shortcuts attached.");
    };

    return { handleKeyboardShortcuts };
})();
