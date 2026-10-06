import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(root + file, 'utf8');
const calculation = (await read('dist/calculate.js')).replace(/^export /gm, '');
const ui = (await read('dist/app.js')).replace(/^import .*?;\s*/m, '');
const script = `(() => {\n'use strict';\n${calculation}\n${ui}\n})();\n`;
await writeFile(root + 'dist/app.bundle.js', script);
let html = await read('dist/index.html');
html = html.replace(/  <link rel="(?:manifest|apple-touch-icon)"[^>]+>\n/g, '');
html = html.replace(/  <meta name="apple-mobile-web-app-(?:capable|status-bar-style)"[^>]+>\n/g, '');
html = html.replace('  <script defer src="./app.bundle.js"></script>\n', '');
html = html.replace('<link rel="stylesheet" href="./style.css">', `<style>${await read('dist/style.css')}</style>`);
html = html.replace('</body>', `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`);
html = html.replace('On iPhone, open this page in Safari. Tap Share, then Add to Home Screen. On Android, open the browser menu and choose Install app or Add to Home screen.', 'This downloaded copy works offline in a web browser. To install on your phone, the full app must first be served from a secure website.');
html = html.replace('Keep this page open online once until “Ready to use offline” appears. Then open it from your home screen on site.', 'This file includes the calculator. No internet connection is needed for its calculations.');
await writeFile(root + 'Trade Layout Calculator.html', html);
console.log('Built classic browser script and self-contained calculator.');

await mkdir(root + 'docs', { recursive: true });
for (const file of ['index.html', 'style.css', 'app.bundle.js', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) {
  await copyFile(root + 'dist/' + file, root + 'docs/' + file);
}
await writeFile(root + 'docs/.nojekyll', '');
console.log('Updated GitHub Pages files in docs/.');
