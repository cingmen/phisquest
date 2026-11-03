/**
 * Test draft editor: draft yang belum valid harus bertahan di perangkat tanpa
 * menimpa pack valid yang bisa dimainkan.
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

const invalidDraft = {
  pack_id: 'office',
  name: 'Draft belum valid',
  description: '',
  emoji: '🛠️',
  scenarios: [{ id: 'of-001', label: 'Belum lengkap' }],
};

test('draft belum valid tersimpan tanpa masuk daftar pack yang bisa dimainkan', () => {
  storage.saveCustomPacks([]);
  storage.saveDraftPack(invalidDraft);
  assert.deepEqual(storage.loadCustomPacks(), []);
  assert.equal(storage.loadDraftPacks().length, 1);
  assert.equal(storage.loadDraftPacks()[0].scenarios[0].label, 'Belum lengkap');
});

test('draft tidak menimpa pack valid yang sudah tersimpan', () => {
  const valid = {
    pack_id: 'office',
    name: 'Versi valid',
    description: '',
    emoji: '🏢',
    scenarios: [{ id: 'of-001' }, { id: 'of-002' }],
  };
  storage.saveCustomPacks([valid]);
  storage.saveDraftPack(invalidDraft);
  assert.equal(storage.loadCustomPacks()[0].name, 'Versi valid');
  assert.equal(storage.loadCustomPacks()[0].scenarios.length, 2);
  assert.equal(storage.loadDraftPacks()[0].name, 'Draft belum valid');
});

test('draft bertahan setelah modul dimuat ulang (simulasi reload)', async () => {
  const reloaded = await import('../js/storage.js?reload=1');
  assert.equal(reloaded.loadDraftPacks().length, 1);
  assert.equal(reloaded.loadDraftPacks()[0].pack_id, 'office');
  assert.deepEqual(reloaded.loadCustomPacks().map((pack) => pack.pack_id), ['office']);
});

test('pack_id baru menggantikan draft dengan id lama', () => {
  storage.saveDraftPack({ pack_id: 'kustom', name: 'Lama', scenarios: [] });
  storage.saveDraftPack({ pack_id: 'campus-gov', name: 'Baru', scenarios: [] }, 'kustom');
  assert.deepEqual(
    storage.loadDraftPacks().map((pack) => pack.pack_id).sort(),
    ['campus-gov', 'office'],
  );
});

test('removeDraftPack dan resetAll membersihkan draft', () => {
  storage.removeDraftPack('campus-gov');
  assert.equal(
    storage.loadDraftPacks().some((pack) => pack.pack_id === 'campus-gov'),
    false,
  );
  storage.resetAll();
  assert.deepEqual(storage.loadDraftPacks(), []);
  assert.deepEqual(storage.loadCustomPacks(), []);
});
