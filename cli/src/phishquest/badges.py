"""Evaluasi lencana PhishQuest—logika identik dengan ``web/js/badges.js``."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .models import PACK_IDS, AnswerResult, Progress, SessionSummary, level_for, level_index

if TYPE_CHECKING:
    pass

DOMAIN_FLAGS = ("DOMAIN_PALSU", "DOMAIN_MIRIP")


def _already_earned(progress: Progress, badge_id: str) -> bool:
    return badge_id in progress.badges


def _redflag_count(progress: Progress, codes: tuple[str, ...]) -> int:
    counters = progress.counters.get("correct_redflag") or {}
    return sum(int(counters.get(code, 0) or 0) for code in codes)


def evaluate_after_answer(progress: Progress, result: AnswerResult) -> list[str]:
    """Evaluasi lencana berbasis counter kumulatif setelah satu jawaban.

    Args:
        progress: Progres pemain yang sudah diperbarui dengan jawaban ini.
        result: Hasil penilaian jawaban.

    Returns:
        Daftar ``badge_id`` baru (belum pernah diperoleh), deterministik dan berurutan.
    """
    candidates: list[str] = []
    if result.correct and int(progress.counters.get("correct", 0)) >= 1:
        candidates.append("first_catch")
    if result.streak_after >= 5:
        candidates.append("streak_5")
    if result.streak_after >= 10:
        candidates.append("streak_10")
    if _redflag_count(progress, DOMAIN_FLAGS) >= 10:
        candidates.append("domain_guard")
    if _redflag_count(progress, ("MEMINTA_DATA_SENSITIF",)) >= 5:
        candidates.append("otp_guard")
    if _redflag_count(progress, ("TEKANAN_WAKTU",)) >= 5:
        candidates.append("urgency_guard")
    if level_index(level_for(progress.total_xp)) >= level_index("detektif"):
        candidates.append("level_detective")
    return _new_badges(progress, candidates)


def evaluate_after_session(progress: Progress, summary: SessionSummary) -> list[str]:
    """Evaluasi lencana berbasis sesi pada layar recap.

    Args:
        progress: Progres pemain setelah sesi diselesaikan.
        summary: Ringkasan sesi.

    Returns:
        Daftar ``badge_id`` baru yang layak diperoleh.
    """
    candidates: list[str] = []
    if summary.pack_id is not None and summary.accuracy >= 1.0:
        candidates.append("perfect_pack")
    if all(
        int((progress.packs.get(pack_id) or {}).get("sessions", 0)) >= 1 for pack_id in PACK_IDS
    ):
        candidates.append("all_packs")
    if summary.recovered:
        candidates.append("comeback")
    if level_index(level_for(progress.total_xp)) >= level_index("detektif"):
        candidates.append("level_detective")
    return _new_badges(progress, candidates)


def _new_badges(progress: Progress, candidates: list[str]) -> list[str]:
    ordered: list[str] = []
    for badge_id in candidates:
        if badge_id in ordered or _already_earned(progress, badge_id):
            continue
        ordered.append(badge_id)
    return ordered
