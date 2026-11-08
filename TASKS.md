# Tasks

Priority order. Each task has an observable acceptance check. `[x]` = done and verified by
`npm run check` (see BUILD_LOG.md).

## P0: first release
- [x] **Dashboard with three paths.** Home shows Family conversations, Life/legacy/goodbyes,
      Family-business succession, each with 4 steps and Begin/Resume. *(e2e: dashboard)*
- [x] **Conversation workspace.** One main question + "A way to begin" starter; three distinct
      note fields; Back/Next/Skip/Pause/Resume; step list with "Has notes / Skipped for now /
      Not started". *(e2e: each path)*
- [x] **Autosave with visible status.** "Saving…" then "Saved on this device at HH:MM";
      clear warning if storage is blocked. *(e2e: blocked storage)*
- [x] **Restore path and step after reload.** *(e2e: reload mid-path, reload after pause)*
- [x] **No implied agreement.** Finish wording and footnote say moving on decides nothing.
- [x] **Wishes area** with 5 sections, editable across reloads. *(e2e: wishes)*
- [x] **Preparation notes** (will, care directives, property/accounts/insurance, advisers,
      business succession) labelled as notes only, no uploads, no vault claims. *(e2e)*
- [x] **Export.** Markdown with the real saved text and correct labels; Copy everywhere,
      Download + Print when not framed; print stylesheet. *(unit + e2e)*
- [x] **Safe rendering** of user text in app and export. *(unit + e2e XSS payload)*
- [x] **Delete local data** with in-page confirmation and cancel; other sites' keys untouched. *(e2e)*
- [x] **Explain storage** on "Your data" page.
- [x] **Mobile + keyboard.** No sideways scroll at phone width; targets ≥44px; skip link;
      focus moves to page heading on navigation. *(e2e)*
- [x] **Production build** to a single self-contained HTML file.
- [x] **Protected deployment.** Private claude.ai Artifact (see HANDOFF.md for URL).
- [x] **Push source to GitHub.** Pushed to `homielea/ENDLY`, which is public by Lea's decision
      (brief originally asked for private). See HANDOFF.md.

## P1: next
- [ ] Verify the deployed Artifact on a real phone (Lea), including that notes persist after
      closing and reopening the page.
- [ ] Optional per-section "clear" for wishes and preparation notes (deletion is all-or-nothing today).
- [ ] Optional import of a previously exported summary (restore on a new device).
- [ ] Larger-text toggle for people who prefer it, beyond browser zoom.
- [ ] Usability session with 2–3 people from each primary audience; revise question wording.

## P2: later (needs a product decision first)
- [ ] Accounts and sync across devices (would change the privacy story; decide before building).
- [ ] Shared family space (multi-user; explicitly out of scope for the first release).
