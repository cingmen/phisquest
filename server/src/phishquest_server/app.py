"""API papan skor online PhishQuest (opsional, v2.0)."""

from __future__ import annotations

import base64
import json
import os
import re
import sqlite3
import time
from collections import defaultdict, deque
from collections.abc import Callable, Mapping
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .db import (
    connect,
    delete_player,
    get_or_create_player,
    global_stats,
    init_db,
    insert_score,
    leaderboard,
    score_rank,
    total_scores,
)
from .security import PACK_RE, ValidationFailure, signature_valid, validate_score_payload

DEFAULT_DB = Path.home() / ".phishquest" / "leaderboard.sqlite3"
DEFAULT_ORIGIN = "https://cingmen.github.io"
PERIODS = {"day", "week", "all"}
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
CURSOR_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def _error(code: str, message: str, field: str | None = None) -> JSONResponse:
    body: dict[str, object] = {"code": code, "message": message}
    if field:
        body["field"] = field
    return JSONResponse({"error": body}, status_code=_status_for(code))


def _status_for(code: str) -> int:
    return {
        "VALIDATION_ERROR": 400,
        "DUPLICATE": 409,
        "SIGNATURE_INVALID": 422,
        "RATE_LIMITED": 429,
        "NOT_FOUND": 404,
    }.get(code, 400)


def _encode_cursor(offset: int) -> str:
    raw = json.dumps({"offset": offset}, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str | None) -> int | None:
    if cursor is None or cursor == "":
        return 0
    if not CURSOR_RE.fullmatch(cursor):
        return None
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
        offset = data.get("offset") if isinstance(data, Mapping) else None
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:
        return None
    return offset


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def create_app(
    db_path: str | Path | None = None,
    secret: str | None = None,
    allowed_origins: list[str] | None = None,
    rate_limit: int = 60,
    clock: Callable[[], datetime] | None = None,
) -> FastAPI:
    """Buat aplikasi FastAPI dengan database dan konfigurasi tertentu.

    Args:
        db_path: Lokasi SQLite; default ``~/.phishquest/leaderboard.sqlite3``.
        secret: Rahasia HMAC; default env ``PQ_HMAC_SECRET`` atau nilai dev.
        allowed_origins: Origin yang boleh POST; default env atau GitHub Pages.
        rate_limit: Maksimum POST skor per IP per jam.
        clock: Fungsi waktu untuk pengujian periode.

    Returns:
        Aplikasi FastAPI siap dijalankan atau diuji.
    """
    database = Path(db_path) if db_path else Path(os.environ.get("PQ_DB_PATH", DEFAULT_DB))
    database.parent.mkdir(parents=True, exist_ok=True)
    shared_secret = secret or os.environ.get("PQ_HMAC_SECRET", "phishquest-dev-secret")
    origins = allowed_origins or [
        origin.strip()
        for origin in os.environ.get("PQ_ALLOWED_ORIGIN", DEFAULT_ORIGIN).split(",")
        if origin.strip()
    ]
    now = clock or (lambda: datetime.now(timezone.utc))

    connection = connect(database)
    init_db(connection)
    connection.close()

    app = FastAPI(title="PhishQuest Leaderboard", version=__version__)
    app.state.db_path = database
    app.state.secret = shared_secret
    app.state.clock = now
    app.state.rate_limit = max(1, int(rate_limit))
    app.state.hits: dict[str, deque[float]] = defaultdict(deque)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Idempotency-Key"],
        max_age=86400,
    )

    def open_db() -> sqlite3.Connection:
        return connect(database)

    def rate_limited(host: str) -> bool:
        now_seconds = time.monotonic()
        hits = app.state.hits[host]
        cutoff = now_seconds - 3600
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= app.state.rate_limit:
            return True
        hits.append(now_seconds)
        return False

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    @app.post("/v1/scores", status_code=201)
    async def post_score(request: Request) -> Response:
        host = request.client.host if request.client else "unknown"
        if rate_limited(host):
            response = _error("RATE_LIMITED", "Terlalu banyak permintaan; coba lagi nanti.")
            response.headers["Retry-After"] = "3600"
            return response

        try:
            body: Any = await request.json()
        except (ValueError, json.JSONDecodeError):
            return _error("VALIDATION_ERROR", "Body harus JSON yang valid.", "body")

        try:
            payload = validate_score_payload(body)
        except ValidationFailure as failure:
            return _error("VALIDATION_ERROR", failure.message, failure.field)

        if not signature_valid(payload, payload.get("sig"), shared_secret):
            return _error("SIGNATURE_INVALID", "Tanda tangan skor tidak valid.", "sig")

        idempotency = request.headers.get("Idempotency-Key")
        if idempotency is not None and not UUID_RE.fullmatch(idempotency):
            return _error("VALIDATION_ERROR", "Idempotency-Key harus UUID", "Idempotency-Key")

        connection = open_db()
        try:
            if idempotency:
                duplicate = connection.execute(
                    "SELECT 1 FROM idempotency_keys WHERE key = ?", (idempotency,)
                ).fetchone()
                if duplicate:
                    return _error("DUPLICATE", "Permintaan dengan kunci ini sudah dicatat.")
            player_id = get_or_create_player(
                connection, str(payload["nickname"]), "id", _iso(now())
            )
            score_id = insert_score(connection, player_id, payload, _iso(now()))
            if idempotency:
                connection.execute(
                    "INSERT INTO idempotency_keys (key, score_id, created_at) VALUES (?, ?, ?)",
                    (idempotency, score_id, _iso(now())),
                )
            rank = score_rank(connection, score_id, str(payload["pack_id"]))
            total = total_scores(connection, str(payload["pack_id"]))
            connection.commit()
        except sqlite3.IntegrityError:
            connection.rollback()
            return _error("DUPLICATE", "Permintaan dengan kunci ini sudah dicatat.")
        finally:
            connection.close()

        return JSONResponse({"id": score_id, "rank": rank, "total": total}, status_code=201)

    @app.get("/v1/leaderboard")
    def get_leaderboard(request: Request) -> Response:
        pack_id = request.query_params.get("pack_id", "")
        if not PACK_RE.fullmatch(pack_id):
            return _error("VALIDATION_ERROR", "pack_id tidak valid", "pack_id")
        period = request.query_params.get("period", "all")
        if period not in PERIODS:
            return _error("VALIDATION_ERROR", "period harus day, week, atau all", "period")
        try:
            limit = int(request.query_params.get("limit", "20"))
        except ValueError:
            return _error("VALIDATION_ERROR", "limit harus bilangan bulat", "limit")
        if not 1 <= limit <= 50:
            return _error("VALIDATION_ERROR", "limit harus 1–50", "limit")
        offset = _decode_cursor(request.query_params.get("cursor"))
        if offset is None:
            return _error("VALIDATION_ERROR", "cursor tidak valid", "cursor")

        connection = open_db()
        try:
            rows, has_more = leaderboard(connection, pack_id, period, limit, offset, now())
        finally:
            connection.close()
        items = [
            {
                "rank": offset + index + 1,
                "nickname": row["nickname"],
                "score": row["score"],
                "accuracy": row["accuracy"],
                "duration_s": row["duration_s"],
                "created_at": row["created_at"],
            }
            for index, row in enumerate(rows)
        ]
        next_cursor = _encode_cursor(offset + limit) if has_more else None
        return JSONResponse({"items": items, "next_cursor": next_cursor})

    @app.get("/v1/stats/global")
    def get_stats() -> dict[str, object]:
        connection = open_db()
        try:
            return global_stats(connection)
        finally:
            connection.close()

    @app.delete("/v1/players/{player_id}", status_code=204)
    def delete_player_route(player_id: str) -> Response:
        if not UUID_RE.fullmatch(player_id):
            return _error("VALIDATION_ERROR", "player_id harus UUID", "player_id")
        connection = open_db()
        try:
            removed = delete_player(connection, player_id)
            connection.commit()
        finally:
            connection.close()
        if not removed:
            return _error("NOT_FOUND", "Pemain tidak ditemukan.", "player_id")
        return Response(status_code=204)

    return app


def main() -> None:
    """Jalankan server dengan uvicorn dari variabel lingkungan."""
    import uvicorn

    uvicorn.run(
        create_app(),
        host=os.environ.get("PQ_HOST", "127.0.0.1"),
        port=int(os.environ.get("PQ_PORT", "8081")),
    )


app = create_app() if os.environ.get("PQ_SKIP_DEFAULT_APP") != "1" else None
