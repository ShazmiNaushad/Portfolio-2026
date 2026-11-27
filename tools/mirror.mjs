#!/usr/bin/env node
/**
 * Mirrors the live portfolio into this repository.
 *
 * The real site keeps its works in a database, so plain file hosting (GitHub Pages)
 * cannot render them by itself. This script downloads the finished pages, styles,
 * scripts and work images from the live site and writes them here as normal static
 * files, so https://shazminaushad.github.io/Portfolio-2026/ shows the real galleries.
 *
 * Run by .github/workflows/sync.yml on a schedule, or by hand:
 *   node tools/mirror.mjs
 */

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://shazmi-naushad-portfolio-s3pdo9.freebuff.page';
const PAGES = ['', 'logo', 'branding', 'packaging', 'event', 'social', 'print'];

const root = process.cwd();

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'cache-control': 'no-cache', 'user-agent': 'portfolio-mirror' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'portfolio-mirror' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Turn a site-rooted path into the flat file name used in this repository. */
function localPath(url) {
  const cut = Math.min(...[url.indexOf('#'), url.indexOf('?')].filter((i) => i >= 0).concat([url.length]));
  const target = url.slice(0, cut);
  const suffix = url.slice(cut);

  if (target === '/') return `index.html${suffix}`;
  if (target === '/event' || target === '/event/') return `event.html${suffix}`;
  if (target.startsWith('/event/')) return `event-${target.slice('/event/'.length).replace(/\/$/, '')}.html${suffix}`;
  if (target === '/index.html') return `index.html${suffix}`;
  return `${target.replace(/^\//, '')}${suffix}`;
}

/** Point every root-relative link at the local copy; leave absolute and #links alone. */
function rewrite(html) {
  return html.replace(/(\s(?:href|src|poster|data-src)=")(\/[^"]*)(")/g, (_m, before, url, after) => `${before}${localPath(url)}${after}`);
}

const workImages = new Set();
const eventSlugs = new Set();
const pages = new Map();

async function mirrorPage(sitePath) {
  const clean = String(sitePath).replace(/^\/+/, '');
  const html = await fetchText(`${SITE}/${clean}?mirror=${Date.now()}`);
  for (const match of html.matchAll(/(?:src|href)="\/work\/[^"]+"/g)) {
    workImages.add(match[0].replace(/^(?:src|href)="/, '').replace(/"$/, ''));
  }
  for (const match of html.matchAll(/href="\/event\/([a-z0-9][a-z0-9-]*)"/g)) {
    eventSlugs.add(match[1]);
  }
  return rewrite(html);
}

const mirrored = [];

for (const name of PAGES) {
  const file = name === '' ? 'index.html' : `${name}.html`;
  pages.set(file, await mirrorPage(name));
  mirrored.push(file);
}

for (const slug of eventSlugs) {
  const file = `event-${slug}.html`;
  pages.set(file, await mirrorPage(`/event/${slug}`));
  mirrored.push(file);
}

// styles.css and script.js are plain files already served by the live site.
for (const asset of ['styles.css', 'script.js']) {
  const text = await fetchText(`${SITE}/${asset}?mirror=${Date.now()}`);
  await writeFile(path.join(root, asset), text);
  mirrored.push(asset);
}

await mkdir(path.join(root, 'work'), { recursive: true });
const downloaded = [];
for (const image of workImages) {
  const name = image.replace('/work/', '');
  const buffer = await fetchBinary(`${SITE}${image}`);
  await writeFile(path.join(root, 'work', name), buffer);
  downloaded.push(name);
}

// Drop images that are no longer used anywhere, so removed works disappear here too.
let removed = 0;
for (const name of await readdir(path.join(root, 'work'))) {
  if (!downloaded.includes(name)) {
    await unlink(path.join(root, 'work', name));
    removed += 1;
  }
}

for (const [file, html] of pages) {
  await writeFile(path.join(root, file), html.endsWith('\n') ? html : `${html}\n`);
}

console.log(`Mirrored ${pages.size} pages, ${downloaded.length} images${removed ? `, removed ${removed} stale images` : ''}.`);
