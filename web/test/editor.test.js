/**
 * Test mini editor skenario terhadap fixture yang juga dipakai pytest.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SAMPLE_PACK,
  createScenarioTemplate,
  moveScenario,
  parsePackText,
  toContentPack,
  validatePackShape,
  validateScenario,
} from '../js/scenario_editor.js';

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(resolve(here, 'editor-cases.json'), 'utf8'));
const packCases = JSON.parse(readFileSync(resolve(here, 'editor-packs.json'), 'utf8'));
const readyPack = JSON.parse(readFileSync(resolve(here, 'editor-pack-ready.json'), 'utf8'));

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

test('seluruh pack content/ dinyatakan siap oleh pemeriksa editor', () => {
  const packsDir = resolve(here, '../../content/packs');
  const files = readdirSync(packsDir).filter((file) => file.endsWith('.json'));
  assert.ok(files.length > 0, 'content/packs tidak boleh kosong');
  for (const file of files) {
    const pack = JSON.parse(readFileSync(resolve(packsDir, file), 'utf8'));
    const readiness = validatePackShape(pack);
    assert.deepEqual(readiness.issues, [], `${file} seharusnya siap menjadi pack konten`);
    assert.equal(readiness.ready, true);
  }
});

test('pack contoh editor ditandai belum siap jadi pack konten', () => {
  const { pack } = parsePackText(SAMPLE_PACK);
  const readiness = validatePackShape(pack);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.issues.some((issue) => issue.includes('10 skenario')));
  assert.ok(readiness.issues.some((issue) => issue.includes('pack_id')));
});

test('pack dengan skenario bermasalah tidak dinyatakan siap', () => {
  const contentPack = JSON.parse(
    readFileSync(resolve(here, '../../content/packs/office.json'), 'utf8'),
  );
  const broken = {
    ...contentPack,
    scenarios: contentPack.scenarios.map((scenario, index) =>
      index === 0 ? { ...scenario, id: 'ew-999' } : scenario,
    ),
  };
  const readiness = validatePackShape(broken);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.issues.some((issue) => issue.includes("prefix 'of-'")));
});

test('aturan pack yang sama menolak fixture bersama', () => {
  for (const item of packCases.invalid) {
    const readiness = validatePackShape(item.pack);
    assert.equal(readiness.ready, false, `${item.name} seharusnya ditolak`);
    assert.ok(
      readiness.issues.some((issue) => issue.toLowerCase().includes(item.expect.toLowerCase())),
      `${item.name}: pesan tidak memuat '${item.expect}' (${readiness.issues.join(' | ')})`,
    );
  }
});

test('ekspor pack melengkapi field tingkat pack', () => {
  const exported = toContentPack({
    pack_id: 'kustom',
    name: 'Latihan saya',
    description: '',
    emoji: '',
    scenarios: cases.valid,
  });
  assert.equal(exported.schema_version, '1.0');
  assert.equal(exported.description, 'Pack buatan sendiri dari editor PhishQuest.');
  assert.equal(exported.emoji, '🛠️');
  assert.equal(exported.scenarios.length, cases.valid.length);
  assert.notEqual(exported.scenarios[0], cases.valid[0]);
});

test('skenario baru langsung lolos validasi per-skenario', () => {
  const created = createScenarioTemplate(['ew-001', 'ew-002'], 'ew');
  assert.deepEqual(validateScenario(created), []);
  assert.equal(created.id, 'ew-003');
  assert.equal(createScenarioTemplate([], 'of').id, 'of-001');
});

test('susun ulang skenario tanpa mengubah daftar asli', () => {
  const original = [
    { id: 'ew-001' },
    { id: 'ew-002' },
    { id: 'ew-003' },
  ];
  const moved = moveScenario(original, 2, 0);
  assert.deepEqual(
    moved.map((item) => item.id),
    ['ew-003', 'ew-001', 'ew-002'],
  );
  assert.deepEqual(
    original.map((item) => item.id),
    ['ew-001', 'ew-002', 'ew-003'],
  );
  assert.deepEqual(moveScenario(original, 0, 5), original);
});

test('pack siap konten tetap siap dan mengekspor semua skenario', () => {
  assert.equal(readyPack.scenarios.length, 10);
  assert.equal(validatePackShape(readyPack).ready, true);
  const exported = toContentPack(readyPack);
  assert.equal(exported.scenarios.length, 10);
  assert.equal(
    exported.scenarios.some((scenario) => 'label' in scenario),
    false,
  );
  for (const scenario of exported.scenarios) {
    assert.deepEqual(validateScenario(scenario), [], `skenario ${scenario.id}`);
  }
  assert.deepEqual(validatePackShape(exported).issues, []);
});

test('menambah skenario mengubah status kesiapan pack', () => {
  const extended = {
    ...readyPack,
    scenarios: [...readyPack.scenarios, createScenarioTemplate([], 'of')],
  };
  const readiness = validatePackShape(extended);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.issues.some((issue) => issue.includes('10 skenario')));
});
