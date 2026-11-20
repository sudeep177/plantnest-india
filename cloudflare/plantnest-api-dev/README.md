# PlantNest development API Worker

This folder contains an isolated development copy of the PlantNest API Worker.

## Safety

- Worker name: `plantnest-api-dev`
- This is separate from the live `plantnest-api` Worker.
- Do not change the production Worker's code or deployment settings while testing.
- The Worker source intentionally starts as a copy of the currently supplied production Worker. Improvements will be tested here first.

## Required Cloudflare secret

Create a Worker secret named `PLANTNET_API_KEY` for **plantnest-api-dev** in the Cloudflare dashboard. Use the same provider key only if your Pl@ntNet plan permits its use by this second Worker. Never commit the key to GitHub.

## Deployment from the repository root

Use this command when configuring a build that runs from the repository root:

```sh
npx wrangler deploy --config cloudflare/plantnest-api-dev/wrangler.toml
```

If Cloudflare Workers Builds runs with this folder as its working directory, use:

```sh
npx wrangler deploy
```

## Current endpoints

- `POST /` — plant identification
- `POST /disease` — disease identification

The initial CORS allowlist is copied from the currently supplied Worker. Before testing from the Android app, confirm the actual Capacitor WebView origin and add it deliberately if needed.
