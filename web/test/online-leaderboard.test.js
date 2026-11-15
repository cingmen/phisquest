import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import {
  OnlineError,
  canonicalScorePayload,
  deleteOnlinePlayer,
  fetchOnlineLeaderboard,
  scorePayload,
  signScore,
  submitOnlineScore,
} from '../js/online-leaderboard.js';

const SECRET = 'test-secret';
const CONFIG = { base: 'https://api.example/v1', secret: SECRET };

/**
 * Bandingkan tanda tangan dengan implementasi Node.
 * @param {object} payload - payload tanpa sig.
 * @returns {string} hex HMAC.
 */
function expectedSignature(payload) {
  return createHmac('sha256', SECRET).update(canonicalScorePayload(payload)).digest('hex');
}

test('payload kanonis memakai akurasi empat desimal', () => {
  const payload = {
    nickname: 'budi_analisis',
    pack_id: 'ewallet-bank',
    score: 118,
    accuracy: 0.9,
    duration_s: 312,
  };
  assert.equal(
    canonicalScorePayload(payload),
    'budi_analisis|ewallet-bank|118|0.9000|312',
  );
});

test('payload skor dinormalkan ke batas server', () => {
  const payload = scorePayload(
    { pack_id: null, score: 1200, max_score: 0, accuracy: 4 },
    'sari',
    99_999,
  );
  assert.deepEqual(payload, {
    nickname: 'sari',
    pack_id: 'campuran',
    score: 999,
    max_score: 1,
    accuracy: 1,
    duration_s: 7200,
    client_version: '2.1.3',
  });
});

test('tanda tangan Web Crypto sama dengan HMAC Node', async () => {
  const payload = scorePayload(
    { pack_id: 'office', score: 87, max_score: 100, accuracy: 0.8 },
    'detektif',
    240,
  );
  assert.equal(await signScore(payload, SECRET), expectedSignature(payload));
});

test('kirim skor menyertakan sig dan Idempotency-Key', async () => {
  const payload = scorePayload(
    { pack_id: 'office', score: 87, max_score: 100, accuracy: 0.8 },
    'detektif',
    240,
  );
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: 1, player_id: 'p-1', rank: 2, total: 7 }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const result = await submitOnlineScore({
    config: CONFIG,
    payload,
    key: '00000000-0000-4000-8000-000000000000',
    fetchImpl,
  });
  assert.deepEqual(result, { id: 1, player_id: 'p-1', rank: 2, total: 7 });
  assert.equal(request.url, 'https://api.example/v1/v1/scores');
  const body = JSON.parse(request.options.body);
  assert.equal(body.sig, expectedSignature(payload));
  assert.equal(request.options.headers['Idempotency-Key'], '00000000-0000-4000-8000-000000000000');
});

test('papan peringkat menyusun query dan cursor', async () => {
  let url = '';
  const fetchImpl = async (target) => {
    url = target;
    return new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 });
  };
  await fetchOnlineLeaderboard(
    CONFIG,
    { packId: 'ewallet-bank', period: 'week', limit: 5, cursor: 'abc' },
    fetchImpl,
  );
  assert.equal(
    url,
    'https://api.example/v1/v1/leaderboard?pack_id=ewallet-bank&period=week&limit=5&cursor=abc',
  );
});

test('error server menjadi OnlineError dengan kode dan field', async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({ error: { code: 'SIGNATURE_INVALID', message: 'sig salah', field: 'sig' } }),
      { status: 422 },
    );
  await assert.rejects(
    submitOnlineScore({
      config: CONFIG,
      payload: scorePayload({ pack_id: 'office', score: 10, max_score: 10, accuracy: 1 }, 'a', 1),
      key: '00000000-0000-4000-8000-000000000000',
      fetchImpl,
    }),
    (error) =>
      error instanceof OnlineError &&
      error.code === 'SIGNATURE_INVALID' &&
      error.field === 'sig',
  );
});

test('hapus pemain menerima 204 dan menolak kegagalan', async () => {
  const ok = await deleteOnlinePlayer(CONFIG, 'player-1', async () => new Response(null, { status: 204 }));
  assert.equal(ok, true);
  await assert.rejects(
    deleteOnlinePlayer(
      CONFIG,
      'player-1',
      async () =>
        new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'hilang' } }), {
          status: 404,
        }),
    ),
    (error) => error instanceof OnlineError && error.code === 'NOT_FOUND',
  );
});
