"""Kontrak aturan tingkat pack.

Fixture ``web/test/editor-packs.json`` harus ditolak oleh validator Python
(``validate_pack``) sekaligus oleh pemeriksa kesiapan pack di
``web/js/scenario_editor.js``.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_content as validator  # noqa: E402

CASES = json.loads((ROOT / "web" / "test" / "editor-packs.json").read_text(encoding="utf-8"))


def _pack_errors(pack: dict) -> list[validator.Issue]:
    issues: list[validator.Issue] = []
    prefix = validator.PACK_PREFIX.get(str(pack.get("pack_id")), "ew")
    validator.validate_pack(issues, Path("editor-pack.json"), pack, prefix)
    return [issue for issue in issues if issue.level == "ERROR"]


def test_fixture_pack_bermasalah_ditolak_validator() -> None:
    for case in CASES["invalid"]:
        errors = _pack_errors(case["pack"])
        assert errors, f"{case['name']} seharusnya ditolak validator"
        messages = " | ".join(issue.message for issue in errors).lower()
        assert case["expect"].lower() in messages, f"{case['name']}: {messages}"


def test_pack_konten_asli_tetap_valid() -> None:
    for path in sorted((ROOT / "content" / "packs").glob("*.json")):
        pack = json.loads(path.read_text(encoding="utf-8"))
        assert _pack_errors(pack) == [], f"{path.name} seharusnya valid"
