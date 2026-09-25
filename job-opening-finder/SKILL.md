---
name: "job-opening-finder"
description: "Uses criteria given to it by the user to search various job websites such as Indeed for job openings related to the user. Use when user asks to generate a list of job openings."
---

# job-opening-finder

## User inputs
On each run, the user supplies the AI agent with the criteria that they want the AI to search for. This can be things like degree type, major studied, time constraints, pay range, etc.

## Procedure
1. Read user inputs
2. Scans job opportunity for matches with the user input
3. Assembles a list of job openings ranked from most similar to user input to least.

## Output
Return to the user a list of job opportunities split into different sections. These sections will be based off the user input. It will be formatted like this: "section 1: job opportunities that match '___,____,___'", "section 2: job opportunities that match '___,___'"

## Boundaries
No boundaries
