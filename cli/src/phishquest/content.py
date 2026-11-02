"""Pemuatan manifest dan pack konten PhishQuest."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import SCHEMA_VERSION, ContentError, Pack, Scenario

MANIFEST_NAME = "manifest.json"
CONTENT_ENV = "PHISHQUEST_CONTENT"
PACKAGED_DIR = "content_data"


@dataclass(frozen=True)
class ManifestPack:
    """Metadata satu pack dari manifest."""

    pack_id: str
    file: str
    name: str
    emoji: str
    scenario_count: int


@dataclass(frozen=True)
class Manifest:
    """Isi ``content/manifest.json``."""

    schema_version: str
    packs: list[ManifestPack]


def default_content_dir() -> Path:
    """Tentukan direktori konten bawaan.

    Urutan pencarian: variabel lingkungan ``PHISHQUEST_CONTENT``, direktori
    ``content_data`` di dalam paket terpasang, lalu ``content/`` pada leluhur
    direktori modul (kondisi repo git).

    Returns:
        Path direktori yang berisi ``manifest.json``.

    Raises:
        ContentError: Bila tidak ada direktori konten yang bisa dipakai.
    """
    env_value = os.environ.get(CONTENT_ENV)
    if env_value:
        candidate = Path(env_value).expanduser()
        if (candidate / MANIFEST_NAME).is_file():
            return candidate
        raise ContentError(f"PHISHQUEST_CONTENT menunjuk ke direktori tanpa {MANIFEST_NAME}.")

    packaged = Path(__file__).resolve().parent / PACKAGED_DIR
    if (packaged / MANIFEST_NAME).is_file():
        return packaged

    for parent in Path(__file__).resolve().parents:
        candidate = parent / "content"
        if (candidate / MANIFEST_NAME).is_file():
            return candidate

    raise ContentError(
        "Direktori konten tidak ditemukan. Jalankan dari repo, pakai --content, "
        f"atau set {CONTENT_ENV}."
    )


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ContentError(f"Berkas konten tidak ditemukan: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ContentError(f"JSON tidak valid di {path}: {exc}") from exc


def load_manifest(content_dir: Path | None = None) -> Manifest:
    """Muat dan validasi manifest pack.

    Args:
        content_dir: Direktori konten; default dari :func:`default_content_dir`.

    Returns:
        Manifest berisi daftar metadata pack.

    Raises:
        ContentError: Bila berkas hilang atau skema tidak cocok.
    """
    directory = Path(content_dir) if content_dir is not None else default_content_dir()
    data = _read_json(directory / MANIFEST_NAME)
    if not isinstance(data, dict):
        raise ContentError("manifest.json harus berupa objek JSON.")
    if data.get("schema_version") != SCHEMA_VERSION:
        raise ContentError(
            f"schema_version manifest '{data.get('schema_version')}' tidak didukung "
            f"(butuh MAJOR {SCHEMA_VERSION.split('.')[0]})."
        )
    raw_packs = data.get("packs")
    if not isinstance(raw_packs, list) or not raw_packs:
        raise ContentError("manifest.json tidak memuat daftar pack.")
    packs: list[ManifestPack] = []
    for entry in raw_packs:
        if not isinstance(entry, dict):
            raise ContentError("setiap entri packs di manifest harus objek.")
        missing = [key for key in ("pack_id", "file", "name", "emoji") if not entry.get(key)]
        if missing:
            raise ContentError(f"entri pack tidak lengkap: hilang {', '.join(missing)}")
        packs.append(
            ManifestPack(
                pack_id=str(entry["pack_id"]),
                file=str(entry["file"]),
                name=str(entry["name"]),
                emoji=str(entry["emoji"]),
                scenario_count=int(entry.get("scenario_count", 0) or 0),
            )
        )
    return Manifest(schema_version=str(data["schema_version"]), packs=packs)


def _load_pack_file(directory: Path, meta: ManifestPack) -> Pack:
    data = _read_json(directory / meta.file)
    if not isinstance(data, dict):
        raise ContentError(f"{meta.file} harus berupa objek JSON.")
    if data.get("schema_version") != SCHEMA_VERSION:
        raise ContentError(f"{meta.file}: schema_version tidak cocok.")
    if data.get("pack_id") != meta.pack_id:
        raise ContentError(f"{meta.file}: pack_id berbeda dengan manifest.")
    raw_scenarios = data.get("scenarios")
    if not isinstance(raw_scenarios, list) or not raw_scenarios:
        raise ContentError(f"{meta.file}: daftar scenarios kosong.")
    scenarios = []
    for raw in raw_scenarios:
        if not isinstance(raw, dict):
            raise ContentError(f"{meta.file}: setiap skenario harus objek.")
        scenarios.append(Scenario.from_dict(raw))
    return Pack(pack_id=meta.pack_id, name=str(data.get("name", meta.name)), scenarios=scenarios)


def load_pack(content_dir: Path | None = None, pack_id: str | None = None) -> list[Pack]:
    """Muat satu pack atau seluruh pack.

    Args:
        content_dir: Direktori konten; default dari :func:`default_content_dir`.
        pack_id: Id pack yang dimuat; ``None`` berarti semua pack (mode Campur).

    Returns:
        Daftar Pack; satu elemen bila ``pack_id`` diberikan.

    Raises:
        ContentError: Bila pack tidak ditemukan atau konten tidak valid.
    """
    directory = Path(content_dir) if content_dir is not None else default_content_dir()
    manifest = load_manifest(directory)
    if pack_id is None:
        return [_load_pack_file(directory, meta) for meta in manifest.packs]
    for meta in manifest.packs:
        if meta.pack_id == pack_id:
            return [_load_pack_file(directory, meta)]
    available = ", ".join(meta.pack_id for meta in manifest.packs)
    raise ContentError(f"Pack '{pack_id}' tidak dikenal. Pilihan: {available}.")
