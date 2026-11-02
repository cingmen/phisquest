"""Test engine Python + kontrak golden (api-specification §9)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from phishquest import engine
from phishquest.models import EngineError, Pack, Progress, Scenario

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = json.loads((ROOT / "tests" / "fixtures" / "golden.json").read_text(encoding="utf-8"))


def scenario_from_golden(scenario_id: str) -> Scenario:
    return Scenario.from_dict(GOLDEN["scenarios"][scenario_id])


def test_level_thresholds() -> None:
    expected = {
        0: "amatir",
        99: "amatir",
        100: "analis_muda",
        249: "analis_muda",
        250: "analis",
        449: "analis",
        450: "detektif",
        649: "detektif",
        650: "phishhunter",
        2000: "phishhunter",
    }
    for total_xp, level in expected.items():
        assert engine.level_for(total_xp) == level


def test_streak_bonus_dan_cap() -> None:
    assert [engine.streak_bonus(streak) for streak in range(0, 9)] == [0, 0, 2, 4, 6, 8, 10, 10, 10]
    assert engine.streak_bonus(50) == 10


def test_phish_or_legit_dinilai_dua_arah() -> None:
    phish = scenario_from_golden("g-001")
    legit = scenario_from_golden("g-010")
    assert engine.evaluate_answer(phish, "PHISH") is True
    assert engine.evaluate_answer(phish, "LEGIT") is False
    assert engine.evaluate_answer(legit, "LEGIT") is True
    assert engine.evaluate_answer(legit, "phish") is False


def test_best_action_dan_spot_redflag() -> None:
    best = scenario_from_golden("g-003")
    assert engine.evaluate_answer(best, "C") is True
    assert engine.evaluate_answer(best, "A") is False
    spot = scenario_from_golden("g-007")
    assert engine.evaluate_answer(spot, "B") is True
    assert engine.evaluate_answer(spot, "A") is False


def test_jawaban_tidak_dikenal_ditolak() -> None:
    with pytest.raises(EngineError):
        engine.evaluate_answer(scenario_from_golden("g-001"), "A")
    with pytest.raises(EngineError):
        engine.evaluate_answer(scenario_from_golden("g-003"), "Z")


def test_jawaban_ganda_ditolak() -> None:
    session = engine.start_session(
        [Pack("golden", "Golden", [scenario_from_golden("g-001")])], count=1
    )
    engine.answer(session, "PHISH")
    with pytest.raises(EngineError):
        engine.answer(session, "PHISH")


def test_ringkasan_sebelum_selesai_ditolak() -> None:
    session = engine.start_session(
        [Pack("golden", "Golden", [scenario_from_golden("g-001"), scenario_from_golden("g-010")])],
        count=2,
    )
    with pytest.raises(EngineError):
        engine.summary(session)


def test_summary_idempoten_dan_history_terbatas() -> None:
    progress = Progress()
    progress.history = [{"at": "x", "pack_id": "office", "score": 0, "max_score": 10}] * 49
    session = engine.start_session(
        [Pack("golden", "Golden", [scenario_from_golden("g-001")])], count=1, progress=progress
    )
    engine.answer(session, "PHISH")
    first = engine.summary(session)
    second = engine.summary(session)
    assert first.to_dict() == second.to_dict()
    assert progress.counters["sessions_completed"] == 1
    assert len(progress.history) == 50
    assert progress.history[-1]["pack_id"] == "golden"


def test_filter_kesulitan_dan_jumlah() -> None:
    scenarios = [scenario_from_golden(sid) for sid in ("g-001", "g-002", "g-003", "g-010")]
    pack = Pack("golden", "Golden", scenarios)
    session = engine.start_session([pack], count=3)
    assert len(session.scenarios) == 3
    only_mudah = engine.start_session([pack], count=10, difficulty="mudah")
    assert {scenario.difficulty for scenario in only_mudah.scenarios} == {"mudah"}
    assert len(only_mudah.scenarios) == 2


def test_seed_mengulang_urutan_sama() -> None:
    scenarios = [scenario_from_golden(sid) for sid in GOLDEN["scenarios"]]
    pack = Pack("golden", "Golden", scenarios)
    first = engine.start_session([pack], count=5, seed=123)
    second = engine.start_session([pack], count=5, seed=123)
    assert [s.id for s in first.scenarios] == [s.id for s in second.scenarios]


def test_mode_campur_tanpa_pack_id() -> None:
    first = Pack("golden", "Golden", [scenario_from_golden("g-001")])
    second = Pack("office", "Kantor", [scenario_from_golden("g-010")])
    session = engine.start_session([first, second], count=2, seed=5)
    assert session.pack_id is None


def test_kumpulan_kosong_ditolak() -> None:
    with pytest.raises(EngineError):
        engine.start_session([Pack("golden", "Golden", [])])


def test_progres_diperbarui_setelah_jawaban() -> None:
    progress = Progress()
    session = engine.start_session(
        [Pack("golden", "Golden", [scenario_from_golden("g-001"), scenario_from_golden("g-002")])],
        count=2,
        seed=1,
        progress=progress,
    )
    for _ in range(2):
        scenario = engine.current(session)
        assert scenario is not None
        engine.answer(session, scenario.correct_answer())
    assert progress.counters["answered"] == 2
    assert progress.counters["correct"] == 2
    assert progress.total_xp == 22
    assert progress.current_streak == 2
    assert progress.best_streak == 2
    assert progress.level == "amatir"
    assert progress.badges["first_catch"]


@pytest.mark.parametrize("case", GOLDEN["answer_cases"], ids=lambda case: case["name"])
def test_golden_jawaban(case: dict) -> None:
    scenario = scenario_from_golden(case["scenario_id"])
    progress = Progress.from_dict(case.get("progress"))
    session = engine.start_session(
        [Pack("golden", "Golden", [scenario])], count=1, progress=progress
    )
    result = engine.answer(session, case["option_id"]).to_dict()
    for field, expected in case["expected"].items():
        assert result[field] == expected, f"{field} ≠ harapan pada kasus '{case['name']}'"


@pytest.mark.parametrize("case", GOLDEN["session_cases"], ids=lambda case: case["name"])
def test_golden_sesi(case: dict) -> None:
    scenarios = [scenario_from_golden(sid) for sid in case["scenario_ids"]]
    progress = Progress.from_dict(case.get("progress"))
    session = engine.start_session(
        [Pack(case["pack_id"], "Golden", scenarios)],
        count=case["count"],
        seed=case["seed"],
        progress=progress,
    )
    assert [scenario.id for scenario in session.scenarios] == case["expected_order"]
    for scenario_id in case["expected_order"]:
        active = engine.current(session)
        assert active is not None
        assert active.id == scenario_id
        engine.answer(session, case["answers"][scenario_id])
    summary = engine.summary(session).to_dict()
    for field, expected in case["expected"].items():
        assert summary[field] == expected, f"{field} ≠ harapan pada sesi '{case['name']}'"


def test_mode_tidak_dikenal_ditolak() -> None:
    pack = Pack("golden", "Golden", [scenario_from_golden("g-001")])
    with pytest.raises(EngineError):
        engine.start_session([pack], mode="kilat")
    with pytest.raises(EngineError):
        engine.start_session([pack], time_limit_ms=0)


@pytest.mark.parametrize("case", GOLDEN["time_attack_cases"], ids=lambda item: item["name"])
def test_mode_time_attack_golden(case: dict) -> None:
    pack = Pack("golden", "Golden", [scenario_from_golden(case["scenario_id"])])
    session = engine.start_session(
        [pack],
        count=1,
        progress=Progress.from_dict(case["progress"]),
        mode=case.get("mode", "time_attack"),
        time_limit_ms=case.get("time_limit_ms", 20000),
    )
    result = engine.answer(session, case["option_id"], elapsed_ms=case["elapsed_ms"])
    for field, expected in case["expected"].items():
        assert getattr(result, field) == expected, f"field {field} tidak cocok"


def test_max_score_mode_waktu_mencakup_bonus_kecepatan() -> None:
    pack = Pack("golden", "Golden", [scenario_from_golden("g-001")])
    classic = engine.start_session([pack], count=1, mode="classic")
    engine.answer(classic, "PHISH", elapsed_ms=0)
    assert classic.max_score == 10

    timed = engine.start_session([pack], count=1, mode="time_attack")
    engine.answer(timed, "PHISH", elapsed_ms=0)
    assert timed.max_score == 15
    assert timed.score == 15
