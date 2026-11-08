import { describe, it, expect } from 'vitest';
import { emptyState, normalize, loadState, saveState, clearState, STORAGE_KEY, BACKUP_KEY, stepStatus, type StorageLike } from '../src/store';
import { PATHS } from '../src/content';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('store', () => {
  it('has three paths with four steps each', () => {
    expect(PATHS.map((p) => p.id)).toEqual(['family', 'legacy', 'succession']);
    for (const p of PATHS) expect(p.steps).toHaveLength(4);
  });

  it('round-trips notes, wishes, prep, and position', () => {
    const s = memory();
    const state = emptyState();
    state.paths.legacy.current = 2;
    state.paths.legacy.paused = true;
    state.paths.legacy.steps.remembrance.reflection = 'Quiet music';
    state.wishes.people = 'Sam and Ana';
    state.prep.will.location = 'Blue folder, study';
    state.route = { view: 'path', path: 'legacy' };
    expect(saveState(s, state)).toBe(true);
    const loaded = loadState(s);
    expect(loaded.status).toBe('loaded');
    expect(loaded.state).toEqual(state);
  });

  it('ignores unknown or malicious fields and clamps step index', () => {
    const st = normalize({
      route: { view: 'path', path: 'nope' },
      paths: { family: { current: 99, steps: { prepare: { reflection: 5, agreed: 'yes', evil: '<x>' } } } },
      wishes: { mattersMost: { not: 'a string' } },
      __proto__: { polluted: true },
    });
    expect(st.route).toEqual({ view: 'home' });
    expect(st.paths.family.current).toBe(3);
    expect(st.paths.family.steps.prepare.reflection).toBe('');
    expect(st.paths.family.steps.prepare.agreed).toBe('yes');
    expect((st.paths.family.steps.prepare as any).evil).toBeUndefined();
    expect(st.wishes.mattersMost).toBe('');
  });

  it('keeps unreadable data aside instead of overwriting it', () => {
    const s = memory();
    s.setItem(STORAGE_KEY, '{not json');
    const r = loadState(s);
    expect(r.status).toBe('corrupt');
    expect(s.getItem(BACKUP_KEY)).toBe('{not json');
  });

  it('clearState removes all Endly keys and leaves others alone', () => {
    const s = memory();
    s.setItem(STORAGE_KEY, '{}');
    s.setItem(BACKUP_KEY, 'x');
    s.setItem('other-app', 'keep');
    expect(clearState(s)).toBe(true);
    expect(s.getItem(STORAGE_KEY)).toBeNull();
    expect(s.getItem(BACKUP_KEY)).toBeNull();
    expect(s.getItem('other-app')).toBe('keep');
  });

  it('reports failure when storage throws', () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(saveState(broken, emptyState())).toBe(false);
    expect(loadState(broken).status).toBe('unavailable');
    expect(loadState(null).status).toBe('unavailable');
  });

  it('step status never claims agreement', () => {
    const n = emptyState().paths.family.steps.prepare;
    expect(stepStatus(n)).toBe('empty');
    n.skipped = true;
    expect(stepStatus(n)).toBe('skipped');
    n.unresolved = 'Who decides?';
    expect(stepStatus(n)).toBe('notes');
  });
});

import { resetPath, clearWishes, clearPrepCategory, pathHasNotes } from '../src/store';

describe('partial clearing', () => {
  it('clears only the chosen part', () => {
    const s = emptyState();
    s.paths.family.steps.values.reflection = 'a';
    s.paths.family.current = 2;
    s.paths.family.started = true;
    s.paths.legacy.steps.remembrance.agreed = 'b';
    s.wishes.people = 'c';
    s.prep.will.location = 'd';
    s.prep.business.notes = 'e';

    resetPath(s, 'family');
    expect(s.paths.family.current).toBe(0);
    expect(s.paths.family.started).toBe(false);
    expect(pathHasNotes(s, 'family')).toBe(false);
    expect(s.paths.legacy.steps.remembrance.agreed).toBe('b');

    clearPrepCategory(s, 'will');
    expect(s.prep.will.location).toBe('');
    expect(s.prep.business.notes).toBe('e');
    expect(s.wishes.people).toBe('c');

    clearWishes(s);
    expect(s.wishes.people).toBe('');
    expect(s.prep.business.notes).toBe('e');
  });

  it('keeps a valid text size preference only', () => {
    expect(normalize({ prefs: { textSize: 'large' } }).prefs.textSize).toBe('large');
    expect(normalize({ prefs: { textSize: '<huge>' } }).prefs.textSize).toBe('standard');
  });
});
