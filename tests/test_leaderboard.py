"""Test papan skor lokal per perangkat (v1.1) terhadap kontrak golden."""

from __future__ import annotations

import json
from pathlib import Path

from phishquest.leaderboard import insert_entry, make_entry, normalize_entries
from phishquest.models import LEADERBOARD_LIMIT

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = json.loads((ROOT / "tests" / "fixtures" / "golden.json").read_text(encoding="utf-8"))


def test_make_entry_membulatkan_akurasi() -> None:
    entry = make_entry(
        score=48,
        max_score=70,
        accuracy=0.857142857,
        pack_id="office",
        mode="time_attack",
        at="2026-11-03T10:00:00+07:00",
    )
    assert entry["accuracy"] == 0.8571
    assert entry["score"] == 48
    assert entry["pack_id"] == "office"


def test_batas_sepuluh_entri() -> None:
    entries = [
        {
            "score": index,
            "max_score": 100,
            "accuracy": 0.5,
            "pack_id": None,
            "mode": "classic",
            "at": f"2026-11-03T08:{index:02d}:00+07:00",
        }
        for index in range(25)
    ]
    assert len(normalize_entries(entries)) == LEADERBOARD_LIMIT


def test_entri_rusak_diabaikan() -> None:
    assert normalize_entries([None, "bukan entri", {"score": 10, "accuracy": 0.5}]) != []
    assert normalize_entries(None) == []


def test_leaderboard_golden() -> None:
    for case in GOLDEN["leaderboard_cases"]:
        entries, rank = insert_entry(case["entries"], case["entry"])
        assert rank == case["expected_rank"], case["name"]
        assert [item["score"] for item in entries] == case["expected_scores"], case["name"]
