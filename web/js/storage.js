/**
 * Penyimpanan progres web di localStorage (database-schema §2).
 * Semua akses dibungkus try/catch; game tetap bisa dimainkan tanpa penyimpanan.
 */

import { HISTORY_LIMIT, PQError, nowIso } from './engine.js';
import { insertEntry, normalizeEntries } from './leaderboard.js';

export const PROGRESS_KEY = 'pq_progress_v1';
export const SETTINGS_KEY = 'pq_settings_v1';
export const LEADERBOARD_KEY = 'pq_leaderboard_v1';
export const CUSTOM_PACKS_KEY = 'pq_custom_packs_v1';
const DEBOUNCE_MS = 300;

const memoryFallback = new Map();
let pendingTimer = null;
let pendingProgress = null;

/**
 * Baca pack buatan pemain dari editor.
 * @returns {Array<object>} daftar pack lokal (kosong bila belum ada atau rusak).
 */
export function loadCustomPacks() {
  const raw = readRaw(CUSTOM_PACKS_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (pack) => pack && typeof pack.pack_id === 'string' && Array.isArray(pack.scenarios),
    );
  } catch (error) {
    return [];
  }
}

/**
 * Simpan seluruh pack lokal.
 * @param {Array<object>} packs - pack yang disimpan.
 * @returns {Array<object>} pack yang tersimpan.
 */
export function saveCustomPacks(packs) {
  writeRaw(CUSTOM_PACKS_KEY, JSON.stringify(packs));
  return packs;
}

/**
 * Tambah atau ganti pack lokal dengan pack_id yang sama.
 * @param {object} pack - pack hasil editor.
 * @returns {Array<object>} daftar pack terbaru.
 */
export function addCustomPack(pack) {
  const packs = loadCustomPacks().filter((item) => item.pack_id !== pack.pack_id);
  packs.push(pack);
  saveCustomPacks(packs);
  return packs;
}

/**
 * Hapus semua pack lokal.
 * @returns {Array<object>} daftar kosong.
 */
export function clearCustomPacks() {
  saveCustomPacks([]);
  return [];
}

/**
 * Baca nilai mentah dari localStorage dengan fallback memori.
 * @param {string} key - nama key.
 * @returns {string|null} nilai mentah.
 */
function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return memoryFallback.has(key) ? memoryFallback.get(key) : null;
  }
}

/**
 * Tulis nilai mentah; melempar PQError('STORAGE_FULL') bila kuota habis.
 * @param {string} key - nama key.
 * @param {string} value - nilai JSON.
 * @returns {void}
 */
function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    memoryFallback.set(key, value);
    throw new PQError(
      'STORAGE_FULL',
      'Penyimpanan penuh atau diblokir. Progres tetap jalan selama tab ini terbuka.',
    );
  }
}

/**
 * Lengkapi objek Progress dengan field default (toleran-ke-depan, MINOR).
 * @param {object} data - data mentah.
 * @returns {object} Progress lengkap.
 */
function completeProgress(data) {
  const counters = {
    answered: 0,
    correct: 0,
    wrong: 0,
    sessions_completed: 0,
    correct_redflag: {},
    ...(data.counters || {}),
  };
  if (!counters.correct_redflag || typeof counters.correct_redflag !== 'object') {
    counters.correct_redflag = {};
  }
  const history = Array.isArray(data.history) ? data.history.slice(-HISTORY_LIMIT) : [];
  const totalXp = Number(data.total_xp || 0);
  const levels = [
    [0, 'amatir'],
    [100, 'analis_muda'],
    [250, 'analis'],
    [450, 'detektif'],
    [650, 'phishhunter'],
  ];
  let level = 'amatir';
  for (const [threshold, id] of levels) if (totalXp >= threshold) level = id;
  return {
    schema_version: '1.0',
    created_at: data.created_at || nowIso(),
    updated_at: data.updated_at || nowIso(),
    total_xp: totalXp,
    level,
    current_streak: Number(data.current_streak || 0),
    best_streak: Number(data.best_streak || 0),
    counters,
    packs: data.packs && typeof data.packs === 'object' ? data.packs : {},
    badges: data.badges && typeof data.badges === 'object' ? data.badges : {},
    history,
  };
}

/**
 * Muat progres pemain.
 * @returns {object|null} Progress atau null bila belum ada.
 * @throws {PQError} STORAGE_CORRUPT bila JSON tidak dapat dibaca.
 */
export function loadProgress() {
  const raw = readRaw(PROGRESS_KEY);
  if (!raw) return null;
  try {
    return completeProgress(JSON.parse(raw));
  } catch (error) {
    throw new PQError('STORAGE_CORRUPT', 'Data progres tidak dapat dibaca.');
  }
}

/**
 * Simpan progres ke localStorage.
 * @param {object} progress - Progress aktif.
 * @param {boolean} [immediate] - true untuk menulis langsung (recap).
 * @returns {void}
 */
export function saveProgress(progress, immediate = false) {
  pendingProgress = progress;
  if (immediate) {
    flushProgress();
    return;
  }
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    flushProgress();
  }, DEBOUNCE_MS);
}

/**
 * Tulis progres yang tertunda sekarang juga.
 * @returns {void}
 */
export function flushProgress() {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (!pendingProgress) return;
  const progress = pendingProgress;
  pendingProgress = null;
  progress.updated_at = nowIso();
  try {
    writeRaw(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('pq:storage-error', { detail: error }));
  }
}

/**
 * Baca, ubah, lalu simpan progres.
 * @param {(progress: object) => void} mutate - fungsi pengubah progres.
 * @param {boolean} [immediate] - true untuk menulis langsung.
 * @returns {object} Progress setelah diubah.
 */
export function updateProgress(mutate, immediate = false) {
  const progress = loadProgress() || completeProgress({});
  mutate(progress);
  saveProgress(progress, immediate);
  return progress;
}

/**
 * Muat pengaturan pemain.
 * @returns {object} Settings dengan default aman.
 */
export function loadSettings() {
  const raw = readRaw(SETTINGS_KEY);
  const defaults = {
    schema_version: '1.0',
    locale: 'id',
    sound: true,
    reduced_motion: false,
    nickname: '',
  };
  if (!raw) return defaults;
  try {
    return { ...defaults, ...JSON.parse(raw) };
  } catch (error) {
    return defaults;
  }
}

/**
 * Simpan pengaturan pemain.
 * @param {object} settings - objek Settings.
 * @returns {void}
 */
export function saveSettings(settings) {
  try {
    writeRaw(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('pq:storage-error', { detail: error }));
  }
}

/**
 * Kumpulkan progres dan pengaturan untuk tombol ekspor.
 * @returns {object} paket ekspor.
 */
export function exportAll() {
  return {
    schema_version: '1.0',
    exported_at: nowIso(),
    progress: loadProgress() || completeProgress({}),
    settings: loadSettings(),
  };
}

/**
 * Muat papan skor lokal (10 teratas).
 * @returns {object[]} entri terurut; array kosong bila belum ada.
 */
export function loadLeaderboard() {
  const raw = readRaw(LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    const entries = Array.isArray(data) ? data : data && data.entries;
    return normalizeEntries(entries);
  } catch (error) {
    return [];
  }
}

/**
 * Simpan papan skor lokal.
 * @param {object[]} entries - entri terurut.
 * @returns {void}
 */
export function saveLeaderboard(entries) {
  try {
    writeRaw(LEADERBOARD_KEY, JSON.stringify({ schema_version: '1.0', entries }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent('pq:storage-error', { detail: error }));
  }
}

/**
 * Catat satu sesi ke papan skor dan kembalikan peringkatnya.
 * @param {object} entry - entri hasil makeEntry.
 * @returns {{entries: object[], rank: number|null}} papan skor terbaru + peringkat.
 */
export function recordLeaderboardEntry(entry) {
  const { entries, rank } = insertEntry(loadLeaderboard(), entry);
  saveLeaderboard(entries);
  return { entries, rank };
}

/**
 * Impor progres dari berkas ekspor.
 * @param {string|object} json - JSON mentah atau objek hasil ekspor.
 * @returns {void}
 * @throws {PQError} CONTENT_INVALID bila struktur tidak cocok.
 */
export function importAll(json) {
  let data = json;
  if (typeof json === 'string') {
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new PQError('CONTENT_INVALID', 'Berkas impor bukan JSON yang valid.');
    }
  }
  if (!data || typeof data !== 'object' || typeof data.progress !== 'object') {
    throw new PQError('CONTENT_INVALID', 'Berkas impor tidak memuat objek progress.');
  }
  const major = String(data.schema_version || data.progress.schema_version || '1.0').split('.')[0];
  if (major !== '1') {
    throw new PQError('CONTENT_INVALID', `Versi berkas impor ${major} tidak didukung.`);
  }
  saveProgress(completeProgress(data.progress), true);
  if (data.settings) saveSettings(data.settings);
}

/**
 * Hapus progres dan pengaturan (konfirmasi dilakukan lapis UI).
 * @returns {void}
 */
export function resetAll() {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  pendingProgress = null;
  for (const key of [PROGRESS_KEY, SETTINGS_KEY, LEADERBOARD_KEY, CUSTOM_PACKS_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // localStorage tidak tersedia: cukup bersihkan fallback memori
    }
    memoryFallback.delete(key);
  }
}
