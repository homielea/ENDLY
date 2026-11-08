# Handoff

_Updated after each increment. Distinguishes deployed, pushed, and local-only work._

## Current state
- App: first release complete; all P0 checks pass locally (`npm run check`).
- Deployed: private claude.ai Artifact, version 1, built from commit 19e5da9's app code:
  https://claude.ai/artifact/WvuT22XgnbTdBBGRufTacX
  (only Lea can open it while signed in; sharing is controlled from the page's Share menu).
  Verified by reading the published page back. It matches `dist/artifact.html`.
- Pushed: not yet (see blocker).
- Local-only: everything in this repository until the push happens.

## Blocker
`homielea/ENDLY` is a public repository. The brief requires private source, so the code has
not been pushed. To unblock: GitHub → homielea/ENDLY → Settings → General → Danger Zone →
Change visibility → Private. Then push branch `claude/blissful-ritchie-2adold`.

## How to resume
1. `npm install && npm run check` (needs Playwright + Chromium for the e2e step).
2. Read TASKS.md and continue from the first unchecked item.
3. To redeploy: `npm run build`, then publish `dist/artifact.html` to the same Artifact URL.
