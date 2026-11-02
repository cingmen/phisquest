/**
 * Mesin permainan PhishQuest—port JavaScript dari `cli/src/phishquest/engine.py`.
 * Semua aturan XP, streak, level, dan penilaian hanya hidup di modul ini.
 */

import { PQError } from './content.js';
import { evaluateAfterAnswer, evaluateAfterSession } from './badges.js';

export { PQError, loadAllPacks, loadManifest, loadPack, resolveContentBase } from './content.js';

export const SCHEMA_VERSION = '1.0';
export const XP_BASE = 10;
export const STREAK_STEP = 2;
export const STREAK_CAP = 10;
export const HISTORY_LIMIT = 50;
export const MIXED_PACK_ID = 'campuran';

export const LEVELS = [
  [0, 'amatir'],
  [100, 'analis_muda'],
  [250, 'analis'],
  [450, 'detektif'],
  [650, 'phishhunter'],
];

export const LEVEL_NAMES = {
  amatir: 'Amatir',
  analis_muda: 'Analis Muda',
  analis: 'Analis',
  detektif: 'Detektif',
  phishhunter: 'PhishHunter',
};

export const LEVEL_EMOJI = {
  amatir: '🐣',
  analis_muda: '🔎',
  analis: '🕵️',
  detektif: '🧠',
  phishhunter: '👑',
};

export const PACK_IDS = ['ewallet-bank', 'office', 'shopping-courier', 'campus-gov'];

export const RED_FLAG_LABELS = {
  PENGIRIM_TIDAK_WAJAR: 'Pengirim tidak wajar',
  DOMAIN_PALSU: 'Domain palsu',
  DOMAIN_MIRIP: 'Domain mirip (typosquatting)',
  TEKANAN_WAKTU: 'Tekanan waktu',
  ANCAMAN: 'Ancaman',
  IMBALAN_BERLEBIHAN: 'Imbalan berlebihan',
  MEMINTA_DATA_SENSITIF: 'Meminta data sensitif',
  LINK_MENCURIGAKAN: 'Tautan mencurigakan',
  LAMPIRAN_BERBAHAYA: 'Lampiran berbahaya',
  GRAMATIKA_AJANG: 'Ejaan/tata bahasa janggal',
  SAPAAN_GENERIK: 'Sapaan generik',
  SALURAN_TIDAK_WAJAR: 'Saluran tidak wajar',
};

/**
 * Waktu sekarang dalam ISO-8601 zona +07:00 tanpa mikrodetik.
 * @param {Date} [date] - waktu acuan.
 * @returns {string} timestamp ISO dengan offset +07:00.
 */
export function nowIso(date = new Date()) {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${shifted.toISOString().replace(/\.\d{3}Z$/, '')}+07:00`;
}

/**
 * Level untuk total XP tertentu.
 * @param {number} totalXp - XP kumulatif.
 * @returns {string} id level.
 */
export function levelFor(totalXp) {
  let result = LEVELS[0][1];
  for (const [threshold, levelId] of LEVELS) {
    if (totalXp >= threshold) result = levelId;
  }
  return result;
}

/**
 * Indeks level dalam tangga level.
 * @param {string} levelId - id level.
 * @returns {number} indeks (0 = amatir).
 */
export function levelIndex(levelId) {
  return LEVELS.findIndex(([, id]) => id === levelId);
}

/**
 * Level saat ini beserta rentang XP-nya.
 * @param {number} totalXp - XP kumulatif.
 * @returns {{level: string, current: number, needed: number}} rentang XP.
 */
export function levelProgress(totalXp) {
  const level = levelFor(totalXp);
  const index = levelIndex(level);
  const floor = LEVELS[index][0];
  if (index + 1 >= LEVELS.length) return { level, current: totalXp - floor, needed: 0 };
  const ceiling = LEVELS[index + 1][0];
  return { level, current: totalXp - floor, needed: ceiling - floor };
}

/**
 * Bonus streak untuk jawaban benar.
 * @param {number} streakAfter - streak setelah jawaban benar.
 * @returns {number} bonus XP 0–10.
 */
export function streakBonus(streakAfter) {
  return Math.min(Math.max(streakAfter - 1, 0) * STREAK_STEP, STREAK_CAP);
}

/**
 * Progress kosong sesuai kontrak database-schema §2.2.
 * @returns {object} objek Progress baru.
 */
export function createProgress() {
  return {
    schema_version: SCHEMA_VERSION,
    created_at: nowIso(),
    updated_at: nowIso(),
    total_xp: 0,
    level: 'amatir',
    current_streak: 0,
    best_streak: 0,
    counters: {
      answered: 0,
      correct: 0,
      wrong: 0,
      sessions_completed: 0,
      correct_redflag: {},
    },
    packs: {},
    badges: {},
    history: [],
  };
}

/**
 * Lengkapi objek Progress yang mungkin berasal dari versi skema lebih lama.
 * @param {object|null} data - data mentah dari localStorage.
 * @returns {object} Progress yang lengkap.
 */
export function normalizeProgress(data) {
  const base = createProgress();
  if (!data || typeof data !== 'object') return base;
  const counters = { ...base.counters, ...(data.counters || {}) };
  if (!counters.correct_redflag || typeof counters.correct_redflag !== 'object') {
    counters.correct_redflag = {};
  }
  const history = Array.isArray(data.history) ? data.history.slice(-HISTORY_LIMIT) : [];
  return {
    ...base,
    ...data,
    counters,
    packs: data.packs && typeof data.packs === 'object' ? data.packs : {},
    badges: data.badges && typeof data.badges === 'object' ? data.badges : {},
    history,
    level: levelFor(Number(data.total_xp || 0)),
  };
}

/**
 * Label jawaban benar untuk sebuah skenario.
 * @param {object} scenario - skenario aktif.
 * @returns {string} PHISH/LEGIT atau id opsi.
 */
export function correctAnswerOf(scenario) {
  if (scenario.type === 'phish_or_legit') return scenario.is_phish ? 'PHISH' : 'LEGIT';
  return String(scenario.correct_option);
}

/**
 * Nilai satu jawaban terhadap skenario.
 * @param {object} scenario - skenario aktif.
 * @param {string} optionId - PHISH/LEGIT atau id opsi.
 * @returns {boolean} true bila benar.
 */
export function evaluateAnswer(scenario, optionId) {
  const value = String(optionId).trim().toUpperCase();
  if (scenario.type === 'phish_or_legit') {
    if (value !== 'PHISH' && value !== 'LEGIT') {
      throw new PQError('INVALID_OPTION', 'Jawaban untuk soal ini harus PHISH atau LEGIT.');
    }
    return (value === 'PHISH') === Boolean(scenario.is_phish);
  }
  const valid = (scenario.options || []).map((option) => String(option.id));
  if (!valid.includes(value)) {
    throw new PQError('INVALID_OPTION', `Jawaban '${optionId}' bukan opsi yang tersedia.`);
  }
  return value === String(scenario.correct_option);
}

/**
 * Generator angka acak LCG 31-bit agar urutan soal identik dengan Python.
 * @param {number} seed - seed awal.
 * @returns {() => number} fungsi pengembali angka 0..1.
 */
function createRng(seed) {
  let state = Math.trunc(seed) & 0x7fffffff;
  if (state === 0) state = 1;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Fisher–Yates dengan sumber acak yang bisa diseed.
 * @param {object[]} items - array yang diacak di tempat.
 * @param {() => number} random - sumber angka acak.
 * @returns {void}
 */
function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.min(index, Math.floor(random() * (index + 1)));
    [items[index], items[target]] = [items[target], items[index]];
  }
}

/**
 * State satu sesi permainan.
 */
export class Session {
  /**
   * @param {object} options - { scenarios, progress, packId, seed }.
   */
  constructor({ scenarios, progress, packId = null, seed = null }) {
    this.scenarios = scenarios;
    this.progress = progress;
    this.packId = packId;
    this.seed = seed;
    this.index = 0;
    this.score = 0;
    this.maxScore = 0;
    this.answeredCount = 0;
    this.correctCount = 0;
    this.streak = progress.current_streak;
    this.bestStreak = progress.current_streak;
    this.mistakes = [];
    this.badgesEarned = [];
    this.levelBefore = levelFor(progress.total_xp);
    this.wrongRun = 0;
    this.comebackCandidate = false;
    this.comebackRecovered = false;
    this.answeredIds = [];
    this.summaryCache = null;
  }

  /**
   * Skenario aktif.
   * @returns {object|null} skenario atau null bila sesi habis.
   */
  current() {
    return this.index < this.scenarios.length ? this.scenarios[this.index] : null;
  }

  /**
   * Apakah masih ada soal yang belum dijawab.
   * @returns {boolean} true bila ada.
   */
  hasNext() {
    return this.index < this.scenarios.length;
  }

  /**
   * Nilai jawaban pemain untuk soal aktif.
   * @param {string} optionId - PHISH/LEGIT atau id opsi.
   * @returns {object} AnswerResult.
   */
  answer(optionId) {
    if (this.summaryCache) throw new PQError('SESSION_FINISHED', 'Sesi ini sudah selesai.');
    const scenario = this.current();
    if (!scenario) {
      throw new PQError('NO_MORE_QUESTIONS', 'Tidak ada soal aktif; sesi sudah habis.');
    }
    if (this.answeredIds.includes(scenario.id)) {
      throw new PQError('ALREADY_ANSWERED', 'Soal ini sudah dijawab.');
    }

    const correct = evaluateAnswer(scenario, optionId);
    const streakAfter = correct ? this.streak + 1 : 0;
    const xpBase = correct ? XP_BASE : 0;
    const xpBonus = correct ? streakBonus(streakAfter) : 0;
    const xpGained = xpBase + xpBonus;

    const progress = this.progress;
    const levelBeforeAnswer = levelFor(progress.total_xp);
    progress.counters.answered = Number(progress.counters.answered || 0) + 1;
    if (correct) {
      progress.counters.correct = Number(progress.counters.correct || 0) + 1;
      if (!progress.counters.correct_redflag) progress.counters.correct_redflag = {};
      for (const code of scenario.red_flags || []) {
        const counters = progress.counters.correct_redflag;
        counters[code] = Number(counters[code] || 0) + 1;
      }
    } else {
      progress.counters.wrong = Number(progress.counters.wrong || 0) + 1;
    }
    progress.total_xp = Number(progress.total_xp || 0) + xpGained;
    progress.current_streak = streakAfter;
    progress.best_streak = Math.max(Number(progress.best_streak || 0), streakAfter);
    progress.level = levelFor(progress.total_xp);
    progress.updated_at = nowIso();
    const levelUp = progress.level !== levelBeforeAnswer ? progress.level : null;

    const result = {
      correct,
      xp_base: xpBase,
      xp_bonus: xpBonus,
      xp_gained: xpGained,
      streak_after: streakAfter,
      is_phish: Boolean(scenario.is_phish),
      red_flags: [...(scenario.red_flags || [])],
      explanation: scenario.explanation,
      teach: { ...scenario.teach },
      badges_earned: [],
      level_up: levelUp,
    };

    const earned = evaluateAfterAnswer(progress, result);
    for (const badgeId of earned) progress.badges[badgeId] = nowIso();
    result.badges_earned = earned;
    this.badgesEarned.push(...earned);

    this.index += 1;
    this.answeredCount += 1;
    this.score += xpGained;
    this.maxScore += XP_BASE;
    this.streak = streakAfter;
    this.bestStreak = Math.max(this.bestStreak, streakAfter);
    this.answeredIds.push(scenario.id);
    if (correct) {
      this.correctCount += 1;
    } else {
      this.mistakes.push({
        scenario_id: scenario.id,
        chosen: String(optionId).trim().toUpperCase(),
        correct_answer: correctAnswerOf(scenario),
      });
    }

    if (correct) {
      this.wrongRun = 0;
      if (this.comebackCandidate) this.comebackRecovered = true;
    } else {
      this.wrongRun += 1;
      this.comebackCandidate = this.wrongRun >= 3;
      this.comebackRecovered = false;
    }
    return result;
  }

  /**
   * Ringkasan sesi; idempoten.
   * @returns {object} SessionSummary.
   */
  summary() {
    if (this.summaryCache) return this.summaryCache;
    if (this.hasNext() || this.answeredCount === 0) {
      throw new PQError(
        'SESSION_NOT_FINISHED',
        'Sesi belum selesai; masih ada soal yang belum dijawab.',
      );
    }
    const progress = this.progress;
    const accuracy = this.answeredCount ? this.correctCount / this.answeredCount : 0;
    const summary = {
      pack_id: this.packId,
      score: this.score,
      max_score: this.maxScore,
      accuracy: Math.round(accuracy * 10000) / 10000,
      xp_gained: this.score,
      best_streak_in_session: this.bestStreak,
      badges_earned: [...this.badgesEarned],
      level_before: this.levelBefore,
      level_after: levelFor(progress.total_xp),
      mistakes: [...this.mistakes],
      recovered: Boolean(this.comebackCandidate && this.comebackRecovered),
    };

    progress.counters.sessions_completed =
      Number(progress.counters.sessions_completed || 0) + 1;
    if (this.packId !== null) {
      const stats = { ...(progress.packs[this.packId] || {}) };
      stats.sessions = Number(stats.sessions || 0) + 1;
      if (summary.score >= Number(stats.best_score || 0)) {
        stats.best_score = summary.score;
        stats.max_score = summary.max_score;
      }
      stats.best_accuracy = Math.max(Number(stats.best_accuracy || 0), summary.accuracy);
      stats.last_played = nowIso();
      progress.packs[this.packId] = stats;
    }
    progress.history.push({
      at: nowIso(),
      pack_id: this.packId === null ? MIXED_PACK_ID : this.packId,
      score: summary.score,
      max_score: summary.max_score,
      accuracy: summary.accuracy,
      xp_gained: summary.xp_gained,
    });
    progress.history = progress.history.slice(-HISTORY_LIMIT);

    for (const badgeId of evaluateAfterSession(progress, summary)) {
      progress.badges[badgeId] = nowIso();
      if (!summary.badges_earned.includes(badgeId)) summary.badges_earned.push(badgeId);
    }
    progress.level = levelFor(progress.total_xp);
    progress.updated_at = nowIso();
    this.summaryCache = summary;
    return summary;
  }
}

/**
 * Susun sesi baru dari satu pack atau gabungan beberapa pack.
 * @param {object[]} packs - array {pack_id, name, scenarios}.
 * @param {object} [options] - {count, difficulty, seed, progress}.
 * @returns {Session} sesi siap dimainkan.
 */
export function startSession(
  packs,
  { count = 10, difficulty = null, seed = null, progress = null } = {},
) {
  const pool = [];
  for (const pack of packs) {
    for (const scenario of pack.scenarios || []) {
      if (difficulty && scenario.difficulty !== difficulty) continue;
      pool.push(scenario);
    }
  }
  if (pool.length === 0) {
    throw new PQError('NO_SCENARIOS', 'Tidak ada skenario yang cocok dengan filter yang dipilih.');
  }
  if (seed === null || seed === undefined) {
    shuffle(pool, Math.random);
  } else {
    shuffle(pool, createRng(seed));
  }
  const selected = pool.slice(0, Math.max(1, Number(count)));
  const player = progress || createProgress();
  return new Session({
    scenarios: selected,
    progress: player,
    packId: packs.length === 1 ? packs[0].pack_id : null,
    seed: seed ?? null,
  });
}
