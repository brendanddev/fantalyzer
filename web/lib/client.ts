import { SleeperClient } from "@fantalyzer/ingest/client.js";
import { SLEEPER_LEAGUES } from "@fantalyzer/config/config.js";

export const client = new SleeperClient();
export const leagueId = SLEEPER_LEAGUES["emoticon"];
