# 📐 Coding Rules — PhishQuest

> Aturan teknis wajib: gaya kode, teknologi, struktur folder, aturan konten, konvensi Git, dan CI.
> Tujuannya satu: **kode tetap seragam** siapa pun yang menulis — manusia atau AI.

| | |
|---|---|
| Versi dokumen | 1.0.0 |
| Terakhir diperbarui | 2026-11-02 |
| Sifat | **Wajib dipatuhi.** Pelanggaran = PR tidak di-merge |

---

## 1. Prinsip Kode

1. **Sederhana menang** — tanpa framework, tanpa build step (web), tanpa dependensi berlebih (CLI).
2. **Konten ≠ kode** — skenario hanya hidup di `content/`; dilarang menanam data skenario di file JS/Python.
3. **Satu sumber aturan** — logika XP/level/lencana hanya di engine; UI tidak pernah menghitung sendiri.
4. **Baca dulu, tulis kemudian** — edit file selalu setelah membaca kondisi terkini, bukan dari ingatan.
5. **Dokumen ikut kode** — perubahan perilaku = perbarui `docs/` di PR yang sama.

## 2. Struktur Folder Kanonis (WAJIB)

```text
phishquest/
├── PRD.md                          # bintang utara (root)
├── README.md                       # Indonesia (utama)
├── README.en.md                    # English
├── LICENSE                         # MIT
├── .gitignore
├── content/                        # SATU-SATUNYA sumber konten
│   ├── schema/
│   │   └── scenario.schema.json
│   ├── manifest.json
│   └── packs/
│       ├── ewallet-bank.json
│       ├── office.json
│       ├── shopping-courier.json
│       └── campus-gov.json
├── web/                            # versi web (statis, tanpa build)
│   ├── index.html                  # satu-satunya halaman
│   ├── package.json                # "type": "module" agar node --test membaca ESM
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── content.js              # muat manifest & pack via fetch
│   │   ├── engine.js               # aturan main (port dari engine.py)
│   │   ├── badges.js
│   │   ├── storage.js
│   │   ├── ui.js                   # render murni, tanpa state
│   │   └── app.js                  # titik masuk + navigasi
│   ├── test/
│   │   └── engine.test.js          # node --test, pakai fixture golden
│   └── assets/                     # logo.svg, og-image.png, favicon
├── cli/
│   └── src/phishquest/
│       ├── __init__.py             # __version__
│       ├── __main__.py             # python -m phishquest
│       ├── cli.py                  # argparse + main()
│       ├── content.py              # muat manifest/pack
│       ├── engine.py               # aturan main
│       ├── badges.py
│       ├── storage.py
│       ├── ui.py                   # komponen Rich
│       └── models.py               # dataclass + konstanta
├── tests/                          # test Python (pytest)
│   ├── test_engine.py
│   ├── test_badges.py
│   ├── test_storage.py
│   ├── test_validator.py
│   └── fixtures/
│       └── golden.json             # fixture kontrak JS↔Python
├── scripts/
│   ├── validate_content.py         # orkestrasi, exit code, eksekusi CI
│   └── content_rules.py            # konstanta & util bersama validator
├── docs/
│   ├── api-specification.md
│   ├── database-schema.md
│   ├── implementation-plan.md
│   ├── coding-rules.md             # ← file ini
│   └── assets/                     # gif & screenshot README
└── .github/
    ├── workflows/
    │   ├── ci.yml
    │   └── pages.yml
    └── ISSUE_TEMPLATE/             # bug_report.md, content_idea.md
```

**Aturan struktur:**

1. Tidak boleh membuat file di luar pohon ini; bila perlu, perbarui dokumen ini dulu di PR yang sama.
2. `content/` read-only bagi kode runtime — hanya kontributor & validator yang mengubahnya.
3. Nama file JS = `kebab-case`; modul Python = `snake_case`.
4. Tidak ada file > 500 baris; bila lewat, pecah per tanggung jawab.

## 3. Aturan Python (CLI)

### 3.1 Versi & Dependensi

| Paket | Versi | Peran |
|-------|-------|-------|
| Python | ≥ 3.10 | Runtime |
| `rich` | ≥ 13 | Runtime — satu-satunya dependensi runtime |
| `pytest`, `pytest-cov` | latest | Dev |
| `ruff` | latest | Dev — linter + formatter |

Dilarang menambah dependensi tanpa revisi dokumen ini (alasan + trade-off ditulis di PR).

### 3.2 Gaya

- Ruff: `line-length = 100`, `target-version = "py310"`, `select = ["E", "F", "I", "UP", "B", "SIM"]`; format mengikuti gaya Ruff default.
- **Type hints wajib** untuk semua fungsi publik dan field dataclass.
- Docstring **Google style**: satu baris ringkas + `Args/Returns/Raises` untuk fungsi publik.
- Penamaan: `snake_case` fungsi/variabel, `PascalCase` kelas, `UPPER_SNAKE` konstanta.
- `pathlib.Path` — dilarang `os.path`.
- f-string untuk format; dilarang `%` atau `.format()`.
- Konstanta aturan main terpusat di `models.py`:

```python
XP_BASE = 10
STREAK_STEP = 2
STREAK_CAP = 10
LEVELS: list[tuple[int, str]] = [
    (0, "amatir"), (100, "analis_muda"), (250, "analis"),
    (450, "detektif"), (650, "phishhunter"),
]
```

### 3.3 Error & Logging

- Hierarki eksepsi: `PhishQuestError` → `ContentError` | `StorageError` (lihat `api-specification.md` §4.3).
- `main()` menangkap `PhishQuestError` → pesan ramah Rich + exit code sesuai §6 `api-specification.md`.
- Dilarang `print()` — gunakan `rich.console.Console`.
- Dilarang `try/except` telanjang; minimal `except PhishQuestError as e`.

### 3.4 Contoh

```python
# ✅ BAIK
def level_for(total_xp: int) -> str:
    """Kembalikan id level untuk total_xp tertentu.

    Args:
        total_xp: XP kumulatif pemain.

    Returns:
        Id level (mis. "analis").
    """
    threshold, level_id = LEVELS[0]
    for threshold, level_id in LEVELS:
        if total_xp >= threshold:
            continue
        break
    return level_id

# ❌ BURUK
def lvl(x):  # tanpa tipe, tanpa docstring, nama rahasia
    return "detektif" if x >= 450 else "amatir"   # logika level bocor di luar engine
```

## 4. Aturan JavaScript (Web)

1. **ES Modules** (`<script type="module">`), mode strict implisit.
2. **Tanpa framework, tanpa build, tanpa CDN JS** — JS murni; satu-satunya sumber eksternal boleh adalah Google Fonts.
3. `const` default; `let` bila perlu; **dilarang `var`**.
4. Penamaan `camelCase`; nama file `kebab-case`; fungsi render = `renderXxx()`; handler = `onXxx()`.
5. **JSDoc wajib** untuk fungsi publik (parameter & return).
6. Dilarang handler inline di HTML (`onclick=…`) — semua lewat `addEventListener`/delegasi.
7. Cache referensi DOM (querySelector di luar loop); render via template literal; **escape** semua string konten sebelum innerHTML (fungsi `escapeHtml()` di `ui.js`).
8. Semua fetch dibungkus try/catch → `PQError` (`api-specification.md` §3.4); UI harus tetap berfungsi offline setelah konten ter-cache.
9. Dilarang menyimpan state game di variabel global — state tinggal di instance `Session` + `storage.js`.

```js
// ✅ BAIK
/**
 * Hitung bonus streak.
 * @param {number} streakAfter - streak setelah jawaban benar.
 * @returns {number} bonus XP (0–10).
 */
export function streakBonus(streakAfter) {
  return Math.min(Math.max(streakAfter - 1, 0) * 2, STREAK_CAP);
}

// ❌ BURUK
var bonus = (streak - 1) * 2; // di UI, tanpa cap, var, global
```

## 5. Aturan CSS & Desain Visual

### 5.1 Token (CSS Custom Properties) — sumber kebenaran palet

```css
:root {
  --pq-bg: #FFF7ED;      /* latar krem hangat */
  --pq-surface: #FFFFFF; /* kartu */
  --pq-text: #1F2937;    /* teks utama */
  --pq-muted: #6B7280;   /* teks sekunder */
  --pq-primary: #7C3AED; /* ungu — aksi utama */
  --pq-primary-soft: #EDE9FE;
  --pq-accent: #06B6D4;  /* cyan — highlight */
  --pq-success: #22C55E; /* benar */
  --pq-danger:  #EF4444; /* salah / red flag */
  --pq-warning: #F59E0B; /* XP & streak */
  --pq-border:  #E5E7EB;
  --pq-radius: 16px;
  --pq-shadow: 0 4px 14px rgb(31 41 55 / 0.08);
}
```

### 5.2 Gaya

- **Mobile-first**: base style untuk 360 px, `min-width` media query untuk desktop.
- Penamaan kelas **BEM-lite**: `.block`, `.block__elem`, `.block--mod` (mis. `.card--phish`).
- Dilarang `!important` (kecuali override utility aksesibilitas), dilarang nilai warna literal di luar `:root`.
- Animasi ≤ 200 ms, `ease-out`; wajib ada blok:

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- Font: `Baloo 2` (judul), `Nunito` (isi), fallback `system-ui, sans-serif`; ukuran 13/14/16/20/24/32 px.
- Fokus keyboard selalu terlihat: `:focus-visible { outline: 3px solid var(--pq-accent); }`.
- Kontras teks ≥ 4.5:1 — verifikasi setiap kombinasi token sebelum dipakai.

## 6. Aturan JSON & Konten

### 6.1 Format

- JSON ketat: tanpa komentar, tanpa trailing comma, indentasi 2 spasi, UTF-8/LF.
- Kunci `snake_case`; `schema_version` wajib di setiap file kontrak.
- Enum **tidak boleh** ditambah tanpa revisi PRD + dokumen ini.

### 6.2 Whitelist Brand Fiktif

Konten **wajib** memakai brand fiktif dari tabel ini (tambahan brand = revisi dokumen ini):

| Brand | Peran | Domain resmi (untuk pesan legit) |
|-------|-------|----------------------------------|
| **BankNusa** | Bank | `banknusa.example` |
| **DompetKu** | E-wallet | `dompetku.example` |
| **TokoKilat** | E-commerce | `tokokilat.example` |
| **KargoCepat** | Logistik/kurir | `kargocepat.example` |
| **KampusNusantara** | Universitas | `kampusnusantara.example` |
| **SIBANTAR** | Lembaga siber pemerintah (fiktif) | `sibantar.example` |
| **AsurKita** | Asuransi | `asurkita.example` |
| **LapakRia** | Marketplace UMKM | `lapakria.example` |

Aturan domain:

1. Pesan **legit** hanya boleh berlink ke domain whitelist di atas.
2. Pesan **phishing** harus memakai domain jelas-jelas palsu — pola aman: hyphen/sufiks aneh/TLD murahan (`banknusa-secure.example`, `dompetku-kyc.example`, `kargocepat-resi.example`).
3. Nama layanan shortener nyata (`bit.ly`, `s.id`) boleh sebagai **teks** karena tidak mengarah ke mana pun.
4. Nama instansi nyata (Dukcapil, bank nyata, dll.) **tidak boleh** jadi pengirim; boleh disebut umum di `teach` ("pihak bank mana pun tidak pernah meminta OTP").
5. Sebelum rilis: kunjugsi manual semua domain contoh — wajib tidak aktif.

### 6.3 Gaya Bahasa Konten

- Bahasa Indonesia baku tapi natural; gaya penipuan diperbolehkan (kapital berlebihan, kalimat kaku) karena itu bagian dari red flag.
- `explanation` ≤ 3 kalimat; `teach.tip` & `teach.verify_how` ≤ 2 kalimat; `body` ≤ ±120 kata.
- Emoji diperbolehkan dan memang diharapkan di UI; di isi pesan sesuai realitas pesan penipuan.
- Nama orang fiktif generik (Budi, Sari, dsb.) — tanpa nama tokoh nyata.

## 7. Aturan Git & Commit

### 7.1 Conventional Commits (wajib)

| Tipe | Untuk | Contoh |
|------|-------|--------|
| `feat` | fitur baru | `feat(cli): subcommand stats dengan bar XP` |
| `fix` | perbaikan bug | `fix(engine): bonus streak tidak melewati cap 10` |
| `content` | tambah/ubah skenario | `content(ewallet): tambah skenario OTP palsu ew-007` |
| `docs` | dokumentasi | `docs(prd): perbarui ambang level Analis` |
| `test` | test saja | `test(engine): kasus tepat di ambang 650 XP` |
| `refactor` | tanpa ubah perilaku | `refactor(ui): pisahkan render recap` |
| `chore`/`ci` | tooling & pipeline | `ci: jalankan golden test node di job terpisah` |

### 7.2 Branch & Review

- `main` dilindungi: PR + CI hijau dulu; **dilarang force-push**.
- Branch: `feat/<topik>`, `content/<pack>`, `fix/<topik>`.
- Satu PR = satu tujuan; ideal < 400 baris diff (konten boleh lebih).
- Commit kecil & atomik — bukan "update macem-macem".

## 8. CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  lint-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install ruff
      - run: ruff check cli/ scripts/ tests/
      - run: ruff format --check cli/ scripts/ tests/
  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -e cli/[test] pytest-cov
      - run: pytest --cov=phishquest --cov-fail-under=90 tests/
  test-js:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }
      - run: node --test web/test/
  validate-content:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: python scripts/validate_content.py content/
```

Prinsip: **semua job wajib hijau** sebelum merge; `pages.yml` terpisah dan hanya deploy dari `main`.

## 9. Aturan Kolaborasi dengan AI

Dokumen ini juga "kompas" untuk AI yang membangun proyek. Aturannya:

1. **Baca dulu** `PRD.md` + `implementation-plan.md` sebelum menulis kode; jangan bertanya ulang keputusan yang sudah "Terkunci" (PRD §6).
2. **Satu milestone, satu tugas** — kerjakan sesuai nomor tugas (mis. M1.3), commit, lalu lanjut. Jangan men-generate seluruh repo sekaligus.
3. **Jangan menambah** dependensi, file, atau fitur di luar dokumen ini. Ide baru → catat di deskripsi PR sebagai usulan.
4. **Jangan mengubah** `schema_version`, enum, ambang XP/level, atau struktur data tanpa memperbarui `PRD.md`, `api-specification.md`, dan `database-schema.md` di PR yang sama.
5. Semua file baru sesuai pohon §2; file > 500 baris wajib dipecah.
6. Sebelum commit: `ruff check && ruff format --check && pytest && python scripts/validate_content.py content/ && node --test web/test/` — semua hijau.
7. Bila requirement terasa ambigu: pilih interpretasi yang **paling dekat dengan PRD**, lalu nyatakan asumsi itu di deskripsi PR.
8. Dilarang menyisakan `TODO`/`FIXME` di kode yang di-commit — catat di Issues.

## 10. Definition of Done (Global)

Sebuah pekerjaan dinyatakan selesai bila **semua** ini benar:

- [ ] Lint & format bersih (ruff; JS lolos `node --check`/test)
- [ ] Test lulus; coverage engine ≥ 90%
- [ ] Validator konten exit 0 (bila menyentuh konten)
- [ ] Golden test JS↔Python tetap hijau (bila menyentuh engine)
- [ ] Dokumen `docs/` diperbarui bila perilaku/kontrak berubah
- [ ] Tanpa `TODO`/placeholder/kode mati/komentar besar yang dinonaktifkan
- [ ] Demo manual: fitur terlihat bekerja (CLI berjalan / halaman web berfungsi)
- [ ] Pesan commit Conventional Commits yang deskriptif
