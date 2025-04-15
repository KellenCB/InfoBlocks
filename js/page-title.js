const initializeTitles = () => {
    const pageTitle = document.getElementById("page_title");

    if (!pageTitle) {
        console.error("❌ Page title element not found.");
        return;
    }

    const defaultPageTitle = "Enter Custom Title Here...";

    // Set initial page title from localStorage or default
    pageTitle.textContent = localStorage.getItem("pageTitle") || "";

    // Generic function to handle editing & saving the main page title
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
                if (storageKey === "pageTitle") {
                    element.textContent = "";
                }
                localStorage.removeItem(storageKey);
            }
        });

        element.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                element.blur();
            }
        });
    };

    // Apply editing behavior only to the main page title
    saveTitle(pageTitle, "pageTitle", defaultPageTitle);

    console.log("✅ Page title initialized.");
};

document.addEventListener("DOMContentLoaded", initializeTitles);
