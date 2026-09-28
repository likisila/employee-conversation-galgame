# Deploying to Cloudflare directly

This is the automated alternative to the manual zip-and-drag-in-dashboard flow
described in `cloudflare-pages-upload/HOW-TO-UPDATE.md`. As of 2026-09-28 the
two flows **no longer target the same live site** — see "Migration from Pages"
below before assuming they're interchangeable.

## Status

Live at **https://sparkling-glitter-6ce0.rene-oops.workers.dev** as of
2026-09-28. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as
permanent user environment variables (via `setx`, per the one-time setup
below), so `npm run deploy:cf` works without any further login step.

Known harmless quirk: `wrangler whoami` fails to auto-list the account
(`Failed to automatically retrieve account IDs for the logged in user`)
because the API token doesn't include account-listing permission. This does
not affect `wrangler deploy` — it reads `CLOUDFLARE_ACCOUNT_ID` directly and
never calls the account-listing endpoint. Ignore that error from `whoami`.

## Migration from Pages (2026-09-28)

The project was originally deployed as a **Cloudflare Pages** project named
`sparkling-glitter-6ce0`, reachable at `sparkling-glitter-6ce0.pages.dev` —
that's what the manual zip flow in `cloudflare-pages-upload/HOW-TO-UPDATE.md`
still uploads to.

Wrangler 4.142 changed `wrangler pages deploy` to auto-delegate into
Cloudflare's newer unified Workers-with-static-assets model, and refused to
proceed non-interactively because a resource named `sparkling-glitter-6ce0`
already existed and it couldn't confirm it was safe to overwrite. Rather than
force that, the project now has an explicit `wrangler.jsonc` naming a
**Worker** called `sparkling-glitter-6ce0` (a different resource type than
the Pages project, despite the shared name), deployed with plain
`wrangler deploy`.

**This moved the live URL.** Migrating to Workers does not keep the
`pages.dev` subdomain — Cloudflare's own docs are explicit that a Worker gets
a `<name>.<account-subdomain>.workers.dev` address instead, and the old
`pages.dev` URL only stays live until the old Pages project is deleted. No
custom domain is configured for either resource.

Current state:
- **`npm run deploy:cf` / `wrangler deploy` → the new Worker**, live at
  `sparkling-glitter-6ce0.rene-oops.workers.dev`. This is the one Claude
  updates going forward.
- **The manual zip flow → the old Pages project**, still reachable at
  `sparkling-glitter-6ce0.pages.dev` as of 2026-09-28, but no longer updated
  by `npm run deploy:cf`. If you keep dragging the zip in there, that URL
  will drift out of sync with the Worker unless someone uploads to both.
- The old Pages project has **not** been deleted. Cloudflare's guidance is to
  validate the new Worker in real traffic first, then delete the Pages
  project deliberately (that's a destructive account-resource action — ask
  Claude to do it only when you're ready, or do it yourself from the
  dashboard under Workers & Pages).
- If you'd rather keep the `pages.dev` URL long-term (e.g. it's already
  shared somewhere), tell Claude — the fix is either pinning wrangler to a
  pre-4.142 version that still does a plain Pages deploy, or setting up the
  old `pages.dev`-equivalent as a custom domain on the new Worker.

## One-time setup

1. **Create a scoped API token** at
   https://dash.cloudflare.com/profile/api-tokens → **Create Token** →
   **Create Custom Token**.
   - Permission: **Account → Workers Scripts → Edit** (this also covers the
     Worker created here; a Pages-only token happened to still work for the
     migration deploy above, but Workers Scripts:Edit is the documented scope
     going forward).
   - Account Resources: **Include** → your account only.
   - Zone Resources: none needed.
   - Create it and copy the token (shown once).

2. **Find your Account ID**: Cloudflare dashboard → any domain's Overview
   page, right sidebar. Not secret, safe to note down anywhere.

3. **Set the values as environment variables** — do this in your own
   terminal, not by pasting the token into a chat:

   ```powershell
   setx CLOUDFLARE_API_TOKEN "paste-the-token-here"
   setx CLOUDFLARE_ACCOUNT_ID "your-account-id"
   ```

   `setx` sets them permanently for future terminal sessions. Close and
   reopen any terminal (or this Claude session) afterward so the new
   variables are picked up — `setx` does not affect the currently open shell.

   `CLOUDFLARE_PAGES_PROJECT` is no longer read by the deploy script — the
   Worker's name now lives in `wrangler.jsonc` (`name: "sparkling-glitter-6ce0"`)
   since it has to be static for `wrangler deploy` anyway. The environment
   variable can stay set (harmless) or be removed.

## Deploying

```bash
npm run build
npm run deploy:cf
```

`deploy:cf` runs `scripts/deploy-cloudflare.mjs`, which checks the two
environment variables are set, confirms `dist/index.html` exists, then runs
`wrangler deploy`. Wrangler reads `wrangler.jsonc`, uploads `dist/` as the
Worker's static assets, and publishes a new version at
`sparkling-glitter-6ce0.rene-oops.workers.dev`.

If a required environment variable is missing, the script stops with a
message naming which one, rather than prompting wrangler interactively.
