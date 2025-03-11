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

        // Attach click event to toggle state
        circle.addEventListener('click', () => {
            circle.classList.toggle('unfilled');
            circleStates[index] = circle.classList.contains('unfilled');
            localStorage.setItem('circleStates', JSON.stringify(circleStates));
        });

        // Instead of inserting before firstChild, we always append
        if (prepend) {
            circles.unshift(circle);
            circleContainer.insertBefore(circle, circleContainer.firstChild);
        } else {
            circles.push(circle);
            circleContainer.appendChild(circle);
        }
    };

    // Function to remove the leftmost circle (ignoring the buttons)
    const removeCircle = () => {
        if (circles.length > 0) {
            // Remove the last element from the circles array
            const circleToRemove = circles.pop();
            if (circleToRemove) {
                circleContainer.removeChild(circleToRemove);
    
                // Remove the last entry from circleStates
                delete circleStates[totalCircles - 1];
    
                totalCircles--;
                localStorage.setItem('totalCircles', totalCircles);
                localStorage.setItem('circleStates', JSON.stringify(circleStates));
    
                console.log(`✅ Removed rightmost circle. Total now: ${totalCircles}`);
            }
        }
    };
    
    // Function to add a new circle.
    const addCircle = () => {
        createCircle(circles.length, true, false);
        totalCircles++;
        localStorage.setItem('totalCircles', totalCircles);
    };

    // Create Add/Remove Buttons
    const addButton = document.createElement('div');
    addButton.classList.add("circle", "circle-button");
    addButton.innerHTML = "+"; // Add Icon
    addButton.addEventListener('click', addCircle);

    const removeButton = document.createElement('div');
    removeButton.classList.add("circle", "circle-button");
    removeButton.innerHTML = "−"; // Remove Icon
    removeButton.addEventListener('click', removeCircle);

    circleContainer.insertBefore(addButton, circleContainer.firstChild);
    circleContainer.insertBefore(removeButton, addButton.nextSibling);

    // Initialize circles from saved data, appending them so they appear after the buttons.
    for (let i = 0; i < totalCircles; i++) {
        createCircle(i, circleStates[i] ?? true, false);
    }

    console.log("✅ Circle controls updated.");
});
