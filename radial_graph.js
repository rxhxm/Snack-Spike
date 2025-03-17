// Dimensions for the SVG
const width = 600,
    height = 600,
    margin = 20;

// Center coordinates
const centerX = width / 2,
    centerY = height / 2;

// Create SVG and group element
const svg = d3.select("#radial-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const g = svg.append("g")
    .attr("transform", `translate(${centerX}, ${centerY})`);

// Helper: convert polar (r, degrees) to Cartesian (x, y)
function polarToCartesian(r, angleDeg) {
    // We want angle=0 at the top (i.e., -90 in typical math).
    // So we do angleDeg - 90 so that 0 => top, 90 => right, etc.
    const angleRad = (angleDeg) * Math.PI / 180;
    return {
        x: r * Math.cos(angleRad),
        y: r * Math.sin(angleRad)
    };
}

// Import the data and then build the chart
d3.json("./processed_data/spike_events.json").then(data => {

    // Group events by ParticipantID (or choose one randomly)
    const eventsByParticipant = d3.group(data, d => d.ParticipantID);
    const participantIDs = Array.from(eventsByParticipant.keys());

    // For example, choose one participant randomly:
    const chosenID = participantIDs[Math.floor(Math.random() * participantIDs.length)];
    // Get the events for that participant – and choose the first one:
    const event = eventsByParticipant.get(chosenID)[0];
    const responseCurve = event.ResponseCurve;

    // Convert ResponseCurve timestamps to Date objects
    const parseTime = d3.isoParse; responseCurve.forEach(d => {
        d.ParsedTime = parseTime(d.Timestamp);
    });

    // Outer ring is 160 mg/dL, choose some padding so circles fit
    const minTime = d3.min(responseCurve, d => d.ParsedTime);
    const maxTime = d3.max(responseCurve, d => d.ParsedTime);
    const minGlucose = d3.min(responseCurve, d => d.Value);
    const maxGlucose = d3.max(responseCurve, d => d.Value) + 10;
    const innerRadius = 0;
    const outerRadius = 250;
    const glucoseTicks = d3.ticks(minGlucose, maxGlucose, 6);

    const rScale = d3.scaleLinear()
        .domain([minGlucose, maxGlucose])
        .range([innerRadius, outerRadius]);

    // Color scheme for rings
    const colorBelow120 = "#E3F5E8"; // light green
    const colorAbove120 = "#FFF8DC"; // light cream

    // Create arcs for each glucose band
    const arcGenerator = d3.arc()
        .startAngle(0)
        .endAngle(2 * Math.PI);

    const angleScale = d3.scaleTime()
        .domain([minTime, maxTime])
        .range([0, 2 * Math.PI]);

    // For each consecutive pair (80->100, 100->120, etc.), draw a filled arc
    for (let i = 0; i < glucoseTicks.length - 1; i++) {
        const startVal = glucoseTicks[i];
        const endVal = glucoseTicks[i + 1];

        // Decide color based on whether this band is below or above 120 mg/dL
        const fillColor = i <= glucoseTicks.length / 3 ? colorBelow120 : colorAbove120;

        g.append("path")
            .attr("fill", fillColor)
            .attr("stroke", "#ddd")  // optional ring boundary stroke
            .attr("stroke-width", 1)
            .attr("d", arcGenerator
                .innerRadius(rScale(startVal))
                .outerRadius(rScale(endVal))
            );
    }

    // Add top-aligned labels for each tick
    glucoseTicks.forEach((tickValue, i) => {
        if (i === 0) return;

        const radius = rScale(tickValue);
        // Place label at angle=0 (the top)
        const { x, y } = polarToCartesian(radius, -112.5);

        g.append("text")
            .attr("transform", `translate(${x}, ${y}) rotate(${-22.5})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .text(`${tickValue} mg/dL`);
    });

    const radialLine = d3.lineRadial()
        .angle(d => angleScale(d.ParsedTime))
        .radius(d => rScale(d.Value))
        .curve(d3.curveCardinal);

    g.append("path")
        .datum(responseCurve)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", radialLine);

    // Draw time ticks for every 3 hours: 0,3,6,9,...,21
    // We want 0 => top, 6 => right, 12 => bottom, 18 => left
    // We'll do angle = hour*15 - 90
    const hourTicks = d3.range(0, 24, 3);

    hourTicks.forEach(hour => {
        // Convert hour to angle
        // hour=0 => angle=-90 => top
        // hour=6 => angle=0 => right
        // hour=12 => angle=90 => bottom
        // hour=18 => angle=180 => left
        const angleDeg = hour * 15 - 90;

        // We'll draw a small tick line from outerRadius to outerRadius+10
        const tickStart = polarToCartesian(outerRadius, angleDeg);
        const tickEnd = polarToCartesian(outerRadius + 10, angleDeg);

        g.append("line")
            .attr("x1", tickStart.x)
            .attr("y1", tickStart.y)
            .attr("x2", tickEnd.x)
            .attr("y2", tickEnd.y)
            .attr("stroke", "#333")
            .attr("stroke-width", 2);

        // Add the hour label slightly beyond the tick
        const labelPos = polarToCartesian(outerRadius + 25, angleDeg);

        // Format hour: e.g., 0 => 00:00, 3 => 03:00, etc.
        const hourStr = String(hour).padStart(2, "0");
        g.append("text")
            .attr("x", labelPos.x)
            .attr("y", labelPos.y + 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("fill", "#333")
            .text(`${hourStr}:00`);

        // Optional: draw a small center circle
        g.append("circle")
            .attr("r", 5)
            .attr("fill", "#333");

        // Compute the maximum data point (assumes a single maximum)
        const maxDataPoint = event.ResponseCurve.reduce((max, d) => d.Value > max.Value ? d : max, event.ResponseCurve[0]);
        const maxAngleRad = angleScale(maxDataPoint.ParsedTime);
        const maxAngleDeg = maxAngleRad * (180 / Math.PI) - 90;

        // Compute the radial distance for the max glucose value
        const maxRadius = rScale(maxDataPoint.Value);

        // Get the (x,y) coordinates using polarToCartesian (which expects degrees)
        const maxPos = polarToCartesian(maxRadius, maxAngleDeg);

        // Draw a dot at the maximum point
        g.append("circle")
            .attr("cx", maxPos.x)
            .attr("cy", maxPos.y)
            .attr("r", 4)
            .attr("fill", "red");

        // Add a text label next to the dot (offset as needed)
        g.append("text")
            .attr("x", maxPos.x + 6) // shift a bit to the right
            .attr("y", maxPos.y)
            .attr("font-size", "12px")
            .attr("fill", "red")
            .attr("alignment-baseline", "middle")
            .text(`Max: ${maxDataPoint.Value} mg/dL`);

        // Global elements for the clock hand and popup on the graph
        const clockHand = g.append("line")
            .attr("id", "clock-hand")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "4,4")
            .style("display", "none");

        const timePopup = g.append("text")
            .attr("id", "time-popup")
            .attr("font-size", "12px")
            .attr("fill", "blue")
            .attr("text-anchor", "middle")
            .style("display", "none");

        // Create a time scale mapping degrees (0-360) to hours (0-24)
        const timeScale = d3.scaleLinear().domain([0, 360]).range([0, 24]);
        function formatTime(hours) {
            const totalMinutes = Math.round(hours * 60);
            const hh = Math.floor(totalMinutes / 60);
            const mm = totalMinutes % 60;
            return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        }

        // Variables to track drag state
        let currentDraggedOption = null;
        let dragIcon = null;
        let droppedFood = null;

        // Apply drag behavior to the food options
        d3.selectAll(".food-option.draggable")
            .call(d3.drag()
                .on("start", function (event, d) {
                    currentDraggedOption = d3.select(this);
                    // If an icon is already dropped on the graph, remove it and reinsert its original option
                    if (droppedFood) {
                        d3.select(".food-selection").node().appendChild(droppedFood.node());
                        droppedFood.remove();
                        droppedFood = null;
                    }
                    // Fade out and hide the original option
                    currentDraggedOption.style("opacity", 0.5).style("display", "none");

                    // Create a floating drag icon in the body using only the first character (emoji)
                    let foodText = currentDraggedOption.text().trim().split(" ")[0];
                    dragIcon = d3.select("body")
                        .append("div")
                        .attr("class", "drag-icon")
                        .style("position", "absolute")
                        .style("pointer-events", "none")
                        .style("width", "40px")
                        .style("height", "40px")
                        .style("border-radius", "50%")
                        .style("background", "#fff")
                        .style("box-shadow", "0 2px 6px rgba(0,0,0,0.3)")
                        .style("display", "flex")
                        .style("align-items", "center")
                        .style("justify-content", "center")
                        .style("font-size", "24px")
                        .html(foodText);

                    // Show the blue dotted clock hand and the time popup
                    clockHand.style("display", null);
                    timePopup.style("display", null);
                })
                .on("drag", function (event, d) {
                    // Update the drag icon position
                    dragIcon.style("left", (event.sourceEvent.pageX - 20) + "px")
                        .style("top", (event.sourceEvent.pageY - 20) + "px");

                    // Get mouse coordinates relative to the SVG
                    const [mx, my] = d3.pointer(event, svg.node());
                    // Compute vector from chart center to mouse
                    const dx = mx - centerX;
                    const dy = my - centerY;
                    let angleRad = Math.atan2(dy, dx);
                    let angleDeg = angleRad * (180 / Math.PI);
                    if (angleDeg < 0) angleDeg += 360;

                    // Set a fixed hand length (e.g., slightly beyond outerRadius)
                    const handLength = outerRadius + 20;
                    const handEnd = polarToCartesian(handLength, angleDeg);
                    // Update clock hand position (g is already centered at (centerX, centerY))
                    clockHand.attr("x1", 0)
                        .attr("y1", 0)
                        .attr("x2", handEnd.x)
                        .attr("y2", handEnd.y);

                    // Convert the angle into a time string using timeScale
                    const hours = timeScale(angleDeg);
                    const timeText = formatTime(hours);
                    // Position the time popup further out (e.g., handLength + 20)
                    const popupPos = polarToCartesian(handLength + 20, angleDeg);
                    timePopup.attr("x", popupPos.x)
                        .attr("y", popupPos.y)
                        .text(timeText);
                })
                .on("end", function (event, d) {
                    // Get mouse coordinates relative to the SVG
                    const [mx, my] = d3.pointer(event, svg.node());
                    const dx = mx - centerX;
                    const dy = my - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= outerRadius) {
                        // If dropped within the graph, remove the drag icon and create a dropped food element
                        dragIcon.remove();
                        dragIcon = null;
                        droppedFood = g.append("g")
                            .attr("class", "dropped-food")
                            .attr("transform", `translate(${mx - centerX}, ${my - centerY})`);
                        droppedFood.append("circle")
                            .attr("r", 20)
                            .attr("fill", "#fff")
                            .attr("stroke", "#333")
                            .attr("stroke-width", 1);
                        // Use the first character (emoji) for the dropped icon
                        let foodText = currentDraggedOption.text().trim().split(" ")[0];
                        droppedFood.append("text")
                            .attr("text-anchor", "middle")
                            .attr("alignment-baseline", "middle")
                            .attr("font-size", "24px")
                            .text(foodText);
                    } else {
                        // If not dropped on the graph, remove the drag icon and restore the food option
                        dragIcon.remove();
                        dragIcon = null;
                        currentDraggedOption.style("display", null)
                            .style("opacity", 1);
                    }
                    // Hide the clock hand and popup
                    clockHand.style("display", "none");
                    timePopup.style("display", "none");
                    d3.selectAll(".food-selection .food-option.draggable")
                        .style("display", null)
                        .style("opacity", 1);
                    currentDraggedOption = null;
                })
            );
    });
});

