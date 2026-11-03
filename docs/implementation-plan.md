# 🗺️ Implementation Plan — PhishQuest

> Rencana pengerjaan bertahap v1.0. Dibagi menjadi milestone kecil dengan *Definition of Done*
> (DoD) agar pengerjaan — oleh manusia maupun AI — berjalan rapi, hemat token, dan setiap tahap
> meninggalkan repo dalam kondisi bisa dijalankan.

| | |
|---|---|
| Versi dokumen | 1.0.0 |
| Terakhir diperbarui | 2026-11-02 |
| Estimasi total | **±8,5 hari kerja paruh waktu** (≈ 3 minggu bila 2–3 jam/hari) |
| Prasyarat | Baca `PRD.md` penuh + `coding-rules.md` §1–2 sebelum M0 |

---

## 1. Prinsip Pengerjaan (untuk Manusia & AI)

1. **Urutan milestone ketat** — jangan loncat. M(n+1) baru dimulai setelah DoD M(n) tercapai dan di-commit.
2. **Satu tugas = satu commit kecil** dengan pesan Conventional Commits (`coding-rules.md` §7).
3. **Repo selalu runnable** — di akhir setiap commit, semua test & validator yang ada harus hijau.
4. **Aturan hemat token (khusus AI):** kerjakan **satu file per langkah**, jangan men-generate banyak file sekaligus; jangan menulis ulang file yang sudah benar; baca dulu sebelum edit.
5. **Jangan menambah fitur** di luar ruang lingkup milestone. Ide baru dicatat di GitHub Issues, bukan langsung dikode.
6. **Dokumen ikut kode** — bila implementasi menyimpang dari dokumen `docs/`, perbaiki keduanya di PR yang sama.

## 2. Ringkasan Milestone

| Milestone | Nama | Estimasi | Output utama |
|-----------|------|----------|--------------|
| **M0** | Fondasi repo | 0,5 hari | Struktur folder, LICENSE, CI pertama hijau |
| **M1** | Konten & skema | 2 hari | Skema JSON + validator + 40 skenario (4 pack) |
| **M2** | Engine ganda | 1 hari | `engine.py` + `engine.js` + golden test identik |
| **M3** | CLI | 1,5 hari | Paket `phishquest` lengkap + GIF demo |
| **M4** | Web | 2,5 hari | Web statis lengkap siap Pages, Lighthouse ≥ 90 |
| **M5** | Poles & rilis | 1 hari | README dwibahasa, Pages live, tag v1.0.0 |

```
M0 ──► M1 ──► M2 ──► M3 ──► M4 ──► M5 ──► 🚀 v1.0.0
fondasi  konten  engine  CLI    web    rilis
```

---

## 3. M0 — Fondasi Repo (0,5 hari)

**Tujuan:** repo siap dihuni; CI berjalan sejak commit pertama.

| # | Tugas | File |
|---|-------|------|
| 0.1 | Inisialisasi repo, lisensi **MIT**, `.gitignore` (Python + Node + macOS) | `LICENSE`, `.gitignore` |
| 0.2 | Buat struktur folder kanonis (lihat `coding-rules.md` §2), isi `.gitkeep` untuk folder kosong | seluruh pohon |
| 0.3 | `pyproject.toml` paket CLI (nama `phishquest`, runtime `rich`, dev `pytest`+`ruff`, script entry `phishquest`) | `cli/pyproject.toml` |
| 0.4 | Workflow CI: lint Python (ruff), test (pytest), cek sintaks JS (`node --check`), validasi konten (boleh no-op di M0) | `.github/workflows/ci.yml` |
| 0.5 | README stub (judul + tagline + "🚧 dalam pengerjaan") | `README.md` |

**DoD:** CI hijau di commit pertama; `pip install -e cli/` sukses; struktur folder lengkap sesuai kanon.

## 4. M1 — Konten & Skema (2 hari)

**Tujuan:** 40 skenario valid + alat validasi otomatis. **Konten dulu sebelum kode game** — engine butuh data nyata untuk diuji.

| # | Tugas | File |
|---|-------|------|
| 1.1 | JSON Schema draft 2020-12 untuk objek Skenario (field wajib, enum, pattern `id`) | `content/schema/scenario.schema.json` |
| 1.2 | Validator konten (pemeriksaan sesuai `api-specification.md` §5) | `scripts/validate_content.py` + `tests/test_validator.py` |
| 1.3 | Pack 🏦 E-Wallet & Bank — 10 skenario (3 mudah/4 sedang/3 sulit; ≥7 phish_or_legit, ≥2 best_action, ≥1 spot_redflag; 6 phish/4 legit) | `content/packs/ewallet-bank.json` |
| 1.4 | Pack 📦 Belanja & Kurir — 10 skenario, komposisi sama | `content/packs/shopping-courier.json` |
| 1.5 | Pack 🏢 Kehidupan Kantor — 10 skenario (HRD update data, invoice vendor, gift card "CEO") | `content/packs/office.json` |
| 1.6 | Pack 🎓 Kampus & Pemerintahan — 10 skenario (beasiswa fiktif, instansi fiktif SIBANTAR, pajak) | `content/packs/campus-gov.json` |
| 1.7 | Manifest + cek cakupan 12/12 red flag lintas koleksi | `content/manifest.json` |

**DoD:** `python scripts/validate_content.py content/` exit 0; 40 skenario; cakupan red flag 12/12; review manual setiap `teach.verify_how` benar secara praktik; semua domain contoh bukan whitelist.

> 💡 **Tips kualitas konten:** tulis dulu 3 skenario per pack sebagai acuan gaya, baru lengkapi sisanya. Skenario terbaik meniru pesan penipuan nyata yang pernah beredar di Indonesia (tanpa memakai brand nyata).

## 5. M2 — Engine Ganda + Golden Test (1 hari)

**Tujuan:** aturan main (penilaian, XP, streak, level, lencana) terbukti identik di dua bahasa.

| # | Tugas | File |
|---|-------|------|
| 2.1 | Dataclass + konstanta (XP, ambang level, syarat lencana) | `cli/src/phishquest/models.py` |
| 2.2 | `engine.py`: `start_session`, `answer`, `summary` (spesifikasi: `api-specification.md` §4) + unit test | `cli/src/phishquest/engine.py`, `tests/test_engine.py` |
| 2.3 | `badges.py` evaluasi lencana + unit test | `cli/src/phishquest/badges.py`, `tests/test_badges.py` |
| 2.4 | **Fixture golden** (±10 kasus: semua tipe soal, benar & salah, ambang streak/level/lencana) | `tests/fixtures/golden.json` |
| 2.5 | Port ke JS: `engine.js` + `badges.js`, uji dengan `node --test` memakai fixture yang sama | `web/js/engine.js`, `web/js/badges.js`, `web/test/engine.test.js` |
| 2.6 | Workflow CI menambahkan job test JS | `.github/workflows/ci.yml` |

**DoD:** golden test hijau di Python **dan** JS dengan output field identik (`api-specification.md` §9); coverage `engine.py`+`badges.py` ≥ 90%; tidak ada logika XP di luar engine.

## 6. M3 — CLI (1,5 hari)

**Tujuan:** `pipx install` → game jalan penuh di terminal.

| # | Tugas | File |
|---|-------|------|
| 3.1 | `storage.py`: load/save atomik `~/.phishquest/`, ekspor/impor, reset + test | `cli/src/phishquest/storage.py`, `tests/test_storage.py` |
| 3.2 | `content.py`: muat manifest/pack dari `content/` (path bawaan paket + opsi override `--content`) | `cli/src/phishquest/content.py` |
| 3.3 | `ui.py`: panel pesan email/SMS/WA, tabel pack, bar XP, panel umpan balik (Rich) | `cli/src/phishquest/ui.py` |
| 3.4 | `cli.py`: subcommands `play`, `packs`, `stats`, `badges`, `export`, `reset`, `version` + menu interaktif default (spesifikasi: `api-specification.md` §6) | `cli/src/phishquest/cli.py` |
| 3.5 | Loop bermain: render → prompt jawaban (P/L atau opsi A–D) → umpan balik → recap + simpan progres | `cli.py` |
| 3.6 | Rekam GIF demo (`asciinema` + konversi, ≤ 3 MB) untuk README | `docs/assets/cli-demo.gif` |

**DoD:** semua perintah berfungsi sesuai tabel §6 `api-specification.md` (exit code termasuk); progres bertahan antar sesi; `pipx install .` jalan di Linux & Windows; GIF di-commit.

## 7. M4 — Web (2,5 hari)

**Tujuan:** web statis lengkap, mobile-first, siap deploy Pages.

| # | Tugas | File |
|---|-------|------|
| 4.1 | Kerangka HTML semantik + token CSS (palet §11.4 PRD) + font | `web/index.html`, `web/css/styles.css` |
| 4.2 | `storage.js` (localStorage, debounce, ekspor/impor, reset) | `web/js/storage.js` |
| 4.3 | `ui.js`: render kartu pesan per kanal (email/SMS/WA), panel umpan balik beranotasi red flag, kartu lencana | `web/js/ui.js` |
| 4.4 | `app.js`: navigasi layar menu → permainan → recap; keyboard shortcut (P/L, 1–4, Enter); `aria-live` umpan balik | `web/js/app.js` |
| 4.5 | Layar menu: kartu pack + best score, mode Campur, header XP/level, tab lencana & tentang | `index.html` |
| 4.6 | Layar recap: skor, akurasi, lencana baru, progress bar level, konfeti CSS/JS sendiri (≤ 50 baris, hormati `prefers-reduced-motion`), review kesalahan | `app.js`, `ui.js` |
| 4.7 | Aksesibilitas & responsivitas: uji 360 px, kontras, fokus terlihat | `styles.css` |
| 4.8 | Ukur: Lighthouse ≥ 90 Performance & Accessibility; total aset ter-gzip < 200 KB | — |

**DoD:** bisa dimainkan penuh via `python -m http.server` lokal (menu → 10 soal → recap); tanpa error konsol; Lighthouse target tercapai; tidak ada dependensi JS eksternal.

## 8. M5 — Poles & Rilis v1.0.0 (1 hari)

**Tujuan:** publik rapi dan menarik.

| # | Tugas |
|---|-------|
| 5.1 | README.md (Indonesia) + README.en.md: GIF CLI + screenshot web, badge (CI, license, Python, PRs welcome), cara main (link demo + pipx), tabel pack, section **Ethics & Legal**, cara kontribusi konten |
| 5.2 | Workflow deploy GitHub Pages (push ke `main` → site dari `web/` + `content/`) | `.github/workflows/pages.yml` |
| 5.3 | Metadata repo: description, topics (`phishing`, `security-awareness`, `cybersecurity`, `education`, `python`, `javascript`, `cli`, `game`), og-image, social preview |
| 5.4 | Verifikasi etika: semua domain contoh tidak aktif; disclaimer tampil di web/CLI/README |
| 5.5 | Tag **v1.0.0** + GitHub Release notes (fitur, screenshot, roadmap) |
| 5.6 | (Opsional) Posting ke komunitas belajar; minta feedback pertama |

**DoD:** demo live di `https://<username>.github.io/phishquest/`; checklist rilis PRD §16 lengkap dicentang.

---

## 9. Roadmap Pasca v1.0

| Versi | Isi | Perkiraan | Status |
|-------|-----|-----------|--------|
| **v1.1.0** | Mode Terbatas Waktu (20 dtk/soal + bonus kecepatan) & leaderboard lokal per perangkat; mode Campur dengan pilihan jumlah soal; mini editor skenario (tempel JSON → validasi → main) | 2–3 hari | Dirilis (v1.1.0), diverifikasi di CLI dan situs live |
| **v1.2.0** | Ekspor editor menjadi pack `content/` lengkap + pemeriksa kesiapan pack (komposisi PRD §9.4, prefix id, field pack) dengan paritas validator JS↔Python | 1 hari | Dirilis (v1.2.0) |
| **v1.3.0** | Editor pack lokal multi-skenario (tambah/ganti judul/hapus/urut ulang tanpa JSON mentah), persistensi perangkat, ekspor seluruh skenario | 1–2 hari | Dirilis (v1.3.0) |
| **v1.4.0** | Pemilih `pack_id` konten + penyelarasan prefix id; draft editor belum valid tersimpan di kunci terpisah sehingga bertahan setelah reload tanpa menimpa pack valid | 1 hari | Dirilis (v1.4.0) |
| **v1.5.0** | Penjaga bentrok `pack_id` (pack lain tidak tertimpa, draft tetap tersimpan) dan daftar draft di menu dengan tombol “Lanjutkan draft” | 1 hari | Dirilis (v1.5.0) |
| **v1.6.0** | Hapus satu pack tersimpan dengan konfirmasi bernama (draft tidak ikut terhapus) dan aksi gandakan skenario ber-id baru | 1 hari | Dirilis (v1.6.0) |
| **v1.6.1** | Autosave berhenti membuat pack baru (hanya memperbarui pack yang sudah ada); draft yatim ditandai dan hanya simpan eksplisit yang memulihkan pack | 1 hari | Dirilis (v1.6.1) |
| **v1.6.2** | Deteksi draft yatim memakai keberadaan pack di daftar main, sehingga draft pra-v1.6.1 tanpa `source_pack_id` ikut dilabeli dan tetap aman dari autosave | 1 hari | Dirilis (v1.6.2) |
| **v1.6.3** | Daftar draft di layar editor, penyingkapan draft identik, pintasan Alt+D, dan `CHANGELOG.md` | 1 hari | Dirilis (v1.6.3) |
| **v1.6.4** | Penggabungan draft antar-tab berbasis `updated_at` dengan permukaan konflik, urutan draft terbaru-dulu, dan pengabaian pintasan di `select` | 1 hari | Dirilis (v1.6.4) |
| **v2.0.0** | Leaderboard online opsional (FastAPI + SQLite, spesifikasi `api-specification.md` §7 + `database-schema.md` §5); kartu bagikan skor (gambar via canvas); i18n Inggris (UI + terjemahan skenario) | 1–2 minggu | Belum dikerjakan |

## 10. Strategi Pengujian

| Lapisan | Alat | Cakupan |
|---------|------|---------|
| Unit engine Python | `pytest` | XP, streak, level, penilaian per tipe soal, kasus tepat di ambang |
| Unit lencana | `pytest` | Setiap syarat lencana + kasus negatif |
| Golden kontrak | `pytest` + `node --test` pada `tests/fixtures/golden.json` | Identitas output JS ↔ Python |
| Validator konten | `pytest` + run CI | Semua aturan §5 `api-specification.md` |
| Storage CLI | `pytest` (tmp dir) | Save/load atomik, korup, migrasi minor |
| Web | `node --test` untuk engine; sisanya checklist manual | Checklist: main sampai recap, refresh di tengah sesi (progres bertahan), keyboard-only, 360 px, offline (konten ter-cache) |
| CLI manual | checklist | Menu, semua subcommand, `reset` tanpa `--yes` harus konfirmasi |

## 11. Checklist Rilis v1.0.0

- [x] CI hijau di commit rilis (4 job)
- [x] `python scripts/validate_content.py content/` exit 0
- [x] Golden test Python & JS hijau
- [x] Semua domain contoh dicek tidak aktif (kunjugsi manual)
- [x] Disclaimer etika tampil di: footer web, header CLI, README (dua bahasa)
- [x] Lighthouse ≥ 90 (Performance & Accessibility)
- [x] GIF demo < 3 MB ter-embed di kedua README
- [x] `pipx install ./cli` sukses di Windows (3.13); Linux belum dijalankan di mesin ini
- [x] Tag `v1.0.0` + GitHub Release
- [x] Pages live + link di README (badge "Play Demo")

## 12. Alokasi Waktu Total

| Milestone | Hari |
|-----------|------|
| M0 | 0,5 |
| M1 | 2,0 |
| M2 | 1,0 |
| M3 | 1,5 |
| M4 | 2,5 |
| M5 | 1,0 |
| **Total** | **8,5 hari** |

Bila waktu terbatas: M0–M3 sudah menghasilkan **CLI yang bisa dirilis** (MVP); M4–M5 menambah daya tarik demo web. Jangan tukar urutan M1 ← M2: engine tanpa konten nyata = test yang menguji buatan sendiri.

## 13. Status v1.1 – v1.6

- [x] Mode Terbatas Waktu (20 detik/soal + bonus kecepatan) — web & CLI, golden test dua bahasa
- [x] Leaderboard lokal per perangkat — `pq_leaderboard_v1` (web) dan `leaderboard.json` (CLI)
- [x] Mode Campur dengan jumlah soal pilihan — dropdown 5/10/20/40 di web, `--jumlah 5–40` di CLI; jumlah tak sah ditolak (`INVALID_COUNT`/exit 2), permintaan melebihi isi pool dipotong
- [x] Mini editor skenario (tempel JSON → validasi → main) — `web/js/scenario_editor.js`, tersimpan di `pq_custom_packs_v1`, ekspor JSON, tanpa backend
- [x] Ekspor pack lokal berbentuk `content/` lengkap (`toContentPack`) — `schema_version`, `description`, dan `emoji` terisi otomatis
- [x] Pemeriksa kesiapan pack (`validatePackShape`) — aturan tingkat pack yang sama dengan `validate_pack`; status tampil di layar editor, paritas dibuktikan `web/test/editor-packs.json` + `tests/test_editor_pack_contract.py`
- [x] Editor multi-skenario (v1.3) — tambah, ganti judul (`label`, hanya perangkat), hapus, dan urutkan skenario lewat form; isian skenario lain tetap utuh saat berpindah; ekspor memuat semua skenario pack
- [x] Persistensi draft editor — perubahan disimpan ke `pq_custom_packs_v1` setelah seluruh skenario lolos `validateScenario`, sehingga bertahan setelah reload
- [x] Fixture paritas baru `web/test/editor-pack-ready.json` (10 skenario + label lokal) diterima `validate_pack` Python dan `validatePackShape` JS
- [x] Pemilih `pack_id` (empat ID bawaan + isian bebas) dan tombol “Selaraskan prefix id” — `pack_id` tak dikenal ditolak saat ekspor dengan pesan yang menyebut sebabnya
- [x] Draft editor tersimpan di `pq_editor_draft_v1` (termasuk yang belum valid) dan dipulihkan saat editor dibuka; `pq_custom_packs_v1` tetap hanya berisi pack valid yang bisa dimainkan
- [x] Uji baru: `web/test/editor-storage.test.js` (draft vs pack valid, id berubah, reset) dan paritas Python untuk keempat `pack_id` bawaan
- [x] `findPackIdConflict()` + `currentConflict()` mencegah satu pack menimpa pack lain yang memakai `pack_id` sama; editor menyebut ID yang bentrok dan tetap menyimpan isian sebagai draft
- [x] Menu menampilkan draft yang belum tersimpan sebagai pack valid dengan tombol “Lanjutkan draft” (aksi `editor-resume`)
- [x] `removeCustomPack()` menghapus satu pack dari daftar main; konfirmasi menyebut nama pack dan draft editor (termasuk draft yang berasal dari pack itu) tidak ikut dihapus
- [x] `duplicateScenario()` menyalin skenario terpilih dengan id berikutnya sesuai prefix pack, langsung lolos `validateScenario` dan tetap terkait di form editor
- [x] `savePlan()` memisahkan autosave dari simpan eksplisit: autosave tidak pernah menambah pack baru ke `pq_custom_packs_v1` sehingga pack yang dihapus tetap hilang setelah reload + melanjutkan draft
- [x] `draftIsOrphan()` + catatan editor/menu menandai draft yang pack sumbernya sudah dihapus; hanya tombol simpan eksplisit yang membuat pack baru
- [x] Deteksi yatim tidak bergantung pada `source_pack_id`: draft lama tanpa penanda tetap dilabeli bila `pack_id`-nya tidak ada di `pq_custom_packs_v1`, dan `source_pack_id` di-backfill hanya di kunci draft
- [x] `listDrafts()`/`draftStatus()` menampilkan semua draft (termasuk yang identik dengan pack tersimpan) di menu dan layar editor, dengan tombol Lanjutkan dan Buang
- [x] Pintasan `Alt+D` menggandakan skenario aktif; `isTextEntryTarget()` mematikan pintasan saat fokus di input/textarea/contenteditable
- [x] `CHANGELOG.md` mencatat riwayat v1.6.0–v1.6.4
- [x] `draftWriteDecision()` membandingkan `updated_at` tab ini dengan versi di penyimpanan: versi lama tidak ditulis, konflik ditampilkan dengan tombol **Muat versi terbaru**/**Timpa dengan versi tab ini**
- [x] `sortDrafts()`/`listDrafts()` mengurutkan draft dari edit terbaru tanpa mengubah label status
- [x] `isTextEntryTarget()` juga mengabaikan pintasan saat fokus di elemen `select`

