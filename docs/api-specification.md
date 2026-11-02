# 🔌 API Specification — PhishQuest

> Kontrak data dan antarmuka program. Dokumen ini memastikan engine web, engine CLI, dan konten
> berbicara dalam "bahasa" yang sama — tidak ada pihak yang menebak struktur data.

| | |
|---|---|
| Versi dokumen | 1.0.0 |
| Terakhir diperbarui | 2026-11-02 |
| Ruang lingkup | Kontrak data JSON · API internal web (JS) · API internal CLI (Python) · Antarmuka perintah CLI · Desain REST v2 |
| Prasyarat membaca | `PRD.md` §7 (konsep game) dan §9 (konten) |

> **Catatan penting:** v1.0 **tidak memiliki backend**. "API" PhishQuest terdiri dari empat lapis:
> ① kontrak data JSON (konten & progres), ② API internal modul web, ③ API internal modul CLI,
> ④ antarmuka perintah CLI. REST API (lapis ⑤) adalah **desain ke depan** untuk v2 dan tidak
> diimplementasikan di v1.0.

---

## 1. Konvensi Umum

| Konvensi | Nilai |
|----------|-------|
| Penamaan field | `snake_case` (JSON, Python, JS) |
| Tanggal & waktu | ISO-8601 dengan offset, mis. `2026-11-02T09:15:00+07:00` |
| Enum | `SCREAMING_SNAKE` untuk red flag; `snake_case` untuk level/pack/type |
| Bahasa nilai konten | Indonesia; bahasa **nama field** tetap Inggris |
| Versi skema | `schema_version: "1.0"` (semver dua segmen: MAJOR.MINOR) |
| ID skenario | `{prefix_packer}-{3 digit}`, unik global; prefix = 2 huruf pack (ew, of, sc, cg) |
| Encoding | UTF-8 tanpa BOM; LF line endings |

## 2. Kontrak Data Inti

### 2.1 `content/manifest.json` — Daftar Pack

| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `schema_version` | string | ✔ | `"1.0"` |
| `packs` | array | ✔ | Daftar metadata pack (tanpa isi skenario) |
| `packs[].pack_id` | string | ✔ | ID pack, mis. `ewallet-bank` |
| `packs[].file` | string | ✔ | Path relatif, mis. `packs/ewallet-bank.json` |
| `packs[].name` | string | ✔ | Nama tampil (Indonesia) |
| `packs[].emoji` | string | ✔ | Emoji pack |
| `packs[].scenario_count` | int | ✔ | Jumlah skenario (validator cek konsisten) |

Contoh:

```json
{
  "schema_version": "1.0",
  "packs": [
    { "pack_id": "ewallet-bank", "file": "packs/ewallet-bank.json",
      "name": "E-Wallet & Bank", "emoji": "🏦", "scenario_count": 10 },
    { "pack_id": "campus-gov", "file": "packs/campus-gov.json",
      "name": "Kampus & Pemerintahan", "emoji": "🎓", "scenario_count": 10 }
  ]
}
```

### 2.2 File Pack — `content/packs/<pack_id>.json`

| Field | Tipe | Wajib | Deskripsi |
|-------|------|-------|-----------|
| `schema_version` | string | ✔ | `"1.0"` |
| `pack_id` | string | ✔ | Harus sama dengan nama file |
| `name` | string | ✔ | Nama tampil |
| `description` | string | ✔ | 1 kalimat deskripsi pack |
| `emoji` | string | ✔ | Emoji pack |
| `scenarios` | array | ✔ | 10 skenario (lihat 2.3) |

### 2.3 Objek Skenario

| Field | Tipe | Wajib | Deskripsi / Aturan |
|-------|------|-------|--------------------|
| `id` | string | ✔ | Unik global, `{prefix}-{3 digit}` (mis. `ew-001`) |
| `type` | enum | ✔ | `phish_or_legit` \| `best_action` \| `spot_redflag` |
| `difficulty` | enum | ✔ | `mudah` \| `sedang` \| `sulit` |
| `channel` | enum | ✔ | `email` \| `sms` \| `whatsapp` |
| `sender` | object | ✔ | `{ "name": string, "address": string }` — untuk SMS/WA, `address` = nomor |
| `subject` | string | email | Subjek email; `null` untuk SMS/WA |
| `datetime` | string | ✔ | ISO-8601 `+07:00` |
| `body` | string | ✔ | Isi pesan, `\n` diperbolehkan, maks ±120 kata |
| `link` | object \| null | opsional | `{ "text": string, "href": string }` — teks tampil vs tujuan nyata (bisa disengaja berbeda untuk red flag) |
| `attachment` | object \| null | opsional | `{ "name": string, "size_kb": int }` |
| `options` | array \| null | `best_action`, `spot_redflag` | 3–4 opsi `{ "id": "A", "text": string }` |
| `is_phish` | bool | `phish_or_legit`, `best_action` | `true` bila pesan phishing |
| `correct_option` | string | `best_action`, `spot_redflag` | `id` opsi yang benar |
| `red_flags` | array | ✔ jika phishing; `[]` jika legit | 2–5 kode dari enum §2.4 |
| `explanation` | string | ✔ | ≤ 3 kalimat, alasan jawaban |
| `teach` | object | ✔ | `{ "tip": string, "verify_how": string }` — masing-masing ≤ 1–2 kalimat |

**Aturan konsistensi (divalidasi otomatis):**

1. Jika `is_phish = true` → `red_flags` berisi 2–5 kode; jika `false` → `red_flags` harus `[]`.
2. `link.href` untuk skenario **legit** harus berdomain resmi whitelist; untuk **phishing** tidak boleh berdomain whitelist.
3. `options` hanya boleh ada pada tipe `best_action`/`spot_redflag`, dan sebaliknya wajib di sana.
4. `correct_option` harus merujuk `id` yang ada di `options`.

### 2.4 Enum Referensi

**`type`:** `phish_or_legit` · `best_action` · `spot_redflag`
**`difficulty`:** `mudah` · `sedang` · `sulit`
**`channel`:** `email` · `sms` · `whatsapp`
**`level`:** `amatir` · `analis_muda` · `analis` · `detektif` · `phishhunter`
**`red_flags` (12, tetap — tidak boleh ditambah tanpa revisi PRD):**

```
PENGIRIM_TIDAK_WAJAR  DOMAIN_PALSU       DOMAIN_MIRIP      TEKANAN_WAKTU
ANCAMAN               IMBALAN_BERLEBIHAN MEMINTA_DATA_SENSITIF
LINK_MENCURIGAKAN     LAMPIRAN_BERBAHAYA GRAMATIKA_AJANG
SAPAAN_GENERIK        SALURAN_TIDAK_WAJAR
```

**`badge_id` (10):** `first_catch` · `streak_5` · `streak_10` · `perfect_pack` · `all_packs` · `domain_guard` · `otp_guard` · `urgency_guard` · `comeback` · `level_detective`

### 2.5 Objek Progres (Progress)

Identik untuk web (localStorage) dan CLI (file JSON). Struktur lengkap: `database-schema.md` §3–4.

```json
{
  "schema_version": "1.0",
  "created_at": "2026-11-02T09:00:00+07:00",
  "updated_at": "2026-11-02T10:15:00+07:00",
  "total_xp": 320,
  "level": "analis",
  "current_streak": 4,
  "best_streak": 9,
  "counters": {
    "answered": 32, "correct": 28, "wrong": 4, "sessions_completed": 3,
    "correct_redflag": { "DOMAIN_PALSU": 6, "DOMAIN_MIRIP": 4 }
  },
  "packs": {
    "ewallet-bank": { "sessions": 2, "best_score": 118, "max_score": 100,
                      "best_accuracy": 0.9, "last_played": "2026-11-02T10:15:00+07:00" }
  },
  "badges": { "first_catch": "2026-11-01T20:00:00+07:00",
              "streak_5": "2026-11-02T09:40:00+07:00" },
  "history": [ { "at": "2026-11-02T10:15:00+07:00", "pack_id": "ewallet-bank",
                 "score": 118, "max_score": 100, "accuracy": 0.9, "xp_gained": 118 } ]
}
```

### 2.6 Objek Pengaturan (Settings)

```json
{ "schema_version": "1.0", "locale": "id", "sound": true,
  "reduced_motion": false, "nickname": "" }
```

## 3. API Internal — Web (JavaScript)

Modul ES murni, tanpa framework. Semua fungsi publik ber-JSDoc.

| Modul | Tanggung jawab |
|-------|----------------|
| `web/js/content.js` | Muat manifest & pack (fetch); kelas `PQError` |
| `web/js/engine.js` | Susun sesi, nilai jawaban, hitung XP/streak/level |
| `web/js/badges.js` | Evaluasi lencana dari counter & hasil sesi |
| `web/js/storage.js` | Baca/tulis localStorage, ekspor/impor, reset |
| `web/js/ui.js` | Render kartu pesan, umpan balik, recap (murni fungsi render, tanpa state) |
| `web/js/app.js` | Titik masuk; navigasi layar; wiring event |

### 3.1 `engine.js`

```js
/** Memuat manifest.json. Melempar PQError('CONTENT_INVALID') bila schema_version ≠ "1.0". */
async function loadManifest()            // → Promise<Manifest>

/** Memuat satu pack berdasar pack_id; memvalidasi skema minimum (field wajib ada). */
async function loadPack(packId)          // → Promise<Pack>

/**
 * Membuat sesi. Opsi: {count=10, difficulty=null, seed=null, mode="classic", timeLimitMs=20000}.
 * 'Campur' = pack null + gabung. count < 1 → PQError('INVALID_COUNT');
 * count melebihi jumlah soal tersedia dipotong ke ukuran pool (tanpa error).
 */
function startSession(packs, opts)       // → Session (state internal)

session.current()                        // → Scenario | null
/**
 * Menilai jawaban pemain. optionId: "PHISH"/"LEGIT" untuk phish_or_legit,
 * atau id opsi ("A".."D") untuk tipe lain. Idempoten per soal: panggilan
 * kedua untuk soal sama melempar PQError('ALREADY_ANSWERED').
 */
session.answer(optionId)                 // → AnswerResult
session.hasNext()                        // → boolean
session.summary()                        // → SessionSummary (hanya valid setelah soal habis)
```

`SessionSummary` mencatat `requested_count` (jumlah yang diminta) dan `available_count`
(jumlah yang benar-benar dimainkan); `session` menyimpannya sebagai `requestedCount` (JS) /
`requested_count` (Python). Nilai count wajib bilangan bulat ≥ 1, aturan sama di kedua bahasa.

**`AnswerResult`** (kontrak tetap — identik dengan Python, lihat §6):

```json
{
  "correct": true,
  "xp_base": 10,
  "xp_bonus": 4,
  "xp_gained": 14,
  "streak_after": 3,
  "is_phish": true,
  "red_flags": ["DOMAIN_MIRIP", "TEKANAN_WAKTU"],
  "explanation": "…",
  "teach": { "tip": "…", "verify_how": "…" },
  "badges_earned": ["streak_5"],
  "level_up": null
}
```

**`SessionSummary`:** `{ pack_id, score, max_score, accuracy, xp_gained, best_streak_in_session, badges_earned[], level_before, level_after, mistakes[] }` — `mistakes[]` = daftar `{scenario_id, chosen, correct_answer}` untuk layar review.

### 3.2 `storage.js`

```js
loadProgress()            // → Progress | null      (null bila belum ada)
saveProgress(progress)    // → void                 (try/catch QuotaExceededError)
updateProgress(fn)        // → Progress             (load → fn(p) → save → return)
loadSettings()/saveSettings(s)
exportAll()               // → {progress, settings} (untuk tombol ekspor JSON)
importAll(json)           // → void                 (validasi schema_version, PQError bila tidak cocok)
resetAll()                // → void                 (hapus kedua key; konfirmasi di lapis UI)
```

### 3.3 `badges.js`

```js
/** Dipanggil setiap answer(): evaluasi counter kumulatif (first_catch, streak_*, *_guard). */
evaluateAfterAnswer(progress, answerResult)   // → badge_id[]
/** Dipanggil di recap: lencana berbasis sesi (perfect_pack, all_packs, comeback, level_detective). */
evaluateAfterSession(progress, sessionSummary) // → badge_id[]
```

### 3.4 Model Error Web

Kelas `PQError extends Error` dengan field `code`:

| `code` | Situs | Penanganan UI |
|--------|-------|---------------|
| `CONTENT_INVALID` | schema_version/field wajib tidak cocok | Toast "Konten rusak, muat ulang" |
| `CONTENT_UNAVAILABLE` | fetch gagal (offline) | Toast offline + tombol coba lagi |
| `ALREADY_ANSWERED` | jawab soal yang sama dua kali | Diabaikan (guard state) |
| `INVALID_OPTION` | id jawaban tidak dikenali untuk tipe soal | Diabaikan (guard state) |
| `SESSION_NOT_FINISHED` | `summary()` dipanggil sebelum semua soal dijawab | Kembali ke soal aktif |
| `NO_MORE_QUESTIONS` | menjawab saat tidak ada soal aktif | Kembali ke recap |
| `STORAGE_FULL` | QuotaExceededError | Toast "Penyimpanan penuh" |
| `STORAGE_CORRUPT` | JSON localStorage tidak valid | Reset progres setelah konfirmasi |

## 4. API Internal — CLI (Python)

Paket `phishquest` di `cli/src/phishquest/`. Semua fungsi publik bertipe (`typing`), docstring Google style.

| Modul | Tanggung jawab |
|-------|----------------|
| `models.py` | Dataclass: `Scenario`, `AnswerResult`, `SessionSummary`, `Progress`, `Settings` |
| `content.py` | Muat manifest & pack dari filesystem, validasi minimum |
| `engine.py` | Sesi & penilaian — port dari `engine.js` |
| `badges.py` | Evaluasi lencana — port dari `badges.js` |
| `storage.py` | Baca/tulis `~/.phishquest/*.json`, tulis atomik |
| `ui.py` | Komponen Rich: panel pesan, tabel pack, recap |
| `cli.py` | argparse subcommands, titik masuk `main()` |

### 4.1 Signature Inti

```python
# content.py
def load_manifest(content_dir: Path) -> Manifest: ...
def load_pack(content_dir: Path, pack_id: str | None) -> list[Pack]:
    """pack_id=None → kembalikan semua pack (untuk mode Campur)."""

# engine.py
def start_session(packs: list[Pack], *, count: int = 10,
                  difficulty: str | None = None, seed: int | None = None) -> Session: ...
def current(session: Session) -> Scenario: ...
def answer(session: Session, option_id: str) -> AnswerResult: ...
def has_next(session: Session) -> bool: ...
def summary(session: Session) -> SessionSummary: ...

# storage.py
def load_progress(path: Path = DEFAULT_DIR / "progress.json") -> Progress | None: ...
def save_progress(progress: Progress, path: Path = ...) -> None:
    """Tulis atomik: progress.json.tmp → os.replace."""
def export_all(dst: Path) -> None: ...
def import_all(src: Path) -> None: ...
def reset_all() -> None: ...
```

### 4.2 Dataclass Inti (ringkas)

```python
@dataclass
class AnswerResult:
    correct: bool
    xp_base: int
    xp_bonus: int
    xp_gained: int
    streak_after: int
    is_phish: bool
    red_flags: list[str]
    explanation: str
    teach: dict
    badges_earned: list[str]
    level_up: str | None          # id level baru bila naik, selain itu None

@dataclass
class SessionSummary:
    pack_id: str | None           # None untuk mode Campur
    score: int
    max_score: int
    accuracy: float
    xp_gained: int
    best_streak_in_session: int
    badges_earned: list[str]
    level_before: str
    level_after: str
    mistakes: list[dict]          # {scenario_id, chosen, correct_answer}
    recovered: bool               # True bila 3 salah beruntun lalu benar sampai sesi habis
```

### 4.3 Eksepsi

```python
class PhishQuestError(Exception): ...
class ContentError(PhishQuestError): ...     # konten tidak valid / tidak ditemukan
class StorageError(PhishQuestError): ...     # gagal baca/tulis/validasi progres
```

CLI `main()` menangkap `PhishQuestError` → cetak pesan ramah + exit code 1.

## 5. Tooling — Validator Konten

`scripts/validate_content.py` dipanggil CI dan lokal:

```bash
python scripts/validate_content.py content/      # exit 0 = valid
```

Pemeriksaan: (1) JSON valid + field wajib lengkap; (2) `schema_version` cocok; (3) `id` unik; (4) jumlah `scenario_count` manifest = isi pack; (5) aturan konsistensi §2.3 (red flag phishing vs legit, domain whitelist, opsi vs `correct_option`); (6) komposisi §9.4 PRD per pack; (7) kaidah konten (panjang, brand whitelist). Output per error: `ERROR <file> <scenario_id>: <pesan>`; peringatan format `WARN …` tidak menggagalkan build.

Exit codes: `0` valid · `1` error validasi · `2` argumen/path salah.

## 6. Antarmuka CLI (End-User API)

| Perintah | Argumen | Fungsi |
|----------|---------|--------|
| `phishquest` | — | Menu interaktif (pilih pack, stats, keluar) |
| `phishquest play` | `--pack ID` · `--difficulty X` · `--jumlah N` (pack 5–10, Campur 5–40; default 10) · `--seed S` · `--mode classic\|time-attack` | Main sesi; tanpa `--pack` = mode Campur. Jumlah di luar batas → exit 2 |
| `phishquest packs` | — | Tabel pack: nama, emoji, jumlah skenario, best score |
| `phishquest stats` | — | XP, level + progress bar, streak, akurasi, riwayat 5 sesi terakhir |
| `phishquest badges` | — | Grid lencana + status terperoleh/belum + syarat |
| `phishquest export [PATH]` | path opsional (default `phishquest-export.json`) | Ekspor progres+settings |
| `phishquest reset` | `--yes` (lewati konfirmasi) | Hapus progres |
| `phishquest version` | — | Versi paket |

**Exit codes:** `0` sukses · `1` runtime error (`PhishQuestError`) · `2` argumen tidak valid · `3` konten tidak valid (`ContentError`).

## 7. REST API v2 — Desain ke Depan (Opsional, TIDAK di v1.0)

Leaderboard online **anonim tanpa PII**. Backend rencana: FastAPI + SQLite (`database-schema.md` §6), di-host terpisah dari Pages. Bagian ini difinalkan sekarang supaya implementasi v2 tidak mengubah kontrak web.

### 7.1 Prinsip

| Aspek | Keputusan |
|-------|-----------|
| Base URL | `https://api.<domain>/v1` (versi di path) |
| Format | JSON; waktu ISO-8601 UTC |
| Autentikasi | **Tidak ada akun.** Pemain memakai nickname lokal; anti-abuse via HMAC (7.3) + rate limit |
| CORS | `GET` terbuka; `POST` dari origin Pages saja |
| Idempotensi | `POST /v1/scores` menerima header `Idempotency-Key` (UUID dari klien) |

### 7.2 Endpoint

**`GET /healthz`** → `200 { "status": "ok", "version": "2.0.0" }`

**`POST /v1/scores`** — kirim hasil sesi.

```jsonc
// Request
{
  "nickname": "budi_analisis",   // 1–16 char, regex ^[A-Za-z0-9_.-]+$
  "pack_id": "ewallet-bank",     // atau "campuran"
  "score": 118,
  "max_score": 100,
  "accuracy": 0.9,               // 0.0–1.0
  "duration_s": 312,
  "client_version": "2.0.0",
  "sig": "<hex>"                 // HMAC, lihat 7.3
}
// 201 Created
{ "id": 8123, "rank": 7, "total": 421 }
```

Error: `400 VALIDATION_ERROR` · `409 DUPLICATE` (Idempotency-Key sama) · `422 SIGNATURE_INVALID` · `429 RATE_LIMITED` (header `Retry-After`).

**`GET /v1/leaderboard?pack_id=ewallet-bank&period=day|week|all&limit=20&cursor=<opaque>`**

```jsonc
// 200
{ "items": [ { "rank": 1, "nickname": "budi_analisis", "score": 130,
               "accuracy": 1.0, "duration_s": 205, "created_at": "2026-11-01T12:00:00Z" } ],
  "next_cursor": "eyJvZmZzZXQiOjIwfQ" | null }
```

`limit` maks 50; ranking order: `score DESC, duration_s ASC, created_at ASC`.

**`GET /v1/stats/global`** → `200 { "total_players": 1200, "total_sessions": 5300, "avg_accuracy": 0.78 }`

### 7.3 Anti-Abuse (jujur: bukan keamanan, hanya rem)

`sig = HMAC_SHA256(SEMBANGAN_CLIENT, nickname|pack_id|score|accuracy|duration_s)` — secret ikut terdistribusi di JS klien, jadi hanya menghambat spam skrip kasar. Pertahanan sesungguhnya: rate limit **60 req/jam/IP**, validasi range nilai (score ≤ 999, duration_s ≤ 7200), tanpa data yang layak dilindungi sehingga kebocoran/impossible to forge tidak berdampak.

### 7.4 Model Error Standar

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "accuracy harus 0.0–1.0", "field": "accuracy" } }
```

## 8. Versioning & Kompatibilitas

1. `schema_version` MAJOR naik bila ada perubahan *breaking* pada kontrak (field dihapus/ganti tipe/semantik berubah); MINOR bila menambah field opsional.
2. Konsumen (engine web/CLI) **menolak konten dengan MAJOR berbeda** (`CONTENT_INVALID`).
3. MINOR lebih tinggi diterima; field yang tidak dikenal **harus diabaikan** (toleran-ke-depan).
4. Migrasi progres lokal: lihat `database-schema.md` §8.

## 9. Kontrak Uji Golden (Web ↔ CLI)

`tests/fixtures/golden.json` berisi peta `scenarios` (id → objek skenario) plus `answer_cases` (`{scenario_id, option_id, progress, expected}`) dan `session_cases` (`{scenario_ids, seed, answers, expected_order, expected}`) untuk ±10 kasus (semua tipe soal, benar & salah, tepat di ambang level & streak). `pytest` menjalankan `engine.py`, `node --test` menjalankan `engine.js` terhadap fixture **yang sama**. Field yang wajib identik:

| Field | Field |
|-------|-------|
| `correct` | `xp_base` · `xp_bonus` · `xp_gained` |
| `streak_after` | `badges_earned` |
| `level_up` | `red_flags` (urutan sama) |
| `summary.score` | `summary.accuracy` · `summary.level_after` |

Rumus yang diuji eksplisit: XP dasar 10; bonus streak `min((streak−1)×2, 10)`; ambang level 0/100/250/450/650; lencana sesuai PRD §7.4.

## 10. Tambahan v1.1 — mode terbatas waktu & papan skor lokal

### 10.1 Mode sesi

`start_session(packs, mode=..., time_limit_ms=...)` / `startSession(packs, {mode, timeLimitMs})`.
`mode` menerima `classic` (default) atau `time_attack`; `time_limit_ms` default `20000`.
Mode tidak dikenal menghasilkan `EngineError` / `PQError('INVALID_MODE')`.

### 10.2 Penilaian mode time_attack

`answer(session, option_id, elapsed_ms)` / `session.answer(optionId, elapsedMs)`:

| Kondisi | Efek |
|---|---|
| `elapsed_ms > time_limit_ms` | `correct=false`, `timed_out=true`, XP 0, streak 0 |
| benar & dalam waktu | `speed_bonus = floor((limit − elapsed) × 5 / limit)` (0–5) |
| `xp_gained` | `xp_base + xp_bonus + speed_bonus` |
| `max_score` per soal | `10 + 5` pada mode time attack |

Field baru `AnswerResult`: `speed_bonus`, `timed_out`, `elapsed_ms`.
Field baru `SessionSummary`: `mode`, `timed_out_count`, `speed_bonus_total`.

### 10.3 Papan skor lokal

Entri: `{score, max_score, accuracy, pack_id, mode, at}`.
Urutan: skor desc → akurasi desc → `at` asc; maksimum 10 entri.
Fungsi murni: `insert_entry(entries, entry) -> (entries, rank)` dan
`insertEntry(entries, entry) -> {entries, rank}`; `rank` 1-basis atau `null` bila tidak
masuk 10 teratas.

