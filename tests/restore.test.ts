import { describe, it, expect } from 'vitest';
import { emptyState } from '../src/store';
import { toMarkdown } from '../src/summary';
import { parseSummary } from '../src/restore';

function contentOf(s: ReturnType<typeof emptyState>) {
  return { paths: Object.fromEntries(Object.entries(s.paths).map(([k, v]) => [k, v.steps])), wishes: s.wishes, prep: s.prep };
}

describe('restore from summary', () => {
  it('round-trips every field, including tricky text', () => {
    const s = emptyState();
    const tricky = '# not a heading\n\n> not a quote\n**Still open, to revisit**\n<b>tags</b> *stars* _under_ [link](x) a|b ~x~ \\slash `code`\n### Step 9: fake';
    s.paths.family.steps.prepare.reflection = 'Line one\nLine two';
    s.paths.family.steps.values.agreed = tricky;
    s.paths.family.steps.feelings.skipped = true;
    s.paths.legacy.steps['legacy-notes'].unresolved = 'Who keeps the photo albums?';
    s.paths.succession.steps.handover.reflection = 'Sample: start with the bookkeeping';
    s.wishes.funeral = 'Sample: quiet, by the sea';
    s.wishes.revisit = tricky;
    s.prep.will.location = 'Sample: blue folder';
    s.prep.business.notes = 'Sample: ask the accountant\n\nthen the bank';
    const result = parseSummary(toMarkdown(s));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(contentOf(result.state)).toEqual(contentOf(s));
    expect(result.found).toBe(8);
  });

  it('accepts Windows line endings and a byte-order mark', () => {
    const s = emptyState();
    s.wishes.people = 'Sam\nAna';
    const md = '﻿' + toMarkdown(s).replace(/\n/g, '\r\n');
    const r = parseSummary(md);
    expect(r.ok && r.state.wishes.people).toBe('Sam\nAna');
  });

  it('rejects text that is not an Endly summary', () => {
    const r = parseSummary('Dear diary, today...');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/does not look like an Endly summary/);
  });

  it('rejects an empty summary and oversized input', () => {
    const empty = parseSummary(toMarkdown(emptyState()));
    expect(empty.ok).toBe(false);
    expect(parseSummary('# Endly summary\n' + 'x'.repeat(1_000_001)).ok).toBe(false);
  });

  it('ignores unknown labels and headings', () => {
    const r = parseSummary('# Endly summary\n\n## My wishes\n\n### Wishes\n\n**Secret field**\n\n> nope\n\n**People I want involved**\n\n> Sam\n\n## Other\n\n### Wishes\n\n**What matters most to me**\n\n> ignored');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.found).toBe(1);
    expect(r.state.wishes.people).toBe('Sam');
    expect(r.state.wishes.mattersMost).toBe('');
  });
});
