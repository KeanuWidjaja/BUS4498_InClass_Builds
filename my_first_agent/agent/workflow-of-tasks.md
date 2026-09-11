# Workflow of Tasks

*Replace all bracketed prompts with information specific to your proposed system. Delete instructional text that does not belong in your final specification. Add or remove task sections as needed. Every task shown in the general workflow must have a corresponding task specification below.*

## 1. Workflow Overview
### 1.1 Workflow Goal
This workflow supports the system goal defined in `my_first_agent/README.md`.

### 1.2 Workflow Trigger

The workflow begins when a CPVC organizer provides information about an upcoming event, including the event date, registration count, and available historical attendance information. The workflow may also be triggered shortly before the event when updated registration or confirmation information becomes available.

### 1.3 Completion Condition at Runtime

The workflow is complete when VibePrep provides an attendance estimate, an uncertainty range, and recommended quantities of food, drinks, and swag, and a CPVC organizer reviews and approves or modifies the recommendations.

### 1.4 General Workflow

VibePrep first gathers aggregate event information and, if appropriate, sends participants one lightweight attendance confirmation with no more than one reminder. It then estimates attendance using registration totals, the previous 40% attendance-to-registration rate, historical event data, and available aggregate confirmations.

The agent converts the attendance estimate into supply recommendations and explains its assumptions. If the data is limited or the forecast is uncertain, the agent clearly identifies the uncertainty and sends the recommendation to an organizer for review. After the event, organizers may enter actual attendance and supply outcomes so VibePrep can evaluate forecast accuracy and improve future estimates.

### 1.5 Workflow Diagram

[Insert a flowchart showing the tasks in sequence. Label each task with a task number and short name. Show decision branches, loops, review points, and possible stopping conditions. Below is an example of a Mermaid. You can either edit the mermaid below yourself or ask ChatGPT to generate a Mermaid script based on your workflow description above. Give every task a unique ID, such as T1, T2, and T3, and name tasks using a verb and an object in the mermaid.]

```mermaid
flowchart TD
    S1["Trigger: CPVC organizer provides event information"] --> T1["T1: Estimate attendance"]
    S2["Trigger: Updated registration or confirmation information becomes available"] --> T1
    T1 --> T2["T2: Recommend food, drink, and swag quantities"]
    T2 --> T3["T3: Explain recommendation assumptions"]
    T3 --> D1{"Is data limited or forecast uncertain?"}
    D1 -->|Yes| T4["T4: Identify forecast uncertainty"]
    T4 --> T5["T5: Send recommendation to organizer"]
    D1 -->|No| T5
    T5 --> T6["T6: Review recommendations"]
    T6 --> D2{"Does organizer approve or modify recommendations?"}
    D2 -->|Approve| C1(["C1: Workflow complete"])
    D2 -->|Modify| C1
    C1 --> D3{"Are actual attendance and supply outcomes entered?"}
    D3 -->|Yes| T7["T7: Enter actual attendance and supply outcomes"]
    T7 --> T8["T8: Evaluate forecast accuracy"]
    T8 --> T9["T9: Improve future estimates"]
    T9 --> T1
    D3 -->|No| C2(["C2: Post-event follow-up stops"])
```
