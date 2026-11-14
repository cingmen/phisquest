/**
 * Terjemahan UI Inggris untuk layar inti PhishQuest.
 *
 * Lapisan ini bekerja pada DOM setelah render: teks dan atribut yang dikenal
 * diganti tanpa menyentuh konten skenario (yang sudah diterjemahkan di
 * content/i18n/en.json). Editor skenario tetap berbahasa Indonesia dan
 * ditandai "beta" pada pemilih bahasa.
 */

const EXACT = {
  // Shell, navigasi, footer.
  'Kenali umpan sebelum kamu terhook.': 'Spot the bait before you get hooked.',
  'Kenali umpan sebelum kamu terhook 🎣': 'Spot the bait before you get hooked 🎣',
  '🎮 Main': '🎮 Play',
  '🏅 Lencana': '🏅 Badges',
  'ℹ️ Tentang': 'ℹ️ About',
  'Data progres hanya tersimpan di perangkat ini ·': 'Progress is stored only on this device ·',
  'PhishQuest adalah simulasi edukasi. Semua email, brand, dan domain di dalamnya fiktif. Tidak ada data yang dikumpulkan.':
    'PhishQuest is an educational simulation. Every email, brand, and domain in it is fictional. No data is collected.',
  'Navigasi utama': 'Main navigation',
  'Menu utama': 'Main menu',
  Permainan: 'Game',
  'Ringkasan sesi': 'Session summary',
  Tentang: 'About',

  // Menu.
  'Pilih pack': 'Choose a pack',
  'Jumlah soal campur': 'Mixed question count',
  '🎲 Campur Semua': '🎲 Mix Everything',
  'Campur Semua': 'Mixed',
  '⏱️ Time Attack · 20 detik per soal': '⏱️ Time Attack · 20 seconds per question',
  'Editor skenario': 'Scenario editor',
  'Tempel JSON skenario, validasi, simpan di perangkat ini, lalu mainkan atau ekspor.':
    'Paste scenario JSON, validate it, save it on this device, then play or export.',
  'Buka editor': 'Open editor',
  'Ringkasan kamu': 'Your summary',
  Sesi: 'Sessions',
  Akurasi: 'Accuracy',
  'Rekor streak': 'Best streak',
  'Soal dijawab': 'Questions answered',
  'Belum dimainkan': 'Not played yet',
  'Belum ada draft tersimpan.': 'No saved drafts yet.',
  'Belum ada pack lokal tersimpan.': 'No local packs saved yet.',
  'Papan skor lokal': 'Local leaderboard',
  'Papan skor lokal · 3 terbaik': 'Local leaderboard · top 3',
  Mainkan: 'Play',
  Hapus: 'Delete',
  Lanjutkan: 'Continue',
  Buang: 'Discard',
  'Draft editor tersimpan di perangkat': 'Editor drafts saved on this device',
  'Waktu:': 'Time:',

  // Permainan.
  'Memuat soal…': 'Loading question…',
  'Phishing atau legit?': 'Phishing or legitimate?',
  'Apa tindakan terbaik?': 'What is the best action?',
  'Bagian mana yang paling mencurigakan?': 'Which part is most suspicious?',
  'Pintasan keyboard: P/L atau 1–4': 'Keyboard shortcuts: P/L or 1–4',
  'Dari:': 'From:',
  Waktu: 'Time',
  'Lanjut →': 'Next →',
  'Lihat recap →': 'View recap →',
  '✅ Benar!': '✅ Correct!',
  '❌ Belum tepat': '❌ Not quite',
  'Jawaban benar:': 'Correct answer:',
  '🏅 Lencana baru:': '🏅 New badge:',
  '⬆️ Naik level:': '⬆️ Level up:',
  '✅ Tidak ada red flag — pesan ini wajar.': '✅ No red flags — this message is normal.',
  'Progres soal': 'Question progress',
  'Progres level': 'Level progress',

  // Recap.
  'Sesi selesai!': 'Session complete!',
  'Skor XP': 'XP score',
  'Total XP': 'Total XP',
  '🔁 Main lagi': '🔁 Play again',
  '🏠 Menu': '🏠 Menu',
  '📸 Bagikan kartu skor': '📸 Share score card',
  'Lencana baru': 'New badges',
  'Kesalahan untuk ditinjau': 'Mistakes to review',
  '💯 Tanpa kesalahan. Luar biasa!': '💯 No mistakes. Outstanding!',
  'Papan skor perangkat ini': 'this device’s leaderboard',

  // Lencana dan level.
  Lencana: 'Badges',
  '✔ diperoleh': '✔ earned',
  '🔒 belum': '🔒 locked',
  Amatir: 'Amateur',
  '🐣 Amatir': '🐣 Amateur',
  '🔎 Analis Muda': '🔎 Junior Analyst',
  '🕵️ Analis': '🕵️ Analyst',
  '🧠 Detektif': '🧠 Detective',
  '👑 PhishHunter': '👑 PhishHunter',
  'Analis Muda': 'Junior Analyst',
  Analis: 'Analyst',
  Detektif: 'Detective',
  'Tangkapan Pertama': 'First Catch',
  'Menjawab benar pertama kali': 'Answer correctly for the first time',
  'Mata Elang': 'Eagle Eye',
  '5 jawaban benar beruntun': '5 correct answers in a row',
  'Mantap Jiwa': 'On a Roll',
  '10 jawaban benar beruntun': '10 correct answers in a row',
  'Tanpa Terhook': 'Unhooked',
  'Menyelesaikan satu pack dengan akurasi 100%': 'Finish one pack with 100% accuracy',
  'Penjelajah Nusantara': 'Archipelago Explorer',
  'Menyelesaikan ≥ 1 sesi di keempat pack': 'Finish at least 1 session in all four packs',
  'Detektif Domain': 'Domain Detective',
  'Benar pada 10 soal ber-red-flag domain': 'Answer 10 domain red-flag questions correctly',
  'Penjaga OTP': 'OTP Guardian',
  'Benar pada 5 soal yang meminta data sensitif':
    'Answer 5 questions that request sensitive data correctly',
  'Tidak Tergesa-Gesa': 'No Rush',
  'Benar pada 5 soal bertekanan waktu': 'Answer 5 time-pressure questions correctly',
  'Bangkit Lagi': 'Bounce Back',
  'Setelah 3 salah beruntun, benar sampai sesi habis':
    'After 3 wrong answers in a row, keep answering correctly until the session ends',
  'Naik Kelas': 'Level Up',
  'Mencapai level Detektif': 'Reach the Detective level',

  // Red flag.
  'Pengirim tidak wajar': 'Unusual sender',
  'Domain palsu': 'Fake domain',
  'Domain mirip (typosquatting)': 'Lookalike domain (typosquatting)',
  'Tekanan waktu': 'Time pressure',
  Ancaman: 'Threat',
  'Imbalan berlebihan': 'Excessive reward',
  'Meminta data sensitif': 'Requests sensitive data',
  'Tautan mencurigakan': 'Suspicious link',
  'Lampiran berbahaya': 'Dangerous attachment',
  'Ejaan/tata bahasa janggal': 'Odd spelling or grammar',
  'Sapaan generik': 'Generic greeting',
  'Saluran tidak wajar': 'Unusual channel',

  // Tentang.
  'Tentang PhishQuest': 'About PhishQuest',
  'Game edukasi anti-phishing berbahasa Indonesia. Mainkan pesan-pesan simulasi, temukan red flag, dan latih kebiasaan verifikasi yang benar.':
    'An anti-phishing educational game. Play simulated messages, spot red flags, and practise the right verification habits.',
  'Bahasa / Language': 'Language',
  'English memakai terjemahan skenario dan label utama. Ganti bahasa kapan saja; progres tetap tersimpan.':
    'English covers all scenarios and the main interface. The advanced scenario editor stays in Indonesian. You can switch languages at any time; progress is kept.',
  'Etika & legal': 'Ethics & legal',
  'Semua email, brand, dan domain di sini': 'Every email, brand, and domain here is ',
  fiktif: 'fictional',
  '. Jalankan validator dan test sebelum mengirim pull request.':
    '. Run the validator and tests before sending a pull request.',
  'Semua email, brand, dan domain di sini fiktif.': 'Every email, brand, and domain here is fictional.',
  'Tidak ada pengiriman pesan sungguhan dan tidak ada kredensial yang dikumpulkan.':
    'No real messages are sent and no credentials are collected.',
  'Konten hanya untuk mengenali pola penipuan, bukan untuk membuat phishing.':
    'The content is only for recognising scam patterns, not for creating phishing.',
  Privasi: 'Privacy',
  'Tanpa akun, tanpa email, tanpa cookie pelacak, tanpa analytics.':
    'No account, no email, no tracking cookies, no analytics.',
  'Progres hanya tersimpan di penyimpanan lokal peramban ini.':
    'Progress is stored only in this browser’s local storage.',
  'Ekspor berkas JSON kapan saja untuk memindahkan progres ke perangkat lain.':
    'Export a JSON file at any time to move your progress to another device.',
  'Data lokal': 'Local data',
  'Ekspor, impor, atau hapus progres kapan saja.': 'Export, import, or delete your progress at any time.',
  '⬇️ Ekspor': '⬇️ Export',
  '⬆️ Impor': '⬆️ Import',
  '🗑️ Reset': '🗑️ Reset',
  Kontribusi: 'Contributing',
  'Konten baru ditambahkan lewat berkas JSON di': 'New content is added through JSON files in ',
  'Jalankan validator dan test sebelum mengirim pull request.':
    'Run the validator and tests before sending a pull request.',
  'Papan skor online': 'Online leaderboard',
  'Papan skor online (opsional)': 'Online leaderboard (optional)',
  'Hanya nickname pilihanmu dan hasil sesi yang dikirim. Tanpa akun, email, atau ID perangkat. Kosongkan nickname atau matikan centang untuk tetap bermain lokal.':
    'Only your chosen nickname and session results are sent. No account, email, or device ID. Leave the nickname empty or untick the box to keep playing locally.',
  'Kirim skor ke papan online setelah sesi selesai':
    'Send my score to the online leaderboard when a session ends',
  'Simpan pengaturan': 'Save settings',
  'Muat papan': 'Load leaderboard',
  'Hapus data online': 'Delete online data',
  'Build ini tidak dikonfigurasi dengan server papan skor. Semua progres tetap tersimpan lokal.':
    'This build is not configured with a leaderboard server. All progress stays local.',
  'Belum ada skor online untuk pack ini.': 'No online scores for this pack yet.',

  // Editor (label utama saja; editor tetap ditandai beta).
  'Kembali ke menu': 'Back to menu',
  'Pack tersimpan': 'Saved packs',
  'Draft di perangkat': 'Drafts on this device',
  'Impor skenario dari JSON': 'Import scenarios from JSON',
  'Muat contoh ke kotak': 'Load sample into the box',
  'Impor ke pack aktif': 'Import into active pack',
  'Tutup pratinjau': 'Close preview',
  'Terapkan gabungan': 'Apply merge',
  'Muat versi terbaru': 'Load latest version',
  'Pratinjau gabungan': 'Preview merge',
  'Buang draft, pakai versi tersimpan': 'Discard draft and use saved version',
  'Simpan ulang sebagai draft': 'Save as draft again',
  'Simpan skenario': 'Save scenario',
};

const PATTERNS = [
  [/^(\d+) skenario$/, '$1 scenarios'],
  [/^(\d+) soal$/, '$1 questions'],
  [/^Soal (\d+) dari (\d+)$/, 'Question $1 of $2'],
  [/^Campur Semua · (\d+) soal$/, 'Mixed · $1 questions'],
  [/^(\d+) XP · (\d+)\/10 lencana$/, '$1 XP · $2/10 badges'],
  [/^(\d+)\/(\d+) diperoleh$/, '$1/$2 earned'],
  [/^(.+) · (\d+) skenario$/, '$1 · $2 scenarios'],
  [/^(.+) · (\d+) skenario · belum tersimpan$/, '$1 · $2 scenarios · not saved'],
  [/^(.+) · (\d+) skenario · (.+)$/, '$1 · $2 scenarios · $3'],
  [/^(.+) XP \(maks\)$/, '$1 XP (max)'],
  [/^Peringkat #(\d+) di papan skor perangkat ini\.$/, 'Rank #$1 on this device’s leaderboard.'],
  [/^(\d+) pemain · (\d+) sesi · rata-rata akurasi (\d+)%$/, '$1 players · $2 sessions · $3% average accuracy'],
  [/^(\d+) dtk$/, '$1 s'],
  [/^⏱️ Mode Time Attack · bonus kecepatan (\d+) XP · (\d+) soal timeout$/,
    '⏱️ Time Attack mode · $1 XP speed bonus · $2 timed-out questions'],
  [/^⚡ (.+)$/, '⚡ $1'],
  [/^⬆️ Naik level: (.+)$/, '⬆️ Level up: $1'],
  [/^🏅 Lencana baru: (.+)$/, '🏅 New badge: $1'],
];

const NAME_FRAGMENTS = [
  ['Tangkapan Pertama', 'First Catch'],
  ['Mata Elang', 'Eagle Eye'],
  ['Mantap Jiwa', 'On a Roll'],
  ['Tanpa Terhook', 'Unhooked'],
  ['Penjelajah Nusantara', 'Archipelago Explorer'],
  ['Detektif Domain', 'Domain Detective'],
  ['Penjaga OTP', 'OTP Guardian'],
  ['Tidak Tergesa-Gesa', 'No Rush'],
  ['Bangkit Lagi', 'Bounce Back'],
  ['Naik Kelas', 'Level Up'],
  ['Analis Muda', 'Junior Analyst'],
  ['PhishHunter', 'PhishHunter'],
  ['Amatir', 'Amateur'],
  ['Detektif', 'Detective'],
];

/** Ganti nama lencana/level di dalam teks dinamis. */
function swapNames(text) {
  return NAME_FRAGMENTS.reduce((value, [id, en]) => value.split(id).join(en), text);
}

const SKIP_SELECTOR = '.message__text, .message__subject, textarea, script, style';

/**
 * Terjemahkan satu string UI.
 * @param {string} input - teks atau atribut asli.
 * @returns {string} teks Inggris bila dikenal.
 */
export function translateString(input) {
  const normalized = input.trim().replace(/\s+/g, ' ');
  if (!normalized) return input;
  if (Object.hasOwn(EXACT, normalized)) return EXACT[normalized];
  for (const [pattern, replacement] of PATTERNS) {
    if (pattern.test(normalized)) return swapNames(normalized.replace(pattern, replacement));
  }
  return input;
}

/**
 * Terjemahkan teks dan atribut di dalam root secara in-place.
 * @param {string} locale - locale aktif.
 * @param {ParentNode} [root] - akar DOM; default document.body.
 */
export function translateUi(locale, root = document.body) {
  if (locale !== 'en' || !root) return;
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = translateString(node.nodeValue || '');
    if (next !== node.nodeValue) node.nodeValue = next;
  }
  const selector = '[aria-label], [placeholder], [title]';
  for (const element of root.querySelectorAll(selector)) {
    for (const attribute of ['aria-label', 'placeholder', 'title']) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const next = translateString(value);
      if (next !== value) element.setAttribute(attribute, next);
    }
  }
}
