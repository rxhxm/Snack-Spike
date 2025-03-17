/* ////////////////
Add JavaScript for navigation functionality
//////////////// */

document.addEventListener('DOMContentLoaded', function () {
    // Get references to elements
    const explainerTab = document.getElementById('explainer-tab');
    const gameTab = document.getElementById('game-tab');
    const explainerContent = document.getElementById('explainer-content');
    const gameContent = document.getElementById('game-content');
    const startGameBtn = document.getElementById('start-game-btn');
    const resultsPanel = document.querySelector('.results-panel');
    const tryAnotherBtn = document.getElementById('try-another-btn');

    // New drag-and-drop references
    const draggableItems = document.querySelectorAll('.food-option.draggable');
    const clockContainer = document.querySelector('.clock-container');
    const clickableArea = document.getElementById('clickable-area');
    const timeIndicatorLine = document.getElementById('time-indicator-line');
    const timeIndicatorLabel = document.getElementById('time-indicator-label');

    // Initially hide the results panel
    if (resultsPanel) {
        resultsPanel.style.display = 'none';
    }

    // Make sure proper content is shown on initial page load
    explainerContent.style.display = 'block';
    gameContent.style.display = 'none';
    explainerTab.style.background = '#0066CC';
    gameTab.style.background = '#cccccc';

    // Function to switch to explainer view
    function showExplainer() {
        explainerContent.style.display = 'block';
        gameContent.style.display = 'none';
        explainerTab.style.background = '#0066CC';
        gameTab.style.background = '#cccccc';
    }

    // Function to switch to game view
    function showGame() {
        explainerContent.style.display = 'none';
        gameContent.style.display = 'block';
        clockContainer.style.display = 'flex';
        if (resultsPanel) resultsPanel.style.display = 'none';
        explainerTab.style.background = '#cccccc';
        gameTab.style.background = '#0066CC';

        // Reset the game state
        resetGameState();
    }

    // Add event listeners for tab buttons
    explainerTab.addEventListener('click', showExplainer);
    gameTab.addEventListener('click', showGame);

    // Add event listener for "Start Prediction Game" button
    if (startGameBtn) {
        startGameBtn.addEventListener('click', showGame);
    }

    // Function to reset the game state
    function resetGameState() {
        // Clear any placed food items
        const placedFoods = document.querySelectorAll('.placed-food');
        placedFoods.forEach(item => item.remove());

        // Hide the results panel
        if (resultsPanel) {
            resultsPanel.style.display = 'none';
        }

        // Reset drag state for all food options
        draggableItems.forEach(item => {
            item.classList.remove('dragging');
            item.style.opacity = '1';
        });
    }

    // Helper functions for the clock interactions
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function calculateAngle(centerX, centerY, pointX, pointY) {
        const deltaX = pointX - centerX;
        const deltaY = pointY - centerY;
        let angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI + 90;
        if (angle < 0) angle += 360;
        return angle;
    }

    function calculateDistance(centerX, centerY, pointX, pointY) {
        const deltaX = pointX - centerX;
        const deltaY = pointY - centerY;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    function formatTime(angleInDegrees) {
        // Convert angle to hours (24-hour format)
        // Offset by 12 hours to make 12 o'clock = 12:00 PM
        let hours = Math.floor((angleInDegrees / 360) * 24);
        if (hours < 12) hours += 12;
        if (hours > 23) hours -= 12;

        let minutes = Math.floor(((angleInDegrees / 360) * 24 * 60) % 60);

        // Format as HH:MM with AM/PM
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;

        return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    // Initialize drag and drop functionality
    draggableItems.forEach(item => {
        item.addEventListener('mousedown', startDrag);
    });

    let draggedItem = null;

    function startDrag(e) {
        // Prevent default to avoid text selection
        e.preventDefault();

        // Set the dragged item
        draggedItem = this;
        draggedItem.classList.add('dragging');

        // Set initial position
        const rect = draggedItem.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // Clone the item for dragging
        const clone = draggedItem.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = e.clientX - offsetX + 'px';
        clone.style.top = e.clientY - offsetY + 'px';
        clone.style.zIndex = '1000';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.8';
        clone.id = 'drag-clone';
        document.body.appendChild(clone);

        // Show time indicator
        timeIndicatorLine.style.display = 'block';
        timeIndicatorLabel.style.display = 'block';

        // Set up move and end events
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', endDrag);

        // Set up functions for dragging
        function moveDrag(e) {
            // Update clone position
            clone.style.left = e.clientX - offsetX + 'px';
            clone.style.top = e.clientY - offsetY + 'px';

            // Check if over the clock
            const clockRect = clockContainer.getBoundingClientRect();
            const clockCenterX = clockRect.left + clockRect.width / 2;
            const clockCenterY = clockRect.top + clockRect.height / 2;

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            // Calculate distance from center
            const distance = Math.sqrt(
                Math.pow(mouseX - clockCenterX, 2) +
                Math.pow(mouseY - clockCenterY, 2)
            );

            // Update time indicator if over the clock area
            if (distance <= clockRect.width / 2) {
                // Calculate angle based on mouse position
                const angle = calculateAngle(
                    clockCenterX,
                    clockCenterY,
                    mouseX,
                    mouseY
                );

                // Update time indicator line position in SVG
                const endPoint = polarToCartesian(300, 300, 270, angle);
                timeIndicatorLine.setAttribute('x2', endPoint.x);
                timeIndicatorLine.setAttribute('y2', endPoint.y);

                // Update time label
                const timeStr = formatTime(angle);
                timeIndicatorLabel.textContent = timeStr;

                // Position the time label near the edge of the clock
                const labelPoint = polarToCartesian(300, 300, 290, angle);
                const svgPoint = document.getElementById('glucose-clock').createSVGPoint();
                svgPoint.x = labelPoint.x;
                svgPoint.y = labelPoint.y;

                const screenPoint = svgPoint.matrixTransform(
                    document.getElementById('glucose-clock').getScreenCTM()
                );

                timeIndicatorLabel.style.left = (screenPoint.x - clockRect.left) + 'px';
                timeIndicatorLabel.style.top = (screenPoint.y - clockRect.top) + 'px';

                // Show and position the drop target indicator
                const dropTarget = document.getElementById('drop-target');
                dropTarget.style.display = 'block';
                dropTarget.setAttribute('cx', endPoint.x);
                dropTarget.setAttribute('cy', endPoint.y);
            } else {
                // Hide drop target when not over the clock
                document.getElementById('drop-target').style.display = 'none';
            }
        }

        function endDrag(e) {
            // Clean up event listeners
            document.removeEventListener('mousemove', moveDrag);
            document.removeEventListener('mouseup', endDrag);

            // Remove the clone
            const cloneElement = document.getElementById('drag-clone');
            if (cloneElement) {
                cloneElement.remove();
            }

            // Hide drop target
            document.getElementById('drop-target').style.display = 'none';

            // Check if dropped on the clock
            const clockRect = clockContainer.getBoundingClientRect();
            const clockCenterX = clockRect.left + clockRect.width / 2;
            const clockCenterY = clockRect.top + clockRect.height / 2;

            const distance = Math.sqrt(
                Math.pow(e.clientX - clockCenterX, 2) +
                Math.pow(e.clientY - clockCenterY, 2)
            );

            // If dropped on clock, place the food at that time
            if (distance <= clockRect.width / 2) {
                // Calculate angle based on drop position
                const angle = calculateAngle(
                    clockCenterX,
                    clockCenterY,
                    e.clientX,
                    e.clientY
                );

                const timeStr = formatTime(angle);

                // Calculate position for placed food
                const foodPoint = polarToCartesian(300, 300, 230, angle);
                const svgPoint = document.getElementById('glucose-clock').createSVGPoint();
                svgPoint.x = foodPoint.x;
                svgPoint.y = foodPoint.y;

                const screenPoint = svgPoint.matrixTransform(
                    document.getElementById('glucose-clock').getScreenCTM()
                );

                // Create placed food element
                const placedFood = document.createElement('div');
                placedFood.className = 'placed-food';
                placedFood.textContent = draggedItem.textContent.split(' ')[0]; // Just the emoji
                placedFood.dataset.food = draggedItem.dataset.food;
                placedFood.dataset.time = timeStr;
                placedFood.dataset.impact = draggedItem.dataset.impact;
                placedFood.dataset.timing = draggedItem.dataset.timing;

                placedFood.style.left = (screenPoint.x - clockRect.left) + 'px';
                placedFood.style.top = (screenPoint.y - clockRect.top) + 'px';

                clockContainer.appendChild(placedFood);

                // Show the submit button
                document.getElementById('submit-analysis-btn').style.display = 'block';

                // Show notification
                const notification = document.getElementById('prediction-notification');
                notification.textContent = 'Food placed! Click Submit Your Analysis when ready.';
                notification.style.display = 'block';

                // Hide notification after 3 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        notification.style.display = 'none';
                        notification.style.opacity = '1';
                    }, 500);
                }, 3000);
            }

            // Reset dragged item
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }

            // Hide time indicator
            timeIndicatorLine.style.display = 'none';
            timeIndicatorLabel.style.display = 'none';
        }
    }

    // Function to show results based on placed food
    function showResults(food, time, impact, timing) {
        if (resultsPanel) {
            // Update results panel content
            document.getElementById('placed-food-name').textContent = food.charAt(0).toUpperCase() + food.slice(1);
            document.getElementById('placed-food-time').textContent = time;
            document.getElementById('food-timing').textContent = timing;
            document.getElementById('glycemic-impact').textContent = impact;

            // Show the results panel
            resultsPanel.style.display = 'block';

            // Scroll to results
            resultsPanel.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Show submit button when food is placed
    function updateSubmitButton() {
        const placedFoods = document.querySelectorAll('.placed-food');
        const submitBtn = document.getElementById('submit-analysis-btn');

        if (placedFoods.length > 0) {
            submitBtn.style.display = 'block';
        } else {
            submitBtn.style.display = 'none';
        }
    }

    // Add event listener for the submit button
    const submitAnalysisBtn = document.getElementById('submit-analysis-btn');
    if (submitAnalysisBtn) {
        submitAnalysisBtn.addEventListener('click', function () {
            const placedFoods = document.querySelectorAll('.placed-food');
            if (placedFoods.length > 0) {
                const placedFood = placedFoods[0];
                showResults(
                    placedFood.dataset.food,
                    placedFood.dataset.time,
                    placedFood.dataset.impact,
                    placedFood.dataset.timing
                );
            }
        });
    }

    // Handle "Try Another" button
    if (tryAnotherBtn) {
        tryAnotherBtn.addEventListener('click', function () {
            resetGameState();
        });
    }
});

// Add this to your existing script section
function selectFoodCategory(category) {
    // Reset all buttons to inactive state
    document.querySelectorAll('.food-toggle-btn').forEach(btn => {
        btn.style.background = '#f5f5f7';
        btn.style.color = '#333';
    });

    // Reset all food category cards
    document.querySelectorAll('.food-category').forEach(card => {
        card.style.borderColor = '#f0f0f0';
        card.style.transform = 'scale(1)';
        card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
    });

    // Hide all curves initially
    document.getElementById('high-glycemic-curve').style.display = 'none';
    document.getElementById('medium-glycemic-curve').style.display = 'none';
    document.getElementById('low-glycemic-curve').style.display = 'none';

    // Hide all annotations
    document.getElementById('high-glycemic-annotation').style.display = 'none';
    document.getElementById('medium-glycemic-annotation').style.display = 'none';

    // Set specific button to active
    if (category !== 'all') {
        document.getElementById(category + '-btn').style.background = '#0066CC';
        document.getElementById(category + '-btn').style.color = 'white';
    } else {
        document.getElementById('view-all-btn').style.background = '#0066CC';
        document.getElementById('view-all-btn').style.color = 'white';
    }

    // Highlight the selected food category card
    if (category !== 'all') {
        const selectedCard = document.querySelector(`.${category}-glycemic`);
        selectedCard.style.borderColor = category === 'high' ? '#e53935' :
            category === 'medium' ? '#ff9800' : '#4caf50';
        selectedCard.style.transform = 'scale(1.05)';
        selectedCard.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
    }

    // Show curves based on selection
    if (category === 'all') {
        document.getElementById('high-glycemic-curve').style.display = 'block';
        document.getElementById('medium-glycemic-curve').style.display = 'block';
        document.getElementById('low-glycemic-curve').style.display = 'block';
        document.getElementById('high-glycemic-annotation').style.display = 'block';
        document.getElementById('medium-glycemic-annotation').style.display = 'block';
        document.querySelector('.legend').style.display = 'block';
    } else if (category === 'high') {
        document.getElementById('high-glycemic-curve').style.display = 'block';
        document.getElementById('high-glycemic-annotation').style.display = 'block';
        document.querySelector('.legend').style.display = 'none';
    } else if (category === 'medium') {
        document.getElementById('medium-glycemic-curve').style.display = 'block';
        document.getElementById('medium-glycemic-annotation').style.display = 'block';
        document.querySelector('.legend').style.display = 'none';
    } else if (category === 'low') {
        document.getElementById('low-glycemic-curve').style.display = 'block';
        document.querySelector('.legend').style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize with all graphs showing
    selectFoodCategory('all');

    // Add tooltip functionality for the food comparison graph
    const graphContainer = document.querySelector('.graph-container');
    const tooltipLine = document.getElementById('food-tooltip-line');
    const highGlucosePoint = document.getElementById('high-glucose-point');
    const mediumGlucosePoint = document.getElementById('medium-glucose-point');
    const lowGlucosePoint = document.getElementById('low-glucose-point');
    const foodGlucoseTooltip = document.getElementById('food-glucose-tooltip');

    if (graphContainer && tooltipLine && foodGlucoseTooltip) {
        const foodComparisonGraph = document.getElementById('food-comparison-graph');

        graphContainer.addEventListener('mousemove', function (event) {
            const rect = graphContainer.getBoundingClientRect();
            const svgRect = foodComparisonGraph.getBoundingClientRect();
            const x = event.clientX - svgRect.left;

            // Only show tooltip within the graph area (80px - 750px)
            if (x >= 80 && x <= 750) {
                // Position the tooltip line
                tooltipLine.setAttribute('x1', x);
                tooltipLine.setAttribute('x2', x);
                tooltipLine.style.display = 'block';

                // Calculate time based on x position
                const timePos = (x - 80) / 670; // 0 to 1 position
                const minutes = Math.round(timePos * 150); // 0 to 150 minutes

                // Get glucose values for each curve at this x position
                // These are approximations based on the paths
                let highGlucose, mediumGlucose, lowGlucose;

                // Rice (high glycemic)
                if (x < 190) { // 0-30 min
                    highGlucose = 290 - (x - 80) * 5.7;
                } else if (x < 300) { // 30-60 min
                    highGlucose = 120 + (x - 190) * 0.18;
                } else if (x < 410) { // 60-90 min
                    highGlucose = 140 + (x - 300) * 1.09;
                } else if (x < 520) { // 90-120 min
                    highGlucose = 260 + (x - 410) * 0.27;
                } else { // 120-150 min
                    highGlucose = 290;
                }

                // Apple (medium glycemic)
                if (x < 190) { // 0-30 min
                    mediumGlucose = 290 - (x - 80) * 3.64;
                } else if (x < 300) { // 30-60 min
                    mediumGlucose = 180 + (x - 190) * 0.09;
                } else if (x < 410) { // 60-90 min
                    mediumGlucose = 190 + (x - 300) * 0.73;
                } else if (x < 520) { // 90-120 min
                    mediumGlucose = 270 + (x - 410) * 0.18;
                } else { // 120-150 min
                    mediumGlucose = 290;
                }

                // Broccoli (low glycemic)
                if (x < 190) { // 0-30 min
                    lowGlucose = 290 - (x - 80) * 1.09;
                } else if (x < 300) { // 30-60 min
                    lowGlucose = 260 + (x - 190) * 0.09;
                } else if (x < 410) { // 60-90 min
                    lowGlucose = 270 + (x - 300) * 0.18;
                } else { // 90-150 min
                    lowGlucose = 290;
                }

                // Position the tooltip points on the glucose curves
                highGlucosePoint.setAttribute('cx', x);
                highGlucosePoint.setAttribute('cy', highGlucose);

                mediumGlucosePoint.setAttribute('cx', x);
                mediumGlucosePoint.setAttribute('cy', mediumGlucose);

                lowGlucosePoint.setAttribute('cx', x);
                lowGlucosePoint.setAttribute('cy', lowGlucose);

                // Show the points based on which curves are visible
                highGlucosePoint.style.display = document.getElementById('high-glycemic-curve').style.display !== 'none' ? 'block' : 'none';
                mediumGlucosePoint.style.display = document.getElementById('medium-glycemic-curve').style.display !== 'none' ? 'block' : 'none';
                lowGlucosePoint.style.display = document.getElementById('low-glycemic-curve').style.display !== 'none' ? 'block' : 'none';

                // Convert SVG y-coordinates to glucose values (320 = 70mg/dL, 80 = 160mg/dL)
                const highGlucoseValue = Math.round(70 + (320 - highGlucose) * (160 - 70) / (320 - 80));
                const mediumGlucoseValue = Math.round(70 + (320 - mediumGlucose) * (160 - 70) / (320 - 80));
                const lowGlucoseValue = Math.round(70 + (320 - lowGlucose) * (160 - 70) / (320 - 80));

                // Update tooltip content based on which curves are visible
                let tooltipContent = `Time: ${minutes} min<br>`;

                if (document.getElementById('high-glycemic-curve').style.display !== 'none') {
                    tooltipContent += `<span style="color: #e53935;">White Rice: ${highGlucoseValue} mg/dL</span><br>`;
                }

                if (document.getElementById('medium-glycemic-curve').style.display !== 'none') {
                    tooltipContent += `<span style="color: #ff9800;">Apple: ${mediumGlucoseValue} mg/dL</span><br>`;
                }

                if (document.getElementById('low-glycemic-curve').style.display !== 'none') {
                    tooltipContent += `<span style="color: #4caf50;">Broccoli: ${lowGlucoseValue} mg/dL</span>`;
                }

                foodGlucoseTooltip.innerHTML = tooltipContent;
                foodGlucoseTooltip.style.display = 'block';

                // Position tooltip relative to mouse
                const tooltipX = event.clientX - rect.left + 15;
                const tooltipY = event.clientY - rect.top - 40;
                foodGlucoseTooltip.style.left = tooltipX + 'px';
                foodGlucoseTooltip.style.top = tooltipY + 'px';
            }
        });

        graphContainer.addEventListener('mouseleave', function () {
            tooltipLine.style.display = 'none';
            highGlucosePoint.style.display = 'none';
            mediumGlucosePoint.style.display = 'none';
            lowGlucosePoint.style.display = 'none';
            foodGlucoseTooltip.style.display = 'none';
        });
    }
});

/* ////////////
Molecule Animation Script
/////////// */

// Three.js setup
let scene, camera, renderer;
let glucoseMolecules = [];
let rotationSpeed = 0.01;
let glucoseCount = 0;

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas').appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create glucose molecules
    createGlucoseMolecules(15);

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onMouseClick);

    // Start animation
    animate();
}

function createGlucoseMolecules(count) {
    for (let i = 0; i < count; i++) {
        // Main glucose ring (hexagon)
        const ringGeometry = new THREE.TorusGeometry(0.3, 0.05, 16, 6);
        const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xFFCC00 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);

        // Carbon atoms
        const carbonMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const carbonGeometry = new THREE.SphereGeometry(0.08, 16, 16);

        // Oxygen atoms
        const oxygenMaterial = new THREE.MeshPhongMaterial({ color: 0xFF5555 });
        const oxygenGeometry = new THREE.SphereGeometry(0.07, 16, 16);

        // Hydrogen atoms
        const hydrogenMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const hydrogenGeometry = new THREE.SphereGeometry(0.05, 16, 16);

        // Create group for the whole molecule
        const molecule = new THREE.Group();
        molecule.add(ring);

        // Add atoms at strategic positions around the ring
        for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2;
            const x = Math.cos(angle) * 0.3;
            const y = Math.sin(angle) * 0.3;

            const carbon = new THREE.Mesh(carbonGeometry, carbonMaterial);
            carbon.position.set(x, y, 0);
            molecule.add(carbon);

            // Add oxygen to some carbons
            if (j % 2 === 0) {
                const oxygen = new THREE.Mesh(oxygenGeometry, oxygenMaterial);
                oxygen.position.set(x * 1.3, y * 1.3, 0.1);
                molecule.add(oxygen);
            }

            // Add hydrogens
            const hydrogen = new THREE.Mesh(hydrogenGeometry, hydrogenMaterial);
            hydrogen.position.set(x * 1.2, y * 1.2, -0.1);
            molecule.add(hydrogen);
        }

        // Position molecule randomly in space
        molecule.position.x = (Math.random() - 0.5) * 10;
        molecule.position.y = (Math.random() - 0.5) * 10;
        molecule.position.z = (Math.random() - 0.5) * 10;

        // Random rotation
        molecule.rotation.x = Math.random() * Math.PI;
        molecule.rotation.y = Math.random() * Math.PI;

        // Add velocity for animation
        molecule.userData = {
            velocityX: (Math.random() - 0.5) * 0.02,
            velocityY: (Math.random() - 0.5) * 0.02,
            velocityZ: (Math.random() - 0.5) * 0.02,
            rotationX: (Math.random() - 0.5) * 0.02,
            rotationY: (Math.random() - 0.5) * 0.02,
            rotationZ: (Math.random() - 0.5) * 0.02,
            clickable: true
        };

        scene.add(molecule);
        glucoseMolecules.push(molecule);
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Animate each molecule
    glucoseMolecules.forEach(molecule => {
        if (!molecule.userData.clickable) return;

        // Apply rotation
        molecule.rotation.x += molecule.userData.rotationX;
        molecule.rotation.y += molecule.userData.rotationY;
        molecule.rotation.z += molecule.userData.rotationZ;

        // Apply movement
        molecule.position.x += molecule.userData.velocityX;
        molecule.position.y += molecule.userData.velocityY;
        molecule.position.z += molecule.userData.velocityZ;

        // Bounce off invisible boundaries
        if (Math.abs(molecule.position.x) > 5) {
            molecule.userData.velocityX *= -1;
        }
        if (Math.abs(molecule.position.y) > 5) {
            molecule.userData.velocityY *= -1;
        }
        if (Math.abs(molecule.position.z) > 5) {
            molecule.userData.velocityZ *= -1;
        }
    });

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycasting to detect clicks on molecules
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        // Find the parent molecule
        let moleculeClicked = false;
        for (let i = 0; i < glucoseMolecules.length; i++) {
            const molecule = glucoseMolecules[i];
            if (!molecule.userData.clickable) continue;

            if (molecule.children.some(child => {
                return intersects.some(intersect => intersect.object === child);
            })) {
                // "Collect" the molecule
                collectMolecule(molecule);
                moleculeClicked = true;
                break;
            }
        }

        // If no molecule was clicked, create a random one
        if (!moleculeClicked && intersects[0].object.parent === scene) {
            createGlucoseMolecules(1);
        }
    }
}

function collectMolecule(molecule) {
    // Animate collection
    molecule.userData.clickable = false;

    // Animation - grow and fade out
    let scale = 1.0;
    const fadeInterval = setInterval(() => {
        scale += 0.1;
        molecule.scale.set(scale, scale, scale);

        // Make children start fading
        molecule.children.forEach(child => {
            if (child.material) {
                if (!child.material.transparent) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                }
                child.material.opacity -= 0.1;
            }
        });

        if (scale >= 2.0) {
            clearInterval(fadeInterval);
            scene.remove(molecule);

            // Remove from array
            const index = glucoseMolecules.indexOf(molecule);
            if (index > -1) {
                glucoseMolecules.splice(index, 1);
            }

            // Create a new molecule
            setTimeout(() => {
                createGlucoseMolecules(1);
            }, 500);
        }
    }, 50);

    // Update counter
    glucoseCount++;
    document.getElementById('count').textContent = glucoseCount;
}

// Initialize the animation when document is loaded
document.addEventListener('DOMContentLoaded', function () {
    init();
});

/* ////////////
Add JavaScript for the fun facts functionality
///////////// */
document.addEventListener('DOMContentLoaded', function () {
    // Fun facts array
    const glucoseFacts = [
        "Honey is mostly glucose and fructose - that's why it's so sweet!",
        "Glucose is less sweet than fructose but sweeter than lactose. Fructose is 1.7x sweeter than glucose, but glucose is 2x sweeter than lactose (milk sugar).",
        "The word \"glucose\" comes from the Greek word \"gleukos,\" meaning sweet.",
        "Glucose was first isolated from raisins in 1747 by Andreas Marggraf.",
        "Brain's VIP Fuel: Your brain uses 50% of the body's glucose despite being only 2% of its weight, requiring a constant supply to power neurons and cognitive functions.",
        "Sweet Chemistry: Glucose has the formula C₆H₁₂O₆ – six carbon atoms, twelve hydrogen, and six oxygen arranged in a ring structure.",
        "Fiber Shield: Whole fruits slow glucose spikes by up to 30% compared to juices, thanks to their natural fiber.",
        "Red Blood Cell Diet: Red blood cells rely entirely on glucose for energy because they lack mitochondria to burn other fuels.",
        "Metabolic Recycling: Excess glucose becomes fat through lipogenesis – a liver process linked to weight gain.",
        "Ancient Energy: Glucose metabolism pathways evolved 2 billion years ago, making it life's universal energy currency.",
        "Stress Response: Adrenaline triggers emergency glucose release from the liver during \"fight-or-flight\" moments.",
        "Personalized Reactions: Identical meals can cause wildly different spikes in people due to unique gut microbiomes."
    ];

    // DOM elements
    const funFactButton = document.getElementById('fun-fact-button');
    const funFactModal = document.getElementById('fun-fact-modal');
    const funFactOverlay = document.getElementById('fun-fact-overlay');
    const funFactContent = document.getElementById('fun-fact-content');
    const funFactClose = document.getElementById('fun-fact-close');
    const nextFactButton = document.getElementById('next-fact-button');
    const currentFactEl = document.getElementById('current-fact');
    const totalFactsEl = document.getElementById('total-facts');

    // Current fact index
    let currentFactIndex = 0;

    // Update total facts count
    totalFactsEl.textContent = glucoseFacts.length;

    // Show fun fact modal
    function showFunFactModal() {
        funFactContent.textContent = glucoseFacts[currentFactIndex];
        currentFactEl.textContent = currentFactIndex + 1;
        funFactModal.classList.add('show');
        funFactOverlay.classList.add('show');
    }

    // Hide fun fact modal
    function hideFunFactModal() {
        funFactModal.classList.remove('show');
        funFactOverlay.classList.remove('show');
    }

    // Show next fact
    function showNextFact() {
        currentFactIndex = (currentFactIndex + 1) % glucoseFacts.length;
        funFactContent.textContent = glucoseFacts[currentFactIndex];
        currentFactEl.textContent = currentFactIndex + 1;

        // Add animation effect
        funFactContent.style.opacity = 0;
        setTimeout(() => {
            funFactContent.style.opacity = 1;
        }, 300);
    }

    // Event listeners
    funFactButton.addEventListener('click', showFunFactModal);
    funFactClose.addEventListener('click', hideFunFactModal);
    funFactOverlay.addEventListener('click', hideFunFactModal);
    nextFactButton.addEventListener('click', showNextFact);

    // Periodically highlight the fun fact button
    setInterval(() => {
        funFactButton.classList.add('highlight');
        setTimeout(() => {
            funFactButton.classList.remove('highlight');
        }, 1000);
    }, 8000);
});

/* ////////////////////
Add this to your JavaScript section
/////////////////// */
        // Loading screen animation
        document.addEventListener('DOMContentLoaded', function () {
            const loadingScreen = document.getElementById('loading-screen');
            const candyFilling = document.getElementById('candy-filling');
            const loadingPercentage = document.getElementById('loading-percentage');
            const glucoseDots = document.querySelector('.glucose-dots');

            let progress = 0;

            // Show loading screen
            loadingScreen.style.opacity = 1;
            loadingScreen.style.visibility = 'visible';

            // Start loading animation
            setTimeout(() => {
                glucoseDots.style.opacity = 1;
            }, 500);

            // Simulate loading progress
            const interval = setInterval(() => {
                progress += Math.random() * 10;

                if (progress > 100) progress = 100;

                // Update candy bar filling
                candyFilling.style.width = `${progress}%`;

                // Update percentage text
                loadingPercentage.textContent = `${Math.round(progress)}%`;

                // When loading is complete
                if (progress === 100) {
                    clearInterval(interval);

                    // Wait a moment at 100% before hiding
                    setTimeout(() => {
                        // Hide loading screen
                        loadingScreen.style.opacity = 0;
                        loadingScreen.style.visibility = 'hidden';

                        // Remove loading screen from DOM after transition
                        setTimeout(() => {
                            loadingScreen.remove();
                        }, 500);
                    }, 800);
                }
            }, 150);
        });