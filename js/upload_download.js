document.addEventListener('DOMContentLoaded', () => {
    const upload_button = document.getElementById('upload_button');
    const download_button = document.getElementById('download_button');
  
    if (download_button) {
      download_button.addEventListener('click', () => {
        try {
          // Create an object to store all localStorage data
          const storedData = {};
  
          // Iterate through all keys in localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            try {
              storedData[key] = JSON.parse(value);
            } catch (e) {
              storedData[key] = value;
            }
          }
  
          // Override/augment with fresh DOM data:
          // Update page title from the DOM
          const pageTitle = document.querySelector(".title-section h1")?.textContent.trim() || "InformationBlocks";
          storedData["pageTitle"] = pageTitle;
  
          // Collect all results titles (they have ids starting with "results_title_")
          const resultsTitles = {};
          document.querySelectorAll("[id^='results_title_']").forEach(el => {
            resultsTitles[el.id] = el.textContent.trim();
          });
          storedData["resultsTitles"] = resultsTitles;
  
          // Capture circle data from the main circle section (if present)
          const circleSection = document.querySelector(".circle-section");
          if (circleSection) {
            const circles = circleSection.querySelectorAll(".circle:not(.circle-button)");
            let circleData = [];
            circles.forEach(circle => {
              // 0 means unfilled, 1 means filled (you can adjust if you prefer the inverse)
              circleData.push(circle.classList.contains("unfilled") ? 0 : 1);
            });
            storedData["circleData"] = { totalCircles: circles.length, states: circleData };
          }
  
          // Prompt user for a filename (with default suggestion)
          let filename = prompt("Enter a name for your file:", `InfoBlocks_${pageTitle}`);
          if (!filename) return;
          if (!filename.endsWith(".json")) {
            filename += ".json";
          }
  
          // Create a JSON blob and trigger download
          const blob = new Blob([JSON.stringify(storedData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
  
          console.log(`✅ Data downloaded as: ${filename}`);
        } catch (err) {
          console.error('❌ Error exporting data:', err);
          alert('An error occurred while exporting data.');
        }
      });
    } else {
      console.error('❌ Download button not found in the DOM.');
    }
  
    if (upload_button) {
      upload_button.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
  
        input.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const data = JSON.parse(e.target.result);
                if (typeof data !== 'object' || Array.isArray(data)) {
                  throw new Error('Uploaded data must be an object.');
                }
  
                // Restore keys from the uploaded data.
                Object.keys(data).forEach((key) => {
                  const value = data[key];
  
                  // For results titles stored as an object, update each DOM element.
                  if (key === "resultsTitles" && typeof value === 'object') {
                    Object.keys(value).forEach(resultsKey => {
                      const el = document.getElementById(resultsKey);
                      if (el) {
                        el.textContent = value[resultsKey];
                      }
                    });
                    localStorage.setItem("resultsTitles", JSON.stringify(value));
                  }
                  // For page title, update the DOM.
                  else if (key === "pageTitle") {
                    const titleEl = document.querySelector(".title-section h1");
                    if (titleEl) {
                      titleEl.textContent = value;
                    }
                    localStorage.setItem("pageTitle", typeof value === 'object' ? JSON.stringify(value) : value);
                  }
                  // For circle data, update the circle section if it exists.
                  else if (key === "circleData" && typeof value === 'object') {
                    const circleContainer = document.querySelector(".circle-section");
                    if (circleContainer) {
                      circleContainer.innerHTML = ""; // Clear existing circles
                      const totalCircles = value.totalCircles;
                      const states = value.states || [];
                      for (let i = 0; i < totalCircles; i++) {
                        const circle = document.createElement("div");
                        circle.classList.add("circle");
                        if (states[i] === 0) {
                          circle.classList.add("unfilled");
                        }
                        // Allow toggling the state on click
                        circle.addEventListener("click", () => {
                          circle.classList.toggle("unfilled");
                        });
                        circleContainer.appendChild(circle);
                      }
                    }
                  }
                  // For all other keys, restore them into localStorage.
                  else {
                    if (typeof value === 'object') {
                      localStorage.setItem(key, JSON.stringify(value));
                    } else {
                      localStorage.setItem(key, value);
                    }
                  }
                });
  
                alert('✅ Data uploaded successfully.');
                // Reload the page to reflect all changes
                location.reload();
              } catch (err) {
                console.error('❌ Error uploading data:', err);
                alert('Invalid JSON file or data structure.');
              }
            };
            reader.readAsText(file);
          }
        });
  
        input.click();
      });
    }
  });
  