/**
 * Mini editor skenario (v1.1): validasi JSON yang ditempel pemain.
 * Aturan di sini mengikuti `scripts/validate_content.py` + `content_rules.py`
 * supaya hasil editor lolos validator untuk seluruh aturan per-skenario.
 */

export const TYPES = ['phish_or_legit', 'best_action', 'spot_redflag'];
export const DIFFICULTIES = ['mudah', 'sedang', 'sulit'];
export const CHANNELS = ['email', 'sms', 'whatsapp'];

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
  if (Array.isArray(data)) {
    scenarios = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.scenarios)) {
    scenarios = data.scenarios;
    packName = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : name;
    packId = typeof data.pack_id === 'string' && data.pack_id.trim() ? data.pack_id.trim() : packId;
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
      emoji: '🛠️',
      scenarios: scenarios.map((scenario) => ({ ...scenario })),
    },
    errors: [],
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
