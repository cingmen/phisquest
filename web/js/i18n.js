/**
 * Terjemahan UI Inggris untuk layar inti PhishQuest.
 *
 * Lapisan ini bekerja pada DOM setelah render: teks dan atribut yang dikenal
 * diganti tanpa menyentuh konten skenario (yang sudah diterjemahkan di
 * content/i18n/en.json), termasuk editor skenario lanjutan.
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
  'English mencakup seluruh skenario dan antarmuka, termasuk editor skenario. Ganti bahasa kapan saja; progres tetap tersimpan.':
    'English covers all scenarios and the interface, including the advanced scenario editor. You can switch languages at any time; progress is kept.',
  'Etika & legal': 'Ethics & legal',
  'Semua email, brand, dan domain di sini': 'Every email, brand, and domain here is',
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
  'Konten baru ditambahkan lewat berkas JSON di': 'New content is added through JSON files in',
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

  // Editor skenario.
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

  // Editor skenario.
  'Pilihan jawaban': 'Answer options',
  'Tipe ini dinilai sebagai phishing/legit, jadi tidak butuh pilihan ganda.':
    'This type is graded as phishing/legitimate, so it does not need multiple choice.',
  'Red flag': 'Red flags',
  'Ekspor pack content/': 'Export content/ pack',
  'Timpa dengan versi tab ini': "Overwrite with this tab's version",
  'bentrok · pakai tab ini': 'conflict · use this tab',
  'Selaraskan prefix id': 'Align ID prefixes',
  '+ Tambah skenario': '+ Add scenario',
  '+ Pack baru': '+ New pack',
  'Hapus semua pack lokal': 'Delete all local packs',
  'Pack ini belum punya skenario.': 'This pack has no scenarios yet.',
  'Pilih pack di bawah atau buat pack baru untuk mulai mengelola skenario.':
    'Choose a pack below or create a new one to start managing scenarios.',
  'Kelola pack lokal berisi banyak skenario tanpa mengedit JSON mentah: tambah, ganti judul, hapus, dan susun urutannya. Isian editor selalu disimpan sebagai draft di perangkat; pack baru masuk daftar yang bisa dimainkan setelah semua skenario lolos validasi. Ekspor memuat seluruh skenario dalam bentuk pack':
    'Manage local packs with multiple scenarios without editing raw JSON: add, rename, delete, and reorder them. Editor input is always saved as a draft on this device; a new pack enters the playable list only after every scenario passes validation. Export includes all scenarios as a pack in',
  '— pilih pack —': '— choose a pack —',
  '— pilih ID pack —': '— choose a content pack ID —',
  'Pintasan:': 'Shortcuts:',
  'menggandakan,': 'duplicates,',
  '(atau': '(or',
  ') menghapus skenario yang sedang dibuka setelah konfirmasi, dan':
    ') deletes the open scenario after confirmation, and',
  'berpindah antar-skenario.': 'moves between scenarios.',
  '✅ siap konten': '✅ content ready',
  '⚠️ belum siap konten': '⚠️ content not ready',
  'Kelola': 'Manage',
  '🗑️ Hapus': '🗑️ Delete',
  '✅ valid': '✅ valid',
  'Belum ada pack lokal tersimpan.': 'No local packs saved yet.',
  'Belum ada draft tersimpan.': 'No saved drafts yet.',
  '💾 Draft ini belum ada di daftar main. Simpan skenario untuk membuat pack baru.':
    '💾 This draft is not in the playable list yet. Save the scenario to create a new pack.',
  '💾 Draft editor tersimpan di perangkat dan sama dengan versi yang bisa dimainkan.':
    '💾 The editor draft is saved on this device and matches the playable version.',
  'Ganti ID pack di atas (atau kelola pack lama) agar versi ini bisa disimpan dan dimainkan.':
    'Change the pack ID above (or manage the old pack) so this version can be saved and played.',
  '🗑️ Draft ini berasal dari pack yang sudah dihapus. Isian tetap aman di perangkat dan tidak masuk daftar main sampai kamu menekan ':
    '🗑️ This draft came from a deleted pack. Your input stays safe on this device and will not enter the playable list until you press',
  'Isi tab ini tidak ditulis agar perubahan terbaru tidak hilang.':
    "This tab's content was not written so the latest changes are not lost.",
  '⚠️ Draft di tab lain lebih baru': '⚠️ The draft in another tab is newer',
  'Draft ini dihapus di tab lain. Isi yang sedang kamu buka tetap ada di sini dan belum ditulis ulang otomatis.':
    'This draft was deleted in another tab. What you have open is still here and has not been written back automatically.',
  'Simpan ulang agar kembali menjadi draft.': 'Save again to restore it as a draft.',
  'Isi editor sudah sama dengan pack tersimpan, tetapi kamu tetap bisa menyimpannya sebagai draft lagi.':
    'The editor content already matches the saved pack, but you can still save it as a draft again.',
  'Dari:': 'From:',
  'Waktu:': 'Time:',

  // Form skenario.
  'Judul skenario (hanya di perangkat)': 'Scenario title (device only)',
  'ID skenario': 'Scenario ID',
  'Tipe soal': 'Question type',
  Kesulitan: 'Difficulty',
  Kanal: 'Channel',
  'Penilaian pesan': 'Message verdict',
  'Nama pengirim': 'Sender name',
  'Alamat/nomor pengirim': 'Sender address/number',
  'Subjek (kosongkan untuk SMS/WhatsApp)': 'Subject (leave empty for SMS/WhatsApp)',
  'Waktu ISO-8601 +07:00': 'Time (ISO-8601 +07:00)',
  'Isi pesan': 'Message body',
  'Teks tautan (kosong = tanpa tautan)': 'Link text (empty = no link)',
  'URL tautan': 'Link URL',
  'Nama lampiran (kosong = tanpa lampiran)': 'Attachment name (empty = none)',
  'Ukuran lampiran (KB)': 'Attachment size (KB)',
  'Jawaban benar': 'Correct answer',
  'Penjelasan (maksimal 3 kalimat)': 'Explanation (max 3 sentences)',
  'Tip (1 kalimat)': 'Tip (1 sentence)',
  'Cara verifikasi (maksimal 2 kalimat)': 'How to verify (max 2 sentences)',
  'Tindakan terbaik': 'Best action',
  'Temukan red flag': 'Find the red flag',
  mudah: 'easy',
  sedang: 'medium',
  sulit: 'hard',
  'Skenario baru': 'New scenario',
  'Pilih ID pack konten': 'Choose content pack ID',
  'Lainnya (isi sendiri)': 'Other (enter your own)',
  'ID pack (bebas diisi)': 'Pack ID (free text)',
  'Nama pack': 'Pack name',
  'Deskripsi pack': 'Pack description',
  'Emoji pack': 'Pack emoji',

  // Pesan validasi dan draft.
  'harus berupa objek JSON': 'must be a JSON object',
  "id harus berpola 'ew-001' (prefix ew/of/sc/cg + 3 digit)":
    "id must match 'ew-001' (prefix ew/of/sc/cg + 3 digits)",
  'body wajib string tidak kosong': 'body must be a non-empty string',
  'body lebih dari 130 kata; ringkas pesannya': 'body is over 130 words; shorten the message',
  'kanal email wajib punya subject': 'email channel requires a subject',
  'kanal SMS/WhatsApp harus subject = null': 'SMS/WhatsApp channel must have subject = null',
  'sender wajib objek {name, address}': 'sender must be an object {name, address}',
  'sender.name wajib diisi': 'sender.name is required',
  'sender.address wajib diisi': 'sender.address is required',
  'sender.address bukan alamat email yang valid': 'sender.address is not a valid email address',
  'pesan phishing tidak boleh memakai domain resmi brand fiktif':
    'a phishing message must not use the fictional brand’s official domain',
  'red_flags wajib array': 'red_flags must be an array',
  'red flag duplikat': 'duplicate red flag',
  'skenario phishing wajib 2–5 red flag': 'a phishing scenario requires 2–5 red flags',
  'skenario legit wajib tanpa red flag': 'a legitimate scenario must have no red flags',
  'link harus objek {text, href} atau null': 'link must be an object {text, href} or null',
  'link.text wajib diisi': 'link.text is required',
  'link.href harus URL http(s) yang valid': 'link.href must be a valid http(s) URL',
  'tautan phishing tidak boleh menuju domain resmi':
    'a phishing link must not point to the official domain',
  'attachment harus objek {name, size_kb} atau null':
    'attachment must be an object {name, size_kb} or null',
  'attachment.name wajib diisi': 'attachment.name is required',
  'attachment.size_kb wajib bilangan bulat ≥ 0': 'attachment.size_kb must be an integer ≥ 0',
  'red flag LAMPIRAN_BERBAHAYA butuh lampiran berekstensi berbahaya':
    'LAMPIRAN_BERBAHAYA requires an attachment with a dangerous extension',
  'lampiran berekstensi berbahaya wajib ditandai LAMPIRAN_BERBAHAYA':
    'a dangerous-extension attachment must be marked LAMPIRAN_BERBAHAYA',
  'phish_or_legit tidak boleh punya options': 'phish_or_legit must not have options',
  'phish_or_legit tidak boleh punya correct_option':
    'phish_or_legit must not have correct_option',
  'setiap option wajib objek {id, text}': 'each option must be an object {id, text}',
  "option.id harus 'A'–'D'": "option.id must be 'A'–'D'",
  'option.id duplikat': 'duplicate option.id',
  'correct_option harus merujuk id option yang ada':
    'correct_option must reference an existing option id',
  'explanation wajib diisi': 'explanation is required',
  'explanation maksimal 3 kalimat': 'explanation must be at most 3 sentences',
  'teach wajib objek {tip, verify_how}': 'teach must be an object {tip, verify_how}',
  'Tidak ada skenario di dalam input.': 'No scenarios in the input.',
  'JSON harus objek skenario, array skenario, atau pack {scenarios}':
    'JSON must be a scenario object, an array of scenarios, or a pack {scenarios}',
  'pack harus objek JSON {pack_id, name, scenarios}':
    'pack must be a JSON object {pack_id, name, scenarios}',
  "field 'scenarios' wajib array": "field 'scenarios' must be an array",
  'Belum ada pack lokal untuk diekspor.': 'No local pack to export.',
  'Ekspor ditolak: ID pack belum diisi.': 'Export rejected: pack ID is empty.',
  'Ekspor ditolak: pack belum punya skenario.': 'Export rejected: the pack has no scenarios.',
  'Pack buatan sendiri dari editor PhishQuest.':
    'A custom pack made with the PhishQuest editor.',
  '(kosong)': '(empty)',
  dipertahankan: 'kept',
  'tidak ada di draft tersimpan': 'not in the saved draft',
  'tidak ada di tab ini': 'not in this tab',
  ditambahkan: 'added',
  'pack sumber sudah dihapus': 'source pack deleted',
  'isinya sama dengan pack tersimpan': 'identical to the saved pack',
  'belum tersimpan': 'not saved',
  alasan: 'reasons',
  'belum masuk daftar main; tekan "Simpan skenario" untuk menyimpannya sebagai pack':
    'not in the playable list yet; press "Save scenario" to save it as a pack',
  'tidak ditulis karena draft di tab lain lebih baru; muat versi terbaru atau timpa secara sadar':
    'not written because the draft in another tab is newer; load the latest version or overwrite deliberately',
  'tidak ditulis karena draft ini sudah dihapus di tab lain; tekan "Simpan ulang sebagai draft" untuk memulihkannya':
    'not written because this draft was deleted in another tab; press "Save as draft again" to restore it',
  'Tidak ada field yang bentrok.': 'No fields conflict.',
  masalah: 'issues',

  // Pesan editor dari app.js.
  'Draft dimuat ulang dari versi terbaru di perangkat (perubahan tab ini yang belum disimpan dibuang).':
    'Draft reloaded from the latest version on this device (unsaved changes from this tab were discarded).',
  'Timpa draft yang lebih baru dari tab lain dengan isi tab ini?':
    "Overwrite the newer draft from another tab with this tab's content?",
  'Draft ditimpa dengan isi tab ini dan pack ikut diperbarui.':
    "Draft overwritten with this tab's content and the pack was updated too.",
  'Buang draft yang belum valid dan kembali ke versi tersimpan?':
    'Discard the invalid draft and return to the saved version?',
  'Hapus semua pack buatanmu di perangkat ini?':
    'Delete all packs you created on this device?',
  'Hapus semua skor online untuk nickname ini? Progres lokal tidak terhapus.':
    'Delete all online scores for this nickname? Local progress is not deleted.',
  'Hapus seluruh progres, lencana, dan pengaturan di perangkat ini?':
    'Delete all progress, badges, and settings on this device?',
  'Pack baru dibuat. Ubah isinya, lalu tambah skenario lain.':
    'New pack created. Edit its content, then add more scenarios.',
  'Perbaiki masalah berikut sebelum mengimpor.': 'Fix the following issues before importing.',
  'Semua id skenario sudah berprefix': 'All scenario ids already use the prefix',
  'Draft dibuang. Editor kembali ke versi tersimpan.':
    'Draft discarded. The editor is back to the saved version.',
  'Draft dibuang. Belum ada pack tersimpan.': 'Draft discarded. No saved pack yet.',
  'Tidak ada draft tersimpan untuk digabung.': 'No saved draft to merge.',
  'Pack lokal dihapus.': 'Local pack deleted.',
  'Tidak ada pack lokal.': 'No local pack.',
  'Draft itu sudah tidak ada di perangkat.': 'That draft is no longer on this device.',
  'Draft itu sudah tidak ada.': 'That draft no longer exists.',
  'Draft itu tidak ditemukan lagi di perangkat.':
    'That draft could not be found on this device.',
  'Pack itu tidak ada lagi di perangkat.': 'That pack is no longer on this device.',
  'Contoh dimuat. Tekan "Impor ke pack aktif" untuk menambahkannya.':
    'Sample loaded. Press "Import into active pack" to add it.',
  'Terjadi kesalahan tak terduga. Coba muat ulang halaman.':
    'An unexpected error occurred. Try reloading the page.',
};

const PATTERNS = [
  [/^1 skenario$/, '1 scenario'],
  [/^(\d+) skenario$/, '$1 scenarios'],
  [/^(\d+) soal$/, '$1 questions'],
  [/^Soal (\d+) dari (\d+)$/, 'Question $1 of $2'],
  [/^Campur Semua · (\d+) soal$/, 'Mixed · $1 questions'],
  [/^(\d+) XP · (\d+)\/10 lencana$/, '$1 XP · $2/10 badges'],
  [/^(\d+)\/(\d+) diperoleh$/, '$1/$2 earned'],
  [/^(.+) · (\d+) skenario$/, (match, name, count) => `${name} · ${count} ${Number(count) === 1 ? 'scenario' : 'scenarios'}`],
  [/^(.+) · (\d+) skenario · belum tersimpan$/, '$1 · $2 scenarios · not saved'],
  [/^(.+) · (\d+) skenario · (.+)$/, (match, name, count, suffix) => `${name} · ${count} ${Number(count) === 1 ? 'scenario' : 'scenarios'} · ${translateString(suffix)}`],
  [/^(.+) XP \(maks\)$/, '$1 XP (max)'],
  [/^Peringkat #(\d+) di papan skor perangkat ini\.$/, 'Rank #$1 on this device’s leaderboard.'],
  [/^(\d+) pemain · (\d+) sesi · rata-rata akurasi (\d+)%$/, '$1 players · $2 sessions · $3% average accuracy'],
  [/^(\d+) dtk$/, '$1 s'],
  [/^⏱️ Mode Time Attack · bonus kecepatan (\d+) XP · (\d+) soal timeout$/,
    '⏱️ Time Attack mode · $1 XP speed bonus · $2 timed-out questions'],
  [/^⚡ (.+)$/, '⚡ $1'],
  [/^⬆️ Naik level: (.+)$/, '⬆️ Level up: $1'],
  [/^🏅 Lencana baru: (.+)$/, '🏅 New badge: $1'],

  // Editor: label dinamis dan pesan validasi.
  [/^Pilihan ([A-D])$/, 'Option $1'],
  [/^Buang draft "(.+)"\? Isian di draft ini akan hilang\.$/, 'Discard draft "$1"? The input in this draft will be lost.'],
  [/^Buang draft (.+)$/, 'Discard draft $1'],
  [/^Draft "(.+)" disimpan ulang dari isi editor ini\.$/, 'Draft "$1" was saved again from this editor\'s content.'],
  [/^Prefix id belum bisa diselaraskan: pilih salah satu ID pack konten \((.+)\) lebih dulu\.$/, 'ID prefixes cannot be aligned yet: choose one of the content pack IDs ($1) first.'],
  [/^Id skenario diselaraskan ke prefix '(.+)'\.$/, "Scenario IDs aligned to prefix '$1'."],
  [/^Pack "(.+)" dihapus dari daftar main\. Draft editor tetap tersimpan dan bisa dilanjutkan dari menu; simpan eksplisit akan membuat pack baru\.$/, 'Pack "$1" was removed from the playable list. The editor draft is still saved and can be continued from the menu; an explicit save will create a new pack.'],
  [/^Pack "(.+)" dihapus dari daftar main\.$/, 'Pack "$1" was removed from the playable list.'],
  [/^Pack "(.+)" dihapus\.$/, 'Pack "$1" deleted.'],
  [/^Pack (.+) dihapus dari daftar yang bisa dimainkan\.$/, 'Pack $1 was removed from the playable list.'],
  [/^Draft '(.+)' berasal dari pack ini dan tetap tersimpan\.$/, "Draft '$1' came from this pack and is still saved."],
  [/^Hapus pack (.+)$/, 'Delete pack $1'],
  [/^Gandakan skenario (\d+)$/, 'Duplicate scenario $1'],
  [/^Naikkan skenario (\d+)$/, 'Move scenario $1 up'],
  [/^Turunkan skenario (\d+)$/, 'Move scenario $1 down'],
  [/^Hapus skenario (\d+)$/, 'Delete scenario $1'],
  [/^Pilih pack lokal$/, 'Choose local pack'],
  [/^JSON skenario$/, 'Scenario JSON'],
  [/^(\d+)\. (.+)$/, (match, number, title) => `${number}. ${translateString(title)}`],
  [/^(.+) · (email|sms|whatsapp) · (.+)$/, (match, type, channel, difficulty) => `${translateString(type)} · ${channel} · ${translateString(difficulty)}`],
  [/^📝 Draft editor tersimpan di perangkat \((\d+)\)\. Pilih Lanjutkan untuk membuka draft lain\.$/, '📝 Editor drafts saved on this device ($1). Choose Continue to open another draft.'],
  [/^📝 Draft editor tersimpan di perangkat \((\d+)\)\. Lanjutkan agar isian tidak hilang\.$/, '📝 Editor drafts saved on this device ($1). Continue so the input is not lost.'],
  [/^Skenario (\d+) · (.+)$/, (match, number, type) => `Scenario ${number} · ${translateString(type)}`],
  [/^(\d+) masalah$/, '$1 issues'],
  [/^(\d+) masalah pada skenario ini$/, '$1 issues in this scenario'],
  [/^(\d+) alasan$/, '$1 reasons'],
  [/^Skenario \((\d+)\)$/, 'Scenarios ($1)'],
  [/^(.+) \(salinan\)$/, '$1 (copy)'],
  [/^type harus salah satu dari (.+)$/, 'type must be one of $1'],
  [/^difficulty harus salah satu dari (.+)$/, 'difficulty must be one of $1'],
  [/^channel harus salah satu dari (.+)$/, 'channel must be one of $1'],
  [/^datetime harus ISO-8601 berakhiran \+07:00, mis\. (.+)$/, 'datetime must be ISO-8601 ending in +07:00, e.g. $1'],
  [/^pengirim memakai brand nyata '(.+)'; gunakan brand fiktif$/, "sender uses a real brand '$1'; use a fictional brand"],
  [/^pesan legit wajib memakai domain resmi brand fiktif, bukan '(.+)'$/, "a legitimate message must use the fictional brand's official domain, not '$1'"],
  [/^(.+) wajib punya is_phish \(true\/false\)$/, '$1 must have is_phish (true/false)'],
  [/^red flag tidak dikenal: (.+)$/, 'unknown red flag: $1'],
  [/^link\.href memakai domain nyata '(.+)'$/, "link.href uses a real domain '$1'"],
  [/^tautan pesan legit harus domain resmi, bukan '(.+)'$/, "a legitimate message link must use the official domain, not '$1'"],
  [/^option (.+) tidak punya teks$/, 'option $1 has no text'],
  [/^teach\.(.+) wajib diisi$/, 'teach.$1 is required'],
  [/^teach\.(.+) maksimal 2 kalimat$/, 'teach.$1 must be at most 2 sentences'],
  [/^id (.+) duplikat$/, 'duplicate id $1'],
  [/^JSON tidak valid: (.+)$/, 'Invalid JSON: $1'],
  [/^schema_version harus '(.+)' agar diterima validator konten$/, "schema_version must be '$1' to pass the content validator"],
  [/^pack_id harus salah satu dari (.+); validator konten hanya mengenal pack bawaan$/, 'pack_id must be one of $1; the content validator only recognizes built-in packs'],
  [/^field pack '(.+)' wajib string tidak kosong$/, "pack field '$1' must be a non-empty string"],
  [/^pack wajib (\d+) skenario, ada (\d+)$/, 'pack requires $1 scenarios, currently $2'],
  [/^komposisi: (.+) ≥ (\d+), ada (\d+)$/, 'composition: $1 ≥ $2, currently $3'],
  [/^komposisi: (\d+) skenario '(.+)', ada (\d+)$/, "composition: $1 '$2' scenarios, currently $3"],
  [/^komposisi: ≥ (\d+) kanal (.+), ada (\d+)$/, 'composition: ≥ $1 $2 channels, currently $3'],
  [/^komposisi: target (\d+) phishing \/ (\d+) legit, ada (\d+) \/ (\d+)$/, 'composition: target $1 phishing / $2 legitimate, currently $3 / $4'],
  [/^cakupan red flag ≥ (\d+) jenis, ada (\d+)$/, 'red flag coverage ≥ $1 types, currently $2'],
  [/^id '(.+)' wajib berprefix '(.+)' untuk pack ini$/, "id '$1' must use prefix '$2' for this pack"],
  [/^id skenario duplikat: (.+)$/, 'duplicate scenario id: $1'],
  [/^Ekspor ditolak: pack_id '(.+)' tidak dikenal validator, jadi berkasnya tidak bisa dipakai di content\/\. Pilih salah satu dari (.+)\.$/, "Export rejected: pack_id '$1' is unknown to the validator, so the file cannot be used in content/. Choose one of $2."],

  // Editor: pesan aksi dan konfirmasi.
  [/^Pack baru dibuat, tetapi (.+)\.$/, (match, note) => `New pack created, but ${translateString(note)}.`],
  [/^Skenario (\d+) ditambahkan dan tersimpan\.$/, 'Scenario $1 added and saved.'],
  [/^Skenario ditambahkan, tetapi (.+)\.$/, (match, note) => `Scenario added, but ${translateString(note)}.`],
  [/^Skenario digandakan sebagai (.+), tetapi (.+)\.$/, (match, id, note) => `Scenario duplicated as ${id}, but ${translateString(note)}.`],
  [/^Skenario digandakan sebagai (.+)\.$/, 'Scenario duplicated as $1.'],
  [/^Urutan diperbarui: skenario (\d+) → (\d+)\.$/, 'Order updated: scenario $1 → $2.'],
  [/^Urutan diubah, tetapi (.+)\.$/, (match, note) => `Order changed, but ${translateString(note)}.`],
  [/^Skenario "(.+)" dihapus\. Sisa (\d+) skenario di pack ini\.$/, 'Scenario "$1" deleted. $2 scenarios remain in this pack.'],
  [/^Skenario "(.+)" dihapus, tetapi pack (.+)\.$/, (match, id, note) => `Scenario "${id}" deleted, but pack ${translateString(note)}.`],
  [/^Skenario (\d+) belum valid: (.+)$/, (match, number, problem) => `Scenario ${number} is not valid: ${translateString(problem)}`],
  [/^Skenario (\d+) tersimpan\. Pack "(.+)" dibuat kembali di daftar main \((\d+) skenario\)\.$/, 'Scenario $1 saved. Pack "$2" was recreated in the playable list ($3 scenarios).'],
  [/^Skenario (\d+) tersimpan\. Pack berisi (\d+) skenario\.$/, 'Scenario $1 saved. The pack contains $2 scenarios.'],
  [/^Skenario (\d+) valid, tetapi pack (.+)\.$/, (match, number, note) => `Scenario ${number} is valid, but pack ${translateString(note)}.`],
  [/^(\d+) skenario diimpor\. Pack kini berisi (\d+) skenario\.$/, '$1 scenarios imported. The pack now contains $2 scenarios.'],
  [/^Skenario diimpor, tetapi pack (.+)\.$/, (match, note) => `Scenarios imported, but pack ${translateString(note)}.`],
  [/^Prefix id belum bisa diselaraskan: pilih salah satu ID pack konten \((.+)\) lebih dulu\.$/, 'ID prefixes cannot be aligned yet: choose one of the content pack IDs ($1) first.'],
  [/^Semua id skenario sudah berprefix '(.+)'\.$/, "All scenario ids already use the prefix '$1'."],
  [/^Id skenario diselaraskan ke prefix '(.+)'\.$/, "Scenario ids aligned to prefix '$1'."],
  [/^Id diselaraskan ke '(.+)', tetapi pack (.+)\.$/, (match, prefix, note) => `Ids aligned to '${prefix}', but pack ${translateString(note)}.`],
  [/^(\d+) skenario diekspor dan siap menjadi pack content\/\.$/, '$1 scenarios exported and ready as a content pack.'],
  [/^(\d+) skenario diekspor\. Belum siap jadi pack content\/: (.+)$/, (match, count, issue) => `${count} scenarios exported. Not ready as a content pack: ${translateString(issue)}`],
  [/^(.+) diekspor \((\d+) skenario\)\.$/, '$1 exported ($2 scenarios).'],
  [/^Pack "(.+)" dihapus dari daftar main\. Draft editor tetap tersimpan dan bisa dilanjutkan dari menu; simpan eksplisit akan membuat pack baru\.$/, 'Pack "$1" removed from the playable list. The editor draft stays saved and can be resumed from the menu; an explicit save will create a new pack.'],
  [/^Pack "(.+)" dihapus dari daftar main\.$/, 'Pack "$1" removed from the playable list.'],
  [/^Pack "(.+)" dihapus\.$/, 'Pack "$1" deleted.'],
  [/^Draft "(.+)" disimpan ulang dari isi editor ini\.$/, 'Draft "$1" saved again from this editor content.'],
  [/^Draft "(.+)" dibuang\.$/, 'Draft "$1" discarded.'],
  [/^Draft digabung dengan versi tab lain\. (.+)$/, (match, note) => `Draft merged with the other tab's version. ${translateString(note)}`],
  [/^(\d+) field bentrok memakai isi tab ini \((.+)\)\.$/, '$1 fields conflict and use this tab’s content ($2).'],
  [/^Draft ditimpa dengan isi tab ini dan pack ikut diperbarui\.$/, 'Draft overwritten with this tab and the pack was updated.'],
  [/^Draft ditimpa dengan isi tab ini, tetapi pack (.+)\.$/, (match, note) => `Draft overwritten with this tab, but pack ${translateString(note)}.`],
  [/^Pratinjau gabungan: (\d+) perubahan, (\d+) bentrok\. Tekan "Terapkan gabungan" untuk menulis draft\.$/, 'Merge preview: $1 changes, $2 conflicts. Press "Apply merge" to write the draft.'],
  [/^Melanjutkan draft "(.+)"\. Pack sumbernya sudah dihapus; tekan "Simpan skenario" untuk membuat pack baru di daftar main\.$/, 'Resuming draft "$1". Its source pack was deleted; press "Save scenario" to create a new pack in the playable list.'],
  [/^Melanjutkan draft\. Versi tersimpan \((\d+) skenario\) tetap bisa dimainkan\.$/, 'Resuming draft. The saved version ($1 scenarios) is still playable.'],
  [/^Melanjutkan draft (.+)\.$/, 'Resuming draft $1.'],
  [/^Mengelola (.+) \((\d+) skenario\)\.$/, 'Managing $1 ($2 scenarios).'],
  [/^Draft belum valid dimuat\. Versi tersimpan \((\d+) skenario\) tetap bisa dimainkan\.$/, 'Invalid draft loaded. The saved version ($1 scenarios) is still playable.'],
  [/^Draft dimuat ulang dari versi terbaru di perangkat \(perubahan tab ini yang belum disimpan dibuang\)\.$/, "Draft reloaded from the latest version on this device (unsaved changes from this tab were discarded)."],
  [/^Timpa draft yang lebih baru dari tab lain dengan isi tab ini\?$/, "Overwrite the newer draft from another tab with this tab's content?"],
  [/^Hapus skenario "(.+)" dari pack ini\?$/, 'Delete scenario "$1" from this pack?'],
  [/^Hapus pack "(.+)" \((\d+) skenario\)\?(.*)$/, (match, name, count, notes) => `Delete pack "${name}" (${count} scenarios)?${notes ? ` ${translateString(notes.trim())}` : ''}`],
  [/^Hapus semua pack buatanmu di perangkat ini\?$/, 'Delete all your local packs on this device?'],
  [/^Ubah id skenario menjadi (.+) … (.+)\?$/, 'Change scenario ids to $1 … $2?'],
  [/^Buang draft yang belum valid dan kembali ke versi tersimpan\?$/, 'Discard the invalid draft and return to the saved version?'],
  [/^belum tersimpan karena ID pack '(.+)' sudah dipakai pack lain \((\d+) skenario\); ganti ID pack untuk menyimpan$/, "not saved because pack ID '$1' is already used by another pack ($2 scenarios); change the pack ID to save"],
  [/^tidak ditulis karena draft di tab lain lebih baru; muat versi terbaru atau timpa secara sadar$/, 'not written because the draft in another tab is newer; load the latest version or overwrite deliberately'],
  [/^tidak ditulis karena draft ini sudah dihapus di tab lain; tekan "Simpan ulang sebagai draft" untuk memulihkannya$/, 'not written because this draft was deleted in another tab; press "Save as draft again" to restore it'],
  [/^belum masuk daftar main; tekan "Simpan skenario" untuk menyimpannya sebagai pack$/, 'not in the playable list yet; press "Save scenario" to save it as a pack'],
  [/^belum tersimpan karena ada masalah validasi$/, 'not saved because of validation issues'],

  // Editor: catatan draft.
  [/^⚠️ Draft di tab lain lebih baru(?: \(.+\))?\. Isi tab ini tidak ditulis agar perubahan terbaru tidak hilang\.$/, "⚠️ The draft in another tab is newer. This tab's content was not written so the latest changes are not lost."],
  [/^🔀 Pratinjau gabungan: (\d+) perubahan akan diterapkan, (\d+) di antaranya bentrok dan memakai isi tab ini\.$/, '🔀 Merge preview: $1 changes will be applied, $2 of them conflict and will use this tab’s content.'],
  [/^(.+) · (.+) · tab ini: (.+) · tab lain: (.+)$/, (match, field, where, ours, theirs) => `${field} · ${where} · this tab: ${translateString(ours)} · other tab: ${translateString(theirs)}`],
  [/^⚠️ ID pack '(.+)' sudah dipakai pack lain \((\d+) skenario\)\. Perubahan ini tetap tersimpan sebagai draft dan tidak menimpa pack tersebut\.$/, "⚠️ Pack ID '$1' is already used by another pack ($2 scenarios). These changes stay saved as a draft and do not overwrite that pack."],
  [/^Menu tetap memainkan versi tersimpan \((\d+) skenario\) sampai draft ini lolos validasi\.$/, 'The menu keeps playing the saved version ($1 scenarios) until this draft passes validation.'],
  [/^Belum ada versi tersimpan yang bisa dimainkan\.$/, 'There is no saved version to play yet.'],
  [/^Masalah pertama: (.+)$/, (match, problem) => `First issue: ${translateString(problem)}`],
  [/^📝 Draft tersimpan di perangkat, tetapi belum lolos validasi\. (.+)$/, (match, rest) => `📝 Draft saved on this device, but it has not passed validation. ${translateString(rest)}`],
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
  ['mudah', 'easy'],
  ['sedang', 'medium'],
  ['sulit', 'hard'],
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
  const leading = (input.match(/^\s*/) || [''])[0];
  const trailing = (input.match(/\s*$/) || [''])[0];
  const normalized = input.trim().replace(/\s+/g, ' ');
  if (!normalized) return input;
  const wrap = (value) =>
    `${leading}${value
      .replace(/\b1 scenarios\b/g, '1 scenario')
      .replace(/\b1 fields\b/g, '1 field')
      .replace(/\b1 changes\b/g, '1 change')
      .replace(/\b1 conflicts\b/g, '1 conflict')
      .replace(/\b1 issues\b/g, '1 issue')
      .replace(/\b1 reasons\b/g, '1 reason')}${trailing}`;
  const labeled = normalized.match(/^skenario #(\d+): (.*)$/);
  if (labeled) return wrap(`scenario #${labeled[1]}: ${translateString(labeled[2])}`);
  if (Object.hasOwn(EXACT, normalized)) return wrap(EXACT[normalized]);
  for (const [pattern, replacement] of PATTERNS) {
    if (pattern.test(normalized)) {
      const replaced = normalized.replace(pattern, replacement);
      return wrap(swapNames(replaced));
    }
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
