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