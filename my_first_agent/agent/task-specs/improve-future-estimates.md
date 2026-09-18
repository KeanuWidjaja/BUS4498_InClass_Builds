# Improve Future Estimates Task Specification

```yaml
# BASIC INFORMATION
task_id: "T9"
task_name: "Improve Future Estimates"
task_owner: "HackForecast"

# Agent Inference Configuration
Provider: [e.g., Groq, OpenAI, Claude, Google Gemini]
Model: "[Exact supported API model ID.]"
Role: [permitted subtasks the model supports]
Maximum inference requests per task run: "[Whole-number limit.]"
On inference failure or exhausted limits: Record the unresolved status and hand the case to [human role].
```

## 1. Task Goal

- **Objective:** This task should allow CPVC to learn from past events and continuously improve the accuracy of the attendance estimates of their events.
  
## 2. Inbound Inputs

### Input 1

- **Input name:** Forecast accuracy evaluation
- **What it contains:** The forecast accuracy results produced by T8: Evaluate forecast accuracy.
- **Source:** T8: Evaluate forecast accuracy.

## 3. Tool Permissions and Boundaries

## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Review forecast accuracy
- **Subtask description:** Examine the forecast accuracy evaluation from T8 and identify whether the previous attendance estimate was higher or lower than actual attendance.
- **Subtask boundary:** May use only the forecast accuracy evaluation provided by T8. May not collect new personal data or change the current event’s approved recommendations.
- **Retry limits:** May be attempted twice. If the evaluation is missing or unusable after two attempts, hand off to a CPVC organizer.

### Permitted Subtask 2

- **Subtask name:** Identify estimate adjustment
- **Subtask description:** Use the forecast accuracy finding to determine whether future attendance estimates should be adjusted.
- **Subtask boundary:** May propose an adjustment to future attendance estimates. May not change food, drink, or swag recommendations for the current event.
- **Retry limits:** May be attempted twice. If the appropriate adjustment remains unclear, hand off to a CPVC organizer.

### Permitted Subtask 3

- **Subtask name:** Update Future Estimate
- **Subtask description:** Apply the supported adjustment, or record that no adjustment is needed, so future attendance estimates can improve.
- **Subtask boundary:** May update future estimation guidance using the T8 evaluation. May not override organizer-approved plans or use information outside the workflow.
- **Retry limits:** May be attempted twice. If the update cannot be completed, hand off to a CPVC organizer.

- **Decision guidance:** After each subtask, use its findings to select the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to a person.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** The forecast accuracy evaluation from T8 has been reviewed and HackForecast has either recorded a supported adjustment for future attendance estimates or documented that no adjustment is needed. The result is available for future use by T1.
- **Hand off early when:** The T8 evaluation is missing, incomplete, conflicting, or insufficient to support an adjustment; the permitted retries are exhausted; or the request requires changing the current event’s approved recommendations.
- **Hand off to:** CPVC Organizer

Stop at the first applicable budget limit or handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable

- **Status:** Completed or escalated to human.
- **Result or recommendation:** The completed result. If escalated before reaching a supported result, write undetermined.
- **Evidence summary:** The most important evidence supporting the result or explaining why no result could be reached.
- **Subtasks performed:** Permitted subtasks completed, including repeated attempts.
- **Unresolved issues:** Remaining uncertainties or questions; use none only if no unresolved issue remains.
- **Handoff note:** Reason for stopping, unresolved questions, and what the reviewer needs to decide; write "Not applicable" for a completed task.
- **Next task or recipient:** Who receives the completed output? Unresolved cases go to the handoff recipient above.
