"""Uji kontrak REST papan skor online PhishQuest."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from phishquest_server.app import create_app
from phishquest_server.db import connect
from phishquest_server.security import sign_payload

SECRET = "test-secret"
ORIGIN = "http://localhost:8000"


def score_payload(**overrides: object) -> dict[str, object]:
    """Bangun payload skor valid dengan tanda tangan yang benar."""
    payload: dict[str, object] = {
        "nickname": "budi_analisis",
        "pack_id": "ewallet-bank",
        "score": 100,
        "max_score": 100,
        "accuracy": 0.9,
        "duration_s": 300,
        "client_version": "2.0.0",
    }
    payload.update(overrides)
    payload["sig"] = sign_payload(payload, SECRET)
    return payload


@pytest.fixture()
def app(tmp_path):
    """Aplikasi dengan database sementara dan origin pengujian."""
    return create_app(
        db_path=tmp_path / "leaderboard.sqlite3",
        secret=SECRET,
        allowed_origins=[ORIGIN],
        rate_limit=100,
    )


@pytest.fixture()
def client(app):
    """Klien HTTP sinkron untuk aplikasi uji."""
    return TestClient(app)


def post_score(client: TestClient, payload: dict[str, object], key: str | None = None):
    """Kirim satu skor dengan Idempotency-Key opsional."""
    headers = {"Idempotency-Key": key or str(uuid.uuid4())}
    return client.post("/v1/scores", json=payload, headers=headers)


def test_health_and_empty_stats(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "2.0.0"}
    assert client.get("/v1/stats/global").json() == {
        "total_players": 0,
        "total_sessions": 0,
        "avg_accuracy": 0,
    }


def test_post_score_returns_rank_and_total(client: TestClient) -> None:
    first = post_score(client, score_payload())
    assert first.status_code == 201
    assert first.json()["rank"] == 1
    assert first.json()["total"] == 1

    second = post_score(client, score_payload(nickname="sari", score=120, accuracy=1.0))
    assert second.status_code == 201
    assert second.json()["rank"] == 1
    assert second.json()["total"] == 2

    board = client.get("/v1/leaderboard", params={"pack_id": "ewallet-bank"}).json()
    assert [item["nickname"] for item in board["items"]] == ["sari", "budi_analisis"]
    assert [item["rank"] for item in board["items"]] == [1, 2]
    assert board["next_cursor"] is None


def test_leaderboard_orders_ties_by_duration_then_time(client: TestClient) -> None:
    post_score(client, score_payload(nickname="lama", duration_s=300))
    post_score(client, score_payload(nickname="cepat", duration_s=200))
    board = client.get("/v1/leaderboard", params={"pack_id": "ewallet-bank"}).json()
    assert [item["nickname"] for item in board["items"]] == ["cepat", "lama"]


def test_cursor_paginates_and_ranks_continue(client: TestClient) -> None:
    for index, nickname in enumerate(["satu", "dua", "tiga"]):
        post_score(client, score_payload(nickname=nickname, score=90 + index * 10))
    first = client.get("/v1/leaderboard", params={"pack_id": "ewallet-bank", "limit": 2}).json()
    assert [item["rank"] for item in first["items"]] == [1, 2]
    assert first["next_cursor"]

    second = client.get(
        "/v1/leaderboard",
        params={"pack_id": "ewallet-bank", "limit": 2, "cursor": first["next_cursor"]},
    ).json()
    assert [item["rank"] for item in second["items"]] == [3]
    assert second["next_cursor"] is None


def test_bad_cursor_and_period_are_rejected(client: TestClient) -> None:
    bad_cursor = client.get("/v1/leaderboard", params={"pack_id": "ewallet-bank", "cursor": "!!!"})
    assert bad_cursor.status_code == 400
    assert bad_cursor.json()["error"]["field"] == "cursor"
    bad_period = client.get("/v1/leaderboard", params={"pack_id": "ewallet-bank", "period": "year"})
    assert bad_period.status_code == 400
    assert bad_period.json()["error"]["field"] == "period"


def test_period_filters_old_scores(tmp_path) -> None:
    moment = [datetime(2026, 11, 14, 9, 0, tzinfo=timezone.utc)]
    app = create_app(
        db_path=tmp_path / "period.sqlite3",
        secret=SECRET,
        rate_limit=100,
        clock=lambda: moment[0],
    )
    client = TestClient(app)
    assert post_score(client, score_payload()).status_code == 201
    moment[0] += timedelta(days=8)
    week = client.get(
        "/v1/leaderboard", params={"pack_id": "ewallet-bank", "period": "week"}
    ).json()
    all_time = client.get(
        "/v1/leaderboard", params={"pack_id": "ewallet-bank", "period": "all"}
    ).json()
    assert week["items"] == []
    assert len(all_time["items"]) == 1


def test_invalid_signature_and_payload_are_rejected(client: TestClient) -> None:
    bad_sig = score_payload()
    bad_sig["sig"] = "0" * 64
    assert post_score(client, bad_sig).status_code == 422

    bad_score = score_payload(score=1000)
    response = post_score(client, bad_score)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert response.json()["error"]["field"] == "score"


def test_duplicate_idempotency_key_is_rejected(client: TestClient) -> None:
    key = str(uuid.uuid4())
    assert post_score(client, score_payload(), key).status_code == 201
    duplicate = post_score(client, score_payload(), key)
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "DUPLICATE"


def test_rate_limit_returns_retry_after(tmp_path) -> None:
    app = create_app(
        db_path=tmp_path / "rate.sqlite3",
        secret=SECRET,
        rate_limit=1,
        allowed_origins=[ORIGIN],
    )
    client = TestClient(app)
    assert post_score(client, score_payload()).status_code == 201
    limited = post_score(client, score_payload(nickname="lain"))
    assert limited.status_code == 429
    assert limited.headers["Retry-After"] == "3600"


def test_cors_allows_configured_origin(client: TestClient) -> None:
    response = client.options(
        "/v1/scores",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,idempotency-key",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
    other = client.options(
        "/v1/scores",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in other.headers


def test_delete_player_removes_scores_and_stats(app, client: TestClient) -> None:
    assert post_score(client, score_payload()).status_code == 201
    connection = connect(app.state.db_path)
    row = connection.execute("SELECT id FROM players").fetchone()
    connection.close()
    assert row is not None

    deleted = client.delete(f"/v1/players/{row['id']}")
    assert deleted.status_code == 204
    assert client.get("/v1/stats/global").json()["total_sessions"] == 0
    assert client.get("/v1/leaderboard", params={"pack_id": "ewallet-bank"}).json()["items"] == []
    assert client.delete(f"/v1/players/{row['id']}").status_code == 404
    assert client.delete("/v1/players/bukan-uuid").status_code == 400
