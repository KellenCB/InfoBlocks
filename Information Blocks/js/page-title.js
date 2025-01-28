document.addEventListener("DOMContentLoaded", () => {
    const titleElement = document.querySelector("header.title-section h1");

    if (!titleElement) {
        console.error("Title element not found in the DOM.");
        return;
    }

    // Load the title from localStorage or use the default
    const savedTitle = localStorage.getItem("pageTitle");
    if (savedTitle) {
        titleElement.textContent = savedTitle;
    }

    // Make the title editable and listen for changes
    titleElement.setAttribute("contenteditable", "true");

    // Save the title to localStorage when editing is done
    titleElement.addEventListener("blur", () => {
        const newTitle = titleElement.textContent.trim();
        if (newTitle) {
            localStorage.setItem("pageTitle", newTitle);
            console.log("Page title updated and saved:", newTitle);
        } else {
            console.error("Title cannot be empty. Reverting to previous title.");
            titleElement.textContent = localStorage.getItem("pageTitle") || "INFORMATION BLOCKS";
        }
    });

    // Optionally, save on Enter key press
    titleElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent adding a new line
            titleElement.blur(); // Trigger the blur event to save the title
        }
    });
});
