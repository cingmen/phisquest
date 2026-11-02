/**
 * Test mini editor skenario terhadap fixture yang juga dipakai pytest.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAMPLE_PACK, parsePackText, validateScenario } from '../js/scenario_editor.js';

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(resolve(here, 'editor-cases.json'), 'utf8'));

test('skenario contoh lolos validasi editor', () => {
  for (const scenario of cases.valid) {
    assert.deepEqual(validateScenario(scenario), [], `skenario ${scenario.id}`);
  }
});

test('skenario bermasalah ditolak dengan pesan yang jelas', () => {
  for (const item of cases.invalid) {
    const errors = validateScenario(item.scenario);
    assert.ok(errors.length > 0, `${item.name} seharusnya ditolak`);
    assert.ok(
      errors.some((message) => message.toLowerCase().includes(item.expect.toLowerCase())),
      `${item.name}: pesan tidak memuat '${item.expect}' (${errors.join(' | ')})`,
    );
  }
});

test('tempelan satu skenario dibungkus menjadi pack', () => {
  const { pack, errors } = parsePackText(JSON.stringify(cases.valid[0]));
  assert.deepEqual(errors, []);
  assert.equal(pack.scenarios.length, 1);
  assert.equal(pack.pack_id, 'kustom');
});

test('tempelan pack utuh mempertahankan nama', () => {
  const { pack, errors } = parsePackText(
    JSON.stringify({ pack_id: 'kustom', name: 'Latihan saya', scenarios: cases.valid }),
  );
  assert.deepEqual(errors, []);
  assert.equal(pack.name, 'Latihan saya');
  assert.equal(pack.scenarios.length, 2);
});

test('JSON rusak dan id duplikat ditolak', () => {
  assert.equal(parsePackText('{bukan json').pack, null);
  const duplicate = parsePackText(JSON.stringify([cases.valid[0], cases.valid[0]]));
  assert.equal(duplicate.pack, null);
  assert.ok(duplicate.errors.some((message) => message.includes('duplikat')));
});

test('contoh bawaan editor tetap valid', () => {
  const { pack, errors } = parsePackText(SAMPLE_PACK);
  assert.deepEqual(errors, []);
  assert.equal(pack.scenarios.length, 2);
});
