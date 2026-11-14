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
const translationCache = new Map();

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
 * Muat berkas terjemahan konten untuk locale non-Indonesia.
 * @param {string} locale - kode locale (mis. "en").
 * @param {string} directory - basis konten.
 * @returns {Promise<object|null>} terjemahan atau null untuk "id".
 */
async function loadTranslations(locale, directory) {
  if (!locale || locale === 'id') return null;
  const key = `${directory}:${locale}`;
  if (translationCache.has(key)) return translationCache.get(key);
  try {
    const response = await fetch(`${directory}i18n/${locale}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !data.scenarios || typeof data.scenarios !== 'object') {
      throw new Error('struktur terjemahan tidak valid');
    }
    translationCache.set(key, data);
    return data;
  } catch (error) {
    throw new PQError(
      'CONTENT_UNAVAILABLE',
      `Terjemahan konten '${locale}' gagal dimuat.`,
    );
  }
}

/**
 * Terapkan terjemahan pack pada nama/deskripsi dan setiap skenario.
 * @param {object} pack - pack asli (tidak diubah).
 * @param {object|null} translations - isi i18n/<locale>.json.
 * @returns {object} salinan pack berbahasa target.
 */
export function applyPackTranslation(pack, translations) {
  if (!translations) return pack;
  const meta = (translations.packs && translations.packs[pack.pack_id]) || {};
  const scenarios = (pack.scenarios || []).map((scenario) => {
    const entry = (translations.scenarios && translations.scenarios[scenario.id]) || null;
    if (!entry) return scenario;
    const next = {
      ...scenario,
      subject: entry.subject !== undefined ? entry.subject : scenario.subject,
      body: entry.body || scenario.body,
      explanation: entry.explanation || scenario.explanation,
      teach: {
        ...scenario.teach,
        ...(entry.teach || {}),
      },
    };
    if (Array.isArray(scenario.options) && entry.options) {
      next.options = scenario.options.map((option) => ({
        ...option,
        text: entry.options[option.id] || option.text,
      }));
    }
    if (scenario.attachment && entry.attachment_name) {
      next.attachment = { ...scenario.attachment, name: entry.attachment_name };
    }
    return next;
  });
  return {
    ...pack,
    name: meta.name || pack.name,
    description: meta.description || pack.description,
    scenarios,
  };
}

/**
 * Terapkan terjemahan nama/deskripsi pack pada manifest.
 * @param {object} manifest - manifest asli.
 * @param {object|null} translations - isi i18n/<locale>.json.
 * @returns {object} salinan manifest berbahasa target.
 */
export function applyManifestTranslation(manifest, translations) {
  if (!translations || !translations.packs) return manifest;
  return {
    ...manifest,
    packs: manifest.packs.map((pack) => ({
      ...pack,
      ...(translations.packs[pack.pack_id] || {}),
    })),
  };
}

/**
 * Muat manifest.json, dengan terjemahan bila locale bukan "id".
 * @param {string|null} [base] - basis konten; default hasil resolveContentBase.
 * @param {string} [locale] - locale tampilan.
 * @returns {Promise<object>} manifest tervalidasi.
 */
export async function loadManifest(base = null, locale = 'id') {
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
  return applyManifestTranslation(data, await loadTranslations(locale, directory));
}

/**
 * Muat satu pack berdasarkan id.
 * @param {string} packId - id pack dari manifest.
 * @param {string|null} [base] - basis konten.
 * @param {string} [locale] - locale tampilan.
 * @returns {Promise<object>} pack tervalidasi.
 */
export async function loadPack(packId, base = null, locale = 'id') {
  const directory = base || (await resolveContentBase());
  const manifest = await loadManifest(directory, locale);
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
  return applyPackTranslation(data, await loadTranslations(locale, directory));
}

/**
 * Muat semua pack (mode Campur).
 * @param {string|null} [base] - basis konten.
 * @param {string} [locale] - locale tampilan.
 * @returns {Promise<object[]>} daftar pack.
 */
export async function loadAllPacks(base = null, locale = 'id') {
  const directory = base || (await resolveContentBase());
  const manifest = await loadManifest(directory, locale);
  const packs = [];
  for (const entry of manifest.packs) {
    packs.push(await loadPack(entry.pack_id, directory, locale));
  }
  return packs;
}
