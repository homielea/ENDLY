// End-to-end checks against the production build (dist/index.html).
// Run: npm run build && npm run e2e
import { createRequire } from 'node:module';
// Playwright is resolved globally (preinstalled in the dev container) or from node_modules.
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
const KEY = 'endly.v1';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const stopServer = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', stopServer);
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview server did not start')), 15000);
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) { clearTimeout(t); resolve(); } });
  server.on('exit', (c) => reject(new Error('preview exited ' + c)));
});

const browser = await chromium.launch();
let passed = 0;
const failures = [];

async function test(name, fn, contextOptions = {}) {
  const context = await browser.newContext({ acceptDownloads: true, ...contextOptions });
  // Fonts come from Google; block them so tests don't depend on the network.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await fn(page, context);
    assert.deepEqual(errors, [], 'page errors');
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failures.push(name);
    console.log('  ✗', name, '\n    ', e.message.split('\n').slice(0, 6).join('\n     '));
  } finally {
    await context.close();
  }
}

const saved = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const waitSaved = (page) => page.getByRole('status').filter({ hasText: 'Saved on this device' }).first().waitFor();
const heading = (page) => page.locator('main h1').innerText();

console.log('Endly e2e');

await test('dashboard shows three paths, prototype label, no pressure devices', async (page) => {
  assert.equal(await heading(page), 'Hard conversations, gently prepared');
  for (const t of ['Family conversations', 'Life, legacy, and goodbyes', 'Family-business succession']) {
    await page.getByRole('heading', { name: t, level: 2 }).waitFor();
  }
  assert.match(await page.locator('.prototype-banner').innerText(), /Prototype.*sample information/);
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const bad of ['streak', 'countdown', 'days left', 'hurry']) assert.ok(!text.includes(bad), bad);
});

for (const [id, title, steps] of [
  ['family', 'Family conversations', ['Prepare the conversation', 'Explore values', 'Discuss difficult feelings', 'Record next steps']],
  ['legacy', 'Life, legacy, and goodbyes', ['Explore what matters in life', 'Discuss support and care questions', 'Record funeral and remembrance wishes', 'Write personal legacy notes']],
  ['succession', 'Family-business succession', ['Hear each generation', 'Distinguish family, management, and ownership roles', 'Explore fairness', 'Plan a gradual handover']],
]) {
  await test(`${title}: next, back, skip, pause, resume, reload`, async (page) => {
    await page.getByRole('button', { name: `Begin ${title}` }).click();
    assert.equal(await heading(page), steps[0]);
    assert.equal(new URL(page.url()).hash, '#' + id);
    await page.locator('.question').waitFor();
    await page.locator('.starter-text').waitFor();

    // Three distinct note types.
    await page.getByLabel('My own reflections').fill(`Sample reflection for ${id}`);
    await page.getByLabel('What we agreed together').fill(`Sample agreement for ${id}`);
    await page.getByLabel('Still open, to revisit').fill(`Sample open question for ${id}`);
    await waitSaved(page);

    await page.getByRole('button', { name: 'Back', exact: true }).isDisabled().then((d) => assert.ok(d, 'Back disabled on step 1'));
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
    assert.equal(await heading(page), steps[1]);
    await page.getByRole('button', { name: 'Skip for now' }).click();
    assert.equal(await heading(page), steps[2]);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await heading(page), steps[1]);
    await page.getByText('You skipped this step earlier').waitFor();
    assert.match(await page.locator('.stepper-btn').nth(1).innerText(), /Skipped for now/);
    assert.match(await page.locator('.stepper-btn').nth(0).innerText(), /Has notes/);

    // Reload keeps path and step.
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await heading(page), steps[1]);

    // Pause returns home and shows where it paused.
    await page.getByRole('button', { name: 'Pause and come back later' }).click();
    assert.equal(await heading(page), 'Hard conversations, gently prepared');
    await page.getByText('Paused. Your notes are saved').waitFor();
    const card = page.locator(`[data-path="${id}"]`);
    assert.match(await card.innerText(), new RegExp(`Paused at step 2: ${steps[1]}`));

    // Survives reload, then resume.
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.match(await page.locator(`[data-path="${id}"]`).innerText(), /Paused at step 2/);
    await page.getByRole('button', { name: `Resume ${title}` }).click();
    assert.equal(await heading(page), steps[1]);
    await page.locator('.stepper-btn').nth(0).click();
    assert.equal(await page.getByLabel('My own reflections').inputValue(), `Sample reflection for ${id}`);
    assert.equal(await page.getByLabel('What we agreed together').inputValue(), `Sample agreement for ${id}`);

    // Finish wording never claims agreement.
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^(Next step|Skip for now)$/ }).first().click();
    assert.equal(await heading(page), steps[3]);
    await page.getByText('It does not mean anything is decided').waitFor();
    await page.getByRole('button', { name: 'Finish for now' }).click();
    await page.getByText('Nothing has to be settled').waitFor();

    const s = await saved(page);
    assert.equal(s.paths[id].steps[Object.keys(s.paths[id].steps)[0]].unresolved, `Sample open question for ${id}`);
  });
}

await test('wishes stay editable across reloads', async (page) => {
  await page.getByRole('link', { name: 'My wishes' }).first().click();
  assert.equal(await heading(page), 'My wishes');
  const labels = ['What matters most to me', 'People I want involved', 'Funeral and remembrance preferences', 'Notes for people I love', 'Questions to revisit'];
  for (const l of labels) await page.getByLabel(l).fill(`Sample: ${l}`);
  await waitSaved(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await heading(page), 'My wishes');
  for (const l of labels) assert.equal(await page.getByLabel(l).inputValue(), `Sample: ${l}`);
  await page.getByLabel('People I want involved').fill('Changed my mind: just Sam');
  await waitSaved(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByLabel('People I want involved').inputValue(), 'Changed my mind: just Sam');
});

await test('preparation notes are labelled and persist', async (page) => {
  await page.goto(BASE + '#preparation', { waitUntil: 'domcontentloaded' });
  assert.equal(await heading(page), 'Preparation notes');
  assert.match(await page.locator('.notice-label').innerText(), /preparation notes only.*not a secure vault/i);
  const body = (await page.locator('main').innerText()).toLowerCase();
  assert.ok(!body.includes('encrypted'), 'no vault/encryption claims');
  assert.equal(await page.locator('input[type=file]').count(), 0, 'no uploads');
  for (const legend of ['Will', 'Care and health directives', 'Property, accounts, and insurance', 'Key advisers', 'Business succession']) {
    await page.locator('legend', { hasText: legend }).waitFor();
  }
  await page.locator('#prep-will-location').fill('Sample: blue folder in the study');
  await page.locator('#prep-business-contact').fill('Sample: family accountant');
  await waitSaved(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#prep-will-location').inputValue(), 'Sample: blue folder in the study');
  assert.equal(await page.locator('#prep-business-contact').inputValue(), 'Sample: family accountant');
});

await test('user text renders safely everywhere', async (page) => {
  const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>**bold**';
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Notes for people I love').fill(payload);
  await page.goto(BASE + '#family', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('My own reflections').fill(payload);
  await waitSaved(page);
  await page.goto(BASE + '#summary', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('.summary-doc img, .summary-doc script').count(), 0);
  assert.ok((await page.locator('.summary-doc').innerText()).includes(payload));
});

await test('summary export contains saved text with correct labels', async (page) => {
  await page.goto(BASE + '#legacy', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('My own reflections').fill('Sample: my garden and my choir');
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Funeral and remembrance preferences').fill('Sample: a quiet service by the lake');
  await page.goto(BASE + '#preparation', { waitUntil: 'domcontentloaded' });
  await page.locator('#prep-advisers-contact').fill('Sample: Dr. Example');
  await waitSaved(page);
  await page.getByRole('link', { name: 'Summary' }).first().click();
  assert.equal(await heading(page), 'Summary and export');
  const md = await page.locator('#summary-markdown').inputValue();
  assert.match(md, /## Life, legacy, and goodbyes[\s\S]*### Step 1: Explore what matters in life[\s\S]*\*\*My own reflections\*\*\n\n> Sample: my garden and my choir/);
  assert.match(md, /\*\*Funeral and remembrance preferences\*\*\n\n> Sample: a quiet service by the lake/);
  assert.match(md, /### Key advisers\n\n\*\*Who knows about it or can help\*\*\n\n> Sample: Dr\. Example/);
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download as Markdown' }).click();
  const file = await dl;
  assert.match(file.suggestedFilename(), /^endly-summary-\d{4}-\d{2}-\d{2}\.md$/);
  const content = readFileSync(await file.path(), 'utf8');
  assert.equal(content, md);
  await page.getByRole('button', { name: 'Print summary' }).waitFor();
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.site-header').isVisible(), false);
  assert.equal(await page.locator('.summary-doc').isVisible(), true);
});

await test('copy falls back to selectable text when clipboard is blocked', async (page) => {
  await page.goto(BASE + '#summary', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked')); });
  await page.getByRole('button', { name: 'Copy summary' }).click();
  await page.getByText('Copying was blocked here').waitFor();
  assert.equal(await page.locator('#summary-markdown').isVisible(), true);
});

await test('delete asks for confirmation, can cancel, then clears local data', async (page) => {
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('What matters most to me').fill('Sample: to delete');
  await waitSaved(page);
  await page.evaluate(() => localStorage.setItem('unrelated-app', 'keep'));
  await page.getByRole('link', { name: 'Your data' }).first().click();
  assert.match(await page.locator('main').innerText(), /stored only in this web browser/);
  assert.equal(await page.locator('#delete-confirm').isVisible(), false, 'confirmation hidden until asked');
  await page.getByRole('button', { name: /Delete all Endly notes/ }).click();
  await page.getByRole('button', { name: 'Cancel, keep my notes' }).click();
  assert.notEqual(await saved(page), null, 'cancel keeps data');
  await page.getByRole('button', { name: /Delete all Endly notes/ }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await page.getByText('All Endly notes were deleted from this browser.').waitFor();
  assert.equal(await saved(page), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('unrelated-app')), 'keep');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByLabel('What matters most to me').inputValue(), '');
});

await test('restore: export, delete, then paste back every note', async (page) => {
  await page.goto(BASE + '#succession', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('My own reflections').fill('Sample: *Dad* built this <shop>\n\n> in 1987');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByLabel('What we agreed together').fill('Sample: meet monthly');
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Notes for people I love').fill('Sample: thank you, all of you');
  await page.goto(BASE + '#preparation', { waitUntil: 'domcontentloaded' });
  await page.locator('#prep-will-location').fill('Sample: blue folder');
  await waitSaved(page);
  await page.goto(BASE + '#summary', { waitUntil: 'domcontentloaded' });
  const md = await page.locator('#summary-markdown').inputValue();

  await page.goto(BASE + '#your-data', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Delete all Endly notes/ }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  assert.equal(await saved(page), null);

  await page.getByLabel('Or paste the summary text').fill(md);
  await page.getByRole('button', { name: 'Check this summary' }).click();
  await page.getByRole('heading', { name: 'Found 4 notes in this summary' }).waitFor();
  await page.getByRole('button', { name: 'Restore these notes' }).click();
  await page.getByText('Restored 4 notes.').waitFor();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goto(BASE + '#succession', { waitUntil: 'domcontentloaded' });
  assert.equal(await heading(page), 'Hear each generation', 'place in path starts fresh');
  assert.equal(await page.getByLabel('My own reflections').inputValue(), 'Sample: *Dad* built this <shop>\n\n> in 1987');
  await page.locator('.stepper-btn').nth(1).click();
  assert.equal(await page.getByLabel('What we agreed together').inputValue(), 'Sample: meet monthly');
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByLabel('Notes for people I love').inputValue(), 'Sample: thank you, all of you');
  await page.goto(BASE + '#preparation', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#prep-will-location').inputValue(), 'Sample: blue folder');
});

await test('restore: file upload, replace warning, cancel, and bad input', async (page) => {
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('People I want involved').fill('Sample: current note');
  await waitSaved(page);
  await page.goto(BASE + '#your-data', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Check this summary' }).click();
  await page.getByText('Paste a summary into the box first').waitFor();
  await page.getByLabel('Or paste the summary text').fill('Shopping list: milk, eggs');
  await page.getByRole('button', { name: 'Check this summary' }).click();
  await page.getByText('does not look like an Endly summary').waitFor();

  const file = '# Endly summary\n\n## My wishes\n\n### Wishes\n\n**People I want involved**\n\n> Sample: from file\n';
  await page.locator('#restore-file').setInputFiles({ name: 'endly-summary.md', mimeType: 'text/markdown', buffer: Buffer.from(file) });
  await page.getByRole('heading', { name: 'Found 1 note in this summary' }).waitFor();
  await page.getByText('Restoring replaces the notes currently saved').waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal((await saved(page)).wishes.people, 'Sample: current note', 'cancel keeps current notes');

  await page.locator('#restore-file').setInputFiles({ name: 'again.md', mimeType: 'text/markdown', buffer: Buffer.from(file) });
  await page.getByRole('button', { name: 'Restore these notes' }).click();
  await page.getByText('Restored 1 note.').waitFor();
  assert.equal((await saved(page)).wishes.people, 'Sample: from file');
});

await test('clear one part at a time, each with confirmation', async (page) => {
  await page.goto(BASE + '#family', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('My own reflections').fill('Sample: family note');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await page.goto(BASE + '#legacy', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('My own reflections').fill('Sample: legacy note');
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('People I want involved').fill('Sample: Sam');
  await page.goto(BASE + '#preparation', { waitUntil: 'domcontentloaded' });
  await page.locator('#prep-will-location').fill('Sample: blue folder');
  await page.locator('#prep-advisers-contact').fill('Sample: notary');
  await waitSaved(page);

  // Preparation: one category only, cancel first.
  await page.getByRole('button', { name: 'Clear “Will”…' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.locator('#prep-will-location').inputValue(), 'Sample: blue folder');
  await page.getByRole('button', { name: 'Clear “Will”…' }).click();
  await page.getByRole('button', { name: 'Yes, clear this section' }).click();
  await page.getByText('The “Will” notes have been cleared.').waitFor();
  assert.equal(await page.locator('#prep-will-location').inputValue(), '');
  assert.equal(await page.locator('#prep-advisers-contact').inputValue(), 'Sample: notary');

  // Wishes.
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Clear all my wishes…' }).click();
  await page.getByRole('button', { name: 'Yes, clear my wishes' }).click();
  await page.getByText('Your wishes have been cleared.').waitFor();
  assert.equal(await page.getByLabel('People I want involved').inputValue(), '');

  // One path.
  await page.goto(BASE + '#family', { waitUntil: 'domcontentloaded' });
  assert.equal(await heading(page), 'Explore values');
  await page.getByRole('button', { name: 'Start this path over…' }).click();
  await page.getByRole('button', { name: 'Yes, clear this path' }).click();
  await page.getByText('has been cleared. You are back at step 1.').waitFor();
  assert.equal(await heading(page), 'Prepare the conversation');
  assert.equal(await page.getByLabel('My own reflections').inputValue(), '');

  await page.reload({ waitUntil: 'domcontentloaded' });
  const s = await saved(page);
  assert.equal(s.paths.family.steps.prepare.reflection, '');
  assert.equal(s.paths.legacy.steps['what-matters'].reflection, 'Sample: legacy note', 'other path untouched');
  assert.equal(s.prep.advisers.contact, 'Sample: notary', 'other prep untouched');
});

await test('larger text: toggles, persists, survives restore', async (page) => {
  const base = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  const toggle = page.getByRole('button', { name: 'Larger text' });
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  const big = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  assert.ok(big >= base * 1.2, `text grew from ${base} to ${big}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByRole('button', { name: 'Larger text' }).getAttribute('aria-pressed'), 'true');
  await page.goto(BASE + '#your-data', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Or paste the summary text').fill('# Endly summary\n\n## My wishes\n\n### Wishes\n\n**People I want involved**\n\n> Sam');
  await page.getByRole('button', { name: 'Check this summary' }).click();
  await page.getByRole('button', { name: 'Restore these notes' }).click();
  assert.equal(await page.getByRole('button', { name: 'Larger text' }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Larger text' }).click();
  assert.equal((await saved(page)).prefs.textSize, 'standard');
});

await test('shows a clear warning when the browser blocks saving', async (page, context) => {
  await context.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException('blocked', 'SecurityError'); };
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('This browser is not letting Endly save.').waitFor();
  await page.goto(BASE + '#wishes', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('What matters most to me').fill('Sample');
  await page.waitForTimeout(600);
  await page.locator('main').getByText(/Not saved|not letting Endly/).first().waitFor();
});

await test('keyboard only: skip link, nav, path, notes', async (page) => {
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
  await page.keyboard.press('Tab'); // brand
  await page.keyboard.press('Tab'); // Home
  await page.keyboard.press('Tab'); // My wishes
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'My wishes');
  await page.keyboard.press('Enter');
  assert.equal(await heading(page), 'My wishes');
  assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1', 'focus moves to heading');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'wish-mattersMost');
  await page.keyboard.type('Typed with keyboard');
  await waitSaved(page);
  await page.goto(BASE + '#home', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Begin Family conversations' }).focus();
  await page.keyboard.press('Enter');
  assert.equal(await heading(page), 'Prepare the conversation');
});

await test('phone layout: no sideways scroll, large targets, nav works', async (page) => {
  for (const hash of ['#home', '#family', '#wishes', '#preparation', '#summary', '#your-data']) {
    await page.goto(BASE + hash, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${hash} overflows by ${overflow}px`);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button:not([hidden]), .nav-link')]
        .filter((el) => el.offsetParent !== null)
        .filter((el) => el.getBoundingClientRect().height < 44)
        .map((el) => el.textContent));
    assert.deepEqual(small, [], `${hash} small targets`);
  }
  await page.goto(BASE + '#home', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Larger text' }).tap();
  for (const hash of ['#home', '#family', '#wishes', '#preparation', '#summary', '#your-data']) {
    await page.goto(BASE + hash, { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${hash} with larger text overflows by ${overflow}px`);
  }
  await page.goto(BASE + '#home', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Preparation' }).first().tap();
  assert.equal(await heading(page), 'Preparation notes');
}, { ...devices['iPhone 13'] });

await test('artifact build works inside a frame (as deployed)', async (page) => {
  await page.setContent(`<iframe id="f" src="${BASE}artifact.html" style="width:420px;height:900px"></iframe>`);
  const frame = page.frameLocator('#f');
  await frame.getByRole('heading', { name: 'Hard conversations, gently prepared' }).waitFor();
  await frame.getByRole('link', { name: 'My wishes' }).first().click();
  await frame.getByLabel('What matters most to me').fill('Sample: framed note');
  await frame.getByRole('status').filter({ hasText: 'Saved on this device' }).first().waitFor();
  await page.setContent(`<iframe id="f" src="${BASE}artifact.html" style="width:420px;height:900px"></iframe>`);
  const again = page.frameLocator('#f');
  await again.getByRole('heading', { name: 'My wishes' }).waitFor();
  assert.equal(await again.getByLabel('What matters most to me').inputValue(), 'Sample: framed note');
  await again.getByRole('link', { name: 'Summary' }).first().click();
  await again.getByRole('button', { name: 'Copy summary' }).waitFor();
  assert.equal(await again.getByRole('button', { name: 'Print summary' }).count(), 0);
  assert.equal(await again.getByRole('button', { name: 'Download as Markdown' }).count(), 0);
  await again.getByText('downloading and printing are not available').waitFor();
  const md = await again.locator('#summary-markdown').inputValue();
  await again.getByRole('link', { name: 'Your data' }).first().click();
  await again.getByLabel('Or paste the summary text').fill(md);
  await again.getByRole('button', { name: 'Check this summary' }).click();
  await again.getByRole('button', { name: 'Restore these notes' }).click();
  await again.getByText('Restored 1 note.').waitFor();
});

await test('screenshots for review', async (page) => {
  await page.goto(BASE + '#home', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.goto(BASE + '#legacy', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'test-results/workspace-desktop.png', fullPage: true });
}, { viewport: { width: 1280, height: 900 } });

await test('screenshots phone + dark', async (page) => {
  await page.goto(BASE + '#family', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: 'test-results/workspace-phone-dark.png', fullPage: true });
}, { ...devices['iPhone 13'], colorScheme: 'dark' });

await browser.close();
stopServer();
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
