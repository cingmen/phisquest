# Changelog PhishQuest

Semua perubahan penting proyek ini dicatat di sini. Riwayat versi lama (v1.1 dan sebelumnya) ada di
`docs/implementation-plan.md`; rincian perilaku ada di `docs/PRD.md`.

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
