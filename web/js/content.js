/**
 * Pemuatan konten PhishQuest (manifest & pack) serta model error PQError.
 * Dipisah dari engine.js agar aturan main dan I/O konten punya tanggung jawab jelas.
 */

/** Error bertanda kode sesuai api-specification §3.4. */
export class PQError extends Error {
  /**
   * @param {string} code - kode error (mis. CONTENT_INVALID).
   * @param {string} message - pesan ramah untuk pemain.
   */
  constructor(code, message) {
    super(message || code);
    this.name = 'PQError';
    this.code = code;
  }
}

export const SCHEMA_VERSION = '1.0';

/**
 * Kandidat lokasi konten, dicoba berurutan sesuai struktur halaman.
 * Halaman pengembangan disajikan dari `/web/` sehingga konten ada di `../content/`,
 * sedangkan GitHub Pages menaruh konten di subdirektori yang sama (`./content/`).
 * Urutan dipilih agar permintaan pertama sudah benar dan konsol tetap bersih.
 * @returns {string[]} daftar kandidat basis konten.
 */
function contentCandidates() {
  const path = typeof location === 'undefined' ? '' : location.pathname;
  return path.includes('/web/')
    ? ['../content/', './content/', 'content/']
    : ['./content/', '../content/', 'content/'];
}

const CONTENT_CANDIDATES = contentCandidates();
let contentBase = null;

/**
 * Tentukan basis URL konten yang tersedia.
 * @returns {Promise<string>} basis seperti "./content/".
 */
export async function resolveContentBase() {
  if (contentBase) return contentBase;
  for (const candidate of CONTENT_CANDIDATES) {
    try {
      const response = await fetch(`${candidate}manifest.json`, { cache: 'no-cache' });
      if (response.ok) {
        contentBase = candidate;
        return candidate;
      }
    } catch (error) {
      // kandidat berikutnya
    }
  }
  throw new PQError(
    'CONTENT_UNAVAILABLE',
    'Konten tidak dapat dimuat. Periksa koneksi lalu muat ulang.',
  );
}

/**
 * Muat manifest.json.
 * @param {string|null} [base] - basis konten; default hasil resolveContentBase.
 * @returns {Promise<object>} manifest tervalidasi.
 */
export async function loadManifest(base = null) {
  const directory = base || (await resolveContentBase());
  let data;
  try {
    const response = await fetch(`${directory}manifest.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    throw new PQError('CONTENT_UNAVAILABLE', 'Manifest konten gagal dimuat.');
  }
  if (!data || String(data.schema_version).split('.')[0] !== SCHEMA_VERSION.split('.')[0]) {
    throw new PQError('CONTENT_INVALID', 'Versi skema konten tidak didukung.');
  }
  if (!Array.isArray(data.packs) || data.packs.length === 0) {
    throw new PQError('CONTENT_INVALID', 'Manifest tidak memuat pack.');
  }
  return data;
}

/**
 * Muat satu pack berdasarkan id.
 * @param {string} packId - id pack dari manifest.
 * @param {string|null} [base] - basis konten.
 * @returns {Promise<object>} pack tervalidasi.
 */
export async function loadPack(packId, base = null) {
  const directory = base || (await resolveContentBase());
  const manifest = await loadManifest(directory);
  const entry = manifest.packs.find((pack) => pack.pack_id === packId);
  if (!entry) throw new PQError('CONTENT_INVALID', `Pack '${packId}' tidak ada di manifest.`);
  let data;
  try {
    const response = await fetch(`${directory}${entry.file}`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    throw new PQError('CONTENT_UNAVAILABLE', `Pack '${packId}' gagal dimuat.`);
  }
  if (!data || String(data.schema_version).split('.')[0] !== SCHEMA_VERSION.split('.')[0]) {
    throw new PQError('CONTENT_INVALID', `Versi skema pack '${packId}' tidak didukung.`);
  }
  if (!Array.isArray(data.scenarios) || data.scenarios.length === 0) {
    throw new PQError('CONTENT_INVALID', `Pack '${packId}' tidak berisi skenario.`);
  }
  return data;
}

/**
 * Muat semua pack (mode Campur).
 * @param {string|null} [base] - basis konten.
 * @returns {Promise<object[]>} daftar pack.
 */
export async function loadAllPacks(base = null) {
  const directory = base || (await resolveContentBase());
  const manifest = await loadManifest(directory);
  const packs = [];
  for (const entry of manifest.packs) {
    packs.push(await loadPack(entry.pack_id, directory));
  }
  return packs;
}
