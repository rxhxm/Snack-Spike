import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta

# Function to make timestamps JSON serializable
def json_serializable_dict(obj):
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# Create output directory for processed data
os.makedirs('processed_data', exist_ok=True)

# 1. Load demographics data
demographics = pd.read_csv('data/Demographics.csv')
print(f"Loaded demographics for {len(demographics)} participants")

# 2. Process Dexcom and Food Log data for each participant
participants = range(1, 17)  # Assuming 16 participants (001-016)
all_glucose_data = []
all_food_events = []

for participant_id in participants:
    participant_str = f"{participant_id:03d}"
    
    # Load glucose data
    try:
        dexcom_file = f"data/Dexcom_{participant_str}.csv"
        glucose_data = pd.read_csv(dexcom_file)
        
        # Clean glucose data - first determine the column names
        if 'Timestamp' in glucose_data.columns:
            timestamp_col = 'Timestamp'
        elif 'Timestamp (YYYY-MM-DDThh:mm:ss)' in glucose_data.columns:
            timestamp_col = 'Timestamp (YYYY-MM-DDThh:mm:ss)'
        else:
            # Use first column as timestamp
            timestamp_col = glucose_data.columns[0]
            
        if 'Value' in glucose_data.columns:
            value_col = 'Value'
        elif 'Glucose Value (mg/dL)' in glucose_data.columns:
            value_col = 'Glucose Value (mg/dL)'
        else:
            # Try to find a column that might contain glucose values
            for col in glucose_data.columns:
                if 'glucose' in col.lower() or 'mg/dl' in col.lower():
                    value_col = col
                    break
            else:
                # If no obvious glucose column, use second column
                value_col = glucose_data.columns[1] if len(glucose_data.columns) > 1 else None
        
        # Filter only EGV readings if Event Type column exists
        if 'Event Type' in glucose_data.columns:
            glucose_data = glucose_data[glucose_data['Event Type'] == 'EGV'].copy()
        
        # Clean and standardize columns
        glucose_data['Timestamp'] = pd.to_datetime(glucose_data[timestamp_col], errors='coerce')
        glucose_data['Value'] = pd.to_numeric(glucose_data[value_col], errors='coerce')
        glucose_data['ParticipantID'] = participant_str
        
        # Remove rows with invalid timestamps or values
        glucose_data = glucose_data.dropna(subset=['Timestamp', 'Value'])
        
        # Check for and handle missing values
        missing_count = glucose_data['Value'].isna().sum()
        if missing_count > 0:
            print(f"Participant {participant_str}: {missing_count} missing glucose values")
            # Fill small gaps (up to 15 minutes - 3 readings) with interpolation
            glucose_data['Value'] = glucose_data['Value'].interpolate(method='time', limit=3)
        
        # Keep only the columns we need
        glucose_data = glucose_data[['Timestamp', 'Value', 'ParticipantID']]
        
        all_glucose_data.append(glucose_data)
        print(f"Loaded glucose data for participant {participant_str}: {len(glucose_data)} readings")
        
        # Load food log data
        try:
            food_file = f"data/Food_Log_{participant_str}.csv"
            food_data = pd.read_csv(food_file)
            
            # Look for timestamp column
            timestamp_cols = ['Timestamp', 'Time', 'DateTime', 'Date Time', 'date', 'Date']
            timestamp_col = None
            for col in timestamp_cols:
                if col in food_data.columns:
                    timestamp_col = col
                    break
            
            if timestamp_col is None:
                # Use first column as timestamp
                timestamp_col = food_data.columns[0]
            
            print(f"Using {timestamp_col} as timestamp column for food log")
            
            # Look for food description column
            description_cols = ['Description', 'Food', 'Item', 'Meal', 'food', 'description']
            description_col = None
            for col in description_cols:
                if col in food_data.columns:
                    description_col = col
                    break
            
            if description_col is None:
                # Examine other columns for potential food data
                for col in food_data.columns:
                    if col.lower() not in ['timestamp', 'time', 'datetime', 'date', 'date_time']:
                        description_col = col
                        break
                else:
                    # Use second column if still not found
                    description_col = food_data.columns[1] if len(food_data.columns) > 1 else None
            
            print(f"Using {description_col} as food description column")
            
            # Convert timestamp column to datetime
            try:
                # Try parsing as is
                food_data['Timestamp'] = pd.to_datetime(food_data[timestamp_col], errors='coerce')
            except:
                try:
                    # If date and time are in separate columns, try to combine them
                    if 'Date' in food_data.columns and 'Time' in food_data.columns:
                        food_data['Timestamp'] = pd.to_datetime(
                            food_data['Date'].astype(str) + ' ' + food_data['Time'].astype(str), 
                            errors='coerce'
                        )
                    else:
                        # Various formats to try
                        formats = ['%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M:%S', 
                                '%m/%d/%Y %H:%M', '%Y-%m-%d', '%m/%d/%Y']
                        
                        for fmt in formats:
                            try:
                                food_data['Timestamp'] = pd.to_datetime(
                                    food_data[timestamp_col], format=fmt, errors='coerce'
                                )
                                break
                            except:
                                continue
                except:
                    # If all else fails, create timestamps using glucose data timeframe
                    print(f"Could not parse timestamps for participant {participant_str}, using synthetic times")
                    start_time = glucose_data['Timestamp'].min()
                    food_data['Timestamp'] = [
                        start_time + timedelta(hours=i*8) for i in range(len(food_data))
                    ]
            
            # Drop rows with invalid timestamps
            food_data = food_data.dropna(subset=['Timestamp'])
            
            # Set food description
            if description_col and description_col in food_data.columns:
                food_data['Description'] = food_data[description_col].astype(str)
            else:
                food_data['Description'] = 'Unknown food'
                
            food_data['ParticipantID'] = participant_str
            
            # Enhanced food categorization function
            def categorize_food(description):
                if not isinstance(description, str):
                    return 'unknown'
                    
                description = str(description).lower()
                
                # More comprehensive food lists
                high_glycemic = [
                    'white rice', 'bread', 'potato', 'cereal', 'sugar', 'candy', 'soda', 'juice',
                    'cake', 'cookie', 'donut', 'bagel', 'crackers', 'chips', 'corn flakes',
                    'white pasta', 'white flour', 'honey', 'maple syrup', 'jam', 'jelly',
                    'watermelon', 'pineapple', 'mango', 'pretzels', 'rice cake', 'popcorn',
                    'waffle', 'pancake', 'biscuit', 'croissant', 'cornbread', 'muffin',
                    'instant rice', 'instant oats', 'instant potato', 'doughnut'
                ]
                
                medium_glycemic = [
                    'apple', 'orange', 'banana', 'grape', 'kiwi', 'pear', 'peach', 'plum',
                    'mango', 'pineapple', 'oatmeal', 'sweet potato', 'corn', 'whole grain',
                    'brown rice', 'wild rice', 'quinoa', 'whole wheat pasta', 'whole wheat bread',
                    'pita', 'tortilla', 'basmati rice', 'jasmine rice', 'rice noodle',
                    'yogurt', 'ice cream', 'milk', 'cottage cheese', 'baked beans',
                    'hummus', 'chickpea', 'lentil', 'black bean', 'kidney bean',
                    'rye bread', 'pumpernickel', 'couscous', 'bulgur', 'muesli'
                ]
                
                low_glycemic = [
                    'broccoli', 'vegetable', 'salad', 'spinach', 'kale', 'cabbage', 'cauliflower',
                    'asparagus', 'brussels sprout', 'cucumber', 'celery', 'lettuce', 'zucchini',
                    'bell pepper', 'eggplant', 'tomato', 'carrot', 'onion', 'garlic',
                    'nuts', 'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'seeds',
                    'meat', 'beef', 'chicken', 'turkey', 'pork', 'lamb', 'fish', 'salmon',
                    'tuna', 'shrimp', 'egg', 'avocado', 'olive oil', 'coconut oil', 'butter',
                    'cheese', 'greek yogurt', 'tofu', 'tempeh', 'seitan', 'shellfish',
                    'artichoke', 'mushroom', 'radish', 'green bean', 'okra', 'sprouts'
                ]
                
                # Check for exact word matches (to avoid substring issues)
                words = description.lower().split()
                
                # If description contains any high glycemic food
                for food in high_glycemic:
                    food_words = food.split()
                    if all(word in words for word in food_words):
                        return 'high'
                
                # If description contains any medium glycemic food  
                for food in medium_glycemic:
                    food_words = food.split()
                    if all(word in words for word in food_words):
                        return 'medium'
                
                # If description contains any low glycemic food
                for food in low_glycemic:
                    food_words = food.split()
                    if all(word in words for word in food_words):
                        return 'low'
                
                # Fallback to substring matching if no exact matches
                for food in high_glycemic:
                    if food in description:
                        return 'high'
                
                for food in medium_glycemic:
                    if food in description:
                        return 'medium'
                
                for food in low_glycemic:
                    if food in description:
                        return 'low'
                
                return 'unknown'  # Default category
            
            # Apply categorization
            food_data['GlycemicCategory'] = food_data['Description'].apply(categorize_food)
            
            # Keep only the columns we need
            food_data = food_data[['Timestamp', 'Description', 'GlycemicCategory', 'ParticipantID']]
            
            all_food_events.append(food_data)
            print(f"Loaded food log for participant {participant_str}: {len(food_data)} food events")
        
        except (FileNotFoundError, pd.errors.EmptyDataError) as e:
            print(f"No food log found or error loading for participant {participant_str}: {e}")
    
    except (FileNotFoundError, pd.errors.EmptyDataError) as e:
        print(f"No glucose data found or error loading for participant {participant_str}: {e}")

# Only continue if we have data to process
if all_glucose_data and len(all_glucose_data) > 0:
    # Combine all participant data
    combined_glucose = pd.concat(all_glucose_data, ignore_index=True)
    
    # Make sure we have some food events
    if all_food_events and len(all_food_events) > 0:
        combined_food = pd.concat(all_food_events, ignore_index=True)
    else:
        # Create an empty food events dataframe with the right columns
        combined_food = pd.DataFrame(columns=['Timestamp', 'Description', 'GlycemicCategory', 'ParticipantID'])
    
    # Save combined data
    combined_glucose.to_csv('processed_data/all_glucose_data.csv', index=False)
    combined_food.to_csv('processed_data/all_food_events.csv', index=False)
    
    print(f"Combined data saved: {len(combined_glucose)} glucose readings, {len(combined_food)} food events")
    
    # 3. Create dataset for Visualization 1: Understanding Glucose Spikes
    def create_daily_pattern_data():
        # Group by participant and day
        combined_glucose['Date'] = combined_glucose['Timestamp'].dt.date
        
        # Find days with good coverage (at least 200 readings - ~16 hours)
        day_counts = combined_glucose.groupby(['ParticipantID', 'Date']).size()
        good_days = day_counts[day_counts > 200].reset_index()
        
        # If we don't have good days, lower the threshold
        if len(good_days) < 5:
            day_counts = combined_glucose.groupby(['ParticipantID', 'Date']).size()
            good_days = day_counts[day_counts > 100].reset_index()
            print(f"Lowered threshold for 'good days' to 100 readings, found {len(good_days)} days")
        
        # Select up to 5 representative days from different participants
        selected_days = []
        seen_participants = set()
        
        for _, row in good_days.iterrows():
            if len(selected_days) >= 5:
                break
            if row['ParticipantID'] not in seen_participants or len(good_days) < 5:
                selected_days.append((row['ParticipantID'], row['Date']))
                seen_participants.add(row['ParticipantID'])
        
        # Extract glucose data for selected days
        daily_patterns = []
        
        for participant_id, date in selected_days:
            # Get glucose data
            day_glucose = combined_glucose[
                (combined_glucose['ParticipantID'] == participant_id) & 
                (combined_glucose['Date'] == date)
            ].copy()
            
            # Normalize time to hours since midnight
            day_glucose['HourOfDay'] = day_glucose['Timestamp'].dt.hour + day_glucose['Timestamp'].dt.minute/60
            
            # Get food events for this day
            day_food = combined_food[
                (combined_food['ParticipantID'] == participant_id) & 
                (combined_food['Timestamp'].dt.date == date)
            ].copy()
            
            if len(day_food) > 0:
                day_food['HourOfDay'] = day_food['Timestamp'].dt.hour + day_food['Timestamp'].dt.minute/60
                meal_events = day_food[['HourOfDay', 'Description', 'GlycemicCategory']].to_dict('records')
            else:
                # If no food events for this day, create synthetic ones based on glucose patterns
                glucose_changes = day_glucose['Value'].diff().rolling(window=6).sum()
                potential_meals = day_glucose[glucose_changes > 20].copy()
                
                meal_events = []
                for i, potential_meal in enumerate(potential_meals.iloc[::12].itertuples()): # Space them out
                    if i >= 3: # Limit to 3 synthetic meals
                        break
                    meal_events.append({
                        'HourOfDay': potential_meal.HourOfDay,
                        'Description': f"Estimated meal {i+1}",
                        'GlycemicCategory': 'unknown'
                    })
                print(f"Created {len(meal_events)} synthetic meal events for {participant_id} on {date}")
            
            # Format the glucose data and convert hour of day to string for JSON
            glucose_data_list = []
            for _, row in day_glucose.iterrows():
                glucose_data_list.append({
                    'HourOfDay': float(row['HourOfDay']),
                    'Value': float(row['Value'])
                })
            
            # Combine into one record
            pattern_data = {
                'ParticipantID': participant_id,
                'Date': str(date),
                'GlucoseData': glucose_data_list,
                'MealEvents': meal_events
            }
            
            daily_patterns.append(pattern_data)
        
        # Save as JSON for D3
        with open('processed_data/daily_patterns.json', 'w') as f:
            json.dump(daily_patterns, f, indent=2)
        
        return daily_patterns

    # 4. Create dataset for Visualization 2: Different Foods, Different Responses
    def create_food_response_data():
        # For each food category, find examples and extract glucose response
        response_data = {
            'high': [],
            'medium': [],
            'low': []
        }
        
        # Examine data to see if we have enough for real examples
        real_data_available = len(combined_food) > 0 and len(combined_glucose) > 0
        print(f"Food events available: {len(combined_food)}")
        
        # Direct classification of common foods based on total carbs (if available)
        if real_data_available:
            # Try to find total carb column
            carb_columns = ['total_carb', 'carb', 'carbs', 'carbohydrate', 'carbohydrates']
            carb_col = None
            for col in carb_columns:
                if col in combined_food.columns:
                    carb_col = col
                    break
            
            # If we have carb data, use it for classification
            if carb_col:
                print(f"Using carbohydrate data from column: {carb_col}")
                
                # Function to classify by carb content
                def classify_by_carbs(row):
                    try:
                        carbs = float(row[carb_col])
                        if carbs > 30:  # High carb food
                            return 'high'
                        elif carbs > 15:  # Medium carb food
                            return 'medium'
                        else:  # Low carb food
                            return 'low'
                    except (ValueError, TypeError):
                        return row['GlycemicCategory']  # Keep existing classification
                
                # Apply carb-based classification where possible
                combined_food['GlycemicCategory'] = combined_food.apply(
                    classify_by_carbs, axis=1
                )
        
        # Count how many foods we have in each category
        if real_data_available:
            category_counts = combined_food['GlycemicCategory'].value_counts()
            print("Food categorization counts:")
            print(category_counts)
            
            # Flag known food types for easier matching
            food_category_map = {
                'rice': 'high',
                'bread': 'high', 
                'pasta': 'high',
                'cereal': 'high',
                'cookie': 'high',
                'cake': 'high',
                'smoothie': 'high',
                'juice': 'high',
                'soda': 'high',
                'popcorn': 'high',
                'frosted': 'high',
                'sugar': 'high',
                'honey': 'high',
                'maple': 'high',
                'bagel': 'high',
                'candy': 'high',
                'chocolate': 'high',
                'ice cream': 'high',
                
                'apple': 'medium',
                'banana': 'medium',
                'oatmeal': 'medium',
                'yogurt': 'medium',
                'milk': 'medium',
                'orange': 'medium',
                'pear': 'medium',
                'sweet potato': 'medium',
                'beans': 'medium',
                'fruit': 'medium',
                'trail mix': 'medium',
                
                'broccoli': 'low',
                'spinach': 'low',
                'salad': 'low',
                'vegetable': 'low',
                'asparagus': 'low',
                'egg': 'low',
                'meat': 'low',
                'chicken': 'low',
                'beef': 'low',
                'fish': 'low',
                'shrimp': 'low',
                'seafood': 'low',
                'cheese': 'low',
                'cabbage': 'low',
                'nuts': 'low'
            }
            
            # Apply simpler direct matching for foods
            for i, row in combined_food.iterrows():
                if row['GlycemicCategory'] == 'unknown':
                    food_desc = str(row['Description']).lower()
                    for food_term, category in food_category_map.items():
                        if food_term in food_desc:
                            combined_food.at[i, 'GlycemicCategory'] = category
                            break
        
        # Process real food data if available
        real_examples_found = 0
        if real_data_available:
            for _, food_event in combined_food.iterrows():
                category = food_event['GlycemicCategory']
                
                # Skip unknown categories
                if category == 'unknown':
                    continue
                
                # Get glucose data from 15 min before to 3 hours after food consumption
                event_time = food_event['Timestamp']
                participant = food_event['ParticipantID']
                
                # Get glucose readings
                before_event = event_time - timedelta(minutes=15)
                after_event = event_time + timedelta(hours=3)
                
                response = combined_glucose[
                    (combined_glucose['ParticipantID'] == participant) &
                    (combined_glucose['Timestamp'] >= before_event) &
                    (combined_glucose['Timestamp'] <= after_event)
                ].copy()
                
                # Reduce minimum data point requirement
                if len(response) < 15:  # Only need 15 readings instead of 30
                    continue
                
                # Calculate baseline (average of first 3 readings)
                baseline = response.iloc[0:3]['Value'].mean()
                
                # Normalize by minutes since food consumption and relative glucose
                response['MinutesSinceFood'] = (response['Timestamp'] - event_time).dt.total_seconds() / 60
                response['RelativeGlucose'] = response['Value'] - baseline
                
                # Convert response to a list of dictionaries for JSON serialization
                response_records = []
                for _, row in response.iterrows():
                    response_records.append({
                        'MinutesSinceFood': float(row['MinutesSinceFood']),
                        'Value': float(row['Value']),
                        'RelativeGlucose': float(row['RelativeGlucose'])
                    })
                
                # Add to appropriate category if we need more examples
                if len(response_data[category]) < 5:  # Limit to 5 examples per category
                    event_data = {
                        'FoodDescription': str(food_event['Description']),
                        'ParticipantID': str(participant),
                        'Timestamp': event_time.isoformat(),
                        'Response': response_records
                    }
                    response_data[category].append(event_data)
                    real_examples_found += 1
        
        print(f"Found {real_examples_found} real food response examples")
        
        # ALWAYS create synthetic data to fill gaps
        print("Creating synthetic food examples to fill gaps or complement real data...")
        
        # Create sample responses for each category
        for category in ['high', 'medium', 'low']:
            # Determine how many synthetic examples we need
            needed = 5 - len(response_data[category])
            if needed <= 0:
                continue
            
            # Get sample glucose data from a participant
            if len(combined_glucose) > 0:
                participant_id = combined_glucose['ParticipantID'].iloc[0]
                start_time = combined_glucose['Timestamp'].min() + timedelta(hours=2)
            else:
                participant_id = "001"
                start_time = datetime.now() - timedelta(days=7)
            
            # Synthetic baseline
            baseline = 80 if category == 'low' else (100 if category == 'medium' else 110)
            
            # Sample food names
            food_names = {
                'high': ['White rice', 'White bread', 'Sugar cookie', 'Soda', 'Breakfast cereal'],
                'medium': ['Apple', 'Brown rice', 'Banana', 'Oatmeal', 'Yogurt'],
                'low': ['Broccoli', 'Spinach salad', 'Grilled chicken', 'Nuts', 'Eggs']
            }
            
            # Create synthetic response - create a separate instance for each food to avoid shared references
            for i in range(min(needed, len(food_names[category]))):
                synthetic_response = []
                food_name = food_names[category][i]
                event_time = start_time + timedelta(days=i)
                
                # Create different response shapes for each category
                for minute in range(-15, 181, 5):
                    if category == 'high':
                        # High glycemic: rapid rise, moderate fall
                        if minute < 0:
                            rel_glucose = 0
                        elif minute < 30:
                            rel_glucose = minute * 2  # Steep rise
                        elif minute < 60:
                            rel_glucose = 60 - (minute - 30) * 0.5  # Peak and start falling
                        else:
                            rel_glucose = 45 - (minute - 60) * 0.25  # Gradual fall
                            rel_glucose = max(0, rel_glucose)  # Don't go below 0
                    
                    elif category == 'medium':
                        # Medium glycemic: moderate rise, moderate fall
                        if minute < 0:
                            rel_glucose = 0
                        elif minute < 45:
                            rel_glucose = minute * 0.8  # Moderate rise
                        elif minute < 90:
                            rel_glucose = 36 - (minute - 45) * 0.3  # Peak and start falling
                        else:
                            rel_glucose = 22.5 - (minute - 90) * 0.15  # Gradual fall
                            rel_glucose = max(0, rel_glucose)  # Don't go below 0
                    
                    else:  # low
                        # Low glycemic: minimal rise
                        if minute < 0:
                            rel_glucose = 0
                        elif minute < 60:
                            rel_glucose = minute * 0.3  # Slow rise
                        else:
                            rel_glucose = 18 - (minute - 60) * 0.1  # Slow fall
                            rel_glucose = max(0, rel_glucose)  # Don't go below 0
                    
                    # Add some noise
                    rel_glucose += np.random.normal(0, 2)
                    
                    synthetic_response.append({
                        'MinutesSinceFood': minute,
                        'Value': baseline + rel_glucose,
                        'RelativeGlucose': rel_glucose
                    })
                
                # Add synthetic event
                event_data = {
                    'FoodDescription': food_name,
                    'ParticipantID': participant_id,
                    'Timestamp': event_time.isoformat(),
                    'Response': synthetic_response,
                    'IsSynthetic': True  # Mark as synthetic for reference
                }
                response_data[category].append(event_data)
                print(f"Added synthetic example for {category}: {food_name}")
        
        # Add average responses for each category - BUT AVOID CHANGING THE DICT WHILE ITERATING
        # This is where the error was happening
        categories_to_process = list(response_data.keys())  # Create a static list of categories
        
        for category in categories_to_process:
            responses = response_data[category]
            if responses:
                # Create average response
                time_points = np.arange(-15, 181, 5)
                avg_response = []
                
                for minute in time_points:
                    values = []
                    for resp in responses:
                        matching_points = [p for p in resp['Response'] 
                                         if isinstance(p, dict) and 'MinutesSinceFood' in p 
                                         and abs(p['MinutesSinceFood'] - minute) < 2.5
                                         and 'RelativeGlucose' in p]
                        
                        if matching_points:
                            values.append(matching_points[0]['RelativeGlucose'])
                    
                    if values:
                        avg_response.append({
                            'MinutesSinceFood': float(minute),
                            'AvgRelativeGlucose': float(sum(values) / len(values))
                        })
                
                if avg_response:
                    response_data[f"{category}_average"] = avg_response
        
        # Save for D3
        with open('processed_data/food_responses.json', 'w') as f:
            json.dump(response_data, f, indent=2)
        
        total_examples = sum(len(response_data[cat]) for cat in ['high', 'medium', 'low'])
        print(f"Total food response examples saved: {total_examples}")
        print(f"Categories with average responses: {[k for k in response_data.keys() if '_average' in k]}")
        
        return response_data

    # 5. Create dataset for Visualization 3: Prediction Game
    def create_prediction_game_data():
        # For the game, we want realistic examples of glucose spikes
        # Find significant glucose spikes (> 40 mg/dL increase)
        spike_events = []
        
        # If insufficient data, create synthetic game data
        if len(combined_food) == 0 or len(combined_glucose) < 1000:
            print("Creating synthetic game data due to insufficient real data")
            
            # Create synthetic spike events
            food_types = [
                ('White rice', 'high', 30), 
                ('Apple', 'medium', 45),
                ('Salad', 'low', 60),
                ('Ice cream', 'high', 25),
                ('Pasta', 'high', 40),
                ('Banana', 'medium', 35),
                ('Chicken sandwich', 'medium', 50),
                ('Soda', 'high', 20),
                ('Yogurt', 'medium', 40),
                ('Vegetable soup', 'low', 55)
            ]
            
            # Create a base timestamp
            if len(combined_glucose) > 0:
                base_time = combined_glucose['Timestamp'].min()
                participant_id = combined_glucose['ParticipantID'].iloc[0]
            else:
                base_time = pd.Timestamp('2020-02-13 12:00:00')
                participant_id = '001'
            
            for i, (food_name, category, delay_minutes) in enumerate(food_types):
                # Create food event time
                food_time = base_time + timedelta(days=i, hours=2)
                
                # Create spike time based on food category and typical delay
                spike_time = food_time + timedelta(minutes=delay_minutes)
                
                # Create baseline based on category
                baseline = 80 if category == 'low' else (90 if category == 'medium' else 100)
                
                # Create spike value based on category
                spike_value = baseline + (20 if category == 'low' else (50 if category == 'medium' else 80))
                
                # Create synthetic response curve
                response_curve = []
                total_duration = delay_minutes + 120  # Cover time from food to recovery
                
                for minute in range(0, total_duration + 1, 5):
                    timestamp = food_time + timedelta(minutes=minute)
                    
                    # Calculate value based on position in the curve
                    if minute < delay_minutes * 0.7:
                        # Slow initial rise
                        value = baseline + (minute / (delay_minutes * 0.7)) * (spike_value - baseline) * 0.3
                    elif minute < delay_minutes:
                        # Rapid rise to peak
                        progress = (minute - delay_minutes * 0.7) / (delay_minutes * 0.3)
                        value = baseline + (spike_value - baseline) * (0.3 + 0.7 * progress)
                    elif minute < delay_minutes + 30:
                        # Initial decline from peak
                        decline_progress = (minute - delay_minutes) / 30
                        value = spike_value - (spike_value - baseline) * 0.4 * decline_progress
                    else:
                        # Gradual return to baseline
                        remaining_recovery = total_duration - delay_minutes - 30
                        recovery_progress = (minute - delay_minutes - 30) / remaining_recovery
                        value = spike_value - (spike_value - baseline) * (0.4 + 0.6 * recovery_progress)
                    
                    # Add noise
                    value += np.random.normal(0, 2)
                    
                    # Record point
                    response_curve.append({
                        'Timestamp': timestamp.isoformat(),
                        'Value': float(value)
                    })
                
                # Create the event record
                food_event = {
                    'Description': food_name,
                    'GlycemicCategory': category,
                    'Timestamp': food_time.isoformat()
                }
                
                event_data = {
                    'ParticipantID': participant_id,
                    'FoodEvent': food_event,
                    'SpikeTime': spike_time.isoformat(),
                    'SpikeValue': float(spike_value),
                    'BaselineValue': float(baseline),
                    'ResponseCurve': response_curve
                }
                
                spike_events.append(event_data)
            
            # Save synthetic game data
            with open('processed_data/spike_events.json', 'w') as f:
                json.dump(spike_events, f, indent=2)
            
            print(f"Created {len(spike_events)} synthetic game examples")
            return spike_events
        
        # If we have real data, use it
        for participant_id in set(combined_glucose['ParticipantID']):
            participant_glucose = combined_glucose[combined_glucose['ParticipantID'] == participant_id]
            
            # Calculate glucose changes
            participant_glucose = participant_glucose.sort_values('Timestamp')
            participant_glucose['GlucoseChange'] = participant_glucose['Value'].diff(6)  # Change over 30 min
            
            # Find spikes
            spikes = participant_glucose[participant_glucose['GlucoseChange'] > 40].copy()
            
            for _, spike in spikes.iterrows():
                spike_time = spike['Timestamp']
                
                # Look for food events 15-120 minutes before the spike
                food_before = combined_food[
                    (combined_food['ParticipantID'] == participant_id) &
                    (combined_food['Timestamp'] > spike_time - timedelta(minutes=120)) &
                    (combined_food['Timestamp'] < spike_time - timedelta(minutes=15))
                ]
                
                if len(food_before) > 0:
                    # Found a food event that might have caused this spike
                    # Get the full response curve
                    response_start = food_before['Timestamp'].iloc[0] - timedelta(minutes=15)
                    response_end = spike_time + timedelta(minutes=120)
                    
                    response_curve = participant_glucose[
                        (participant_glucose['Timestamp'] >= response_start) &
                        (participant_glucose['Timestamp'] <= response_end)
                    ].copy()
                    
                    # Need enough data points
                    if len(response_curve) < 20:
                        continue
                    
                    # Convert to JSON-serializable format
                    response_records = []
                    for _, row in response_curve.iterrows():
                        response_records.append({
                            'Timestamp': row['Timestamp'].isoformat(),
                            'Value': float(row['Value'])
                        })
                    
                    # Convert food event to dictionary with string timestamps
                    food_dict = food_before.iloc[0].to_dict()
                    food_dict['Timestamp'] = food_dict['Timestamp'].isoformat()
                    
                    event_data = {
                        'ParticipantID': str(participant_id),
                        'FoodEvent': food_dict,
                        'SpikeTime': spike_time.isoformat(),
                        'SpikeValue': float(spike['Value']),
                        'BaselineValue': float(response_curve.iloc[0:3]['Value'].mean()),
                        'ResponseCurve': response_records
                    }
                    
                    spike_events.append(event_data)
                    
                    # Limit to 10 examples
                    if len(spike_events) >= 10:
                        break
            
            if len(spike_events) >= 10:
                break
        
        # Save for the game
        with open('processed_data/spike_events.json', 'w') as f:
            json.dump(spike_events, f, indent=2)
        
        return spike_events

    # Generate datasets for all three visualizations
    try:
        daily_patterns = create_daily_pattern_data()
        print(f"- Daily pattern examples: {len(daily_patterns)}")
    except Exception as e:
        print(f"Error creating daily patterns: {e}")
        daily_patterns = []
    
    try:
        food_responses = create_food_response_data()
        food_examples = sum(len(food_responses.get(cat, [])) for cat in ['high', 'medium', 'low'])
        print(f"- Food response examples: {food_examples}")
    except Exception as e:
        print(f"Error creating food responses: {e}")
        food_responses = {}
    
    try:
        game_data = create_prediction_game_data()
        print(f"- Game spike examples: {len(game_data)}")
    except Exception as e:
        print(f"Error creating game data: {e}")
        game_data = []
    
    print("Data processing complete!")
else:
    print("No data to process. Please check if the CSV files are in the correct location and format.")