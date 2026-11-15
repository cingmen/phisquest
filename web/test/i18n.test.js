import assert from 'node:assert/strict';
import test from 'node:test';

import { translateString } from '../js/i18n.js';

test('translateString menerjemahkan label statis', () => {
  assert.equal(translateString('Pilih pack'), 'Choose a pack');
  assert.equal(translateString('🎮 Main'), '🎮 Play');
  assert.equal(translateString('Jawaban benar:'), 'Correct answer:');
});

test('translateString menerjemahkan pola dinamis', () => {
  assert.equal(translateString('10 skenario'), '10 scenarios');
  assert.equal(translateString('20 soal'), '20 questions');
  assert.equal(translateString('Soal 3 dari 10'), 'Question 3 of 10');
  assert.equal(translateString('120 XP · 2/10 lencana'), '120 XP · 2/10 badges');
  assert.equal(translateString('9/10 diperoleh'), '9/10 earned');
  assert.equal(translateString('50 XP (maks)'), '50 XP (max)');
  assert.equal(
    translateString('Toko Saya · 3 skenario'),
    'Toko Saya · 3 scenarios',
  );
});

test('translateString membiarkan teks yang tidak dikenal', () => {
  assert.equal(translateString('Toko Saya'), 'Toko Saya');
  assert.equal(translateString(''), '');
});

test('translateString menerjemahkan editor skenario dan dialog konfirmasi', () => {
  assert.equal(translateString('Scenario editor'), 'Scenario editor');
  assert.equal(translateString('— pilih ID pack —'), '— choose a content pack ID —');
  assert.equal(translateString('Skenario 1 belum valid: skenario #1: body wajib string tidak kosong'),
    'Scenario 1 is not valid: scenario #1: body must be a non-empty string');
  assert.equal(translateString('Buang draft "X"? Isian di draft ini akan hilang.'),
    'Discard draft "X"? The input in this draft will be lost.');
  assert.equal(translateString('Hapus semua pack buatanmu di perangkat ini?'),
    'Delete all packs you created on this device?');
  assert.equal(translateString('Menu tetap memainkan versi tersimpan (1 skenario) sampai draft ini lolos validasi.'),
    'The menu keeps playing the saved version (1 scenario) until this draft passes validation.');
});

test('translateString mempertahankan spasi di sekitar teks inline', () => {
  assert.equal(translateString('  Pilih pack  '), '  Choose a pack  ');
});
