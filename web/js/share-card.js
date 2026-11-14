/**
 * Kartu skor yang bisa diunduh/dibagikan (v2.0).
 * Fungsi model murni dipisah dari canvas agar bisa diuji tanpa DOM.
 */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const MAX_ACCURACY = 1;

/**
 * Label pack yang aman ditampilkan di kartu.
 * @param {object} summary - SessionSummary.
 * @param {string} packLabel - label pack aktif.
 * @returns {string} nama pack atau "Campur Semua".
 */
function packName(summary, packLabel) {
  const label = String(packLabel || '').trim();
  if (label) return label;
  return summary && summary.pack_id ? String(summary.pack_id) : 'Campur Semua';
}

/**
 * Susun data yang digambar ke kartu skor. Tidak memuat nickname, IP, atau data perangkat.
 * @param {object} options - { summary, levelLabel, at, packLabel }.
 * @returns {object} model kartu yang siap digambar.
 */
export function buildShareCardModel({ summary, levelLabel = 'Amatir', at = '', packLabel = '' }) {
  const score = Math.max(0, Number(summary && summary.score) || 0);
  const maxScore = Math.max(1, Number(summary && summary.max_score) || 1);
  const accuracy = Math.min(
    MAX_ACCURACY,
    Math.max(0, Number(summary && summary.accuracy) || 0),
  );
  return {
    title: 'PhishQuest',
    tagline: 'Kenali umpan sebelum kamu terhook',
    pack: packName(summary, packLabel),
    score,
    maxScore,
    accuracy,
    accuracyText: `${Math.round(accuracy * 100)}%`,
    mode: summary && summary.mode === 'time_attack' ? 'Time Attack' : 'Klasik',
    streak: Math.max(0, Number(summary && summary.best_streak_in_session) || 0),
    level: String(levelLabel || 'Amatir'),
    at: String(at || ''),
    footer: 'Simulasi edukasi · tanpa data pribadi',
  };
}

/**
 * Nama berkas kartu skor.
 * @param {object} model - hasil buildShareCardModel.
 * @returns {string} nama berkas .png.
 */
export function shareCardFilename(model) {
  const pack = String(model.pack || 'campur')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `phishquest-${pack || 'campur'}-${model.score}xp.png`;
}

/**
 * Gambar kartu ke canvas 1200×630.
 * @param {CanvasRenderingContext2D} ctx - konteks canvas.
 * @param {object} model - hasil buildShareCardModel.
 * @param {{width?: number, height?: number}} [options] - ukuran kanvas.
 * @returns {{width: number, height: number}} ukuran yang digambar.
 */
export function drawShareCard(ctx, model, options = {}) {
  const width = Number(options.width) || CARD_WIDTH;
  const height = Number(options.height) || CARD_HEIGHT;
  const pad = 64;
  const scoreBoxTop = 230;

  ctx.clearRect(0, 0, width, height);
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#1E1B4B');
  background.addColorStop(0.55, '#4C1D95');
  background.addColorStop(1, '#0891B2');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(width - 130, 110, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, height - 20, 160, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#FDE68A';
  ctx.font = '700 26px "Baloo 2", "Trebuchet MS", sans-serif';
  ctx.fillText('🎣 PHISHQUEST', pad, 84);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 66px "Baloo 2", "Trebuchet MS", sans-serif';
  ctx.fillText(model.title, pad, 156);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '400 27px Nunito, "Segoe UI", sans-serif';
  ctx.fillText(model.tagline, pad, 196);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, pad, scoreBoxTop, width - pad * 2, 190, 28);
  ctx.fill();

  ctx.fillStyle = '#FDE68A';
  ctx.font = '700 112px "Baloo 2", "Trebuchet MS", sans-serif';
  ctx.fillText(String(model.score), pad + 34, scoreBoxTop + 128);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 30px Nunito, "Segoe UI", sans-serif';
  ctx.fillText('XP', pad + 40 + ctx.measureText(String(model.score)).width + 18, scoreBoxTop + 124);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '400 24px Nunito, "Segoe UI", sans-serif';
  ctx.fillText(`dari ${model.maxScore} XP maksimum`, pad + 36, scoreBoxTop + 162);

  const stats = [
    ['Akurasi', model.accuracyText],
    ['Streak', `${model.streak}`],
    ['Level', model.level],
  ];
  const statLeft = pad + 500;
  stats.forEach(([label, value], index) => {
    const x = statLeft + index * 200;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '400 22px Nunito, "Segoe UI", sans-serif';
    ctx.fillText(label, x, scoreBoxTop + 72);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 34px "Baloo 2", "Trebuchet MS", sans-serif';
    ctx.fillText(value, x, scoreBoxTop + 118);
  });

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 34px "Baloo 2", "Trebuchet MS", sans-serif';
  ctx.fillText(model.pack, pad, 486);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = '400 23px Nunito, "Segoe UI", sans-serif';
  ctx.fillText(`${model.mode}${model.at ? ` · ${model.at}` : ''}`, pad, 522);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '400 21px Nunito, "Segoe UI", sans-serif';
  ctx.fillText(model.footer, pad, height - 42);

  return { width, height };
}

/**
 * Buat kanvas kartu skor bila lingkungan mendukung canvas.
 * @param {object} model - hasil buildShareCardModel.
 * @param {Document} doc - dokumen pemilik kanvas.
 * @returns {HTMLCanvasElement} kanvas 1200×630.
 */
export function createShareCard(model, doc = document) {
  const canvas = doc.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
  drawShareCard(ctx, model, { width: CARD_WIDTH, height: CARD_HEIGHT });
  return canvas;
}

/**
 * Unduh kanvas sebagai PNG.
 * @param {HTMLCanvasElement} canvas - kanvas kartu.
 * @param {string} filename - nama berkas.
 * @returns {Promise<void>} selesai setelah unduhan dimulai.
 */
export function downloadShareCard(canvas, filename) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Kartu skor gagal dibuat.'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Bagikan kartu lewat Web Share API bila berkas didukung; jika tidak, unduh PNG.
 * @param {HTMLCanvasElement} canvas - kanvas kartu.
 * @param {string} filename - nama berkas.
 * @param {object} model - model kartu untuk teks berbagi.
 * @returns {Promise<'shared'|'downloaded'>} cara kartu dibagikan.
 */
export async function shareShareCard(canvas, filename, model) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], filename, { type: 'image/png' });
    const data = {
      files: [file],
      title: 'PhishQuest',
      text: `Skor PhishQuest: ${model.score}/${model.maxScore} XP · akurasi ${model.accuracyText}`,
    };
    if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(data);
        return 'shared';
      } catch (error) {
        if (error && error.name === 'AbortError') return 'shared';
        // Peramban menolak berbagi berkas: jatuh ke unduhan.
      }
    }
  }
  await downloadShareCard(canvas, filename);
  return 'downloaded';
}

/**
 * Gambar kotak bersudut tumpul.
 * @param {CanvasRenderingContext2D} ctx - konteks canvas.
 * @param {number} x - kiri.
 * @param {number} y - atas.
 * @param {number} width - lebar.
 * @param {number} height - tinggi.
 * @param {number} radius - radius sudut.
 * @returns {void}
 */
function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
