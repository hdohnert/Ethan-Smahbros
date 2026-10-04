// Renders the app icons (PNG) from an inline SVG using headless Chromium.
// Run with `npm run icons` after changing the icon art. Output goes to public/icons/.
// Requires Playwright (preinstalled globally in the dev container, or `npx playwright`).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(globalRoot, 'playwright')));
}

const outDir = 'public/icons';
mkdirSync(outDir, { recursive: true });
const font = readFileSync('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2').toString('base64');

// `pad` shrinks the art for maskable icons, whose outer 10% may be cropped.
function svg(pad = 0) {
  const s = 512;
  const inner = s - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <defs>
    <style>@font-face{font-family:B;src:url(data:font/woff2;base64,${font}) format('woff2');}</style>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#2a1470"/><stop offset="1" stop-color="#07051a"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff1a8"/><stop offset="0.5" stop-color="#ffc83d"/><stop offset="1" stop-color="#d98a00"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <g transform="translate(${pad} ${pad}) scale(${inner / s})">
    <circle cx="256" cy="290" r="170" fill="none" stroke="#ff2d95" stroke-width="16" filter="url(#glow)"/>
    <circle cx="256" cy="290" r="146" fill="none" stroke="#21d4fd" stroke-width="6" opacity="0.9"/>
    <path d="M150 150 L180 60 L222 118 L256 40 L290 118 L332 60 L362 150 Z" fill="url(#gold)" stroke="#7a4a00" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="180" cy="60" r="12" fill="#ff2d95"/><circle cx="256" cy="40" r="12" fill="#21d4fd"/><circle cx="332" cy="60" r="12" fill="#b6ff3b"/>
    <text x="256" y="360" text-anchor="middle" font-family="B" font-size="200" fill="url(#gold)" stroke="#7a4a00" stroke-width="5">E</text>
  </g>
</svg>`;
}

writeFileSync(path.join(outDir, 'favicon.svg'), svg());

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const targets = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 56],
  ['apple-touch-icon.png', 180, 0],
];
for (const [name, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#07051a">${svg(pad).replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outDir, name), clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', name);
}
await browser.close();
