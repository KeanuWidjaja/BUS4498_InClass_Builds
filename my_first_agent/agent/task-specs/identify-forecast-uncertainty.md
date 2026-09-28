# Evaluate forecast accuracy Task Specification

## Basic Information

- **Task ID:** T8
- **Task name:** Evaluate forecast accuracy
- **Task type:** Verify
- **Task owner:** HackForecast

## 1. Task Description

Compare the attendance estimate with actual attendance and evaluate the forecast accuracy so VibePrep can improve future estimates.

## 2. Inputs

### Input 1

- **Input name:** Attendance estimate
- **Contents and format:** The estimated attendee count produced before the event.
- **Source:** T1: Estimate attendance.
- **If a required input is missing or invalid:** Record the evaluation as unresolved and hand the case to a CPVC organizer.

### Input 2

- **Input name:** Actual attendance and supply outcomes
- **Contents and format:** Recorded actual attendance and available supply outcome information.
- **Source:** T7: Enter actual attendance and supply outcomes.
- **If a required input is missing or invalid:** Record the evaluation as unresolved and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Forecast accuracy evaluation
- **Contents and format:** A comparison of estimated attendance and actual attendance, including the resulting forecast error and available supply outcome evidence.
- **Next task or recipient:** T9: Improve future estimates.
- **Complete when:** The comparison and forecast error are calculated and the evidence is ready for T9.

## 4. Planned Tools

### Tool 1

- **Tool name:** `calculate_forecast_error`
- **Input:** Attendance estimate and actual attendance and supply outcomes
- **Output:** Forecast accuracy evaluation
- **Implementation Route:** Functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Calculate the difference between estimated and actual attendance and summarize the available outcome evidence.
- **Task timeout:** 10 minutes
- **Maximum retries:** 1
- **Retry only when:** A temporary calculation error occurs. Do not retry when either required input is missing or invalid.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the evaluation as unresolved and hand the case to a CPVC organizer. Do not continue as if the calculation succeeded.