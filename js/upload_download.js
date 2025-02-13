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
    
                // Capture circle states from the page
                const circles = document.querySelectorAll(".circle");
                let filledCount = 0;
                let unfilledCount = 0;
    
                circles.forEach(circle => {
                    if (circle.classList.contains("filled")) {
                        filledCount++;
                    } else {
                        unfilledCount++;
                    }
                });
    
                // Add circles to stored data
                storedData["circleData"] = {
                    totalCircles: circles.length,
                    filledCircles: filledCount,
                    unfilledCircles: unfilledCount
                };
    
                // Get the page title from the header (default filename)
                let pageTitle = document.querySelector(".title-section h1")?.textContent.trim() || "InformationBlocks";
    
                // Prompt the user to enter a filename, using the title as the default
                let filename = prompt("Enter a name for your file:", `InformationBlocks_${pageTitle}`);
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
    
                console.log(`Data downloaded as: ${filename}`);
            } catch (err) {
                console.error('Error exporting data:', err);
                alert('An error occurred while exporting data.');
            }
        });
    } else {
        console.error('Download button not found in the DOM.');
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
    
                            // Restore localStorage data (excluding circles)
                            Object.keys(data).forEach((key) => {
                                if (key !== "circleData") {
                                    const value = data[key];
                                    if (typeof value === 'object') {
                                        // Store objects/arrays as JSON strings
                                        localStorage.setItem(key, JSON.stringify(value));
                                    } else {
                                        // Store primitive values as plain strings
                                        localStorage.setItem(key, value);
                                    }
                                }
                            });
    
                            // Restore Circles
                            if (data.circleData) {
                                const totalCircles = data.circleData.totalCircles;
                                const filledCircles = data.circleData.filledCircles;
    
                                const circles = document.querySelectorAll(".circle");
                                circles.forEach((circle, index) => {
                                    if (index < filledCircles) {
                                        circle.classList.add("filled");
                                    } else {
                                        circle.classList.remove("filled");
                                    }
                                });
    
                                console.log(`Restored ${filledCircles} filled circles out of ${totalCircles}`);
                            }
    
                            alert('Data uploaded successfully.');
    
                            // Force a UI refresh to apply changes
                            location.reload();
                        } catch (err) {
                            console.error('Error uploading data:', err);
                            alert('Invalid JSON file or data structure.');
                        }
                    };
                    reader.readAsText(file);
                }
            });
    
            input.click();
        });        
    } else {
        console.error('Upload button not found in the DOM.');
    }
    
});
