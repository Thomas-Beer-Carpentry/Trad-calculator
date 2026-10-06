import { calculate, format } from './calculate.js';

const $ = id => document.getElementById(id);
const form = $('layout-form');
let result, tape, installPrompt;
const amounts = { count: '', maximum: '' };
let currentMethod = 'count';
const formatted = value => { const f = format(value); return `${f.approximate ? '≈ ' : ''}${f.text}`; };

function readInput() {
  return { length: $('length').value, method: $('method').value, count: $('amount').value, maximum: $('amount').value,
    material: form.elements.material.value === 'include', width: $('width').value,
    ending: form.elements.ending.value, cross: form.elements.cross.value };
}

function updateControls() {
  const material = form.elements.material.value === 'include';
  const method = $('method').value;
  $('material-fields').hidden = !material;
  $('method').options[0].text = material ? 'How many boards' : 'How many marks';
  $('amount-label').textContent = method === 'count' ? (material ? 'Boards' : 'Marks') : 'Maximum';
  $('amount-unit').hidden = method === 'count';
  $('amount').inputMode = method === 'count' ? 'numeric' : 'decimal';
}

form.addEventListener('input', () => {
  $('results').hidden = true;
  $('error').hidden = true;
});
form.addEventListener('change', () => {
  const nextMethod = $('method').value;
  if (nextMethod !== currentMethod) {
    amounts[currentMethod] = $('amount').value;
    currentMethod = nextMethod;
    $('amount').value = amounts[currentMethod];
  }
  updateControls();
  $('results').hidden = true;
  $('error').hidden = true;
});
for (const input of form.querySelectorAll('input:not([type="radio"])')) {
  input.addEventListener('focus', () => input.select());
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); run(); input.blur(); }
  });
}

function run(input = readInput()) {
  try {
    result = calculate(input);
    $('error').hidden = true;
    $('results').hidden = false;
    document.activeElement?.blur();
    render();
    return result;
  } catch (error) {
    $('results').hidden = true;
    $('error').textContent = error.message;
    $('error').hidden = false;
    return null;
  }
}
form.addEventListener('submit', event => { event.preventDefault(); run(); });
$('calculate-button').addEventListener('click', () => run());

function render() {
  const count = result.count;
  const approximate = format(result.gap).approximate || (count > 0 && format(result.mark(1)).approximate);
  $('gap').textContent = formatted(result.gap);
  const item = result.material ? 'board' : 'mark';
  $('result-count').replaceChildren(document.createTextNode(`${count} ${item}${count === 1 ? '' : 's'}`), document.createElement('br'), document.createTextNode(`${result.spaces} equal space${result.spaces === 1 ? '' : 's'}`));
  $('tape-label').textContent = 'RUNNING MARKS · mm';
  $('start-label').textContent = 'Start · 0';
  $('end-label').textContent = `End · ${formatted(result.length)} mm`;
  $('result-note').textContent = approximate ? '≈ rounded display · marks from start' : 'All marks from the start';
  $('scroll-hint').hidden = count <= 3;
  const viewport = Math.max(280, $('diagram').clientWidth || 340), extra = result.ending === 'more' ? 1 : 0;
  const filled = result.material && result.gap.num === 0n;
  const labelLength = count ? formatted(result.mark(count)).length : 0;
  const step = count > 3 ? Math.max(112, labelLength * 10 + 20) : filled ? (viewport - 16) / count : (viewport - 16 + (result.material ? extra * 22 : 0)) / Math.max(1, count + extra);
  tape = { base: 0, step, boardWidth: filled ? step : 22, viewport, extra, filled };
  $('diagram').scrollLeft = 0;
  renderTape();
}

function renderTape() {
  if (!result || !tape) return;
  const count = result.count, { step, boardWidth, viewport, extra } = tape, edge = 8;
  // The rail uses native touch scrolling. Only nearby marks are drawn, so even
  // very large counts stay responsive. Long rails are rebased without skipping
  // any marks or changing the visible measurements.
  let scroll = $('diagram').scrollLeft || 0;
  let windowCount = Math.min(2000, count - tape.base);
  let shift = 0;
  if (scroll > (windowCount - 200) * step && tape.base + windowCount < count) shift = Math.floor(scroll / step) - 200;
  else if (scroll < 200 * step && tape.base > 0) shift = -Math.min(tape.base, 1600);
  if (shift) {
    tape.base += shift;
    scroll -= shift * step;
    windowCount = Math.min(2000, count - tape.base);
  }
  const atStart = tape.base === 0, atEnd = tape.base + windowCount === count;
  const gap = step - (result.material ? boardWidth : 0);
  const W = count ? Math.max(viewport, edge * 2 + windowCount * step + (atEnd ? extra * gap : 0)) : viewport;
  const start = Math.max(1, tape.base + Math.floor(Math.max(0, scroll - step) / step));
  const stop = Math.min(count, tape.base + Math.ceil((scroll + viewport + step) / step));
  const label = (text, x, y, size, anchor = 'middle', color = '#17252c', weight = '600') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${color}" font-weight="${weight}">${text}</text>`;
  let svg = `<svg style="width:${W}px;height:91px" viewBox="0 0 ${W} 91" role="img" aria-label="${result.material ? `Boards go ${result.cross === 'away' ? 'after' : 'before'} each pencil mark, measuring from start to end` : 'Evenly spaced marks, measuring from start to end'}"><line x1="${edge}" y1="39" x2="${W - edge}" y2="39" stroke="#86969e" stroke-width="1.5"/>`;
  if (atStart) svg += `<line x1="${edge}" y1="26" x2="${edge}" y2="52" stroke="#86969e" stroke-width="1.5"/>`;
  if (atEnd) svg += `<line x1="${W - edge}" y1="26" x2="${W - edge}" y2="52" stroke="#86969e" stroke-width="1.5"/>`;
  for (let index = start; index <= stop; index++) {
    const x = edge + (index - tape.base) * step - (result.material && result.cross === 'away' ? boardWidth : 0);
    if (result.material) {
      const left = result.cross === 'away' ? x : x - boardWidth;
      svg += `<rect x="${left}" y="27" width="${boardWidth}" height="25" fill="#f2c94c" stroke="#bf9a2e" stroke-width=".8"/>${label('X', left + boardWidth / 2, 44, 13, 'middle', '#17252c', '500')}`;
    }
    svg += `<line x1="${x}" y1="18" x2="${x}" y2="60" stroke="#17252c" stroke-width="2"/>`;
    const markText = formatted(result.mark(index));
    const size = markText.length > 13 ? 12 : markText.length > 10 ? 14 : 18;
    const anchor = atStart && x < 40 ? 'start' : atEnd && x > W - 40 ? 'end' : 'middle';
    svg += label(markText, x, 83, size, anchor);
  }
  if (!count) svg += label('No marks needed', W / 2, 80, 16, 'middle', '#59686f');
  svg += '</svg>';
  $('diagram').innerHTML = svg;
  if (shift) $('diagram').scrollLeft = scroll;
}
$('diagram').addEventListener('scroll', () => renderTape(), { passive: true });
window.addEventListener('resize', () => { if (result && !$('results').hidden) render(); });

window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
$('install').addEventListener('click', async () => {
  if (installPrompt) { await installPrompt.prompt(); installPrompt = null; }
  else $('install-dialog').showModal();
});
window.addEventListener('appinstalled', () => { $('install').hidden = true; });
if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('install').hidden = true;
if (window.matchMedia('(display-mode: fullscreen)').matches) $('install').hidden = true;

if (!/^https?:$/.test(location.protocol)) {
  $('install-instructions').textContent = 'An Android home-screen icon needs a live web address. This downloaded file works as a calculator, but cannot be installed as an Android app.';
  $('offline-instructions').textContent = 'You can use this downloaded calculator offline. Open full screen below if your browser supports it.';
} else if (/Android/i.test(navigator.userAgent || '')) {
  $('install-instructions').textContent = 'Open this page in Chrome. Tap the three-dot menu, then Add to Home screen and Install. You will get a Trade Layout icon that opens the calculator full screen.';
}
const fullScreen = document.documentElement?.requestFullscreen;
if (typeof fullScreen === 'function') {
  $('full-screen').hidden = false;
  $('full-screen').addEventListener('click', () => {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => $('install-dialog').close()).catch(() => {
      $('offline-instructions').textContent = 'This browser could not enter full screen. The calculator still works in the current view.';
    });
  });
}

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(registration => {
    const channel = new MessageChannel();
    channel.port1.onmessage = event => { if (event.data?.ready) $('ready').hidden = false; };
    registration.active?.postMessage('OFFLINE_READY', [channel.port2]);
  }).catch(() => {
    $('offline-instructions').textContent = 'Offline setup is not ready yet. Keep an internet connection, reload this page, and wait for “Ready to use offline” before taking it on site.';
  });
}

// The same calculator action is available to supported browser agents.
if (document.modelContext?.registerTool) {
  const lifetime = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'calculate_trade_layout', title: 'Calculate trade layout',
      description: 'Set the calculator inputs and show equal gaps and running tape marks. Cross Away marks the near edge; Cross Before marks the far edge.',
      inputSchema: { type: 'object', additionalProperties: false, properties: {
        length: { type: 'string' }, method: { type: 'string', enum: ['count', 'maximum'] }, count: { type: 'string' }, maximum: { type: 'string' }, material: { type: 'boolean' }, width: { type: 'string' }, ending: { type: 'string', enum: ['more', 'same'] }, cross: { type: 'string', enum: ['before', 'away'] }
      }, required: ['length', 'method', 'material', 'ending', 'cross'] },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        // Validate before changing any visible state.
        const checked = calculate(input);
        $('length').value = input.length; $('method').value = input.method;
        currentMethod = input.method; $('amount').value = input.method === 'count' ? input.count : input.maximum;
        form.elements.material.value = input.material ? 'include' : 'none';
        if (input.width != null) $('width').value = input.width;
        form.elements.ending.value = input.ending; form.elements.cross.value = input.cross;
        updateControls(); run();
        return { gap_mm: formatted(checked.gap), boards_or_marks: checked.count, spaces: checked.spaces,
          running_marks_mm: Array.from({ length: Math.min(checked.count, 3) }, (_, i) => formatted(checked.mark(i + 1))), total_marks: checked.count };
      }
    }, { signal: lifetime.signal })).catch(() => {});
    window.addEventListener('pagehide', () => lifetime.abort(), { once: true });
  } catch { /* The normal calculator works in browsers without WebMCP support. */ }
}
updateControls();
