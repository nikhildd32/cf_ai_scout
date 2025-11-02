import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";
import { searchNBAData } from "./tools/nba-browser";

const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Worker entry point that handles stateless chat requests
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    try {
      // Handle POST /api/chat requests
      if (request.method === "POST" && new URL(request.url).pathname === "/api/chat") {
        const { message }: { message: string } = await request.json();

        console.log('📨 Received message:', message);

        if (!message) {
          return new Response("Missing 'message' in request body", { status: 400 });
        }

        if (!env.AI) {
          throw new Error("AI binding is not available");
        }

        const workersai = createWorkersAI({ binding: env.AI });
        const model = workersai.chat(MODEL_ID as Parameters<typeof workersai.chat>[0]);

        const result = await streamText({
          system: `You are an NBA analytics assistant with access to live NBA data.

CRITICAL: For ANY question about:
- Current games, scores, or schedules ("What games are today?", "Who won last night?")
- Player performance or stats ("How many points did X score?", "Show me player stats")
- Team records or standings
- Recent game results

YOU MUST use the searchNBAData tool. DO NOT respond without using the tool for these queries.

When calling searchNBAData, you MUST provide a query parameter with the user's question. For example:
- User: "What NBA games happened yesterday?" → Call searchNBAData with query: "NBA games yesterday"
- User: "Who scored the most points last night?" → Call searchNBAData with query: "highest scoring player last night"
- User: "What are today's NBA games?" → Call searchNBAData with query: "today NBA games schedule"

When you receive NBA-related questions:
1. ALWAYS call searchNBAData with a clear query parameter containing the user's question
2. Wait for the tool result
3. Present the data in a clear, conversational format

For general basketball knowledge (history, rules, definitions), you can answer directly.`,
          messages: [{ role: "user", content: message }],
          model,
          tools: { 
            searchNBAData: {
              ...searchNBAData,
              execute: async (args: any) => {
                // Pass BROWSER binding from env to the tool's context
                return (searchNBAData as any).execute(args, { BROWSER: env.BROWSER });
              }
            } as any
          }
        });

        // Convert fullStream to ReadableStream and return as Response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              console.log('🌊 Starting stream...');
              for await (const chunk of result.fullStream) {
                console.log('📦 Chunk type:', chunk.type);
                
                // Send text deltas to the client
                if (chunk.type === 'text-delta') {
                  console.log('✍️ Text delta:', chunk.text);
                  controller.enqueue(encoder.encode(chunk.text));
                } else if (chunk.type === 'tool-call') {
                  console.log('🔧 Tool call:', (chunk as any).toolName, (chunk as any).input || (chunk as any).args);
                } else if (chunk.type === 'tool-result') {
                  console.log('📊 Tool result:', (chunk as any).output || (chunk as any).result);
                } else if (chunk.type === 'finish') {
                  console.log('🏁 Stream finished:', chunk.finishReason);
                }
              }
              console.log('✅ Stream complete');
              controller.close();
            } catch (error) {
              console.error('❌ Stream error:', error);
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache'
          }
        });
      }

      // Fallback: serve static assets for SPA
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Error in fetch handler:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }
} satisfies ExportedHandler<Env>;
