let instantLoad = true;

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
    const clockContainer = document.querySelector('.clock-container');
    /*const draggableItems = document.querySelectorAll('.food-option.draggable');
    const clickableArea = document.getElementById('clickable-area');
    const timeIndicatorLine = document.getElementById('time-indicator-line');
    const timeIndicatorLabel = document.getElementById('time-indicator-label');*/

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
        updateFoodOptions();

        // Ensure the submit button is properly configured
        const submitButton = document.getElementById('submit-analysis-btn');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.remove('active');
        }

        let patientID = currentScenario.FoodEvent ? currentScenario.ParticipantID : currentScenario.name;
        loadChart(patientID);
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
            age = 30 + Math.floor(participantId.charCodeAt(participantId.length - 1) % 20); // Generate consistent age
            bmi = 22 + (participantId.charCodeAt(participantId.length - 1) % 8); // Generate consistent BMI
            a1c = (5.3 + (participantId.charCodeAt(participantId.length - 1) % 10) / 10).toFixed(1) + "%";
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
                if (placedTimeValue < -12 * 60) placedTimeValue += 24 * 60;
                if (placedTimeValue > 12 * 60) placedTimeValue -= 24 * 60;
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
        const placedFood = document.querySelector('.dropped-food');
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

    // Update the updateSubmitButton function to properly enable the button
    function updateSubmitButton() {
        console.log("Updating submit button state");
        const placedFood = document.querySelector('.dropped-food');
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
        submitBtn.addEventListener('click', function () {
            console.log("Submit button clicked");
            const placedFood = document.querySelector('.dropped-food');
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
        tryAnotherBtn.addEventListener('click', function () {
            tryAnotherAnalysis();
        });
    }
    /* ////////////
    NEW RADIAL CHART IMPLEMENTATION START
    ///////////// */
    function loadChart(patient) {
        const chartRotation = -90;

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
            const angleRad = (angleDeg) * Math.PI / 180;
            return {
                x: r * Math.cos(angleRad),
                y: r * Math.sin(angleRad)
            };
        }

        // Group events by ParticipantID (or choose one randomly)
        const eventsByParticipant = d3.group(spikeEventsData, d => d.ParticipantID);
        const participantIDs = Array.from(eventsByParticipant.keys());

        // For example, choose one participant randomly:
        let chosenID = patient;
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
        const minGlucose = 110; //d3.min(responseCurve, d => d.Value);
        const maxGlucose = 180; // d3.max(responseCurve, d => d.Value) + 10;
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
            .range([0, 360]);

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
            if ((tickValue === minGlucose) || (tickValue === maxGlucose)) return;

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
            .angle(d => angleScale(d.ParsedTime) * Math.PI / 180)
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
        const hourTicks = d3.range(0, 24, 0.4);

        hourTicks.forEach(hour => {
            // Convert hour to angle
            // hour=0 => angle=-90 => top
            // hour=6 => angle=0 => right
            // hour=12 => angle=90 => bottom
            // hour=18 => angle=180 => left
            const angleDeg = hour * 15 + chartRotation;

            // We'll draw a small tick line from outerRadius to outerRadius+10
            const tickStart = polarToCartesian(outerRadius - 10, angleDeg);
            const tickEnd = polarToCartesian(outerRadius + (hour % 1 != 0 ? 5 : 10), angleDeg);
            const smallTick = hour % 1 != 0 ? 1 : 2;

            g.append("line")
                .attr("x1", tickStart.x)
                .attr("y1", tickStart.y)
                .attr("x2", tickEnd.x)
                .attr("y2", tickEnd.y)
                .attr("stroke", "#333")
                .attr("stroke-width", smallTick);

            // Add the hour label slightly beyond the tick
            const labelPos = polarToCartesian(outerRadius + 25, angleDeg);

            // Format hour: e.g., 0 => 00:00, 3 => 03:00, etc.
            if (hour % 1 == 0) {
                const hourStr = String(hour).padStart(2, "0");
                g.append("text")
                    .attr("x", labelPos.x)
                    .attr("y", labelPos.y + 4)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "14px")
                    .attr("fill", "#333")
                    .text(`${hourStr}:00`);

            }

            // Outerclock Tick
            g.append("circle")
                .attr("r", outerRadius - 6) // Slightly bigger than the inner elements
                .attr("fill", "none") // No fill to make it an outline
                .attr("stroke", "#888") // Gray border
                .attr("stroke-width", 0.5); // Adjust thickness as needed

            // Optional: draw a small center circle
            g.append("circle")
                .attr("r", 20)
                .attr("fill", "none") // Makes the circle transparent
                .attr("stroke", "blue") // Sets the outline color to blue
                .attr("stroke-width", 2) // Adjusts the thickness of the outline
                .attr("stroke-dasharray", "4 4"); // Creates a dotted line effect
        });

        // Compute the maximum data point (assumes a single maximum)
        const maxDataPoint = event.ResponseCurve.reduce((max, d) => d.Value > max.Value ? d : max, event.ResponseCurve[0]);
        const maxAngleDeg = angleScale(maxDataPoint.ParsedTime) + chartRotation;

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
        g.append("foreignObject")
            .attr("x", maxPos.x + 6)
            .attr("y", maxPos.y - 15)
            .attr("width", 100)
            .attr("height", 30)
            .attr("class", "max-label")
            .html(`Max: ${maxDataPoint.Value} mg/dL`);

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
        function formatTime(hours, twelve = false) {
            const totalMinutes = Math.round(hours * 60);
            const hh = Math.floor(totalMinutes / 60);
            const mm = totalMinutes % 60;

            if (twelve) {
                const ampm = hh >= 12 ? 'PM' : 'AM';
                hours = hh > 12 ? hh - 12 : hh;
                return `${hours}:${mm.toString().padStart(2, '0')} ${ampm}`;
            } else {
                return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
            }
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
                    let angleDeg = angleRad * (180 / Math.PI) - chartRotation;
                    if (angleDeg < 0) angleDeg += 360;

                    // Set a fixed hand length (e.g., slightly beyond outerRadius)
                    const handLength = outerRadius + 20;
                    const handEnd = polarToCartesian(handLength, angleDeg + chartRotation);
                    // Update clock hand position (g is already centered at (centerX, centerY))
                    clockHand.attr("x1", 0)
                        .attr("y1", 0)
                        .attr("x2", handEnd.x)
                        .attr("y2", handEnd.y);

                    // Convert the angle into a time string using timeScale
                    const hours = timeScale(angleDeg);
                    const timeText = formatTime(hours);
                    // Position the time popup further out (e.g., handLength + 20)
                    const popupPos = polarToCartesian(handLength + 20, angleDeg + chartRotation);
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

                    // If dropped within the chart, process the drop
                    if (distance <= outerRadius) {
                        // Compute the drop angle and corresponding time string
                        let angleRad = Math.atan2(dy, dx);
                        let angleDeg = angleRad * (180 / Math.PI) - chartRotation;
                        if (angleDeg < 0) angleDeg += 360;
                        const hoursDecimal = timeScale(angleDeg);
                        const dropTime = formatTime(hoursDecimal, true); // e.g., "13:40"

                        console.log('dropTime');
                        console.log(dropTime);

                        // Remove the temporary drag icon
                        dragIcon.remove();
                        dragIcon = null;

                        // Create a dropped food element in the radial chart group
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

                        // Set data attributes on the dropped element:
                        // - 'data-time' for the drop time,
                        // - 'data-food' and others from the dragged option if needed.
                        droppedFood.attr("data-time", dropTime)
                            .attr("data-food", currentDraggedOption.attr("data-food"))
                            .attr("data-impact", currentDraggedOption.attr("data-impact"))
                            .attr("data-timing", currentDraggedOption.attr("data-timing"));

                        // Enable the submit analysis button by calling updateSubmitButton()
                        updateSubmitButton();
                    } else {
                        // If not dropped on the chart, remove the drag icon and restore original display.
                        dragIcon.remove();
                        dragIcon = null;
                        currentDraggedOption.style("display", null).style("opacity", 1);
                    }

                    // Hide the clock hand and time popup
                    clockHand.style("display", "none");
                    timePopup.style("display", "none");
                    d3.selectAll(".food-selection .food-option.draggable")
                        .style("display", null)
                        .style("opacity", 1);
                    currentDraggedOption = null;
                })
            );
    }

    /* ////////////
    NEW RADIAL CHART IMPLEMENTATION END
    ///////////// */

});

// Initialize the animation when document is loaded
document.addEventListener('DOMContentLoaded', function () {
    init();
});

/* ////////////
FUN FACT LISTENERS
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
LOADING SCREEN
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
        progress += instantLoad ? 100 : Math.random() * 10;

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
            }, instantLoad ? 10 : 800);
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
        const placedFood = document.querySelector('.dropped-food');
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
        submitBtn.addEventListener('click', function () {
            console.log("Submit button clicked");
            const placedFood = document.querySelector('.dropped-food');
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
        tryAnotherBtn.addEventListener('click', function (e) {
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

/* ////////////////////////////////
Understanding Glucose Spikes Graph
////////////////////////////////*/

// Function to format hour (e.g., 8.5 -> 08:30)
function formatHour(hour) {
    // Get the integer part (hours) and the decimal part (minutes)
    const hours = Math.floor(hour);  // Get the hours
    const minutes = Math.round((hour - hours) * 60);  // Get the minutes

    // Format the hour and minute as H:MM
    return `${hours}:${minutes.toString().padStart(2, '0')}`;  // Pad minutes to always be two digits
}

let dailyPatternsData = [];  // Make sure it's defined in the outer scope

document.addEventListener('DOMContentLoaded', function () {
    fetch('processed_data/daily_patterns.json')
        .then(response => response.json())
        .then(data => {
            console.log('Loaded daily patterns data:', data.length, 'events');
            dailyPatternsData = data;
            console.log(dailyPatternsData);

            // Automatically draw the graph after data is loaded
            drawUnderstandingGlucoseGraph();
        })
        .catch(error => {
            console.error('Error loading spike events data:', error);
        });
});

function drawUnderstandingGlucoseGraph() {
    if (!dailyPatternsData.length) {
        console.warn("No data available yet, skipping graph update.");
        return;
    }

    // Extract glucose data for a single participant (adjust as needed)
    let glucoseData = dailyPatternsData[4].GlucoseData;

    console.log("Drawing graph with glucose data:", glucoseData);  // Debugging log

    // Set up SVG dimensions
    const width = 700, height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    // Define scales
    const xScale = d3.scaleLinear()
        .domain([0, 24]) // HourOfDay ranges from 0 to 24
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([60, 180]) // Adjust based on glucose levels
        .range([height - margin.bottom, margin.top]);

    // Define line generator
    const line = d3.line()
        .x(d => xScale(d.HourOfDay)) // Convert fraction of day to hours
        .y(d => yScale(d.Value))
        .curve(d3.curveMonotoneX);

    // Select SVG and update path
    const svg = d3.select("#dailyPatternGraph");

    svg.selectAll("path.glucose-line").remove();
    svg.selectAll(".tooltip-overlay").remove();
    svg.selectAll(".hover-dot").remove();
    svg.selectAll(".glucose-label").remove();
    svg.selectAll("g.x-axis, g.y-axis, g.grid").remove();
    svg.selectAll("rect.healthy-range, text.healthy-label").remove();

    // Add the Title
    svg.append("text")
        .attr("x", 350)  // Centered in the middle of the SVG (width = 700)
        .attr("y", -10)   // Position near the top of the graph
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")  // Center text horizontally
        .attr("fill", "#333")
        .attr("font-weight", "bold")
        .text("Glucose Levels Throughout a Day");

    // Add the Subtitle
    svg.append("text")
        .attr("x", 350)  // Centered in the middle of the SVG (width = 700)
        .attr("y", 10)   // Position just below the title
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")  // Center text horizontally
        .attr("fill", "#666")
        .text("Notice how each meal causes a different spike pattern based on what was eaten");

    // Add Healthy Range Box (up to y=100)
    const yHealthy = yScale(99);

    // Add Healthy Range Label
    svg.append("text")
        .attr("class", "healthy-label")
        .attr("x", margin.left + 10)
        .attr("y", yHealthy + 20)  // Position inside the box
        .attr("font-size", 12)
        .attr("fill", "#388e3c")
        .text("Healthy Fasting Range");

    // Append Y Gridlines (horizontal)
    svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(yScale.ticks(5))  // Number of gridlines = ticks
        .join("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#ddd")  // Light gray gridlines
        .attr("stroke-width", 1);

    // Healthy Range Box
    svg.append("rect")
        .attr("class", "healthy-range")
        .attr("x", margin.left)
        .attr("y", 180)
        .attr("width", width - margin.left - margin.right)
        .attr("height", yScale(70) - yHealthy)  // Height from y=100 to bottom
        .attr("fill", "rgba(150, 220, 150, 0.2)")  // Light green
        .attr("stroke", "#4CAF50")  // Green border
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");  // Dashed border

    const mealTimes = [
        { hour: 9.75, label: "Breakfast" },
        { hour: 15, label: "Lunch" },
        { hour: 20.5, label: "Dinner" }
    ];

    // Append meal markers dynamically
    const mealMarkers = svg.append("g").attr("class", "meal-markers");

    mealMarkers.selectAll(".meal-line")
        .data(mealTimes)
        .enter()
        .append("line")
        .attr("class", "meal-line")
        .attr("x1", d => xScale(d.hour))
        .attr("x2", d => xScale(d.hour))
        .attr("y1", margin.top + 10)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "rgba(255, 0, 0, 0.5)")
        .attr("stroke-width", 2);

    mealMarkers.selectAll(".meal-label")
        .data(mealTimes)
        .enter()
        .append("text")
        .attr("class", "meal-label")
        .attr("x", d => xScale(d.hour) + 10) // Offset to the right of the line
        .attr("y", margin.top + 15) // Position near the top
        .attr("font-size", "12px")
        .attr("fill", "#d32f2f")
        .text(d => d.label);

    // Create a group for annotations to keep everything organized
    const annotations = d3.select("#dailyPatternGraph")
        .append("g")
        .attr("class", "annotations");

    // First annotation: High carb breakfast
    annotations.append("rect")
        .attr("x", 100)
        .attr("y", 76)
        .attr("width", 165)
        .attr("height", 40)
        .attr("rx", 5)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("stroke", "#ddd");

    annotations.append("text")
        .attr("x", 110)
        .attr("y", 93)
        .attr("font-size", "12")
        .attr("fill", "#333")
        .text("High carb breakfast causes");

    annotations.append("text")
        .attr("x", 110)
        .attr("y", 108)
        .attr("font-size", "12")
        .attr("fill", "#333")
        .text("steep glucose spike");

    annotations.append("line")
        .attr("x1", 300)
        .attr("y1", 50)
        .attr("x2", 180)
        .attr("y2", 75)
        .attr("stroke", "#888")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");

    // Second annotation: Lunch spike with gradual return
    annotations.append("rect")
        .attr("x", 330)
        .attr("y", 80)
        .attr("width", 115)
        .attr("height", 40)
        .attr("rx", 5)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("stroke", "#ddd");

    annotations.append("text")
        .attr("x", 340)
        .attr("y", 96)
        .attr("font-size", "12")
        .attr("fill", "#333")
        .text("High protein lunch");

    annotations.append("text")
        .attr("x", 340)
        .attr("y", 111)
        .attr("font-size", "12")
        .attr("fill", "#333")
        .text("causes low spike");

    annotations.append("line")
        .attr("x1", 435)
        .attr("y1", 140)
        .attr("x2", 400)
        .attr("y2", 120)
        .attr("stroke", "#888")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");

    // Third annotation: Fruit for Dinner
    annotations.append("rect")
        .attr("x", 490)
        .attr("y", 50)
        .attr("width", 140)
        .attr("height", 38)
        .attr("rx", 5)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("stroke", "#ddd");

    annotations.append("text")
        .attr("x", 500)
        .attr("y", 65)
        .attr("font-size", "12")
        .attr("fill", "#333")
        .text("Two fruit for dinner");

    annotations.append("text")
        .attr("x", 500)
        .attr("y", 80)
        .attr("font-size", "12")
        .attr("fill", "#333")
        .text("causes medium spikes");

    annotations.append("line")
        .attr("x1", 579)
        .attr("y1", 130)
        .attr("x2", 560)
        .attr("y2", 90)
        .attr("stroke", "#888")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "2,2");


    svg.append("path")
        .datum(glucoseData)
        .attr("class", "glucose-line")
        .attr("fill", "none")
        .attr("stroke", "#0066CC")
        .attr("stroke-width", 3)
        .attr("d", line);

    // Append X-Axis
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d}:00`))
        .style("font-size", "12");

    // Append Y-Axis
    svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5))
        .style("font-size", "12");

    // X-axis label
    svg.append("text")
        .attr("x", 350)  // Centered horizontally at the middle of the SVG (width = 700)
        .attr("y", 300)  // Position near the bottom of the graph (height = 300)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")  // Center the text horizontally
        .attr("fill", "#333")
        .text("Time of Day");

    // Y-axis label
    svg.append("text")
        .attr("x", -150) // Rotate the Y-axis label, move it left of the graph
        .attr("y", 11)  // Position near the middle of the SVG's height (300)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")  // Center text vertically
        .attr("fill", "#333")
        .attr("transform", "rotate(-90)") // Rotate the text by -90 degrees for vertical orientation
        .text("Glucose Level (mg/dL)");

    // Add hover dot
    const dot = svg.append("circle")
        .attr("class", "hover-dot")
        .attr("r", 5)
        .attr("fill", "#d32f2f")
        .style("display", "none"); // Initially hidden

    // Add fixed label below graph
    const label = svg.append("text")
        .attr("class", "glucose-label")
        .attr("x", width)
        .attr("y", (height / 2) - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("display", "none"); // Initially hidden

    // Hover detection
    svg.append("rect")
        .attr("class", "hover-overlay")
        .attr("fill", "transparent")
        .attr("width", width)
        .attr("height", height)
        .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event, this);

            if (!glucoseData.length) return;

            // Use d3.bisector to find the closest data point
            const bisect = d3.bisector(d => d.HourOfDay).center;
            const index = bisect(glucoseData, xScale.invert(mouseX));
            const closestDataPoint = glucoseData[index];

            // Update the dot position
            dot.attr("cx", xScale(closestDataPoint.HourOfDay))
                .attr("cy", yScale(closestDataPoint.Value))
                .style("display", "block"); // Show dot

            // Clear the existing label text before adding new content
            label.selectAll("*").remove();

            // Add the glucose value text
            label.append("tspan")
                    .attr("x", width - 10)
                    .attr("dy", 0)
                    .text(`Glucose: ${closestDataPoint.Value} mg/dL`);

            const formattedHour = formatHour(closestDataPoint.HourOfDay);
            // Add the hour text on a new line
            label.append("tspan")
                    .attr("x", width - 10)
                    .attr("dy", "1.5em")
                    .text(`Time: ${formattedHour}`);

            // Show the label
            label.style("display", "block");
        })
        .on("mouseout", () => {
            dot.style("display", "none");  // Hide dot
            label.style("display", "none");  // Hide label
        });
}


/* /////////////////////////
FOOD COMPARISON GRAPH START
///////////////////////// */
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
        legendItems.select(".legend-line")
            .attr("stroke-opacity", d => filters[d.category] ? 1 : 0.3);
        legendItems.select("text")
            .style("opacity", d => filters[d.category] ? 1 : 0.3);
    }
}

function drawD3Graph() {
    d3.json("./processed_data/food_responses.json").then(function (data) {
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
            .call(d3.axisBottom(xScale).ticks(10).tickFormat(d => d))
            .style("font-size", "12");

        // Add y-axis
        svg.append("g")
            .call(d3.axisLeft(yScale))
            .style("font-size", "12");

        // Add x-axis label
        svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 2)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Time from Food Consumption (min)");

        // Add y-axis label
        svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
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

        legendItems.append("line")
            .attr("x1", 0)
            .attr("y1", 10) // Position it vertically in the center of the legend item
            .attr("x2", 20)  // Length of the line (this makes it a square line)
            .attr("y2", 10)  // Y-position is the same for both points to make it a horizontal line
            .attr("stroke", d => d.color)  // Line color based on legend data
            .attr("stroke-width", 4) // Adjust the thickness of the line
            .attr("stroke-linecap", "round")  // Makes the ends of the line rounded
            .attr("class", "legend-line");

        legendItems.append("text")
            .attr("x", 30)
            .attr("y", 15)
            .text(d => d.name)
            .style("font-size", "12px");

        updateFilters();

        // 1) Circles for each line
        const wrCircle = svg.append("circle")
            .attr("r", 4)
            .attr("fill", "#fff")           // White fill
            .attr("stroke", "#e53935")      // Red stroke for White Rice
            .attr("stroke-width", 2)
            .style("display", "none");

        const appleCircle = svg.append("circle")
            // White fill, orange stroke
            .attr("r", 4)
            .attr("fill", "#fff")
            .attr("stroke", "#ff9800")
            .attr("stroke-width", 2)
            .style("display", "none");

        const brocCircle = svg.append("circle")
            // White fill, green stroke
            .attr("r", 4)
            .attr("fill", "#fff")
            .attr("stroke", "#4caf50")
            .attr("stroke-width", 2)
            .style("display", "none");

        // 2) Tooltip div
        const tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "#fff")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("display", "none");

        // 3) Vertical hover line
        const hoverLine = svg.append("line")
            .attr("stroke", "#0066CC")
            .attr("stroke-width", 2)
            .attr("y1", 0)
            .attr("y2", height)
            .style("display", "none");

        // 4) Large invisible rect for mouse events
        svg.append("rect")
            .attr("class", "hover-capture")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mousemove", function (event) {
                const mouseX = d3.pointer(event, this)[0];
                const time = xScale.invert(mouseX);

                // Helper: find data point in an array with closest MinutesSinceFood
                function findClosest(arr, t) {
                    let closest = arr[0];
                    let minDist = Math.abs(t - arr[0].MinutesSinceFood);
                    for (let i = 1; i < arr.length; i++) {
                        const dist = Math.abs(t - arr[i].MinutesSinceFood);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = arr[i];
                        }
                    }
                    return closest;
                }

                const wrPoint = findClosest(whiteRice.Response, time);
                const applePoint = findClosest(apple.Response, time);
                const brocPoint = findClosest(broccoli.Response, time);

                // Position circles (only show if that line is visible)
                if (filters.high) {
                    wrCircle
                        .attr("cx", xScale(wrPoint.MinutesSinceFood))
                        .attr("cy", yScale(wrPoint.Value))
                        .style("display", "block");
                } else {
                    wrCircle.style("display", "none");
                }
                if (filters.medium) {
                    appleCircle
                        .attr("cx", xScale(applePoint.MinutesSinceFood))
                        .attr("cy", yScale(applePoint.Value))
                        .style("display", "block");
                } else {
                    appleCircle.style("display", "none");
                }
                if (filters.low) {
                    brocCircle
                        .attr("cx", xScale(brocPoint.MinutesSinceFood))
                        .attr("cy", yScale(brocPoint.Value))
                        .style("display", "block");
                } else {
                    brocCircle.style("display", "none");
                }

                // Build tooltip content with color-coded lines
                const displayTime = wrPoint.MinutesSinceFood;
                let tooltipContent = `Time: ${Math.round(displayTime)} min<br>`;
                if (filters.high) {
                    tooltipContent += `<span style="color: #e53935;">White Rice: ${Math.round(wrPoint.Value)} mg/dL</span><br>`;
                }
                if (filters.medium) {
                    tooltipContent += `<span style="color: #ff9800;">Apple: ${Math.round(applePoint.Value)} mg/dL</span><br>`;
                }
                if (filters.low) {
                    tooltipContent += `<span style="color: #4caf50;">Broccoli: ${Math.round(brocPoint.Value)} mg/dL</span>`;
                }

                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 40) + "px")
                    .style("display", "block");

                hoverLine
                    .attr("x1", mouseX)
                    .attr("x2", mouseX)
                    .style("display", "block");
            })
            .on("mouseleave", function () {
                tooltip.style("display", "none");
                hoverLine.style("display", "none");
                wrCircle.style("display", "none");
                appleCircle.style("display", "none");
                brocCircle.style("display", "none");
            });
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

/* //////////////////////
FOOD COMPARISON GRAPH END
////////////////////// */

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