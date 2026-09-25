#!/usr/bin/env node
// Deploys dist/ to Cloudflare Pages via wrangler.
// Requires env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const required = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_PAGES_PROJECT"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  console.error("See docs/CLOUDFLARE_DEPLOY.md for how to set them.");
  process.exit(1);
}

if (!existsSync("dist/index.html")) {
  console.error("dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["wrangler", "pages", "deploy", "dist", "--project-name", process.env.CLOUDFLARE_PAGES_PROJECT],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
