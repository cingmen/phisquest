/**
 * Klien papan skor online opsional (v2.0).
 * Tidak dipanggil sampai pemain mengisi nickname dan menyalakan pengiriman.
 */

export const ONLINE_PLAYER_KEY = 'pq_online_player_v1';
export const CLIENT_VERSION = '2.2.2';

/**
 * Baca konfigurasi dari meta tag; kosong berarti fitur online tidak ditawarkan.
 * @param {Document} [doc] - dokumen pemilik meta tag.
 * @returns {{base: string, secret: string}} konfigurasi API.
 */
export function onlineConfig(doc = typeof document === 'undefined' ? null : document) {
  const globalBase = String(globalThis.PHISHQUEST_API_BASE || '');
  const globalSecret = String(globalThis.PHISHQUEST_HMAC || '');
  if (!doc) return { base: globalBase.replace(/\/+$/, ''), secret: globalSecret };
  const base = String(
    globalBase || doc.querySelector('meta[name="phishquest-api"]')?.content || '',
  )
    .trim()
    .replace(/\/+$/, '');
  const secret = String(
    globalSecret || doc.querySelector('meta[name="phishquest-hmac"]')?.content || '',
  ).trim();
  return { base, secret };
}

/**
 * String kanonis yang ditandatangani; harus identik dengan server.
 * @param {object} payload - payload skor tanpa sig.
 * @returns {string} nickname|pack_id|score|accuracy|duration_s.
 */
export function canonicalScorePayload(payload) {
  return [
    String(payload.nickname),
    String(payload.pack_id),
    String(Math.trunc(Number(payload.score) || 0)),
    Number(payload.accuracy || 0).toFixed(4),
    String(Math.trunc(Number(payload.duration_s) || 0)),
  ].join('|');
}

/**
 * Ubah buffer ke hex huruf kecil.
 * @param {ArrayBuffer} buffer - hasil digest.
 * @returns {string} hex 64 karakter.
 */
function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hitung HMAC-SHA256 payload skor memakai Web Crypto.
 * @param {object} payload - payload skor tanpa sig.
 * @param {string} secret - rahasia bersama klien-server.
 * @param {Crypto} [cryptoImpl] - implementasi crypto (untuk pengujian).
 * @returns {Promise<string>} tanda tangan hex.
 */
export async function signScore(payload, secret, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl || !cryptoImpl.subtle) {
    throw new Error('Web Crypto tidak tersedia; skor online tidak dikirim.');
  }
  const encoder = new TextEncoder();
  const key = await cryptoImpl.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await cryptoImpl.subtle.sign(
    'HMAC',
    key,
    encoder.encode(canonicalScorePayload(payload)),
  );
  return toHex(signature);
}

/**
 * Error API online dengan kode dan field opsional.
 */
export class OnlineError extends Error {
  /**
   * @param {string} code - kode dari server.
   * @param {string} message - pesan ramah.
   * @param {string|null} field - field yang bermasalah.
   */
  constructor(code, message, field = null) {
    super(message || code);
    this.name = 'OnlineError';
    this.code = code;
    this.field = field;
  }
}

/**
 * Kirim permintaan JSON dan ubah respons error server menjadi OnlineError.
 * @param {string} url - URL lengkap.
 * @param {object} options - opsi fetch.
 * @param {Function} [fetchImpl] - implementasi fetch.
 * @returns {Promise<object>} body JSON.
 */
async function requestJson(url, options, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(url, options);
  let body = {};
  try {
    body = await response.json();
  } catch (error) {
    body = {};
  }
  if (!response.ok) {
    const failure = body && body.error ? body.error : {};
    throw new OnlineError(
      failure.code || 'ONLINE_ERROR',
      failure.message || `Permintaan online gagal (HTTP ${response.status}).`,
      failure.field || null,
    );
  }
  return body;
}

/**
 * Susun payload skor dari ringkasan sesi.
 * @param {object} summary - SessionSummary.
 * @param {string} nickname - nickname pemain.
 * @param {number} durationS - durasi sesi dalam detik.
 * @returns {object} payload tanpa sig.
 */
export function scorePayload(summary, nickname, durationS) {
  return {
    nickname,
    pack_id: summary.pack_id || 'campuran',
    score: Math.max(0, Math.min(999, Math.trunc(Number(summary.score) || 0))),
    max_score: Math.max(1, Math.min(999, Math.trunc(Number(summary.max_score) || 1))),
    accuracy: Math.max(0, Math.min(1, Number(summary.accuracy) || 0)),
    duration_s: Math.max(1, Math.min(7200, Math.trunc(durationS) || 1)),
    client_version: CLIENT_VERSION,
  };
}

/**
 * Kirim satu skor ke server online.
 * @param {object} options - { config, payload, key, cryptoImpl, fetchImpl }.
 * @returns {Promise<object>} respons { id, player_id, rank, total }.
 */
export async function submitOnlineScore({
  config,
  payload,
  key,
  cryptoImpl = globalThis.crypto,
  fetchImpl = globalThis.fetch,
}) {
  if (!config || !config.base) throw new OnlineError('ONLINE_DISABLED', 'Papan skor online tidak aktif.');
  const sig = await signScore(payload, config.secret, cryptoImpl);
  return requestJson(
    `${config.base}/v1/scores`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ ...payload, sig }),
    },
    fetchImpl,
  );
}

/**
 * Ambil satu halaman papan peringkat online.
 * @param {{base: string}} config - konfigurasi API.
 * @param {object} params - { packId, period, limit, cursor }.
 * @param {Function} [fetchImpl] - implementasi fetch.
 * @returns {Promise<object>} { items, next_cursor }.
 */
export async function fetchOnlineLeaderboard(
  config,
  { packId, period = 'all', limit = 20, cursor = '' },
  fetchImpl = globalThis.fetch,
) {
  if (!config || !config.base) throw new OnlineError('ONLINE_DISABLED', 'Papan skor online tidak aktif.');
  const query = new URLSearchParams({ pack_id: packId, period, limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  return requestJson(`${config.base}/v1/leaderboard?${query}`, {}, fetchImpl);
}

/**
 * Ambil statistik global anonim.
 * @param {{base: string}} config - konfigurasi API.
 * @param {Function} [fetchImpl] - implementasi fetch.
 * @returns {Promise<object>} { total_players, total_sessions, avg_accuracy }.
 */
export async function fetchOnlineStats(config, fetchImpl = globalThis.fetch) {
  if (!config || !config.base) throw new OnlineError('ONLINE_DISABLED', 'Papan skor online tidak aktif.');
  return requestJson(`${config.base}/v1/stats/global`, {}, fetchImpl);
}

/**
 * Hapus seluruh data online milik satu pemain.
 * @param {{base: string}} config - konfigurasi API.
 * @param {string} playerId - UUID dari respons POST.
 * @param {Function} [fetchImpl] - implementasi fetch.
 * @returns {Promise<boolean>} true bila server menerima penghapusan.
 */
export async function deleteOnlinePlayer(config, playerId, fetchImpl = globalThis.fetch) {
  if (!config || !config.base) throw new OnlineError('ONLINE_DISABLED', 'Papan skor online tidak aktif.');
  const response = await fetchImpl(`${config.base}/v1/players/${encodeURIComponent(playerId)}`, {
    method: 'DELETE',
  });
  if (response.status === 204) return true;
  let body = {};
  try {
    body = await response.json();
  } catch (error) {
    body = {};
  }
  const failure = body && body.error ? body.error : {};
  throw new OnlineError(
    failure.code || 'ONLINE_ERROR',
    failure.message || `Penghapusan gagal (HTTP ${response.status}).`,
    failure.field || null,
  );
}
