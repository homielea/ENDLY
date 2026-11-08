# Build log

## 2026-11-08: first release, session 1

**Inspection**
- Working folder: empty git repo, remote `homielea/ENDLY` (empty, created 2026-11-08,
  description "life end app"). No CLAUDE.md/AGENTS.md. Searched Lea's repos for
  Endly/Andly/Continuum: only `homielea/ENDLY` matches.
- `homielea/ENDLY` is **public**. The brief requires private source, so nothing was pushed
  before Lea decides (see HANDOFF.md).
- ChatGPT prototype at endly-family-conversations.homielea.chatgpt.site: blocked by the
  session's network proxy (403). Nothing was imported from it; this version is built from the brief.
- No Vercel/Netlify credentials in the environment. Deployment uses a private claude.ai Artifact.

**Built**
- Vite + vanilla TypeScript app, no runtime dependencies (≈41 KB single HTML file).
- Content for 3 paths × 4 steps, wishes (5 sections), preparation notes (5 categories × 3 fields).
- Autosave to localStorage key `endly.v1` with status line; unreadable saved data is set aside
  under `endly.v1.unreadable` instead of being overwritten.
- Summary page, Markdown export, print stylesheet, in-page delete confirmation.

**Tests**
- `npm test`: 9 unit tests (state round-trip, malicious/unknown fields, corrupt data, delete,
  blocked storage, summary labels, Markdown escaping). All pass.
- `npm run e2e`: 15 browser checks against the production build. All pass.

**Failures seen and fixed**
- e2e selectors "Back" and "Next step" also matched "Pause and come back later" and
  "Record next steps". Switched to exact matches (test-only issue).
- Preview server outlived the test run (killing `npx` left vite alive). Now spawned directly
  with node and stopped on exit.
- Phone header had ~100px of empty space under the nav (flex column + wrap). Switched to grid.
- First path card had a gap above its step list; card buttons wrapped awkwardly. Fixed layout;
  buttons now read "Begin"/"Resume" with the path name for screen readers.

**Deployment**
- Published `dist/artifact.html` as a private claude.ai Artifact:
  https://claude.ai/artifact/WvuT22XgnbTdBBGRufTacX (version 1). Read back and confirmed identical.
- Added e2e check that loads the Artifact build inside an iframe: Print/Download hidden,
  copy available, notes and last view restored in a fresh frame with no hash. 16/16 pass.

**Repository decision**: asked Lea, because `homielea/ENDLY` is public and the brief wanted
private source. Lea chose to push to the public repo. Pre-push scan: no secrets, no .env/key files.

**Next action**: Lea tries the deployed app on a phone (TASKS.md P1).

## 2026-11-08: restore from summary (session 1, increment 2)

**Acceptance check**: write notes in several places, copy the summary, delete everything, restore
by paste and by file. Every note returns under the same path, step, and label, including text with
Markdown symbols, quote marks, and blank lines.

**Built**
- `src/restore.ts`: `parseSummary()` reads the Markdown that `toMarkdown()` writes. It restores notes,
  skipped steps, wishes, and preparation notes, and ignores unknown headings and labels. Inputs over
  about 1 MB are rejected.
- "Your data" page: new "Restore notes from a summary" section (file picker or paste), an in-page
  confirmation with a count, a warning when it would replace existing notes, and Cancel.

**Tests**: 14 unit tests (5 new restore tests) and 18 browser tests (2 new, plus restore inside the
frame). All pass on the first run.

**Next action**: Lea tries the deployed app on a phone, including moving notes between two browsers.

## 2026-11-08: clear one part at a time + larger text (session 1, increment 3)

**Acceptance checks**
- Clearing a path, the wishes, or one preparation category removes only that part, after an
  in-page confirmation, and Cancel changes nothing.
- "Larger text" enlarges all text by 25%, is remembered after reload, survives restore, and causes
  no sideways scrolling on a phone.

**Built**
- `resetPath`, `clearWishes`, `clearPrepCategory`, `pathHasNotes` in `src/store.ts`; new
  `prefs.textSize` in saved state (defaults to standard; unknown values ignored).
- Reusable `clearControl()` in `src/main.ts` (quiet button → confirmation → message after clearing).
- Header "Larger text" toggle button (`aria-pressed`).

**Failure found and fixed (real bug)**
- Component styles (`.confirm { display: grid }`) overrode the `hidden` attribute, so in the
  standalone build every confirmation box was always visible. The claude.ai page hid this because
  its wrapper adds `[hidden]{display:none!important}`. Added that rule to `styles.css`, and the
  delete test now asserts the confirmation is hidden until asked for.
- At larger text on a phone the nav fell to one column and filled the first screen; now always
  two columns on narrow screens.

**Tests**: 16 unit, 20 browser. All pass.

**Next action**: Lea tries the app on a phone (larger text, clearing, restore between two browsers).
