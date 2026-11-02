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
  startSession,
} from './engine.js';
import {
  exportAll,
  importAll,
  loadProgress,
  loadSettings,
  resetAll,
  saveProgress,
  saveSettings,
} from './storage.js';
import {
  escapeHtml,
  renderAbout,
  renderBadges,
  renderGame,
  renderMenu,
  renderRecap,
  statsLabels,
} from './ui.js';

const SCREENS = ['menu', 'game', 'recap', 'badges', 'about'];
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
      ? renderMenu(state.manifest, state.progress)
      : '<section class="card"><p>Memuat konten…</p></section>';
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
    });
  } else if (state.screen === 'recap' && state.summary) {
    dom.screens.recap.innerHTML = renderRecap(
      state.summary,
      state.progress,
      state.scenarioMap,
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
  if (packCache.has(packId)) return packCache.get(packId);
  const pack = await loadPack(packId);
  packCache.set(packId, pack);
  return pack;
}

/** Mulai sesi baru untuk pack tertentu atau mode Campur. */
async function playPack(packId) {
  try {
    const packs = packId ? [await getPack(packId)] : await loadAllPacks();
    state.lastPackId = packId;
    state.packLabel = packId ? packs[0].name : 'Campur Semua';
    state.session = startSession(packs, {
      count: QUESTIONS_PER_SESSION,
      progress: state.progress,
    });
    state.scenarioMap = Object.fromEntries(
      state.session.scenarios.map((scenario) => [scenario.id, scenario]),
    );
    state.lastResult = null;
    state.lastScenario = null;
    state.summary = null;
    showScreen('game');
    announce('Sesi dimulai. Soal pertama.');
  } catch (error) {
    handleError(error);
  }
}

/** Kirim jawaban pemain untuk soal aktif. */
function submitAnswer(optionId) {
  if (state.screen !== 'game' || !state.session || state.lastResult) return;
  try {
    state.lastScenario = state.session.current();
    state.lastResult = state.session.answer(optionId);
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
    return;
  }
  finishSession();
}

/** Selesaikan sesi: hitung ringkasan, simpan, tampilkan recap. */
function finishSession() {
  try {
    state.summary = state.session.summary();
    saveProgress(state.progress, true);
    if (state.summary.badges_earned.length) celebrate();
    showScreen('recap');
    announce('Sesi selesai. Ringkasan ditampilkan.');
  } catch (error) {
    handleError(error);
  }
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
    playPack(target.dataset.pack);
  } else if (action === 'mixed') {
    playPack(null);
  } else if (action === 'answer') {
    submitAnswer(target.dataset.option);
  } else if (action === 'next') {
    nextStep();
  } else if (action === 'again') {
    playPack(state.lastPackId);
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
