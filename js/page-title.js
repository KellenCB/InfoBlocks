const initializeTitles = () => {
    const pageTitle = document.getElementById("page_title");
    const resultsTitle = document.getElementById("results_title");

    if (!pageTitle || !resultsTitle) {
        console.error("❌ Page title or results title element not found.");
        return;
    }

    const defaultPageTitle = "Enter Custom Title Here...";
    const defaultResultsTitle = "Custom Results Title...";

    // ✅ Set initial titles from localStorage or defaults
    pageTitle.textContent = localStorage.getItem("pageTitle") || defaultPageTitle;
    resultsTitle.textContent = localStorage.getItem("Results") || defaultResultsTitle;

    // ✅ Generic function to handle editing & saving
    const saveTitle = (element, storageKey, defaultText) => {
        element.addEventListener("focus", () => {
            // ✅ Clear only if it's the default title
            if (element.textContent === defaultText) {
                element.textContent = "";
            }
        });

        element.addEventListener("blur", () => {
            const newTitle = element.textContent.trim();
            if (newTitle) {
                localStorage.setItem(storageKey, newTitle);
            } else {
                element.textContent = defaultText; // Reset if empty
                localStorage.removeItem(storageKey);
            }
        });

        element.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                element.blur(); // Save on Enter key
            }
        });
    };

    // ✅ Apply to both titles
    saveTitle(pageTitle, "pageTitle", defaultPageTitle);
    saveTitle(resultsTitle, "Results", defaultResultsTitle);

    console.log("✅ Page and results titles initialized.");
};

// ✅ Ensure the function runs on page load
document.addEventListener("DOMContentLoaded", initializeTitles);
