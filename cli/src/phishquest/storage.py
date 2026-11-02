"""Penyimpanan progres CLI di ``~/.phishquest/`` dengan tulis atomik."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .models import SCHEMA_VERSION, Progress, Settings, StorageError, now_iso

DEFAULT_DIR = Path.home() / ".phishquest"
PROGRESS_NAME = "progress.json"
SETTINGS_NAME = "settings.json"


def data_dir() -> Path:
    """Direktori data pemain (``~/.phishquest``).

    Returns:
        Path direktori data; belum tentu ada.
    """
    return DEFAULT_DIR


def _ensure_dir(path: Path) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise StorageError(f"Tidak bisa membuat direktori {path.parent}: {exc}") from exc


def _atomic_write(path: Path, payload: dict[str, Any]) -> None:
    _ensure_dir(path)
    tmp_path = path.with_name(path.name + ".tmp")
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    try:
        tmp_path.write_text(text, encoding="utf-8", newline="\n")
        os.replace(tmp_path, path)
    except OSError as exc:
        raise StorageError(f"Gagal menulis {path}: {exc}") from exc


def _read_payload(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise StorageError(f"Berkas tidak ditemukan: {path}") from exc
    except OSError as exc:
        raise StorageError(f"Gagal membaca {path}: {exc}") from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise StorageError(
            f"Berkas {path} rusak atau bukan JSON. "
            "Jalankan 'phishquest reset' bila ingin mulai ulang."
        ) from exc
    if not isinstance(data, dict):
        raise StorageError(f"Berkas {path} harus berisi objek JSON.")
    return data


def load_progress(path: Path | None = None) -> Progress | None:
    """Baca progres pemain.

    Args:
        path: Lokasi file progres; default ``~/.phishquest/progress.json``.

    Returns:
        Progress, atau ``None`` bila pemain belum pernah bermain.

    Raises:
        StorageError: Bila berkas rusak atau tidak bisa dibaca.
    """
    target = Path(path) if path is not None else data_dir() / PROGRESS_NAME
    if not target.exists():
        return None
    data = _read_payload(target)
    major = str(data.get("schema_version", SCHEMA_VERSION)).split(".")[0]
    if major != SCHEMA_VERSION.split(".")[0]:
        raise StorageError(
            f"Versi progres {data.get('schema_version')} tidak didukung. "
            "Jalankan 'phishquest reset' atau impor berkas cadangan."
        )
    return Progress.from_dict(data)


def save_progress(progress: Progress, path: Path | None = None) -> None:
    """Simpan progres secara atomik.

    Args:
        progress: Progres yang disimpan.
        path: Lokasi file; default ``~/.phishquest/progress.json``.

    Raises:
        StorageError: Bila penulisan gagal.
    """
    target = Path(path) if path is not None else data_dir() / PROGRESS_NAME
    progress.schema_version = SCHEMA_VERSION
    progress.updated_at = now_iso()
    _atomic_write(target, progress.to_dict())


def load_settings(path: Path | None = None) -> Settings:
    """Baca pengaturan; mengembalikan default bila berkas belum ada."""
    target = Path(path) if path is not None else data_dir() / SETTINGS_NAME
    if not target.exists():
        return Settings()
    return Settings.from_dict(_read_payload(target))


def save_settings(settings: Settings, path: Path | None = None) -> None:
    """Simpan pengaturan secara atomik."""
    target = Path(path) if path is not None else data_dir() / SETTINGS_NAME
    _atomic_write(target, settings.to_dict())


def export_all(dst: Path | None = None) -> Path:
    """Ekspor progres dan pengaturan ke satu berkas JSON.

    Args:
        dst: Tujuan ekspor; default ``phishquest-export.json`` di direktori kerja.

    Returns:
        Path berkas hasil ekspor.

    Raises:
        StorageError: Bila penulisan gagal.
    """
    target = Path(dst) if dst is not None else Path("phishquest-export.json")
    progress = load_progress() or Progress()
    settings = load_settings()
    payload = {
        "schema_version": SCHEMA_VERSION,
        "exported_at": now_iso(),
        "progress": progress.to_dict(),
        "settings": settings.to_dict(),
    }
    _atomic_write(target, payload)
    return target


def import_all(src: Path) -> None:
    """Impor progres dan pengaturan dari berkas ekspor.

    Args:
        src: Berkas JSON hasil :func:`export_all`.

    Raises:
        StorageError: Bila berkas tidak valid atau versi tidak cocok.
    """
    data = _read_payload(Path(src))
    if "progress" not in data or not isinstance(data.get("progress"), dict):
        raise StorageError("Berkas impor tidak memuat objek 'progress'.")
    major = str(data.get("schema_version", SCHEMA_VERSION)).split(".")[0]
    if major != SCHEMA_VERSION.split(".")[0]:
        raise StorageError(f"Versi berkas impor {major} tidak didukung.")
    progress = Progress.from_dict(data["progress"])
    settings = Settings.from_dict(data.get("settings"))
    save_progress(progress)
    save_settings(settings)


def reset_all() -> None:
    """Hapus progres dan pengaturan pemain.

    Raises:
        StorageError: Bila penghapusan gagal.
    """
    directory = data_dir()
    for name in (PROGRESS_NAME, SETTINGS_NAME):
        target = directory / name
        try:
            target.unlink(missing_ok=True)
        except OSError as exc:
            raise StorageError(f"Gagal menghapus {target}: {exc}") from exc
