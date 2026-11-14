"""SQLite untuk papan skor online PhishQuest.

Skema mengikuti ``docs/database-schema.md`` §5. Semua data anonim: hanya
nickname pilihan pemain dan hasil sesi, tanpa alamat, email, atau ID perangkat.
"""

from __future__ import annotations

import sqlite3
import uuid
from collections.abc import Mapping
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA_VERSION = "2.0.0"

DDL = """
CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,
  nickname    TEXT NOT NULL UNIQUE,
  locale      TEXT NOT NULL DEFAULT 'id',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id      TEXT NOT NULL REFERENCES players(id),
  pack_id        TEXT NOT NULL,
  score          INTEGER NOT NULL CHECK (score  BETWEEN 0 AND 999),
  max_score      INTEGER NOT NULL CHECK (max_score BETWEEN 1 AND 999),
  accuracy       REAL    NOT NULL CHECK (accuracy BETWEEN 0 AND 1),
  duration_s     INTEGER NOT NULL CHECK (duration_s BETWEEN 1 AND 7200),
  client_version TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_board
  ON scores (pack_id, score DESC, duration_s ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_scores_player
  ON scores (player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS badges (
  player_id TEXT NOT NULL REFERENCES players(id),
  badge_id  TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (player_id, badge_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        TEXT PRIMARY KEY,
  score_id   INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
"""


def utc_now() -> str:
    """Kembalikan waktu UTC format ISO-8601 dengan akhiran Z.

    Returns:
        Contoh ``2026-11-14T09:00:00Z``.
    """
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def connect(path: str | Path) -> sqlite3.Connection:
    """Buka koneksi SQLite dengan WAL dan foreign keys aktif.

    Args:
        path: Lokasi berkas database; ``:memory:`` untuk pengujian.

    Returns:
        Koneksi dengan ``row_factory`` sqlite3.Row.
    """
    connection = sqlite3.connect(str(path), check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def init_db(connection: sqlite3.Connection) -> None:
    """Buat tabel dan catat migrasi awal.

    Args:
        connection: Koneksi SQLite yang sudah dibuka.
    """
    connection.executescript(DDL)
    connection.execute(
        "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        (SCHEMA_VERSION, utc_now()),
    )
    connection.commit()


def get_or_create_player(
    connection: sqlite3.Connection,
    nickname: str,
    locale: str = "id",
    now: str | None = None,
) -> str:
    """Cari pemain berdasarkan nickname atau buat UUID baru.

    Args:
        connection: Koneksi SQLite.
        nickname: Nickname 1–16 karakter yang sudah divalidasi.
        locale: Kode locale pemain.
        now: Waktu pembuatan; default waktu UTC saat ini.

    Returns:
        UUID pemain.
    """
    row = connection.execute("SELECT id FROM players WHERE nickname = ?", (nickname,)).fetchone()
    if row:
        return str(row["id"])
    player_id = str(uuid.uuid4())
    connection.execute(
        "INSERT INTO players (id, nickname, locale, created_at) VALUES (?, ?, ?, ?)",
        (player_id, nickname, locale, now or utc_now()),
    )
    return player_id


def insert_score(
    connection: sqlite3.Connection,
    player_id: str,
    payload: Mapping[str, object],
    now: str | None = None,
) -> int:
    """Simpan satu hasil sesi.

    Args:
        connection: Koneksi SQLite.
        player_id: UUID pemain.
        payload: Payload skor yang sudah divalidasi.
        now: Waktu pencatatan; default waktu UTC saat ini.

    Returns:
        ID baris skor baru.
    """
    cursor = connection.execute(
        """
        INSERT INTO scores
          (player_id, pack_id, score, max_score, accuracy, duration_s, client_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            player_id,
            payload["pack_id"],
            payload["score"],
            payload["max_score"],
            payload["accuracy"],
            payload["duration_s"],
            payload["client_version"],
            now or utc_now(),
        ),
    )
    return int(cursor.lastrowid)


def score_rank(connection: sqlite3.Connection, score_id: int, pack_id: str) -> int:
    """Hitung peringkat satu skor di papan pack tersebut.

    Args:
        connection: Koneksi SQLite.
        score_id: ID baris skor.
        pack_id: Pack yang dipakai untuk papan peringkat.

    Returns:
        Peringkat 1-basis.
    """
    row = connection.execute(
        "SELECT score, duration_s, created_at FROM scores WHERE id = ?",
        (score_id,),
    ).fetchone()
    if row is None:
        return 0
    better = connection.execute(
        """
        SELECT COUNT(*) AS total FROM scores
        WHERE pack_id = ?
          AND (
            score > ?
            OR (score = ? AND duration_s < ?)
            OR (score = ? AND duration_s = ? AND created_at < ?)
            OR (score = ? AND duration_s = ? AND created_at = ? AND id < ?)
          )
        """,
        (
            pack_id,
            row["score"],
            row["score"],
            row["duration_s"],
            row["score"],
            row["duration_s"],
            row["created_at"],
            row["score"],
            row["duration_s"],
            row["created_at"],
            score_id,
        ),
    ).fetchone()
    return int(better["total"]) + 1


def total_scores(connection: sqlite3.Connection, pack_id: str) -> int:
    """Hitung semua skor pada satu pack.

    Args:
        connection: Koneksi SQLite.
        pack_id: ID pack.

    Returns:
        Jumlah baris skor.
    """
    row = connection.execute(
        "SELECT COUNT(*) AS total FROM scores WHERE pack_id = ?", (pack_id,)
    ).fetchone()
    return int(row["total"])


def _period_cutoff(period: str, now: datetime | None = None) -> str | None:
    moment = now or datetime.now(timezone.utc)
    if period == "day":
        return (moment - timedelta(days=1)).isoformat(timespec="seconds").replace("+00:00", "Z")
    if period == "week":
        return (moment - timedelta(days=7)).isoformat(timespec="seconds").replace("+00:00", "Z")
    return None


def leaderboard(
    connection: sqlite3.Connection,
    pack_id: str,
    period: str = "all",
    limit: int = 20,
    offset: int = 0,
    now: datetime | None = None,
) -> tuple[list[dict[str, object]], bool]:
    """Ambil satu halaman papan peringkat.

    Args:
        connection: Koneksi SQLite.
        pack_id: ID pack atau ``campuran``.
        period: ``day``, ``week``, atau ``all``.
        limit: Jumlah maksimum baris (1–50).
        offset: Offset untuk cursor.
        now: Waktu acuan periode.

    Returns:
        Tuple daftar baris dan apakah masih ada halaman berikutnya.
    """
    cutoff = _period_cutoff(period, now)
    where = "WHERE s.pack_id = ?"
    params: list[object] = [pack_id]
    if cutoff:
        where += " AND s.created_at >= ?"
        params.append(cutoff)
    params.append(limit + 1)
    params.append(offset)
    rows = connection.execute(
        f"""
        SELECT s.id, p.nickname, s.score, s.accuracy, s.duration_s, s.created_at
        FROM scores s JOIN players p ON p.id = s.player_id
        {where}
        ORDER BY s.score DESC, s.duration_s ASC, s.created_at ASC, s.id ASC
        LIMIT ? OFFSET ?
        """,
        params,
    ).fetchall()
    has_more = len(rows) > limit
    visible = rows[:limit]
    return (
        [
            {
                "nickname": row["nickname"],
                "score": row["score"],
                "accuracy": row["accuracy"],
                "duration_s": row["duration_s"],
                "created_at": row["created_at"],
            }
            for row in visible
        ],
        has_more,
    )


def global_stats(connection: sqlite3.Connection) -> dict[str, object]:
    """Hitung statistik global anonim.

    Args:
        connection: Koneksi SQLite.

    Returns:
        Dict ``total_players``, ``total_sessions``, dan ``avg_accuracy``.
    """
    row = connection.execute(
        """
        SELECT COUNT(DISTINCT player_id) AS total_players,
               COUNT(*) AS total_sessions,
               AVG(accuracy) AS avg_accuracy
        FROM scores
        """
    ).fetchone()
    return {
        "total_players": int(row["total_players"] or 0),
        "total_sessions": int(row["total_sessions"] or 0),
        "avg_accuracy": round(float(row["avg_accuracy"] or 0), 4),
    }


def delete_player(connection: sqlite3.Connection, player_id: str) -> bool:
    """Hapus pemain beserta skor dan lencananya.

    Args:
        connection: Koneksi SQLite.
        player_id: UUID pemain.

    Returns:
        True bila pemain ada dan terhapus.
    """
    row = connection.execute("SELECT id FROM players WHERE id = ?", (player_id,)).fetchone()
    if row is None:
        return False
    connection.execute("DELETE FROM scores WHERE player_id = ?", (player_id,))
    connection.execute("DELETE FROM badges WHERE player_id = ?", (player_id,))
    connection.execute("DELETE FROM players WHERE id = ?", (player_id,))
    return True
