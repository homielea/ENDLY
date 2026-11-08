import { describe, it, expect } from 'vitest';
import { emptyState } from '../src/store';
import { toMarkdown, escapeMarkdown, hasAnyContent } from '../src/summary';

describe('summary export', () => {
  it('contains saved text under the right labels', () => {
    const s = emptyState();
    s.paths.family.steps.values.reflection = 'Mum values her garden.';
    s.paths.family.steps.values.agreed = 'Visit every Sunday.';
    s.paths.family.steps.values.unresolved = 'Who handles the car?';
    s.paths.succession.steps.fairness.skipped = true;
    s.wishes.funeral = 'Sea shanties, please.';
    s.prep.advisers.contact = 'Sample Notary, Main St';
    const md = toMarkdown(s, new Date('2026-11-08T12:00:00Z'));
    expect(md).toContain('# Endly summary');
    expect(md).toContain('Exported 8 November 2026.');
    expect(md).toMatch(/### Step 2: Explore values[\s\S]*\*\*My own reflections\*\*\n\n> Mum values her garden\./);
    expect(md).toMatch(/\*\*What we agreed together\*\*\n\n> Visit every Sunday\./);
    expect(md).toMatch(/\*\*Still open, to revisit\*\*\n\n> Who handles the car\?/);
    expect(md).toMatch(/### Step 3: Explore fairness\n\nSkipped for now\./);
    expect(md).toMatch(/\*\*Funeral and remembrance preferences\*\*\n\n> Sea shanties, please\./);
    expect(md).toMatch(/### Key advisers\n\n\*\*Who knows about it or can help\*\*\n\n> Sample Notary, Main St/);
    expect(md).toContain('not a will');
    expect(hasAnyContent(s)).toBe(true);
    expect(hasAnyContent(emptyState())).toBe(false);
  });

  it('neutralises markup in user text', () => {
    expect(escapeMarkdown('<script>alert(1)</script> *bold* [x](y)')).toBe(
      '\\<script\\>alert(1)\\</script\\> \\*bold\\* \\[x\\](y)',
    );
    const s = emptyState();
    s.wishes.lovedOnes = '# Not a heading\n\n<img src=x onerror=alert(1)>';
    const md = toMarkdown(s);
    expect(md).toContain('> \\# Not a heading\n>\n> \\<img src=x onerror=alert(1)\\>');
    expect(md).not.toMatch(/^<img/m);
  });
});
