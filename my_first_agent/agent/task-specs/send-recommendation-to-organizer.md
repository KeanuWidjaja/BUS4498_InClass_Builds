# Identify forecast uncertainty Task Specification

## Basic Information

- **Task ID:** T4
- **Task name:** Identify forecast uncertainty
- **Task type:** Sense
- **Task owner:** HackForecast

## 1. Task Description

Identify and clearly describe important uncertainty in the attendance forecast when the available information is limited or the forecast may be unreliable.

## 2. Inputs

### Input 1

- **Input name:** Attendance estimate
- **Contents and format:** Estimated attendee count and available supporting information.
- **Source:** T1: Estimate attendance.
- **If a required input is missing or invalid:** Record the input as incomplete and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Forecast uncertainty note
- **Contents and format:** A description of the uncertainty affecting the attendance estimate.
- **Next task or recipient:** T5: Send recommendation to organizer.
- **Complete when:** The important uncertainty is documented clearly enough for organizer review.

## 4. Planned Tools

### Tool 1

- **Tool name:** `identify_forecast_uncertainty`
- **Input:** Attendance estimate
- **Output:** Forecast uncertainty note
- **Implementation Route:** Functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Identify and describe limitations or uncertainty in the attendance estimate.
- **Task timeout:** 10 minutes
- **Maximum retries:** 1
- **Retry only when:** A temporary processing error occurs. Do not retry when the attendance estimate is missing.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the task as unresolved and hand the case to a CPVC organizer.