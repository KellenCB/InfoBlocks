document.addEventListener('DOMContentLoaded', () => {
    const upload_button = document.getElementById('upload_button');
    const download_button = document.getElementById('download_button');

    if (download_button) {
        // Function to download all localStorage data as a JSON file
        download_button.addEventListener('click', () => {
            try {
                const storedData = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);

                    try {
                        // Try to parse JSON, fallback to string if parsing fails
                        storedData[key] = JSON.parse(value);
                    } catch {
                        storedData[key] = value; // If not JSON, save as plain string
                    }
                }

                const blob = new Blob([JSON.stringify(storedData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = 'siteData.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                URL.revokeObjectURL(url);
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
        
                            Object.keys(data).forEach((key) => {
                                const value = data[key];
                                if (typeof value === 'object') {
                                    // Store objects/arrays as JSON strings
                                    localStorage.setItem(key, JSON.stringify(value));
                                } else {
                                    // Store primitive values as plain strings
                                    localStorage.setItem(key, value);
                                }
                            });
        
                            alert('Data uploaded successfully.');
        
                            // Force a UI refresh
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
