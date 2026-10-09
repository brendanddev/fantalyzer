# Fantalyzer

A personal fantasy football edge system.

> Work In Progress...

## Setup

```bash
npm install
cp .env.example .env    # Add your league IDs
npm run ingest
```

## Structure

```
fantalyzer/
├── data/
├── src/                   
│   ├── ingest/         # Ingests NFL fantasy data from Sleeper
│   ├── config/         # App configuration
│   ├── constants.ts    # Constants used throughout the app
```
