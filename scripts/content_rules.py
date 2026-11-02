"""Konstanta, enum, dan util bersama untuk validator konten PhishQuest."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

SCHEMA_VERSION = "1.0"
SCENARIOS_PER_PACK = 10

TYPES = ("phish_or_legit", "best_action", "spot_redflag")
DIFFICULTIES = ("mudah", "sedang", "sulit")
CHANNELS = ("email", "sms", "whatsapp")

RED_FLAGS = (
    "PENGIRIM_TIDAK_WAJAR",
    "DOMAIN_PALSU",
    "DOMAIN_MIRIP",
    "TEKANAN_WAKTU",
    "ANCAMAN",
    "IMBALAN_BERLEBIHAN",
    "MEMINTA_DATA_SENSITIF",
    "LINK_MENCURIGAKAN",
    "LAMPIRAN_BERBAHAYA",
    "GRAMATIKA_AJANG",
    "SAPAAN_GENERIK",
    "SALURAN_TIDAK_WAJAR",
)

PACK_PREFIX = {
    "ewallet-bank": "ew",
    "office": "of",
    "shopping-courier": "sc",
    "campus-gov": "cg",
}

# Domain resmi brand fiktif (coding-rules.md §6.2).
WHITELIST_DOMAINS = {
    "banknusa.example",
    "dompetku.example",
    "tokokilat.example",
    "kargocepat.example",
    "kampusnusantara.example",
    "sibantar.example",
    "asurkita.example",
    "lapakria.example",
}

# Nama brand/instansi nyata yang dilarang muncul sebagai pengirim (coding-rules.md §6.2 butir 4).
# Dicocokkan per kata utuh agar kata umum seperti "dana" tidak menjadi positif palsu.
REAL_BRAND_NAMES = (
    "bca",
    "bankcentralasia",
    "mandiri",
    "bni",
    "bsi",
    "cimb",
    "permata",
    "danamon",
    "ovo",
    "gopay",
    "shopeepay",
    "linkaja",
    "shopee",
    "tokopedia",
    "lazada",
    "blibli",
    "bukalapak",
    "jne",
    "jnt",
    "sicepat",
    "anteraja",
    "posindonesia",
    "gojek",
    "grab",
    "telkomsel",
    "indosat",
    "smartfren",
    "dukcapil",
    "djp",
    "kemenkeu",
    "kominfo",
    "komdigi",
    "polri",
    "bssn",
    "kemdikbud",
    "kemendikbud",
    "dana.id",
    "pajak.go.id",
)

REAL_BRAND_PATTERNS = [
    re.compile(rf"(?<![a-z0-9]){re.escape(name)}(?![a-z0-9])") for name in REAL_BRAND_NAMES
]

DANGEROUS_SUFFIXES = (".exe", ".apk", ".js", ".html", ".scr", ".bat", ".cmd", ".vbs", ".jar")
SENTENCE_END = re.compile(r"[.!?](?=\s|$)")
ID_PATTERN = re.compile(r"^(ew|of|sc|cg)-\d{3}$")
DATETIME_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$")


@dataclass(frozen=True)
class Issue:
    """Satu temuan validasi."""

    level: str
    file: str
    scenario_id: str
    message: str

    def render(self) -> str:
        """Format satu baris keluaran sesuai §5 api-specification."""
        where = f"{self.file} {self.scenario_id}".strip()
        return f"{self.level} {where}: {self.message}"


def domain_of(address: str) -> str:
    """Ambil domain dari alamat email atau URL.

    Args:
        address: Alamat email (``nama@domain``) atau URL penuh.

    Returns:
        Domain huruf kecil, atau string kosong bila tidak dapat ditentukan.
    """
    value = address.strip()
    if "@" in value and "://" not in value:
        return value.rsplit("@", 1)[1].strip().strip(">").lower()
    parsed = urlparse(value)
    return (parsed.hostname or "").lower()


def is_whitelisted(domain: str) -> bool:
    """Cek apakah domain persis salah satu domain resmi brand fiktif."""
    return domain in WHITELIST_DOMAINS


def has_real_brand(text: str) -> str | None:
    """Cari nama brand/instansi nyata pada teks pengirim.

    Args:
        text: gabungan nama dan alamat pengirim.

    Returns:
        Nama brand yang cocok, atau None bila bersih.
    """
    lowered = text.lower()
    for name, pattern in zip(REAL_BRAND_NAMES, REAL_BRAND_PATTERNS, strict=True):
        if pattern.search(lowered):
            return name
    return None


def sentence_count(text: str) -> int:
    """Hitung jumlah kalimat (titik pada domain tidak dihitung)."""
    parts = [part.strip() for part in SENTENCE_END.split(text) if part.strip()]
    return len(parts)


def word_count(text: str) -> int:
    """Hitung jumlah kata pada isi pesan."""
    return len(re.findall(r"\S+", text))


def add_issue(issues: list[Issue], level: str, file: str, scenario_id: str, message: str) -> None:
    """Tambahkan satu temuan ke daftar."""
    issues.append(Issue(level=level, file=file, scenario_id=scenario_id, message=message))


def require_str(
    issues: list[Issue], scenario: dict[str, Any], key: str, file: str, sid: str
) -> str | None:
    """Pastikan field skenario berupa string tidak kosong.

    Args:
        issues: daftar temuan yang akan ditambahi.
        scenario: objek skenario mentah.
        key: nama field yang diperiksa.
        file: nama berkas untuk pesan temuan.
        sid: id skenario untuk pesan temuan.

    Returns:
        Nilai string bila valid, atau None bila tidak.
    """
    value = scenario.get(key)
    if not isinstance(value, str) or not value.strip():
        add_issue(issues, "ERROR", file, sid, f"field '{key}' wajib berupa string tidak kosong")
        return None
    return value
