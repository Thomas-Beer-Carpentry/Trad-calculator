// Execute the delivered script against a small form DOM fixture. Browser/phone
// rendering is a separate check; these tests exercise the real UI event handlers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('Trade Layout Calculator.html', root), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function openCalculator(options = {}) {
  const nodes = new Map();
  for (const match of html.matchAll(/<\w+\b([^>]*)>/g)) {
    const attributes = match[1], id = attributes.match(/\bid="([^"]+)"/)?.[1];
    if (!id) continue;
    const listeners = {};
    nodes.set(id, {
      hidden: /\bhidden\b/.test(attributes), value: attributes.match(/\bvalue="([^"]*)"/)?.[1] ?? '',
      textContent: '', innerHTML: '', options: [{ text: 'How many marks' }],
      addEventListener(type, callback) { (listeners[type] ??= []).push(callback); },
      fire(type, details = {}) { const event = { preventDefault() {}, ...details }; for (const callback of listeners[type] ?? []) callback(event); },
      replaceChildren(...children) { this.textContent = children.map(c => c.textContent ?? '').join(''); },
      select() {}, blur() {}, close() { this.closed = true; }, showModal() { this.open = true; }
    });
  }
  const form = nodes.get('layout-form');
  form.elements = { material: { value: 'none' }, cross: { value: 'away' }, ending: { value: 'more' } };
  nodes.get('method').value = 'count';
  form.querySelectorAll = () => ['length', 'amount', 'width'].map(id => nodes.get(id));
  const document = { getElementById: id => nodes.get(id), activeElement: null,
    documentElement: { requestFullscreen: options.requestFullscreen },
    createTextNode: textContent => ({ textContent }), createElement: () => ({ textContent: '' }) };
  const window = { addEventListener() {}, matchMedia: query => ({ matches: Boolean(options.fullscreen && query.includes('fullscreen')) }) };
  runInNewContext(script, { document, window, navigator: { userAgent: 'Android' }, location: { protocol: options.protocol || 'file:' }, AbortController });
  return { nodes, form, set(id, value) { nodes.get(id).value = value; }, click() { nodes.get('calculate-button').fire('click'); } };
}

test('delivered download opens blank and uses a non-submitting Calculate button', () => {
  const app = openCalculator();
  for (const id of ['length', 'amount', 'width']) assert.equal(app.nodes.get(id).value, '');
  assert.equal(app.nodes.get('results').hidden, true);
  assert.equal(app.nodes.get('error').hidden, true);
  assert.match(html, /id="calculate-button"[^>]*type="button"/);
  assert.doesNotMatch(html, /<script[^>]+type="module"/);
});

test('Calculate shows cumulative marks and leaves entries intact', () => {
  const app = openCalculator();
  app.set('length', '2000'); app.set('amount', '3'); app.click();
  assert.equal(app.nodes.get('length').value, '2000');
  assert.equal(app.nodes.get('amount').value, '3');
  assert.equal(app.nodes.get('results').hidden, false);
  assert.equal(app.nodes.get('gap').textContent, '500');
  for (const mark of ['500', '1000', '1500']) assert.match(app.nodes.get('diagram').innerHTML, new RegExp(`>${mark}</text>`));
  app.click();
  assert.equal(app.nodes.get('length').value, '2000');
});

test('Include material reveals an empty width box, requires width, and calculates both mark sides', () => {
  const app = openCalculator();
  app.form.elements.material.value = 'include'; app.form.fire('change');
  assert.equal(app.nodes.get('material-fields').hidden, false);
  assert.equal(app.nodes.get('width').value, '');
  assert.equal(app.nodes.get('method').options[0].text, 'How many boards');
  app.set('length', '2000'); app.set('amount', '3'); app.click();
  assert.equal(app.nodes.get('results').hidden, true);
  assert.match(app.nodes.get('error').textContent, /Enter board width/);
  app.set('width', '50'); app.click();
  assert.equal(app.nodes.get('gap').textContent, '462.5');
  for (const mark of ['462.5', '975', '1487.5']) assert.match(app.nodes.get('diagram').innerHTML, new RegExp(`>${mark.replace('.', '\\.')}</text>`));
  app.form.elements.cross.value = 'before'; app.form.fire('change'); app.click();
  for (const mark of ['512.5', '1025', '1537.5']) assert.match(app.nodes.get('diagram').innerHTML, new RegExp(`>${mark.replace('.', '\\.')}</text>`));
  for (const [id, expected] of [['length', '2000'], ['amount', '3'], ['width', '50']]) assert.equal(app.nodes.get(id).value, expected);
});

test('maximum spacing starts blank and entered values are preserved on validation errors', () => {
  const app = openCalculator();
  app.set('method', 'maximum'); app.form.fire('change');
  assert.equal(app.nodes.get('amount').value, '');
  app.set('length', '2000'); app.set('amount', '450'); app.click();
  assert.equal(app.nodes.get('gap').textContent, '400');
  app.form.elements.material.value = 'include'; app.form.fire('change');
  app.set('length', '500'); app.set('width', '200.2'); app.set('amount', '10'); app.click();
  assert.equal(app.nodes.get('error').hidden, false);
  assert.match(app.nodes.get('error').textContent, /cannot fit/);
  assert.equal(app.nodes.get('length').value, '500');
  assert.equal(app.nodes.get('width').value, '200.2');
});

test('Enter calculates through the same action', () => {
  const app = openCalculator();
  app.set('length', '1000'); app.set('amount', '4');
  app.nodes.get('amount').fire('keydown', { key: 'Enter' });
  assert.equal(app.nodes.get('results').hidden, false);
  assert.equal(app.nodes.get('gap').textContent, '200');
});

test('all running marks share one horizontal rail without paging buttons', () => {
  const app = openCalculator();
  app.set('length', '1000'); app.set('amount', '10');
  app.form.elements.ending.value = 'same'; app.click();
  assert.doesNotMatch(html, /id="(?:previous|next|pages)"/);
  assert.equal(app.nodes.get('scroll-hint').hidden, false);
  const diagram = app.nodes.get('diagram');
  assert.match(diagram.innerHTML, />100<\/text>/);
  const railWidth = Number(diagram.innerHTML.match(/style="width:(\d+(?:\.\d+)?)px/)[1]);
  assert.ok(railWidth > 340);
  diagram.scrollLeft = railWidth - 340; diagram.fire('scroll');
  assert.match(diagram.innerHTML, />1000<\/text>/);
  assert.equal(app.nodes.get('length').value, '1000');
  assert.equal(app.nodes.get('amount').value, '10');
  diagram.scrollLeft = 0; diagram.fire('scroll');
  assert.match(diagram.innerHTML, />100<\/text>/);
});

test('large layouts render a bounded number of marks and preserve positions when the rail rebases', () => {
  const app = openCalculator();
  app.set('length', '1000000'); app.set('amount', '10000');
  app.form.elements.ending.value = 'same'; app.click();
  const diagram = app.nodes.get('diagram');
  assert.ok((diagram.innerHTML.match(/<text /g) || []).length <= 10);
  diagram.scrollLeft = 1800 * 112 + 20; diagram.fire('scroll');
  assert.ok(diagram.scrollLeft < 1800 * 112);
  assert.match(diagram.innerHTML, />180000<\/text>/);
  assert.match(diagram.innerHTML, />180100<\/text>/);
  diagram.scrollLeft = 199 * 112; diagram.fire('scroll');
  assert.match(diagram.innerHTML, />180000<\/text>/);
  assert.ok((diagram.innerHTML.match(/<text /g) || []).length <= 10);
});

test('Android manifest requests full-screen installation; local copy accurately explains installation', async () => {
  const manifest = JSON.parse(readFileSync(new URL('dist/manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.display, 'fullscreen');
  assert.ok(manifest.display_override.includes('standalone'));
  const local = openCalculator();
  assert.match(local.nodes.get('install-instructions').textContent, /needs a live web address/);
  const hosted = openCalculator({ protocol: 'https:' });
  assert.match(hosted.nodes.get('install-instructions').textContent, /Chrome/);
  assert.match(hosted.nodes.get('install-instructions').textContent, /Add to Home screen and Install/);
  let entered = false;
  const full = openCalculator({ requestFullscreen: () => { entered = true; return Promise.resolve(); } });
  assert.equal(full.nodes.get('full-screen').hidden, false);
  full.nodes.get('full-screen').fire('click');
  await Promise.resolve();
  assert.equal(entered, true);
  assert.equal(full.nodes.get('install-dialog').closed, true);
  assert.equal(openCalculator({ fullscreen: true }).nodes.get('install').hidden, true);
});
