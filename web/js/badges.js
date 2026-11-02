/**
 * Evaluasi lencana PhishQuest—logika identik dengan `cli/src/phishquest/badges.py`.
 * Modul ini tidak mengimpor engine; urutan level disalin sebagai metadata tetap.
 */

/** Metadata 10 lencana (PRD §7.4). */
export const BADGES = [
  { badge_id: 'first_catch', name: 'Tangkapan Pertama', emoji: '🎣', requirement: 'Menjawab benar pertama kali' },
  { badge_id: 'streak_5', name: 'Mata Elang', emoji: '🔥', requirement: '5 jawaban benar beruntun' },
  { badge_id: 'streak_10', name: 'Mantap Jiwa', emoji: '💪', requirement: '10 jawaban benar beruntun' },
  { badge_id: 'perfect_pack', name: 'Tanpa Terhook', emoji: '💯', requirement: 'Menyelesaikan satu pack dengan akurasi 100%' },
  { badge_id: 'all_packs', name: 'Penjelajah Nusantara', emoji: '🗺️', requirement: 'Menyelesaikan ≥ 1 sesi di keempat pack' },
  { badge_id: 'domain_guard', name: 'Detektif Domain', emoji: '🕵️', requirement: 'Benar pada 10 soal ber-red-flag domain' },
  { badge_id: 'otp_guard', name: 'Penjaga OTP', emoji: '🔐', requirement: 'Benar pada 5 soal yang meminta data sensitif' },
  { badge_id: 'urgency_guard', name: 'Tidak Tergesa-Gesa', emoji: '⏰', requirement: 'Benar pada 5 soal bertekanan waktu' },
  { badge_id: 'comeback', name: 'Bangkit Lagi', emoji: '🌱', requirement: 'Setelah 3 salah beruntun, benar sampai sesi habis' },
  { badge_id: 'level_detective', name: 'Naik Kelas', emoji: '🎓', requirement: 'Mencapai level Detektif' },
];

/** Id 10 lencana dalam urutan tampilan. */
export const BADGE_IDS = BADGES.map((badge) => badge.badge_id);

/** Urutan level, dipakai untuk syarat `level_detective`. */
const LEVEL_ORDER = ['amatir', 'analis_muda', 'analis', 'detektif', 'phishhunter'];

const DOMAIN_FLAGS = ['DOMAIN_PALSU', 'DOMAIN_MIRIP'];
const ALL_PACKS = ['ewallet-bank', 'office', 'shopping-courier', 'campus-gov'];

/**
 * Jumlah jawaban benar pada soal yang mengandung red flag tertentu.
 * @param {object} progress - objek Progress.
 * @param {string[]} codes - kode red flag yang dijumlahkan.
 * @returns {number} total counter.
 */
function redFlagCount(progress, codes) {
  const counters = (progress.counters && progress.counters.correct_redflag) || {};
  return codes.reduce((total, code) => total + Number(counters[code] || 0), 0);
}

/**
 * Posisi level dalam tangga level.
 * @param {string} levelId - id level.
 * @returns {number} indeks (0 = amatir).
 */
function levelIndex(levelId) {
  const index = LEVEL_ORDER.indexOf(levelId);
  return index === -1 ? 0 : index;
}

/**
 * Saring kandidat menjadi lencana baru yang belum diperoleh.
 * @param {object} progress - objek Progress.
 * @param {string[]} candidates - badge_id yang syaratnya terpenuhi.
 * @returns {string[]} badge_id baru.
 */
function newBadges(progress, candidates) {
  const earned = progress.badges || {};
  const result = [];
  for (const badgeId of candidates) {
    if (result.includes(badgeId) || Object.hasOwn(earned, badgeId)) continue;
    result.push(badgeId);
  }
  return result;
}

/**
 * Evaluasi lencana berbasis counter setelah satu jawaban.
 * @param {object} progress - Progress yang sudah diperbarui dengan jawaban ini.
 * @param {object} result - AnswerResult.
 * @returns {string[]} badge_id baru.
 */
export function evaluateAfterAnswer(progress, result) {
  const candidates = [];
  const counters = progress.counters || {};
  if (result.correct && Number(counters.correct || 0) >= 1) candidates.push('first_catch');
  if (result.streak_after >= 5) candidates.push('streak_5');
  if (result.streak_after >= 10) candidates.push('streak_10');
  if (redFlagCount(progress, DOMAIN_FLAGS) >= 10) candidates.push('domain_guard');
  if (redFlagCount(progress, ['MEMINTA_DATA_SENSITIF']) >= 5) candidates.push('otp_guard');
  if (redFlagCount(progress, ['TEKANAN_WAKTU']) >= 5) candidates.push('urgency_guard');
  if (levelIndex(progress.level) >= levelIndex('detektif')) candidates.push('level_detective');
  return newBadges(progress, candidates);
}

/**
 * Evaluasi lencana berbasis sesi pada layar recap.
 * @param {object} progress - Progress setelah sesi selesai.
 * @param {object} summary - SessionSummary.
 * @returns {string[]} badge_id baru.
 */
export function evaluateAfterSession(progress, summary) {
  const candidates = [];
  if (summary.pack_id !== null && summary.accuracy >= 1) candidates.push('perfect_pack');
  const packs = progress.packs || {};
  if (ALL_PACKS.every((packId) => Number((packs[packId] || {}).sessions || 0) >= 1)) {
    candidates.push('all_packs');
  }
  if (summary.recovered) candidates.push('comeback');
  if (levelIndex(progress.level) >= levelIndex('detektif')) candidates.push('level_detective');
  return newBadges(progress, candidates);
}
