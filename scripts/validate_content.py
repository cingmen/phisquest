#!/usr/bin/env python3
"""Validator konten PhishQuest.

Memeriksa seluruh berkas di ``content/`` terhadap kontrak di
``docs/api-specification.md`` §2–§3 dan komposisi di ``docs/PRD.md`` §9.4.
Konstanta dan util bersama ada di ``content_rules.py``.

Jalankan::

    python scripts/validate_content.py content/

Exit code: ``0`` valid, ``1`` ada error validasi, ``2`` argumen/path salah.

Catatan interpretasi komposisi (§9.4): PRD meminta ≥7 ``phish_or_legit``,
≥2 ``best_action``, dan ≥1 ``spot_redflag`` (jumlah minimum = 10), sekaligus
keseimbangan 6 phishing / 4 legit. Aturan minimum tipe dipenuhi lebih dahulu,
lalu keseimbangan 6/4 dihitung pada **seluruh** skenario pack (termasuk
``best_action`` dan ``spot_redflag`` yang juga menyatakan ``is_phish``).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from content_rules import (
    CHANNELS,
    DANGEROUS_SUFFIXES,
    DATETIME_PATTERN,
    DIFFICULTIES,
    ID_PATTERN,
    PACK_PREFIX,
    RED_FLAGS,
    SCENARIOS_PER_PACK,
    SCHEMA_VERSION,
    TYPES,
    Issue,
    add_issue,
    domain_of,
    has_real_brand,
    is_whitelisted,
    require_str,
    sentence_count,
    word_count,
)

__all__ = ["Issue", "RED_FLAGS", "PACK_PREFIX", "SCHEMA_VERSION", "main", "validate_content"]


def _validate_sender(issues: list[Issue], scenario: dict[str, Any], file: str, sid: str) -> None:
    sender = scenario.get("sender")
    if not isinstance(sender, dict):
        add_issue(issues, "ERROR", file, sid, "field 'sender' wajib berupa objek {name, address}")
        return
    name = sender.get("name")
    address = sender.get("address")
    if not isinstance(name, str) or not name.strip():
        add_issue(issues, "ERROR", file, sid, "sender.name wajib berupa string tidak kosong")
        return
    if not isinstance(address, str) or not address.strip():
        add_issue(issues, "ERROR", file, sid, "sender.address wajib berupa string tidak kosong")
        return

    real_brand = has_real_brand(f"{name} {address}")
    if real_brand:
        add_issue(
            issues,
            "ERROR",
            file,
            sid,
            f"pengirim memakai nama brand/instansi nyata ('{real_brand}'); gunakan brand fiktif",
        )

    channel = scenario.get("channel")
    if channel != "email":
        return
    domain = domain_of(address)
    if not domain:
        add_issue(issues, "ERROR", file, sid, "sender.address bukan alamat email yang valid")
        return
    phish = scenario.get("is_phish", True)
    if phish and is_whitelisted(domain):
        add_issue(issues, "ERROR", file, sid, "pesan phishing memakai domain resmi whitelist")
    if not phish and not is_whitelisted(domain):
        add_issue(
            issues, "ERROR", file, sid, f"pesan legit memakai domain non-whitelist ('{domain}')"
        )


def _validate_link(issues: list[Issue], scenario: dict[str, Any], file: str, sid: str) -> None:
    link = scenario.get("link")
    if link is None:
        return
    if not isinstance(link, dict):
        add_issue(issues, "ERROR", file, sid, "field 'link' harus objek {text, href} atau null")
        return
    text = link.get("text")
    href = link.get("href")
    if not isinstance(text, str) or not text.strip():
        add_issue(issues, "ERROR", file, sid, "link.text wajib berupa string tidak kosong")
    if not isinstance(href, str) or not href.strip():
        add_issue(issues, "ERROR", file, sid, "link.href wajib berupa string tidak kosong")
        return
    parsed = urlparse(href)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        add_issue(issues, "ERROR", file, sid, "link.href harus URL http(s) yang valid")
        return
    domain = (parsed.hostname or "").lower()
    if has_real_brand(domain):
        add_issue(issues, "ERROR", file, sid, f"link.href memakai domain nyata ('{domain}')")
    phish = scenario.get("is_phish", True)
    if phish and is_whitelisted(domain):
        add_issue(issues, "ERROR", file, sid, "tautan phishing menuju domain resmi whitelist")
    if not phish and not is_whitelisted(domain):
        add_issue(
            issues, "ERROR", file, sid, f"tautan pesan legit bukan domain whitelist ('{domain}')"
        )


def _validate_attachment(
    issues: list[Issue], scenario: dict[str, Any], file: str, sid: str, flags: list[str]
) -> None:
    attachment = scenario.get("attachment")
    dangerous = False
    if attachment is not None:
        if not isinstance(attachment, dict):
            add_issue(
                issues,
                "ERROR",
                file,
                sid,
                "field 'attachment' harus objek {name, size_kb} atau null",
            )
            return
        name = attachment.get("name")
        size = attachment.get("size_kb")
        if not isinstance(name, str) or not name.strip():
            add_issue(issues, "ERROR", file, sid, "attachment.name wajib berupa string")
            return
        if not isinstance(size, int) or isinstance(size, bool) or size < 0:
            add_issue(issues, "ERROR", file, sid, "attachment.size_kb wajib integer ≥ 0")
        dangerous = name.lower().endswith(DANGEROUS_SUFFIXES)
    has_flag = "LAMPIRAN_BERBAHAYA" in flags
    if has_flag and not dangerous:
        add_issue(
            issues,
            "ERROR",
            file,
            sid,
            "red flag LAMPIRAN_BERBAHAYA butuh lampiran berekstensi berbahaya",
        )
    if dangerous and not has_flag:
        add_issue(
            issues,
            "ERROR",
            file,
            sid,
            "lampiran berekstensi berbahaya wajib ditandai LAMPIRAN_BERBAHAYA",
        )


def _validate_options(issues: list[Issue], scenario: dict[str, Any], file: str, sid: str) -> None:
    scenario_type = scenario.get("type")
    options = scenario.get("options")
    correct = scenario.get("correct_option")
    if scenario_type == "phish_or_legit":
        if options not in (None, []):
            add_issue(issues, "ERROR", file, sid, "phish_or_legit tidak boleh punya 'options'")
        if correct is not None:
            add_issue(
                issues, "ERROR", file, sid, "phish_or_legit tidak boleh punya 'correct_option'"
            )
        return
    if not isinstance(options, list) or not 3 <= len(options) <= 4:
        add_issue(issues, "ERROR", file, sid, f"{scenario_type} wajib punya 3–4 options")
        return
    ids: list[str] = []
    for option in options:
        if not isinstance(option, dict):
            add_issue(issues, "ERROR", file, sid, "setiap option wajib objek {id, text}")
            continue
        oid = option.get("id")
        text = option.get("text")
        if not isinstance(oid, str) or oid not in ("A", "B", "C", "D"):
            add_issue(issues, "ERROR", file, sid, "option.id harus 'A'–'D'")
            continue
        if not isinstance(text, str) or not text.strip():
            add_issue(issues, "ERROR", file, sid, f"option {oid} tidak punya teks")
        ids.append(oid)
    if len(ids) != len(set(ids)):
        add_issue(issues, "ERROR", file, sid, "option.id duplikat")
    if not isinstance(correct, str) or correct not in ids:
        add_issue(issues, "ERROR", file, sid, "correct_option harus merujuk id option yang ada")


def validate_scenario(
    issues: list[Issue], scenario: dict[str, Any], file: str, pack_prefix: str
) -> None:
    """Validasi satu objek skenario (aturan §2.3 api-specification)."""
    sid = str(scenario.get("id", "<tanpa-id>"))
    if not ID_PATTERN.match(sid):
        add_issue(issues, "ERROR", file, sid, "id harus berpola '{prefix}-{3 digit}'")
    elif not sid.startswith(f"{pack_prefix}-"):
        add_issue(issues, "ERROR", file, sid, f"prefix id harus '{pack_prefix}-' untuk pack ini")

    scenario_type = scenario.get("type")
    if scenario_type not in TYPES:
        add_issue(issues, "ERROR", file, sid, f"type harus salah satu dari {TYPES}")
    difficulty = scenario.get("difficulty")
    if difficulty not in DIFFICULTIES:
        add_issue(issues, "ERROR", file, sid, f"difficulty harus salah satu dari {DIFFICULTIES}")
    channel = scenario.get("channel")
    if channel not in CHANNELS:
        add_issue(issues, "ERROR", file, sid, f"channel harus salah satu dari {CHANNELS}")

    datetime_value = scenario.get("datetime")
    if not isinstance(datetime_value, str) or not DATETIME_PATTERN.match(datetime_value):
        add_issue(issues, "ERROR", file, sid, "datetime harus ISO-8601 berakhiran +07:00")

    body = require_str(issues, scenario, "body", file, sid)
    if body:
        words = word_count(body)
        if words > 130:
            add_issue(issues, "ERROR", file, sid, f"body {words} kata, maksimum ±120")
        elif words > 120:
            add_issue(issues, "WARN", file, sid, f"body {words} kata, target ≤ 120")

    if channel == "email":
        subject = scenario.get("subject")
        if not isinstance(subject, str) or not subject.strip():
            add_issue(issues, "ERROR", file, sid, "kanal email wajib punya subject")
    elif scenario.get("subject") is not None:
        add_issue(issues, "WARN", file, sid, "kanal SMS/WhatsApp sebaiknya subject = null")

    _validate_sender(issues, scenario, file, sid)

    if scenario_type in ("phish_or_legit", "best_action") and not isinstance(
        scenario.get("is_phish"), bool
    ):
        add_issue(issues, "ERROR", file, sid, f"{scenario_type} wajib punya is_phish (boolean)")

    phish = scenario.get("is_phish", True)
    flags = scenario.get("red_flags")
    if not isinstance(flags, list):
        add_issue(issues, "ERROR", file, sid, "red_flags wajib array")
        flags = []
    else:
        for flag in flags:
            if flag not in RED_FLAGS:
                add_issue(issues, "ERROR", file, sid, f"red flag tidak dikenal: {flag}")
        if len(flags) != len(set(flags)):
            add_issue(issues, "ERROR", file, sid, "red flag duplikat")
        if phish:
            if not 2 <= len(flags) <= 5:
                add_issue(issues, "ERROR", file, sid, "skenario phishing wajib 2–5 red flag")
        elif flags:
            add_issue(issues, "ERROR", file, sid, "skenario legit wajib red_flags = []")

    _validate_link(issues, scenario, file, sid)
    _validate_attachment(issues, scenario, file, sid, [str(flag) for flag in flags])
    _validate_options(issues, scenario, file, sid)

    explanation = require_str(issues, scenario, "explanation", file, sid)
    if explanation and sentence_count(explanation) > 3:
        add_issue(issues, "ERROR", file, sid, "explanation maksimal 3 kalimat")

    teach = scenario.get("teach")
    if not isinstance(teach, dict):
        add_issue(issues, "ERROR", file, sid, "teach wajib objek {tip, verify_how}")
        return
    for key in ("tip", "verify_how"):
        value = teach.get(key)
        if not isinstance(value, str) or not value.strip():
            add_issue(issues, "ERROR", file, sid, f"teach.{key} wajib string tidak kosong")
            continue
        if sentence_count(value) > 2:
            add_issue(issues, "ERROR", file, sid, f"teach.{key} maksimal 2 kalimat")
        elif key == "tip" and sentence_count(value) > 1:
            add_issue(issues, "WARN", file, sid, "teach.tip sebaiknya satu kalimat")


def validate_pack(issues: list[Issue], path: Path, pack: dict[str, Any], prefix: str) -> None:
    """Validasi struktur pack, komposisi §9.4, dan setiap skenario di dalamnya."""
    rel = path.name
    if pack.get("schema_version") != SCHEMA_VERSION:
        add_issue(issues, "ERROR", rel, "-", f"schema_version pack harus '{SCHEMA_VERSION}'")
    for key in ("pack_id", "name", "description", "emoji"):
        value = pack.get(key)
        if not isinstance(value, str) or not value.strip():
            add_issue(issues, "ERROR", rel, "-", f"field pack '{key}' wajib string tidak kosong")
    scenarios = pack.get("scenarios")
    if not isinstance(scenarios, list):
        add_issue(issues, "ERROR", rel, "-", "field 'scenarios' wajib array")
        return
    if len(scenarios) != SCENARIOS_PER_PACK:
        add_issue(
            issues,
            "ERROR",
            rel,
            "-",
            f"pack wajib {SCENARIOS_PER_PACK} skenario, ada {len(scenarios)}",
        )

    seen: set[str] = set()
    for scenario in scenarios:
        if not isinstance(scenario, dict):
            add_issue(issues, "ERROR", rel, "-", "setiap skenario wajib objek")
            continue
        sid = str(scenario.get("id"))
        if sid in seen:
            add_issue(issues, "ERROR", rel, sid, "id skenario duplikat")
        seen.add(sid)
        validate_scenario(issues, scenario, rel, prefix)

    if len(scenarios) < 1:
        return

    types = [s.get("type") for s in scenarios if isinstance(s, dict)]
    for scenario_type, minimum in (("phish_or_legit", 7), ("best_action", 2), ("spot_redflag", 1)):
        count = types.count(scenario_type)
        if count < minimum:
            add_issue(
                issues, "ERROR", rel, "-", f"komposisi: {scenario_type} ≥ {minimum}, ada {count}"
            )

    difficulties = [s.get("difficulty") for s in scenarios if isinstance(s, dict)]
    for difficulty, target in (("mudah", 3), ("sedang", 4), ("sulit", 3)):
        count = difficulties.count(difficulty)
        if count != target:
            add_issue(
                issues,
                "ERROR",
                rel,
                "-",
                f"komposisi: {target} skenario '{difficulty}', ada {count}",
            )

    channels = [s.get("channel") for s in scenarios if isinstance(s, dict)]
    for channel, minimum in (("email", 3), ("sms", 3), ("whatsapp", 2)):
        count = channels.count(channel)
        if count < minimum:
            add_issue(
                issues, "ERROR", rel, "-", f"komposisi: ≥ {minimum} kanal {channel}, ada {count}"
            )

    phish_total = sum(1 for s in scenarios if isinstance(s, dict) and s.get("is_phish") is True)
    legit_total = sum(1 for s in scenarios if isinstance(s, dict) and s.get("is_phish") is False)
    if phish_total != 6 or legit_total != 4:
        add_issue(
            issues,
            "ERROR",
            rel,
            "-",
            f"komposisi: target 6 phishing / 4 legit, ada {phish_total} / {legit_total}",
        )


def validate_content(content_dir: Path) -> list[Issue]:
    """Validasi seluruh direktori konten.

    Args:
        content_dir: Direktori ``content/`` yang berisi manifest dan packs.

    Returns:
        Daftar temuan; kosong berarti valid.

    Raises:
        FileNotFoundError: Bila manifest tidak ditemukan.
    """
    issues: list[Issue] = []
    manifest_path = content_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    if manifest.get("schema_version") != SCHEMA_VERSION:
        add_issue(
            issues, "ERROR", manifest_path.name, "-", f"schema_version harus '{SCHEMA_VERSION}'"
        )
    packs = manifest.get("packs")
    if not isinstance(packs, list) or not packs:
        add_issue(
            issues, "ERROR", manifest_path.name, "-", "field 'packs' wajib array tidak kosong"
        )
        return issues

    global_ids: set[str] = set()
    global_flags: set[str] = set()
    declared_files = {str(entry.get("file")) for entry in packs if isinstance(entry, dict)}

    for entry in packs:
        if not isinstance(entry, dict):
            add_issue(issues, "ERROR", manifest_path.name, "-", "setiap pack wajib objek")
            continue
        pack_id = str(entry.get("pack_id"))
        prefix = PACK_PREFIX.get(pack_id)
        if prefix is None:
            add_issue(issues, "ERROR", manifest_path.name, pack_id, "pack_id tidak dikenal")
            continue
        for key in ("file", "name", "emoji", "scenario_count"):
            if key not in entry:
                add_issue(
                    issues, "ERROR", manifest_path.name, pack_id, f"field manifest '{key}' hilang"
                )
        pack_path = content_dir / str(entry.get("file", ""))
        if not pack_path.exists():
            add_issue(
                issues,
                "ERROR",
                manifest_path.name,
                pack_id,
                f"file pack tidak ditemukan: {pack_path}",
            )
            continue
        try:
            pack = json.loads(pack_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            add_issue(issues, "ERROR", pack_path.name, "-", f"JSON tidak valid: {exc}")
            continue
        if pack.get("pack_id") != pack_id:
            add_issue(
                issues, "ERROR", pack_path.name, "-", f"pack_id file ≠ manifest ('{pack_id}')"
            )
        validate_pack(issues, pack_path, pack, prefix)

        scenarios = pack.get("scenarios") or []
        pack_flags: set[str] = set()
        for scenario in scenarios:
            if not isinstance(scenario, dict):
                continue
            sid = str(scenario.get("id"))
            if sid in global_ids:
                add_issue(issues, "ERROR", pack_path.name, sid, "id skenario tidak unik global")
            global_ids.add(sid)
            for flag in scenario.get("red_flags") or []:
                if isinstance(flag, str):
                    pack_flags.add(flag)
        global_flags |= pack_flags
        if len(pack_flags) < 7:
            add_issue(
                issues,
                "ERROR",
                pack_path.name,
                "-",
                f"cakupan red flag per pack ≥ 7 jenis, ada {len(pack_flags)}",
            )
        declared = entry.get("scenario_count")
        if isinstance(declared, int) and declared != len(scenarios):
            add_issue(
                issues,
                "ERROR",
                manifest_path.name,
                pack_id,
                f"scenario_count manifest {declared} ≠ isi pack {len(scenarios)}",
            )

    for relative in sorted(name for name in declared_files if name != "None"):
        if not (content_dir / relative).exists():
            add_issue(issues, "ERROR", manifest_path.name, "-", f"file pack hilang: {relative}")

    absent = [flag for flag in RED_FLAGS if flag not in global_flags]
    if absent:
        add_issue(
            issues,
            "ERROR",
            manifest_path.name,
            "-",
            f"cakupan red flag koleksi belum lengkap, hilang: {', '.join(absent)}",
        )

    return issues


def main(argv: list[str] | None = None) -> int:
    """Entry point validator sesuai exit code §5 api-specification."""
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("penggunaan: python scripts/validate_content.py <dir-konten>", file=sys.stderr)
        return 2
    content_dir = Path(args[0])
    if not (content_dir / "manifest.json").exists():
        print(
            f"ERROR path tidak valid: {content_dir}/manifest.json tidak ditemukan", file=sys.stderr
        )
        return 2

    issues = validate_content(content_dir)
    for issue in issues:
        print(issue.render())
    errors = [issue for issue in issues if issue.level == "ERROR"]
    warnings = [issue for issue in issues if issue.level == "WARN"]
    print(f"\n{len(errors)} error · {len(warnings)} peringatan · konten: {content_dir}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
