document.addEventListener('DOMContentLoaded', () => {
    const upload_button = document.getElementById('upload_button');
    const download_button = document.getElementById('download_button');

    if (download_button) {
        // Function to download all localStorage data as a JSON file
        download_button.addEventListener('click', () => {
            try {
                const storedData = {};

                // Save all localStorage data
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);

                    try {
                        storedData[key] = JSON.parse(value);
                    } catch {
                        storedData[key] = value; // If not JSON, store as string
                    }
                }

                // ✅ Store the main page title & results section title in JSON
                const pageTitle = document.querySelector(".title-section h1")?.textContent.trim() || "InformationBlocks";
                const resultsTitle = document.getElementById("results_title")?.textContent.trim() || "Magic Items";

                storedData["pageTitle"] = pageTitle;
                storedData["resultsTitle"] = resultsTitle;

                // ✅ Capture circle states correctly
                const circles = document.querySelectorAll(".circle-section .circle:not(.circle-button)");
                let circleData = [];

                circles.forEach(circle => {
                    circleData.push(circle.classList.contains("unfilled") ? 0 : 1);
                });

                storedData["circleData"] = {
                    totalCircles: circles.length,
                    states: circleData // 1 = filled, 0 = unfilled
                };

                // ✅ Ensure correct filename suggestion
                let filename = prompt("Enter a name for your file:", `InfoBlocks_${pageTitle}`);
                if (!filename) return; // If user cancels, do nothing

                // Ensure .json extension
                if (!filename.endsWith(".json")) {
                    filename += ".json";
                }

                // Create JSON blob and trigger download
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
        // Function to upload and parse a JSON file, then store it in localStorage
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

                            // ✅ Restore page title & results title from JSON
                            if (data.pageTitle) {
                                document.querySelector(".title-section h1").textContent = data.pageTitle;
                                localStorage.setItem("pageTitle", data.pageTitle);
                            }

                            if (data.resultsTitle) {
                                document.getElementById("results_title").textContent = data.resultsTitle;
                                localStorage.setItem("resultsTitle", data.resultsTitle);
                            }

                            // ✅ Restore all other localStorage data
                            Object.keys(data).forEach((key) => {
                                if (key !== "circleData" && key !== "pageTitle" && key !== "resultsTitle") {
                                    const value = data[key];
                                    if (typeof value === 'object') {
                                        localStorage.setItem(key, JSON.stringify(value));
                                    } else {
                                        localStorage.setItem(key, value);
                                    }
                                }
                            });

                            // ✅ Restore Circles
                            if (data.circleData) {
                                const circleContainer = document.querySelector(".circle-section");
                                circleContainer.innerHTML = ""; // Clear existing circles

                                const totalCircles = data.circleData.totalCircles;
                                const states = data.circleData.states || [];

                                for (let i = 0; i < totalCircles; i++) {
                                    const circle = document.createElement("div");
                                    circle.classList.add("circle");
                                    if (states[i] === 0) circle.classList.add("unfilled"); // Restore state

                                    circle.addEventListener("click", () => {
                                        circle.classList.toggle("unfilled");
                                    });

                                    circleContainer.appendChild(circle);
                                }

                                console.log(`✅ Restored ${totalCircles} circles.`);
                            }

                            alert('✅ Data uploaded successfully.');

                            // Force a UI refresh to apply changes
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
    } else {
        console.error('❌ Upload button not found in the DOM.');
    }
});
