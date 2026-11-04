/**
 * Mini editor skenario (v1.1): validasi JSON yang ditempel pemain.
 * Aturan di sini mengikuti `scripts/validate_content.py` + `content_rules.py`
 * supaya hasil editor lolos validator untuk seluruh aturan per-skenario.
 */

export const TYPES = ['phish_or_legit', 'best_action', 'spot_redflag'];
export const DIFFICULTIES = ['mudah', 'sedang', 'sulit'];
export const CHANNELS = ['email', 'sms', 'whatsapp'];

/** Versi skema pack yang diterima `scripts/validate_content.py`. */
export const SCHEMA_VERSION = '1.0';

/** Jumlah skenario wajib per pack konten. */
export const SCENARIOS_PER_PACK = 10;

/** Prefix id per pack konten yang dikenal validator. */
export const PACK_PREFIX = {
  'ewallet-bank': 'ew',
  office: 'of',
  'shopping-courier': 'sc',
  'campus-gov': 'cg',
};

export const RED_FLAGS = [
  'PENGIRIM_TIDAK_WAJAR',
  'DOMAIN_PALSU',
  'DOMAIN_MIRIP',
  'TEKANAN_WAKTU',
  'ANCAMAN',
  'IMBALAN_BERLEBIHAN',
  'MEMINTA_DATA_SENSITIF',
  'LINK_MENCURIGAKAN',
  'LAMPIRAN_BERBAHAYA',
  'GRAMATIKA_AJANG',
  'SAPAAN_GENERIK',
  'SALURAN_TIDAK_WAJAR',
];

export const WHITELIST_DOMAINS = [
  'banknusa.example',
  'dompetku.example',
  'tokokilat.example',
  'kargocepat.example',
  'kampusnusantara.example',
  'sibantar.example',
  'asurkita.example',
  'lapakria.example',
];

/** Nama brand/instansi nyata yang tidak boleh dipakai (sama dengan validator). */
export const REAL_BRAND_NAMES = [
  'bca',
  'mandiri',
  'bni',
  'bsi',
  'cimb',
  'permata',
  'danamon',
  'ovo',
  'gopay',
  'shopeepay',
  'linkaja',
  'shopee',
  'tokopedia',
  'lazada',
  'blibli',
  'bukalapak',
  'jne',
  'jnt',
  'sicepat',
  'anteraja',
  'gojek',
  'grab',
  'telkomsel',
  'indosat',
  'smartfren',
  'dukcapil',
  'djp',
  'kemenkeu',
  'kominfo',
  'polri',
  'bssn',
];

const DANGEROUS_SUFFIXES = ['.exe', '.apk', '.js', '.html', '.scr', '.bat', '.cmd', '.vbs', '.jar'];
const ID_PATTERN = /^(ew|of|sc|cg)-[0-9]{3}$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/;

/** Komposisi minimum tipe soal per pack (PRD §9.4). */
const TYPE_MINIMUM = { phish_or_legit: 7, best_action: 2, spot_redflag: 1 };
/** Komposisi tepat tingkat kesulitan per pack. */
const DIFFICULTY_TARGET = { mudah: 3, sedang: 4, sulit: 3 };
/** Komposisi minimum kanal per pack. */
const CHANNEL_MINIMUM = { email: 3, sms: 3, whatsapp: 2 };
/** Jumlah target phishing dan legit per pack. */
const PHISH_TARGET = 6;
const LEGIT_TARGET = 4;
/** Cakupan minimum jenis red flag per pack. */
const MIN_RED_FLAG_COVERAGE = 7;
/** Deskripsi bawaan saat pack lokal tidak menyebutkannya. */
const DEFAULT_PACK_DESCRIPTION = 'Pack buatan sendiri dari editor PhishQuest.';
/** Emoji bawaan untuk pack lokal. */
const DEFAULT_PACK_EMOJI = '🛠️';

/**
 * Jumlah kata pada teks.
 * @param {string} text - teks masukan.
 * @returns {number} jumlah kata.
 */
function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Jumlah kalimat (mengikuti aturan validator: tanda akhir diikuti spasi/akhir).
 * @param {string} text - teks masukan.
 * @returns {number} jumlah kalimat.
 */
function sentenceCount(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return 0;
  const found = trimmed.match(/[.!?](?=\s|$)/g);
  return found ? found.length : 1;
}

/**
 * Domain bagian setelah '@'.
 * @param {string} address - alamat email.
 * @returns {string} domain huruf kecil, atau string kosong.
 */
function domainOf(address) {
  const value = String(address);
  const at = value.lastIndexOf('@');
  return at === -1 ? '' : value.slice(at + 1).toLowerCase();
}

/**
 * Cari brand/instansi nyata dalam teks.
 * @param {string} text - teks yang diperiksa.
 * @returns {string|null} nama brand yang cocok.
 */
function findRealBrand(text) {
  const lowered = String(text).toLowerCase();
  for (const name of REAL_BRAND_NAMES) {
    const pattern = new RegExp(`(?<![a-z0-9])${name}(?![a-z0-9])`);
    if (pattern.test(lowered)) return name;
  }
  return null;
}

/**
 * Validasi satu skenario terhadap aturan konten.
 * @param {object} scenario - objek skenario.
 * @param {number} [index] - urutan untuk label pesan.
 * @returns {string[]} daftar masalah; kosong berarti valid.
 */
export function validateScenario(scenario, index = 0) {
  const label = `skenario #${index + 1}`;
  const errors = [];
  const push = (message) => errors.push(`${label}: ${message}`);

  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    return [`${label}: harus berupa objek JSON`];
  }

  if (typeof scenario.id !== 'string' || !ID_PATTERN.test(scenario.id)) {
    push("id harus berpola 'ew-001' (prefix ew/of/sc/cg + 3 digit)");
  }
  if (!TYPES.includes(scenario.type)) push(`type harus salah satu dari ${TYPES.join(', ')}`);
  if (!DIFFICULTIES.includes(scenario.difficulty)) {
    push(`difficulty harus salah satu dari ${DIFFICULTIES.join(', ')}`);
  }
  if (!CHANNELS.includes(scenario.channel)) {
    push(`channel harus salah satu dari ${CHANNELS.join(', ')}`);
  }
  if (typeof scenario.datetime !== 'string' || !DATETIME_PATTERN.test(scenario.datetime)) {
    push('datetime harus ISO-8601 berakhiran +07:00, mis. 2026-11-03T09:00:00+07:00');
  }
  if (typeof scenario.body !== 'string' || !scenario.body.trim()) {
    push('body wajib string tidak kosong');
  } else if (wordCount(scenario.body) > 130) {
    push('body lebih dari 130 kata; ringkas pesannya');
  }
  if (scenario.channel === 'email' && (typeof scenario.subject !== 'string' || !scenario.subject.trim())) {
    push('kanal email wajib punya subject');
  }
  if (scenario.channel !== 'email' && scenario.subject !== null && scenario.subject !== undefined) {
    push('kanal SMS/WhatsApp harus subject = null');
  }

  const sender = scenario.sender;
  if (!sender || typeof sender !== 'object' || Array.isArray(sender)) {
    push('sender wajib objek {name, address}');
  } else {
    if (typeof sender.name !== 'string' || !sender.name.trim()) push('sender.name wajib diisi');
    if (typeof sender.address !== 'string' || !sender.address.trim()) {
      push('sender.address wajib diisi');
    }
    const brand = findRealBrand(`${sender.name} ${sender.address}`);
    if (brand) push(`pengirim memakai brand nyata '${brand}'; gunakan brand fiktif`);
    if (scenario.channel === 'email' && typeof sender.address === 'string') {
      const domain = domainOf(sender.address);
      if (!domain.includes('.')) {
        push('sender.address bukan alamat email yang valid');
      } else {
        const phish = scenario.is_phish !== false;
        if (phish && WHITELIST_DOMAINS.includes(domain)) {
          push('pesan phishing tidak boleh memakai domain resmi brand fiktif');
        }
        if (!phish && !WHITELIST_DOMAINS.includes(domain)) {
          push(`pesan legit wajib memakai domain resmi brand fiktif, bukan '${domain}'`);
        }
      }
    }
  }

  if (
    (scenario.type === 'phish_or_legit' || scenario.type === 'best_action') &&
    typeof scenario.is_phish !== 'boolean'
  ) {
    push(`${scenario.type} wajib punya is_phish (true/false)`);
  }

  const flags = scenario.red_flags;
  if (!Array.isArray(flags)) {
    push('red_flags wajib array');
  } else {
    for (const flag of flags) {
      if (!RED_FLAGS.includes(flag)) push(`red flag tidak dikenal: ${flag}`);
    }
    if (new Set(flags).size !== flags.length) push('red flag duplikat');
    if (scenario.is_phish !== false) {
      if (flags.length < 2 || flags.length > 5) push('skenario phishing wajib 2–5 red flag');
    } else if (flags.length > 0) {
      push('skenario legit wajib tanpa red flag');
    }
  }

  const link = scenario.link;
  if (link !== null && link !== undefined) {
    if (typeof link !== 'object' || Array.isArray(link)) {
      push('link harus objek {text, href} atau null');
    } else {
      if (typeof link.text !== 'string' || !link.text.trim()) push('link.text wajib diisi');
      if (typeof link.href !== 'string' || !/^https?:\/\/[^\s/]+/i.test(link.href)) {
        push('link.href harus URL http(s) yang valid');
      } else {
        const host = link.href.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
        const brand = findRealBrand(host);
        if (brand) push(`link.href memakai domain nyata '${brand}'`);
        const phish = scenario.is_phish !== false;
        if (phish && WHITELIST_DOMAINS.includes(host)) {
          push('tautan phishing tidak boleh menuju domain resmi');
        }
        if (!phish && !WHITELIST_DOMAINS.includes(host)) {
          push(`tautan pesan legit harus domain resmi, bukan '${host}'`);
        }
      }
    }
  }

  const attachment = scenario.attachment;
  if (attachment !== null && attachment !== undefined) {
    if (typeof attachment !== 'object' || Array.isArray(attachment)) {
      push('attachment harus objek {name, size_kb} atau null');
    } else {
      if (typeof attachment.name !== 'string' || !attachment.name.trim()) {
        push('attachment.name wajib diisi');
      }
      if (!Number.isInteger(attachment.size_kb) || attachment.size_kb < 0) {
        push('attachment.size_kb wajib bilangan bulat ≥ 0');
      }
    }
  }

  const dangerous =
    attachment && typeof attachment.name === 'string'
      ? DANGEROUS_SUFFIXES.some((suffix) => attachment.name.toLowerCase().endsWith(suffix))
      : false;
  const hasDangerFlag = Array.isArray(flags) && flags.includes('LAMPIRAN_BERBAHAYA');
  if (hasDangerFlag && !dangerous) {
    push('red flag LAMPIRAN_BERBAHAYA butuh lampiran berekstensi berbahaya');
  }
  if (dangerous && !hasDangerFlag) {
    push('lampiran berekstensi berbahaya wajib ditandai LAMPIRAN_BERBAHAYA');
  }

  const options = scenario.options;
  if (scenario.type === 'phish_or_legit') {
    if (options !== null && options !== undefined && Array.isArray(options) && options.length) {
      push('phish_or_legit tidak boleh punya options');
    }
    if (scenario.correct_option !== null && scenario.correct_option !== undefined) {
      push('phish_or_legit tidak boleh punya correct_option');
    }
  } else {
    if (!Array.isArray(options) || options.length < 3 || options.length > 4) {
      push(`${scenario.type} wajib punya 3–4 options`);
    } else {
      const ids = [];
      options.forEach((option) => {
        if (!option || typeof option !== 'object') {
          push('setiap option wajib objek {id, text}');
          return;
        }
        if (!/^[A-D]$/.test(String(option.id))) push("option.id harus 'A'–'D'");
        if (typeof option.text !== 'string' || !option.text.trim()) {
          push(`option ${option.id} tidak punya teks`);
        }
        ids.push(String(option.id));
      });
      if (new Set(ids).size !== ids.length) push('option.id duplikat');
      if (!ids.includes(String(scenario.correct_option))) {
        push('correct_option harus merujuk id option yang ada');
      }
    }
  }

  if (typeof scenario.explanation !== 'string' || !scenario.explanation.trim()) {
    push('explanation wajib diisi');
  } else if (sentenceCount(scenario.explanation) > 3) {
    push('explanation maksimal 3 kalimat');
  }

  const teach = scenario.teach;
  if (!teach || typeof teach !== 'object' || Array.isArray(teach)) {
    push('teach wajib objek {tip, verify_how}');
  } else {
    for (const key of ['tip', 'verify_how']) {
      const value = teach[key];
      if (typeof value !== 'string' || !value.trim()) {
        push(`teach.${key} wajib diisi`);
      } else if (sentenceCount(value) > 2) {
        push(`teach.${key} maksimal 2 kalimat`);
      }
    }
  }

  return errors;
}

/**
 * Ubah tempelan pemain menjadi pack yang bisa dimainkan.
 * @param {string} text - JSON mentah: satu skenario, array, atau pack.
 * @param {string} [name] - nama pack bila input tidak menyebutkan.
 * @returns {{pack: object|null, errors: string[]}} hasil parsing.
 */
export function parsePackText(text, name = 'Pack lokal') {
  let data;
  try {
    data = JSON.parse(String(text));
  } catch (error) {
    return { pack: null, errors: [`JSON tidak valid: ${error.message}`] };
  }

  let scenarios;
  let packName = name;
  let packId = 'kustom';
  let description = '';
  let emoji = '';
  if (Array.isArray(data)) {
    scenarios = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.scenarios)) {
    scenarios = data.scenarios;
    packName = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : name;
    packId = typeof data.pack_id === 'string' && data.pack_id.trim() ? data.pack_id.trim() : packId;
    description = typeof data.description === 'string' ? data.description : '';
    emoji = typeof data.emoji === 'string' ? data.emoji : '';
  } else if (data && typeof data === 'object') {
    scenarios = [data];
  } else {
    return { pack: null, errors: ['JSON harus objek skenario, array skenario, atau pack {scenarios}'] };
  }

  if (!scenarios.length) return { pack: null, errors: ['Tidak ada skenario di dalam input.'] };

  const errors = [];
  const seen = new Set();
  scenarios.forEach((scenario, index) => {
    errors.push(...validateScenario(scenario, index));
    if (scenario && typeof scenario.id === 'string') {
      if (seen.has(scenario.id)) errors.push(`id ${scenario.id} duplikat`);
      seen.add(scenario.id);
    }
  });
  if (errors.length) return { pack: null, errors };

  return {
    pack: {
      pack_id: packId,
      name: packName,
      description,
      emoji: emoji.trim() ? emoji : '🛠️',
      scenarios: scenarios.map((scenario) => ({ ...scenario })),
    },
    errors: [],
  };
}

/**
 * Periksa kesiapan pack lokal bila dipakai sebagai pack `content/`.
 *
 * Aturan tingkat pack di sini mencerminkan `validate_pack` di
 * `scripts/validate_content.py`. Aturan per-skenario tetap ditangani
 * `validateScenario`, jadi hasil `ready: true` berarti seluruh skenario valid
 * **dan** komposisi pack memenuhi PRD §9.4.
 *
 * @param {object} pack - pack lokal {pack_id, name, description, emoji, scenarios}.
 * @returns {{ready: boolean, issues: string[]}} status dan daftar alasan.
 */
export function validatePackShape(pack) {
  const issues = [];
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return { ready: false, issues: ['pack harus objek JSON {pack_id, name, scenarios}'] };
  }

  // Nilai yang dilengkapi `toContentPack` saat ekspor boleh kosong di pack lokal:
  // yang dinilai adalah bentuk akhir berkas yang akan dipakai `content/`.
  const shape = {
    ...pack,
    schema_version: pack.schema_version === undefined ? SCHEMA_VERSION : pack.schema_version,
    description:
      typeof pack.description === 'string' && pack.description.trim()
        ? pack.description
        : DEFAULT_PACK_DESCRIPTION,
    emoji: typeof pack.emoji === 'string' && pack.emoji.trim() ? pack.emoji : DEFAULT_PACK_EMOJI,
  };

  if (shape.schema_version !== SCHEMA_VERSION) {
    issues.push(`schema_version harus '${SCHEMA_VERSION}' agar diterima validator konten`);
  }
  const prefix = PACK_PREFIX[shape.pack_id];
  if (!prefix) {
    issues.push(
      `pack_id harus salah satu dari ${Object.keys(PACK_PREFIX).join(', ')}; validator konten hanya mengenal pack bawaan`,
    );
  }
  for (const key of ['pack_id', 'name', 'description', 'emoji']) {
    if (typeof shape[key] !== 'string' || !shape[key].trim()) {
      issues.push(`field pack '${key}' wajib string tidak kosong`);
    }
  }

  const scenarios = shape.scenarios;
  if (!Array.isArray(scenarios)) {
    issues.push("field 'scenarios' wajib array");
    return { ready: false, issues };
  }
  if (scenarios.length !== SCENARIOS_PER_PACK) {
    issues.push(`pack wajib ${SCENARIOS_PER_PACK} skenario, ada ${scenarios.length}`);
  }

  const items = scenarios.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
  if (!items.length) return { ready: issues.length === 0, issues };

  for (const [type, minimum] of Object.entries(TYPE_MINIMUM)) {
    const count = items.filter((item) => item.type === type).length;
    if (count < minimum) issues.push(`komposisi: ${type} ≥ ${minimum}, ada ${count}`);
  }
  for (const [difficulty, target] of Object.entries(DIFFICULTY_TARGET)) {
    const count = items.filter((item) => item.difficulty === difficulty).length;
    if (count !== target) {
      issues.push(`komposisi: ${target} skenario '${difficulty}', ada ${count}`);
    }
  }
  for (const [channel, minimum] of Object.entries(CHANNEL_MINIMUM)) {
    const count = items.filter((item) => item.channel === channel).length;
    if (count < minimum) issues.push(`komposisi: ≥ ${minimum} kanal ${channel}, ada ${count}`);
  }

  const phish = items.filter((item) => item.is_phish === true).length;
  const legit = items.filter((item) => item.is_phish === false).length;
  if (phish !== PHISH_TARGET || legit !== LEGIT_TARGET) {
    issues.push(
      `komposisi: target ${PHISH_TARGET} phishing / ${LEGIT_TARGET} legit, ada ${phish} / ${legit}`,
    );
  }

  const flags = new Set();
  for (const item of items) {
    for (const flag of Array.isArray(item.red_flags) ? item.red_flags : []) flags.add(flag);
  }
  if (flags.size < MIN_RED_FLAG_COVERAGE) {
    issues.push(`cakupan red flag ≥ ${MIN_RED_FLAG_COVERAGE} jenis, ada ${flags.size}`);
  }

  if (prefix) {
    const seen = new Set();
    for (const item of items) {
      const id = String(item.id);
      if (!id.startsWith(`${prefix}-`)) {
        issues.push(`id '${id}' wajib berprefix '${prefix}-' untuk pack ini`);
      }
      if (seen.has(id)) issues.push(`id skenario duplikat: ${id}`);
      seen.add(id);
    }
  }

  return { ready: issues.length === 0, issues };
}

/**
 * Bentuk pack lokal menjadi berkas pack `content/` (field pack lengkap).
 * @param {object} pack - pack lokal.
 * @returns {object} pack dengan schema_version, description, dan emoji.
 */
export function toContentPack(pack) {
  const description =
    typeof pack.description === 'string' && pack.description.trim()
      ? pack.description.trim()
      : DEFAULT_PACK_DESCRIPTION;
  return {
    schema_version: SCHEMA_VERSION,
    pack_id: pack.pack_id,
    name: pack.name,
    description,
    emoji: typeof pack.emoji === 'string' && pack.emoji.trim() ? pack.emoji : DEFAULT_PACK_EMOJI,
    scenarios: (pack.scenarios || []).map((scenario) => {
      // `label` hanya metadata tampilan di perangkat, bukan bagian skema konten.
      const copy = { ...scenario };
      delete copy.label;
      return copy;
    }),
  };
}

/**
 * Waktu sekarang dalam ISO-8601 zona +07:00 (format `datetime` konten).
 * @returns {string} contoh "2026-11-03T09:00:00+07:00".
 */
export function nowJakartaIso() {
  const shifted = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${shifted.toISOString().slice(0, 19)}+07:00`;
}

/**
 * Id skenario berikutnya yang belum terpakai pada satu pack.
 * @param {string[]} [existingIds] - id yang sudah dipakai.
 * @param {string} [prefix] - prefix pack (ew/of/sc/cg).
 * @returns {string} id berpola `{prefix}-{3 digit}`.
 */
export function nextScenarioId(existingIds = [], prefix = 'ew') {
  const taken = new Set(existingIds.map((id) => String(id)));
  let number = 1;
  while (taken.has(`${prefix}-${String(number).padStart(3, '0')}`)) number += 1;
  return `${prefix}-${String(number).padStart(3, '0')}`;
}

/**
 * Putuskan hasil penyimpanan editor tanpa menyentuh penyimpanan.
 * Autosave hanya boleh memperbarui pack yang sudah ada di daftar main; membuat pack baru
 * (termasuk draft yang pack sumbernya sudah dihapus) wajib lewat simpan eksplisit.
 * @param {object} [options] - kondisi penyimpanan.
 * @param {string[]} [options.problems] - masalah validasi skenario.
 * @param {boolean} [options.conflict] - true bila ID pack bentrok dengan pack lain.
 * @param {boolean} [options.inStore] - true bila pack sudah ada di daftar main.
 * @param {boolean} [options.explicit] - true untuk aksi simpan yang dipilih pengguna.
 * @returns {{stored: boolean, reason: 'invalid'|'conflict'|'draft-only'|null}} hasil.
 */
export function savePlan({
  problems = [],
  conflict = false,
  inStore = false,
  explicit = false,
} = {}) {
  if (problems.length) return { stored: false, reason: 'invalid' };
  if (conflict) return { stored: false, reason: 'conflict' };
  if (!inStore && !explicit) return { stored: false, reason: 'draft-only' };
  return { stored: true, reason: null };
}

/**
 * Draft yang pack-nya sudah tidak ada di daftar main.
 * Deteksi memakai keberadaan pack di daftar main (bukan hanya `source_pack_id`), sehingga draft
 * lama pra-v1.6.1 yang belum punya `source_pack_id` tetap dikenali sebagai draft yatim.
 * @param {object} draft - draft editor (memakai `pack_id`, `source_pack_id` opsional).
 * @param {object[]} packs - pack yang saat ini ada di daftar main.
 * @returns {boolean} true bila draft berasal dari pack yang sudah dihapus.
 */
export function draftIsOrphan(draft, packs = []) {
  if (!draft || typeof draft.pack_id !== 'string' || !draft.pack_id.trim()) return false;
  const packId = draft.pack_id.trim();
  return !packs.some((pack) => pack && String(pack.pack_id).trim() === packId);
}

/**
 * Bandingkan isi dua pack (nama + skenario) tanpa memedulikan urutan kunci tambahan.
 * @param {object} a - pack pertama.
 * @param {object} b - pack kedua.
 * @returns {boolean} true bila isinya identik.
 */
export function samePackContent(a, b) {
  if (!a || !b) return false;
  return (
    String(a.name || '') === String(b.name || '') &&
    JSON.stringify(a.scenarios || []) === JSON.stringify(b.scenarios || [])
  );
}

/**
 * Status satu draft terhadap daftar pack main.
 * @param {object} draft - draft editor.
 * @param {object[]} packs - pack yang ada di daftar main.
 * @returns {{orphan: boolean, identical: boolean, stored: boolean, label: string}} status draft.
 */
export function draftStatus(draft, packs = []) {
  const list = Array.isArray(packs) ? packs : [];
  const orphan = draftIsOrphan(draft, list);
  const stored = list.find((pack) => pack && pack.pack_id === (draft && draft.pack_id));
  if (!stored) {
    return { orphan: true, identical: false, stored: false, label: 'pack sumber sudah dihapus' };
  }
  const identical = samePackContent(draft, stored);
  return {
    orphan: false,
    identical,
    stored: true,
    label: identical ? 'isinya sama dengan pack tersimpan' : 'belum tersimpan',
  };
}

/**
 * Urutkan draft dari waktu edit terakhir (terbaru di atas); id dipakai sebagai pemecah seri.
 * @param {object[]} drafts - daftar draft.
 * @returns {object[]} salinan daftar yang sudah terurut.
 */
export function sortDrafts(drafts = []) {
  return [...(Array.isArray(drafts) ? drafts : [])].sort((a, b) => {
    const left = String((a && a.updated_at) || '');
    const right = String((b && b.updated_at) || '');
    if (left !== right) return left < right ? 1 : -1;
    return String((a && a.pack_id) || '').localeCompare(String((b && b.pack_id) || ''));
  });
}

/**
 * Putuskan apakah draft boleh ditulis, berhenti karena isinya sama, atau berhenti karena versi
 * di penyimpanan lebih baru (mis. tab lain menyimpan belakangan).
 * @param {object} [options] - waktu versi tab ini, waktu versi tersimpan, dan status isi.
 * @returns {{write: boolean, conflict: boolean, reason: string}} keputusan penulisan.
 */
export function draftWriteDecision({ incomingAt = '', storedAt = '', sameContent = false } = {}) {
  const incoming = String(incomingAt || '');
  const stored = String(storedAt || '');
  if (!stored) return { write: true, conflict: false, reason: 'new' };
  if (sameContent) return { write: false, conflict: false, reason: 'identical' };
  if (stored > incoming) return { write: false, conflict: true, reason: 'remote-newer' };
  return { write: true, conflict: false, reason: stored === incoming ? 'same-time' : 'newer' };
}

/**
 * Deteksi draft yang sedang dibuka di editor sudah dihapus di tab lain.
 * Draft dianggap hilang hanya bila editor memang melacak sebuah draft dan draft itu tidak ada
 * lagi di perangkat; isi editor tetap dianggap utuh dan bisa disimpan ulang.
 * @param {object} [options] - id draft terlacak, daftar draft di perangkat, isi editor, dan pack tersimpan.
 * @returns {{lost: boolean, reason: string, packId: string|null, recoverable: boolean}} status draft.
 */
export function draftDeletionNotice({
  draftId = '',
  storedDrafts = [],
  pack = null,
  storedPack = null,
} = {}) {
  const tracked = String(draftId || '').trim();
  if (!tracked || !pack) {
    return { lost: false, reason: 'untracked', packId: null, recoverable: false };
  }
  const drafts = Array.isArray(storedDrafts) ? storedDrafts : [];
  const present = drafts.some((draft) => draft && draft.pack_id === tracked);
  if (present) return { lost: false, reason: 'present', packId: tracked, recoverable: false };
  const recoverable = !storedPack || !samePackContent(pack, storedPack);
  return { lost: true, reason: 'deleted-elsewhere', packId: tracked, recoverable };
}

const PACK_MERGE_FIELDS = ['pack_id', 'name', 'description', 'emoji'];

/** Apakah dua nilai sama sebagai data (objek/array dibandingkan isinya). */
function sameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

/**
 * Aturan tiga arah untuk satu field: hanya sisi yang berubah yang menang.
 * Bila kedua sisi berubah dengan nilai berbeda, isi tab ini dipakai dan bentrok dicatat.
 * @param {*} baseValue - nilai pada versi dasar (leluhur bersama).
 * @param {*} oursValue - nilai di tab ini.
 * @param {*} theirsValue - nilai di draft tersimpan (tab lain).
 * @returns {{value: *, conflict: boolean}} nilai hasil dan status bentrok.
 */
function pickField(baseValue, oursValue, theirsValue) {
  if (sameValue(oursValue, theirsValue)) return { value: oursValue, conflict: false };
  if (sameValue(oursValue, baseValue)) return { value: theirsValue, conflict: false };
  if (sameValue(theirsValue, baseValue)) return { value: oursValue, conflict: false };
  return { value: oursValue, conflict: true };
}

/**
 * Gabungkan skenario yang sama di kedua sisi, field demi field.
 * @param {object|null} baseScenario - skenario pada versi dasar.
 * @param {object} oursScenario - skenario di tab ini.
 * @param {object} theirsScenario - skenario di draft tersimpan.
 * @param {object[]} conflicts - daftar bentrok yang ditambah bila ada.
 * @returns {object} skenario hasil gabungan.
 */
function mergeScenarioFields(baseScenario, oursScenario, theirsScenario, conflicts) {
  const keys = new Set([...Object.keys(oursScenario), ...Object.keys(theirsScenario)]);
  const merged = {};
  for (const key of keys) {
    if (key === 'id') {
      merged.id = oursScenario.id;
      continue;
    }
    const result = pickField(
      baseScenario ? baseScenario[key] : undefined,
      oursScenario[key],
      theirsScenario[key],
    );
    merged[key] = result.value;
    if (result.conflict) {
      conflicts.push({ scope: 'scenario', id: String(oursScenario.id), field: key });
    }
  }
  return merged;
}

/**
 * Gabungkan draft tab ini dengan draft tersimpan memakai leluhur bersama.
 * Perubahan yang hanya ada di satu sisi diambil; perubahan yang bentrok memakai isi tab ini dan
 * dilaporkan lewat `conflicts` agar editor bisa menjelaskannya.
 * @param {object} [options] - versi dasar, isi tab ini, dan draft tersimpan.
 * @returns {{pack: object|null, conflicts: object[], merged: boolean}} hasil penggabungan.
 */
export function mergeDraftPack({ base = null, ours = null, theirs = null } = {}) {
  if (!ours || !theirs) {
    return { pack: ours || theirs || null, conflicts: [], merged: false };
  }
  const conflicts = [];
  const merged = {};
  for (const field of PACK_MERGE_FIELDS) {
    const result = pickField(base ? base[field] : undefined, ours[field], theirs[field]);
    merged[field] = result.value;
    if (result.conflict) conflicts.push({ scope: 'pack', id: null, field });
  }

  const oursList = Array.isArray(ours.scenarios) ? ours.scenarios : [];
  const theirsList = Array.isArray(theirs.scenarios) ? theirs.scenarios : [];
  const baseList = Array.isArray(base && base.scenarios) ? base.scenarios : [];
  const byId = (list) =>
    new Map(
      list
        .filter((scenario) => scenario && scenario.id != null)
        .map((scenario) => [String(scenario.id), scenario]),
    );
  const baseMap = byId(baseList);
  const oursMap = byId(oursList);
  const theirsMap = byId(theirsList);

  // Urutan draft tersimpan dipertahankan; skenario yang hanya ada di tab ini ditambahkan di akhir.
  const order = theirsList.map((scenario) => String(scenario && scenario.id));
  for (const scenario of oursList) {
    const id = String(scenario && scenario.id);
    if (!order.includes(id)) order.push(id);
  }

  const scenarios = [];
  for (const id of order) {
    const mine = oursMap.get(id);
    const other = theirsMap.get(id);
    const ancestor = baseMap.get(id);
    if (mine && other) {
      scenarios.push(mergeScenarioFields(ancestor || null, mine, other, conflicts));
      continue;
    }
    if (mine) {
      // Dihapus di draft tersimpan. Bila isi tab ini masih sama dengan versi dasar, ikuti penghapusan.
      if (ancestor && sameValue(mine, ancestor)) continue;
      scenarios.push(mine);
      if (ancestor) conflicts.push({ scope: 'scenario', id, field: 'deleted-elsewhere' });
      continue;
    }
    if (other) {
      // Dihapus di tab ini. Bila versi tersimpan tidak berubah, penghapusan dipertahankan.
      if (ancestor && sameValue(other, ancestor)) continue;
      scenarios.push(other);
      if (ancestor) conflicts.push({ scope: 'scenario', id, field: 'deleted-here' });
    }
  }
  merged.scenarios = scenarios;
  return { pack: merged, conflicts, merged: true };
}

/**
 * Bandingkan dua potret daftar draft untuk mendeteksi draft yang dihapus di tab lain.
 * Perubahan ditentukan oleh id draft; `name` hanya dibawa untuk merangkai pesan ke pengguna.
 * @param {object[]} previousDrafts - potret daftar draft sebelum kejadian penyimpanan.
 * @param {object[]} nextDrafts - daftar draft terbaru dari perangkat.
 * @returns {{changed: boolean, removed: object[], added: object[]}} beda kedua daftar.
 */
export function draftListChange(previousDrafts = [], nextDrafts = []) {
  const rowsOf = (list) =>
    (Array.isArray(list) ? list : [])
      .filter((draft) => draft && typeof draft.pack_id === 'string' && draft.pack_id.trim())
      .map((draft) => ({ pack_id: draft.pack_id, name: String(draft.name || '') }));
  const previous = rowsOf(previousDrafts);
  const next = rowsOf(nextDrafts);
  const previousIds = new Set(previous.map((draft) => draft.pack_id));
  const nextIds = new Set(next.map((draft) => draft.pack_id));
  const removed = previous.filter((draft) => !nextIds.has(draft.pack_id));
  const added = next.filter((draft) => !previousIds.has(draft.pack_id));
  return { changed: removed.length > 0 || added.length > 0, removed, added };
}

/**
 * Daftar draft siap tampil, termasuk draft yang isinya sama dengan pack tersimpan.
 * Urutannya selalu dari waktu edit terakhir.
 * @param {object[]} drafts - draft dari perangkat.
 * @param {object[]} packs - pack yang ada di daftar main.
 * @returns {object[]} draft dengan status {orphan, identical, stored, label}.
 */
export function listDrafts(drafts = [], packs = []) {
  const rows = (Array.isArray(drafts) ? drafts : [])
    .filter((draft) => draft && typeof draft.pack_id === 'string' && draft.pack_id.trim())
    .map((draft) => ({ ...draft, ...draftStatus(draft, packs) }));
  return sortDrafts(rows);
}

/**
 * Putuskan apakah penekanan tombol harus menghapus skenario yang sedang dibuka di editor.
 * Pintasan hanya Alt+Backspace atau Alt+Delete, tidak aktif saat pengguna mengetik, saat ada
 * dialog terbuka, saat tidak ada skenario, dan saat skenario tinggal satu (agar pack tidak kosong
 * karena satu tekan tombol yang tidak disengaja).
 * @param {object} [options] - tombol, modifier, status fokus, jumlah skenario, indeks, dan dialog.
 * @returns {{delete: boolean, reason: 'ok'|'key'|'modifier'|'text-entry'|'dialog-open'|'last-scenario'|'index'}} keputusan.
 */
export function deleteScenarioShortcut({
  key = '',
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  isTextEntry = false,
  scenarioCount = 0,
  index = -1,
  dialogOpen = false,
} = {}) {
  const pressed = String(key || '').toUpperCase();
  if (isTextEntry) return { delete: false, reason: 'text-entry' };
  if (dialogOpen) return { delete: false, reason: 'dialog-open' };
  if (!altKey || ctrlKey || metaKey) return { delete: false, reason: 'modifier' };
  if (pressed !== 'BACKSPACE' && pressed !== 'DELETE') return { delete: false, reason: 'key' };
  const count = Number(scenarioCount) || 0;
  if (count <= 1) return { delete: false, reason: 'last-scenario' };
  const position = Number(index);
  if (!Number.isInteger(position) || position < 0 || position >= count) {
    return { delete: false, reason: 'index' };
  }
  return { delete: true, reason: 'ok' };
}

/**
 * Putuskan apakah penekanan tombol harus memindahkan pilihan ke skenario sebelumnya/berikutnya.
 * Pintasan Alt+↑ dan Alt+↓ hanya bergerak selama skenario tujuan ada; di ujung daftar tidak ada
 * gerakan sama sekali supaya pilihan tidak berputar tanpa disadari.
 * @param {object} [options] - tombol, modifier, status fokus, jumlah skenario, indeks, dan dialog.
 * @returns {{move: number, reason: 'ok'|'key'|'modifier'|'text-entry'|'dialog-open'|'index'|'edge'}} arah gerak (-1/0/1).
 */
export function scenarioNavShortcut({
  key = '',
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  isTextEntry = false,
  scenarioCount = 0,
  index = 0,
  dialogOpen = false,
} = {}) {
  const pressed = String(key || '').toUpperCase();
  if (isTextEntry) return { move: 0, reason: 'text-entry' };
  if (dialogOpen) return { move: 0, reason: 'dialog-open' };
  if (!altKey || ctrlKey || metaKey) return { move: 0, reason: 'modifier' };
  const step = pressed === 'ARROWUP' ? -1 : pressed === 'ARROWDOWN' ? 1 : 0;
  if (!step) return { move: 0, reason: 'key' };
  const count = Number(scenarioCount) || 0;
  const position = Number(index);
  if (!Number.isInteger(position) || position < 0 || position >= count) {
    return { move: 0, reason: 'index' };
  }
  const target = position + step;
  if (target < 0 || target >= count) return { move: 0, reason: 'edge' };
  return { move: step, reason: 'ok' };
}

/**
 * Apakah fokus berada di kolom teks, sehingga pintasan keyboard harus diabaikan.
 * @param {string} tagName - nama tag elemen aktif.
 * @param {boolean} isContentEditable - true bila elemen aktif contenteditable.
 * @returns {boolean} true bila pengguna sedang mengetik.
 */
export function isTextEntryTarget(tagName, isContentEditable = false) {
  const tag = String(tagName || '').toUpperCase();
  return isContentEditable === true || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Gandakan satu skenario dengan id baru yang mengikuti prefix pack.
 * Salinan diletakkan tepat setelah skenario asli dan memakai id berikutnya yang belum terpakai,
 * sehingga hasilnya langsung lolos `validateScenario`.
 * @param {object[]} scenarios - daftar skenario.
 * @param {number} index - indeks skenario yang digandakan.
 * @param {string} [prefix] - prefix id pack (ew/of/sc/cg).
 * @returns {object[]} daftar baru berisi salinan; tidak berubah bila indeks di luar jangkauan.
 */
export function duplicateScenario(scenarios, index, prefix = 'ew') {
  const list = [...(scenarios || [])];
  const source = list[index];
  if (!source || typeof source !== 'object') return list;
  const ids = list.map((scenario) => (scenario && scenario.id != null ? scenario.id : null));
  const copy = {
    ...source,
    id: nextScenarioId(ids, prefix),
    label: `${String(source.label || source.id || 'Skenario')} (salinan)`,
    sender: { ...(source.sender || {}) },
    link: source.link ? { ...source.link } : null,
    attachment: source.attachment ? { ...source.attachment } : null,
    options: Array.isArray(source.options) ? source.options.map((option) => ({ ...option })) : null,
    red_flags: Array.isArray(source.red_flags) ? [...source.red_flags] : [],
    teach: { ...(source.teach || {}) },
  };
  list.splice(index + 1, 0, copy);
  return list;
}

/**
 * Skenario baru yang sudah lolos aturan per-skenario.
 * @param {string[]} [existingIds] - id yang sudah dipakai pada pack.
 * @param {string} [prefix] - prefix id pack.
 * @returns {object} skenario siap edit.
 */
export function createScenarioTemplate(existingIds = [], prefix = 'ew') {
  return {
    label: 'Skenario baru',
    id: nextScenarioId(existingIds, prefix),
    type: 'phish_or_legit',
    difficulty: 'mudah',
    channel: 'email',
    sender: { name: 'DompetKu', address: 'keamanan@dompetku-verifikasi.example' },
    subject: 'Verifikasi akun Anda',
    datetime: nowJakartaIso(),
    body: 'Halo, akun Anda dibatasi. Buka tautan berikut dalam 1x24 jam untuk verifikasi dan kirim kode OTP Anda.',
    link: {
      text: 'dompetku-verifikasi.example/aktifkan',
      href: 'http://dompetku-verifikasi.example/aktifkan',
    },
    attachment: null,
    options: null,
    is_phish: true,
    correct_option: null,
    red_flags: ['DOMAIN_PALSU', 'MEMINTA_DATA_SENSITIF', 'TEKANAN_WAKTU'],
    explanation:
      'Domain dompetku-verifikasi.example bukan dompetku.example, dan OTP tidak pernah diminta lewat email.',
    teach: {
      tip: 'Kode OTP tidak boleh dibagikan kepada siapa pun.',
      verify_how: 'Buka aplikasi DompetKu langsung dan cek notifikasi di sana.',
    },
  };
}

/**
 * Susun ulang skenario tanpa mengubah objek aslinya.
 * @param {object[]} scenarios - daftar skenario.
 * @param {number} from - indeks asal.
 * @param {number} to - indeks tujuan.
 * @returns {object[]} daftar baru; tidak berubah bila indeks di luar jangkauan.
 */
export function moveScenario(scenarios, from, to) {
  const list = [...(scenarios || [])];
  if (from === to) return list;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return list;
}

/**
 * Selaraskan prefix id seluruh skenario dengan pack konten yang dipilih.
 * Id dinomori ulang `{prefix}-001`, `{prefix}-002`, ... agar unik dan sesuai pack.
 * @param {object[]} scenarios - daftar skenario.
 * @param {string} prefix - prefix tujuan (ew/of/sc/cg).
 * @returns {object[]} daftar baru dengan id baru; tidak berubah bila prefix tak dikenal.
 */
export function alignScenarioPrefixes(scenarios, prefix) {
  const list = [...(scenarios || [])];
  if (!prefix || !Object.values(PACK_PREFIX).includes(prefix)) return list;
  return list.map((scenario, index) => ({
    ...scenario,
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
  }));
}

/**
 * Alasan pack lokal tidak boleh diekspor sebagai pack `content/`.
 * @param {object} pack - pack lokal.
 * @returns {string|null} pesan penolakan, atau null bila ekspor boleh.
 */
export function exportBlocker(pack) {
  if (!pack || typeof pack !== 'object') return 'Belum ada pack lokal untuk diekspor.';
  const packId = String(pack.pack_id ?? '').trim();
  if (!packId) return 'Ekspor ditolak: ID pack belum diisi.';
  if (!PACK_PREFIX[packId]) {
    return `Ekspor ditolak: pack_id '${packId}' tidak dikenal validator, jadi berkasnya tidak bisa dipakai di content/. Pilih salah satu dari ${Object.keys(PACK_PREFIX).join(', ')}.`;
  }
  if (!Array.isArray(pack.scenarios) || !pack.scenarios.length) {
    return 'Ekspor ditolak: pack belum punya skenario.';
  }
  return null;
}

/**
 * Cari pack lain yang sudah memakai `pack_id` yang sama.
 * Dipakai editor agar mengganti ID pack tidak menimpa pack lain secara diam-diam.
 * @param {object} pack - pack yang sedang diedit.
 * @param {object[]} packs - pack tersimpan atau draft yang sudah ada.
 * @param {string|null} [editingId] - id pack yang sedang diedit (dilewati).
 * @returns {{pack_id: string, name: string, scenarios: number}|null} pack bentrok.
 */
export function findPackIdConflict(pack, packs, editingId = null) {
  if (!pack || !Array.isArray(packs)) return null;
  const packId = String(pack.pack_id ?? '').trim();
  if (!packId) return null;
  const editing = editingId == null ? null : String(editingId);
  const other = packs.find(
    (item) => item && String(item.pack_id ?? '').trim() === packId && String(item.pack_id) !== editing,
  );
  if (!other) return null;
  return {
    pack_id: packId,
    name: String(other.name || packId),
    scenarios: Array.isArray(other.scenarios) ? other.scenarios.length : 0,
  };
}

/** Contoh pack yang lolos validator, dipakai tombol "Muat contoh". */
export const SAMPLE_PACK = JSON.stringify(
  {
    pack_id: 'kustom',
    name: 'Pack lokal saya',
    scenarios: [
      {
        id: 'ew-201',
        type: 'phish_or_legit',
        difficulty: 'sedang',
        channel: 'email',
        sender: { name: 'DompetKu', address: 'keamanan@dompetku-verifikasi.example' },
        subject: 'Verifikasi akun Anda',
        datetime: '2026-11-03T09:00:00+07:00',
        body: 'Halo, akun Anda dibatasi. Buka tautan berikut dalam 1x24 jam untuk verifikasi dan kirim kode OTP Anda.',
        link: {
          text: 'dompetku-verifikasi.example/aktifkan',
          href: 'http://dompetku-verifikasi.example/aktifkan',
        },
        attachment: null,
        options: null,
        is_phish: true,
        correct_option: null,
        red_flags: ['DOMAIN_PALSU', 'MEMINTA_DATA_SENSITIF', 'TEKANAN_WAKTU'],
        explanation:
          'Domain dompetku-verifikasi.example bukan dompetku.example, dan OTP tidak pernah diminta lewat email.',
        teach: {
          tip: 'Kode OTP tidak boleh dibagikan kepada siapa pun.',
          verify_how: 'Buka aplikasi DompetKu langsung dan cek notifikasi di sana.',
        },
      },
      {
        id: 'of-201',
        type: 'best_action',
        difficulty: 'mudah',
        channel: 'sms',
        sender: { name: 'HRD Korporat', address: '0811-2000-3000' },
        subject: null,
        datetime: '2026-11-03T10:00:00+07:00',
        body: 'Slip gaji November sudah bisa diunduh di portal payroll kantor. Tidak ada data yang perlu dikirim.',
        link: null,
        attachment: null,
        options: [
          { id: 'A', text: 'Balas dengan PIN gaji' },
          { id: 'B', text: 'Buka portal payroll resmi kantor' },
          { id: 'C', text: 'Kirim kode OTP lewat SMS' },
          { id: 'D', text: 'Abaikan informasi gaji' },
        ],
        is_phish: false,
        correct_option: 'B',
        red_flags: [],
        explanation: 'Pesan hanya mengabarkan slip gaji tanpa meminta data sensitif apa pun.',
        teach: {
          tip: 'Akses portal lewat alamat resmi kantor.',
          verify_how: 'Buka aplikasi payroll kantor secara langsung.',
        },
      },
    ],
  },
  null,
  2,
);
