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

SLEEPER_LEAGUE_ID = get_env("SLEEPER_LEAGUE_ID")
