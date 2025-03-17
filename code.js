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

    // New variables for data-driven scenarios
    let spikeEventsData = [];
    let currentScenario = null;
    let currentScenarioIndex = 0;
    let userScore = 0;
    let gameScenarios = [];
    let mockScenariosArray = [];
    
    // Load the spike events data from JSON
    fetch('processed_data/spike_events.json')
        .then(response => response.json())
        .then(data => {
            console.log('Loaded spike events data:', data.length, 'events');
            spikeEventsData = data;
            prepareGameScenarios();
        })
        .catch(error => {
            console.error('Error loading spike events data:', error);
            // Fallback to mock data if loading fails
            createMockScenarios();
        });
    
    // Prepare game scenarios from the loaded data
    function prepareGameScenarios() {
        if (spikeEventsData.length === 0) {
            createMockScenarios();
            return;
        }
        
        // Filter for interesting spike events (significant rise, clear pattern)
        const goodScenarios = spikeEventsData.filter(event => {
            // Ensure we have a meaningful spike
            const spikeValue = event.SpikeValue;
            const baselineValue = event.BaselineValue;
            const spike = spikeValue - baselineValue;
            
            // Only use events with significant spikes (>40 mg/dL) and complete response curve
            return spike > 40 && event.ResponseCurve && event.ResponseCurve.length > 10;
        });
        
        if (goodScenarios.length === 0) {
            createMockScenarios();
            return;
        }
        
        // Group scenarios by participant ID
        const participantGroups = {};
        goodScenarios.forEach(scenario => {
            const id = scenario.ParticipantID;
            if (!participantGroups[id]) {
                participantGroups[id] = [];
            }
            participantGroups[id].push(scenario);
        });
        
        // Select one scenario from each of three different participants if possible
        const selectedScenarios = [];
        const participantIds = Object.keys(participantGroups);
        
        // Get at least 3 scenarios from different participants if possible
        for (let i = 0; i < Math.min(3, participantIds.length); i++) {
            const scenarios = participantGroups[participantIds[i]];
            // Select a random scenario from this participant
            const randomIndex = Math.floor(Math.random() * scenarios.length);
            selectedScenarios.push(scenarios[randomIndex]);
        }
        
        // If we don't have 3 scenarios yet, add more from available participants
        while (selectedScenarios.length < 3 && participantIds.length > 0) {
            for (let i = 0; selectedScenarios.length < 3 && i < participantIds.length; i++) {
                const scenarios = participantGroups[participantIds[i]];
                if (scenarios.length > 1) {
                    // Find a scenario we haven't used yet
                    for (let j = 0; j < scenarios.length; j++) {
                        if (!selectedScenarios.includes(scenarios[j])) {
                            selectedScenarios.push(scenarios[j]);
                            break;
                        }
                    }
                }
            }
            break; // Prevent infinite loop
        }
        
        // If we still don't have 3 scenarios, create mock ones
        if (selectedScenarios.length < 3) {
            const mockScenarios = createMockScenariosArray();
            while (selectedScenarios.length < 3) {
                selectedScenarios.push(mockScenarios[selectedScenarios.length]);
            }
        }
        
        gameScenarios = selectedScenarios;
        
        // Set first scenario
        loadScenario(0);
    }
    
    // Create a separate function to return mock scenarios without setting them
    function createMockScenariosArray() {
        return [
            {
                name: "Michael Davis",
                foodType: "White Rice",
                foodEmoji: "🍚",
                glucoseImpact: "high",
                timingWindow: "45-60",
                spikeTime: "2:00 PM",
                optimalPlacementTime: "1:10 PM",
                spikeValue: 152,
                baselineValue: 70,
                patientAge: 34,
                patientBMI: 24.5,
                patientA1C: "5.6%"
            },
            {
                name: "Emma Wilson",
                foodType: "Ice Cream",
                foodEmoji: "🍦",
                glucoseImpact: "high",
                timingWindow: "30-45",
                spikeTime: "3:30 PM",
                optimalPlacementTime: "2:50 PM",
                spikeValue: 168,
                baselineValue: 85,
                patientAge: 41,
                patientBMI: 26.3,
                patientA1C: "5.8%"
            },
            {
                name: "James Rodriguez",
                foodType: "Apple",
                foodEmoji: "🍎",
                glucoseImpact: "medium",
                timingWindow: "30-45",
                spikeTime: "11:15 AM",
                optimalPlacementTime: "10:40 AM",
                spikeValue: 142,
                baselineValue: 92,
                patientA1C: "5.4%",
                patientAge: 29,
                patientBMI: 23.1
            }
        ];
    }
    
    // Create mock scenarios if no data is available
    function createMockScenarios() {
        console.log('Creating mock scenarios');
        gameScenarios = createMockScenariosArray();
        
        // Load first scenario
        loadScenario(0);
    }
    
    // Load a specific scenario
    function loadScenario(index) {
        console.log("Loading scenario at index:", index);
        
        // Update the current scenario index
        currentScenarioIndex = index;
        
        if (spikeEventsData && spikeEventsData.length > 0) {
            // Use real data if available
            currentScenario = gameScenarios[index % gameScenarios.length];
            console.log("Loaded scenario:", currentScenario);
        } else {
            // Fallback to mock data
            if (!mockScenariosArray || mockScenariosArray.length === 0) {
                mockScenariosArray = createMockScenariosArray();
            }
            currentScenario = mockScenariosArray[index % mockScenariosArray.length];
            console.log("Loaded mock scenario:", currentScenario);
        }
        
        // Update the UI with the new scenario data
        updatePatientProfile();
        updateGlucoseSpike();
        updateFoodOptions();
        
        // Ensure the submit button is properly configured
        const submitButton = document.getElementById('submit-analysis-btn');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.remove('active');
        }
    }
    
    // Update patient profile based on current scenario
    function updatePatientProfile() {
        let name, age, bmi, a1c, fasting;
        
        // Map patient IDs to real names
        const patientNames = {
            '001': 'Sarah Johnson',
            '003': 'Michael Davis',
            '006': 'Emma Wilson',
            '007': 'James Rodriguez',
            '009': 'Olivia Chen',
            '012': 'Noah Thompson',
            '014': 'Sophia Martinez'
        };
        
        if (currentScenario.FoodEvent) {
            // Using real data
            const participantId = currentScenario.ParticipantID;
            // Use mapped name or fallback to a generated name if ID not in map
            name = patientNames[participantId] || `Alex Patient-${participantId}`;
            age = 30 + Math.floor(participantId.charCodeAt(participantId.length-1) % 20); // Generate consistent age
            bmi = 22 + (participantId.charCodeAt(participantId.length-1) % 8); // Generate consistent BMI
            a1c = (5.3 + (participantId.charCodeAt(participantId.length-1) % 10) / 10).toFixed(1) + "%";
            fasting = Math.floor(currentScenario.BaselineValue);
        } else {
            // Using mock data
            name = currentScenario.name;
            age = currentScenario.patientAge;
            bmi = currentScenario.patientBMI;
            a1c = currentScenario.patientA1C;
            fasting = currentScenario.baselineValue;
        }
        
        // Update the DOM
        document.querySelector('.patient-profile h3').textContent = `Patient Profile: ${name}`;
        document.querySelectorAll('.stat-item').forEach(item => {
            const label = item.querySelector('.stat-label').textContent;
            if (label === 'Age') {
                item.querySelector('.stat-value').textContent = age;
            } else if (label === 'BMI') {
                item.querySelector('.stat-value').textContent = bmi;
            } else if (label === 'A1C') {
                item.querySelector('.stat-value').textContent = a1c;
            } else if (label === 'Fasting Glucose') {
                item.querySelector('.stat-value').textContent = `${fasting} mg/dL`;
            }
        });
        
        // Update glucose alert
        const spikeTime = getSpikeTimeFormatted();
        const spikeValue = getSpikeValue();
        
        const alertElement = document.querySelector('.glucose-alert p');
        if (alertElement) {
            alertElement.innerHTML = `
                ${name} experienced a <strong>glucose spike of ${spikeValue} mg/dL at ${spikeTime}</strong> today. 
                ${name} reported feeling fatigued, mildly thirsty, and had difficulty concentrating around this time.
            `;
        }

        // Update challenge box text
        const challengeBox = document.querySelector('.challenge-box');
        if (challengeBox) {
            challengeBox.innerHTML = `
                <p>${name} is using continuous glucose monitoring to understand how different foods affect their levels, 
                but doesn't remember exactly when they ate before this spike occurred.</p>
                <p><strong>Your Challenge:</strong> Look at ${name}'s glucose spike at ${spikeTime}. 
                When do you think they ate something that caused this response?</p>
            `;
        }

        // Fix the pronouns in the recommendations
        const feedbackDiv = document.querySelector('.feedback');
        if (feedbackDiv) {
            const paragraphs = feedbackDiv.querySelectorAll('p');
            paragraphs.forEach(p => {
                p.innerHTML = p.innerHTML.replace('Patient #001', name);
                // Use appropriate pronouns (simplified approach)
                const firstNameLower = name.split(' ')[0].toLowerCase();
                if (firstNameLower === 'sarah' || firstNameLower === 'emma' || firstNameLower === 'olivia' || firstNameLower === 'sophia') {
                    p.innerHTML = p.innerHTML.replace(/\bthey\b/g, 'she');
                    p.innerHTML = p.innerHTML.replace(/\btheir\b/g, 'her');
                } else {
                    p.innerHTML = p.innerHTML.replace(/\bthey\b/g, 'he');
                    p.innerHTML = p.innerHTML.replace(/\btheir\b/g, 'his');
                }
            });
            
            // Also update recommendation header
            const recommendationHeader = feedbackDiv.querySelector('div h4');
            if (recommendationHeader) {
                recommendationHeader.textContent = `Recommendations for ${name}:`;
            }
        }
    }
    
    // Get formatted spike time for display
    function getSpikeTimeFormatted() {
        if (currentScenario.FoodEvent) {
            // Real data - convert ISO timestamp to formatted time
            const spikeTime = new Date(currentScenario.SpikeTime);
            let hours = spikeTime.getHours();
            const minutes = spikeTime.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours}:${minutes} ${ampm}`;
        } else {
            // Mock data
            return currentScenario.spikeTime;
        }
    }
    
    // Get spike value
    function getSpikeValue() {
        return currentScenario.FoodEvent ? 
            Math.round(currentScenario.SpikeValue) : 
            currentScenario.spikeValue;
    }
    
    // Get baseline value
    function getBaselineValue() {
        return currentScenario.FoodEvent ? 
            Math.round(currentScenario.BaselineValue) : 
            currentScenario.baselineValue;
    }
    
    // Update glucose spike visualization on the clock
    function updateGlucoseSpike() {
        const spikeTime = getSpikeTimeFormatted();
        const spikeValue = getSpikeValue();
        
        // Convert time to angle
        let angle = 0;
        if (currentScenario.FoodEvent) {
            const spikeTimeObj = new Date(currentScenario.SpikeTime);
            const hours = spikeTimeObj.getHours();
            const minutes = spikeTimeObj.getMinutes();
            angle = ((hours % 12) * 30) + (minutes / 2); // 30 degrees per hour, 0.5 degrees per minute
        } else {
            // Parse mock time (e.g., "2:00 PM")
            const timeMatch = currentScenario.spikeTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const ampm = timeMatch[3].toUpperCase();
                
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                
                angle = ((hours % 12) * 30) + (minutes / 2);
            }
        }
        
        // Update the spike visualization
        const spikePath = document.getElementById('glucose-spike');
        const spikeMarker = document.querySelector('#glucose-event circle');
        const spikeLabel = document.querySelector('#glucose-event text');
        
        // Calculate position for spike peak
        const point = polarToCartesian(300, 300, 270, angle);
        
        // Update spike visualization
        let pathD = `M300,300 L${point.x},${point.y}`;
        
        // Add a curve to make it look like a spike
        const controlPoints = generateSpikeControlPoints(300, 300, point.x, point.y);
        pathD += ` C${controlPoints[0].x},${controlPoints[0].y} ${controlPoints[1].x},${controlPoints[1].y} ${controlPoints[2].x},${controlPoints[2].y}`;
        pathD += ` C${controlPoints[3].x},${controlPoints[3].y} ${controlPoints[4].x},${controlPoints[4].y} 320,280 Z`;
        
        spikePath.setAttribute('d', pathD);
        spikePath.setAttribute('fill', 'rgba(255, 107, 107, 0.2)');
        spikePath.setAttribute('stroke', '#FF6B6B');
        
        // Update marker and label
        spikeMarker.setAttribute('cx', point.x);
        spikeMarker.setAttribute('cy', point.y);
        spikeLabel.setAttribute('x', point.x);
        spikeLabel.setAttribute('y', point.y - 15);
        spikeLabel.textContent = `${spikeValue} mg/dL`;
        
        // Update legend text outside the SVG
        const legendTexts = document.querySelectorAll('.clock-container + div span:nth-child(2)');
        if (legendTexts.length >= 1) {
            legendTexts[0].textContent = `Glucose Spike (${spikeTime})`;
        }
    }
    
    // Helper function to generate control points for the spike curve
    function generateSpikeControlPoints(cx, cy, peakX, peakY) {
        // Calculate distance and angle from center to peak
        const dx = peakX - cx;
        const dy = peakY - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Create control points at various distances along the curve
        return [
            { x: cx + Math.cos(angle) * distance * 0.5, y: cy + Math.sin(angle) * distance * 0.5 - 50 },
            { x: cx + Math.cos(angle) * distance * 0.7, y: cy + Math.sin(angle) * distance * 0.7 - 40 },
            { x: cx + Math.cos(angle) * distance * 0.6, y: cy + Math.sin(angle) * distance * 0.6 - 30 },
            { x: cx + Math.cos(angle) * distance * 0.4, y: cy + Math.sin(angle) * distance * 0.4 - 20 },
            { x: cx + Math.cos(angle) * distance * 0.2, y: cy + Math.sin(angle) * distance * 0.2 - 10 }
        ];
    }
    
    // Update available food options based on data
    function updateFoodOptions() {
        // If we have real food data
        if (currentScenario.FoodEvent && currentScenario.FoodEvent.Description) {
            // Try to extract food name or use default options
            let foodName = currentScenario.FoodEvent.Description;
            let category = currentScenario.FoodEvent.GlycemicCategory || 'unknown';
            
            // Clean up food name if it's just a date
            if (foodName.match(/^\d{4}-\d{2}-\d{2}/)) {
                // Use category to determine food type
                if (category === 'high') {
                    foodName = 'White Rice';
                } else if (category === 'medium') {
                    foodName = 'Apple';
                } else if (category === 'low') {
                    foodName = 'Salad';
                } else {
                    // Try to extract food from spike pattern
                    const spike = currentScenario.SpikeValue - currentScenario.BaselineValue;
                    if (spike > 70) {
                        foodName = 'White Rice';
                        category = 'high';
                    } else if (spike > 40) {
                        foodName = 'Burger';
                        category = 'high';
                    } else if (spike > 20) {
                        foodName = 'Apple';
                        category = 'medium';
                    } else {
                        foodName = 'Salad';
                        category = 'low';
                    }
                }
            }
            
            // Ensure food options include the relevant food
            // No need to modify UI here - the standard food options work fine
        }
    }
    
    // Function to calculate score based on food placement
    function calculateScore(placedFood) {
        // Get the expected optimal time window
        let optimalTimeWindow, placedTimeValue;
        
        // Get ideal timing window based on scenario
        if (currentScenario.FoodEvent) {
            // For real data, calculate time difference between food and spike
            const spikeTime = new Date(currentScenario.SpikeTime);
            const spikeHours = spikeTime.getHours();
            const spikeMinutes = spikeTime.getMinutes();
            
            // Get food type from placed food
            const foodType = placedFood.dataset.food;
            
            // Determine expected delay based on food and spike rise
            let expectedDelayMinutes;
            const foodTiming = placedFood.dataset.timing;
            if (foodTiming) {
                // Extract timing from data attribute (e.g., "30-45" to mean 30-45 minutes)
                const timingParts = foodTiming.split('-');
                if (timingParts.length === 2) {
                    expectedDelayMinutes = (parseInt(timingParts[0]) + parseInt(timingParts[1])) / 2;
                } else if (foodTiming === 'minimal') {
                    expectedDelayMinutes = 15; // For minimal impact foods
                } else {
                    expectedDelayMinutes = 45; // Default
                }
            } else {
                expectedDelayMinutes = 45; // Default
            }
            
            // Calculate optimal placement time by going back from spike time
            const optimalTime = new Date(spikeTime);
            optimalTime.setMinutes(optimalTime.getMinutes() - expectedDelayMinutes);
            
            // Create time windows for scoring
            optimalTimeWindow = {
                best: { 
                    start: expectedDelayMinutes - 10,
                    end: expectedDelayMinutes + 10
                },
                good: {
                    start: expectedDelayMinutes - 20,
                    end: expectedDelayMinutes + 20
                },
                acceptable: {
                    start: expectedDelayMinutes - 30,
                    end: expectedDelayMinutes + 30
                }
            };
            
            // Parse placed time
            const placedTime = placedFood.dataset.time; // Format: "1:40 PM"
            const placedTimeParts = placedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (placedTimeParts) {
                let hours = parseInt(placedTimeParts[1]);
                const minutes = parseInt(placedTimeParts[2]);
                const ampm = placedTimeParts[3].toUpperCase();
                
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                
                // Calculate minutes difference between placed time and spike time
                const placedTimeObj = new Date();
                placedTimeObj.setHours(hours, minutes, 0, 0);
                
                const spikeTimeObj = new Date();
                spikeTimeObj.setHours(spikeHours, spikeMinutes, 0, 0);
                
                // Calculate time difference in minutes (spike time - placed time)
                placedTimeValue = (spikeTimeObj - placedTimeObj) / (1000 * 60);
                
                // Handle edge case around midnight
                if (placedTimeValue < -12*60) placedTimeValue += 24*60;
                if (placedTimeValue > 12*60) placedTimeValue -= 24*60;
            }
        } else {
            // For mock data
            // Parse optimal placement time (e.g., "1:10 PM")
            const optimalTime = currentScenario.optimalPlacementTime;
            const timingWindow = currentScenario.timingWindow.split('-');
            const minTiming = parseInt(timingWindow[0]);
            const maxTiming = parseInt(timingWindow[1]);
            
            optimalTimeWindow = {
                best: { 
                    start: minTiming - 5,
                    end: maxTiming + 5
                },
                good: {
                    start: minTiming - 10,
                    end: maxTiming + 10
                },
                acceptable: {
                    start: minTiming - 15,
                    end: maxTiming + 15
                }
            };
            
            // Calculate time difference
            const spikeTime = parseTimeString(currentScenario.spikeTime);
            const placedTime = parseTimeString(placedFood.dataset.time);
            placedTimeValue = (spikeTime - placedTime) / (1000 * 60);
        }
        
        // Calculate score based on how close the placed time is to optimal
        let score = 0;
        let feedbackMessage = '';
        
        // First, make sure the food was placed BEFORE the spike (positive placedTimeValue)
        if (placedTimeValue <= 0) {
            // Food placed after or at the spike time - doesn't make sense chronologically
            score = 0;
            feedbackMessage = "Food must be placed BEFORE the glucose spike. This timing is impossible.";
        } else if (placedTimeValue >= optimalTimeWindow.best.start && 
                  placedTimeValue <= optimalTimeWindow.best.end) {
            // Excellent placement
            score = 85 + Math.floor(Math.random() * 16); // 85-100
            feedbackMessage = "Excellent timing! This is very likely what caused the glucose spike.";
        } else if (placedTimeValue >= optimalTimeWindow.good.start && 
                  placedTimeValue <= optimalTimeWindow.good.end) {
            // Good placement
            score = 70 + Math.floor(Math.random() * 15); // 70-84
            feedbackMessage = "Good timing! Your placement is reasonably close to when the food likely caused the spike.";
        } else if (placedTimeValue >= optimalTimeWindow.acceptable.start && 
                  placedTimeValue <= optimalTimeWindow.acceptable.end) {
            // Acceptable placement
            score = 55 + Math.floor(Math.random() * 15); // 55-69
            feedbackMessage = "Acceptable timing. This food might have contributed to the spike at this time.";
        } else if (placedTimeValue > 0 && placedTimeValue < 180) {
            // Poor placement but at least before the spike
            const distance = Math.min(
                Math.abs(placedTimeValue - optimalTimeWindow.acceptable.start),
                Math.abs(placedTimeValue - optimalTimeWindow.acceptable.end)
            );
            // Score decreases as distance from acceptable range increases
            score = Math.max(30, 55 - Math.floor(distance / 5) * 5);
            feedbackMessage = "Not quite right. The timing doesn't align well with typical glucose responses.";
        } else {
            // Too far from spike time (> 3 hours)
            score = Math.max(10, 30 - Math.floor((placedTimeValue - 180) / 30) * 5);
            feedbackMessage = "This timing is unlikely to have caused the observed spike.";
        }
        
        // Check if food type is appropriate for the spike
        const foodImpact = placedFood.dataset.impact;
        const spikeSize = getSpikeValue() - getBaselineValue();
        
        let impactScore = 0;
        let impactFeedback = "";
        
        if ((spikeSize > 60 && foodImpact === 'high') || 
            (spikeSize > 30 && spikeSize <= 60 && foodImpact === 'medium') ||
            (spikeSize <= 30 && foodImpact === 'low')) {
            // Food impact matches spike size
            impactScore = 15;
            impactFeedback = "This type of food is a good match for the observed glucose response.";
        } else if ((spikeSize > 60 && foodImpact === 'medium') ||
                  (spikeSize > 30 && spikeSize <= 60 && (foodImpact === 'high' || foodImpact === 'low')) ||
                  (spikeSize <= 30 && foodImpact === 'medium')) {
            // Food impact is close to matching spike size
            impactScore = 8;
            impactFeedback = "This food could cause this kind of response, though other foods might be more typical.";
        } else {
            // Food impact doesn't match spike size
            impactScore = 0;
            impactFeedback = "This type of food typically causes a different glucose response pattern.";
        }
        
        // Final score combines timing and food type
        const finalScore = Math.min(100, score + impactScore);
        
        return {
            score: finalScore,
            feedbackMessage: feedbackMessage,
            impactFeedback: impactFeedback,
            placedTimeValue: placedTimeValue
        };
    }
    
    // Helper function to parse time string like "1:40 PM"
    function parseTimeString(timeStr) {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const ampm = match[3].toUpperCase();
            
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            const time = new Date();
            time.setHours(hours, minutes, 0, 0);
            return time;
        }
        return null;
    }
    
    // Function to show the results after a food has been placed and submitted
    function showResults(food, time, impact, timing) {
        console.log("Showing results for", food, "at", time);
        
        const resultsPanel = document.querySelector('.results-panel');
        if (!resultsPanel) {
            console.error("Results panel not found");
            return;
        }
        
        // Replace the hardcoded score with the proper calculation
        // Calculate score based on food placement
        const placedFood = document.querySelector('.placed-food');
        const scoreData = calculateScore(placedFood);
        let score = scoreData.score; // Get the dynamic score
        
        // Get current patient name
        const patientName = document.querySelector('.patient-profile h3').textContent.replace('Patient Profile: ', '');
        const spikeTime = document.querySelector('.glucose-alert p strong').textContent.split(' at ')[1].split('</strong>')[0];
        const spikeValue = parseInt(document.querySelector('.glucose-alert p strong').textContent.split(' of ')[1].split(' mg')[0]);
        const baselineValue = parseInt(document.querySelector('.stat-item:nth-child(4) .stat-value').textContent);
        
        // Update results content
        document.getElementById('placed-food-name').textContent = food.charAt(0).toUpperCase() + food.slice(1);
        document.getElementById('placed-food-time').textContent = time;
        document.getElementById('food-timing').textContent = timing;
        document.getElementById('glycemic-impact').textContent = impact;
        
        // Calculate glucose delta
        const glucoseDelta = spikeValue - baselineValue;
        
        // Update score
        document.querySelector('.score').textContent = `Score: ${score}/100`;
        
        // Update feedback text based on score
        let feedbackMessage = '';
        if (score >= 85) {
            feedbackMessage = "Excellent timing! This is very likely what caused the glucose spike.";
        } else if (score >= 70) {
            feedbackMessage = "Good timing! Your placement is reasonably close to when the food likely caused the spike.";
        } else if (score >= 55) {
            feedbackMessage = "Acceptable timing. This food might have contributed to the spike at this time.";
        } else {
            feedbackMessage = "Not quite right. The timing doesn't align well with typical glucose responses.";
        }
        
        // Update feedback based on food timing and score
        document.querySelector('.feedback p:nth-child(1)').innerHTML = 
            `<strong>${feedbackMessage}</strong>`;
        
        document.querySelector('.feedback p:nth-child(2)').innerHTML = 
            `The ${food} you placed at ${time} typically causes glucose to rise within ${timing} minutes, 
            which ${score >= 70 ? 'aligns well with' : "doesn't align perfectly with"} the ${spikeTime} spike ${patientName} experienced.`;
        
        // Update insights
        document.querySelector('.feedback p:nth-child(4)').innerHTML = 
            `This food raised ${patientName}'s glucose by approximately <strong>${glucoseDelta} mg/dL</strong> 
            at its peak (from baseline of ${baselineValue} mg/dL to ${spikeValue} mg/dL). 
            The response lasted about <strong>2.5 hours</strong> before returning to baseline.`;
        
        // Update impact info
        const pronouns = patientName.split(' ')[0].toLowerCase() === 'sarah' || 
                         patientName.split(' ')[0].toLowerCase() === 'emma' ? 
                         { pronoun: 'she', possessive: 'her' } : 
                         { pronoun: 'he', possessive: 'his' };
        
        document.querySelector('.feedback p:nth-child(5)').innerHTML = 
            `For ${patientName}, this food is a <strong>${impact}</strong> glycemic impact food.
            ${pronouns.pronoun.charAt(0).toUpperCase() + pronouns.pronoun.slice(1)} might consider pairing it with protein or healthy fats to reduce the spike in the future.
            ${scoreData.impactFeedback || 'This food could cause this kind of response, though other foods might be more typical.'}`;
        
        // Update recommendations header
        document.querySelector('.feedback div h4').textContent = `Recommendations for ${patientName}:`;
        
        // Show results panel
        resultsPanel.style.display = 'block';
        
        // Hide submit button
        const submitButton = document.getElementById('submit-analysis-btn');
        if (submitButton) {
            submitButton.style.display = 'none';
        }
        
        // Scroll to results
        resultsPanel.scrollIntoView({ behavior: 'smooth' });
        
        console.log("Results displayed with score:", score);
    }
    
    // Reset game state for a new scenario
    function resetGameState() {
        console.log("Resetting game state"); // Debug log
        
        // Use the cleanup function to remove all food elements
        cleanupOrphanedFoodElements();
        
        // Reset food options - make them all draggable again
        const foodOptions = document.querySelectorAll('.food-option');
        foodOptions.forEach(option => {
            option.classList.add('draggable');
            option.style.opacity = '1';
        });
        
        // Hide time indicator
        const timeIndicatorLine = document.getElementById('time-indicator-line');
        const timeIndicatorLabel = document.getElementById('time-indicator-label');
        if (timeIndicatorLine) timeIndicatorLine.style.display = 'none';
        if (timeIndicatorLabel) timeIndicatorLabel.style.display = 'none';
        
        // Reset drop target
        const dropTarget = document.getElementById('drop-target');
        if (dropTarget) dropTarget.style.display = 'none';
    }

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
        // For our clock, 0 degrees = 12:00, 30 degrees = 1:00, etc.
        // We want to map this to afternoon hours (12 PM to 12 AM)
        let hours = Math.floor(angleInDegrees / 30) + 12;
        if (hours > 12 && hours < 24) {
            // Keep as PM hours (1 PM to 11 PM)
        } else if (hours >= 24) {
            hours = hours - 12; // Convert 24+ to 12 AM, etc.
        }
        
        // Calculate minutes (each degree = 2 minutes)
        let minutes = Math.floor((angleInDegrees % 30) * 2);
        
        // Format with AM/PM
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours > 12 ? hours - 12 : hours;
        
        return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }

    // Initialize drag and drop functionality
    draggableItems.forEach(item => {
        item.addEventListener('mousedown', startDrag);
    });

    function startDrag(e) {
        console.log("Start drag", e.target);
        e.preventDefault();
        
        // Clean up any orphaned food elements before starting a new drag
        cleanupOrphanedFoodElements();
        
        // Remember which item is being dragged
        draggedItem = e.target;
        draggedItem.classList.add('dragging');
        
        // Create a clone for dragging
        const clone = draggedItem.cloneNode(true);
        clone.id = 'drag-clone';
        clone.style.position = 'absolute';
        clone.style.zIndex = '1000';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.8';
        clone.style.transform = 'scale(1.2)';
        document.body.appendChild(clone);
        
        // Position the clone at the cursor
        const rect = draggedItem.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        clone.style.left = (e.clientX - offsetX) + 'px';
        clone.style.top = (e.clientY - offsetY) + 'px';
        
        // Add global event listeners for drag
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', endDrag);
        
        // Show the drop target on the clock
        const dropTarget = document.getElementById('drop-target');
        if (dropTarget) {
            dropTarget.style.display = 'block';
        }
        
        // Initial position update
        moveDrag(e);
    }

    function moveDrag(e) {
        // Move the clone to follow the cursor
        const clone = document.getElementById('drag-clone');
        if (clone) {
            clone.style.left = (e.clientX - 20) + 'px';  // Offset slightly for better visibility
            clone.style.top = (e.clientY - 20) + 'px';
        }
        
        // Show time indicator when hovering over clock
        if (!clockContainer) return;
        
        const clockRect = clockContainer.getBoundingClientRect();
        const clockCenterX = clockRect.left + clockRect.width / 2;
        const clockCenterY = clockRect.top + clockRect.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(e.clientX - clockCenterX, 2) +
            Math.pow(e.clientY - clockCenterY, 2)
        );
        
        // If mouse is over the clock
        if (distance <= clockRect.width / 2) {
            // Calculate angle
            const angle = calculateAngle(
                clockCenterX,
                clockCenterY,
                e.clientX,
                e.clientY
            );
            
            // Format time string
            const timeStr = formatTime(angle);
            
            // Update time indicator
            const timeIndicatorLine = document.getElementById('time-indicator-line');
            const timeIndicatorLabel = document.getElementById('time-indicator-label');
            
            if (timeIndicatorLine) {
                // Calculate endpoint for the time indicator line
                const point = polarToCartesian(300, 300, 250, angle);
                
                // Set line endpoints
                timeIndicatorLine.setAttribute('x1', '300');
                timeIndicatorLine.setAttribute('y1', '300');
                timeIndicatorLine.setAttribute('x2', point.x);
                timeIndicatorLine.setAttribute('y2', point.y);
                
                // Show the line
                timeIndicatorLine.style.display = 'block';
            }
            
            if (timeIndicatorLabel) {
                // Calculate position for the time label
                const point = polarToCartesian(300, 300, 270, angle);
                
                // Convert SVG point to screen coordinates
                const svgElement = document.getElementById('glucose-clock');
                const svgPoint = svgElement.createSVGPoint();
                svgPoint.x = point.x;
                svgPoint.y = point.y;
                
                const screenPoint = svgPoint.matrixTransform(svgElement.getScreenCTM());
                
                // Position the label
                timeIndicatorLabel.style.left = (screenPoint.x - clockRect.left - 30) + 'px';
                timeIndicatorLabel.style.top = (screenPoint.y - clockRect.top - 25) + 'px';
                
                // Set the label text and show it
                timeIndicatorLabel.textContent = timeStr;
                timeIndicatorLabel.style.display = 'block';
            }
        } else {
            // Hide time indicator when not over the clock
            const timeIndicatorLine = document.getElementById('time-indicator-line');
            const timeIndicatorLabel = document.getElementById('time-indicator-label');
            
            if (timeIndicatorLine) timeIndicatorLine.style.display = 'none';
            if (timeIndicatorLabel) timeIndicatorLabel.style.display = 'none';
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
            placedFood.dataset.angle = angle.toString(); // Store the angle for later use

            placedFood.style.left = (screenPoint.x - clockRect.left) + 'px';
            placedFood.style.top = (screenPoint.y - clockRect.top) + 'px';

            clockContainer.appendChild(placedFood);

            // Call updateSubmitButton to enable the submit button
            updateSubmitButton();

            // Show notification
            const notification = document.getElementById('prediction-notification');
            if (notification) {
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

    // Update the updateSubmitButton function to properly enable the button
    function updateSubmitButton() {
        console.log("Updating submit button state");
        const placedFood = document.querySelector('.placed-food');
        const submitButton = document.getElementById('submit-analysis-btn');
        
        if (!submitButton) {
            console.error("Submit button not found");
            return;
        }
        
        if (placedFood) {
            console.log("Food placed, enabling submit button");
            submitButton.disabled = false;
            submitButton.classList.add('active');
            submitButton.style.display = 'block';
            
            // Add a subtle animation to draw attention to the button
            submitButton.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.05)' },
                { transform: 'scale(1)' }
            ], {
                duration: 600,
                iterations: 3
            });
        } else {
            console.log("No food placed, disabling submit button");
            submitButton.disabled = true;
            submitButton.classList.remove('active');
        }
    }

    // Directly add the submit button event listener
    const submitBtn = document.getElementById('submit-analysis-btn');
    if (submitBtn) {
        console.log("Setting up submit button event listener");
        submitBtn.addEventListener('click', function() {
            console.log("Submit button clicked");
            const placedFood = document.querySelector('.placed-food');
            if (placedFood) {
                const foodName = placedFood.dataset.food;
                const placedTime = placedFood.dataset.time;
                const impact = placedFood.dataset.impact;
                const timing = placedFood.dataset.timing;
                showResults(foodName, placedTime, impact, timing);
            }
        });
    } else {
        console.error("Submit button not found in the DOM");
    }

    // Handle "Try Another" button
    if (tryAnotherBtn) {
        tryAnotherBtn.addEventListener('click', function() {
            tryAnotherAnalysis();
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

// Function to clean up any orphaned food elements
function cleanupOrphanedFoodElements() {
    console.log("Cleaning up orphaned food elements");
    
    // Remove any existing placed food elements
    const placedFoods = document.querySelectorAll('.placed-food');
    placedFoods.forEach(food => {
        console.log("Removing orphaned food element:", food);
        food.remove();
    });
    
    // Remove any drag clones that might still exist
    const dragClones = document.querySelectorAll('#drag-clone');
    dragClones.forEach(clone => {
        console.log("Removing orphaned drag clone:", clone);
        clone.remove();
    });
    
    // Remove any ghost food elements
    const ghostFoods = document.querySelectorAll('.ghost-food');
    ghostFoods.forEach(ghost => {
        console.log("Removing orphaned ghost food:", ghost);
        ghost.remove();
    });
}

// Function to reset the game and load a new scenario
function tryAnotherAnalysis() {
    console.log("Try another analysis clicked");
    
    try {
        // Hide results panel first
        const resultsPanel = document.querySelector('.results-panel');
        if (resultsPanel) {
            resultsPanel.style.display = 'none';
        }
        
        // Initialize scenarios if they don't exist
        if (!window.scenarios || !Array.isArray(window.scenarios) || window.scenarios.length === 0) {
            console.log("Scenarios not found or empty, initializing new scenarios");
            prepareGameScenarios();
        }
        
        // Get current scenario index, default to 0 if not set
        if (typeof window.currentScenarioIndex !== 'number') {
            window.currentScenarioIndex = 0;
        }
        
        // Increment scenario index with wraparound
        window.currentScenarioIndex = (window.currentScenarioIndex + 1) % window.scenarios.length;
        console.log("Moving to scenario index:", window.currentScenarioIndex);
        
        // Thorough cleanup
        // 1. Remove placed food
        cleanupOrphanedFoodElements();
        const placedFood = document.querySelector('.placed-food');
        if (placedFood && placedFood.parentNode) {
            placedFood.parentNode.removeChild(placedFood);
        }
        
        // 2. Reset food options
        const foodOptions = document.querySelectorAll('.food-option');
        foodOptions.forEach(option => {
            option.classList.add('draggable');
            option.style.opacity = '1';
            // Ensure any inline styles are reset
            option.style.position = '';
            option.style.left = '';
            option.style.top = '';
            option.style.zIndex = '';
        });
        
        // 3. Reset and show submit button
        const submitButton = document.getElementById('submit-analysis-btn');
        if (submitButton) {
            submitButton.style.display = 'block';
            submitButton.disabled = true;
            submitButton.classList.remove('active');
        }
        
        // 4. Reset visual indicators
        const timeIndicatorLine = document.getElementById('time-indicator-line');
        const timeIndicatorLabel = document.getElementById('time-indicator-label');
        const dropTarget = document.getElementById('drop-target');
        
        if (timeIndicatorLine) timeIndicatorLine.style.display = 'none';
        if (timeIndicatorLabel) timeIndicatorLabel.style.display = 'none';
        if (dropTarget) dropTarget.style.display = 'none';
        
        // Load the next scenario and update UI
        if (window.scenarios && window.scenarios.length > 0 && 
            window.currentScenarioIndex < window.scenarios.length) {
            
            const nextScenario = window.scenarios[window.currentScenarioIndex];
            if (!nextScenario) {
                throw new Error("Invalid scenario at index " + window.currentScenarioIndex);
            }
            
            console.log("Loading scenario:", nextScenario);
            loadScenario(window.currentScenarioIndex);
            updatePatientProfile();
            updateGlucoseSpike();
            
            console.log("Scenario loaded successfully");
            return true;
        } else {
            console.error("No valid scenarios available");
            throw new Error("No valid scenarios available");
        }
    } catch (error) {
        console.error("Error in tryAnotherAnalysis:", error);
        
        // Fallback: try to create new scenarios on error
        try {
            console.log("Attempting fallback: creating new scenarios");
            prepareGameScenarios();
            window.currentScenarioIndex = 0;
            
            if (window.scenarios && window.scenarios.length > 0) {
                loadScenario(0);
                updatePatientProfile();
                updateGlucoseSpike();
                console.log("Fallback successful - loaded first scenario");
                return true;
            }
        } catch (fallbackError) {
            console.error("Fallback failed:", fallbackError);
        }
        
        // If we get here, both main attempt and fallback failed
        alert("There was an error loading the next scenario. Please refresh the page.");
        return false;
    }
}

// Update initGame to call cleanupOrphanedFoodElements during initialization
function initGame() {
    console.log("Initializing game...");
    
    // Clean up any orphaned food elements from previous sessions
    cleanupOrphanedFoodElements();
    
    // Make sure clockContainer is set
    clockContainer = document.querySelector('.clock-container');
    if (!clockContainer) {
        console.error("Clock container not found");
    }
    
    // Initialize food options
    const foodOptions = document.querySelectorAll('.food-option');
    foodOptions.forEach(option => {
        option.addEventListener('mousedown', startDrag);
        console.log("Added drag event to", option.textContent);
    });
    
    // Set up the submit button
    const submitBtn = document.getElementById('submit-analysis-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            console.log("Submit button clicked");
            const placedFood = document.querySelector('.placed-food');
            if (placedFood) {
                const foodName = placedFood.dataset.food;
                const placedTime = placedFood.dataset.time;
                const impact = placedFood.dataset.impact;
                const timing = placedFood.dataset.timing;
                showResults(foodName, placedTime, impact, timing);
            }
        });
        submitBtn.disabled = true;
    } else {
        console.error("Submit button not found");
    }
    
    // Set up the try another button
    const tryAnotherBtn = document.getElementById('try-another-btn');
    if (tryAnotherBtn) {
        tryAnotherBtn.addEventListener('click', function(e) {
            console.log("Try another button clicked directly");
            e.preventDefault();
            tryAnotherAnalysis();
            return false;
        });
    } else {
        console.error("Try another button not found");
    }
    
    console.log("Game initialization complete");
}

// Update resetGameState to use cleanupOrphanedFoodElements
function resetGameState() {
    console.log("Resetting game state");
    
    // Use the cleanup function to remove all food elements
    cleanupOrphanedFoodElements();
    
    // Reset food options - make them all draggable again
    const foodOptions = document.querySelectorAll('.food-option');
    foodOptions.forEach(option => {
        option.classList.add('draggable');
        option.style.opacity = '1';
    });
    
    // Hide time indicator
    const timeIndicatorLine = document.getElementById('time-indicator-line');
    const timeIndicatorLabel = document.getElementById('time-indicator-label');
    if (timeIndicatorLine) timeIndicatorLine.style.display = 'none';
    if (timeIndicatorLabel) timeIndicatorLabel.style.display = 'none';
    
    // Reset drop target
    const dropTarget = document.getElementById('drop-target');
    if (dropTarget) dropTarget.style.display = 'none';
}

// ... existing code ...
