# Fantalyzer

A personal fantasy football edge system.

---

## Services

| Service              | Status         |
|----------------------|----------------|
| `ingest-sleeper`     | Working        |
| `handcuff-service`   | Working        |
| `scoring-engine`     |                |
| `alert-dispatcher`   |                |

## Setup

**Clone the repository and set up the environment variables:**
```bash
git clone https://github.com/brendanddev/fantalyzer.git
cd fantalyzer
cp .env.example .env
# then fill in DATABASE_URL and SLEEPER_LEAGUES in .env
```

**Build and start every service + Postgres**
```bash
docker compose up --build
```

**Build and start a single service**
```bash
docker compose up --build handcuff-service
```

**Wipe all Postgres data and start fresh**
```bash
docker compose down -v
docker compose up --build
```

**Follow logs for one service**
```bash
docker compose logs -f ingest-sleeper
```

**Open a Postgres shell inside the running container**
```bash
docker compose exec postgres psql -U fantalyzer -d fantalyzer
```

**Check the most recently ingested events (run inside the psql shell above)**
```sql
SELECT source, league_id, fetched_at FROM raw_events ORDER BY fetched_at DESC LIMIT 10;
```
