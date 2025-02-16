document.addEventListener('DOMContentLoaded', () => {
    const circleContainer = document.querySelector('.circle-section'); // Parent container
    let circles = []; // Stores circle elements
    console.log("circleToggle.js is loaded and running");

    // Load stored data
    let circleStates = JSON.parse(localStorage.getItem('circleStates')) || {};
    let totalCircles = localStorage.getItem('totalCircles') ? parseInt(localStorage.getItem('totalCircles')) : 10;

    // Function to create a circle (default unfilled)
    const createCircle = (index, state = true, prepend = false) => {
        const circle = document.createElement('div');
        circle.classList.add('circle');
        if (state) circle.classList.add('unfilled'); // New circles start unfilled

        // Attach click event **inside the function** to ensure proper behavior
        circle.addEventListener('click', () => {
            circle.classList.toggle('unfilled');
            circleStates[index] = circle.classList.contains('unfilled');
            localStorage.setItem('circleStates', JSON.stringify(circleStates));
        });

        if (prepend) {
            circles.unshift(circle); // Add to the beginning of array
            circleContainer.insertBefore(circle, circleContainer.firstChild); // Insert at start
        } else {
            circles.push(circle); // Add to end of array
            circleContainer.appendChild(circle);
        }
    };

    // Function to remove the **first (leftmost) circle**
    const removeCircle = () => {
        if (circles.length > 0) { // ✅ Now allows removing all circles
            const circleToRemove = circles.shift(); // Get the leftmost circle
            if (circleToRemove) {
                circleContainer.removeChild(circleToRemove); // Remove from DOM

                // Shift stored circle states correctly
                let newCircleStates = {};
                Object.keys(circleStates).forEach((key, i) => {
                    if (i > 0) newCircleStates[i - 1] = circleStates[key]; // Shift indices left
                });

                circleStates = newCircleStates;
                totalCircles--;
                localStorage.setItem('totalCircles', totalCircles);
                localStorage.setItem('circleStates', JSON.stringify(circleStates));

                console.log(`✅ Removed leftmost circle. Total now: ${totalCircles}`);
            }
        }
    };

    // Function to add a new circle (always unfilled & at the start)
    const addCircle = () => {
        createCircle(circles.length, true, true); // Add unfilled circle at the start
        totalCircles++;
        localStorage.setItem('totalCircles', totalCircles);
    };

    // Create Add/Remove Buttons styled like circles
    const addButton = document.createElement('div');
    addButton.classList.add("circle", "circle-button");
    addButton.innerHTML = "+"; // Add Icon
    addButton.addEventListener('click', addCircle);

    const removeButton = document.createElement('div');
    removeButton.classList.add("circle", "circle-button");
    removeButton.innerHTML = "−"; // Remove Icon
    removeButton.addEventListener('click', removeCircle);

    // Initialize circles from saved data
    for (let i = 0; i < totalCircles; i++) {
        createCircle(i, circleStates[i] ?? true, true); // Load saved state, default unfilled
    }

    // Ensure buttons are always at the right
    circleContainer.appendChild(addButton);
    circleContainer.appendChild(removeButton);

    console.log("✅ Circle controls updated.");
});
