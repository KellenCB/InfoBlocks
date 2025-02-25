const initializeTitles = () => {
    const pageTitle = document.getElementById("page_title");
    const resultsTitles = {
        tab1: document.getElementById("results_title_1"),
        tab2: document.getElementById("results_title_2")
    };

    if (!pageTitle) {
        console.error("❌ Page title element not found.");
        return;
    }

    const defaultPageTitle = "Enter Custom Title Here...";
    const defaultResultsTitle = "Custom Results Title...";

    // ✅ Set initial titles from localStorage or defaults
    pageTitle.textContent = localStorage.getItem("pageTitle") || defaultPageTitle;
    Object.keys(resultsTitles).forEach(tab => {
        if (resultsTitles[tab]) {
            resultsTitles[tab].textContent =
                localStorage.getItem(`Results_${tab}`) || defaultResultsTitle;
        }
    });

    // ✅ Generic function to handle editing & saving
    const saveTitle = (element, storageKey, defaultText) => {
        element.addEventListener("focus", () => {
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

    // ✅ Apply to page title
    saveTitle(pageTitle, "pageTitle", defaultPageTitle);

    // ✅ Apply to results titles for all tabs
    Object.keys(resultsTitles).forEach(tab => {
        if (resultsTitles[tab]) {
            saveTitle(resultsTitles[tab], `Results_${tab}`, defaultResultsTitle);
        }
    });

    console.log("✅ Page and results titles initialized.");
};

// ✅ Ensure the function runs on page load
document.addEventListener("DOMContentLoaded", initializeTitles);
