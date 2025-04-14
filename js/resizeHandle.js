document.addEventListener("DOMContentLoaded", function() {
  // Array of tabs that need the resizable handle functionality.
  const resizableTabs = ["tab4", "tab8"];
  
  resizableTabs.forEach(function(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
      const tabNumber = tab.id.replace("tab", ""); // "4" or "8"
      const actionsWrapper = tab.querySelector(".actions-grid-wrapper");
      const resultsGrid = document.getElementById(`results_section_${tabNumber}`);
      const handle = tab.querySelector(".resizable-handle");

      if (actionsWrapper && resultsGrid && handle) {
        let isDragging = false;
        // Variables to store the starting Y position and initial heights
        let startY = 0;
        let initialActionsHeight = 0;
        let initialResultsHeight = 0;

        handle.addEventListener("mousedown", function(e) {
          isDragging = true;
          startY = e.clientY;
          initialActionsHeight = parseFloat(getComputedStyle(actionsWrapper).height);
          initialResultsHeight = parseFloat(getComputedStyle(resultsGrid).height);
          document.body.style.cursor = "row-resize";
          document.body.style.userSelect = "none";
          console.log(`[Tab ${tabNumber}] Drag started at Y:`, startY, "Initial Actions Height:", initialActionsHeight, "Initial Results Height:", initialResultsHeight);
        });

        document.addEventListener("mousemove", function(e) {
          if (!isDragging) return;
          const offset = e.clientY - startY;
          let newActionsHeight = initialActionsHeight + offset;
          // Use the computed height of the entire tab container for boundaries
          const containerRect = tab.getBoundingClientRect();
          const minHeight = 50;
          const maxActionsHeight = containerRect.height - minHeight - handle.offsetHeight;
          newActionsHeight = Math.max(minHeight, Math.min(newActionsHeight, maxActionsHeight));
          const newResultsHeight = containerRect.height - newActionsHeight - handle.offsetHeight;

          actionsWrapper.style.height = newActionsHeight + "px";
          resultsGrid.style.height = newResultsHeight + "px";
          console.log(`[Tab ${tabNumber}] Dragging - newActionsHeight:`, newActionsHeight, "newResultsHeight:", newResultsHeight);
        });

        document.addEventListener("mouseup", function() {
          if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            console.log(`[Tab ${tabNumber}] Drag ended.`);
          }
        });
      }
    }
  });
});
