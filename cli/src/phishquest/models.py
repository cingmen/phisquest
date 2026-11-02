"""Dataclass, konstanta aturan main, dan eksepsi PhishQuest."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

SCHEMA_VERSION = "1.0"
XP_BASE = 10
STREAK_STEP = 2
STREAK_CAP = 10
HISTORY_LIMIT = 50
MIXED_PACK_ID = "campuran"

LEVELS: list[tuple[int, str]] = [
    (0, "amatir"),
    (100, "analis_muda"),
    (250, "analis"),
    (450, "detektif"),
    (650, "phishhunter"),
]

LEVEL_NAMES = {
    "amatir": "Amatir",
    "analis_muda": "Analis Muda",
    "analis": "Analis",
    "detektif": "Detektif",
    "phishhunter": "PhishHunter",
}

LEVEL_EMOJI = {
    "amatir": "🐣",
    "analis_muda": "🔎",
    "analis": "🕵️",
    "detektif": "🧠",
    "phishhunter": "👑",
}

PACK_IDS = ["ewallet-bank", "office", "shopping-courier", "campus-gov"]

RED_FLAGS = [
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
]

RED_FLAG_LABELS = {
    "PENGIRIM_TIDAK_WAJAR": "Pengirim tidak wajar",
    "DOMAIN_PALSU": "Domain palsu",
    "DOMAIN_MIRIP": "Domain mirip (typosquatting)",
    "TEKANAN_WAKTU": "Tekanan waktu",
    "ANCAMAN": "Ancaman",
    "IMBALAN_BERLEBIHAN": "Imbalan berlebihan",
    "MEMINTA_DATA_SENSITIF": "Meminta data sensitif",
    "LINK_MENCURIGAKAN": "Tautan mencurigakan",
    "LAMPIRAN_BERBAHAYA": "Lampiran berbahaya",
    "GRAMATIKA_AJANG": "Ejaan/tata bahasa janggal",
    "SAPAAN_GENERIK": "Sapaan generik",
    "SALURAN_TIDAK_WAJAR": "Saluran tidak wajar",
}

JAKARTA_TZ = timezone(timedelta(hours=7))


def now_iso() -> str:
    """Waktu sekarang dalam ISO-8601 zona +07:00 tanpa mikrodetik."""
    return datetime.now(JAKARTA_TZ).replace(microsecond=0).isoformat()


class PhishQuestError(Exception):
    """Induk seluruh kesalahan PhishQuest yang aman ditampilkan ke pemain."""


class ContentError(PhishQuestError):
    """Konten tidak valid, tidak lengkap, atau tidak ditemukan."""


class StorageError(PhishQuestError):
    """Gagal membaca/menulis progres pemain."""


class EngineError(PhishQuestError):
    """Pelanggaran aturan sesi (mis. menjawab soal yang sudah dijawab)."""


def level_for(total_xp: int) -> str:
    """Kembalikan id level untuk total_xp tertentu.

    Args:
        total_xp: XP kumulatif pemain.

    Returns:
        Id level (mis. "analis").
    """
    result = LEVELS[0][1]
    for threshold, level_id in LEVELS:
        if total_xp >= threshold:
            result = level_id
    return result


def level_index(level_id: str) -> int:
    """Posisi level dalam tangga level (0 = amatir)."""
    ids = [name for _, name in LEVELS]
    return ids.index(level_id) if level_id in ids else 0


def level_progress(total_xp: int) -> tuple[str, int, int]:
    """Level saat ini beserta rentang XP-nya.

    Args:
        total_xp: XP kumulatif pemain.

    Returns:
        Tuple ``(level_id, xp_di_level_ini, xp_dibutuhkan_ke_level_berikut)``;
        level terakhir mengembalikan kebutuhan 0.
    """
    current = level_for(total_xp)
    index = level_index(current)
    floor = LEVELS[index][0]
    if index + 1 >= len(LEVELS):
        return current, total_xp - floor, 0
    ceiling = LEVELS[index + 1][0]
    return current, total_xp - floor, ceiling - floor


@dataclass(frozen=True)
class Badge:
    """Metadata satu lencana."""

    badge_id: str
    name: str
    emoji: str
    requirement: str


BADGES: list[Badge] = [
    Badge("first_catch", "Tangkapan Pertama", "🎣", "Menjawab benar pertama kali"),
    Badge("streak_5", "Mata Elang", "🔥", "5 jawaban benar beruntun"),
    Badge("streak_10", "Mantap Jiwa", "💪", "10 jawaban benar beruntun"),
    Badge("perfect_pack", "Tanpa Terhook", "💯", "Menyelesaikan satu pack dengan akurasi 100%"),
    Badge("all_packs", "Penjelajah Nusantara", "🗺️", "Menyelesaikan ≥ 1 sesi di keempat pack"),
    Badge("domain_guard", "Detektif Domain", "🕵️", "Benar pada 10 soal ber-red-flag domain"),
    Badge("otp_guard", "Penjaga OTP", "🔐", "Benar pada 5 soal yang meminta data sensitif"),
    Badge("urgency_guard", "Tidak Tergesa-Gesa", "⏰", "Benar pada 5 soal bertekanan waktu"),
    Badge("comeback", "Bangkit Lagi", "🌱", "Setelah 3 salah beruntun, benar sampai sesi habis"),
    Badge("level_detective", "Naik Kelas", "🎓", "Mencapai level Detektif"),
]

BADGE_IDS = [badge.badge_id for badge in BADGES]
BADGE_BY_ID = {badge.badge_id: badge for badge in BADGES}


@dataclass
class Scenario:
    """Satu skenario permainan hasil parsing JSON konten."""

    id: str
    type: str
    difficulty: str
    channel: str
    sender: dict[str, str]
    subject: str | None
    datetime: str
    body: str
    link: dict[str, str] | None
    attachment: dict[str, Any] | None
    options: list[dict[str, str]] | None
    is_phish: bool
    correct_option: str | None
    red_flags: list[str]
    explanation: str
    teach: dict[str, str]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Scenario:
        """Bangun Scenario dari dict JSON, melempar ContentError bila tidak lengkap."""
        required = ("id", "type", "difficulty", "channel", "sender", "datetime", "body")
        missing = [key for key in required if key not in data]
        if missing:
            raise ContentError(f"skenario tidak lengkap, field hilang: {', '.join(missing)}")
        teach = data.get("teach") or {}
        if not isinstance(teach, dict) or "tip" not in teach or "verify_how" not in teach:
            raise ContentError(f"skenario {data.get('id')} tidak punya teach.tip/verify_how")
        sender = data.get("sender") or {}
        if not isinstance(sender, dict) or "name" not in sender or "address" not in sender:
            raise ContentError(f"skenario {data.get('id')} tidak punya sender.name/address")
        return cls(
            id=str(data["id"]),
            type=str(data["type"]),
            difficulty=str(data["difficulty"]),
            channel=str(data["channel"]),
            sender={"name": str(sender["name"]), "address": str(sender["address"])},
            subject=data.get("subject"),
            datetime=str(data["datetime"]),
            body=str(data["body"]),
            link=data.get("link"),
            attachment=data.get("attachment"),
            options=data.get("options"),
            is_phish=bool(data.get("is_phish", True)),
            correct_option=data.get("correct_option"),
            red_flags=list(data.get("red_flags") or []),
            explanation=str(data.get("explanation", "")),
            teach={"tip": str(teach["tip"]), "verify_how": str(teach["verify_how"])},
        )

    def correct_answer(self) -> str:
        """Label jawaban benar: "PHISH"/"LEGIT" atau id opsi."""
        if self.type == "phish_or_legit":
            return "PHISH" if self.is_phish else "LEGIT"
        return str(self.correct_option)


@dataclass
class Pack:
    """Kumpulan skenario dengan identitas pack."""

    pack_id: str
    name: str
    scenarios: list[Scenario]


def _default_counters() -> dict[str, Any]:
    return {
        "answered": 0,
        "correct": 0,
        "wrong": 0,
        "sessions_completed": 0,
        "correct_redflag": {},
    }


@dataclass
class Progress:
    """Progres pemain—struktur sama untuk web dan CLI."""

    schema_version: str = SCHEMA_VERSION
    created_at: str = field(default_factory=now_iso)
    updated_at: str = field(default_factory=now_iso)
    total_xp: int = 0
    level: str = "amatir"
    current_streak: int = 0
    best_streak: int = 0
    counters: dict[str, Any] = field(default_factory=_default_counters)
    packs: dict[str, Any] = field(default_factory=dict)
    badges: dict[str, str] = field(default_factory=dict)
    history: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> Progress:
        """Bangun Progress dari dict, mengisi default untuk field opsional (MINOR)."""
        if not data:
            return cls()
        counters = _default_counters()
        raw_counters = data.get("counters") or {}
        if isinstance(raw_counters, dict):
            for key, default in counters.items():
                value = raw_counters.get(key, default)
                counters[key] = value
            if not isinstance(counters["correct_redflag"], dict):
                counters["correct_redflag"] = {}
        history = data.get("history") or []
        if not isinstance(history, list):
            history = []
        return cls(
            schema_version=str(data.get("schema_version", SCHEMA_VERSION)),
            created_at=str(data.get("created_at") or now_iso()),
            updated_at=str(data.get("updated_at") or now_iso()),
            total_xp=int(data.get("total_xp", 0) or 0),
            level=level_for(int(data.get("total_xp", 0) or 0)),
            current_streak=int(data.get("current_streak", 0) or 0),
            best_streak=int(data.get("best_streak", 0) or 0),
            counters=counters,
            packs=dict(data.get("packs") or {}),
            badges=dict(data.get("badges") or {}),
            history=history[-HISTORY_LIMIT:],
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialisasi Progress; level selalu dihitung ulang dari total_xp."""
        self.level = level_for(self.total_xp)
        return {
            "schema_version": self.schema_version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "total_xp": self.total_xp,
            "level": self.level,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "counters": self.counters,
            "packs": self.packs,
            "badges": self.badges,
            "history": self.history,
        }


@dataclass
class Settings:
    """Pengaturan pemain (disiapkan untuk v1.1)."""

    schema_version: str = SCHEMA_VERSION
    locale: str = "id"
    sound: bool = True
    reduced_motion: bool = False
    nickname: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> Settings:
        """Bangun Settings dari dict dengan default aman."""
        data = data or {}
        return cls(
            schema_version=str(data.get("schema_version", SCHEMA_VERSION)),
            locale=str(data.get("locale", "id")),
            sound=bool(data.get("sound", True)),
            reduced_motion=bool(data.get("reduced_motion", False)),
            nickname=str(data.get("nickname", ""))[:16],
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialisasi Settings ke dict JSON."""
        return {
            "schema_version": self.schema_version,
            "locale": self.locale,
            "sound": self.sound,
            "reduced_motion": self.reduced_motion,
            "nickname": self.nickname,
        }


@dataclass
class AnswerResult:
    """Hasil penilaian satu jawaban—kontrak tetap web ↔ CLI."""

    correct: bool
    xp_base: int
    xp_bonus: int
    xp_gained: int
    streak_after: int
    is_phish: bool
    red_flags: list[str]
    explanation: str
    teach: dict[str, str]
    badges_earned: list[str]
    level_up: str | None

    def to_dict(self) -> dict[str, Any]:
        """Serialisasi AnswerResult sesuai kontrak api-specification §3.1."""
        return {
            "correct": self.correct,
            "xp_base": self.xp_base,
            "xp_bonus": self.xp_bonus,
            "xp_gained": self.xp_gained,
            "streak_after": self.streak_after,
            "is_phish": self.is_phish,
            "red_flags": self.red_flags,
            "explanation": self.explanation,
            "teach": self.teach,
            "badges_earned": self.badges_earned,
            "level_up": self.level_up,
        }


@dataclass
class SessionSummary:
    """Ringkasan satu sesi untuk layar recap."""

    pack_id: str | None
    score: int
    max_score: int
    accuracy: float
    xp_gained: int
    best_streak_in_session: int
    badges_earned: list[str]
    level_before: str
    level_after: str
    mistakes: list[dict[str, str]]
    recovered: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Serialisasi SessionSummary (termasuk field tambahan ``recovered``)."""
        return {
            "pack_id": self.pack_id,
            "score": self.score,
            "max_score": self.max_score,
            "accuracy": self.accuracy,
            "xp_gained": self.xp_gained,
            "best_streak_in_session": self.best_streak_in_session,
            "badges_earned": self.badges_earned,
            "level_before": self.level_before,
            "level_after": self.level_after,
            "mistakes": self.mistakes,
            "recovered": self.recovered,
        }
