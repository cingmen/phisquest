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
  alignScenarioPrefixes,
  createScenarioTemplate,
  deleteScenarioShortcut,
  draftDeletionNotice,
  draftIsOrphan,
  draftListChange,
  draftStatus,
  draftWriteDecision,
  duplicateScenario,
  exportBlocker,
  findPackIdConflict,
  isTextEntryTarget,
  listDrafts,
  mergeDraftPack,
  moveScenario,
  parsePackText,
  samePackContent,
  savePlan,
  scenarioNavShortcut,
  sortDrafts,
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

test('memilih salah satu pack_id membuat pack dari nol siap konten', () => {
  for (const packId of ['ewallet-bank', 'office', 'shopping-courier', 'campus-gov']) {
    const prefix = { 'ewallet-bank': 'ew', office: 'of', 'shopping-courier': 'sc', 'campus-gov': 'cg' }[
      packId
    ];
    const selected = {
      ...readyPack,
      pack_id: packId,
      scenarios: alignScenarioPrefixes(readyPack.scenarios, prefix),
    };
    const readiness = validatePackShape(selected);
    assert.deepEqual(readiness.issues, [], `pack_id ${packId}`);
    assert.equal(readiness.ready, true);
    assert.ok(selected.scenarios.every((scenario) => scenario.id.startsWith(`${prefix}-`)));
  }
});

test('savePlan tidak pernah membuat pack baru dari autosave', () => {
  assert.deepEqual(savePlan(), { stored: false, reason: 'draft-only' });
  assert.deepEqual(savePlan({ inStore: false, explicit: false }), {
    stored: false,
    reason: 'draft-only',
  });
  assert.deepEqual(savePlan({ inStore: true, explicit: false }), { stored: true, reason: null });
  assert.deepEqual(savePlan({ inStore: false, explicit: true }), { stored: true, reason: null });
  assert.deepEqual(savePlan({ problems: ['body kosong'], inStore: true, explicit: true }), {
    stored: false,
    reason: 'invalid',
  });
  assert.deepEqual(savePlan({ conflict: true, inStore: false, explicit: true }), {
    stored: false,
    reason: 'conflict',
  });
});

test('draft yatim dikenali dari daftar main, termasuk draft tanpa source_pack_id', () => {
  const draft = { pack_id: 'kustom', source_pack_id: 'kustom' };
  assert.equal(draftIsOrphan(draft, []), true);
  assert.equal(draftIsOrphan(draft, [{ pack_id: 'kustom' }]), false);
  assert.equal(draftIsOrphan({ pack_id: 'kustom' }, []), true);
  assert.equal(draftIsOrphan({ pack_id: 'kustom' }, [{ pack_id: 'kustom' }]), false);
  assert.equal(draftIsOrphan({ pack_id: 'kustom', source_pack_id: null }, []), true);
  assert.equal(
    draftIsOrphan({ pack_id: 'kustom', source_pack_id: 'lain' }, [{ pack_id: 'kustom' }]),
    false,
  );
  assert.equal(draftIsOrphan(null, []), false);
  assert.equal(draftIsOrphan({}, []), false);
});

test('daftar draft diurutkan dari edit terbaru dengan label tetap benar', () => {
  const packs = [{ pack_id: 'office', name: 'Office', scenarios: [{ id: 'of-001' }] }];
  const rows = listDrafts(
    [
      { pack_id: 'lama', name: 'Lama', updated_at: '2026-11-01T10:00:00.000Z', scenarios: [] },
      { pack_id: 'baru', name: 'Baru', updated_at: '2026-11-03T10:00:00.000Z', scenarios: [] },
      {
        pack_id: 'office',
        name: 'Office',
        updated_at: '2026-11-02T10:00:00.000Z',
        scenarios: [{ id: 'of-001' }],
      },
    ],
    packs,
  );
  assert.deepEqual(
    rows.map((row) => row.pack_id),
    ['baru', 'office', 'lama'],
  );
  assert.equal(rows[0].label, 'pack sumber sudah dihapus');
  assert.equal(rows[1].label, 'isinya sama dengan pack tersimpan');
  assert.equal(rows[2].label, 'pack sumber sudah dihapus');
  assert.deepEqual(
    sortDrafts([
      { pack_id: 'a', updated_at: '2026-01-01T00:00:00.000Z' },
      { pack_id: 'b', updated_at: '2026-02-01T00:00:00.000Z' },
    ]).map((draft) => draft.pack_id),
    ['b', 'a'],
  );
  assert.deepEqual(sortDrafts([]), []);
});

test('penulisan draft menghormati versi yang lebih baru dari tab lain', () => {
  assert.deepEqual(draftWriteDecision({}), { write: true, conflict: false, reason: 'new' });
  assert.deepEqual(
    draftWriteDecision({ incomingAt: 'T1', storedAt: 'T1', sameContent: true }),
    { write: false, conflict: false, reason: 'identical' },
  );
  assert.deepEqual(
    draftWriteDecision({ incomingAt: 'T1', storedAt: 'T2', sameContent: false }),
    { write: false, conflict: true, reason: 'remote-newer' },
  );
  assert.deepEqual(
    draftWriteDecision({ incomingAt: 'T2', storedAt: 'T1', sameContent: false }),
    { write: true, conflict: false, reason: 'newer' },
  );
  assert.deepEqual(
    draftWriteDecision({ incomingAt: 'T1', storedAt: 'T1', sameContent: false }),
    { write: true, conflict: false, reason: 'same-time' },
  );
});

test('draft yang dihapus di tab lain terdeteksi dan bisa disimpan ulang', () => {
  const pack = { pack_id: 'kustom', name: 'Kustom', scenarios: [{ id: 'ew-001' }] };
  assert.deepEqual(draftDeletionNotice({}), {
    lost: false,
    reason: 'untracked',
    packId: null,
    recoverable: false,
  });
  const present = draftDeletionNotice({
    draftId: 'kustom',
    storedDrafts: [{ pack_id: 'kustom' }],
    pack,
    storedPack: null,
  });
  assert.deepEqual(present, {
    lost: false,
    reason: 'present',
    packId: 'kustom',
    recoverable: false,
  });
  assert.deepEqual(draftDeletionNotice({ draftId: 'kustom', storedDrafts: [], pack, storedPack: null }), {
    lost: true,
    reason: 'deleted-elsewhere',
    packId: 'kustom',
    recoverable: true,
  });
  const mirrored = draftDeletionNotice({
    draftId: 'kustom',
    storedDrafts: [{ pack_id: 'lain' }],
    pack,
    storedPack: pack,
  });
  assert.equal(mirrored.lost, true);
  assert.equal(mirrored.recoverable, false);
  assert.equal(draftDeletionNotice({ draftId: '', pack }).lost, false);
});

test('draft yang dihapus di tab lain terlihat dari potret daftar draft', () => {
  const before = [
    { pack_id: 'kustom', name: 'Pack lokal 1', updated_at: 'T1' },
    { pack_id: 'lain', name: 'Pack lain' },
  ];
  const removedOne = draftListChange(before, [{ pack_id: 'kustom', name: 'Pack lokal 1' }]);
  assert.equal(removedOne.changed, true);
  assert.deepEqual(removedOne.removed, [{ pack_id: 'lain', name: 'Pack lain' }]);
  assert.deepEqual(removedOne.added, []);

  const addedOne = draftListChange(before, [...before, { pack_id: 'baru', name: 'Baru' }]);
  assert.deepEqual(addedOne.added, [{ pack_id: 'baru', name: 'Baru' }]);
  assert.deepEqual(addedOne.removed, []);

  assert.deepEqual(draftListChange(before, before), { changed: false, removed: [], added: [] });
  // Ganti nama saja bukan penghapusan atau penambahan draft.
  assert.equal(
    draftListChange(before, [
      { pack_id: 'kustom', name: 'Diganti' },
      { pack_id: 'lain', name: 'Pack lain' },
    ]).changed,
    false,
  );
  // Entri tanpa id yang sah diabaikan, dan masukan kosong tidak melempar galat.
  assert.deepEqual(draftListChange(undefined, [{ pack_id: '  ', name: 'kosong' }]), {
    changed: false,
    removed: [],
    added: [],
  });
  assert.deepEqual(draftListChange(before, []), {
    changed: true,
    removed: [
      { pack_id: 'kustom', name: 'Pack lokal 1' },
      { pack_id: 'lain', name: 'Pack lain' },
    ],
    added: [],
  });
});

test('penggabungan tiga arah mengambil perubahan yang tidak bertabrakan', () => {
  const base = {
    pack_id: 'kustom',
    name: 'Pack lokal 1',
    description: '',
    emoji: '🛠️',
    scenarios: [
      { id: 'ew-001', label: 'Asli', body: 'isi asli', type: 'email' },
      { id: 'ew-002', label: 'Kedua', body: 'isi kedua', type: 'email' },
    ],
  };
  const ours = {
    ...base,
    name: 'Nama dari tab ini',
    scenarios: [
      { id: 'ew-001', label: 'Asli', body: 'isi dari tab ini', type: 'email' },
      { id: 'ew-002', label: 'Kedua', body: 'isi kedua', type: 'email' },
    ],
  };
  const theirs = {
    ...base,
    scenarios: [
      { id: 'ew-001', label: 'Judul dari tab lain', body: 'isi asli', type: 'email' },
      { id: 'ew-002', label: 'Kedua', body: 'isi kedua', type: 'email' },
      { id: 'ew-003', label: 'Tambahan tab lain', body: 'baru', type: 'email' },
    ],
  };

  const merged = mergeDraftPack({ base, ours, theirs });
  assert.equal(merged.merged, true);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.pack.name, 'Nama dari tab ini');
  assert.equal(merged.pack.scenarios.length, 3);
  assert.equal(merged.pack.scenarios[0].label, 'Judul dari tab lain');
  assert.equal(merged.pack.scenarios[0].body, 'isi dari tab ini');
  assert.equal(merged.pack.scenarios[2].id, 'ew-003');
});

test('penggabungan tiga arah menandai field yang bentrok dan memakai isi tab ini', () => {
  const base = { pack_id: 'kustom', name: 'Awal', scenarios: [{ id: 'ew-001', body: 'isi' }] };
  const ours = { ...base, name: 'Versi tab ini' };
  const theirs = { ...base, name: 'Versi tab lain' };
  const merged = mergeDraftPack({ base, ours, theirs });
  assert.equal(merged.pack.name, 'Versi tab ini');
  assert.deepEqual(merged.conflicts, [{ scope: 'pack', id: null, field: 'name' }]);

  // Tanpa leluhur bersama, semua field berbeda dianggap bentrok dan isi tab ini dipakai.
  const noBase = mergeDraftPack({ ours, theirs });
  assert.equal(noBase.pack.name, 'Versi tab ini');
  assert.ok(noBase.conflicts.length > 0);
  assert.equal(mergeDraftPack({ ours }).merged, false);
});

test('penghapusan skenario antar-tab dihormati kecuali isinya diubah setelah itu', () => {
  const base = {
    pack_id: 'kustom',
    name: 'Pack',
    scenarios: [
      { id: 'ew-001', body: 'satu' },
      { id: 'ew-002', body: 'dua' },
    ],
  };
  // Tab lain menghapus skenario kedua yang tidak kita sentuh: ikuti penghapusan tanpa bentrok.
  const untouched = mergeDraftPack({
    base,
    ours: base,
    theirs: { ...base, scenarios: [{ id: 'ew-001', body: 'satu' }] },
  });
  assert.deepEqual(untouched.conflicts, []);
  assert.deepEqual(
    untouched.pack.scenarios.map((scenario) => scenario.id),
    ['ew-001'],
  );

  // Kita mengubah skenario yang dihapus tab lain: isi kita dipertahankan dan bentrok dicatat.
  const changed = mergeDraftPack({
    base,
    ours: { ...base, scenarios: [{ id: 'ew-001', body: 'satu' }, { id: 'ew-002', body: 'dua diubah' }] },
    theirs: { ...base, scenarios: [{ id: 'ew-001', body: 'satu' }] },
  });
  assert.deepEqual(
    changed.pack.scenarios.map((scenario) => scenario.id),
    ['ew-001', 'ew-002'],
  );
  assert.deepEqual(changed.conflicts, [
    { scope: 'scenario', id: 'ew-002', field: 'deleted-elsewhere' },
  ]);

  // Kita menghapus skenario yang diubah tab lain: versi tab lain dipulihkan dan bentrok dicatat.
  const restored = mergeDraftPack({
    base,
    ours: { ...base, scenarios: [{ id: 'ew-001', body: 'satu' }] },
    theirs: { ...base, scenarios: [{ id: 'ew-001', body: 'satu' }, { id: 'ew-002', body: 'dua dari tab lain' }] },
  });
  assert.deepEqual(
    restored.pack.scenarios.map((scenario) => scenario.body),
    ['satu', 'dua dari tab lain'],
  );
  assert.deepEqual(restored.conflicts, [{ scope: 'scenario', id: 'ew-002', field: 'deleted-here' }]);

  // Kita menghapus skenario yang tidak diubah tab lain: penghapusan dipertahankan.
  const keptDeleted = mergeDraftPack({
    base,
    ours: { ...base, scenarios: [{ id: 'ew-001', body: 'satu' }] },
    theirs: base,
  });
  assert.deepEqual(keptDeleted.conflicts, []);
  assert.equal(keptDeleted.pack.scenarios.length, 1);
});

test('daftar draft menampilkan draft identik dengan label yang jelas', () => {
  const stored = { pack_id: 'office', name: 'Office', scenarios: [{ id: 'of-001' }] };
  const identical = {
    pack_id: 'office',
    name: 'Office',
    updated_at: '2026-11-03T10:00:00.000Z',
    scenarios: [{ id: 'of-001' }],
  };
  const changed = {
    pack_id: 'office',
    name: 'Office',
    updated_at: '2026-11-02T10:00:00.000Z',
    scenarios: [{ id: 'of-002' }],
  };
  const orphan = {
    pack_id: 'hilang',
    name: 'Lama',
    updated_at: '2026-11-01T10:00:00.000Z',
    scenarios: [],
  };
  const rows = listDrafts([identical, changed, orphan], [stored]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].label, 'isinya sama dengan pack tersimpan');
  assert.equal(rows[0].identical, true);
  assert.equal(rows[1].label, 'belum tersimpan');
  assert.equal(rows[1].identical, false);
  assert.equal(rows[2].label, 'pack sumber sudah dihapus');
  assert.equal(rows[2].orphan, true);
  assert.equal(draftStatus(null, [stored]).label, 'pack sumber sudah dihapus');
  assert.deepEqual(listDrafts([], [stored]), []);
  assert.deepEqual(listDrafts([null, { pack_id: '   ' }], [stored]), []);
  assert.equal(samePackContent(identical, stored), true);
  assert.equal(samePackContent(changed, stored), false);
  assert.equal(samePackContent(null, stored), false);
});

test('pintasan keyboard diabaikan saat fokus di kolom teks', () => {
  assert.equal(isTextEntryTarget('INPUT'), true);
  assert.equal(isTextEntryTarget('textarea'), true);
  assert.equal(isTextEntryTarget('div', true), true);
  assert.equal(isTextEntryTarget('div', false), false);
  assert.equal(isTextEntryTarget('SELECT'), true);
  assert.equal(isTextEntryTarget('button'), false);
  assert.equal(isTextEntryTarget(undefined), false);
});

test('pintasan hapus skenario hanya menyala saat aman', () => {
  const base = { altKey: true, scenarioCount: 3, index: 1 };
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace' }), {
    delete: true,
    reason: 'ok',
  });
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Delete' }), {
    delete: true,
    reason: 'ok',
  });
  // Tanpa Alt, atau dengan Ctrl/Meta, tombol tidak dipakai sebagai pintasan hapus.
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', altKey: false }), {
    delete: false,
    reason: 'modifier',
  });
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', ctrlKey: true }), {
    delete: false,
    reason: 'modifier',
  });
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', metaKey: true }), {
    delete: false,
    reason: 'modifier',
  });
  // Tombol lain tidak menghapus apa pun.
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'D' }), {
    delete: false,
    reason: 'key',
  });
  // Fokus di kolom isian dan dialog terbuka selalu menang.
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', isTextEntry: true }), {
    delete: false,
    reason: 'text-entry',
  });
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', dialogOpen: true }), {
    delete: false,
    reason: 'dialog-open',
  });
  // Skenario terakhir tidak boleh hilang lewat pintasan, dan indeks harus menunjuk skenario nyata.
  assert.deepEqual(
    deleteScenarioShortcut({ altKey: true, key: 'Backspace', scenarioCount: 1, index: 0 }),
    { delete: false, reason: 'last-scenario' },
  );
  assert.deepEqual(
    deleteScenarioShortcut({ altKey: true, key: 'Backspace', scenarioCount: 0, index: 0 }),
    { delete: false, reason: 'last-scenario' },
  );
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', index: 3 }), {
    delete: false,
    reason: 'index',
  });
  assert.deepEqual(deleteScenarioShortcut({ ...base, key: 'Backspace', index: -1 }), {
    delete: false,
    reason: 'index',
  });
});

test('pintasan Alt+panah berpindah skenario dan berhenti di ujung daftar', () => {
  const base = { altKey: true, scenarioCount: 3 };
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowDown', index: 0 }), {
    move: 1,
    reason: 'ok',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowUp', index: 2 }), {
    move: -1,
    reason: 'ok',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowUp', index: 0 }), {
    move: 0,
    reason: 'edge',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowDown', index: 2 }), {
    move: 0,
    reason: 'edge',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowDown', index: 0, altKey: false }), {
    move: 0,
    reason: 'modifier',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowDown', index: 0, ctrlKey: true }), {
    move: 0,
    reason: 'modifier',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowLeft', index: 1 }), {
    move: 0,
    reason: 'key',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowDown', index: 1, isTextEntry: true }), {
    move: 0,
    reason: 'text-entry',
  });
  assert.deepEqual(scenarioNavShortcut({ ...base, key: 'ArrowDown', index: 1, dialogOpen: true }), {
    move: 0,
    reason: 'dialog-open',
  });
  assert.deepEqual(scenarioNavShortcut({ altKey: true, key: 'ArrowDown', scenarioCount: 0, index: 0 }), {
    move: 0,
    reason: 'index',
  });
});

test('menggandakan skenario memberi id baru berprefix dan tetap valid', () => {
  const base = { ...readyPack.scenarios[0], id: 'of-001', label: 'Asli' };
  const list = duplicateScenario([base], 0, 'of');
  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'of-001');
  assert.equal(list[1].id, 'of-002');
  assert.equal(list[1].label, 'Asli (salinan)');
  assert.deepEqual(validateScenario(list[1], 1), []);
  assert.notEqual(list[1], base);
  assert.notEqual(list[1].sender, base.sender);
  const taken = duplicateScenario([{ ...base }, { ...base, id: 'of-002' }], 0, 'of');
  assert.equal(taken[1].id, 'of-003');
  assert.deepEqual(duplicateScenario([], 0, 'of'), []);
  assert.deepEqual(duplicateScenario([base], 5, 'of'), [base]);
});

test('ID pack yang sudah dipakai pack lain terdeteksi bentrok', () => {
  const packs = [{ pack_id: 'office', name: 'Office lama', scenarios: [{}, {}] }];
  const conflict = findPackIdConflict({ ...readyPack, pack_id: 'office' }, packs, null);
  assert.deepEqual(conflict, { pack_id: 'office', name: 'Office lama', scenarios: 2 });
  assert.equal(findPackIdConflict({ ...readyPack, pack_id: 'office' }, packs, 'office'), null);
  assert.equal(findPackIdConflict({ ...readyPack, pack_id: 'campus-gov' }, packs), null);
  assert.equal(findPackIdConflict(null, packs), null);
  assert.equal(findPackIdConflict({ ...readyPack, pack_id: '  ' }, packs), null);
});

test('pack_id tak dikenal ditolak saat ekspor dengan alasan jelas', () => {
  const blocker = exportBlocker({ ...readyPack, pack_id: 'kustom' });
  assert.ok(blocker && blocker.includes('kustom'));
  assert.ok(blocker.includes('ewallet-bank'));
  assert.equal(exportBlocker(readyPack), null);
  assert.ok((exportBlocker(null) || '').includes('Belum ada pack'));
});
