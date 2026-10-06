import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('Pages deployment keeps other apps offline caches while updating its own', async () => {
  const scope = 'https://thomas-beer-carpentry.github.io/Trad-calculator/';
  const ownOld = `trade-layout:${scope}:v3`;
  const ownNew = `trade-layout:${scope}:v4`;
  const otherApp = 'trade-layout:https://thomas-beer-carpentry.github.io/Trade-timer/:v4';
  const names = [ownOld, ownNew, otherApp, 'trade-layout-v2', 'unrelated-cache'];
  const deleted = [], handlers = {};
  let claimed = false, promise;
  const self = { registration: { scope }, clients: { claim: async () => { claimed = true; } },
    addEventListener: (name, callback) => { handlers[name] = callback; } };
  const caches = { keys: async () => names, delete: async name => { deleted.push(name); } };
  runInNewContext(readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8'), { self, caches });
  handlers.activate({ waitUntil: p => { promise = p; } });
  await promise;
  assert.deepEqual(deleted, [ownOld]);
  assert.equal(claimed, true);
});

test('published assets and install paths all work beneath the repository URL', () => {
  const scope = 'https://thomas-beer-carpentry.github.io/Trad-calculator/';
  const manifest = JSON.parse(readFileSync(new URL('../docs/manifest.webmanifest', import.meta.url), 'utf8'));
  for (const path of [manifest.start_url, manifest.scope, ...manifest.icons.map(icon => icon.src)]) {
    assert.ok(new URL(path, scope).href.startsWith(scope));
  }
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)) {
    assert.ok(new URL(match[1], scope).href.startsWith(scope));
    readFileSync(new URL('../docs/' + match[1].slice(2), import.meta.url));
  }
  for (const file of ['index.html', 'style.css', 'app.bundle.js', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
    assert.deepEqual(readFileSync(new URL('../docs/' + file, import.meta.url)), readFileSync(new URL('../dist/' + file, import.meta.url)));
  }
});
