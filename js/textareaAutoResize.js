const autoResizeTextarea = (textarea) => {
    textarea.style.height = "auto"; // Reset height
    textarea.style.height = textarea.scrollHeight + "px"; // Expand based on content
};

// Function to resize all textareas **before** the overlay appears
const initializeTextareas = () => {
    document.querySelectorAll(".auto-resize").forEach(textarea => {
        autoResizeTextarea(textarea);
        textarea.addEventListener("input", function () {
            autoResizeTextarea(this);
        });
    });
};

// ✅ Modify overlay listeners to **resize before showing**
const addOverlayListeners = () => {
    const addBlockOverlay = document.querySelector(".add-block-overlay");
    const editBlockOverlay = document.querySelector(".edit-block-overlay");

    const observeOverlay = (overlay) => {
        if (!overlay) return;

        // Observe when the "show" class is added **before** making the overlay visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class" && overlay.classList.contains("show")) {
                    initializeTextareas(); // Resize BEFORE it appears
                }
            });
        });

        observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
    };

    observeOverlay(addBlockOverlay);
    observeOverlay(editBlockOverlay);
};

// ✅ Ensure textareas are resized **before overlays show**
document.addEventListener("DOMContentLoaded", initializeTextareas);
document.addEventListener("DOMContentLoaded", addOverlayListeners);
