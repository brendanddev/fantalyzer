import { SleeperClient } from './client.js'
import { SLEEPER_LEAGUES } from '../config.js';
import { getLastInjuryStatus, upsertInjuryStatus } from '../db/db.js';

const client = new SleeperClient();
const TRENDING_POLL_INTERVAL_MS = 60_000;
const ROSTER_POLL_INTERVAL_MS = 5 * 60_000;
const PLAYERS_POLL_INTERVAL_MS = 24 * 60 * 60_000;
const INJURY_POLL_INTERVAL_MS = 15 * 60_000;
const NEWS_POLL_INTERVAL_MS = 30 * 60_000;

async function pollTrending(): Promise<void> {
    try {
        const trending = await client.getTrendingPlayers();
        if (!trending) return;

        for (const entry of trending) {
            // add trending player to db
        }
        console.log(`[ingest] polled-trending: ${trending.length} entries`);
    } catch (error) {
        console.error("trending poll failed:", error);
    } finally {
        setTimeout(pollTrending, TRENDING_POLL_INTERVAL_MS);
    }
}

async function pollRosters(): Promise<void> {
    try {
        for (const [leagueName, leagueId] of Object.entries(SLEEPER_LEAGUES)) {
            const rosters = await client.getRosters(leagueId);
            if (!rosters) continue;
            // insert into db here...

            console.log(`[ingest] polled rosters for ${leagueName}: ${rosters.length} teams`);
        }
    } catch (error) {
        console.error("trending rosters failed:", error);
    } finally {
        setTimeout(pollRosters, ROSTER_POLL_INTERVAL_MS);
    }
}

async function pollPlayers(): Promise<void> {
    try {
        const players = await client.refreshPlayers();
        if (!players) return;
        // insert into db here...

        console.log(`[ingest] refreshed player dump: ${Object.entries(players).length}`);
    } catch (error) {
        console.error("player refresh failed:", error);
    } finally {
        setTimeout(pollPlayers, PLAYERS_POLL_INTERVAL_MS);
    }
}

async function pollInjuryStates(): Promise<void> {
    try {
        const players = await client.getInjuryRelevantPlayers();
        let changed = 0;

        for (const player of players) {
            const previousState = await getLastInjuryStatus(player.player_id);
            if (previousState?.injury_status !== player.injury_status ||
                previousState?.practice_participation !== player.practice_participation) {
                changed++;
            }
            await upsertInjuryStatus(player.player_id, player.injury_status, player.practice_participation);
        }

        console.log(`[ingest] checked ${players.length} injury-relevant players, ${changed} changed`);
    } catch (error) {
        console.error("injury status poll failed:", error);
    } finally {
        setTimeout(pollInjuryStates, INJURY_POLL_INTERVAL_MS);
    }
}

async function pollNews(): Promise<void> {
    try {
        const injuredStarters = await client.getInjuredStarters(10);
        let changed = 0;

        for (const injuredStarter of injuredStarters) {
            const injuredStarterNews = await client.getPlayerNews(injuredStarter?.player_id, 3);
            for (const newsItem of injuredStarterNews) {

            }
        }

    } catch (err) {

    } finally {
        setTimeout(pollNews, NEWS_POLL_INTERVAL_MS);

    }
}


// for (const injuredStarter of injuredStarters) {
//     const injuredStarterNews = await client.getPlayerNews(injuredStarter.player_id, 3);

//     for (const newsItem of injuredStarterNews) {
//         // check: has newsItem.metadata.topic_id been seen before?
//         // if not: log/store it, mark it seen
//     }
// }


// async function pollTrendingNews(): Promise<void> {
//     const news = await client.getPlayerNews("5850", 3);
//     console.log(news);
// }

// pollTrending();
// pollRosters();
// pollPlayers();
// pollInjuryStates();

const starters = await client.getInjuredStarters(10);
console.log(starters.map(p => `${p.full_name} (${p.team} ${p.position})`));
