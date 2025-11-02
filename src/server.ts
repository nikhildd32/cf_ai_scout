import { createWorkersAI } from "workers-ai-provider";
import { streamText, toDataStreamResponse } from "ai";
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

        if (!message) {
          return new Response("Missing 'message' in request body", { status: 400 });
        }

        if (!env.AI) {
          throw new Error("AI binding is not available");
        }

        const workersai = createWorkersAI({ binding: env.AI });
        const model = workersai.chat(MODEL_ID as Parameters<typeof workersai.chat>[0]);

        const result = await streamText({
          system: "You are a helpful NBA analytics assistant. When users ask about current NBA games, scores, or player stats, use the searchNBAData tool to browse live data from ESPN or NBA.com. For general basketball knowledge questions, answer directly without browsing.",
          messages: [{ role: "user", content: message }],
          model,
          tools: { searchNBAData },
          maxSteps: 5
        });

        return toDataStreamResponse(result);
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
