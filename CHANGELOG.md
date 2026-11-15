# Changelog PhishQuest

Semua perubahan penting proyek ini dicatat di sini. Riwayat versi lama (v1.1 dan sebelumnya) ada di
`docs/implementation-plan.md`; rincian perilaku ada di `docs/PRD.md`.

## v2.2.2 — 2026-11-15

- Recap mode Time Attack memakai bentuk tunggal yang benar saat hanya satu soal timeout
  (`1 timed-out question`).

## v2.2.1 — 2026-11-15

- Pengumuman pembaca layar dan dialog konfirmasi kini memakai bahasa Indonesia saat locale `id`;
  sebelumnya keduanya selalu diterjemahkan ke Inggris. Perilaku ini dicakup test locale baru.

## v2.2.0 — 2026-11-15

- `og:locale:alternate` kini menunjuk locale yang tidak aktif: `en_US` saat UI Indonesia dan
  `id_ID` saat UI Inggris. Tag default di `index.html`, nilai locale, dan penerapannya ke dokumen
  dicakup regresi metadata.

## v2.1.3 — 2026-11-15

- Metadata halaman (judul tab, description, OG, dan Twitter) dipindahkan ke modul murni dan diuji
  untuk locale Indonesia dan Inggris, termasuk sinkronisasi nilai dasar dengan `index.html` serta
  penerapannya ke dokumen.
- `og:locale` kini mengikuti locale aktif: `id_ID` untuk Indonesia dan `en_US` untuk Inggris.

## v2.1.2 — 2026-11-15

- Uji regresi locale Inggris memindai shell serta seluruh layar hasil render (menu, lencana, editor,
  permainan, umpan balik, recap, papan skor, dan Tentang) untuk memastikan tidak ada teks UI Indonesia
  yang lolos. Pengujian ini juga menutup terjemahan label `campur` pada papan skor, ringkasan
  peringkat online, pesan skor gagal terkirim, dan pesan `noscript`.

## v2.1.1 — 2026-11-15

- Audit locale Inggris menutup sisa teks Indonesia di pengumuman sesi, label red flag pada umpan
  balik, nama lencana di recap, ringkasan peringkat, label pack campur, metadata halaman, kartu
  skor, serta pesan error dan papan skor online.

## v2.1.0 — 2026-11-15

- Editor skenario lanjutan kini sepenuhnya berbahasa Inggris: label form, pesan validasi, status
  kesiapan pack, pengelolaan draft, ekspor/impor, pintasan, `aria-label`, dialog konfirmasi, dan
  template skenario baru. Label **English (beta)** dihapus karena tidak ada lagi bagian UI yang
  tertinggal dalam bahasa Indonesia.

## v2.0.0 — 2026-11-14

- Klien web papan skor online: layar Tentang menyediakan nickname dan opt-in, skor sesi dikirim
  otomatis hanya bila dinyalakan, papan 10 teratas + statistik global bisa dimuat, dan tombol
  **Hapus data online** memakai UUID pemain. `web/js/online-leaderboard.js` menandatangani payload
  dengan HMAC-SHA256 lewat Web Crypto dan menyimpan UUID pemain di `pq_online_player_v1`.
- Backend papan skor online opsional di `server/` (FastAPI + SQLite) mengikuti
  `api-specification.md` §7: `POST /v1/scores` dengan HMAC dan Idempotency-Key,
  `GET /v1/leaderboard` dengan periode/cursor, `GET /v1/stats/global`, dan
  `DELETE /v1/players/{id}` untuk penghapusan data. Skema SQLite memakai WAL dan
  tabel `idempotency_keys`; 11 test API mencakup validasi, peringkat, paginasi,
  CORS, rate limit, dan penghapusan.
- Kartu skor sesi dapat dibuat dari layar recap dan diunduh sebagai PNG 1200×630 atau dibagikan
  lewat Web Share API bila peramban mendukung berkas. Kartu hanya memuat skor, akurasi, streak,
  level, pack, mode, dan tanggal — tanpa nickname maupun data perangkat.
- `buildShareCardModel()` dinormalkan terhadap nilai rusak (skor negatif, akurasi di luar 0–1),
  dan nama berkas dibersihkan dari karakter yang tidak aman. Fungsi gambar dipisah dari DOM agar
  dapat diuji dengan konteks canvas palsu.

- i18n Inggris: seluruh 40 skenario punya terjemahan di `content/i18n/en.json` (subjek, isi,
  penjelasan, tip, cara verifikasi, dan opsi). Pemilih **Bahasa / Language** di Tentang menyimpan
  locale di pengaturan dan memuat konten sesuai bahasa tanpa menghapus progres.
- UI inti berbahasa Inggris lewat lapisan `web/js/i18n.js`: navigasi, menu, permainan, umpan balik,
  recap, lencana, level, red flag, dan Tentang. Atribut `aria-label`/`placeholder` ikut diterjemahkan;
  editor skenario lanjutan ikut diterjemahkan penuh dan tidak lagi ditandai beta.
- Test paritas `tests/test_i18n.py` memastikan setiap pack, skenario, field wajib, dan opsi punya
  terjemahan dan bukan salinan teks Indonesia; `web/test/i18n.test.js` menguji label statis dan pola
  dinamis.

## v1.6.11 — 2026-11-04

- Perbandingan field saat menggabung draft kini mengabaikan urutan daftar: `red_flags` yang sama
  dengan urutan centang berbeda tidak lagi muncul sebagai perubahan di pratinjau maupun sebagai
  bentrok palsu. Isi daftar yang benar-benar berbeda tetap dilaporkan dan diambil dari sisi yang berubah.

## v1.6.10 — 2026-11-04

- Banner konflik draft antar-tab kini menawarkan **Pratinjau gabungan**: `draftMergePreview()`
  mendaftar setiap field yang akan berubah beserta nilai dari tab ini dan dari tab lain, menandai
  field yang bentrok, dan tidak menulis apa pun sampai pengguna menekan **Terapkan gabungan**.
- Pratinjau bisa ditutup tanpa efek samping; pratinjau otomatis hilang saat draft dimuat ulang,
  dipulihkan, atau ditulis ulang agar daftar perubahannya tidak pernah basi.

## v1.6.9 — 2026-11-04

- Konflik draft antar-tab kini punya pilihan **Gabungkan dengan versi tab ini**: `mergeDraftPack()`
  memakai leluhur bersama untuk mengambil perubahan yang hanya ada di satu sisi (nama, deskripsi,
  emoji, dan field skenario), menambahkan skenario baru dari tab lain, serta menghormati penghapusan
  skenario yang tidak diubah di sisi lain.
- Field yang diubah berbeda di kedua sisi tetap memakai isi tab ini dan dilaporkan jumlahnya beserta
  namanya di pesan editor (misalnya `name` atau `ew-002.body`), sehingga pengguna tahu apa yang perlu
  diperiksa sebelum menekan **Timpa**.
- `mergeDraftPack()` dan aturan tiga arah per field diuji di `web/test/editor.test.js`.

## v1.6.8 — 2026-11-04

- Pintasan **Alt+↑**/**Alt+↓** memindahkan pilihan antar-skenario di editor tanpa berputar di ujung
  daftar; tetap tidak menyala saat fokus di kolom isian atau saat dialog terbuka. Petunjuk pintasan
  dan `aria-keyshortcuts` pada baris skenario ikut diperbarui.
- Uji integrasi `web/test/two-tab.test.js` menyusun urutan antar-tab lewat `storage.js` dan fungsi
  keputusan editor (konflik `updated_at`, penghapusan draft, penyegaran menu, dan pemulihan), sehingga
  alur dua tab tidak lagi hanya dibuktikan manual di browser.
- `scenarioNavShortcut()` diuji di `web/test/editor.test.js`.

## v1.6.7 — 2026-11-04

- Pintasan **Alt+Backspace** (atau **Alt+Delete**) menghapus skenario yang sedang dibuka di editor
  setelah konfirmasi. Pintasan tidak menyala saat fokus di kolom isian, saat ada dialog terbuka, saat
  belum ada skenario, dan saat skenario tinggal satu sehingga pack tidak kosong karena salah tekan.
- Tombol hapus per baris kini berlabel **🗑️ Hapus** dengan `aria-keyshortcuts`, dan petunjuk pintasan
  di editor menyebut cara menghapus. Setelah penghapusan, fokus pindah ke baris pengganti atau tombol
  **+ Tambah skenario**, dan pesan hasil masuk ke live region.
- `deleteScenarioShortcut()` memutuskan kapan pintasan boleh jalan dan diuji di
  `web/test/editor.test.js`.

## v1.6.6 — 2026-11-04

- Draft yang dihapus di tab lain kini juga terlihat saat pengguna berada di luar editor: event
  `storage` membandingkan potret daftar draft, menu langsung menyegarkan daftarnya, dan muncul
  pemberitahuan “draft dihapus di tab lain” supaya tombol **Lanjutkan** tidak menunjuk draft yang
  sudah tidak ada.
- `draftListChange()` melaporkan draft yang hilang/bertambah di antara dua potret daftar, dan diuji
  di `web/test/editor.test.js`.

## v1.6.5 — 2026-11-04

- Editor mengenali draft yang sedang dibuka ternyata dihapus di tab lain. Isi editor tidak ditulis
  ulang diam-diam dan tidak hilang; muncul pemberitahuan “draft ini dihapus di tab lain” beserta
  tombol **Simpan ulang sebagai draft** untuk memulihkan isi tab tersebut.
- Selama draft masih hilang, autosave berhenti menulis draft itu agar pemberitahuan tidak lepas
  tanpa disadari; **Simpan skenario** tetap boleh membuatnya kembali ke daftar main.
- `draftDeletionNotice()` memutuskan status draft (hadir, dihapus, masih bisa dipulihkan) dan diuji
  di `web/test/editor.test.js`.

## v1.6.4 — 2026-11-03

- Penyimpanan draft antar-tab memakai `updated_at` dan penggabungan deterministik: tab dengan versi
  lama tidak menimpa draft yang lebih baru, dan editor menampilkan pilihan **Muat versi terbaru** atau
  **Timpa dengan versi tab ini**.
- Daftar draft di layar editor diurutkan dari waktu edit terakhir, dan label status tetap benar setelah
  pengurutan.
- Pintasan Alt+D kini juga diabaikan saat fokus berada di elemen `select`.

## v1.6.3 — 2026-11-03

- Daftar draft tersimpan kini tampil di layar editor, bukan hanya di menu, lengkap dengan status tiap
  draft serta tombol **Lanjutkan** dan **Buang**.
- Draft yang isinya identik dengan pack tersimpan tidak lagi disembunyikan; draft itu ditandai
  “isinya sama dengan pack tersimpan” dan tetap tidak menulis pack baru sampai **Simpan skenario**
  ditekan.
- Pintasan **Alt+D** menggandakan skenario yang sedang dibuka di editor; pintasan diabaikan saat fokus
  berada di input, textarea, atau elemen `contenteditable`.

## v1.6.2 — 2026-11-03

- Draft lama tanpa `source_pack_id` dikenali sebagai draft yatim dari keberadaan pack di daftar main,
  sehingga mendapat label “pack sumber sudah dihapus” dan jaminan autosave yang sama.
- `source_pack_id` di-backfill hanya ke kunci draft saat draft lama dibuka; `pq_custom_packs_v1` tidak
  disentuh.

## v1.6.1 — 2026-11-03

- Autosave tidak lagi membuat pack baru: hanya **Simpan skenario** yang boleh menambah pack ke
  `pq_custom_packs_v1`, sehingga pack yang dihapus tetap hilang setelah reload + melanjutkan draft.
- Draft yatim ditandai di editor dan menu; konfirmasi hapus menjelaskan bahwa menyimpan draft akan
  membuat pack baru.

## v1.6.0 — 2026-11-03

- Hapus satu pack tersimpan dengan konfirmasi yang menyebut nama pack; draft editor tidak ikut
  terhapus dan draft yang berasal dari pack itu tetap tersimpan.
- Aksi gandakan skenario (⧉) menyalin skenario terpilih dengan id berikutnya sesuai prefix pack.
- Versi 1.6.0 dirilis bersama dokumen PRD, rencana implementasi, dan skema penyimpanan yang diperbarui.
