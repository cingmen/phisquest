"""Sesi permainan dan penilaian jawaban—port Python dari ``web/js/engine.js``."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Any

from . import badges
from .models import (
    HISTORY_LIMIT,
    MIXED_PACK_ID,
    STREAK_CAP,
    STREAK_STEP,
    XP_BASE,
    AnswerResult,
    EngineError,
    Pack,
    Progress,
    Scenario,
    SessionSummary,
    level_for,
    now_iso,
)


class _Lcg:
    """LCG 31-bit agar urutan acak identik dengan implementasi JavaScript."""

    def __init__(self, seed: int) -> None:
        state = int(seed) & 0x7FFFFFFF
        self.state = state if state != 0 else 1

    def next_float(self) -> float:
        self.state = (self.state * 1103515245 + 12345) & 0x7FFFFFFF
        return self.state / 0x7FFFFFFF


def _shuffle(items: list[Scenario], rng: _Lcg) -> None:
    for index in range(len(items) - 1, 0, -1):
        target = int(rng.next_float() * (index + 1))
        if target > index:
            target = index
        items[index], items[target] = items[target], items[index]


@dataclass
class Session:
    """State satu sesi permainan."""

    scenarios: list[Scenario]
    progress: Progress
    pack_id: str | None = None
    seed: int | None = None
    index: int = 0
    score: int = 0
    max_score: int = 0
    answered_count: int = 0
    correct_count: int = 0
    streak: int = 0
    best_streak: int = 0
    mistakes: list[dict[str, str]] = field(default_factory=list)
    badges_earned: list[str] = field(default_factory=list)
    level_before: str = "amatir"
    finished: bool = False
    summarized: bool = False
    wrong_run: int = 0
    comeback_candidate: bool = False
    comeback_recovered: bool = False
    answered_ids: list[str] = field(default_factory=list)
    summary_cache: SessionSummary | None = None


def streak_bonus(streak_after: int) -> int:
    """Hitung bonus streak untuk jawaban benar.

    Args:
        streak_after: Streak setelah jawaban benar ini.

    Returns:
        Bonus XP sebesar ``min((streak−1)×2, 10)``.
    """
    return min(max(streak_after - 1, 0) * STREAK_STEP, STREAK_CAP)


def start_session(
    packs: list[Pack],
    *,
    count: int = 10,
    difficulty: str | None = None,
    seed: int | None = None,
    progress: Progress | None = None,
) -> Session:
    """Susun sesi baru dari satu pack atau gabungan beberapa pack.

    Args:
        packs: Satu pack (mode per pack) atau banyak pack (mode Campur).
        count: Jumlah soal yang diambil (default 10).
        difficulty: Filter kesulitan opsional (``mudah``/``sedang``/``sulit``).
        seed: Seed opsional agar urutan soal dapat direproduksi.
        progress: Progres pemain; bila None dibuat progres baru.

    Returns:
        Session siap dimainkan.

    Raises:
        EngineError: Bila tidak ada skenario yang cocok.
    """
    pool: list[Scenario] = []
    for pack in packs:
        for scenario in pack.scenarios:
            if difficulty is None or scenario.difficulty == difficulty:
                pool.append(scenario)
    if not pool:
        raise EngineError("Tidak ada skenario yang cocok dengan filter yang dipilih.")

    if seed is not None:
        _shuffle(pool, _Lcg(seed))
    else:
        random.shuffle(pool)

    limit = max(1, int(count))
    selected = pool[:limit]
    player = progress if progress is not None else Progress()
    pack_id = packs[0].pack_id if len(packs) == 1 else None
    return Session(
        scenarios=selected,
        progress=player,
        pack_id=pack_id,
        seed=seed,
        streak=player.current_streak,
        best_streak=player.current_streak,
        level_before=level_for(player.total_xp),
    )


def current(session: Session) -> Scenario | None:
    """Skenario yang sedang ditampilkan, atau None bila sesi habis."""
    if session.index >= len(session.scenarios):
        return None
    return session.scenarios[session.index]


def has_next(session: Session) -> bool:
    """True bila masih ada soal yang belum dijawab."""
    return session.index < len(session.scenarios)


def evaluate_answer(scenario: Scenario, option_id: str) -> bool:
    """Nilai satu jawaban terhadap skenario.

    Args:
        scenario: Skenario aktif.
        option_id: ``PHISH``/``LEGIT`` atau id opsi (``A``–``D``).

    Returns:
        True bila jawaban benar.

    Raises:
        EngineError: Bila id jawaban tidak dikenali untuk tipe soal tersebut.
    """
    value = str(option_id).strip().upper()
    if scenario.type == "phish_or_legit":
        if value not in ("PHISH", "LEGIT"):
            raise EngineError("Jawaban untuk soal ini harus PHISH atau LEGIT.")
        return (value == "PHISH") == scenario.is_phish
    valid = [str(option.get("id")) for option in (scenario.options or [])]
    if value not in valid:
        raise EngineError(f"Jawaban '{option_id}' bukan opsi yang tersedia.")
    return value == str(scenario.correct_option)


def answer(session: Session, option_id: str) -> AnswerResult:
    """Nilai jawaban pemain untuk soal aktif dan perbarui progres.

    Args:
        session: Sesi aktif.
        option_id: ``PHISH``/``LEGIT`` atau id opsi (``A``–``D``).

    Returns:
        AnswerResult berisi XP, streak, dan lencana yang diperoleh.

    Raises:
        EngineError: Bila soal sudah dijawab atau sesi sudah habis.
    """
    if session.summarized:
        raise EngineError("Sesi ini sudah selesai dan dirangkum.")
    scenario = current(session)
    if scenario is None:
        raise EngineError("Tidak ada soal aktif; sesi sudah habis.")
    if scenario.id in session.answered_ids:
        raise EngineError("Soal ini sudah dijawab.")

    correct = evaluate_answer(scenario, option_id)
    streak_after = session.streak + 1 if correct else 0
    xp_base = XP_BASE if correct else 0
    xp_bonus = streak_bonus(streak_after) if correct else 0
    xp_gained = xp_base + xp_bonus

    progress = session.progress
    level_before_answer = level_for(progress.total_xp)
    counters = progress.counters
    counters["answered"] = int(counters.get("answered", 0)) + 1
    if correct:
        counters["correct"] = int(counters.get("correct", 0)) + 1
        correct_redflag = counters.get("correct_redflag")
        if not isinstance(correct_redflag, dict):
            correct_redflag = {}
            counters["correct_redflag"] = correct_redflag
        for code in scenario.red_flags:
            correct_redflag[code] = int(correct_redflag.get(code, 0)) + 1
    else:
        counters["wrong"] = int(counters.get("wrong", 0)) + 1

    progress.total_xp += xp_gained
    progress.current_streak = streak_after
    progress.best_streak = max(progress.best_streak, streak_after)
    progress.level = level_for(progress.total_xp)
    progress.updated_at = now_iso()
    level_up = progress.level if progress.level != level_before_answer else None

    result = AnswerResult(
        correct=correct,
        xp_base=xp_base,
        xp_bonus=xp_bonus,
        xp_gained=xp_gained,
        streak_after=streak_after,
        is_phish=scenario.is_phish,
        red_flags=list(scenario.red_flags),
        explanation=scenario.explanation,
        teach=dict(scenario.teach),
        badges_earned=[],
        level_up=level_up,
    )
    earned = badges.evaluate_after_answer(progress, result)
    for badge_id in earned:
        progress.badges[badge_id] = now_iso()
    result.badges_earned = earned
    session.badges_earned.extend(earned)

    session.index += 1
    session.answered_count += 1
    session.score += xp_gained
    session.max_score += XP_BASE
    session.streak = streak_after
    session.best_streak = max(session.best_streak, streak_after)
    session.answered_ids.append(scenario.id)
    if correct:
        session.correct_count += 1
    else:
        session.mistakes.append(
            {
                "scenario_id": scenario.id,
                "chosen": str(option_id).strip().upper(),
                "correct_answer": scenario.correct_answer(),
            }
        )

    if correct:
        session.wrong_run = 0
        if session.comeback_candidate:
            session.comeback_recovered = True
    else:
        session.wrong_run += 1
        session.comeback_candidate = session.wrong_run >= 3
        session.comeback_recovered = False

    if not has_next(session):
        session.finished = True
    return result


def summary(session: Session) -> SessionSummary:
    """Hitung ringkasan sesi; idempoten (aman dipanggil berulang).

    Args:
        session: Sesi yang soalnya sudah habis.

    Returns:
        SessionSummary untuk layar recap.

    Raises:
        EngineError: Bila masih ada soal yang belum dijawab.
    """
    if session.summary_cache is not None:
        return session.summary_cache
    if has_next(session) or session.answered_count == 0:
        raise EngineError("Sesi belum selesai; masih ada soal yang belum dijawab.")

    progress = session.progress
    accuracy = session.correct_count / session.answered_count if session.answered_count else 0.0
    result = SessionSummary(
        pack_id=session.pack_id,
        score=session.score,
        max_score=session.max_score,
        accuracy=round(accuracy, 4),
        xp_gained=session.score,
        best_streak_in_session=session.best_streak,
        badges_earned=list(session.badges_earned),
        level_before=session.level_before,
        level_after=level_for(progress.total_xp),
        mistakes=list(session.mistakes),
        recovered=bool(session.comeback_candidate and session.comeback_recovered),
    )

    counters = progress.counters
    counters["sessions_completed"] = int(counters.get("sessions_completed", 0)) + 1
    if session.pack_id is not None:
        stats: dict[str, Any] = dict(progress.packs.get(session.pack_id) or {})
        stats["sessions"] = int(stats.get("sessions", 0)) + 1
        if result.score >= int(stats.get("best_score", 0)):
            stats["best_score"] = result.score
            stats["max_score"] = result.max_score
        stats["best_accuracy"] = max(float(stats.get("best_accuracy", 0.0)), result.accuracy)
        stats["last_played"] = now_iso()
        progress.packs[session.pack_id] = stats

    pack_label = session.pack_id if session.pack_id is not None else MIXED_PACK_ID
    progress.history.append(
        {
            "at": now_iso(),
            "pack_id": pack_label,
            "score": result.score,
            "max_score": result.max_score,
            "accuracy": result.accuracy,
            "xp_gained": result.xp_gained,
        }
    )
    progress.history = progress.history[-HISTORY_LIMIT:]

    session_levels = badges.evaluate_after_session(progress, result)
    for badge_id in session_levels:
        progress.badges[badge_id] = now_iso()
        if badge_id not in result.badges_earned:
            result.badges_earned.append(badge_id)
    progress.level = level_for(progress.total_xp)
    progress.updated_at = now_iso()

    session.summarized = True
    session.summary_cache = result
    return result
