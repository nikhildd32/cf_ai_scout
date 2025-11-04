# Dual-Sport Analytics Agent - Complete Specification

> **⚠️ IMPORTANT: SECURITY NOTE**
>
> This document may reference API keys, tokens, or other sensitive credentials. **NEVER include actual secrets in this document.** All credentials must be replaced with placeholders like `BRAVE_API_KEY=your_brave_api_key_here` or similar. Use environment variables, Cloudflare secrets, or `.dev.vars` files (which are in `.gitignore`) for actual credential storage.

## Architecture Overview

This system is a stateless dual-sport analytics agent built on **Cloudflare Workers** that uses:

- **Workers AI**: Llama 3.3 70B Instruct model for natural language understanding and generation
- **Brave Search API**: Real-time web search from authoritative sports sources (ESPN, NBA.com, NFL.com, sports news)
- **Cloudflare Agents SDK**: Agent orchestration, tool execution, and streaming response handling
- **TypeScript + React**: Frontend chat interface

The system is designed to answer questions about **NBA basketball** and **NFL football** by intelligently deciding when to fetch live data vs. when to answer from the model's knowledge base.

## Complete Flow

1. **User Query Submission**: User submits a query via the chat interface (e.g., "Who won the Lakers game last night?").

2. **Llama Analysis**: The Llama 3.3 model analyzes the query to determine:
   - Does this require live/current data? (scores, stats, schedules, standings, recent games)
   - Is this a greeting or historical/general knowledge question?
   - Which sport is referenced? (NBA, NFL, or both)

3. **Tool Decision**:
   - If live data is needed → Llama calls `searchNBAData` tool with an optimized query
   - If not needed → Llama responds directly from its knowledge base

4. **Query Optimization** (when tool is called):
   - Detect sport from keywords (NBA/NFL)
   - Append current year dynamically (unless query already contains year or temporal terms like "today", "tonight", "yesterday", "this week", "this season")
   - Add site filters: `site:espn.com OR site:nba.com OR site:nfl.com`

5. **Brave Search API Request**:
   - Fetch results from Brave Search API
   - Parse results from `data.web.results` array
   - Extract: title, snippet (preferred) or description, and URL

6. **Result Synthesis**: Llama receives the search results and synthesizes them into a coherent, contextual response with analysis and implicit source citations.

7. **Response Streaming**: The response is streamed back to the user in real-time as it's generated.

## Key Behavioral Rules

### When to Use the Tool (`searchNBAData`)

Call the tool for:

- **Current/Live data**: Recent game scores, today's games, tonight's schedule
- **Up-to-date stats**: Current season leaders, player statistics, team records
- **Schedules**: Upcoming games, game times, matchups
- **Standings**: Current season rankings, division standings
- **Recent results**: Games from last night, this week, this season
- **Player comparisons**: That require current season data

### When NOT to Use the Tool

Do NOT call the tool for:

- **Greetings**: "Hi", "Hello", "What can you do?"
- **Historical questions**: "Who won the 2020 NBA Finals?" (unless explicitly asking for current info)
- **General sports rules**: "How many players on a basketball team?"
- **Static knowledge**: Questions that don't change over time

### Greeting Handling

When the user greets or asks what the system can do:

- Respond warmly and mention both NBA and NFL capabilities
- Example: "Hello! I'm your dual-sport analytics assistant for NBA basketball and NFL football. I can help with live scores, stats, schedules, and more. What would you like to know?"

### Sport Detection Logic

The system detects sport from query keywords:

**NBA Keywords**: basketball, nba, lebron, giannis, lakers, celtics, warriors, bulls, heat, nets, knicks, bucks, 76ers, raptors, cavaliers, pistons, pacers, hawks, hornets, wizards, magic, grizzlies, pelicans, spurs, mavericks, thunder, trail blazers, jazz, nuggets, timberwolves, kings, clippers, suns

**NFL Keywords**: football, nfl, mahomes, lamar jackson, chiefs, patriots, eagles, bears, lions, packers, vikings, falcons, panthers, saints, buccaneers, commanders, cowboys, giants, jets, dolphins, bills, steelers, browns, bengals, ravens, chargers, raiders, broncos, cardinals, seahawks, rams

- If query contains NBA keywords but not NFL → NBA
- If query contains NFL keywords but not NBA → NFL
- If both or ambiguous → search both sports
- If neither detected → append generic year and site filters

### Query Optimization Rules

**Dynamic Year Computation**:

- Get current year from `new Date().getFullYear()`
- **Skip year appending if**:
  - Query already contains a 4-digit year pattern (`/\b\d{4}\b/`)
  - Query contains temporal terms: "today", "tonight", "yesterday", "this week", "this season"
- **Otherwise**: Append current year to improve relevance

**Example Transformations**:

- "NBA scores today" → "NBA scores today site:espn.com OR site:nba.com" (no year added due to "today")
- "Who's leading in passing yards?" → "NFL passing yards leaders 2025 site:espn.com OR site:nfl.com"
- "Lakers game last night" → "Lakers game last night NBA site:espn.com OR site:nba.com" (no year due to "last night")
- "NBA standings 2024" → "NBA standings 2024 site:espn.com OR site:nba.com" (year already present)

## Stateless Nature

The system is **completely stateless**, meaning:

- Each query is handled independently
- No user context is retained across interactions
- No conversation history is maintained
- This simplifies deployment on Cloudflare Workers (no database needed)
- Requires Llama to infer sport and intent from each individual message

**Page Reload Behavior**: Since the system is stateless, responses do not persist after page reload. Each new session starts fresh.

## Page Reload Verification

**Verification Requirement**: After implementing the system, verify that:

1. **Stateless Behavior**: Each page reload clears all previous conversation history
2. **Fresh Session**: New queries after reload do not reference previous interactions
3. **No Persistence**: No client-side storage (localStorage, sessionStorage) retains chat history
4. **Independent Queries**: Each query is handled independently without context from prior messages

**Test Procedure**:

1. Submit a query (e.g., "Who won the Lakers game last night?")
2. Receive and verify the response
3. Reload the page (F5 or Cmd+R)
4. Submit a follow-up query (e.g., "What about the Celtics?")
5. Verify the agent does NOT reference the previous Lakers query
6. Verify the agent treats the Celtics query as a fresh, independent request

**Expected Behavior**: The agent should handle the Celtics query without any knowledge of the previous Lakers conversation, demonstrating true statelessness.

## System Prompt Logic

The system prompt instructs Llama 3.3 with:

```
You are a dual-sport analytics assistant specializing in NBA basketball and NFL football.

TOOL USAGE RULES:
- Call searchNBAData ONLY for CURRENT/LIVE data: scores, stats, schedules, standings, recent games, or player comparisons requiring up-to-date info.
- DO NOT call searchNBAData for: greetings, historical questions (e.g., "Who won the 2020 NBA Finals?"), general sports rules, or static knowledge.
- For all other queries, answer directly from your knowledge.

GREETING HANDLING:
- Respond warmly and mention both NBA and NFL capabilities.

SPORT DETECTION:
- Identify if the query is NBA, NFL, or both based on keywords.
- If ambiguous, search for both sports.

QUERY OPTIMIZATION EXAMPLES:
- "Who's leading in passing yards?" → searchNBAData({query: "NFL passing yards leaders 2025 season"})
- "NBA scores today" → searchNBAData({query: "NBA scores today"})
- "Compare LeBron and Mahomes" → searchNBAData({query: "NBA LeBron James stats 2025 vs NFL Patrick Mahomes stats 2025"})

RESPONSE QUALITY STANDARDS:
- Provide context and analysis beyond raw stats.
- Cite sources implicitly by referencing authoritative sites like ESPN.
- Synthesize multiple search results into coherent insights.
```

## Data Flow Architecture

```
User Query
    ↓
Chat Interface (React)
    ↓
POST /api/chat
    ↓
Cloudflare Worker (src/server.ts)
    ↓
Llama 3.3 Analysis (Workers AI)
    ↓
[Decision: Use Tool?]
    ├─ No → Direct Response
    │       ↓
    │   Stream to User
    │
    └─ Yes → searchNBAData Tool
            ↓
        Query Optimization
        (sport detection, year, site filters)
            ↓
        Brave Search API
        (https://api.search.brave.com/res/v1/web/search)
            ↓
        Parse: data.web.results
        (prefer snippet over description)
            ↓
        Llama Synthesis
            ↓
        Stream to User
```

## Tool Parameter Design

### `searchNBAData` Tool

**Description**: Use this tool when users ask about CURRENT/LIVE NBA or NFL data including scores, stats, schedules, standings, or game results. Searches ESPN, NBA.com, NFL.com, and sports news sites.

**Input**:

- `query` (string): The user's NBA or NFL question exactly as they asked it, e.g. 'NBA scores today' or 'NFL passing yards leaders'

**Output**:

- Formatted text string with top 5 results:

  ```
  Title: [result title]
  Description: [snippet or description]
  Source: [URL]

  Title: [result title]
  ...
  ```

**API Response Parsing**:

- Parse from `data.web.results` (not `data.results`)
- Fallback to `[]` if `data.web` is undefined
- For each result:
  - Use `r.snippet` if available (preferred)
  - Fallback to `r.description` if snippet not available
  - Include `r.title` and `r.url`

## Response Quality Standards

The agent should:

1. **Provide Context**: Beyond raw stats, explain what they mean and how they relate
2. **Add Analysis**: Compare values, note trends, highlight significance
3. **Cite Sources Implicitly**: Reference authoritative sites like ESPN, NBA.com, NFL.com
4. **Synthesize Multiple Results**: Combine information from multiple search results into coherent insights
5. **Maintain Neutrality**: Present facts without bias toward specific teams or players

## Error Scenarios and Fallbacks

### API Rate Limit (429)

- **Response**: "Rate limit exceeded (Free tier: 2,000 queries/month). Please try again later."

### Network Errors

- **Response**: "Unable to fetch data: [error message]. This might be due to network issues."

### Empty Results

- **Response**: "No relevant results found. Try rephrasing your query or check for current season data."

### Missing API Key

- **Response**: "Brave API key is not available."

### Missing Query Parameter

- **Response**: "Query parameter is required. The tool needs a specific sports-related question like 'NBA games yesterday' or 'NFL stats today'."

### Fallback for Model Errors

If the model fails to provide a proper response (incomplete or empty):

- Check if query is about "best team" → Provide context about criteria and sport
- Check if query is about "stats" → Ask for clarification on player/team and sport
- Generic fallback: "Hi! I'm your dual-sport analytics assistant for NBA basketball and NFL football. I can help with live scores, player stats, game schedules, team records, and more. What would you like to know about NBA or NFL?"

## Testing Scenarios

### Basic Tests

1. **Greeting Test**:
   - Input: "Hi"
   - Expected: Warm greeting mentioning NBA and NFL capabilities, no tool call

2. **Simple NBA Query**:
   - Input: "Who won the Lakers game last night?"
   - Expected: Tool called with optimized query, returns game result with analysis

3. **Simple NFL Query**:
   - Input: "NFL scores today"
   - Expected: Tool called, returns current NFL scores

### Intermediate Tests

4. **Stat Query**:
   - Input: "Who's leading the NBA in points?"
   - Expected: Tool called, returns current season leader with stats

5. **Historical Question (No Tool)**:
   - Input: "Who won the 2020 NBA Finals?"
   - Expected: Direct answer from model knowledge, no tool call

6. **General Knowledge (No Tool)**:
   - Input: "How many players are on a basketball team?"
   - Expected: Direct answer, no tool call

### Advanced Tests

7. **Multi-Sport Query**:
   - Input: "Compare LeBron James and Patrick Mahomes"
   - Expected: Tool called for both sports, returns comparison

8. **Temporal Query (No Year Added)**:
   - Input: "NBA scores tonight"
   - Expected: Query doesn't append year (temporal term detected)

9. **Query with Existing Year**:
   - Input: "NBA standings 2024"
   - Expected: Year not appended again (year already present)

10. **Sport Ambiguity**:
    - Input: "What are the scores?"
    - Expected: Tool searches both sports or asks for clarification

### Edge Cases

11. **Empty Query**:
    - Input: "" or null
    - Expected: Error message requesting valid query

12. **Rate Limit**:
    - Input: Multiple rapid queries
    - Expected: Rate limit message after threshold

13. **Invalid Query Format**:
    - Input: Non-string or malformed args
    - Expected: Graceful error handling

## Status Messages

When the tool is called, show user feedback:

- Default: "🔍 Searching for live data... "
- NBA detected: "🔍 Searching for live NBA data... "
- NFL detected: "🔍 Searching for live NFL data... "

The sport is detected from the tool's query parameter.

## Implementation Priority

**Priority Order**:

1. **Core Functionality (P0)**:
   - Agent with `searchNBAData` tool using Cloudflare Agents SDK
   - Workers AI integration with Llama 3.3 70B
   - Brave Search API integration
   - Basic streaming responses

2. **Tool Intelligence (P0)**:
   - Sport detection logic (NBA vs NFL)
   - Query optimization (year appending, site filters)
   - Smart tool calling (when to use vs when not to)

3. **Response Quality (P1)**:
   - Context and analysis in responses
   - Implicit source citations
   - Multi-result synthesis

4. **Error Handling (P1)**:
   - API rate limit handling
   - Network error fallbacks
   - Missing parameter validation

5. **Status Messages (P2)**:
   - Sport-specific status messages during tool calls
   - User feedback during processing

6. **Testing & Verification (P2)**:
   - All test scenarios from Testing Scenarios section
   - Page reload verification
   - Edge case handling

## Implementation Details

### SDK Usage

**Implementation**: This system uses **Cloudflare Agents SDK** (`agents` package) for agent orchestration, tool execution, and streaming response handling.

**Key Components**:

- Agent class extending Cloudflare Agents SDK `Agent`
- Workers AI integration for Llama 3.3 70B model
- Tool registration for `searchNBAData`
- Streaming responses via Agents SDK utilities

### Configuration

**Production**:

- Set `BRAVE_API_KEY` using: `wrangler secret put BRAVE_API_KEY`
- Do NOT commit API keys to version control

**Local Development**:

- Use `.dev.vars` file (already in `.gitignore`)
- Format: `BRAVE_API_KEY=your-api-key-here`

**wrangler.jsonc**:

- `vars` section is commented out with instructions
- API keys should never be committed

## Assignment Requirements Checklist

- ✅ **LLM**: Llama 3.3 70B Instruct on Workers AI
- ✅ **Workflow/Coordination**: Tool orchestration via Cloudflare Agents SDK
- ✅ **User Input**: Chat interface with POST /api/chat endpoint
- ✅ **Memory/State**: Stateless (no persistence)
- ✅ **Real Data**: Brave Search API fetching live web data
- ✅ **Multi-sport**: NBA basketball and NFL football support

## Success Indicators

The implementation is successful when:

1. **Accurate Live Data**: Responses contain current, up-to-date information from authoritative sources
2. **Proper Tool Usage**: Tool is called for live data queries but not for greetings/historical questions
3. **Dual-Sport Handling**: System correctly identifies and handles NBA, NFL, and ambiguous queries
4. **Query Optimization**: Years and site filters are added appropriately without duplication
5. **Error Handling**: Graceful fallbacks for API errors, rate limits, and network issues
6. **Response Quality**: Answers include context, analysis, and implicit source citations
7. **Performance**: Fast response times with streaming for better UX

## Future Enhancements

Potential additions (not in current scope):

- MLB, NHL, and other sports support
- Voice input via Cloudflare Realtime API
- Conversation history/memory (if moving away from stateless)
- Custom agent behavior per sport
- Caching frequently requested data

---

# Appendix A: Full Original Specification

This appendix contains the complete original specification text verbatim, as provided in the initial requirements. This serves as the authoritative reference for all implementation details, behavioral rules, and verification criteria.

## Original Specification: Dual-Sport Analytics Agent

**Agent with searchNBAData tool using Cloudflare Agents SDK**

Build a stateless dual-sport analytics agent on Cloudflare Workers that:

1. **Uses Workers AI** (Llama 3.3 70B Instruct) to analyze queries and decide when to fetch live data
2. **Uses Brave Search API** to fetch real-time NBA and NFL data from ESPN, NBA.com, NFL.com, and sports news sites
3. **Answers questions about NBA basketball and NFL football** by intelligently deciding when to use the tool vs. answering from knowledge base
4. **Streams responses** back to users in real-time

### Architecture

- **Cloudflare Workers**: Stateless serverless environment
- **Workers AI**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` model
- **Cloudflare Agents SDK**: Agent orchestration, tool registration, streaming
- **Brave Search API**: Real-time web search (`https://api.search.brave.com/res/v1/web/search`)
- **TypeScript + React**: Frontend chat interface

### Complete Flow

1. User submits query via chat interface (e.g., "Who won the Lakers game last night?")
2. Llama 3.3 analyzes the query:
   - Does this require live/current data? (scores, stats, schedules, standings, recent games)
   - Is this a greeting or historical/general knowledge question?
   - Which sport? (NBA, NFL, or both)
3. Decision:
   - If live data needed → Llama calls `searchNBAData` tool with optimized query
   - If not needed → Llama responds directly from knowledge base
4. If tool called:
   - Query optimization: Detect sport (NBA/NFL), append current year dynamically (unless query contains year or temporal terms like "today", "tonight", "yesterday", "this week", "this season"), add site filters: `site:espn.com OR site:nba.com OR site:nfl.com`
   - Brave Search API request: Fetch results from `data.web.results` array, extract title, snippet (preferred) or description, and URL
   - Result synthesis: Llama receives search results and synthesizes into coherent, contextual response with analysis and implicit source citations
5. Response streaming: Stream response back to user in real-time

### Key Behavioral Rules

#### When to Use the Tool (`searchNBAData`)

Call the tool for:

- Current/Live data: Recent game scores, today's games, tonight's schedule
- Up-to-date stats: Current season leaders, player statistics, team records
- Schedules: Upcoming games, game times, matchups
- Standings: Current season rankings, division standings
- Recent results: Games from last night, this week, this season
- Player comparisons: That require current season data

#### When NOT to Use the Tool

Do NOT call the tool for:

- Greetings: "Hi", "Hello", "What can you do?"
- Historical questions: "Who won the 2020 NBA Finals?" (unless explicitly asking for current info)
- General sports rules: "How many players on a basketball team?"
- Static knowledge: Questions that don't change over time

#### Greeting Handling

When user greets or asks what system can do:

- Respond warmly and mention both NBA and NFL capabilities
- Example: "Hello! I'm your dual-sport analytics assistant for NBA basketball and NFL football. I can help with live scores, stats, schedules, and more. What would you like to know?"

#### Sport Detection Logic

The system detects sport from query keywords:

**NBA Keywords**: basketball, nba, lebron, giannis, lakers, celtics, warriors, bulls, heat, nets, knicks, bucks, 76ers, raptors, cavaliers, pistons, pacers, hawks, hornets, wizards, magic, grizzlies, pelicans, spurs, mavericks, thunder, trail blazers, jazz, nuggets, timberwolves, kings, clippers, suns

**NFL Keywords**: football, nfl, mahomes, lamar jackson, chiefs, patriots, eagles, bears, lions, packers, vikings, falcons, panthers, saints, buccaneers, commanders, cowboys, giants, jets, dolphins, bills, steelers, browns, bengals, ravens, chargers, raiders, broncos, cardinals, seahawks, rams

- If query contains NBA keywords but not NFL → NBA
- If query contains NFL keywords but not NBA → NFL
- If both or ambiguous → search both sports
- If neither detected → append generic year and site filters

#### Query Optimization Rules

**Dynamic Year Computation**:

- Get current year from `new Date().getFullYear()`
- **Skip year appending if**:
  - Query already contains a 4-digit year pattern (`/\b\d{4}\b/`)
  - Query contains temporal terms: "today", "tonight", "yesterday", "this week", "this season"
- **Otherwise**: Append current year to improve relevance

**Example Transformations**:

- "NBA scores today" → "NBA scores today site:espn.com OR site:nba.com" (no year added due to "today")
- "Who's leading in passing yards?" → "NFL passing yards leaders 2025 site:espn.com OR site:nfl.com"
- "Lakers game last night" → "Lakers game last night NBA site:espn.com OR site:nba.com" (no year due to "last night")
- "NBA standings 2024" → "NBA standings 2024 site:espn.com OR site:nba.com" (year already present)

### Stateless Nature

The system is **completely stateless**, meaning:

- Each query is handled independently
- No user context is retained across interactions
- No conversation history is maintained
- This simplifies deployment on Cloudflare Workers (no database needed)
- Requires Llama to infer sport and intent from each individual message

### Page Reload Verification

After implementing the system, verify that:

1. **Stateless Behavior**: Each page reload clears all previous conversation history
2. **Fresh Session**: New queries after reload do not reference previous interactions
3. **No Persistence**: No client-side storage (localStorage, sessionStorage) retains chat history
4. **Independent Queries**: Each query is handled independently without context from prior messages

**Test Procedure**:

1. Submit a query (e.g., "Who won the Lakers game last night?")
2. Receive and verify the response
3. Reload the page (F5 or Cmd+R)
4. Submit a follow-up query (e.g., "What about the Celtics?")
5. Verify the agent does NOT reference the previous Lakers query
6. Verify the agent treats the Celtics query as a fresh, independent request

**Expected Behavior**: The agent should handle the Celtics query without any knowledge of the previous Lakers conversation, demonstrating true statelessness.

### System Prompt

The system prompt instructs Llama 3.3 with:

```
You are a dual-sport analytics assistant specializing in NBA basketball and NFL football.

TOOL USAGE RULES:
- Call searchNBAData ONLY for CURRENT/LIVE data: scores, stats, schedules, standings, recent games, or player comparisons requiring up-to-date info.
- DO NOT call searchNBAData for: greetings, historical questions (e.g., "Who won the 2020 NBA Finals?"), general sports rules, or static knowledge (e.g., "How many players on a basketball team?").
- For all other queries, answer directly from your knowledge.

GREETING HANDLING:
- Respond warmly and mention both NBA and NFL capabilities, e.g., "Hello! I'm your dual-sport analytics assistant for NBA basketball and NFL football. I can help with live scores, stats, schedules, and more. What would you like to know?"

SPORT DETECTION:
- Identify if the query is NBA, NFL, or both based on keywords (e.g., "basketball/NBA/LeBron" for NBA; "football/NFL/Mahomes" for NFL).
- If ambiguous, search for both sports.

QUERY OPTIMIZATION EXAMPLES:
- "Who's leading in passing yards?" → searchNBAData({query: "NFL passing yards leaders 2025 season"})
- "NBA scores today" → searchNBAData({query: "NBA scores today"})
- "Compare LeBron and Mahomes" → searchNBAData({query: "NBA LeBron James stats 2025 vs NFL Patrick Mahomes stats 2025"})

RESPONSE QUALITY STANDARDS:
- Provide context and analysis beyond raw stats.
- Cite sources implicitly by referencing authoritative sites like ESPN.
- Synthesize multiple search results into coherent insights.
```

### Tool Parameter Design

#### `searchNBAData` Tool

**Description**: Use this tool when users ask about CURRENT/LIVE NBA or NFL data including scores, stats, schedules, standings, or game results. Searches ESPN, NBA.com, NFL.com, and sports news sites.

**Input**:

- `query` (string): The user's NBA or NFL question exactly as they asked it, e.g. 'NBA scores today' or 'NFL passing yards leaders'

**Output**:

- Formatted text string with top 5 results:

  ```
  Title: [result title]
  Description: [snippet or description]
  Source: [URL]

  Title: [result title]
  ...
  ```

**API Response Parsing**:

- Parse from `data.web.results` (not `data.results`)
- Fallback to `[]` if `data.web` is undefined
- For each result:
  - Use `r.snippet` if available (preferred)
  - Fallback to `r.description` if snippet not available
  - Include `r.title` and `r.url`

### Response Quality Standards

The agent should:

1. **Provide Context**: Beyond raw stats, explain what they mean and how they relate
2. **Add Analysis**: Compare values, note trends, highlight significance
3. **Cite Sources Implicitly**: Reference authoritative sites like ESPN, NBA.com, NFL.com
4. **Synthesize Multiple Results**: Combine information from multiple search results into coherent insights
5. **Maintain Neutrality**: Present facts without bias toward specific teams or players

### Error Scenarios and Fallbacks

#### API Rate Limit (429)

- **Response**: "Rate limit exceeded (Free tier: 2,000 queries/month). Please try again later."

#### Network Errors

- **Response**: "Unable to fetch data: [error message]. This might be due to network issues."

#### Empty Results

- **Response**: "No relevant results found. Try rephrasing your query or check for current season data."

#### Missing API Key

- **Response**: "Brave API key is not available."

#### Missing Query Parameter

- **Response**: "Query parameter is required. The tool needs a specific sports-related question like 'NBA games yesterday' or 'NFL stats today'."

#### Fallback for Model Errors

If the model fails to provide a proper response (incomplete or empty):

- Check if query is about "best team" → Provide context about criteria and sport
- Check if query is about "stats" → Ask for clarification on player/team and sport
- Generic fallback: "Hi! I'm your dual-sport analytics assistant for NBA basketball and NFL football. I can help with live scores, player stats, game schedules, team records, and more. What would you like to know about NBA or NFL?"

### Status Messages

When the tool is called, show user feedback:

- Default: "🔍 Searching for live data... "
- NBA detected: "🔍 Searching for live NBA data... "
- NFL detected: "🔍 Searching for live NFL data... "

The sport is detected from the tool's query parameter.

### Testing Scenarios

#### Basic Tests

1. **Greeting Test**:
   - Input: "Hi"
   - Expected: Warm greeting mentioning NBA and NFL capabilities, no tool call

2. **Simple NBA Query**:
   - Input: "Who won the Lakers game last night?"
   - Expected: Tool called with optimized query, returns game result with analysis

3. **Simple NFL Query**:
   - Input: "NFL scores today"
   - Expected: Tool called, returns current NFL scores

#### Intermediate Tests

4. **Stat Query**:
   - Input: "Who's leading the NBA in points?"
   - Expected: Tool called, returns current season leader with stats

5. **Historical Question (No Tool)**:
   - Input: "Who won the 2020 NBA Finals?"
   - Expected: Direct answer from model knowledge, no tool call

6. **General Knowledge (No Tool)**:
   - Input: "How many players are on a basketball team?"
   - Expected: Direct answer, no tool call

#### Advanced Tests

7. **Multi-Sport Query**:
   - Input: "Compare LeBron James and Patrick Mahomes"
   - Expected: Tool called for both sports, returns comparison

8. **Temporal Query (No Year Added)**:
   - Input: "NBA scores tonight"
   - Expected: Query doesn't append year (temporal term detected)

9. **Query with Existing Year**:
   - Input: "NBA standings 2024"
   - Expected: Year not appended again (year already present)

10. **Sport Ambiguity**:
    - Input: "What are the scores?"
    - Expected: Tool searches both sports or asks for clarification

#### Edge Cases

11. **Empty Query**:
    - Input: "" or null
    - Expected: Error message requesting valid query

12. **Rate Limit**:
    - Input: Multiple rapid queries
    - Expected: Rate limit message after threshold

13. **Invalid Query Format**:
    - Input: Non-string or malformed args
    - Expected: Graceful error handling

### Implementation Priority

**Priority Order**:

1. **Core Functionality (P0)**:
   - Agent with `searchNBAData` tool using Cloudflare Agents SDK
   - Workers AI integration with Llama 3.3 70B
   - Brave Search API integration
   - Basic streaming responses

2. **Tool Intelligence (P0)**:
   - Sport detection logic (NBA vs NFL)
   - Query optimization (year appending, site filters)
   - Smart tool calling (when to use vs when not to)

3. **Response Quality (P1)**:
   - Context and analysis in responses
   - Implicit source citations
   - Multi-result synthesis

4. **Error Handling (P1)**:
   - API rate limit handling
   - Network error fallbacks
   - Missing parameter validation

5. **Status Messages (P2)**:
   - Sport-specific status messages during tool calls
   - User feedback during processing

6. **Testing & Verification (P2)**:
   - All test scenarios from Testing Scenarios section
   - Page reload verification
   - Edge case handling

### Configuration

**Production**:

- Set `BRAVE_API_KEY` using: `wrangler secret put BRAVE_API_KEY`
- Do NOT commit API keys to version control

**Local Development**:

- Use `.dev.vars` file (already in `.gitignore`)
- Format: `BRAVE_API_KEY=your_brave_api_key_here`

**wrangler.jsonc**:

- `vars` section is commented out with instructions
- API keys should never be committed

### Assignment Requirements Checklist

- ✅ **LLM**: Llama 3.3 70B Instruct on Workers AI
- ✅ **Workflow/Coordination**: Agent with `searchNBAData` tool using Cloudflare Agents SDK
- ✅ **User Input**: Chat interface with POST /api/chat endpoint
- ✅ **Memory/State**: Stateless (no persistence)
- ✅ **Real Data**: Brave Search API fetching live web data
- ✅ **Multi-sport**: NBA basketball and NFL football support

### Success Indicators

The implementation is successful when:

1. **Accurate Live Data**: Responses contain current, up-to-date information from authoritative sources
2. **Proper Tool Usage**: Tool is called for live data queries but not for greetings/historical questions
3. **Dual-Sport Handling**: System correctly identifies and handles NBA, NFL, and ambiguous queries
4. **Query Optimization**: Years and site filters are added appropriately without duplication
5. **Error Handling**: Graceful fallbacks for API errors, rate limits, and network issues
6. **Response Quality**: Answers include context, analysis, and implicit source citations
7. **Performance**: Fast response times with streaming for better UX
8. **Statelessness**: Page reload verification confirms no conversation history persistence
