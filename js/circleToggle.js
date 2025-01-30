document.addEventListener('DOMContentLoaded', () => {
    const circles = document.querySelectorAll('.circle');
    console.log("circleToggle.js is loaded and running");

    // Load initial state from localStorage
    const circleStates = JSON.parse(localStorage.getItem('circleStates')) || {};

    // Apply saved states to circles
    circles.forEach((circle, index) => {
        if (circleStates[index]) {
            circle.classList.add('unfilled');
        }
    });

    circles.forEach((circle, index) => {
        circle.addEventListener('click', () => {
            console.log("Circle clicked:", circle); // Log the clicked circle
            circle.classList.toggle('unfilled');

            // Update state in localStorage
            circleStates[index] = circle.classList.contains('unfilled');
            localStorage.setItem('circleStates', JSON.stringify(circleStates));
        });
    });

    const resetCircles = () => {
        const circles = document.querySelectorAll(".circle");
        circles.forEach(circle => {
            circle.classList.remove("filled"); // Adjust based on how the fill is applied
        });
        console.log("Circles reset to default state.");
    };
    
    // Expose resetCircles to global scope (so it can be called in clearData)
    window.resetCircles = resetCircles;
    
});