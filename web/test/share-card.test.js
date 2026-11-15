import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildShareCardModel,
  drawShareCard,
  shareCardFilename,
} from '../js/share-card.js';

/**
 * Konteks canvas palsu yang mencatat teks dan ukuran.
 * @returns {object} konteks + daftar teks yang digambar.
 */
function fakeContext() {
  const texts = [];
  return {
    texts,
    globalAlpha: 1,
    fillStyle: '',
    font: '',
    clearRect() {},
    fillRect() {},
    beginPath() {},
    arc() {},
    arcTo() {},
    moveTo() {},
    closePath() {},
    fill() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    measureText(text) {
      return { width: String(text).length * 18 };
    },
    fillText(text) {
      texts.push(String(text));
    },
  };
}

test('model kartu memakai skor, akurasi, dan label pack yang aman', () => {
  const model = buildShareCardModel({
    summary: {
      score: 118,
      max_score: 100,
      accuracy: 0.9,
      mode: 'time_attack',
      best_streak_in_session: 4,
      pack_id: 'ewallet-bank',
    },
    levelLabel: 'Analis',
    at: '2026-11-14',
    packLabel: 'E-Wallet & Bank',
  });
  assert.equal(model.pack, 'E-Wallet & Bank');
  assert.equal(model.score, 118);
  assert.equal(model.maxScore, 100);
  assert.equal(model.accuracyText, '90%');
  assert.equal(model.mode, 'Time Attack');
  assert.equal(model.streak, 4);
  assert.equal(model.level, 'Analis');
  assert.equal(model.at, '2026-11-14');
});

test('model kartu menormalkan nilai rusak dan tidak memuat nickname', () => {
  const model = buildShareCardModel({
    summary: {
      score: -5,
      max_score: 0,
      accuracy: 4,
      mode: 'classic',
      best_streak_in_session: -2,
      pack_id: null,
      nickname: 'rahasia',
    },
  });
  assert.equal(model.score, 0);
  assert.equal(model.maxScore, 1);
  assert.equal(model.accuracy, 1);
  assert.equal(model.accuracyText, '100%');
  assert.equal(model.streak, 0);
  assert.equal(model.pack, 'Campur Semua');
  assert.equal('nickname' in model, false);
});

test('nama berkas kartu hanya memakai karakter aman', () => {
  const model = buildShareCardModel({
    summary: { score: 95, max_score: 100, accuracy: 0.8 },
    packLabel: 'Kampus & Pemerintahan / 2026',
  });
  assert.equal(shareCardFilename(model), 'phishquest-kampus-pemerintahan-2026-95xp.png');
});

test('kartu digambar pada 1200×630 dengan skor dan label utama', () => {
  const ctx = fakeContext();
  const model = buildShareCardModel({
    summary: { score: 87, max_score: 100, accuracy: 0.8, best_streak_in_session: 3 },
    levelLabel: 'Analis Muda',
    at: '2026-11-14',
    packLabel: 'Kantor',
  });
  const size = drawShareCard(ctx, model);
  assert.deepEqual(size, { width: 1200, height: 630 });
  assert.ok(ctx.texts.includes('PhishQuest'));
  assert.ok(ctx.texts.includes('87'));
  assert.ok(ctx.texts.includes('80%'));
  assert.ok(ctx.texts.includes('Kantor'));
  assert.ok(ctx.texts.includes('Analis Muda'));
  assert.ok(ctx.texts.every((text) => !text.includes('undefined') && !text.includes('NaN')));
});

test('kartu skor mengikuti locale Inggris', () => {
  const model = buildShareCardModel({
    summary: { score: 80, max_score: 100, accuracy: 0.8, mode: 'classic', best_streak_in_session: 2 },
    locale: 'en',
    levelLabel: 'Detective',
    packLabel: 'Office',
  });
  assert.equal(model.tagline, 'Spot the bait before you get hooked');
  assert.equal(model.mode, 'Classic');
  assert.equal(model.level, 'Detective');
  assert.equal(model.scoreOf, 'of 100 maximum XP');
  assert.equal(model.footer, 'Educational simulation · no personal data');
  assert.deepEqual(model.labels, { accuracy: 'Accuracy', streak: 'Streak', level: 'Level' });
  assert.match(model.shareText, /^PhishQuest score: 80\/100 XP · accuracy 80%$/);

  const ctx = fakeContext();
  drawShareCard(ctx, model);
  assert.ok(ctx.texts.includes('Accuracy'));
  assert.ok(ctx.texts.includes('of 100 maximum XP'));
  assert.ok(ctx.texts.includes('Educational simulation · no personal data'));
  assert.ok(ctx.texts.includes('Classic'));
});
