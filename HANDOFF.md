# Handoff

_Updated after each increment. Distinguishes deployed, pushed, and local-only work._

## Current state
- App: first release + restore + clear one part + larger text; all checks pass (`npm run check`: 16 unit, 20 browser).
- Deployed: private claude.ai Artifact, version 3 (adds clearing parts and larger text), built from commit 563ef53:
  https://claude.ai/artifact/WvuT22XgnbTdBBGRufTacX
  (only Lea can open it while signed in; sharing is controlled from the page's Share menu).
  Verified by reading the published page back. It matches `dist/artifact.html`.
- Pushed: branch `claude/blissful-ritchie-2adold` on https://github.com/homielea/ENDLY.
- Local-only: nothing (dist/ and node_modules/ are build outputs and are gitignored).

## Repository visibility (decision on record)
`homielea/ENDLY` is a **public** repository. The original brief asked for private source;
on 2026-11-08 Lea chose to push to the public repo anyway. The code has no secrets and no
personal data. To make it private later: GitHub → homielea/ENDLY → Settings → General →
Danger Zone → Change visibility → Private. The deployed app is unaffected by repo visibility.

## How to resume
1. `npm install && npm run check` (needs Playwright + Chromium for the e2e step).
2. Read TASKS.md and continue from the first unchecked item.
3. To redeploy: `npm run build`, then publish `dist/artifact.html` to the same Artifact URL.
