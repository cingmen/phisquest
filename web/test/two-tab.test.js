/**
 * Simulasi dua tab pada origin yang sama: satu penyimpanan bersama, keputusan diambil lewat
 * fungsi murni yang juga dipakai `app.js` (tanpa DOM dan tanpa dependensi tambahan).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  },
  dispatchEvent: () => true,
  addEventListener: () => {},
};

const storage = await import('../js/storage.js');
const editor = await import('../js/scenario_editor.js');

const T0 = '2026-11-04T08:00:00+07:00';
const T1 = '2026-11-04T08:05:00+07:00';
const T2 = '2026-11-04T08:10:00+07:00';

/** Potret daftar draft seperti yang disimpan `app.js` saat menerima event storage. */
function snapshot() {
  return storage.loadDraftPacks().map((draft) => ({
    pack_id: draft.pack_id,
    name: String(draft.name || ''),
  }));
}

/** Keputusan tulis satu tab, meniru `draftWriteDecision` di `persistEditorDraft`. */
function decideWrite(pack, incomingAt) {
  const stored = storage.loadDraftPacks().find((draft) => draft.pack_id === pack.pack_id);
  return editor.draftWriteDecision({
    incomingAt,
    storedAt: stored ? String(stored.updated_at || '') : '',
    sameContent: stored ? editor.samePackContent(pack, stored) : false,
  });
}

/** Tab yang menyimpan draftnya sendiri sesudah keputusan mengizinkan. */
function tabSave(pack, incomingAt) {
  storage.saveDraftPack({ ...pack, updated_at: incomingAt }, pack.pack_id);
  return storage.loadDraftPacks().find((draft) => draft.pack_id === pack.pack_id);
}

const packA = {
  pack_id: 'kustom',
  name: 'Pack lokal 1',
  scenarios: [{ id: 'ew-001', label: 'Dari tab A' }],
};
const packB = {
  pack_id: 'kustom',
  name: 'Pack lokal 1',
  scenarios: [{ id: 'ew-001', label: 'Dari tab B' }],
};

test('dua tab menulis draft yang sama: tab dengan versi lama tidak menimpa', () => {
  storage.saveCustomPacks([]);
  storage.clearDraftPacks();
  tabSave(packA, T1);
  assert.equal(storage.loadDraftPacks()[0].updated_at, T1);

  // Tab B masih memegang stempel lebih lama dan mencoba menulis.
  assert.deepEqual(decideWrite(packB, T0), {
    write: false,
    conflict: true,
    reason: 'remote-newer',
  });
  assert.equal(storage.loadDraftPacks()[0].scenarios[0].label, 'Dari tab A');

  // Setelah memuat versi terbaru, tab B boleh menulis dengan stempel baru.
  assert.equal(decideWrite(packB, T1).reason, 'same-time');
  tabSave(packB, T2);
  assert.equal(storage.loadDraftPacks()[0].scenarios[0].label, 'Dari tab B');
  assert.equal(storage.loadDraftPacks()[0].updated_at, T2);

  // Tab A yang masih memegang T1 kini melihat konflik, bukan menimpa diam-diam.
  assert.equal(decideWrite(packA, T1).reason, 'remote-newer');
});

test('draft dihapus di tab lain: tab editor tahu, menu ikut kosong, isi tab tidak hilang', () => {
  const storedPack = {
    pack_id: 'kustom',
    name: 'Pack lokal 1',
    scenarios: [{ id: 'ew-001', label: 'Versi main' }],
  };
  storage.saveCustomPacks([storedPack]);
  storage.saveDraftPack({ ...packB, updated_at: T2 }, 'kustom');
  const beforeDelete = snapshot();
  assert.equal(beforeDelete.length, 1);

  storage.removeDraftPack('kustom');

  const notice = editor.draftDeletionNotice({
    draftId: 'kustom',
    storedDrafts: storage.loadDraftPacks(),
    pack: packB,
    storedPack,
  });
  assert.deepEqual(notice, {
    lost: true,
    reason: 'deleted-elsewhere',
    packId: 'kustom',
    recoverable: true,
  });

  // Menu menyegarkan diri dari potret sebelum/sesudah, bukan menampilkan draft yang sudah hilang.
  const change = editor.draftListChange(beforeDelete, snapshot());
  assert.equal(change.changed, true);
  assert.deepEqual(change.removed, [{ pack_id: 'kustom', name: 'Pack lokal 1' }]);
  assert.deepEqual(editor.listDrafts(storage.loadDraftPacks(), storage.loadCustomPacks()), []);

  // Pack yang bisa dimainkan tidak ikut terhapus bersama draft.
  assert.deepEqual(storage.loadCustomPacks(), [storedPack]);

  // Pemulihan dari tab editor memakai stempel baru dan isi tab tersebut.
  const restored = tabSave({ ...packB, source_pack_id: 'kustom' }, T1);
  assert.equal(restored.scenarios[0].label, 'Dari tab B');
  assert.equal(restored.source_pack_id, 'kustom');
  assert.equal(storage.loadDraftPacks().length, 1);
});
