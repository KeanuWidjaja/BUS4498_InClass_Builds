# Improve Future Estimates Task Specification

```yaml
# BASIC INFORMATION
task_id: "T9"
task_name: "Improve Future Estimates"
task_owner: "HackForecast"

# Agent Inference Configuration
Provider: Claude
Model: "claude-opus-5-5"
Role: Review forecast accuracy, identify estimate adjustments, and update future attendance estimates. Unresolved cases go to a CPVC organizer.
Maximum inference requests per task run: 6
On inference failure or exhausted limits: Record the unresolved status and hand the case to a CPVC organizer.
```

## 1. Task Goal

- **Objective:** This task should allow CPVC to learn from past events and continuously improve the accuracy of the attendance estimates of their events.
  
## 2. Inbound Inputs

### Input 1

- **Input name:** Forecast accuracy evaluation
- **What it contains:** T8’s comparison of predicted attendance with actual attendance, including the forecast error and the direction and size of the error.
- **Source:** T8: Evaluate forecast accuracy.

### Input 2

- **Input name:** Current attendance-estimation guidance
- **What it contains:** The current rule or baseline used to estimate attendance, including the 40% attendance-to-registration rate and any existing adjustment guidance used by T1.
- **Source:** The current future-estimation guidance record used by T1.

## 3. Tool Permissions and Boundaries

### Task-Wide Limits

- **Total task timeout:** 10 minutes, including tool calls, retries, and waiting.
- **Maximum tool calls:** 3

### Tool 1

- **Tool name:** `record_future_estimate_guidance`
- **Input:** Forecast accuracy evaluation
- **Output:** Updated future estimate guidance
- **Implementation Route:** File operations
- **Integration approach:** Direct integration
- **Role in this task:** Support the permitted subtask **Update Future Estimate** by recording the supported adjustment or documenting that no adjustment is needed.
- **Task timeout:** 10 minutes
- **Maximum retries:** 2
- **Retry only when:** The first attempt fails before confirmation that the result was recorded. Before retrying, check whether the update was already recorded to avoid creating a duplicate. Do not retry when the forecast accuracy evaluation is missing, incomplete, conflicting, or insufficient.
- **On timeout, exhausted retries, or an error that cannot be retried:** Record the unresolved status and hand the case to a CPVC organizer. Do not continue as if the update succeeded.
  
## 4. How the Agent Should Reason

### Permitted Subtask 1

- **Subtask name:** Review forecast accuracy
- **Subtask description:** Examine T8’s predicted attendance, actual attendance, forecast error, and current attendance-estimation guidance. Produce an intermediate finding describing whether the estimate was above or below actual attendance and how large the error was.
- **Subtask boundary:** May use only the T8 evaluation and current estimation guidance. May not change the current event’s approved recommendations or collect new personal data.
- **Retry limits:** May be attempted twice. If the required evidence is missing or unusable after two attempts, hand off to a CPVC organizer.

### Permitted Subtask 2

- **Subtask name:** Determine estimate adjustment
- **Subtask description:** Compare the forecast error with the current estimation guidance. If the error is within ±15% of actual attendance, determine that no adjustment is needed. If the error exceeds ±15%, propose changing the attendance-estimation guidance in the direction and amount indicated by the observed attendance-to-registration result.
- **Subtask boundary:** May propose an adjustment to future attendance-estimation guidance. May not change the current event’s approved food, drink, or swag recommendations. If the evidence does not support a specific adjustment, hand off to a CPVC organizer.
- **Retry limits:** May be attempted twice. If the adjustment remains unsupported after two attempts, hand off to a CPVC organizer.

### Permitted Subtask 3

- **Subtask name:** Save and verify guidance
- **Subtask description:** Save the approved adjustment, or the finding that no adjustment is needed, in the future-estimation guidance record used by T1. Read the saved guidance back and verify that it matches the intended result.
- **Subtask boundary:** May update only the future-estimation guidance record. May not override organizer-approved plans or change unrelated workflow information. If the saved result cannot be verified, hand off to a CPVC organizer.
- **Retry limits:** May be attempted twice. Before retrying, check whether the intended update was already saved to avoid creating a duplicate or conflicting record.

- **Decision guidance:** After each subtask, use its findings to select the permitted subtask most likely to resolve the most important remaining uncertainty. Do not follow a fixed sequence. If no permitted subtask can make useful progress, stop and hand the case to a person.

## 5. When to Stop or Hand Off to a Human

- **Stop successfully when:** T9 has reviewed the complete T8 evaluation and current estimation guidance, determined whether an adjustment is needed, saved the revised guidance or recorded that no adjustment is needed, and verified that the saved guidance matches the intended result.
- **Hand off early when:** The T8 evaluation or current estimation guidance is missing, incomplete, or conflicting; the evidence does not support a specific adjustment; the guidance cannot be saved or verified; or the permitted retries are exhausted.
- **Hand off to:** A CPVC organizer.

Stop at the first applicable budget limit or handoff condition. While awaiting review, take no further autonomous action.

## 6. Outbound Deliverable

- **Status:** Completed or escalated to human.
- **Result or recommendation:** State whether the future attendance-estimation guidance was updated or whether no adjustment was needed. If updated, report the revised guidance and the reason for the change. If escalated, write undetermined.
- **Evidence summary:** Summarize T8’s predicted attendance, actual attendance, forecast error, current estimation guidance, and the criteria used to determine whether an adjustment was needed.
- **Subtasks performed:** Review forecast accuracy, determine estimate adjustment, and save and verify guidance, including repeated attempts.
- **Unresolved issues:** State any missing, conflicting, or insufficient evidence. Write none only if no unresolved issue remains.
- **Handoff note:** For a completed task, write Not applicable. For an escalation, explain what evidence was missing or why the adjustment could not be verified and what the CPVC organizer must decide.
- **Next task or recipient:** T1: Estimate attendance receives the saved future-estimation guidance for a later forecast. Unresolved cases go to a CPVC organizer.
