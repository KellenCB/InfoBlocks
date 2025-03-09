const initializeTitles = () => {
    const pageTitle = document.getElementById("page_title");
    const resultsTitles = {
        tab1: document.getElementById("results_title_1"),
        tab2: document.getElementById("results_title_2"),
        tab3: document.getElementById("results_title_3")

    };

    if (!pageTitle) {
        console.error("❌ Page title element not found.");
        return;
    }

    const defaultPageTitle = "Enter Custom Title Here...";
    const defaultResultsTitle = "Custom Results Title...";

    // Set initial page title from localStorage or default
    pageTitle.textContent = localStorage.getItem("pageTitle") || defaultPageTitle;

    // For each results title element, set its text from localStorage (or use default)
    // and update the corresponding tab button's text accordingly.
    Object.keys(resultsTitles).forEach(tab => {
        if (resultsTitles[tab]) {
            // Get the stored title or use the default.
            const savedTitle = localStorage.getItem(`Results_${tab}`) || defaultResultsTitle;
            resultsTitles[tab].textContent = savedTitle;
            const tabButton = document.querySelector(`.tab-button[data-tab="${tab}"]`);
            if (tabButton) {
                // If the results title is still the default, then set the tab button to "Tab X"
                if (savedTitle === defaultResultsTitle) {
                    const tabNum = tab.replace("tab", "");
                    tabButton.textContent = `Tab ${tabNum}`;
                } else {
                    tabButton.textContent = savedTitle;
                }
            }
        }
    });

    // Generic function to handle editing & saving titles
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
                element.textContent = defaultText;
                localStorage.removeItem(storageKey);
            }
            // If this is a results title, update the corresponding tab button
            if (storageKey.startsWith("Results_")) {
                const tab = storageKey.replace("Results_", "");
                const tabButton = document.querySelector(`.tab-button[data-tab="${tab}"]`);
                if (tabButton) {
                    // If the title is still the default text, set the tab to "Tab X"
                    if ((newTitle || defaultText) === defaultResultsTitle) {
                        const tabNum = tab.replace("tab", "");
                        tabButton.textContent = `Tab ${tabNum}`;
                    } else {
                        tabButton.textContent = newTitle || defaultText;
                    }
                }
            }
        });

        element.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                element.blur();
            }
        });
    };

    // Apply editing behavior to the main page title
    saveTitle(pageTitle, "pageTitle", defaultPageTitle);

    // Apply editing behavior to each results title (for Tab 1 and Tab 2)
    Object.keys(resultsTitles).forEach(tab => {
        if (resultsTitles[tab]) {
            saveTitle(resultsTitles[tab], `Results_${tab}`, defaultResultsTitle);
        }
    });

    console.log("✅ Page and results titles initialized.");
};

document.addEventListener("DOMContentLoaded", initializeTitles);
