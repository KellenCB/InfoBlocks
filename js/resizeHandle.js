document.addEventListener("DOMContentLoaded", function() {
  const resizableTabs = ["tab4", "tab8"];
  const isLandscape = () => window.innerWidth > window.innerHeight;

  resizableTabs.forEach(function(tabId) {
    const tab = document.getElementById(tabId);
    if (!tab) return;

    const tabNum      = tabId.replace("tab", "");
    const wrapper     = tab.querySelector(".actions-grid-wrapper");
    const resultsGrid = document.getElementById(`results_section_${tabNum}`);
    const handle      = tab.querySelector(".resizable-handle");
    if (!wrapper || !resultsGrid || !handle) return;

    let isDragging   = false;
    let startY, initActionsH, initResultsH;

    handle.addEventListener("mousedown", function(e) {
      // don’t start drag in landscape
      if (isLandscape()) return;

      isDragging      = true;
      startY          = e.clientY;
      initActionsH    = wrapper.getBoundingClientRect().height;
      initResultsH    = resultsGrid.getBoundingClientRect().height;
      document.body.style.cursor     = "row-resize";
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", function(e) {
      if (!isDragging) return;
      if (isLandscape()) {
        // aborted mid-drag by rotating into landscape
        isDragging = false;
        cleanup();
        return;
      }

      const delta       = e.clientY - startY;
      const containerH  = tab.getBoundingClientRect().height;
      const minH        = 50;
      let newActionsH   = Math.max(minH, Math.min(initActionsH + delta, containerH - handle.offsetHeight - minH));
      let newResultsH   = containerH - newActionsH - handle.offsetHeight;

      wrapper.style.height     = newActionsH + "px";
      resultsGrid.style.height = newResultsH + "px";
    });

    document.addEventListener("mouseup", function() {
      if (!isDragging) return;
      isDragging = false;
      cleanup();
    });

    // whenever the window resizes/orientation changes...
    window.addEventListener("resize", () => {
      if (isLandscape()) {
        // strip the inline heights so your CSS media-query layout takes over
        wrapper.style.height     = "";
        resultsGrid.style.height = "";
      }
    });

    function cleanup() {
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    }
  });
});
