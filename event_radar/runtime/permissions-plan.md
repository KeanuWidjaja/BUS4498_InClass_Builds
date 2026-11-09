# Permissions and boundaries plan

Written in plain words with the BUS 4498 Agent Builder. Our AI assistant builds it following `runtime/permission-rules.md`. Where this plan and our task specifications disagree, this plan wins.

- Agent: Club Event Radar (`event_radar`)
- Owner, who answers for this agent: Keanu Widjaja
- Written on: November 8, 2026

## 1. May (on its own)

| # | Action |
|---|---|
| 1 | Read a post from the website or from the club chat |
| 2 | Look up the club list, the club’s earlier posts, and the lessons before it decides |
| 3 | Draft the event card from the post, and from nothing else |
| 4 | Publish a post that passes every rule and every switch |
| 5 | Reply in the chat with its decision and the reason |

## 2. May, with a limit

| # | What | The limit | Kind | Who can change it |
|---|---|---|---|---|
| 1 | Publish on its own | On. Off: every post waits for a moderator | A switch a reviewer can flip in the app | A signed-in reviewer, in the app, with a reason |
| 2 | Posts per day | 100 in any 24 hours; then it refuses until tomorrow | A number a reviewer can change in the app | A signed-in reviewer, in the app, with a reason |
| 3 | Days ahead | 60 days; further out, the post waits (rule R8) | A number a reviewer can change in the app | A signed-in reviewer, in the app, with a reason |
| 4 | New-club wait | 30 days for a club added to the list from now on; the clubs already on the list count as established | A number a reviewer can change in the app | A signed-in reviewer, in the app, with a reason |
| 5 | AI models | Claude Haiku 5.5; in test mode, Claude Sonnet 5.5 too, to compare | Fixed: only the builders change it | Only the builders, by changing the code |
| 6 | Post length | 2,000 characters | Fixed: only the builders change it | Only the builders, by changing the code |

## 3. Ask first (hold for a person)

| # | When | What the agent does instead |
|---|---|---|
| 1 | A date, a start time, or a place is missing | The post waits, and the reason names what is missing |
| 2 | The club isn’t on the club list | The post waits; a moderator can add the club |
| 3 | A rule is flagged: off campus, alcohol, a payment handle, a photo | The post waits for a moderator |
| 4 | The post tries to give the agent instructions | The post waits, flagged; nothing changes |
| 5 | The club joined the list within the new-club wait | The post waits for a moderator |

## 4. Never

| # | Never | Where it is enforced |
|---|---|---|
| 1 | Fill in a date, time, or place a new post didn’t give (an update may copy them from the club’s own earlier post) | Code |
| 2 | Publish a second live post for the same date, time, and place | A database rule |
| 3 | Change a switch or write a rule | A database rule |
| 4 | Delete a post | Code and a database rule |
| 5 | Show a personal phone number or payment handle on the website | Code |
| 6 | Act while it is paused | Code |

## 5. Who signs off

| Decision | Who | How |
|---|---|---|
| Every post that waits | A signed-in moderator | Approve or Reject in the Moderator drawer; the post records who and when |
| A new club | A signed-in moderator | Adds it to the club list |
| A switch or a limit | A signed-in moderator | The Permissions tab, with a reason |

## The off switch

Any signed-in moderator can flip Paused in the Permissions tab, with a reason. Paused, the agent answers “paused” and calls no AI.

## Rules we keep

- Every permission starts off. The agent may do only what this plan lists under *May* and *May, with a limit*.
- Writing a permission down does not enforce it. Every limit and every *Never* is enforced in code or in a database rule, never in instructions alone.
- A limit a person may change is a setting with an owner and a reason, which the code reads on every run.
- Asking means holding, not guessing: the record waits with a plain reason that names what is missing.
- A sign-off is a click in the app, recorded with who and when. A chat message is not a sign-off.
- Test mode never acts: with `dry_run`, the agent decides but saves nothing.
