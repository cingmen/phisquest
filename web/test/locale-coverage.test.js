import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { translateString } from '../js/i18n.js';
import {
  renderAbout,
  renderBadges,
  renderEditor,
  renderGame,
  renderLeaderboardTable,
  renderMenu,
  renderRecap,
} from '../js/ui.js';

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decode(value) {
  return value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity]);
}

/** Teks yang terlihat, plus atribut yang diterjemahkan oleh translateUi(). */
function translatableStrings(html) {
  // <head> berisi metadata yang diatur applyDocumentLocale(), bukan translateUi().
  const text = html
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<textarea[\s\S]*?<\/textarea>/gi, ' ')
    .replace(/<[^>]*>/g, '\u0000')
    .split('\u0000')
    .map((node) => decode(node).trim())
    .filter(Boolean);

  const attributes = [];
  for (const tag of html.match(/<[^>]+>/g) || []) {
    for (const match of tag.matchAll(/\b(?:aria-label|placeholder|title)="([^"]*)"/g)) {
      const value = decode(match[1]).trim();
      if (value) attributes.push(value);
    }
  }
  return [...text, ...attributes];
}

// Kata yang hanya muncul pada UI berbahasa Indonesia. Konten simulasi memakai
// bahasa Inggris pada fixture, sehingga setiap temuan adalah string UI nyata.
const INDONESIAN =
  /\b(?:anda|agar|akurasi|analisis|batal|belum|bentrok|berhasil|berikut|bisa|buang|buka|campur|dalam|dapat|dibuang|diperbarui|draf|gagal|hapus|jawaban|jika|kamu|kembali|kesalahan|klasik|lencana|lanjut|maka|maks|memuat|menampilkan|mengirim|menyimpan|mulai|oleh|papan|pemain|pengaturan|pengirim|penjelasan|perangkat|peringkat|permainan|pilih|progres|recap|selesai|semua|sesi|simpan|skenario|skor|soal|sudah|tentang|tersimpan|tidak|tutup|waktu)\b/i;

function untranslated(html) {
  return [...new Set(translatableStrings(html))].filter(
    (value) => INDONESIAN.test(value) && translateString(value) === value,
  );
}

function scenario() {
  return {
    scenario_id: 'ew-001',
    label: 'New scenario',
    type: 'phish_or_legit',
    channel: 'email',
    difficulty: 'mudah',
    sender: { name: 'Bank Nusa', address: 'security@banknusa.example' },
    datetime: '2026-11-15T09:30:00+07:00',
    subject: 'Verify your account',
    body: 'Please verify your account within 10 minutes.',
    link: { text: 'banknusa.example/verify', href: 'https://banknusa.example/verify' },
    attachment: { name: 'invoice.pdf', size_kb: 64 },
    explanation: 'The domain is not the official bank domain.',
    teach: { tip: 'Read the domain carefully.', verify_how: 'Open the official app.' },
  };
}

const progress = {
  total_xp: 32,
  level: 'amatir',
  current_streak: 1,
  best_streak: 2,
  badges: { first_catch: '2026-11-15T09:30:00Z' },
  history: [],
  counters: { answered: 10, correct: 7 },
  packs: {},
};

const manifest = {
  packs: [{ pack_id: 'office', name: 'Office Life', emoji: '🏢', scenario_count: 10 }],
};

const leaderboard = [
  { score: 120, pack_id: 'campur', accuracy: 0.8, mode: 'time_attack', at: '2026-11-15T09:30:00Z' },
];

const pack = {
  pack_id: 'office',
  name: 'Office Life',
  description: 'English description.',
  emoji: '🏢',
  scenarios: [scenario()],
};

const draft = {
  pack_id: 'local-pack',
  name: 'Local pack',
  scenarios: [scenario()],
  label: 'belum tersimpan',
};

const session = {
  score: 10,
  streak: 1,
  mode: 'time_attack',
  timeLimitMs: 20000,
  hasNext: () => true,
};

const result = {
  correct: true,
  xp_gained: 10,
  streak_after: 1,
  red_flags: ['DOMAIN_PALSU'],
  explanation: 'The domain is not the official bank domain.',
  teach: { tip: 'Read the domain carefully.', verify_how: 'Open the official app.' },
  badges_earned: ['first_catch'],
  level_up: 'detektif',
};

const summary = {
  accuracy: 0.7,
  score: 32,
  best_streak_in_session: 2,
  mode: 'time_attack',
  speed_bonus_total: 4,
  timed_out_count: 1,
  pack_id: 'campur',
  badges_earned: ['first_catch'],
  mistakes: [{ scenario_id: 'ew-001', chosen: 'PHISH', correct_answer: 'LEGIT' }],
  at: '2026-11-15T09:30:00Z',
};

const scenarioMap = { 'ew-001': scenario() };

const screens = {
  shell: () => readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
  menu: () =>
    renderMenu(manifest, progress, leaderboard, [], [draft], 'Local pack deleted'),
  badges: () => renderBadges(progress),
  editor: () =>
    renderEditor({
      packs: [pack],
      drafts: [draft],
      pack,
      readiness: { ready: false, issues: ['Requires 10 scenarios, currently 1'] },
      scenarioProblems: [[]],
      storedCount: 1,
    }),
  game: () => renderGame({ session, scenario: scenario(), position: 1, total: 10, packLabel: 'Office Life' }),
  feedback: () =>
    renderGame({
      session,
      scenario: scenario(),
      answeredScenario: scenario(),
      result,
      position: 1,
      total: 10,
      packLabel: 'Office Life',
      remainingMs: 12000,
    }),
  recap: () =>
    renderRecap(summary, progress, scenarioMap, leaderboard, 2, 'Mixed', { rank: 4, total: 10 }),
  recapWithoutMistakes: () =>
    renderRecap(
      { ...summary, mistakes: [], badges_earned: [], mode: 'classic' },
      progress,
      scenarioMap,
      [],
      null,
      '',
      { error: 'Network unavailable' },
    ),
  leaderboard: () => renderLeaderboardTable(leaderboard, 'Local leaderboard'),
  aboutOnline: () =>
    renderAbout({
      config: { base: 'https://scores.example' },
      settings: { nickname: 'Pro', locale: 'en' },
      stats: { sessions: 4, accuracy: 0.75, best_streak: 5 },
      board: leaderboard,
      error: '',
      loading: false,
    }),
  aboutLocal: () =>
    renderAbout({
      config: { base: '' },
      settings: { nickname: '', locale: 'en' },
      stats: null,
      board: [],
      error: 'Network unavailable',
      loading: false,
    }),
};

for (const [name, render] of Object.entries(screens)) {
  test(`locale en: tidak ada teks Indonesia yang lolos di layar ${name}`, () => {
    assert.deepEqual(untranslated(render()), []);
  });
}
