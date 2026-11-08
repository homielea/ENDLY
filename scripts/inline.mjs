// Turn the Vite build into self-contained pages:
//   dist/index.html    - complete single-file app (any static host)
//   dist/artifact.html - same app without the document skeleton, for a claude.ai Artifact
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/([^"]+\.css)"[^>]*>/g, (_, file) => {
  const css = readFileSync(join(dist, 'assets', file), 'utf8');
  return `<style>${css}</style>`;
});
html = html.replace(/<script type="module" crossorigin src="\.\/assets\/([^"]+\.js)"><\/script>/g, (_, file) => {
  const js = readFileSync(join(dist, 'assets', file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

if (/\.\/assets\//.test(html)) throw new Error('Unresolved asset reference left in index.html');

// The app script must run after #app exists, so move it to the end of <body>.
const scripts = [];
html = html.replace(/<script type="module">[\s\S]*?<\/script>/g, (m) => { scripts.push(m); return ''; });
html = html.replace('</body>', scripts.join('\n') + '\n</body>');

writeFileSync(join(dist, 'index.html'), html);
rmSync(join(dist, 'assets'), { recursive: true, force: true });

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset="[^"]*"\s*\/?>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(join(dist, 'artifact.html'), head.trim() + '\n' + body.trim() + '\n');

console.log('Inlined build:', readdirSync(dist).join(', '), `(${(html.length / 1024).toFixed(1)} KB)`);
