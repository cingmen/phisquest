"""Test paritas terjemahan konten Inggris."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PACKS = ROOT / "content" / "packs"
TRANSLATION = ROOT / "content" / "i18n" / "en.json"


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _source_scenarios() -> dict[str, dict[str, Any]]:
    scenarios: dict[str, dict[str, Any]] = {}
    for path in sorted(PACKS.glob("*.json")):
        pack = _load(path)
        for scenario in pack["scenarios"]:
            scenarios[scenario["id"]] = scenario
    return scenarios


def test_translation_covers_every_pack_and_scenario() -> None:
    translation = _load(TRANSLATION)
    source = _source_scenarios()

    assert translation["locale"] == "en"
    assert set(translation["scenarios"]) == set(source)
    assert len(translation["scenarios"]) == 40
    assert set(translation["packs"]) == {_load(path)["pack_id"] for path in PACKS.glob("*.json")}


def test_every_translatable_field_is_present() -> None:
    translation = _load(TRANSLATION)
    source = _source_scenarios()
    problems: list[str] = []

    for scenario_id, original in source.items():
        entry = translation["scenarios"][scenario_id]
        for field in ("body", "explanation"):
            value = entry.get(field)
            if not isinstance(value, str) or not value.strip():
                problems.append(f"{scenario_id}: {field} kosong")
        teach = entry.get("teach") or {}
        for field in ("tip", "verify_how"):
            value = teach.get(field)
            if not isinstance(value, str) or not value.strip():
                problems.append(f"{scenario_id}: teach.{field} kosong")
        if original.get("subject") and not entry.get("subject"):
            problems.append(f"{scenario_id}: subject kosong")
        if original.get("options"):
            translated = entry.get("options") or {}
            expected = {option["id"] for option in original["options"]}
            if set(translated) != expected:
                problems.append(f"{scenario_id}: opsi tidak cocok")
            for option_id in expected:
                if not str(translated.get(option_id, "")).strip():
                    problems.append(f"{scenario_id}: opsi {option_id} kosong")

    assert problems == []


def test_translation_is_not_a_copy_of_indonesian() -> None:
    translation = _load(TRANSLATION)
    source = _source_scenarios()
    unchanged = [
        scenario_id
        for scenario_id, original in source.items()
        if translation["scenarios"][scenario_id]["body"] == original["body"]
        or translation["scenarios"][scenario_id]["explanation"] == original["explanation"]
    ]

    assert unchanged == []
