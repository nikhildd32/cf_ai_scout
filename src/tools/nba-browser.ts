import { tool } from "ai";
import { z } from "zod";
import type { Env } from "../env";

/**
 * Core search function that performs the actual Brave Search API call
 */
export async function searchNBAData(query: string, env: Env): Promise<string> {
  // DEBUG: Step 3 - Log function entry
  console.log("🔍 searchNBAData function called with query:", query);
  
  // Increase result count for more comprehensive data
  const RESULT_COUNT = 10;

  if (
    !query ||
    query === "null" ||
    query === "undefined" ||
    query.trim() === ""
  ) {
    console.log("❌ Query validation failed");
    return 'Query parameter is required. The tool needs a specific sports-related question like "NBA games yesterday" or "NFL stats today".';
  }

  // DEBUG: Step 3 - Log API key availability
  const BRAVE_API_KEY = env.BRAVE_API_KEY;
  console.log("🔑 Using API key:", BRAVE_API_KEY ? (BRAVE_API_KEY.substring(0, 8) + "...") : "MISSING");
  
  if (!BRAVE_API_KEY) {
    console.log("❌ BRAVE_API_KEY is not available");
    return "Brave API key is not available.";
  }

  // Intelligent sport detection
  const nbaKeywords = [
      "basketball",
      "nba",
      "lebron",
      "giannis",
      "lakers",
      "celtics",
      "warriors",
      "bulls",
      "heat",
      "nets",
      "knicks",
      "bucks",
      "76ers",
      "raptors",
      "cavaliers",
      "pistons",
      "pacers",
      "hawks",
      "hornets",
      "wizards",
      "magic",
      "grizzlies",
      "pelicans",
      "spurs",
      "mavericks",
      "thunder",
      "trail blazers",
      "jazz",
      "nuggets",
      "timberwolves",
      "kings",
      "clippers",
      "suns"
  ];
  const nflKeywords = [
      "football",
      "nfl",
      "mahomes",
      "lamar jackson",
      "chiefs",
      "patriots",
      "eagles",
      "bears",
      "lions",
      "packers",
      "vikings",
      "falcons",
      "panthers",
      "saints",
      "buccaneers",
      "commanders",
      "cowboys",
      "giants",
      "jets",
      "dolphins",
      "bills",
      "steelers",
      "browns",
      "bengals",
      "ravens",
      "chargers",
      "raiders",
      "broncos",
      "cardinals",
      "seahawks",
      "rams"
  ];
  const lowerQuery = query.toLowerCase();
  const hasNBA = nbaKeywords.some((k) => lowerQuery.includes(k));
  const hasNFL = nflKeywords.some((k) => lowerQuery.includes(k));
  let sport = "";
  if (hasNBA && !hasNFL) sport = "NBA";
  else if (hasNFL && !hasNBA) sport = "NFL";
  else sport = "both";

    // Enhanced query optimization for better results
    const hasYear = /\b\d{4}\b/.test(query);
    
    // Check for temporal terms
    const temporalTerms = [
      "today", "tonight", "yesterday", "this week", "this season",
      "last night", "tomorrow", "recent", "last game", "last year",
      "last season", "previous season", "2024", "2023"
    ];
    
    const nflWeekPattern = /week\s*\d+/i;
    const hasNflWeek = nflWeekPattern.test(query);
    const hasTemporalTerm = temporalTerms.some((term) => lowerQuery.includes(term)) || hasNflWeek;

    let optimizedQuery = query;
    
    // Better query construction
    if (!hasYear && !hasTemporalTerm) {
      // Add current season context
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1;
      
      let seasonYear = currentYear;
      if (sport === "NFL" && month <= 8) {
        seasonYear = currentYear - 1;
      }
      
      // Add season-specific terms for better results
      if (sport === "NBA") {
        optimizedQuery = `${query} ${seasonYear}-${(seasonYear + 1) % 100} season`;
      } else if (sport === "NFL") {
        optimizedQuery = `${query} ${seasonYear} season`;
      } else {
        optimizedQuery = `${query} ${seasonYear}`;
      }
    } else if (lowerQuery.includes("last year") || lowerQuery.includes("last season")) {
      // For historical queries, be more specific
      const now = new Date();
      const lastYear = now.getUTCFullYear() - 1;
      optimizedQuery = query.replace(/last (year|season)/i, `${lastYear} season`);
    }
    
    // Add sport-specific terms if not already present
    if (sport === "NBA" && !lowerQuery.includes("nba")) {
      optimizedQuery += " NBA";
    } else if (sport === "NFL" && !lowerQuery.includes("nfl")) {
      optimizedQuery += " NFL";
    }

    // Search broadly across sports sites for comprehensive data
    // Don't restrict to specific sites - let Brave find the best sources
    optimizedQuery += " NBA NFL basketball football sports scores stats";

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(optimizedQuery)}&count=${RESULT_COUNT}`;
    
    // DEBUG: Step 3 - Log Brave API call
    console.log("🌐 Calling Brave API with optimized query:", optimizedQuery);
    console.log("🌐 Brave API URL:", url);
    
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_API_KEY
      }
    });

    // DEBUG: Step 3 - Log response status
    console.log("📡 Brave API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Brave API error:", errorText);
      
      if (response.status === 429) {
        return "Rate limit exceeded (Free tier: 2,000 queries/month). Please try again later.";
      }
      return `API error: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();
    console.log("📊 Brave API returned", data.web?.results?.length || 0, "results");
    
    if (data.error) {
      console.log("❌ Brave API data error:", data.error);
      return `Brave API error: ${data.error.message || data.error}`;
    }

    const results = data.web?.results || [];
    if (results.length === 0) {
      console.log("⚠️ No results found from Brave API");
      return "No relevant results found. Try rephrasing your query or check for current season data.";
    }

    let output = "";
    // Include all results for comprehensive data
    for (let i = 0; i < Math.min(results.length, RESULT_COUNT); i++) {
      const r = results[i];
      const summary = r.snippet || r.description || "";
      const fullText = r.description || r.snippet || "";
      // Include full description for more context
      output += `Title: ${r.title}\nDescription: ${fullText}\nSource: ${r.url}\nURL: ${r.url}\n\n`;
    }
    console.log("✅ Returning", output.length, "characters of results from", results.length, "sources");
    return output.trim();
  } catch (e: any) {
    console.error("❌ Brave Search Tool Error:", e.message, e.stack);
    return `Unable to fetch data: ${e.message}. This might be due to network issues.`;
  }
}
