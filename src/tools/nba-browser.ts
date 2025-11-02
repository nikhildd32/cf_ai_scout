import { tool } from 'ai';
import { z } from 'zod';
import puppeteer from '@cloudflare/puppeteer';

export const searchNBAData = tool({
  description: "Searches for live NBA data by browsing ESPN or NBA.com. Use this when users ask about current games, scores, player stats, standings, or recent game results. Provide a natural language query describing what NBA information to find.",
  parameters: z.object({
    query: z.string().describe("Natural language query like 'LeBron James stats today' or 'Lakers vs Warriors score'")
  }),
  // @ts-ignore - AI SDK tool typing issue
  execute: async (args: any, context: any) => {
    // Extract query from various possible formats
    let query: string = '';
    if (typeof args === 'string') {
      query = args;
    } else if (args && typeof args === 'object') {
      query = args.query || args.text || args.input || '';
    }
    
    console.log('🔍 searchNBAData tool called with args:', JSON.stringify(args));
    console.log('🔍 Extracted query:', query);
    
    if (!query || query === 'null' || query === 'undefined' || query.trim() === '') {
      return JSON.stringify({ 
        error: 'Query parameter is required. The tool needs a specific NBA-related question like "NBA games yesterday" or "LeBron James stats today".',
        receivedArgs: args
      });
    }
    
    const { BROWSER } = context || {};
    if (!BROWSER) {
      return JSON.stringify({ error: 'Browser binding is not available' });
    }
    const browser = await puppeteer.launch(BROWSER);
    const page = await browser.newPage();
    page.setDefaultTimeout(10000); // 10 second timeout for real web browsing

    try {
      // Parse query to determine date
      const lowerQuery = query.toLowerCase();
      let date = new Date();
      if (lowerQuery.includes('yesterday') || lowerQuery.includes('last night')) {
        date = new Date(Date.now() - 86400000);
      }
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

      // Strategy A: Use ESPN JSON API
      const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`;
      await page.goto(scoreboardUrl);
      const scoreboardData = await page.evaluate(() => JSON.parse(document.body.innerText));
      const events = scoreboardData.events || [];

      // Determine intent
      if (lowerQuery.includes('scoreboard') || lowerQuery.includes('games') || lowerQuery.includes('today') || lowerQuery.includes('yesterday')) {
        // Return scoreboard
        const games = events.map((event: any) => {
          const comp = event.competitions[0];
          const home = comp.competitors.find((c: any) => c.homeAway === 'home');
          const away = comp.competitors.find((c: any) => c.homeAway === 'away');
          return {
            gameId: event.id,
            date: event.date,
            status: event.status.type.detail,
            homeTeam: home.team.displayName,
            homeScore: home.score,
            awayTeam: away.team.displayName,
            awayScore: away.score
          };
        });
        return JSON.stringify({
          type: 'scoreboard',
          data: games,
          source: 'ESPN',
          timestamp: new Date().toISOString()
        });
      }

      // Check for specific game (two teams mentioned)
      const teamNames = ['lakers', 'warriors', 'celtics', 'bulls', 'heat', 'nets', 'knicks', 'bucks', '76ers', 'raptors', 'cavaliers', 'pistons', 'pacers', 'hawks', 'hornets', 'wizards', 'magic', 'grizzlies', 'pelicans', 'spurs', 'mavericks', 'thunder', 'trail blazers', 'jazz', 'nuggets', 'timberwolves', 'kings', 'clippers', 'suns'];
      const mentionedTeams = teamNames.filter(team => lowerQuery.includes(team));
      if (mentionedTeams.length >= 2) {
        const game = events.find((event: any) => {
          const comp = event.competitions[0];
          const teams = comp.competitors.map((c: any) => c.team.displayName.toLowerCase());
          return mentionedTeams.every((team: string) => teams.some((t: string) => t.includes(team)));
        });
        if (game) {
          const comp = game.competitions[0];
          const home = comp.competitors.find((c: any) => c.homeAway === 'home');
          const away = comp.competitors.find((c: any) => c.homeAway === 'away');
          return JSON.stringify({
            type: 'game_score',
            data: {
              gameId: game.id,
              date: game.date,
              status: game.status.type.detail,
              homeTeam: home.team.displayName,
              homeScore: home.score,
              awayTeam: away.team.displayName,
              awayScore: away.score
            },
            source: 'ESPN',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check for player stats
      const playerNames = ['lebron james', 'stephen curry', 'kevin durant', 'giannis antetokounmpo', 'kawhi leonard', 'james harden', 'anthony davis', 'luka doncic', 'nikola jokic', 'joel embiid', 'zion williamson', 'damian lillard', 'ja morant', 'donovan mitchell', 'jayson tatum'];
      const mentionedPlayer = playerNames.find(player => lowerQuery.includes(player));
      if (mentionedPlayer) {
        for (const event of events) {
          const gameId = event.id;
          const boxUrl = `https://www.espn.com/nba/boxscore?gameId=${gameId}&_xhr=1`;
          await page.goto(boxUrl);
          const boxData = await page.evaluate(() => {
            try {
              return JSON.parse(document.body.innerText);
            } catch {
              return null;
            }
          });
          if (boxData && boxData.gamepackageJSON) {
            const gameData = boxData.gamepackageJSON;
            const boxscore = gameData.boxscore;
            if (boxscore && boxscore.players) {
              for (const teamPlayers of boxscore.players) {
                for (const athlete of teamPlayers.athletes || []) {
                  if (athlete.athlete.displayName.toLowerCase().includes(mentionedPlayer)) {
                    // Build stats object
                    const statCategories = teamPlayers.statistics || [];
                    const statKeys = statCategories.flatMap((cat: any) => cat.stats.map((s: any) => s.name));
                    const statLabels = statCategories.flatMap((cat: any) => cat.stats.map((s: any) => s.label));
                    const statsObj: any = {};
                    athlete.stats.forEach((value: any, idx: number) => {
                      statsObj[statLabels[idx] || statKeys[idx]] = value;
                    });
                    return JSON.stringify({
                      type: 'player_stats',
                      data: {
                        player: athlete.athlete.displayName,
                        team: teamPlayers.team.displayName,
                        gameId,
                        stats: statsObj
                      },
                      source: 'ESPN',
                      timestamp: new Date().toISOString()
                    });
                  }
                }
              }
            }
          }
        }
      }

      // If no match, try fallback HTML scraping (Strategy B)
      await page.goto('https://www.espn.com/nba/scoreboard');
      const htmlData = await page.evaluate(() => {
        const games: any[] = [];
        const gameElements = document.querySelectorAll('.ScoreCell, .ScoreboardScoreCell'); // Approximate selectors
        gameElements.forEach(el => {
          const text = el.textContent?.trim() || '';
          // Parse simple text, e.g., "Lakers 105 - Warriors 98 FINAL"
          const match = text.match(/(.+) (\d+) - (.+) (\d+) (.+)/);
          if (match) {
            games.push({
              homeTeam: match[1],
              homeScore: match[2],
              awayTeam: match[3],
              awayScore: match[4],
              status: match[5]
            });
          }
        });
        return games;
      });
      if (htmlData.length > 0) {
        return JSON.stringify({
          type: 'scoreboard',
          data: htmlData,
          source: 'ESPN (HTML)',
          timestamp: new Date().toISOString()
        });
      }

      return JSON.stringify({ 
        error: `Could not find specific information about '${query}'. The page may have loaded but data wasn't found.`,
        query: query,
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      console.error('NBA Browser Tool Error:', e.message);
      return JSON.stringify({ 
        error: `Unable to browse NBA data: ${e.message}. This might be due to network issues or the site being unavailable.`,
        query: query,
        timestamp: new Date().toISOString()
      });
    } finally {
      await browser.close();
    }
  }
});