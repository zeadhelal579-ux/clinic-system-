# Check documented anonymous responses, cache isolation, and local baseline latency.
import concurrent.futures
import json
import os
import statistics
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

BASE = os.environ["CLINIC_TEST_APP_URL"]
assert urlsplit(BASE).hostname == "127.0.0.1"

backend = os.environ["CLINIC_BACKEND_URL"]
assert urlsplit(backend).hostname == "127.0.0.1"


def check_internal_operation(operation, expected, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(
        backend + "/api/internal/" + operation, data=b"{}", headers=headers,
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            assert response.status == expected and json.load(response) is None
    except urllib.error.HTTPError as response:
        assert response.code == expected, (operation, response.code)
        response.close()


check_internal_operation("session", 403)
check_internal_operation("session", 403, "incorrect-token")
check_internal_operation("session", 200, os.environ["CLINIC_INTERNAL_TOKEN"])
check_internal_operation("constructor", 404, os.environ["CLINIC_INTERNAL_TOKEN"])
print("PASS internal API token and operation allowlist")

for route in ["/api/slots", "/api/queue", "/api/patients/search", "/api/online-bookings/unseen-count"]:
    try:
        urllib.request.urlopen(BASE + route, timeout=8).close()
        raise AssertionError("Expected session requirement for " + route)
    except urllib.error.HTTPError as response:
        assert response.code == 401, (route, response.code)
        payload = json.load(response)
        assert payload["code"] == "UNAUTHENTICATED"
        assert payload["requestId"] == response.headers["X-Request-Id"]
        assert response.headers["Cache-Control"] == "private, no-store"

with urllib.request.urlopen(BASE + "/login", timeout=8) as response:
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "no-store" in response.headers["Cache-Control"]
print("PASS 4 anonymous API denials and the login response headers")


def get_login(_):
    started = time.perf_counter()
    with urllib.request.urlopen(BASE + "/login", timeout=8) as response:
        assert response.status == 200
        response.read()
    return (time.perf_counter() - started) * 1000


with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results = sorted(pool.map(get_login, range(30)))
print(f"PASS 30 local HTTP requests, 5 workers, median {statistics.median(results):.0f} ms, p95 {results[28]:.0f} ms")
