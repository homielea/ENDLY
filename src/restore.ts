import { PATHS, NOTE_FIELDS, WISH_FIELDS, PREP_CATEGORIES, PREP_FIELDS } from './content';
import { emptyState, type State } from './store';

/** Largest summary we will try to read (about 1 MB of text). */
export const MAX_RESTORE_CHARS = 1_000_000;

export type RestoreResult =
  | { ok: true; state: State; found: number }
  | { ok: false; error: string };

function unescapeMarkdown(text: string): string {
  return text.replace(/\\([\\`*_[\]<>#|~])/g, '$1');
}

type Target =
  | { kind: 'path'; pathIndex: number; stepIndex: number }
  | { kind: 'wishes' }
  | { kind: 'prep'; key: string }
  | null;

/**
 * Read a summary produced by `toMarkdown()` back into notes. Only the written
 * content is restored (notes, skipped steps, wishes, preparation notes); the
 * place in each path starts fresh. Unknown headings and labels are ignored.
 */
export function parseSummary(markdown: string): RestoreResult {
  if (markdown.length > MAX_RESTORE_CHARS) {
    return { ok: false, error: 'This file is too large to be an Endly summary.' };
  }
  const lines = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  if (!lines.some((l) => l.trim() === '# Endly summary')) {
    return {
      ok: false,
      error: 'This does not look like an Endly summary. It should start with the line “# Endly summary”.',
    };
  }

  const state = emptyState();
  let section = -1; // index into PATHS, or 100 = wishes, 200 = preparation, -1 = unknown
  let target: Target = null;
  let found = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      const title = h2[1].trim();
      const p = PATHS.findIndex((x) => x.title === title);
      section = p >= 0 ? p : title === 'My wishes' ? 100 : title === 'Preparation notes' ? 200 : -1;
      target = null;
      continue;
    }

    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      const title = h3[1].trim();
      target = null;
      if (section >= 0 && section < PATHS.length) {
        const m = title.match(/^Step (\d+):/);
        const stepIndex = m ? Number(m[1]) - 1 : -1;
        if (stepIndex >= 0 && stepIndex < PATHS[section].steps.length) {
          target = { kind: 'path', pathIndex: section, stepIndex };
        }
      } else if (section === 100) {
        target = { kind: 'wishes' };
      } else if (section === 200) {
        const cat = PREP_CATEGORIES.find((c) => c.label === title);
        if (cat) target = { kind: 'prep', key: cat.key };
      }
      continue;
    }

    if (!target) continue;

    if (target.kind === 'path' && line.startsWith('Skipped for now.')) {
      const path = PATHS[target.pathIndex];
      state.paths[path.id].steps[path.steps[target.stepIndex].id].skipped = true;
      continue;
    }

    const label = line.match(/^\*\*(.+)\*\*$/);
    if (!label) continue;

    // Collect the quoted lines that follow the label.
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    const quoted: string[] = [];
    while (j < lines.length && lines[j].startsWith('>')) {
      quoted.push(unescapeMarkdown(lines[j].replace(/^> ?/, '')));
      j++;
    }
    if (quoted.length === 0) continue;
    i = j - 1;
    const text = quoted.join('\n').trim();
    if (!text) continue;

    const name = label[1];
    if (target.kind === 'path') {
      const field = NOTE_FIELDS.find((f) => f.label === name);
      if (!field) continue;
      const path = PATHS[target.pathIndex];
      const notes = state.paths[path.id].steps[path.steps[target.stepIndex].id];
      notes[field.key] = text;
      notes.skipped = false;
      found++;
    } else if (target.kind === 'wishes') {
      const field = WISH_FIELDS.find((f) => f.label === name);
      if (!field) continue;
      state.wishes[field.key] = text;
      found++;
    } else {
      const field = PREP_FIELDS.find((f) => f.label === name);
      if (!field) continue;
      state.prep[target.key as keyof State['prep']][field.key] = text;
      found++;
    }
  }

  if (found === 0) {
    return { ok: false, error: 'This summary has no written notes in it, so there is nothing to restore.' };
  }
  return { ok: true, state, found };
}
