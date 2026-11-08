import { PATHS, NOTE_FIELDS, WISH_FIELDS, PREP_CATEGORIES, PREP_FIELDS } from './content';
import { stepStatus, STATUS_LABEL, type State } from './store';

export interface SummaryItem {
  label: string;
  text: string;
}

export interface SummaryBlock {
  heading: string;
  meta?: string;
  items: SummaryItem[];
}

export interface SummarySection {
  heading: string;
  note: string;
  blocks: SummaryBlock[];
}

export const SUMMARY_DISCLAIMER =
  'These are personal preparation notes from the Endly prototype. They are not a will, a care or health directive, or any other legal or medical document. A step marked as having notes does not mean anyone has agreed to anything.';

/** One shared structure feeds both the on-screen summary and the Markdown export. */
export function buildSummary(state: State): SummarySection[] {
  const sections: SummarySection[] = [];

  for (const p of PATHS) {
    const progress = state.paths[p.id];
    sections.push({
      heading: p.title,
      note: 'Guided conversation notes.',
      blocks: p.steps.map((s, i) => {
        const notes = progress.steps[s.id];
        return {
          heading: `Step ${i + 1}: ${s.title}`,
          meta: `${STATUS_LABEL[stepStatus(notes)]}. Question: ${s.question}`,
          items: NOTE_FIELDS.filter((f) => notes[f.key].trim() !== '').map((f) => ({
            label: f.label,
            text: notes[f.key],
          })),
        };
      }),
    });
  }

  sections.push({
    heading: 'My wishes',
    note: 'Wishes can change at any time. These notes are not legally binding.',
    blocks: [
      {
        heading: 'Wishes',
        items: WISH_FIELDS.filter((w) => state.wishes[w.key].trim() !== '').map((w) => ({
          label: w.label,
          text: state.wishes[w.key],
        })),
      },
    ],
  });

  sections.push({
    heading: 'Preparation notes',
    note: 'Notes about where things are kept. No documents are stored in Endly.',
    blocks: PREP_CATEGORIES.map((c) => ({
      heading: c.label,
      items: PREP_FIELDS.filter((f) => state.prep[c.key][f.key].trim() !== '').map((f) => ({
        label: f.label,
        text: state.prep[c.key][f.key],
      })),
    })),
  });

  return sections;
}

/** Backslash-escape characters that Markdown or embedded HTML would interpret. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>#|~]/g, (c) => '\\' + c);
}

function quote(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split('\n')
    .map((line) => (line.trim() === '' ? '>' : '> ' + escapeMarkdown(line)))
    .join('\n');
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function toMarkdown(state: State, now: Date = new Date()): string {
  const out: string[] = [];
  out.push('# Endly summary', '');
  out.push(`Exported ${formatDate(now)}.`, '');
  out.push(`_${SUMMARY_DISCLAIMER}_`, '');
  for (const section of buildSummary(state)) {
    out.push(`## ${section.heading}`, '', section.note, '');
    for (const block of section.blocks) {
      out.push(`### ${block.heading}`, '');
      if (block.meta) out.push(escapeMarkdown(block.meta), '');
      if (block.items.length === 0) {
        out.push('_Nothing written yet._', '');
        continue;
      }
      for (const item of block.items) {
        out.push(`**${item.label}**`, '', quote(item.text), '');
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function hasAnyContent(state: State): boolean {
  return buildSummary(state).some((s) => s.blocks.some((b) => b.items.length > 0));
}
