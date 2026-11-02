"""Test unit evaluasi lencana (PRD §7.4)."""

from __future__ import annotations

from phishquest.badges import evaluate_after_answer, evaluate_after_session
from phishquest.models import AnswerResult, Progress, SessionSummary


def make_result(*, correct: bool = True, streak_after: int = 1, red_flags=None) -> AnswerResult:
    return AnswerResult(
        correct=correct,
        xp_base=10 if correct else 0,
        xp_bonus=0,
        xp_gained=10 if correct else 0,
        streak_after=streak_after,
        is_phish=True,
        red_flags=list(red_flags or []),
        explanation="e",
        teach={"tip": "t", "verify_how": "v"},
        badges_earned=[],
        level_up=None,
    )


def make_summary(*, pack_id="ewallet-bank", accuracy=1.0, recovered=False) -> SessionSummary:
    return SessionSummary(
        pack_id=pack_id,
        score=100,
        max_score=100,
        accuracy=accuracy,
        xp_gained=100,
        best_streak_in_session=5,
        badges_earned=[],
        level_before="amatir",
        level_after="amatir",
        mistakes=[],
        recovered=recovered,
    )


def make_progress(*, total_xp: int = 0, correct: int = 1, red_flags=None, packs=None) -> Progress:
    progress = Progress(total_xp=total_xp)
    progress.counters["correct"] = correct
    progress.counters["correct_redflag"] = dict(red_flags or {})
    progress.packs = dict(packs or {})
    return progress


def test_first_catch_hanya_setelah_jawaban_benar() -> None:
    progress = make_progress(correct=1)
    progress.counters["correct"] = 0
    assert evaluate_after_answer(progress, make_result(correct=False, streak_after=0)) == []
    progress.counters["correct"] = 1
    assert evaluate_after_answer(progress, make_result()) == ["first_catch"]


def test_streak_5_dan_streak_10() -> None:
    progress = make_progress()
    assert "streak_5" not in evaluate_after_answer(progress, make_result(streak_after=4))
    assert "streak_5" in evaluate_after_answer(progress, make_result(streak_after=5))
    earned = evaluate_after_answer(progress, make_result(streak_after=10))
    assert earned == ["first_catch", "streak_5", "streak_10"]


def test_domain_guard_tepat_di_ambang_10() -> None:
    progress = make_progress(red_flags={"DOMAIN_PALSU": 5, "DOMAIN_MIRIP": 4})
    assert "domain_guard" not in evaluate_after_answer(
        progress, make_result(red_flags=["DOMAIN_MIRIP"])
    )
    progress.counters["correct_redflag"] = {"DOMAIN_PALSU": 6, "DOMAIN_MIRIP": 4}
    assert "domain_guard" in evaluate_after_answer(
        progress, make_result(red_flags=["DOMAIN_MIRIP"])
    )


def test_otp_dan_urgency_guard() -> None:
    progress = make_progress(red_flags={"MEMINTA_DATA_SENSITIF": 5})
    assert "otp_guard" in evaluate_after_answer(progress, make_result())
    progress = make_progress(red_flags={"TEKANAN_WAKTU": 4})
    assert "urgency_guard" not in evaluate_after_answer(progress, make_result())
    progress.counters["correct_redflag"] = {"TEKANAN_WAKTU": 5}
    assert "urgency_guard" in evaluate_after_answer(progress, make_result())


def test_level_detective_pada_ambang_450() -> None:
    assert "level_detective" not in evaluate_after_answer(
        make_progress(total_xp=449), make_result()
    )
    assert "level_detective" in evaluate_after_answer(make_progress(total_xp=450), make_result())


def test_lencana_tidak_diberikan_dua_kali() -> None:
    progress = make_progress(total_xp=700)
    progress.badges["level_detective"] = "2026-11-01T00:00:00+07:00"
    assert "level_detective" not in evaluate_after_answer(progress, make_result())


def test_perfect_pack_butuh_pack_dan_akurasi_penuh() -> None:
    progress = make_progress()
    assert "perfect_pack" in evaluate_after_session(progress, make_summary())
    assert "perfect_pack" not in evaluate_after_session(progress, make_summary(accuracy=0.9))
    assert "perfect_pack" not in evaluate_after_session(progress, make_summary(pack_id=None))


def test_all_packs_butuh_keempat_pack() -> None:
    progress = make_progress(
        packs={
            "ewallet-bank": {"sessions": 1},
            "office": {"sessions": 1},
            "shopping-courier": {"sessions": 1},
        }
    )
    summary = make_summary(accuracy=0.5)
    assert "all_packs" not in evaluate_after_session(progress, summary)
    progress.packs["campus-gov"] = {"sessions": 1}
    assert "all_packs" in evaluate_after_session(progress, summary)


def test_comeback_dari_ringkasan_sesi() -> None:
    progress = make_progress()
    summary = make_summary(accuracy=0.7, recovered=True)
    assert evaluate_after_session(progress, summary) == ["comeback"]
    assert evaluate_after_session(progress, make_summary(accuracy=0.7, recovered=False)) == []
