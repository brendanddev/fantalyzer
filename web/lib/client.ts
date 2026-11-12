import { SleeperClient } from "@fantalyzer/ingest/client.js";
import { SLEEPER_LEAGUES, SLEEPER_USER_ID } from "@fantalyzer/config/config.js";

export const client = new SleeperClient();
export const leagueId = SLEEPER_LEAGUES["emoticon"];
export const userId = SLEEPER_USER_ID;
