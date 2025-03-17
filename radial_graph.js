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
    const maxGlucose = d3.max(responseCurve, d => d.Value);
    const innerRadius = 0;
    const outerRadius = 250;
    const glucoseTicks = d3.ticks(minGlucose, maxGlucose, 5);

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

        // Create a clock hand line and a popup text element, initially hidden.
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

        // Create a time scale to map 0 to 360 degrees to a 24-hour period.
        const timeScale = d3.scaleLinear()
            .domain([0, 360])
            .range([0, 24]);  // hours

        // Helper to format fractional hours into "HH:MM"
        function formatTime(hours) {
            const totalMinutes = Math.round(hours * 60);
            const hh = Math.floor(totalMinutes / 60);
            const mm = totalMinutes % 60;
            return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        }

        // Variable to track when the mouse is down.
        let isMouseDown = false;

        // Listen for mouse events on the window.
        d3.select(window)
            .on("mousedown", function (event) {
                isMouseDown = true;
                clockHand.style("display", null);
                timePopup.style("display", null);
            })
            .on("mouseup", function (event) {
                isMouseDown = false;
                clockHand.style("display", "none");
                timePopup.style("display", "none");
            })
            .on("mousemove", function (event) {
                if (!isMouseDown) return;

                // Get the mouse position relative to the SVG element.
                const [mx, my] = d3.pointer(event, svg.node());
                // Compute the vector from the center of the chart to the mouse position.
                const dx = mx - centerX;
                const dy = my - centerY;

                // Calculate the angle in radians using Math.atan2.
                // Adjust so that 0° is at the top.
                let angleRad = Math.atan2(dy, dx);
                let angleDeg = angleRad * (180 / Math.PI);
                if (angleDeg < 0) angleDeg += 360;

                // Set the hand length (for example, slightly beyond outerRadius)
                const handLength = outerRadius + 20;
                const handEnd = polarToCartesian(handLength, angleDeg);

                // Update the clock hand line (starts at the center (0,0) since we translated the group)
                clockHand
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", handEnd.x)
                    .attr("y2", handEnd.y);

                // Convert the angle into a time value (using the timeScale)
                const hours = timeScale(angleDeg);
                const timeText = formatTime(hours);

                // Position the popup text a bit further from the hand's end.
                const popupOffset = 30;
                const popupPos = polarToCartesian(handLength + popupOffset, angleDeg);

                timePopup
                    .attr("x", popupPos.x)
                    .attr("y", popupPos.y)
                    .text(timeText);

                // Optionally: rotate the popup if you want it to align with the hand
                // .attr("transform", `translate(${popupPos.x},${popupPos.y}) rotate(${angleDeg})`);
            });

    });
});

