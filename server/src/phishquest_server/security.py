"""Validasi payload dan tanda tangan HMAC untuk papan skor online.

Tanda tangan ini hanya rem anti-spam, bukan autentikasi: rahasianya ikut
terdistribusi di JavaScript klien sehingga siapa pun bisa membacanya.
"""

from __future__ import annotations

import hashlib
import hmac
import re
from collections.abc import Mapping

NICKNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{1,16}$")
PACK_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,39}$")
VERSION_RE = re.compile(r"^[0-9A-Za-z.+-]{1,20}$")
SIG_RE = re.compile(r"^[0-9a-f]{64}$")


class ValidationFailure(ValueError):
    """Payload tidak valid; membawa nama field untuk respons API."""

    def __init__(self, field: str, message: str) -> None:
        """Simpan field dan pesan kesalahan.

        Args:
            field: Nama field yang gagal divalidasi.
            message: Penjelasan ramah untuk klien.
        """
        super().__init__(message)
        self.field = field
        self.message = message


def canonical_signature_payload(payload: Mapping[str, object]) -> str:
    """Susun string kanonis yang ditandatangani klien dan server.

    Args:
        payload: Payload skor yang sudah lolos validasi tipe.

    Returns:
        String ``nickname|pack_id|score|accuracy|duration_s`` dengan akurasi
        empat angka desimal.
    """
    return "|".join(
        [
            str(payload["nickname"]),
            str(payload["pack_id"]),
            str(int(payload["score"])),
            f"{float(payload['accuracy']):.4f}",
            str(int(payload["duration_s"])),
        ]
    )


def sign_payload(payload: Mapping[str, object], secret: str) -> str:
    """Hitung HMAC-SHA256 heksadesimal dari payload kanonis.

    Args:
        payload: Payload skor.
        secret: Rahasia bersama klien-server.

    Returns:
        Tanda tangan 64 karakter heksadesimal.
    """
    message = canonical_signature_payload(payload).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def signature_valid(payload: Mapping[str, object], signature: object, secret: str) -> bool:
    """Bandingkan tanda tangan klien secara konstan-waktu.

    Args:
        payload: Payload skor.
        signature: Nilai ``sig`` dari klien.
        secret: Rahasia bersama.

    Returns:
        True bila tanda tangan cocok dan berbentuk 64 hex.
    """
    if not isinstance(signature, str) or not SIG_RE.fullmatch(signature):
        return False
    return hmac.compare_digest(signature, sign_payload(payload, secret))


def _as_int(body: Mapping[str, object], field: str, minimum: int, maximum: int) -> int:
    value = body.get(field)
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValidationFailure(field, f"{field} harus bilangan bulat")
    if not minimum <= value <= maximum:
        raise ValidationFailure(field, f"{field} harus {minimum}–{maximum}")
    return value


def validate_score_payload(body: object) -> dict[str, object]:
    """Validasi payload ``POST /v1/scores``.

    Args:
        body: Objek JSON mentah dari permintaan.

    Returns:
        Payload bersih berisi nickname, pack_id, score, max_score, accuracy,
        duration_s, client_version, dan sig.

    Raises:
        ValidationFailure: Bila ada field yang hilang atau di luar rentang.
    """
    if not isinstance(body, Mapping):
        raise ValidationFailure("body", "Body harus objek JSON")

    nickname = body.get("nickname")
    if not isinstance(nickname, str) or not NICKNAME_RE.fullmatch(nickname):
        raise ValidationFailure(
            "nickname", "nickname harus 1–16 karakter huruf, angka, titik, garis bawah, atau strip"
        )

    pack_id = body.get("pack_id")
    if not isinstance(pack_id, str) or not PACK_RE.fullmatch(pack_id):
        raise ValidationFailure("pack_id", "pack_id tidak valid")

    score = _as_int(body, "score", 0, 999)
    max_score = _as_int(body, "max_score", 1, 999)
    duration_s = _as_int(body, "duration_s", 1, 7200)

    accuracy = body.get("accuracy")
    if isinstance(accuracy, bool) or not isinstance(accuracy, (int, float)):
        raise ValidationFailure("accuracy", "accuracy harus 0.0–1.0")
    accuracy = float(accuracy)
    if not 0.0 <= accuracy <= 1.0:
        raise ValidationFailure("accuracy", "accuracy harus 0.0–1.0")

    client_version = body.get("client_version")
    if not isinstance(client_version, str) or not VERSION_RE.fullmatch(client_version):
        raise ValidationFailure("client_version", "client_version tidak valid")

    signature = body.get("sig")
    if not isinstance(signature, str) or not SIG_RE.fullmatch(signature):
        raise ValidationFailure("sig", "sig harus 64 karakter heksadesimal")

    return {
        "nickname": nickname,
        "pack_id": pack_id,
        "score": score,
        "max_score": max_score,
        "accuracy": accuracy,
        "duration_s": duration_s,
        "client_version": client_version,
        "sig": signature,
    }
