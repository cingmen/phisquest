"""Papan skor lokal per perangkat (v1.1) — murni, tanpa I/O."""

from __future__ import annotations

from typing import Any

from .models import LEADERBOARD_LIMIT

ENTRY_FIELDS = ("score", "max_score", "accuracy", "pack_id", "mode", "at")


def make_entry(
    *,
    score: int,
    max_score: int,
    accuracy: float,
    pack_id: str | None,
    mode: str,
    at: str,
) -> dict[str, Any]:
    """Bangun satu entri papan skor.

    Args:
        score: XP yang diperoleh pada sesi.
        max_score: XP maksimum sesi (10 per soal).
        accuracy: Rasio jawaban benar 0..1.
        pack_id: Id pack, atau None untuk mode Campur.
        mode: ``classic`` atau ``time_attack``.
        at: Timestamp ISO waktu sesi selesai.

    Returns:
        Dict entri siap disimpan.
    """
    return {
        "score": int(score),
        "max_score": int(max_score),
        "accuracy": round(float(accuracy), 4),
        "pack_id": pack_id,
        "mode": mode,
        "at": at,
    }


def _sort_key(entry: dict[str, Any]) -> tuple[int, float, str]:
    return (
        -int(entry.get("score", 0) or 0),
        -float(entry.get("accuracy", 0.0) or 0.0),
        str(entry.get("at", "")),
    )


def normalize_entries(entries: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Saring entri valid, urutkan, dan potong ke 10 teratas."""
    cleaned = [dict(entry) for entry in (entries or []) if isinstance(entry, dict)]
    cleaned.sort(key=_sort_key)
    return cleaned[:LEADERBOARD_LIMIT]


def insert_entry(
    entries: list[dict[str, Any]] | None, entry: dict[str, Any]
) -> tuple[list[dict[str, Any]], int | None]:
    """Sisipkan entri baru dan hitung peringkatnya.

    Args:
        entries: Entri yang sudah ada.
        entry: Entri baru hasil :func:`make_entry`.

    Returns:
        Tuple ``(entri_terurut, peringkat)``; peringkat 1-basis, atau None bila
        entri tidak masuk 10 teratas.
    """
    existing = [dict(item) for item in (entries or []) if isinstance(item, dict)]
    ordered = normalize_entries([*existing, dict(entry)])
    target = _sort_key(dict(entry))
    rank = None
    for position, item in enumerate(ordered, start=1):
        if _sort_key(item) == target:
            rank = position
            break
    return ordered, rank
