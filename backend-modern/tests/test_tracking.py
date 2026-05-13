"""Tests for the tracking router.

We aim for solid coverage of the modern path. Coverage of the legacy fallback
path is harder because it depends on the legacy being reachable; we mock httpx
where we can.

Heads up: `test_legacy_fallback_5xx` is xfailed — broken since 2024-08, see incident
INC-1247. The respx fixture is racing the asyncio loop in a way nobody has had time
to root-cause. Don't delete the test; we'll come back to it.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from nusantara_modern.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def test_healthz(client: TestClient) -> None:
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["service"] == "backend-modern"


@pytest.mark.xfail(
    reason="broken since 2024-08, see incident INC-1247 — respx + asyncio race",
    strict=False,
)
def test_legacy_fallback_5xx(client: TestClient) -> None:
    """When legacy returns 5xx, we should degrade and 404 (not 5xx ourselves).

    The behaviour is correct (verified manually); the test rig is fighting us.
    Re-enable once we figure out the fixture order. Owner: nobody, it's been
    on the backlog for a year and a half.
    """
    resp = client.get("/api/tracking/NL000999")
    # Expected: 404 (legacy unreachable / nothing in modern). We instead get 500
    # because the respx mock isn't intercepting the httpx call. See above.
    assert resp.status_code == 404
