import {
  PATHS,
  NOTE_FIELDS,
  WISH_FIELDS,
  PREP_CATEGORIES,
  PREP_FIELDS,
  type PathId,
  type NoteKey,
  type WishKey,
  type PrepKey,
  type PrepField,
} from './content';

/** Everything Endly saves lives under this single localStorage key. */
export const STORAGE_KEY = 'endly.v1';
/** If saved data can't be read, the raw text is kept here instead of being overwritten. */
export const BACKUP_KEY = 'endly.v1.unreadable';

export type View = 'home' | 'path' | 'wishes' | 'preparation' | 'summary' | 'data';

export interface Route {
  view: View;
  path?: PathId;
}

export type StepNotes = Record<NoteKey, string> & { skipped: boolean };

export interface PathProgress {
  /** Index of the step the person is on (0-3). */
  current: number;
  paused: boolean;
  started: boolean;
  steps: Record<string, StepNotes>;
}

export interface State {
  version: 1;
  route: Route;
  paths: Record<PathId, PathProgress>;
  wishes: Record<WishKey, string>;
  prep: Record<PrepKey, Record<PrepField, string>>;
  updatedAt: string | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const VIEWS: View[] = ['home', 'path', 'wishes', 'preparation', 'summary', 'data'];

export function emptyStepNotes(): StepNotes {
  const notes = { skipped: false } as StepNotes;
  for (const f of NOTE_FIELDS) notes[f.key] = '';
  return notes;
}

export function emptyState(): State {
  const paths = {} as Record<PathId, PathProgress>;
  for (const p of PATHS) {
    const steps: Record<string, StepNotes> = {};
    for (const s of p.steps) steps[s.id] = emptyStepNotes();
    paths[p.id] = { current: 0, paused: false, started: false, steps };
  }
  const wishes = {} as Record<WishKey, string>;
  for (const w of WISH_FIELDS) wishes[w.key] = '';
  const prep = {} as Record<PrepKey, Record<PrepField, string>>;
  for (const c of PREP_CATEGORIES) {
    const fields = {} as Record<PrepField, string>;
    for (const f of PREP_FIELDS) fields[f.key] = '';
    prep[c.key] = fields;
  }
  return { version: 1, route: { view: 'home' }, paths, wishes, prep, updatedAt: null };
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Merge untrusted saved data onto a fresh state, keeping only known fields. */
export function normalize(raw: unknown): State {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;
  const r = raw as Record<string, any>;

  if (r.route && VIEWS.includes(r.route.view)) {
    state.route = { view: r.route.view };
    if (r.route.view === 'path') {
      if (PATHS.some((p) => p.id === r.route.path)) state.route.path = r.route.path;
      else state.route = { view: 'home' };
    }
  }

  for (const p of PATHS) {
    const saved = r.paths?.[p.id];
    if (!saved || typeof saved !== 'object') continue;
    const target = state.paths[p.id];
    const cur = Number(saved.current);
    target.current = Number.isInteger(cur) ? Math.min(Math.max(cur, 0), p.steps.length - 1) : 0;
    target.paused = saved.paused === true;
    target.started = saved.started === true;
    for (const s of p.steps) {
      const notes = saved.steps?.[s.id];
      if (!notes) continue;
      for (const f of NOTE_FIELDS) target.steps[s.id][f.key] = str(notes[f.key]);
      target.steps[s.id].skipped = notes.skipped === true;
    }
  }

  for (const w of WISH_FIELDS) state.wishes[w.key] = str(r.wishes?.[w.key]);
  for (const c of PREP_CATEGORIES) {
    for (const f of PREP_FIELDS) state.prep[c.key][f.key] = str(r.prep?.[c.key]?.[f.key]);
  }
  state.updatedAt = typeof r.updatedAt === 'string' ? r.updatedAt : null;
  return state;
}

export type LoadResult =
  | { status: 'loaded' | 'empty'; state: State }
  | { status: 'corrupt'; state: State }
  | { status: 'unavailable'; state: State };

export function loadState(storage: StorageLike | null): LoadResult {
  if (!storage) return { status: 'unavailable', state: emptyState() };
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable', state: emptyState() };
  }
  if (text == null) return { status: 'empty', state: emptyState() };
  try {
    return { status: 'loaded', state: normalize(JSON.parse(text)) };
  } catch {
    try {
      storage.setItem(BACKUP_KEY, text);
    } catch {
      /* nothing more we can do */
    }
    return { status: 'corrupt', state: emptyState() };
  }
}

export function saveState(storage: StorageLike | null, state: State): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(BACKUP_KEY);
    return storage.getItem(STORAGE_KEY) === null && storage.getItem(BACKUP_KEY) === null;
  } catch {
    return false;
  }
}

export function getBrowserStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    const probe = '__endly_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function stepHasNotes(notes: StepNotes): boolean {
  return NOTE_FIELDS.some((f) => notes[f.key].trim() !== '');
}

export type StepStatus = 'notes' | 'skipped' | 'empty';

export function stepStatus(notes: StepNotes): StepStatus {
  if (stepHasNotes(notes)) return 'notes';
  if (notes.skipped) return 'skipped';
  return 'empty';
}

export const STATUS_LABEL: Record<StepStatus, string> = {
  notes: 'Has notes',
  skipped: 'Skipped for now',
  empty: 'Not started',
};
