import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applyDocumentMetadata, documentMetadata } from '../js/metadata.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1];
const indexTitle = head.match(/<title>([\s\S]*?)<\/title>/i)[1].trim();
const indexMeta = {};
for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
  const attributes = {};
  for (const match of tag.matchAll(/([a-zA-Z][\w:-]*)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  const key = attributes.property || attributes.name;
  if (key && attributes.content != null) indexMeta[key] = attributes.content;
}

const META_KEYS = [
  'og:locale',
  'og:locale:alternate',
  'og:title',
  'og:description',
  'og:image:alt',
  'twitter:title',
  'twitter:description',
];

const INDONESIAN =
  /\b(?:anda|bahasa|dalam|dan|edukasi|kamu|kenali|main|sebelum|skenario|terhook|umpan|untuk|yang)\b/i;

function createDocument() {
  const nodes = new Map();
  const makeNode = () => ({
    content: '',
    setAttribute(name, value) {
      this[name] = value;
    },
  });
  for (const key of ['description', ...META_KEYS]) {
    const selector =
      key === 'description'
        ? 'meta[name="description"]'
        : `meta[property="${key}"], meta[name="${key}"]`;
    nodes.set(selector, makeNode());
  }
  return {
    documentElement: { lang: '' },
    title: '',
    nodes,
    querySelector(selector) {
      return nodes.get(selector) || null;
    },
  };
}

test('metadata Indonesia di index.html sama dengan sumber locale id', () => {
  const metadata = documentMetadata('id');
  assert.equal(metadata.lang, 'id');
  assert.equal(metadata.meta['og:locale'], 'id_ID');
  assert.equal(metadata.meta['og:locale:alternate'], 'en_US');
  assert.equal(metadata.title, indexTitle);
  assert.equal(metadata.description, indexMeta.description);
  for (const key of META_KEYS) {
    assert.ok(indexMeta[key], `index.html harus punya metadata ${key}`);
    assert.equal(metadata.meta[key], indexMeta[key], `metadata ${key} harus sinkron`);
  }
});

test('metadata Inggris lengkap, berbeda, dan bebas teks Indonesia', () => {
  const id = documentMetadata('id');
  const en = documentMetadata('en');
  assert.equal(en.lang, 'en');
  assert.equal(en.meta['og:locale'], 'en_US');
  assert.equal(en.meta['og:locale:alternate'], 'id_ID');
  assert.match(en.title, /Spot the bait before you get hooked/);
  assert.match(en.description, /Anti-phishing educational game/);
  assert.notEqual(en.title, id.title);
  assert.notEqual(en.description, id.description);
  for (const key of META_KEYS) {
    assert.notEqual(en.meta[key], id.meta[key], `metadata ${key} harus diterjemahkan`);
    assert.doesNotMatch(en.meta[key], INDONESIAN, `metadata ${key} masih mengandung teks Indonesia`);
  }
});

test('applyDocumentMetadata mengganti lang, title, description, OG, dan Twitter', () => {
  const doc = createDocument();
  applyDocumentMetadata(doc, 'en');
  const en = documentMetadata('en');
  assert.equal(doc.documentElement.lang, 'en');
  assert.equal(doc.title, en.title);
  assert.equal(doc.nodes.get('meta[name="description"]').content, en.description);
  for (const key of META_KEYS) {
    assert.equal(
      doc.nodes.get(`meta[property="${key}"], meta[name="${key}"]`).content,
      en.meta[key],
    );
  }

  applyDocumentMetadata(doc, 'id');
  const id = documentMetadata('id');
  assert.equal(doc.documentElement.lang, 'id');
  assert.equal(doc.title, id.title);
  assert.equal(doc.nodes.get('meta[name="description"]').content, id.description);
});

test('locale tak dikenal memakai metadata Indonesia dan tag yang hilang tidak fatal', () => {
  const doc = { documentElement: {}, title: '', querySelector: () => null };
  assert.doesNotThrow(() => applyDocumentMetadata(doc, 'fr'));
  assert.equal(doc.documentElement.lang, 'id');
  assert.equal(doc.title, documentMetadata('id').title);
});
