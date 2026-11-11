# Fantalyzer

A personal fantasy football edge system.

> Work In Progress...

## Setup

```bash
npm install
cp .env.example .env    # Add your league IDs
npm run ingest
```

Dashboard:

```bash
cd web
npm install
npm run dev
```

## Structure

```
fantalyzer/
├── data/
├── web/                # Next.js dashboard
├── src/                   
│   ├── ingest/         # Ingests NFL fantasy data from Sleeper
│   ├── config/         # App configuration
│   ├── constants.ts    # Constants used throughout the app
```

## Coming Soon

TBD...
