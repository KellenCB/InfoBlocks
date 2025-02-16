document.addEventListener("DOMContentLoaded", () => {
    const pageTitle = document.querySelector("header.title-section h1");
    const resultsTitle = document.getElementById("results_title");

    if (!pageTitle || !resultsTitle) {
        console.error("❌ Title elements not found.");
        return;
    }

    // Set placeholders dynamically if no stored title exists
    const defaultPageTitle = "Enter Custom Title Here...";
    const defaultResultsTitle = "Magic Items";

    pageTitle.textContent = localStorage.getItem("pageTitle") || defaultPageTitle;
    resultsTitle.textContent = localStorage.getItem("resultsTitle") || defaultResultsTitle;

    const saveTitle = (element, storageKey, placeholderText) => {
        element.addEventListener("blur", () => {
            const newTitle = element.textContent.trim();
            if (newTitle) {
                localStorage.setItem(storageKey, newTitle);
            } else {
                localStorage.removeItem(storageKey); // Remove if empty
                element.textContent = placeholderText; // Set back to placeholder
            }
        });

        element.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                element.blur(); // Save on enter
            }
        });
    };

    // Apply logic to both titles
    saveTitle(pageTitle, "Info Blocks", defaultPageTitle);
    saveTitle(resultsTitle, "Results", defaultResultsTitle);
});
