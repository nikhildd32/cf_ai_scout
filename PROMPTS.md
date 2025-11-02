# PROMPTS

## 1. Cursor Development Prompts

- PHASE 5: Async Workflows – implement daily report orchestration, add Workflows binding, and trigger from the agent interface.
- PHASE 6: Documentation – restructure README and create prompt inventory.
- PHASE 7: Deployment Prep – align Wrangler bindings and package scripts for deployment.

## 2. Agent System Prompt

The system prompt is injected inside `src/server.ts` before each `streamText` invocation. It combines a static frame with the dynamic schedule helper from `agents/schedule`.

```
You are a helpful assistant that can do various tasks...

${getSchedulePrompt({ date: new Date() })}

If the user asks to schedule a task, use the schedule tool to schedule the task.
```

## 3. Example LLM Prompts for Analysis

- “Analyze Giannis Antetokounmpo’s last five games and flag any efficiency trends I should watch.”
- “Compare Nikola Jokic and Joel Embiid based on performance rating and assist rate.”
- “Project the Mavericks’ starting lineup output for tomorrow and highlight any injury concerns.”
- “Summarize yesterday’s marquee matchups and suggest players worth scouting.”

## 4. Tool Descriptions

- `analyzePlayerPerformance`: “Analyzes player's historical performance and predicts upcoming game performance.” (requires confirmation)
- `getPlayerStats`: “Retrieves historical game statistics for a player.” (auto-exec)
- `comparePlayersHeadToHead`: “Compares two players statistically with head-to-head analysis.” (requires confirmation)
- `assessInjuryRisk`: “Evaluates injury risk based on workload and historical patterns.” (requires confirmation)
- `recordNewGameData`: “Records a new game's statistics for a player.” (auto-exec)
- `searchPlayers`: “Searches for players in database by name or team.” (auto-exec)
- `triggerDailyReport`: “Generate the daily analytics report via Workflows for the selected player list.” (requires confirmation)
