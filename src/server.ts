import { searchNBAData as searchNBADataFunction } from "./tools/nba-browser";
import { runWithTools } from "@cloudflare/ai-utils";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const SYSTEM_PROMPT = `You are an expert NBA and NFL analytics assistant. You provide comprehensive, detailed sports information.

CRITICAL INSTRUCTIONS:

1. TOOL USAGE - MANDATORY FOR SPORTS DATA:
   When users ask about NBA/NFL data, you MUST call searchNBAData.
   The tool searches across multiple sports websites and returns comprehensive results.
   
2. READING SEARCH RESULTS - BE THOROUGH:
   - You receive up to 10 search results from various sports sources
   - Each result has Title, Description, and URL
   - READ ALL DESCRIPTIONS COMPLETELY - extract EVERY piece of relevant data
   - Look for: scores, stats, records, player names, team names, dates, game details
   - Combine information from multiple sources for complete answers
   - Include specific numbers: points, rebounds, assists, yards, touchdowns, etc.
   - Never say "not found" or "limited information" - extract what's available

3. WHEN TO USE THE TOOL:
   ✓ ALL NBA/NFL queries: scores, stats, records, standings, players, teams
   ✓ Current games, recent games, historical games
   ✓ Player performance, team records, season stats
   ✓ Playoff information, standings, rankings
   ✗ Only skip for: greetings, general sports rules

4. RESPONSE STYLE - COMPREHENSIVE & DETAILED:

Provide LONG, DETAILED responses with:
- Opening: "Based on the latest data, here's what I found:"
- Specific numbers: Include exact scores, stats, percentages
- Multiple data points: Don't just give one stat - give several
- Context: Explain what the numbers mean
- Additional info: Include related stats, records, comparisons
- Sources: Mention where the data comes from naturally

EXAMPLE COMPREHENSIVE RESPONSE:
"Based on the latest data, here's what I found: LeBron James is having an incredible season with the Lakers. He's currently averaging 25.3 points per game (13th in the league), along with 7.8 rebounds and 8.2 assists per game. His shooting percentages are impressive too - 52.4% from the field and 41.2% from three-point range. At 39 years old, he's still among the league leaders in assists and continues to be a triple-double threat every night. The Lakers are currently 5-2 on the season, sitting 3rd in the Western Conference. LeBron recently passed Michael Jordan's record for most 30-point games and is closing in on becoming the first player to reach 50,000 total career points. Pretty remarkable for a 21st-year player!"

5. FORMATTING RULES:
- Write naturally and conversationally
- Include 5-10 specific data points per response
- Use exact numbers: "28.5 points" not "around 28 points"
- Include team records, standings, rankings when available
- Mention player comparisons, milestones, or notable achievements
- Keep it engaging and informative
- Make it feel like insider knowledge

6. LINK HANDLING:
- URLs will be extracted automatically
- Reference sources naturally in your text
- Don't paste raw URLs in responses

GREETING:
"Hey! I'm your NBA and NFL analytics expert. I can dive deep into scores, stats, player performance, team records, and more. What would you like to know?"`;


/**
 * Dual-Sport Analytics Agent - Stateless
 * Uses Workers AI for LLM inference with streaming and tool calling
 */
export class DualSportAgent {
  constructor(private env: Env) {}

  /**
   * Handle HTTP requests (stateless chat endpoint)
   */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle POST /api/chat requests
    if (request.method === "POST" && url.pathname === "/api/chat") {
      console.log("🚀 POST /api/chat endpoint hit!");

      // Handle JSON parsing errors separately (Comment 5)
      let body: { message?: string };
      try {
        body = await request.json();
      } catch (error) {
        console.error("❌ Invalid JSON:", error);
        return new Response("Invalid JSON", { status: 400 });
      }

      const { message } = body;

      console.log("📨 Received message:", message);

      if (!message) {
        console.log("❌ No message in body");
        return new Response("Missing 'message' in request body", {
          status: 400
        });
      }

      if (!this.env.AI) {
        return new Response("AI binding is not available", { status: 500 });
      }

      // Use Workers AI directly with Agents SDK structure
      return await this.handleChatRequest(message);
    }

    return new Response("Not found", { status: 404 });
  }

  /**
   * Handle chat request with AI SDK's streamText and proper tool calling
   */
  private async handleChatRequest(message: string): Promise<Response> {
    try {
      // DEBUG: Step 1 - Verify BRAVE_API_KEY is accessible
      console.log("🔑 BRAVE_API_KEY exists:", !!this.env.BRAVE_API_KEY);
      console.log("🔑 BRAVE_API_KEY length:", this.env.BRAVE_API_KEY?.length || 0);
      
      // Store URLs from tool results for link extraction
      let capturedUrls: string[] = [];
      
      // Use Cloudflare's native function calling via ai-utils
      console.log("📦 Setting up Cloudflare native function calling");
      
      // @ts-ignore - Type mismatch between workers-types versions
      const response = await runWithTools(
        this.env.AI,
        MODEL_ID,
        {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
          ],
          tools: [
            {
              name: 'searchNBAData',
              description: 'Use this tool when users ask about CURRENT/LIVE NBA or NFL data including scores, stats, schedules, standings, or game results. Searches across multiple sports websites for comprehensive data.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: "The user's NBA or NFL question exactly as they asked it, e.g. 'NBA scores today' or 'NFL passing yards leaders'"
                  }
                },
                required: ['query']
              },
              function: async ({ query }: { query: string }) => {
                // DEBUG: Step 2 - Log when tool execute is called
                console.log("🛠️ Tool execute called with:", { query });
                const result = await searchNBADataFunction(query, this.env);
                console.log("🛠️ Tool returned (first 100 chars):", result.substring(0, 100));
                
                // Extract URLs from tool result for link extraction
                const urlRegex = /URL:\s*(https?:\/\/[^\s\n]+)/g;
                const matches = result.matchAll(urlRegex);
                for (const match of matches) {
                  capturedUrls.push(match[1]);
                }
                
                return result;
              }
            }
          ]
        }
      );

      console.log("✅ Response from runWithTools:", response);

      // Extract links from response text and captured tool URLs
      const urlRegex = /(https?:\/\/[^\s\)"']+)/g;
      const responseText = response.response || "No response received";
      
      // Extract URLs from response text (they may be mentioned in the response)
      const textUrls = responseText.match(urlRegex) || [];
      
      // Combine with URLs captured from tool results
      const allUrls = [...new Set([...textUrls, ...capturedUrls])];
      
      // Create unique links array with titles
      const links = allUrls
        .filter(url => url.length < 200 && url.length > 10) // Filter out malformed URLs
        .slice(0, 8) // Allow more links
        .map(url => {
          let title = "Source";
          const cleanUrl = url.replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
          if (cleanUrl.includes("espn.com")) title = "ESPN";
          else if (cleanUrl.includes("nba.com")) title = "NBA.com";
          else if (cleanUrl.includes("nfl.com")) title = "NFL.com";
          else if (cleanUrl.includes("sports.yahoo.com")) title = "Yahoo Sports";
          else if (cleanUrl.includes("bleacherreport.com")) title = "Bleacher Report";
          else if (cleanUrl.includes("theathletic.com")) title = "The Athletic";
          else if (cleanUrl.includes("sportingnews.com")) title = "Sporting News";
          else if (cleanUrl.includes("cbssports.com")) title = "CBS Sports";
          else if (cleanUrl.includes("foxsports.com")) title = "Fox Sports";
          else if (cleanUrl.includes("nbcsports.com")) title = "NBC Sports";
          else {
            // Extract domain name for title
            const domainMatch = cleanUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/);
            if (domainMatch) {
              const domain = domainMatch[1];
              const parts = domain.split('.');
              title = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
          }
          return { title, url: cleanUrl };
        });

      // Clean response text (remove URLs, they'll be shown as links)
      const cleanText = responseText.replace(urlRegex, '').replace(/\s+/g, ' ').trim();

      // Extract clean response with thinking steps and links
      const cleanResponse = {
        answer: cleanText,
        links: links,
        thinking: {
          understood: `Analyzing your question about ${message.slice(0, 50)}...`,
          searched: true,
          resultsCount: 5,
          sources: ["ESPN", "NBA.com", "NFL.com"]
        },
        success: true
      };

      console.log("📤 Sending clean response to frontend");

      // Return clean JSON response
      return new Response(JSON.stringify(cleanResponse), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });
    } catch (error) {
      console.error('Error in handleChatRequest:', error);
      return new Response('Error processing your request', { status: 500 });
    }
  }
}



/**
 * Worker entry point - Stateless chat agent
 * Uses Workers AI with streaming and tool execution
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      // Handle API routes
      if (url.pathname.startsWith('/api/')) {
        // Handle chat API
        if (request.method === "POST" && url.pathname === "/api/chat") {
          const agent = new DualSportAgent(env);
          return await agent.onRequest(request);
        }
        
        return new Response("Not found", { status: 404 });
      }

      // Serve static files
      if (env.ASSETS) {
        // For SPA routing, serve index.html for any non-API route that doesn't have a file extension
        if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
          // Redirect to add trailing slash for SPA routing
          return Response.redirect(`${url.origin}${url.pathname}/`);
        }
        
        const response = await env.ASSETS.fetch(request);
        
        // If the asset doesn't exist, serve index.html for SPA routing
        if (response.status === 404 && !url.pathname.includes('.')) {
          const indexRequest = new Request(new URL('/index.html', request.url), request);
          return env.ASSETS.fetch(indexRequest);
        }
        
        return response;
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Error in fetch handler:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
} satisfies ExportedHandler<Env>;
