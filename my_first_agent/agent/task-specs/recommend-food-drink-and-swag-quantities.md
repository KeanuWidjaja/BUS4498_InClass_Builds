# Recommend food, drink, and swag quantities Task Specification

## Basic Information

- **Task ID:** T2
- **Task name:** Recommend food, drink, and swag quantities
- **Task type:** Reason
- **Task owner:** HackForecast

## 1. Task Description

Convert the attendance estimate into recommended quantities of food, drinks, and swag while balancing the risk of shortages against unnecessary waste.

## 2. Inputs

### Input 1

- **Input name:** Attendance estimate
- **Contents and format:** Estimated attendee count and available uncertainty information.
- **Source:** T1: Estimate attendance.
- **If a required input is missing or invalid:** Record the input as incomplete and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Supply recommendations
- **Contents and format:** Recommended quantities for food, drinks, and swag.
- **Next task or recipient:** T3: Explain recommendation assumptions.
- **Complete when:** Recommendations are provided for all three supply categories and are linked to the attendance estimate.

## 4. Planned Tools

### Tool 1

- **Tool name:** `recommend_supply_quantities`
- **Input:** Attendance estimate
- **Output:** Supply recommendations
- **Implementation Route:** Functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Produce food, drink, and swag quantity recommendations from the attendance estimate.
- **Task timeout:** 10 minutes
- **Maximum retries:** 1
- **Retry only when:** A temporary calculation error occurs. Do not retry when the attendance estimate is missing or invalid.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the task as unresolved and hand the case to a CPVC organizer.