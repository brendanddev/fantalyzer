import dotenv from "dotenv";
dotenv.config();

// Source of configuration across the app.

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://fantalyzer:fantalyzer@localhost:5432/fantalyzer";

export const SLEEPER_LEAGUES: Record<string, string> = {};
for (const entry of (process.env.SLEEPER_LEAGUES ?? "").split(",")) {
    const [name, id] = entry.split(":");
    if (!name || !id) throw new Error(`Bad league entry: "${entry}"`);
    SLEEPER_LEAGUES[name] = id;
}
