# Explain recommendation assumptions Task Specification

## Basic Information

- **Task ID:** T3
- **Task name:** Explain recommendation assumptions
- **Task type:** Reason
- **Task owner:** HackForecast

## 1. Task Description

Explain the assumptions used to produce the food, drink, and swag recommendations so CPVC organizers can understand the basis for the plan.

## 2. Inputs

### Input 1

- **Input name:** Supply recommendations
- **Contents and format:** Recommended quantities for food, drinks, and swag.
- **Source:** T2: Recommend food, drink, and swag quantities.
- **If a required input is missing or invalid:** Record the input as incomplete and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Recommendation assumptions
- **Contents and format:** A concise explanation of the assumptions supporting the supply recommendations.
- **Next task or recipient:** T5: Send recommendation to organizer.
- **Complete when:** The assumptions are clearly connected to the recommendations and are ready for organizer review.

## 4. Planned Tools

### Tool 1

- **Tool name:** `explain_recommendation_assumptions`
- **Input:** Supply recommendations
- **Output:** Recommendation assumptions
- **Implementation Route:** Functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Generate an explanation of the assumptions behind the recommendations.
- **Task timeout:** 10 minutes
- **Maximum retries:** 1
- **Retry only when:** A temporary generation error occurs. Do not retry when the supply recommendations are missing.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the task as unresolved and hand the case to a CPVC organizer.