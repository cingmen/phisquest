/**
 * Papan skor lokal per perangkat (v1.1) — fungsi murni tanpa I/O.
 * Aturan urutan harus identik dengan `cli/src/phishquest/leaderboard.py`.
 */

import { LEADERBOARD_LIMIT } from './engine.js';

/**
 * Bangun satu entri papan skor.
 * @param {object} options - { score, maxScore, accuracy, packId, mode, at }.
 * @returns {object} entri siap disimpan.
 */
export function makeEntry({ score, maxScore, accuracy, packId, mode, at }) {
  return {
    score: Number(score) || 0,
    max_score: Number(maxScore) || 0,
    accuracy: Math.round((Number(accuracy) || 0) * 10000) / 10000,
    pack_id: packId ?? null,
    mode,
    at,
  };
}

/**
 * Kunci urutan: skor tertinggi, lalu akurasi, lalu sesi paling awal.
 * @param {object} entry - entri papan skor.
 * @returns {number[]} kunci pembanding.
 */
function sortKey(entry) {
  return [-(Number(entry.score) || 0), -(Number(entry.accuracy) || 0), String(entry.at || '')];
}

/**
 * Bandingkan dua kunci urutan.
 * @param {number[]|string[]} left - kunci kiri.
 * @param {number[]|string[]} right - kunci kanan.
 * @returns {number} negatif bila kiri lebih dulu.
 */
function compareKeys(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

/**
 * Saring entri valid, urutkan, dan potong ke 10 teratas.
 * @param {object[]} entries - entri mentah.
 * @returns {object[]} entri terurut.
 */
export function normalizeEntries(entries) {
  const cleaned = (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry && typeof entry === 'object',
  );
  return [...cleaned]
    .sort((left, right) => compareKeys(sortKey(left), sortKey(right)))
    .slice(0, LEADERBOARD_LIMIT)
    .map((entry) => ({ ...entry }));
}

/**
 * Sisipkan entri baru dan hitung peringkatnya.
 * @param {object[]} entries - entri yang sudah ada.
 * @param {object} entry - entri baru.
 * @returns {{entries: object[], rank: number|null}} hasil penyisipan.
 */
export function insertEntry(entries, entry) {
  const existing = (Array.isArray(entries) ? entries : []).filter(
    (item) => item && typeof item === 'object',
  );
  const ordered = normalizeEntries([...existing, entry]);
  const target = JSON.stringify(sortKey(entry));
  let rank = null;
  ordered.forEach((item, index) => {
    if (rank === null && JSON.stringify(sortKey(item)) === target) rank = index + 1;
  });
  return { entries: ordered, rank };
}