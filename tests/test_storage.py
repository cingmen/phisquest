"""Test penyimpanan progres CLI: tulis atomik, korup, ekspor/impor, reset."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from phishquest import storage
from phishquest.models import Progress, Settings, StorageError


@pytest.fixture()
def data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    target = tmp_path / "phishquest-home"
    monkeypatch.setattr(storage, "DEFAULT_DIR", target)
    return target


def test_load_progress_belum_ada(data_dir: Path) -> None:
    assert storage.load_progress() is None


def test_save_dan_load_roundtrip(data_dir: Path) -> None:
    progress = Progress()
    progress.total_xp = 120
    progress.current_streak = 3
    progress.badges["first_catch"] = "2026-11-01T10:00:00+07:00"
    storage.save_progress(progress)

    saved_file = data_dir / storage.PROGRESS_NAME
    assert saved_file.is_file()
    assert not (data_dir / "progress.json.tmp").exists()

    loaded = storage.load_progress()
    assert loaded is not None
    assert loaded.total_xp == 120
    assert loaded.level == "analis_muda"
    assert loaded.current_streak == 3
    assert loaded.badges == {"first_catch": "2026-11-01T10:00:00+07:00"}


def test_save_mengisi_schema_version_dan_updated_at(data_dir: Path) -> None:
    progress = Progress()
    progress.updated_at = "lama"
    storage.save_progress(progress)
    payload = json.loads((data_dir / storage.PROGRESS_NAME).read_text(encoding="utf-8"))
    assert payload["schema_version"] == "1.0"
    assert payload["updated_at"] != "lama"
    assert payload["level"] == "amatir"


def test_berkas_rusak_menghasilkan_storage_error(data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / storage.PROGRESS_NAME).write_text("{bukan json", encoding="utf-8")
    with pytest.raises(StorageError):
        storage.load_progress()


def test_versi_mayor_berbeda_ditolak(data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / storage.PROGRESS_NAME).write_text(
        json.dumps({"schema_version": "2.0", "total_xp": 10}), encoding="utf-8"
    )
    with pytest.raises(StorageError):
        storage.load_progress()


def test_field_minor_hilang_memakai_default(data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / storage.PROGRESS_NAME).write_text(
        json.dumps({"schema_version": "1.0", "total_xp": 250}), encoding="utf-8"
    )
    loaded = storage.load_progress()
    assert loaded is not None
    assert loaded.counters["answered"] == 0
    assert loaded.counters["correct_redflag"] == {}
    assert loaded.level == "analis"


def test_settings_default_dan_roundtrip(data_dir: Path) -> None:
    assert storage.load_settings().locale == "id"
    storage.save_settings(Settings(nickname="budi"))
    assert storage.load_settings().nickname == "budi"


def test_export_dan_import(data_dir: Path, tmp_path: Path) -> None:
    progress = Progress()
    progress.total_xp = 200
    storage.save_progress(progress)
    target = storage.export_all(tmp_path / "cadangan.json")

    payload = json.loads(target.read_text(encoding="utf-8"))
    assert payload["progress"]["total_xp"] == 200
    assert "settings" in payload

    storage.reset_all()
    assert storage.load_progress() is None

    storage.import_all(target)
    restored = storage.load_progress()
    assert restored is not None
    assert restored.total_xp == 200


def test_import_berkas_tanpa_progress_ditolak(tmp_path: Path) -> None:
    broken = tmp_path / "rusak.json"
    broken.write_text(json.dumps({"schema_version": "1.0"}), encoding="utf-8")
    with pytest.raises(StorageError):
        storage.import_all(broken)


def test_reset_menghapus_progres_dan_pengaturan(data_dir: Path) -> None:
    storage.save_progress(Progress())
    storage.save_settings(Settings(nickname="sari"))
    storage.reset_all()
    assert not (data_dir / storage.PROGRESS_NAME).exists()
    assert not (data_dir / storage.SETTINGS_NAME).exists()
