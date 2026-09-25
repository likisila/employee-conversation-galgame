# Deploying to Cloudflare Pages directly

This is the automated alternative to the manual zip-and-drag-in-dashboard flow
described in `cloudflare-pages-upload/HOW-TO-UPDATE.md`. Nothing here changes
that manual flow — use whichever you prefer.

## One-time setup

1. **Create a scoped API token** at
   https://dash.cloudflare.com/profile/api-tokens → **Create Token** →
   **Create Custom Token**.
   - Permission: **Account → Cloudflare Pages → Edit** (only this one).
   - Account Resources: **Include** → your account only.
   - Zone Resources: none needed.
   - Create it and copy the token (shown once).

2. **Find your Account ID**: Cloudflare dashboard → any domain's Overview
   page, right sidebar. Not secret, safe to note down anywhere.

3. **Find your Pages project name**: Cloudflare dashboard → Workers & Pages →
   the project you've been uploading the zip to. It's the `<project>` in
   `https://<project>.pages.dev`.

4. **Set the three values as environment variables** — do this in your own
   terminal, not by pasting the token into a chat:

   ```powershell
   setx CLOUDFLARE_API_TOKEN "paste-the-token-here"
   setx CLOUDFLARE_ACCOUNT_ID "your-account-id"
   setx CLOUDFLARE_PAGES_PROJECT "your-project-name"
   ```

   `setx` sets them permanently for future terminal sessions. Close and
   reopen any terminal (or this Claude session) afterward so the new
   variables are picked up — `setx` does not affect the currently open shell.

## Deploying

```bash
npm run build
npm run deploy:cf
```

`deploy:cf` runs `scripts/deploy-cloudflare.mjs`, which checks the three
environment variables are set, confirms `dist/index.html` exists, then runs
`wrangler pages deploy dist --project-name <project>`. Wrangler uploads
`dist/` straight to Cloudflare Pages as a new deployment on the same project
— same effect as dragging in the zip, minus the zip.

If a required environment variable is missing, the script stops with a
message naming which one, rather than prompting wrangler interactively.
