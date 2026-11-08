import './styles.css';
import { h } from './dom';
import {
  PATHS,
  NOTE_FIELDS,
  WISH_FIELDS,
  PREP_CATEGORIES,
  PREP_FIELDS,
  getPath,
  type GuidedPath,
  type PathId,
} from './content';
import {
  STORAGE_KEY,
  clearState,
  emptyState,
  getBrowserStorage,
  loadState,
  saveState,
  stepHasNotes,
  stepStatus,
  STATUS_LABEL,
  type Route,
  type State,
} from './store';
import { buildSummary, hasAnyContent, toMarkdown, SUMMARY_DISCLAIMER, formatDate } from './summary';
import { parseSummary, MAX_RESTORE_CHARS } from './restore';

// ---------------------------------------------------------------------------
// State and persistence
// ---------------------------------------------------------------------------

const storage = getBrowserStorage();
const loaded = loadState(storage);
let state: State = loaded.state;
let storageProblem: 'unavailable' | 'corrupt' | null =
  loaded.status === 'unavailable' || loaded.status === 'corrupt' ? loaded.status : null;

/** True when Endly runs inside another page's frame, where print and downloads are blocked. */
const framed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
let saveStatus: SaveStatus = state.updatedAt ? 'saved' : 'idle';
let lastSavedAt: Date | null = state.updatedAt ? new Date(state.updatedAt) : null;
let saveTimer: number | undefined;
let statusEl: HTMLElement | null = null;
let flash: string | null = null;

function timeLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderSaveStatus(): void {
  if (!statusEl) return;
  statusEl.dataset.state = saveStatus;
  switch (saveStatus) {
    case 'saving':
      statusEl.textContent = 'Saving…';
      break;
    case 'saved':
      statusEl.textContent = lastSavedAt
        ? `Saved on this device at ${timeLabel(lastSavedAt)}.`
        : 'Saved on this device.';
      break;
    case 'failed':
      statusEl.textContent =
        'Not saved. This browser is not letting Endly store notes. Copy anything important somewhere safe.';
      break;
    default:
      statusEl.textContent = 'Your notes save automatically on this device as you type.';
  }
}

function persist(): boolean {
  const ok = saveState(storage, state);
  return ok;
}

function saveNow(): void {
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  state.updatedAt = new Date().toISOString();
  if (persist()) {
    saveStatus = 'saved';
    lastSavedAt = new Date();
  } else {
    saveStatus = 'failed';
  }
  renderSaveStatus();
}

function scheduleSave(): void {
  saveStatus = 'saving';
  renderSaveStatus();
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 400);
}

function flushSave(): void {
  if (saveTimer !== undefined) saveNow();
}

window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

// ---------------------------------------------------------------------------
// Routing: plain #name hashes, mirrored into saved state so reloads resume.
// ---------------------------------------------------------------------------

const HASH_FOR_VIEW: Record<Exclude<Route['view'], 'path'>, string> = {
  home: 'home',
  wishes: 'wishes',
  preparation: 'preparation',
  summary: 'summary',
  data: 'your-data',
};

function routeToHash(route: Route): string {
  return route.view === 'path' && route.path ? route.path : HASH_FOR_VIEW[route.view as keyof typeof HASH_FOR_VIEW];
}

function hashToRoute(hash: string): Route | null {
  const name = hash.replace(/^#/, '');
  if (!name) return null;
  if (getPath(name)) return { view: 'path', path: name as PathId };
  for (const [view, h] of Object.entries(HASH_FOR_VIEW)) {
    if (h === name) return { view: view as Route['view'] };
  }
  return null;
}

function sameRoute(a: Route, b: Route): boolean {
  return a.view === b.view && a.path === b.path;
}

let rendered: Route | null = null;

function navigate(route: Route, message: string | null = null): void {
  flushSave();
  flash = message;
  if (route.view === 'path' && route.path) {
    const progress = state.paths[route.path];
    progress.started = true;
    progress.paused = false;
  }
  state.route = route;
  persistRoute();
  render(true);
  setHash(route);
}

/** Route and step position save quietly; they are not user notes. */
function persistRoute(): void {
  if (!persist() && storage) saveStatus = 'failed';
}

/** Render first, then update the hash; onHashChange ignores the echo. */
function setHash(route: Route): void {
  const target = '#' + routeToHash(route);
  if (location.hash === target) return;
  try {
    location.hash = target;
  } catch {
    /* some frames refuse hash changes; the saved route still restores on reload */
  }
}

window.addEventListener('hashchange', onHashChange);

function onHashChange(): void {
  const route = hashToRoute(location.hash) ?? { view: 'home' };
  if (rendered && sameRoute(route, rendered)) return;
  flushSave();
  flash = null;
  state.route = route;
  persistRoute();
  render(true);
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

const app = document.getElementById('app')!;
const main = h('main', { id: 'main', tabindex: '-1' });

const NAV: { label: string; route: Route }[] = [
  { label: 'Home', route: { view: 'home' } },
  { label: 'My wishes', route: { view: 'wishes' } },
  { label: 'Preparation', route: { view: 'preparation' } },
  { label: 'Summary', route: { view: 'summary' } },
  { label: 'Your data', route: { view: 'data' } },
];

const navLinks = NAV.map((item) =>
  h(
    'a',
    {
      href: '#' + routeToHash(item.route),
      class: 'nav-link',
      onclick: (e: MouseEvent) => {
        e.preventDefault();
        navigate(item.route);
      },
    },
    item.label,
  ),
);

app.replaceChildren(
  h('a', { href: '#main', class: 'skip-link', onclick: (e: Event) => { e.preventDefault(); focusHeading(); } }, 'Skip to content'),
  h(
    'div',
    { class: 'prototype-banner', role: 'note' },
    h('div', { class: 'wrap' },
      h('strong', {}, 'Prototype. '),
      'Please use sample information, not real personal details. Notes stay in this browser only.',
    ),
  ),
  h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'wrap header-inner' },
      h('a', {
        href: '#home',
        class: 'brand',
        onclick: (e: MouseEvent) => {
          e.preventDefault();
          navigate({ view: 'home' });
        },
      }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }), 'Endly'),
      h('nav', { 'aria-label': 'Main' }, h('ul', { class: 'nav-list' }, navLinks.map((a) => h('li', {}, a)))),
    ),
  ),
  main,
  h(
    'footer',
    { class: 'site-footer' },
    h('div', { class: 'wrap' },
      h('p', {}, 'Endly offers prepared questions, not a live counsellor or AI. It does not give legal, medical, or financial advice, and notes here do not create a valid will or care directive.'),
      h('p', {}, 'Nothing is sent anywhere. ', h('a', {
        href: '#your-data',
        onclick: (e: MouseEvent) => { e.preventDefault(); navigate({ view: 'data' }); },
      }, 'Where your notes are stored')),
    ),
  ),
);

function focusHeading(): void {
  const heading = main.querySelector<HTMLElement>('h1');
  (heading ?? main).focus({ preventScroll: false });
}

function updateNav(route: Route): void {
  NAV.forEach((item, i) => {
    const active = item.route.view === route.view || (item.route.view === 'home' && route.view === 'path');
    if (active) navLinks[i].setAttribute('aria-current', 'page');
    else navLinks[i].removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function saveStatusLine(): HTMLElement {
  statusEl = h('p', { class: 'save-status', role: 'status', 'aria-live': 'polite' });
  renderSaveStatus();
  return statusEl;
}

function storageWarning(): HTMLElement | null {
  if (storageProblem === 'unavailable') {
    return h('div', { class: 'notice notice-warn', role: 'alert' },
      h('p', {}, h('strong', {}, 'This browser is not letting Endly save. '),
        'You can still read and write, but your notes will be lost when you close this page. Private browsing or strict privacy settings can cause this.'));
  }
  if (storageProblem === 'corrupt') {
    return h('div', { class: 'notice notice-warn', role: 'alert' },
      h('p', {}, h('strong', {}, 'Endly could not read the notes saved earlier, so it started fresh. '),
        'The unreadable copy was set aside in this browser, not deleted. It is removed if you choose “Delete all notes” on the Your data page.'));
  }
  return null;
}

function flashNotice(): HTMLElement | null {
  if (!flash) return null;
  const text = flash;
  flash = null;
  return h('div', { class: 'notice', role: 'status' }, h('p', {}, text));
}

function textArea(opts: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  rows?: number;
  onInput: (value: string) => void;
}): HTMLElement {
  const hintId = opts.id + '-hint';
  const area = h('textarea', {
    id: opts.id,
    name: opts.id,
    rows: opts.rows ?? 4,
    'aria-describedby': opts.hint ? hintId : null,
    spellcheck: 'true',
  });
  area.value = opts.value;
  area.addEventListener('input', () => {
    opts.onInput(area.value);
    scheduleSave();
  });
  area.addEventListener('blur', flushSave);
  return h('div', { class: 'field' },
    h('label', { for: opts.id }, opts.label),
    opts.hint ? h('p', { class: 'hint', id: hintId }, opts.hint) : null,
    area,
  );
}

function button(label: string, onClick: () => void, cls = 'btn', extra: Record<string, unknown> = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: cls, onclick: onClick, ...extra }, label);
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

function pathCard(path: GuidedPath): HTMLElement {
  const progress = state.paths[path.id];
  const step = path.steps[progress.current];
  const withNotes = path.steps.filter((s) => stepHasNotes(progress.steps[s.id])).length;

  let where = 'Not started yet.';
  if (progress.paused) where = `Paused at step ${progress.current + 1}: ${step.title}.`;
  else if (progress.started) where = `You were on step ${progress.current + 1}: ${step.title}.`;

  const titleId = `card-${path.id}-title`;
  return h('article', { class: 'path-card', 'aria-labelledby': titleId, 'data-path': path.id },
    h('p', { class: 'eyebrow' }, path.forWhom),
    h('h2', { id: titleId }, path.title),
    h('p', {}, path.description),
    h('ol', { class: 'mini-steps', 'aria-label': 'Steps in this path' },
      path.steps.map((s) => h('li', { 'data-status': stepStatus(progress.steps[s.id]) }, s.title))),
    h('p', { class: 'card-status' }, where, withNotes > 0 ? ` Notes on ${withNotes} of ${path.steps.length} steps.` : ''),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => navigate({ view: 'path', path: path.id }) },
      progress.started ? 'Resume' : 'Begin', h('span', { class: 'sr-only' }, ` ${path.title}`)),
  );
}

function renderHome(): HTMLElement[] {
  return [
    h('section', { class: 'hero' },
      h('h1', { tabindex: '-1' }, 'Hard conversations, gently prepared'),
      h('p', { class: 'lede' },
        'Endly offers prepared questions to help families talk about getting older, care, wishes, and handing things on. Take one question at a time. Pause whenever you need to. You can always change your mind.'),
    ),
    flashNotice(),
    storageWarning(),
    h('section', { 'aria-labelledby': 'paths-heading', class: 'stack' },
      h('h2', { id: 'paths-heading', class: 'section-title' }, 'Choose a path'),
      h('div', { class: 'path-grid' }, PATHS.map(pathCard)),
    ),
    h('section', { 'aria-labelledby': 'more-heading', class: 'stack' },
      h('h2', { id: 'more-heading', class: 'section-title' }, 'Your own notes'),
      h('div', { class: 'link-grid' },
        linkCard('My wishes', 'What matters to you, who to involve, remembrance, and notes for loved ones.', { view: 'wishes' }),
        linkCard('Preparation notes', 'Where important papers are kept and who to ask. No uploads, no account numbers.', { view: 'preparation' }),
        linkCard('Summary and export', 'Read everything you have written in one place and copy it out.', { view: 'summary' }),
      ),
    ),
    h('aside', { class: 'gentle' },
      h('p', {}, 'It is fine if someone is not ready to talk. Saying “not now” is an answer too, and it can change. There is no deadline here.')),
  ].filter(Boolean) as HTMLElement[];
}

function linkCard(title: string, text: string, route: Route): HTMLElement {
  return h('a', {
    href: '#' + routeToHash(route),
    class: 'link-card',
    onclick: (e: MouseEvent) => { e.preventDefault(); navigate(route); },
  }, h('span', { class: 'link-card-title' }, title), h('span', { class: 'link-card-text' }, text));
}

// ---------------------------------------------------------------------------
// Conversation workspace
// ---------------------------------------------------------------------------

function renderPath(path: GuidedPath): HTMLElement[] {
  const progress = state.paths[path.id];
  const index = progress.current;
  const step = path.steps[index];
  const notes = progress.steps[step.id];
  const isLast = index === path.steps.length - 1;

  const goTo = (i: number) => {
    flushSave();
    progress.current = i;
    persistRoute();
    render(true);
  };

  const next = () => {
    if (stepHasNotes(notes)) notes.skipped = false;
    if (isLast) {
      flushSave();
      persistRoute();
      navigate({ view: 'home' }, `You have reached the end of “${path.title}”. Nothing has to be settled. You can return to any step whenever you like.`);
      return;
    }
    goTo(index + 1);
  };

  const skip = () => {
    if (!stepHasNotes(notes)) notes.skipped = true;
    saveNow();
    if (isLast) {
      navigate({ view: 'home' }, `You have reached the end of “${path.title}”. Skipped steps stay open for whenever you want them.`);
      return;
    }
    goTo(index + 1);
  };

  const pause = () => {
    flushSave();
    flash = 'Paused. Your notes are saved on this device. Resume whenever you are ready, or not at all.';
    state.route = { view: 'home' };
    progress.paused = true;
    persistRoute();
    render(true);
    setHash(state.route);
  };

  const stepper = h('nav', { 'aria-label': `${path.title} steps`, class: 'stepper' },
    h('ol', {}, path.steps.map((s, i) => {
      const st = stepStatus(progress.steps[s.id]);
      return h('li', {},
        h('button', {
          type: 'button',
          class: 'stepper-btn',
          'aria-current': i === index ? 'step' : null,
          'data-status': st,
          onclick: () => goTo(i),
        },
        h('span', { class: 'stepper-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('span', { class: 'stepper-text' },
          h('span', { class: 'stepper-title' }, s.title),
          h('span', { class: 'stepper-status' }, STATUS_LABEL[st])),
        ));
    })),
  );

  const fields = NOTE_FIELDS.map((f) =>
    textArea({
      id: `${path.id}-${step.id}-${f.key}`,
      label: f.label,
      hint: f.hint,
      value: notes[f.key],
      rows: f.key === 'reflection' ? 6 : 3,
      onInput: (v) => { notes[f.key] = v; },
    }),
  );

  return [
    h('p', { class: 'back-link' }, h('a', {
      href: '#home',
      onclick: (e: MouseEvent) => { e.preventDefault(); navigate({ view: 'home' }); },
    }, '← All paths')),
    h('p', { class: 'eyebrow' }, path.title),
    stepper,
    storageWarning(),
    h('article', { class: 'workspace', 'aria-labelledby': 'step-title' },
      h('p', { class: 'step-count' }, `Step ${index + 1} of ${path.steps.length}`),
      h('h1', { id: 'step-title', tabindex: '-1' }, step.title),
      notes.skipped && !stepHasNotes(notes)
        ? h('p', { class: 'chip' }, 'You skipped this step earlier. You can write here any time.')
        : null,
      h('div', { class: 'question-block' },
        h('h2', { class: 'question-label' }, 'The question'),
        h('p', { class: 'question' }, step.question),
      ),
      h('div', { class: 'starter' },
        h('h2', { class: 'starter-label' }, 'A way to begin'),
        h('p', { class: 'starter-text' }, step.starter),
      ),
      h('details', { class: 'consider' },
        h('summary', {}, 'If it helps, you might also think about'),
        h('ul', {}, step.consider.map((c) => h('li', {}, c))),
      ),
      step.note ? h('p', { class: 'caution' }, step.note) : null,
      h('form', { class: 'notes', onsubmit: (e: Event) => e.preventDefault(), 'aria-label': 'Your notes for this step' },
        fields,
        saveStatusLine(),
      ),
      h('div', { class: 'controls' },
        button('Back', () => goTo(index - 1), 'btn', { disabled: index === 0 ? true : null }),
        button('Skip for now', skip, 'btn'),
        button(isLast ? 'Finish for now' : 'Next step', next, 'btn btn-primary'),
      ),
      h('div', { class: 'pause-row' },
        button('Pause and come back later', pause, 'btn btn-quiet'),
      ),
      h('p', { class: 'fine' },
        'Moving to the next step only moves you along. It does not mean anything is decided, or that your family agrees.'),
    ),
  ].filter(Boolean) as HTMLElement[];
}

// ---------------------------------------------------------------------------
// Wishes
// ---------------------------------------------------------------------------

function renderWishes(): HTMLElement[] {
  return [
    h('h1', { tabindex: '-1' }, 'My wishes'),
    h('p', { class: 'lede' }, 'Write in your own words. Change anything whenever your feelings change. Leaving a section empty is fine.'),
    h('p', { class: 'caution' }, 'These notes are for you and the people you choose to share them with. They are not a legal will or a medical directive, and Endly never sends them to anyone.'),
    storageWarning(),
    h('form', { class: 'notes', onsubmit: (e: Event) => e.preventDefault(), 'aria-label': 'My wishes' },
      WISH_FIELDS.map((w) =>
        textArea({
          id: `wish-${w.key}`,
          label: w.label,
          hint: w.hint,
          value: state.wishes[w.key],
          rows: 5,
          onInput: (v) => { state.wishes[w.key] = v; },
        }),
      ),
      saveStatusLine(),
    ),
  ].filter(Boolean) as HTMLElement[];
}

// ---------------------------------------------------------------------------
// Preparation notes
// ---------------------------------------------------------------------------

function renderPreparation(): HTMLElement[] {
  return [
    h('h1', { tabindex: '-1' }, 'Preparation notes'),
    h('p', { class: 'lede' }, 'Notes about where important papers are kept and who can help, so the people you trust know where to look.'),
    h('div', { class: 'notice notice-label', role: 'note' },
      h('p', {}, h('strong', {}, 'These are preparation notes only. '),
        'Endly does not store documents and is not a secure vault. Do not write passwords, PINs, or account numbers here. Write where something is, not what it says.')),
    storageWarning(),
    h('form', { class: 'prep', onsubmit: (e: Event) => e.preventDefault(), 'aria-label': 'Preparation notes' },
      PREP_CATEGORIES.map((c) =>
        h('fieldset', { class: 'prep-group' },
          h('legend', {}, c.label),
          h('p', { class: 'hint' }, c.hint),
          PREP_FIELDS.map((f) =>
            textArea({
              id: `prep-${c.key}-${f.key}`,
              label: f.label,
              value: state.prep[c.key][f.key],
              rows: 2,
              onInput: (v) => { state.prep[c.key][f.key] = v; },
            }),
          ),
        ),
      ),
      saveStatusLine(),
    ),
  ].filter(Boolean) as HTMLElement[];
}

// ---------------------------------------------------------------------------
// Summary and export
// ---------------------------------------------------------------------------

function renderSummary(): HTMLElement[] {
  flushSave();
  const markdown = toMarkdown(state);
  const copyStatus = h('p', { class: 'save-status', role: 'status', 'aria-live': 'polite' });
  const mdArea = h('textarea', { id: 'summary-markdown', readonly: true, rows: 12, class: 'mono', 'aria-label': 'Summary as Markdown text' });
  mdArea.value = markdown;
  const mdDetails = h('details', { class: 'md-details' }, h('summary', {}, 'Show the Markdown text'), mdArea);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      copyStatus.textContent = 'Copied. Paste it into a document or an email to yourself.';
    } catch {
      mdDetails.open = true;
      mdArea.focus();
      mdArea.select();
      copyStatus.textContent = 'Copying was blocked here. The text is selected below; press Ctrl+C (or ⌘+C) to copy it.';
    }
  };

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `endly-summary-${new Date().toISOString().slice(0, 10)}.md` });
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    copyStatus.textContent = 'Downloaded a Markdown file.';
  };

  const actions = h('div', { class: 'controls controls-start no-print' },
    button('Copy summary', () => void copy(), 'btn btn-primary'),
    framed ? null : button('Download as Markdown', download, 'btn'),
    framed ? null : button('Print summary', () => window.print(), 'btn'),
  );

  const sections = buildSummary(state);
  const doc = h('article', { class: 'summary-doc', 'aria-label': 'Printable summary' },
    h('h2', { class: 'summary-title' }, 'Endly summary'),
    h('p', { class: 'fine' }, `Prepared ${formatDate(new Date())}. ${SUMMARY_DISCLAIMER}`),
    sections.map((section) =>
      h('section', { class: 'summary-section' },
        h('h3', {}, section.heading),
        h('p', { class: 'hint' }, section.note),
        section.blocks.map((block) =>
          h('div', { class: 'summary-block' },
            h('h4', {}, block.heading),
            block.meta ? h('p', { class: 'hint' }, block.meta) : null,
            block.items.length === 0
              ? h('p', { class: 'empty' }, 'Nothing written yet.')
              : h('dl', {}, block.items.flatMap((item) => [h('dt', {}, item.label), h('dd', {}, item.text)])),
          ),
        ),
      ),
    ),
  );

  return [
    h('h1', { tabindex: '-1', class: 'no-print' }, 'Summary and export'),
    h('p', { class: 'lede no-print' }, 'Everything you have written, in one place. Copy it into a document, email it to yourself, or share it only with the people you choose. You can also use this copy to restore your notes later, on the Your data page.'),
    hasAnyContent(state) ? null : h('div', { class: 'notice no-print' }, h('p', {}, 'Nothing has been written yet. This summary fills in as you add notes.')),
    framed
      ? h('p', { class: 'hint no-print' }, 'In this view, downloading and printing are not available. Copy the summary, then paste it wherever you keep important notes.')
      : null,
    actions,
    copyStatus,
    h('div', { class: 'no-print' }, mdDetails),
    doc,
  ].filter(Boolean) as HTMLElement[];
}

// ---------------------------------------------------------------------------
// Your data
// ---------------------------------------------------------------------------

function restoreSection(): HTMLElement {
  const message = h('div', { role: 'status', 'aria-live': 'polite' });
  const pasteArea = h('textarea', { id: 'restore-text', rows: 6, 'aria-describedby': 'restore-text-hint', spellcheck: 'false' });
  const fileInput = h('input', { type: 'file', id: 'restore-file', accept: '.md,.markdown,.txt,text/markdown,text/plain', class: 'file-input' });
  const confirmBox = h('div', { class: 'confirm confirm-calm', hidden: true, tabindex: '-1', id: 'restore-confirm', 'aria-labelledby': 'restore-confirm-title' });
  let pending: ReturnType<typeof parseSummary> | null = null;

  const showMessage = (text: string, warn = false) => {
    message.replaceChildren(h('div', { class: warn ? 'notice notice-warn' : 'notice' }, h('p', {}, text)));
  };

  const check = (text: string) => {
    confirmBox.hidden = true;
    pending = parseSummary(text);
    if (!pending.ok) {
      showMessage(pending.error, true);
      return;
    }
    message.replaceChildren();
    const replacing = hasAnyContent(state);
    confirmBox.replaceChildren(
      h('h3', { id: 'restore-confirm-title' }, `Found ${pending.found} ${pending.found === 1 ? 'note' : 'notes'} in this summary`),
      h('p', {}, replacing
        ? 'Restoring replaces the notes currently saved in this browser. If you want to keep them, copy them from the Summary page first.'
        : 'They will be saved in this browser. Your place in each path will start at the beginning.'),
      h('div', { class: 'controls controls-start' },
        button('Restore these notes', restore, 'btn btn-primary'),
        button('Cancel', () => {
          confirmBox.hidden = true;
          pending = null;
          checkButton.focus();
        }, 'btn'),
      ),
    );
    confirmBox.hidden = false;
    confirmBox.focus();
  };

  const restore = () => {
    if (!pending || !pending.ok) return;
    const found = pending.found;
    const restored = pending.state;
    restored.route = { view: 'data' };
    state = restored;
    pending = null;
    saveNow();
    confirmBox.hidden = true;
    pasteArea.value = '';
    fileInput.value = '';
    showMessage(saveStatus === 'failed'
      ? `Restored ${found} ${found === 1 ? 'note' : 'notes'} on screen, but this browser would not save them. Copy them somewhere safe before closing the page.`
      : `Restored ${found} ${found === 1 ? 'note' : 'notes'}. You can find them in each path, in My wishes, and in Preparation notes.`, saveStatus === 'failed');
    checkButton.focus();
  };

  const checkButton = button('Check this summary', () => {
    if (!pasteArea.value.trim()) {
      showMessage('Paste a summary into the box first, or choose a summary file.', true);
      pasteArea.focus();
      return;
    }
    check(pasteArea.value);
  }, 'btn');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_RESTORE_CHARS * 4) {
      showMessage('This file is too large to be an Endly summary.', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => check(String(reader.result ?? ''));
    reader.onerror = () => showMessage('Endly could not read that file. Try copying its text into the box instead.', true);
    reader.readAsText(file);
  });

  return h('section', { class: 'stack prose', 'aria-labelledby': 'restore-heading' },
    h('h2', { id: 'restore-heading' }, 'Restore notes from a summary'),
    h('p', {}, 'Moving to another device or browser? On the old one, copy your summary from the Summary page. Then paste it here, or choose the file you saved. Endly shows what it found and asks before replacing anything.'),
    h('div', { class: 'field' },
      h('label', { for: 'restore-file' }, 'Choose a saved summary file'),
      fileInput,
    ),
    h('div', { class: 'field' },
      h('label', { for: 'restore-text' }, 'Or paste the summary text'),
      h('p', { class: 'hint', id: 'restore-text-hint' }, 'It starts with “# Endly summary”. Your place in each path is not restored, only what you wrote.'),
      pasteArea,
    ),
    h('div', { class: 'controls controls-start' }, checkButton),
    confirmBox,
    message,
  );
}

function renderData(): HTMLElement[] {
  const result = h('div', { role: 'status', 'aria-live': 'polite' });
  const confirmBox = h('div', { class: 'confirm', hidden: true, id: 'delete-confirm', tabindex: '-1', 'aria-labelledby': 'confirm-title' });
  const startDelete = button('Delete all Endly notes from this browser…', () => {
    confirmBox.hidden = false;
    startDelete.hidden = true;
    confirmBox.focus();
  }, 'btn btn-danger');

  confirmBox.append(
    h('h3', { id: 'confirm-title' }, 'Delete everything Endly saved in this browser?'),
    h('p', {}, 'This removes your conversation notes, your place in each path, your wishes, and your preparation notes. It cannot be undone. If you want a copy, use the Summary page first.'),
    h('div', { class: 'controls controls-start' },
      button('Yes, delete everything', () => {
        window.clearTimeout(saveTimer);
        saveTimer = undefined;
        const ok = clearState(storage);
        state = emptyState();
        state.route = { view: 'data' };
        saveStatus = 'idle';
        lastSavedAt = null;
        if (ok || !storage) storageProblem = storage ? null : storageProblem;
        confirmBox.hidden = true;
        startDelete.hidden = false;
        result.replaceChildren(h('div', { class: 'notice' }, h('p', {},
          ok
            ? 'All Endly notes were deleted from this browser.'
            : 'Endly could not reach this browser’s storage, so there was nothing saved to delete. Notes on screen have been cleared.')));
        startDelete.focus();
      }, 'btn btn-danger'),
      button('Cancel, keep my notes', () => {
        confirmBox.hidden = true;
        startDelete.hidden = false;
        startDelete.focus();
      }, 'btn'),
    ),
  );

  const where = storage
    ? `Your notes are stored only in this web browser, on this device, using its local storage (under the name “${STORAGE_KEY}”). They are not sent to a server, and nobody else can see them from another device.`
    : 'This browser is not allowing Endly to store anything right now, so your notes exist only while this page is open.';

  return [
    h('h1', { tabindex: '-1' }, 'Your data and privacy'),
    h('section', { class: 'stack prose' },
      h('h2', {}, 'Where your notes are stored'),
      h('p', {}, where),
      h('ul', {},
        h('li', {}, 'Anyone using this browser on this device could open Endly and read them.'),
        h('li', {}, 'Clearing your browser data, or using a private window, can erase them.'),
        h('li', {}, 'They do not move to your other devices. To keep a copy, use the Summary page.'),
      ),
    ),
    h('section', { class: 'stack prose' },
      h('h2', {}, 'What Endly is, and what it is not'),
      h('ul', {},
        h('li', {}, 'Endly is an early prototype. Please use sample information.'),
        h('li', {}, 'The questions are written in advance. Endly is not a counsellor, and no AI is reading or answering your notes.'),
        h('li', {}, 'Nothing here is legal, medical, or financial advice. Notes do not create a valid will, power of attorney, or care directive. Rules differ by country, so ask a qualified professional where you live.'),
        h('li', {}, 'Endly never sends messages, letters, or legacy notes to anyone.'),
      ),
    ),
    restoreSection(),
    h('section', { class: 'stack prose' },
      h('h2', {}, 'Delete your notes'),
      h('p', {}, 'You can remove everything Endly has saved in this browser at any time.'),
      startDelete,
      confirmBox,
      result,
    ),
  ];
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render(moveFocus: boolean): void {
  statusEl = null;
  const route = state.route;
  let children: HTMLElement[];
  let title = 'Endly';
  switch (route.view) {
    case 'path': {
      const path = route.path ? getPath(route.path) : undefined;
      if (!path) {
        state.route = { view: 'home' };
        return render(moveFocus);
      }
      children = renderPath(path);
      title = `${path.title} · Endly`;
      break;
    }
    case 'wishes':
      children = renderWishes();
      title = 'My wishes · Endly';
      break;
    case 'preparation':
      children = renderPreparation();
      title = 'Preparation notes · Endly';
      break;
    case 'summary':
      children = renderSummary();
      title = 'Summary · Endly';
      break;
    case 'data':
      children = renderData();
      title = 'Your data · Endly';
      break;
    default:
      children = renderHome();
  }
  main.dataset.view = route.view;
  main.replaceChildren(h('div', { class: 'wrap view' }, children));
  document.title = title;
  updateNav(route);
  rendered = { ...route };
  if (moveFocus) {
    window.scrollTo({ top: 0 });
    focusHeading();
  }
}

// Initial route: an explicit #name wins, otherwise resume where the person left off.
const fromHash = hashToRoute(location.hash);
if (fromHash) {
  state.route = fromHash;
}
render(false);
if (!fromHash && state.route.view !== 'home') setHash(state.route);
