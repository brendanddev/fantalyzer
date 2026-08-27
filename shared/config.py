import os


def get_env(key: str, default: str = None, required: bool = False) -> str:
    value = os.environ.get(key, default)
    if required and value is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


DATABASE_URL = get_env(
    "DATABASE_URL",
    default="postgresql://fantalyzer:fantalyzer@localhost:5432/fantalyzer",
)

_raw_leagues = get_env("SLEEPER_LEAGUES", default="")
SLEEPER_LEAGUES = {}
for entry in _raw_leagues.split(","):
    entry = entry.strip()
    if not entry:
        continue
    name, league_id = entry.split(":", 1)
    SLEEPER_LEAGUES[name.strip()] = league_id.strip()
