/**
 * Titik masuk web PhishQuest: navigasi layar, wiring event, dan keyboard.
 * State permainan hanya hidup di instance Session + storage (bukan variabel global tersebar).
 */

import {
  PQError,
  createProgress,
  loadAllPacks,
  loadManifest,
  loadPack,
  nowIso,
  startSession,
} from './engine.js';
import { makeEntry } from './leaderboard.js';
import {
  PACK_PREFIX,
  SAMPLE_PACK,
  createScenarioTemplate,
  moveScenario,
  parsePackText,
  toContentPack,
  validatePackShape,
  validateScenario,
} from './scenario_editor.js';
import {
  addCustomPack,
  clearCustomPacks,
  exportAll,
  importAll,
  loadCustomPacks,
  loadLeaderboard,
  loadProgress,
  loadSettings,
  recordLeaderboardEntry,
  resetAll,
  saveCustomPacks,
  saveProgress,
  saveSettings,
} from './storage.js';
import {
  escapeHtml,
  renderAbout,
  renderBadges,
  renderGame,
  renderMenu,
  renderEditor,
  renderRecap,
  statsLabels,
} from './ui.js';

const SCREENS = ['menu', 'game', 'recap', 'badges', 'about', 'editor'];
const QUESTIONS_PER_SESSION = 10;

const state = {
  manifest: null,
  progress: createProgress(),
  session: null,
  summary: null,
  lastResult: null,
  lastScenario: null,
  scenarioMap: {},
  packLabel: '',
  lastPackId: null,
  screen: 'menu',
  mode: 'classic',
  remainingMs: null,
  questionStartedAt: null,
  timerId: null,
  leaderboard: [],
  rank: null,
  customPacks: [],
  editorText: '',
  editorErrors: [],
  editorMessage: '',
  editorPack: null,
  editorSavedId: null,
  editorIndex: 0,
};

const packCache = new Map();
const dom = {};

/** Cache referensi DOM sekali di awal. */
function cacheDom() {
  dom.screens = Object.fromEntries(
    SCREENS.map((name) => [name, document.getElementById(`screen-${name}`)]),
  );
  dom.tabs = Array.from(document.querySelectorAll('.tab'));
  dom.statXp = document.getElementById('stat-xp');
  dom.statLevel = document.getElementById('stat-level');
  dom.statStreak = document.getElementById('stat-streak');
  dom.toast = document.getElementById('toast');
  dom.live = document.getElementById('live-region');
  dom.confetti = document.getElementById('confetti');
}

/** Tampilkan pesan singkat (toast). */
function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add('toast--visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    dom.toast.classList.remove('toast--visible');
  }, 3200);
}

/** Umumkan teks ke pembaca layar. */
function announce(message) {
  if (!dom.live) return;
  dom.live.textContent = '';
  window.setTimeout(() => {
    dom.live.textContent = message;
  }, 30);
}

/** Terjemahkan error menjadi pesan ramah. */
function handleError(error) {
  if (error instanceof PQError) {
    showToast(error.message);
  } else {
    showToast('Terjadi kesalahan tak terduga. Coba muat ulang halaman.');
  }
  if (window.console && window.console.error) window.console.error(error);
}

/** Konfeti singkat saat naik level atau dapat lencana baru. */
function celebrate() {
  if (!dom.confetti) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#7C3AED', '#06B6D4', '#F59E0B', '#22C55E', '#EF4444'];
  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti__piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 200}ms`;
    dom.confetti.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1600);
  }
}

/** Perbarui chip statistik di topbar. */
function updateStats() {
  const labels = statsLabels(state.progress);
  if (dom.statXp) dom.statXp.textContent = labels.xp;
  if (dom.statLevel) dom.statLevel.textContent = labels.level;
  if (dom.statStreak) dom.statStreak.textContent = labels.streak;
}

/** Gambar ulang layar aktif. */
function render() {
  updateStats();
  for (const name of SCREENS) {
    const screen = dom.screens[name];
    if (screen) screen.classList.toggle('screen--hidden', name !== state.screen);
  }
  for (const tab of dom.tabs) {
    const active = tab.dataset.tab === state.screen;
    tab.classList.toggle('tab--active', active);
    tab.setAttribute('aria-selected', String(active));
  }

  if (state.screen === 'menu') {
    dom.screens.menu.innerHTML = state.manifest
      ? renderMenu(state.manifest, state.progress, state.leaderboard, state.customPacks)
      : '<section class="card"><p>Memuat konten…</p></section>';
  } else if (state.screen === 'editor') {
    const active = state.editorPack;
    dom.screens.editor.innerHTML = renderEditor({
      text: state.editorText,
      errors: state.editorErrors,
      message: state.editorMessage,
      packs: state.customPacks.map((pack) => ({ ...pack, readiness: validatePackShape(pack) })),
      pack: active,
      index: state.editorIndex,
      readiness: active ? validatePackShape(active) : null,
      scenarioProblems: active
        ? active.scenarios.map((scenario, index) => validateScenario(scenario, index))
        : [],
    });
  } else if (state.screen === 'game' && state.session) {
    const position = state.session.answeredCount + (state.lastResult ? 0 : 1);
    dom.screens.game.innerHTML = renderGame({
      session: state.session,
      scenario: state.session.current(),
      answeredScenario: state.lastScenario,
      result: state.lastResult,
      position,
      total: state.session.scenarios.length,
      packLabel: state.packLabel,
      remainingMs: state.remainingMs,
    });
  } else if (state.screen === 'recap' && state.summary) {
    dom.screens.recap.innerHTML = renderRecap(
      state.summary,
      state.progress,
      state.scenarioMap,
      state.leaderboard,
      state.rank,
      state.packLabel,
    );
  } else if (state.screen === 'badges') {
    dom.screens.badges.innerHTML = renderBadges(state.progress);
  } else if (state.screen === 'about') {
    dom.screens.about.innerHTML = renderAbout();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Pindah layar. */
function showScreen(name) {
  state.screen = name;
  render();
}

/** Ambil pack dari cache atau konten. */
async function getPack(packId) {
  const custom = state.customPacks.find((pack) => pack.pack_id === packId);
  if (custom) return custom;
  if (packCache.has(packId)) return packCache.get(packId);
  const pack = await loadPack(packId);
  packCache.set(packId, pack);
  return pack;
}

/** Mulai sesi baru untuk pack tertentu atau mode Campur. */
async function playPack(packId, mode = 'classic', count = QUESTIONS_PER_SESSION) {
  try {
    const packs = packId ? [await getPack(packId)] : await loadAllPacks();
    state.lastPackId = packId;
    state.packLabel = packId ? packs[0].name : `Campur Semua · ${count} soal`;
    state.session = startSession(packs, {
      count,
      progress: state.progress,
      mode,
    });
    state.mode = mode;
    state.scenarioMap = Object.fromEntries(
      state.session.scenarios.map((scenario) => [scenario.id, scenario]),
    );
    state.lastResult = null;
    state.lastScenario = null;
    state.summary = null;
    state.rank = null;
    showScreen('game');
    startTimer();
    announce('Sesi dimulai. Soal pertama.');
  } catch (error) {
    handleError(error);
  }
}

/** Hentikan countdown mode time attack bila sedang berjalan. */
function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

/** Mulai countdown; hanya aktif pada mode time attack. */
function startTimer() {
  stopTimer();
  state.questionStartedAt = Date.now();
  state.remainingMs = state.session && state.session.mode === 'time_attack' ? state.session.timeLimitMs : null;
  if (state.remainingMs === null) return;
  state.timerId = window.setInterval(() => {
    const left = state.remainingMs - (Date.now() - state.questionStartedAt);
    const chip = document.getElementById('pq-timer');
    if (chip) chip.textContent = `⏱️ ${Math.max(0, Math.ceil(left / 1000))}s`;
    if (left <= 0) {
      stopTimer();
      const scenario = state.session && state.session.current();
      if (!scenario) return;
      const fallback = scenario.type === 'phish_or_legit' ? 'PHISH' : String((scenario.options || [])[0].id);
      announce('Waktu habis.');
      submitAnswer(fallback, true);
    }
  }, 200);
}

/** Kirim jawaban pemain untuk soal aktif. */
function submitAnswer(optionId, timedOut = false) {
  if (state.screen !== 'game' || !state.session || state.lastResult) return;
  try {
    state.lastScenario = state.session.current();
    const elapsed = state.questionStartedAt ? Date.now() - state.questionStartedAt : 0;
    const elapsedMs =
      timedOut && state.session.mode === 'time_attack'
        ? state.session.timeLimitMs + 1
        : elapsed;
    stopTimer();
    state.lastResult = state.session.answer(optionId, elapsedMs);
    saveProgress(state.progress);
    const { correct, xp_gained: xpGained, badges_earned: badges } = state.lastResult;
    announce(`${correct ? 'Benar' : 'Belum tepat'}. ${xpGained} XP.`);
    if (badges.length) celebrate();
    render();
  } catch (error) {
    handleError(error);
  }
}

/** Lanjut ke soal berikutnya atau ke recap. */
function nextStep() {
  if (!state.session || !state.lastResult) return;
  if (state.session.hasNext()) {
    state.lastResult = null;
    state.lastScenario = null;
    render();
    startTimer();
    return;
  }
  finishSession();
}

/** Selesaikan sesi: hitung ringkasan, simpan, tampilkan recap. */
function finishSession() {
  try {
    stopTimer();
    state.summary = state.session.summary();
    saveProgress(state.progress, true);
    const entry = makeEntry({
      score: state.summary.score,
      maxScore: state.summary.max_score,
      accuracy: state.summary.accuracy,
      packId: state.summary.pack_id,
      mode: state.summary.mode,
      at: nowIso(),
    });
    const recorded = recordLeaderboardEntry(entry);
    state.leaderboard = recorded.entries;
    state.rank = recorded.rank;
    state.summary.at = entry.at;
    if (state.summary.badges_earned.length) celebrate();
    showScreen('recap');
    announce('Sesi selesai. Ringkasan ditampilkan.');
  } catch (error) {
    handleError(error);
  }
}

/** Salin pack agar draft editor tidak mengubah objek yang tersimpan. */
function clonePack(pack) {
  return JSON.parse(JSON.stringify(pack));
}

/** Id pack lokal yang belum dipakai. */
function uniquePackId(base = 'kustom') {
  const taken = new Set(state.customPacks.map((pack) => pack.pack_id));
  if (!taken.has(base)) return base;
  let number = 2;
  while (taken.has(`${base}-${number}`)) number += 1;
  return `${base}-${number}`;
}

/** Ambil nilai elemen berdasarkan id (string kosong bila tidak ada). */
function fieldValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

/** Susun satu skenario dari isian form yang sedang terbuka. */
function readScenarioForm() {
  const scenario = {
    label: fieldValue('scn-label').trim(),
    id: fieldValue('scn-id').trim(),
    type: fieldValue('scn-type'),
    difficulty: fieldValue('scn-difficulty'),
    channel: fieldValue('scn-channel'),
    sender: {
      name: fieldValue('scn-sender-name').trim(),
      address: fieldValue('scn-sender-address').trim(),
    },
    subject: fieldValue('scn-subject').trim() || null,
    datetime: fieldValue('scn-datetime').trim(),
    body: fieldValue('scn-body').trim(),
    link: null,
    attachment: null,
    options: null,
    is_phish: fieldValue('scn-is-phish') === 'true',
    correct_option: null,
    red_flags: Array.from(document.querySelectorAll('input[name="scn-flag"]:checked')).map(
      (element) => element.value,
    ),
    explanation: fieldValue('scn-explanation').trim(),
    teach: {
      tip: fieldValue('scn-tip').trim(),
      verify_how: fieldValue('scn-verify').trim(),
    },
  };

  const href = fieldValue('scn-link-href').trim();
  if (href) scenario.link = { text: fieldValue('scn-link-text').trim() || href, href };
  const attachmentName = fieldValue('scn-attachment-name').trim();
  if (attachmentName) {
    scenario.attachment = {
      name: attachmentName,
      size_kb: Number(fieldValue('scn-attachment-size')) || 0,
    };
  }
  if (scenario.type !== 'phish_or_legit') {
    scenario.options = ['A', 'B', 'C', 'D']
      .map((id) => ({ id, text: fieldValue(`scn-option-${id}`).trim() }))
      .filter((option) => option.text);
    scenario.correct_option = fieldValue('scn-correct') || null;
  }
  return scenario;
}

/** Tulis isian form (detail pack + skenario aktif) ke draft di memori. */
function flushEditor() {
  const pack = state.editorPack;
  if (!pack) return;
  if (document.getElementById('pack-name')) {
    pack.name = fieldValue('pack-name').trim() || pack.name;
    const packId = fieldValue('pack-id').trim();
    if (packId) pack.pack_id = packId;
    pack.description = fieldValue('pack-description').trim();
    pack.emoji = fieldValue('pack-emoji').trim() || pack.emoji;
  }
  const current = pack.scenarios[state.editorIndex];
  if (current && document.getElementById('scn-id')) {
    pack.scenarios[state.editorIndex] = readScenarioForm();
  }
}

/**
 * Simpan draft editor ke localStorage bila seluruh skenario valid.
 * @returns {boolean} true bila pack tersimpan.
 */
function persistEditorDraft() {
  const pack = state.editorPack;
  if (!pack) return false;
  const problems = [];
  pack.scenarios.forEach((scenario, index) => problems.push(...validateScenario(scenario, index)));
  const ids = pack.scenarios.map((scenario) => String(scenario.id));
  if (new Set(ids).size !== ids.length) problems.push('id skenario duplikat di pack ini');
  state.editorErrors = problems;
  if (problems.length) return false;
  const others = state.customPacks.filter(
    (packItem) => packItem.pack_id !== pack.pack_id && packItem.pack_id !== state.editorSavedId,
  );
  state.customPacks = saveCustomPacks([...others, clonePack(pack)]);
  state.editorSavedId = pack.pack_id;
  return true;
}

/** Buka pack tersimpan ke editor. */
function openEditorPack(packId) {
  const found = state.customPacks.find((pack) => pack.pack_id === packId);
  if (!found) return;
  state.editorPack = clonePack(found);
  state.editorSavedId = found.pack_id;
  state.editorIndex = 0;
  state.editorErrors = [];
  state.editorMessage = `Mengelola ${found.name} (${found.scenarios.length} skenario).`;
  render();
}

/** Buat pack lokal baru berisi satu skenario yang sudah valid. */
function createEditorPack() {
  state.editorPack = {
    pack_id: uniquePackId('kustom'),
    name: `Pack lokal ${state.customPacks.length + 1}`,
    description: '',
    emoji: '🛠️',
    scenarios: [createScenarioTemplate([], 'ew')],
  };
  state.editorSavedId = null;
  state.editorIndex = 0;
  state.editorErrors = [];
  const saved = persistEditorDraft();
  state.editorMessage = saved
    ? 'Pack baru dibuat. Ubah isinya, lalu tambah skenario lain.'
    : 'Pack baru dibuat, tetapi belum tersimpan karena ada masalah validasi.';
  render();
}

/** Tambah satu skenario baru ke pack aktif. */
function editorAddScenario() {
  flushEditor();
  const pack = state.editorPack;
  if (!pack) return;
  const prefix = PACK_PREFIX[pack.pack_id] || 'ew';
  const ids = pack.scenarios.map((scenario) => scenario.id);
  pack.scenarios.push(createScenarioTemplate(ids, prefix));
  state.editorIndex = pack.scenarios.length - 1;
  const saved = persistEditorDraft();
  state.editorMessage = saved
    ? `Skenario ${pack.scenarios.length} ditambahkan dan tersimpan.`
    : 'Skenario ditambahkan, tetapi belum tersimpan karena ada masalah validasi.';
  render();
}

/** Pilih skenario yang ditampilkan di form (isian lain tetap disimpan). */
function editorSelectScenario(index) {
  flushEditor();
  const pack = state.editorPack;
  if (!pack) return;
  state.editorIndex = Math.min(Math.max(index, 0), Math.max(pack.scenarios.length - 1, 0));
  persistEditorDraft();
  render();
}

/** Geser skenario satu langkah ke atas/bawah. */
function editorMoveScenario(index, delta) {
  flushEditor();
  const pack = state.editorPack;
  if (!pack) return;
  const target = index + delta;
  pack.scenarios = moveScenario(pack.scenarios, index, target);
  state.editorIndex = Math.min(Math.max(target, 0), Math.max(pack.scenarios.length - 1, 0));
  const saved = persistEditorDraft();
  state.editorMessage = saved
    ? `Urutan diperbarui: skenario ${index + 1} → ${state.editorIndex + 1}.`
    : 'Urutan diubah, tetapi belum tersimpan karena ada masalah validasi.';
  render();
}

/** Hapus satu skenario dari pack aktif setelah konfirmasi. */
function editorDeleteScenario(index) {
  flushEditor();
  const pack = state.editorPack;
  if (!pack || !pack.scenarios[index]) return;
  const label = pack.scenarios[index].label || pack.scenarios[index].id;
  if (!window.confirm(`Hapus skenario "${label}" dari pack ini?`)) return;
  pack.scenarios.splice(index, 1);
  state.editorIndex = Math.min(state.editorIndex, Math.max(pack.scenarios.length - 1, 0));
  const saved = persistEditorDraft();
  state.editorMessage = saved
    ? `Skenario dihapus. Sisa ${pack.scenarios.length} skenario di pack ini.`
    : 'Skenario dihapus, tetapi pack belum tersimpan karena ada masalah validasi.';
  render();
}

/** Simpan skenario aktif setelah divalidasi. */
function editorSaveScenario() {
  flushEditor();
  const pack = state.editorPack;
  if (!pack) return;
  const scenario = pack.scenarios[state.editorIndex];
  const problems = validateScenario(scenario, state.editorIndex);
  const saved = persistEditorDraft();
  if (problems.length) {
    state.editorMessage = `Skenario ${state.editorIndex + 1} belum valid: ${problems[0]}`;
  } else if (saved) {
    state.editorMessage = `Skenario ${state.editorIndex + 1} tersimpan. Pack berisi ${pack.scenarios.length} skenario.`;
  } else {
    state.editorMessage = `Skenario ${state.editorIndex + 1} valid, tetapi pack belum tersimpan karena skenario lain bermasalah.`;
  }
  render();
}

/** Impor skenario dari kotak JSON ke pack aktif. */
function editorImportJson() {
  const input = document.getElementById('editor-input');
  state.editorText = input ? input.value : state.editorText;
  const { pack: parsed, errors } = parsePackText(state.editorText);
  if (!parsed) {
    state.editorErrors = errors;
    state.editorMessage = 'Perbaiki masalah berikut sebelum mengimpor.';
    render();
    announce('Impor JSON gagal.');
    return;
  }
  flushEditor();
  if (!state.editorPack) {
    state.editorPack = {
      pack_id: uniquePackId(parsed.pack_id || 'kustom'),
      name: parsed.name,
      description: parsed.description || '',
      emoji: parsed.emoji || '🛠️',
      scenarios: [],
    };
    state.editorSavedId = null;
    state.editorIndex = 0;
  }
  const pack = state.editorPack;
  pack.scenarios.push(...parsed.scenarios.map((scenario) => ({ ...scenario })));
  state.editorIndex = pack.scenarios.length - 1;
  const saved = persistEditorDraft();
  state.editorText = '';
  state.editorMessage = saved
    ? `${parsed.scenarios.length} skenario diimpor. Pack kini berisi ${pack.scenarios.length} skenario.`
    : 'Skenario diimpor, tetapi pack belum tersimpan karena ada masalah validasi.';
  render();
}

/** Ekspor seluruh skenario pack aktif sebagai berkas pack content/. */
function exportCustomPack() {
  flushEditor();
  const pack = state.editorPack;
  if (!pack) {
    showToast('Belum ada pack lokal untuk diekspor.');
    return;
  }
  const readiness = validatePackShape(pack);
  const payload = toContentPack(pack);
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pack.pack_id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    state.editorMessage = readiness.ready
      ? `${payload.scenarios.length} skenario diekspor dan siap menjadi pack content/.`
      : `${payload.scenarios.length} skenario diekspor. Belum siap jadi pack content/: ${readiness.issues[0]}`;
    render();
    showToast(`${pack.name} diekspor (${payload.scenarios.length} skenario).`);
  } catch (error) {
    handleError(error);
  }
}

/** Hapus seluruh pack lokal setelah konfirmasi. */
function deleteCustomPacks() {
  if (!state.customPacks.length) {
    showToast('Tidak ada pack lokal.');
    return;
  }
  if (!window.confirm('Hapus semua pack buatanmu di perangkat ini?')) return;
  clearCustomPacks();
  state.customPacks = [];
  state.editorPack = null;
  state.editorSavedId = null;
  state.editorIndex = 0;
  state.editorMessage = 'Pack lokal dihapus.';
  render();
  showToast('Pack lokal dihapus.');
}

/** Unduh progres sebagai berkas JSON. */
function downloadExport() {
  try {
    const payload = JSON.stringify(exportAll(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'phishquest-export.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Progres diekspor ke phishquest-export.json.');
  } catch (error) {
    handleError(error);
  }
}

/** Impor progres dari berkas JSON yang dipilih pemain. */
async function handleImportFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    importAll(text);
    state.progress = loadProgress() || createProgress();
    render();
    showToast('Progres berhasil diimpor.');
  } catch (error) {
    handleError(error);
  }
}

/** Hapus progres setelah konfirmasi pemain. */
function confirmReset() {
  const confirmed = window.confirm(
    'Hapus seluruh progres, lencana, dan pengaturan di perangkat ini?',
  );
  if (!confirmed) return;
  resetAll();
  state.progress = createProgress();
  state.session = null;
  state.summary = null;
  render();
  showToast('Progres dihapus. Selamat mulai dari awal!');
}

/** Delegasi klik untuk semua aksi UI. */
function handleClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'tab') {
    showScreen(target.dataset.tab);
  } else if (action === 'play') {
    playPack(target.dataset.pack, 'classic');
  } else if (action === 'mixed') {
    const select = document.getElementById('mixed-count');
    const count = Number(select && select.value) || QUESTIONS_PER_SESSION;
    playPack(null, 'classic', count);
  } else if (action === 'time-attack') {
    playPack(null, 'time_attack');
  } else if (action === 'play-custom') {
    const pack = state.customPacks.find((item) => item.pack_id === target.dataset.pack);
    if (pack) playPack(pack.pack_id, 'classic', Math.min(QUESTIONS_PER_SESSION, pack.scenarios.length));
  } else if (action === 'editor-open') {
    state.editorErrors = [];
    if (!state.editorPack && state.customPacks.length) {
      state.editorPack = clonePack(state.customPacks[0]);
      state.editorSavedId = state.editorPack.pack_id;
      state.editorIndex = 0;
    }
    showScreen('editor');
  } else if (action === 'editor-new-pack') {
    createEditorPack();
  } else if (action === 'editor-select-pack') {
    openEditorPack(target.dataset.pack);
  } else if (action === 'editor-select') {
    editorSelectScenario(Number(target.dataset.index));
  } else if (action === 'editor-move-up') {
    editorMoveScenario(Number(target.dataset.index), -1);
  } else if (action === 'editor-move-down') {
    editorMoveScenario(Number(target.dataset.index), 1);
  } else if (action === 'editor-delete-scenario') {
    editorDeleteScenario(Number(target.dataset.index));
  } else if (action === 'editor-add-scenario') {
    editorAddScenario();
  } else if (action === 'editor-save-scenario') {
    editorSaveScenario();
  } else if (action === 'editor-import') {
    editorImportJson();
  } else if (action === 'editor-sample') {
    state.editorText = SAMPLE_PACK;
    state.editorErrors = [];
    state.editorMessage = 'Contoh dimuat. Tekan "Impor ke pack aktif" untuk menambahkannya.';
    render();
  } else if (action === 'editor-export') {
    exportCustomPack();
  } else if (action === 'editor-delete') {
    deleteCustomPacks();
  } else if (action === 'answer') {
    submitAnswer(target.dataset.option);
  } else if (action === 'next') {
    nextStep();
  } else if (action === 'again') {
    playPack(state.lastPackId, state.mode);
  } else if (action === 'menu') {
    showScreen('menu');
  } else if (action === 'export') {
    downloadExport();
  } else if (action === 'import') {
    const input = document.getElementById('import-file');
    if (input) input.click();
  } else if (action === 'reset') {
    confirmReset();
  }
}

/** Pintasan keyboard: P/L, 1–4, Enter. */
function handleKeydown(event) {
  if (state.screen !== 'game') return;
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const key = event.key.toUpperCase();
  if (state.lastResult) {
    if (key === 'ENTER') {
      event.preventDefault();
      nextStep();
    }
    return;
  }
  const scenario = state.session && state.session.current();
  if (!scenario) return;
  if (scenario.type === 'phish_or_legit') {
    if (key === 'P') submitAnswer('PHISH');
    if (key === 'L') submitAnswer('LEGIT');
    return;
  }
  const index = Number(key) - 1;
  const options = scenario.options || [];
  if (index >= 0 && index < options.length) submitAnswer(options[index].id);
}

/** Daftarkan seluruh listener global. */
function bindEvents() {
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'import-file') {
      handleImportFile(event.target.files && event.target.files[0]);
      return;
    }
    if (event.target && event.target.id === 'editor-pack-select') {
      if (event.target.value) openEditorPack(event.target.value);
      return;
    }
    if (!state.editorPack || !event.target || !event.target.id) return;
    const id = event.target.id;
    if (id.startsWith('pack-') || id.startsWith('scn-')) {
      flushEditor();
      persistEditorDraft();
    }
  });
  window.addEventListener('pq:storage-error', (event) => {
    const detail = event.detail || {};
    showToast(detail.message || 'Penyimpanan penuh; progres hanya tersimpan selama tab terbuka.');
  });
  window.addEventListener('beforeunload', () => {
    if (state.session) saveProgress(state.progress, true);
  });
}

/** Muat progres dengan fallback aman. */
function loadProgressSafe() {
  try {
    state.progress = loadProgress() || createProgress();
  } catch (error) {
    state.progress = createProgress();
    showToast('Progres lama tidak terbaca. Mulai sesi baru, atau reset dari menu Tentang.');
    if (window.console && window.console.error) window.console.error(error);
  }
}

/** Titik masuk aplikasi. */
async function boot() {
  cacheDom();
  bindEvents();
  loadProgressSafe();
  state.leaderboard = loadLeaderboard();
  state.customPacks = loadCustomPacks();
  const settings = loadSettings();
  if (settings.locale !== 'id') saveSettings({ ...settings, locale: 'id' });
  updateStats();
  render();
  try {
    state.manifest = await loadManifest();
  } catch (error) {
    handleError(error);
    dom.screens.menu.innerHTML = `<section class="card">
      <h2>Konten gagal dimuat</h2>
      <p>${escapeHtml(error.message || 'Periksa koneksi lalu muat ulang halaman.')}</p>
      <button class="btn btn--primary" data-action="tab" data-tab="menu">Coba lagi</button>
    </section>`;
    return;
  }
  render();
}

boot();
