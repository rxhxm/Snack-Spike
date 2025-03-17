let whiteRiceLine, appleLine, broccoliLine;
let filters = { high: true, medium: true, low: true };
let legendItems;

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

    // Update our filters based on the selected view option
    if (category === 'all') {
        filters = { high: true, medium: true, low: true };
    } else if (category === 'high') {
        filters = { high: true, medium: false, low: false };
    } else if (category === 'medium') {
        filters = { high: false, medium: true, low: false };
    } else if (category === 'low') {
        filters = { high: false, medium: false, low: true };
    }
    updateFilters();
}

function updateFilters() {
    // Update the display of each line based on the filters object.
    if (whiteRiceLine && appleLine && broccoliLine) {
        whiteRiceLine.style("display", filters.high ? "block" : "none");
        appleLine.style("display", filters.medium ? "block" : "none");
        broccoliLine.style("display", filters.low ? "block" : "none");
    }
    // Update legend item appearance.
    if (legendItems) {
        legendItems.select("rect")
            .attr("fill-opacity", d => filters[d.category] ? 1 : 0.3);
        legendItems.select("text")
            .style("opacity", d => filters[d.category] ? 1 : 0.3);
    }
}

function drawD3Graph() {
    d3.json("food_responses.json").then(function (data) {
        // Filter for the three foods:
        const whiteRice = data.high.find(d => d.FoodDescription.toLowerCase() === "white rice");
        const apple = data.medium.find(d => d.FoodDescription.toLowerCase() === "apple");
        const broccoli = data.low.find(d => d.FoodDescription.toLowerCase() === "broccoli");

        // Check that we have data for each food before plotting
        if (!whiteRice || !apple || !broccoli) {
            console.error("Missing one or more food items from the JSON data.");
            return;
        }

        // Set up SVG dimensions and margins
        const margin = { top: 20, right: 30, bottom: 40, left: 60 },
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        // Create SVG element inside the container with id "food-comparison-graph"
        const svg = d3.select("#food-comparison-graph")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Combine the Response arrays from all three foods to set common domains
        const combinedData = whiteRice.Response.concat(apple.Response, broccoli.Response);

        // Set the x domain using MinutesSinceFood
        const xExtent = d3.extent(combinedData, d => d.MinutesSinceFood);
        const xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([0, width]);

        // Set the y domain using the Value field (with padding)
        const yExtent = d3.extent(combinedData, d => d.Value);
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - 10, yExtent[1] + 10])
            .range([height, 0]);

        // Add x-axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(10).tickFormat(d => d + " min"));

        // Add y-axis
        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add x-axis label
        svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Time (min)");

        // Add y-axis label
        svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Glucose Level (mg/dL)");

        // Define a line generator function
        const lineGenerator = d3.line()
            .x(d => xScale(d.MinutesSinceFood))
            .y(d => yScale(d.Value));

        // Draw the White rice line (high glycemic) in red
        whiteRiceLine = svg.append("path")
            .datum(whiteRice.Response)
            .attr("fill", "none")
            .attr("stroke", "#e53935")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        // Draw the Apple line (medium glycemic) in orange
        appleLine = svg.append("path")
            .datum(apple.Response)
            .attr("fill", "none")
            .attr("stroke", "#ff9800")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        // Draw the Broccoli line (low glycemic) in green
        broccoliLine = svg.append("path")
            .datum(broccoli.Response)
            .attr("fill", "none")
            .attr("stroke", "#4caf50")
            .attr("stroke-width", 2)
            .attr("d", lineGenerator);

        // Add a chart title at the top
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Glucose Levels Over Time");

        // Create a legend group
        const legendData = [
            { name: "White Rice", color: "#e53935", category: "high" },
            { name: "Apple", color: "#ff9800", category: "medium" },
            { name: "Broccoli", color: "#4caf50", category: "low" }
        ];

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 150}, 20)`);

        legendItems = legend.selectAll(".legend-item")
            .data(legendData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 25})`)
            .style("cursor", "pointer")
            .on("click", function (event, d) {
                // Toggle the filter state for the clicked legend item 
                filters[d.category] = !filters[d.category];
                updateFilters(); 
            });

        legendItems.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => d.color)
            .attr("stroke", "#ccc");

        legendItems.append("text")
            .attr("x", 30)
            .attr("y", 15)
            .text(d => d.name)
            .style("font-size", "12px");

        updateFilters();
    }).catch(function (error) {
        console.error("Error loading JSON data:", error);
    });
}

// FOOD CONSUMPTION GRAPH INITALIZATION
document.addEventListener('DOMContentLoaded', function () {
    // Initialize with all graphs showing
    drawD3Graph();
    selectFoodCategory('all');
});