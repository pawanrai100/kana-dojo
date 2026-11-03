import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

// every build gets an id, baked into the page and written to public/version.json.
// open tabs compare the two to notice a new deploy (see components/layout/update-watcher)
function buildId(phase: string): string {
  const file = "public/version.json";
  if (phase === PHASE_DEVELOPMENT_SERVER) return "";
  if (phase === PHASE_PRODUCTION_BUILD) {
    // the config loads more than once per build, so keep one id for all of them
    const id = (process.env.KANA_BUILD_ID ||= process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36));
    writeFileSync(file, JSON.stringify({ id }));
    return id;
  }
  // next start: reuse the id the build wrote
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).id : "";
  } catch {
    return "";
  }
}

export default function config(phase: string): NextConfig {
  return {
    cacheComponents: true,
    partialPrefetching: true,
    env: { NEXT_PUBLIC_BUILD_ID: buildId(phase) },
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
