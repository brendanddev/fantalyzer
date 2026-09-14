import dotenv from "dotenv";
dotenv.config();

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://fantalyzer:fantalyzer@localhost:5432/fantalyzer";

const rawLeagues = process.env.SLEEPER_LEAGUES ?? "";
export const SLEEPER_LEAGUES: Record<string, string> = Object.fromEntries(
    rawLeagues.split(",").filter(Boolean).map(entry => entry.split(":") as [string, string])
);
