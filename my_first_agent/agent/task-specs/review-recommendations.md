# Send recommendation to organizer Task Specification

## Basic Information

- **Task ID:** T5
- **Task name:** Send recommendation to organizer
- **Task type:** Act
- **Task owner:** HackForecast

## 1. Task Description

Send the supply recommendations, assumptions, and any forecast uncertainty information to a CPVC organizer for review.

## 2. Inputs

### Input 1

- **Input name:** Planning recommendation package
- **Contents and format:** Supply recommendations, recommendation assumptions, and any applicable forecast uncertainty note.
- **Source:** T2: Recommend food, drink, and swag quantities; T3: Explain recommendation assumptions; and T4: Identify forecast uncertainty when applicable.
- **If a required input is missing or invalid:** Do not send the recommendation and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Recommendation delivery status
- **Contents and format:** Confirmation that the recommendation was sent, or an unresolved delivery status.
- **Next task or recipient:** T6: Review recommendations.
- **Complete when:** The recommendation package has been sent to the CPVC organizer or the delivery failure has been handed off.

## 4. Planned Tools

### Tool 1

- **Tool name:** `send_recommendation`
- **Input:** Planning recommendation package
- **Output:** Recommendation delivery status
- **Implementation Route:** Web API calls
- **Integration approach:** Direct integration
- **Role in this task:** Send the planning recommendation package to the CPVC organizer.
- **Task timeout:** 10 minutes
- **Maximum retries:** 0
- **Retry only when:** Not applicable because a second send could create a duplicate message.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the delivery as unresolved and hand the case to a CPVC organizer. Do not assume the message was sent.