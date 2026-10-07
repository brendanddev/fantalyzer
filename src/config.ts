import dotenv from "dotenv";
dotenv.config();

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://fantalyzer:fantalyzer@localhost:5432/fantalyzer";

const rawLeagues = process.env.SLEEPER_LEAGUES ?? "";
