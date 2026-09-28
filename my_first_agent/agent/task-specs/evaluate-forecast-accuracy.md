# Enter actual attendance and supply outcomes Task Specification

## Basic Information

- **Task ID:** T7
- **Task name:** Enter actual attendance and supply outcomes
- **Task type:** Remember
- **Task owner:** CPVC organizer

## 1. Task Description

Enter the actual attendance and supply outcomes after the event so VibePrep can evaluate forecast accuracy.

## 2. Inputs

### Input 1

- **Input name:** Post-event outcome information
- **Contents and format:** Actual attendance and available supply outcome information in a structured response.
- **Source:** CPVC organizer.
- **If a required input is missing or invalid:** Record the outcome information as incomplete and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Actual attendance and supply outcomes
- **Contents and format:** Recorded actual attendance and available food, drink, and swag outcome information.
- **Next task or recipient:** T8: Evaluate forecast accuracy.
- **Complete when:** The available post-event outcomes have been recorded and are ready for evaluation.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_event_outcomes`
- **Input:** Post-event outcome information
- **Output:** Actual attendance and supply outcomes
- **Implementation Route:** File operations
- **Integration approach:** Direct integration
- **Role in this task:** Record the CPVC organizer’s post-event information without generating or changing the information.
- **Task timeout:** Human response deadline: before forecast accuracy evaluation begins.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the outcomes as unresolved and hand the case to a CPVC organizer.