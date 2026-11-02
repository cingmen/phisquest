"""Test validator konten terhadap aturan api-specification §5 dan PRD §9.4."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
import validate_content as validator

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content"


def test_konten_repo_valid_tanpa_error() -> None:
    issues = validator.validate_content(CONTENT)
    errors = [issue for issue in issues if issue.level == "ERROR"]
    assert errors == [], "\n".join(issue.render() for issue in errors)


def test_total_skenario_dan_cakupan_red_flag() -> None:
    total = 0
    flags: set[str] = set()
    for pack_file in sorted((CONTENT / "packs").glob("*.json")):
        pack = json.loads(pack_file.read_text(encoding="utf-8"))
        total += len(pack["scenarios"])
        for scenario in pack["scenarios"]:
            flags.update(scenario["red_flags"])
    assert total == 40
    assert flags == set(validator.RED_FLAGS)


def test_komposisi_tiap_pack_sesuai_prd() -> None:
    for pack_file in sorted((CONTENT / "packs").glob("*.json")):
        pack = json.loads(pack_file.read_text(encoding="utf-8"))
        scenarios = pack["scenarios"]
        types = [scenario["type"] for scenario in scenarios]
        assert types.count("phish_or_legit") >= 7
        assert types.count("best_action") >= 2
        assert types.count("spot_redflag") >= 1
        phish = [s for s in scenarios if s.get("is_phish") is True]
        legit = [s for s in scenarios if s.get("is_phish") is False]
        assert (len(phish), len(legit)) == (6, 4)


@pytest.fixture()
def content_copy(tmp_path: Path) -> Path:
    target = tmp_path / "content"
    shutil.copytree(CONTENT, target)
    return target


def _mutate(pack_path: Path, scenario_id: str, **changes) -> None:
    pack = json.loads(pack_path.read_text(encoding="utf-8"))
    for scenario in pack["scenarios"]:
        if scenario["id"] == scenario_id:
            scenario.update(changes)
    pack_path.write_text(json.dumps(pack, ensure_ascii=False, indent=2), encoding="utf-8")


def _errors(content_dir: Path) -> list[str]:
    return [
        issue.render()
        for issue in validator.validate_content(content_dir)
        if issue.level == "ERROR"
    ]


def test_phishing_dengan_domain_whitelist_ditolak(content_copy: Path) -> None:
    _mutate(
        content_copy / "packs" / "ewallet-bank.json",
        "ew-001",
        link={"text": "banknusa.co.id", "href": "https://banknusa.co.id/verifikasi"},
    )
    assert any("domain resmi whitelist" in message for message in _errors(content_copy))


def test_legit_dengan_red_flag_ditolak(content_copy: Path) -> None:
    _mutate(
        content_copy / "packs" / "ewallet-bank.json",
        "ew-003",
        red_flags=["TEKANAN_WAKTU"],
    )
    assert any("legit wajib red_flags" in message for message in _errors(content_copy))


def test_id_duplikat_ditolak(content_copy: Path) -> None:
    _mutate(content_copy / "packs" / "office.json", "of-002", id="of-001")
    assert any("duplikat" in message for message in _errors(content_copy))


def test_opsi_pada_phish_or_legit_ditolak(content_copy: Path) -> None:
    _mutate(
        content_copy / "packs" / "office.json",
        "of-003",
        options=[{"id": "A", "text": "a"}, {"id": "B", "text": "b"}, {"id": "C", "text": "c"}],
    )
    assert any("tidak boleh punya 'options'" in message for message in _errors(content_copy))


def test_lampiran_berbahaya_tanpa_red_flag_ditolak(content_copy: Path) -> None:
    _mutate(
        content_copy / "packs" / "shopping-courier.json",
        "sc-007",
        red_flags=["DOMAIN_MIRIP", "SAPAAN_GENERIK"],
    )
    assert any("LAMPIRAN_BERBAHAYA" in message for message in _errors(content_copy))


def test_brand_nyata_sebagai_pengirim_ditolak(content_copy: Path) -> None:
    _mutate(
        content_copy / "packs" / "campus-gov.json",
        "cg-003",
        sender={"name": "Dukcapil", "address": "info@dukcapil.go.id"},
    )
    assert any("brand/instansi nyata" in message for message in _errors(content_copy))


def test_explanation_lebih_dari_tiga_kalimat_ditolak(content_copy: Path) -> None:
    _mutate(
        content_copy / "packs" / "campus-gov.json",
        "cg-007",
        explanation="Satu. Dua. Tiga. Empat.",
    )
    assert any("explanation maksimal 3 kalimat" in message for message in _errors(content_copy))


def test_scenario_count_manifest_tidak_cocok(content_copy: Path, tmp_path: Path) -> None:
    manifest_path = content_copy / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["packs"][0]["scenario_count"] = 9
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    assert any("scenario_count manifest" in message for message in _errors(content_copy))


def test_exit_code_main() -> None:
    assert validator.main([str(CONTENT)]) == 0
    assert validator.main([]) == 2
    assert validator.main([str(CONTENT / "tidak-ada")]) == 2
