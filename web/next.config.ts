import path from "node:path";
import type { NextConfig } from "next";

// Repo root (one level above web/). Turbopack only resolves files inside its
// root, so it has to include ../dist where the compiled core code lives.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      // Import the tsc output (real .js files), never ../src directly.
      // Keep in sync with "paths" in tsconfig.json.
      "@fantalyzer/*": "../dist/*",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
