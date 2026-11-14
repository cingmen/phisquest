import assert from 'node:assert/strict';
import test from 'node:test';

import { applyManifestTranslation, applyPackTranslation } from '../js/content.js';

const translations = {
  packs: {
    demo: { name: 'Demo Pack', description: 'English description.' },
  },
  scenarios: {
    'dm-001': {
      subject: 'A translated subject',
      body: 'A translated body.',
      explanation: 'A translated explanation.',
      teach: { tip: 'A translated tip.', verify_how: 'A translated check.' },
      options: { A: 'First option', B: 'Second option' },
    },
  },
};

const pack = {
  pack_id: 'demo',
  name: 'Pack Demo',
  description: 'Deskripsi Indonesia.',
  scenarios: [
    {
      id: 'dm-001',
      subject: 'Subjek asli',
      body: 'Badan asli.',
      explanation: 'Penjelasan asli.',
      teach: { tip: 'Tip asli.', verify_how: 'Cek asli.' },
      options: [
        { id: 'A', text: 'Opsi pertama', correct: false },
        { id: 'B', text: 'Opsi kedua', correct: true },
      ],
    },
  ],
};

test('applyPackTranslation mengganti teks tanpa mengubah struktur', () => {
  const result = applyPackTranslation(pack, translations);

  assert.equal(result.name, 'Demo Pack');
  assert.equal(result.description, 'English description.');
  assert.equal(result.scenarios[0].body, 'A translated body.');
  assert.equal(result.scenarios[0].subject, 'A translated subject');
  assert.equal(result.scenarios[0].teach.tip, 'A translated tip.');
  assert.deepEqual(
    result.scenarios[0].options.map((option) => option.text),
    ['First option', 'Second option'],
  );
  assert.deepEqual(
    result.scenarios[0].options.map((option) => option.correct),
    [false, true],
  );
  assert.equal(pack.scenarios[0].body, 'Badan asli.');
});

test('applyPackTranslation mengembalikan pack asli tanpa terjemahan', () => {
  assert.equal(applyPackTranslation(pack, null), pack);
});

test('applyManifestTranslation hanya mengganti metadata pack', () => {
  const manifest = {
    schema_version: '1.0',
    packs: [{ pack_id: 'demo', name: 'Pack Demo', description: 'Deskripsi.' }],
  };
  const result = applyManifestTranslation(manifest, translations);
  assert.equal(result.packs[0].name, 'Demo Pack');
  assert.equal(manifest.packs[0].name, 'Pack Demo');
});
