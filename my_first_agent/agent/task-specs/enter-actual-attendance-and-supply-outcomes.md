# Review recommendations Task Specification

## Basic Information

- **Task ID:** T6
- **Task name:** Review recommendations
- **Task type:** Decide
- **Task owner:** CPVC organizer

## 1. Task Description

Review the attendance estimate, supply recommendations, assumptions, and uncertainty information. Decide whether to approve or modify the recommendations.

## 2. Inputs

### Input 1

- **Input name:** Planning recommendation package
- **Contents and format:** Attendance estimate, food recommendations, drink recommendations, swag recommendations, assumptions, and any uncertainty information.
- **Source:** T5: Send recommendation to organizer.
- **If a required input is missing or invalid:** Do not make a decision and request the missing information from VibePrep.

## 3. Outputs

### Output 1

- **Output name:** Organizer decision
- **Contents and format:** An approval or modification decision from the CPVC organizer.
- **Next task or recipient:** Workflow completion condition.
- **Complete when:** The CPVC organizer has approved or modified the recommendations.

## 4. Planned Tools

### Tool 1

- **Tool name:** `record_organizer_decision`
- **Input:** Planning recommendation package
- **Output:** Organizer decision
- **Implementation Route:** File operations
- **Integration approach:** Direct integration
- **Role in this task:** Present the recommendation package and record the organizer’s decision without making the decision for the organizer.
- **Task timeout:** Human response deadline: before event supplies are prepared.
- **Maximum retries:** Not applicable — manual task.
- **Retry only when:** Not applicable.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the decision as unresolved and hand the case to a CPVC organizer. A missed deadline is not approval.