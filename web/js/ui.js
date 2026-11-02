/**
 * Render murni untuk PhishQuest web — tanpa state, hanya fungsi HTML.
 * Semua nilai dari konten wajib melewati escapeHtml() sebelum masuk innerHTML.
 */

import { BADGES } from './badges.js';
import {
  LEVEL_EMOJI,
  LEVEL_NAMES,
  RED_FLAG_LABELS,
  correctAnswerOf,
  levelProgress,
} from './engine.js';

const CHANNEL_LABEL = {
  email: '✉️ Email',
  sms: '📱 SMS',
  whatsapp: '💬 WhatsApp',
};

/**
 * Escape karakter HTML pada nilai dinamis.
 * @param {unknown} value - nilai apa pun.
 * @returns {string} string aman untuk innerHTML.
 */
export function escapeHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Nama lencana dari badge_id.
 * @param {string} badgeId - id lencana.
 * @returns {string} label "emoji nama".
 */
function badgeLabel(badgeId) {
  const badge = BADGES.find((item) => item.badge_id === badgeId);
  return badge ? `${badge.emoji} ${badge.name}` : badgeId;
}

/**
 * Label jawaban untuk ditampilkan.
 * @param {object} scenario - skenario.
 * @param {string} answer - PHISH/LEGIT atau id opsi.
 * @returns {string} label ramah.
 */
function answerLabel(scenario, answer) {
  if (answer === 'PHISH') return 'Phishing 🎣';
  if (answer === 'LEGIT') return 'Legit ✅';
  const option = (scenario.options || []).find((item) => item.id === answer);
  return option ? `${answer}. ${option.text}` : String(answer);
}

/**
 * Bar progres level menuju level berikutnya.
 * @param {object} progress - objek Progress.
 * @returns {string} HTML level bar.
 */
export function renderLevelBar(progress) {
  const { level, current, needed } = levelProgress(progress.total_xp);
  const percent = needed ? Math.round((current / needed) * 100) : 100;
  const label = needed ? `${current}/${needed} XP` : `${progress.total_xp} XP (maks)`;
  return `<div class="level-bar">
    <div class="level-bar__label">
      <span>${LEVEL_EMOJI[level] || '🐣'} ${escapeHtml(LEVEL_NAMES[level] || level)}</span>
      <span>${escapeHtml(label)}</span>
    </div>
    <div class="level-bar__track" role="progressbar" aria-label="Progres level" aria-valuemin="0" aria-valuemax="${needed || current}" aria-valuenow="${current}">
      <div class="level-bar__fill" style="width:${percent}%"></div>
    </div>
  </div>`;
}

/**
 * Nilai chip statistik pemain untuk topbar.
 * @param {object} progress - objek Progress.
 * @returns {{xp: string, level: string, streak: string}} label chip.
 */
export function statsLabels(progress) {
  const level = progress.level || 'amatir';
  return {
    xp: `${progress.total_xp} XP`,
    level: `${LEVEL_EMOJI[level] || '🐣'} ${LEVEL_NAMES[level] || level}`,
    streak: `🔥 ${progress.current_streak}`,
  };
}

/**
 * Layar menu: 4 kartu pack, mode Campur, dan ringkasan level.
 * @param {object} manifest - manifest pack.
 * @param {object} progress - objek Progress.
 * @returns {string} HTML layar menu.
 */
export function renderMenu(manifest, progress, leaderboard = []) {
  const packs = manifest.packs
    .map((pack) => {
      const stats = (progress.packs && progress.packs[pack.pack_id]) || {};
      const best = stats.best_score != null ? `🏆 ${stats.best_score}` : 'Belum dimainkan';
      return `<button class="pack" data-action="play" data-pack="${escapeHtml(pack.pack_id)}">
        <span class="pack__emoji" aria-hidden="true">${escapeHtml(pack.emoji)}</span>
        <span class="pack__body">
          <span class="pack__name">${escapeHtml(pack.name)}</span>
          <span class="pack__meta">${escapeHtml(String(pack.scenario_count))} skenario</span>
        </span>
        <span class="pack__best">${escapeHtml(best)}</span>
      </button>`;
    })
    .join('');

  const sessions = (progress.history || []).length;
  const answered = progress.counters.answered || 0;
  const accuracy = answered ? Math.round((progress.counters.correct / answered) * 100) : 0;

  return `<section class="hero">
      <h1>Kenali umpan sebelum kamu terhook 🎣</h1>
      <p>${progress.total_xp} XP · ${escapeHtml(String(progress.badges ? Object.keys(progress.badges).length : 0))}/10 lencana</p>
      ${renderLevelBar(progress)}
    </section>
    <section class="card">
      <h2>Pilih pack</h2>
      <div class="pack-grid">${packs}</div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn--accent btn--block" data-action="mixed">🎲 Campur Semua (10 soal)</button>
      </div>
      <div class="btn-row">
        <button class="btn btn--ghost btn--block" data-action="time-attack">⏱️ Time Attack · 20 detik per soal</button>
      </div>
    </section>
    ${leaderboard.length ? renderLeaderboardTable(leaderboard.slice(0, 3), 'Papan skor lokal · 3 terbaik') : ''}
    <section class="card">
      <h3>Ringkasan kamu</h3>
      <div class="recap-stats">
        <div class="stat"><span class="stat__value">${sessions}</span><span class="stat__label">Sesi</span></div>
        <div class="stat"><span class="stat__value">${accuracy}%</span><span class="stat__label">Akurasi</span></div>
        <div class="stat"><span class="stat__value">🔥 ${progress.best_streak}</span><span class="stat__label">Rekor streak</span></div>
        <div class="stat"><span class="stat__value">${answered}</span><span class="stat__label">Soal dijawab</span></div>
      </div>
    </section>`;
}

/**
 * Kartu pesan email/SMS/WhatsApp.
 * @param {object} scenario - skenario yang ditampilkan.
 * @returns {string} HTML kartu pesan.
 */
export function renderMessage(scenario) {
  const channel = scenario.channel || 'email';
  const rows = [
    `<div><strong>Dari:</strong> ${escapeHtml(scenario.sender.name)} &lt;${escapeHtml(scenario.sender.address)}&gt;</div>`,
    `<div><strong>Waktu:</strong> ${escapeHtml(scenario.datetime.replace('T', ' ').slice(0, 16))}</div>`,
  ];
  const subject = scenario.subject
    ? `<h3 class="message__subject">${escapeHtml(scenario.subject)}</h3>`
    : '';
  const attachment = scenario.attachment
    ? `<div class="message__attachment">📎 <strong>${escapeHtml(scenario.attachment.name)}</strong> <span class="message__href">${escapeHtml(String(scenario.attachment.size_kb))} KB</span></div>`
    : '';
  const link = scenario.link
    ? `<div class="message__link">🔗 <span>${escapeHtml(scenario.link.text)}</span> <span class="message__href">${escapeHtml(scenario.link.href)}</span></div>`
    : '';
  return `<article class="message message--${escapeHtml(channel)}">
    <div class="message__top">${CHANNEL_LABEL[channel] || escapeHtml(channel)}</div>
    <div class="message__body">
      <div class="message__meta">${rows.join('')}</div>
      ${subject}
      <p class="message__text">${escapeHtml(scenario.body)}</p>
      ${attachment}
      ${link}
    </div>
  </article>`;
}

/**
 * Area jawaban sesuai tipe soal.
 * @param {object} scenario - skenario aktif.
 * @returns {string} HTML tombol jawaban.
 */
export function renderAnswers(scenario) {
  if (scenario.type === 'phish_or_legit') {
    return `<div class="answers answers--binary">
      <button class="answer answer--phish" data-action="answer" data-option="PHISH">
        <span class="answer__key">P</span><span>Phishing 🎣</span>
      </button>
      <button class="answer answer--legit" data-action="answer" data-option="LEGIT">
        <span class="answer__key">L</span><span>Legit ✅</span>
      </button>
    </div>`;
  }
  const options = scenario.options || [];
  return `<div class="answers">${options
    .map(
      (option, index) =>
        `<button class="answer" data-action="answer" data-option="${escapeHtml(option.id)}">
          <span class="answer__key">${index + 1}</span><span>${escapeHtml(option.text)}</span>
        </button>`,
    )
    .join('')}</div>`;
}

/**
 * Panel umpan balik setelah menjawab.
 * @param {object} scenario - skenario yang baru dijawab.
 * @param {object} result - AnswerResult.
 * @param {string} nextLabel - label tombol lanjut.
 * @returns {string} HTML panel umpan balik.
 */
export function renderFeedback(scenario, result, nextLabel) {
  const flags = result.red_flags || [];
  const flagHtml = flags.length
    ? `<ul class="flag-list">${flags
        .map((code) => `<li class="flag">🚩 ${escapeHtml(RED_FLAG_LABELS[code] || code)}</li>`)
        .join('')}</ul>`
    : '<p><span class="flag flag--none">✅ Tidak ada red flag — pesan ini wajar.</span></p>';
  const correctLine = result.correct
    ? ''
    : `<p><strong>Jawaban benar:</strong> ${escapeHtml(
        answerLabel(scenario, correctAnswerOf(scenario)),
      )}</p>`;
  const badgeLine = result.badges_earned.length
    ? `<p class="feedback__xp">🏅 Lencana baru: ${escapeHtml(
        result.badges_earned.map(badgeLabel).join(', '),
      )}</p>`
    : '';
  const levelLine = result.level_up
    ? `<p class="feedback__xp">⬆️ Naik level: ${escapeHtml(LEVEL_NAMES[result.level_up] || result.level_up)}</p>`
    : '';
  return `<section class="feedback feedback--${result.correct ? 'correct' : 'wrong'}" role="status">
    <div class="feedback__title">
      ${result.correct ? '✅ Benar!' : '❌ Belum tepat'}
      <span class="feedback__xp">+${result.xp_gained} XP · 🔥${result.streak_after}</span>
    </div>
    ${correctLine}
    ${flagHtml}
    <p>${escapeHtml(result.explanation)}</p>
    <div class="teach">
      <p>💡 ${escapeHtml(result.teach.tip)}</p>
      <p>🔎 ${escapeHtml(result.teach.verify_how)}</p>
    </div>
    ${levelLine}
    ${badgeLine}
    <div class="btn-row" style="margin-top:12px">
      <button class="btn btn--primary btn--block" data-action="next">${escapeHtml(nextLabel)}</button>
    </div>
  </section>`;
}

/**
 * Layar permainan lengkap (header, pesan, jawaban/umpan balik).
 * @param {object} options - { session, scenario, answeredScenario, result, position, total, packLabel }.
 * @returns {string} HTML layar permainan.
 */
export function renderGame({
  session,
  scenario,
  answeredScenario,
  result,
  position,
  total,
  packLabel,
  remainingMs = null,
}) {
  const active = result ? answeredScenario : scenario;
  if (!active) return '<section class="card"><p>Memuat soal…</p></section>';
  const percent = Math.round((position / total) * 100);
  const head = `<div class="game-head">
      <span class="game-head__title">${escapeHtml(packLabel)}</span>
      <span class="game-head__stats">
        <span class="chip chip--xp">${session.score} XP</span>
        <span class="chip chip--streak">🔥 ${session.streak}</span>
        ${session.mode === 'time_attack' ? `<span class="chip chip--timer" id="pq-timer" role="timer">⏱️ ${Math.ceil((remainingMs ?? session.timeLimitMs) / 1000)}s</span>` : ''}
      </span>
    </div>
    <div class="progress">
      <div class="progress__track" role="progressbar" aria-label="Progres soal" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${position}">
        <div class="progress__fill" style="width:${percent}%"></div>
      </div>
      <span class="progress__label">Soal ${position} dari ${total}</span>
    </div>`;

  if (result) {
    const nextLabel = session.hasNext() ? 'Lanjut →' : 'Lihat recap →';
    return `${head}${renderMessage(active)}${renderFeedback(active, result, nextLabel)}`;
  }

  const question =
    active.type === 'phish_or_legit'
      ? 'Phishing atau legit?'
      : active.type === 'best_action'
        ? 'Apa tindakan terbaik?'
        : 'Bagian mana yang paling mencurigakan?';
  return `${head}${renderMessage(active)}
    <section class="card">
      <h2>${escapeHtml(question)}</h2>
      ${renderAnswers(active)}
      <p class="answers__hint">Pintasan keyboard: P/L atau 1–4</p>
    </section>`;
}

/**
 * Layar recap akhir sesi.
 * @param {object} summary - SessionSummary.
 * @param {object} progress - objek Progress.
 * @param {object} scenarioMap - peta scenario_id → skenario untuk review.
 * @returns {string} HTML layar recap.
 */
export function renderRecap(summary, progress, scenarioMap = {}, leaderboard = [], rank = null) {
  const accuracy = Math.round(summary.accuracy * 100);
  const badges = summary.badges_earned.length
    ? `<section class="card"><h3>Lencana baru</h3><div class="badge-grid">${summary.badges_earned
        .map(
          (badgeId) =>
            `<div class="badge badge--earned"><span class="badge__emoji">${
              (BADGES.find((item) => item.badge_id === badgeId) || {}).emoji || '🏅'
            }</span><span class="badge__name">${escapeHtml(badgeLabel(badgeId))}</span></div>`,
        )
        .join('')}</div></section>`
    : '';
  const mistakes = summary.mistakes.length
    ? `<section class="card"><h3>Kesalahan untuk ditinjau</h3><ul class="mistakes">${summary.mistakes
        .map((mistake) => {
          const scenario = scenarioMap[mistake.scenario_id] || { options: [] };
          return `<details class="mistake">
            <summary>${escapeHtml(mistake.scenario_id)} · jawabanmu ${escapeHtml(
              answerLabel(scenario, mistake.chosen),
            )}</summary>
            <div class="mistake__detail">
              <p><strong>Jawaban benar:</strong> ${escapeHtml(
                answerLabel(scenario, mistake.correct_answer),
              )}</p>
              <p>${escapeHtml(scenario.explanation || '')}</p>
              ${
                scenario.teach
                  ? `<p>💡 ${escapeHtml(scenario.teach.tip)}</p><p>🔎 ${escapeHtml(
                      scenario.teach.verify_how,
                    )}</p>`
                  : ''
              }
            </div>
          </details>`;
        })
        .join('')}</ul></section>`
    : '<section class="card"><p>💯 Tanpa kesalahan. Luar biasa!</p></section>';

  return `<section class="hero">
      <h1>Sesi selesai! ${summary.accuracy >= 1 ? '🎉' : '🎣'}</h1>
      <p>${escapeHtml(summary.pack_id || 'Campur Semua')}</p>
      ${renderLevelBar(progress)}
    </section>
    <section class="card">
      <div class="recap-stats">
        <div class="stat"><span class="stat__value">${summary.score}</span><span class="stat__label">Skor XP</span></div>
        <div class="stat"><span class="stat__value">${accuracy}%</span><span class="stat__label">Akurasi</span></div>
        <div class="stat"><span class="stat__value">🔥 ${summary.best_streak_in_session}</span><span class="stat__label">Streak</span></div>
        <div class="stat"><span class="stat__value">${progress.total_xp}</span><span class="stat__label">Total XP</span></div>
      </div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn btn--primary" data-action="again">🔁 Main lagi</button>
        <button class="btn btn--ghost" data-action="menu">🏠 Menu</button>
      </div>
    </section>
    ${
      summary.mode === 'time_attack'
        ? `<section class="card"><p class="pack__meta">⏱️ Mode Time Attack · bonus kecepatan ${summary.speed_bonus_total} XP · ${summary.timed_out_count} soal timeout</p></section>`
        : ''
    }
    ${
      rank
        ? `<section class="card"><p><strong>🏆 Peringkat #${rank}</strong> di papan skor perangkat ini.</p></section>`
        : ''
    }
    ${leaderboard.length ? renderLeaderboardTable(leaderboard, 'Papan skor lokal', summary.at || null) : ''}
    ${badges}
    ${mistakes}`;
}

/**
 * Tabel papan skor lokal per perangkat.
 * @param {object[]} entries - entri terurut.
 * @param {string} title - judul kartu.
 * @param {string|null} highlightAt - timestamp entri sesi terbaru.
 * @returns {string} HTML kartu papan skor.
 */
export function renderLeaderboardTable(entries, title = 'Papan skor lokal', highlightAt = null) {
  const rows = entries
    .map((entry, index) => {
      const isNew = highlightAt !== null && entry.at === highlightAt;
      const modeIcon = entry.mode === 'time_attack' ? '⏱️' : '🎣';
      return `<li class="leaderboard__row${isNew ? ' leaderboard__row--new' : ''}">
        <span class="leaderboard__rank">${index + 1}</span>
        <span class="leaderboard__score">${Number(entry.score) || 0} XP</span>
        <span class="leaderboard__meta">${modeIcon} ${escapeHtml(entry.pack_id || 'Campur')} · ${Math.round((Number(entry.accuracy) || 0) * 100)}%</span>
      </li>`;
    })
    .join('');
  return `<section class="card"><h3>${escapeHtml(title)}</h3><ol class="leaderboard">${rows}</ol></section>`;
}

/**
 * Grid 10 lencana.
 * @param {object} progress - objek Progress.
 * @returns {string} HTML layar lencana.
 */
export function renderBadges(progress) {
  const earned = progress.badges || {};
  const count = Object.keys(earned).length;
  const cards = BADGES.map((badge) => {
    const isEarned = Object.hasOwn(earned, badge.badge_id);
    return `<div class="badge ${isEarned ? 'badge--earned' : 'badge--locked'}">
      <span class="badge__emoji" aria-hidden="true">${badge.emoji}</span>
      <span class="badge__name">${escapeHtml(badge.name)}</span>
      <span class="badge__requirement">${escapeHtml(badge.requirement)}</span>
      <span class="badge__requirement">${isEarned ? '✔ diperoleh' : '🔒 belum'}</span>
    </div>`;
  }).join('');
  return `<section class="card">
    <h1>Lencana</h1>
    <p class="pack__meta">${count}/${BADGES.length} diperoleh</p>
    <div class="badge-grid">${cards}</div>
  </section>`;
}

/**
 * Layar tentang: etika, privasi, dan pengelolaan data lokal.
 * @returns {string} HTML layar tentang.
 */
export function renderAbout() {
  return `<section class="card">
      <h1>Tentang PhishQuest</h1>
      <p>Game edukasi anti-phishing berbahasa Indonesia. Mainkan pesan-pesan simulasi, temukan red flag, dan latih kebiasaan verifikasi yang benar.</p>
      <h3>Etika &amp; legal</h3>
      <ul class="about-list">
        <li>Semua email, brand, dan domain di sini <strong>fiktif</strong>.</li>
        <li>Tidak ada pengiriman pesan sungguhan dan tidak ada kredensial yang dikumpulkan.</li>
        <li>Konten hanya untuk mengenali pola penipuan, bukan untuk membuat phishing.</li>
      </ul>
      <h3>Privasi</h3>
      <ul class="about-list">
        <li>Tanpa akun, tanpa email, tanpa cookie pelacak, tanpa analytics.</li>
        <li>Progres hanya tersimpan di penyimpanan lokal peramban ini.</li>
        <li>Ekspor berkas JSON kapan saja untuk memindahkan progres ke perangkat lain.</li>
      </ul>
    </section>
    <section class="card">
      <h3>Data lokal</h3>
      <p class="pack__meta">Ekspor, impor, atau hapus progres kapan saja.</p>
      <div class="btn-row">
        <button class="btn btn--ghost" data-action="export">⬇️ Ekspor</button>
        <button class="btn btn--ghost" data-action="import">⬆️ Impor</button>
        <button class="btn btn--ghost" data-action="reset">🗑️ Reset</button>
      </div>
      <input type="file" id="import-file" accept="application/json" class="visually-hidden" />
    </section>
    <section class="card">
      <h3>Kontribusi</h3>
      <p>Konten baru ditambahkan lewat berkas JSON di <code>content/packs/</code>. Jalankan validator dan test sebelum mengirim pull request.</p>
    </section>`;
}
