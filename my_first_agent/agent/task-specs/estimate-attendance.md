# Estimate attendance Task Specification

## Basic Information

- **Task ID:** T1
- **Task name:** Estimate attendance
- **Task type:** Reason
- **Task owner:** HackForecast
## 1. Task Description

Estimate likely attendance using the event date, registration count, available historical attendance information, the previous 40% attendance-to-registration rate, and available aggregate confirmation information.

## 2. Inputs

### Input 1

- **Input name:** Upcoming event information
- **Contents and format:** Event date, current registration count, and available historical attendance information in a structured event record.
- **Source:** CPVC organizer through the workflow trigger.
- **If a required input is missing or invalid:** Record the input as incomplete and hand the case to a CPVC organizer.

## 3. Outputs

### Output 1

- **Output name:** Attendance estimate
- **Contents and format:** Estimated attendee count and available uncertainty information.
- **Next task or recipient:** T2: Recommend food, drink, and swag quantities.
- **Complete when:** The estimate is supported by the available event information and is ready for supply planning.

## 4. Planned Tools

### Tool 1

- **Tool name:** `estimate_attendance`
- **Input:** Upcoming event information
- **Output:** Attendance estimate
- **Implementation Route:** Functions/scripts
- **Integration approach:** Direct integration
- **Role in this task:** Calculate and produce the attendance estimate using the available event information.
- **Task timeout:** 10 minutes
- **Maximum retries:** 1
- **Retry only when:** The calculation fails because of a temporary processing error. Do not retry when required information is missing.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the task as unresolved and hand the case to a CPVC organizer.