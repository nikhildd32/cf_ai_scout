# AI Prompts Used in This Project

## 1. Architecture Setup
"Build a dual-sport analytics agent on Cloudflare Workers using Llama 3.3 and Brave Search API"

## 2. Function Calling with @cloudflare/ai-utils
"Set up function calling with @cloudflare/ai-utils and runWithTools for the searchNBAData tool"

## 3. Brave Search Integration
"Create searchNBADataFunction that calls Brave Search API with BRAVE_API_KEY"

## 4. Frontend Integration
"Connect React frontend to /api/chat endpoint, parse JSON response, display clean messages"

## 5. System Prompt for Sports Agent
"You are a dual-sport analytics assistant. Use searchNBAData tool for CURRENT NBA/NFL data. Don't call for historical questions or greetings."

## 6. Bug Fix: Remove Agents SDK
"Remove DurableObjectBase error. Build stateless agent without Agents SDK, just Workers + runWithTools"

## 7. Frontend Response Cleanup
"Update frontend to hide JSON/tokens, display only answer text cleanly"
