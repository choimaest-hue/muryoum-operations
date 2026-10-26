"""Bounded production collection with allowlisted, credential-free diagnostics."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://muryoum.choimaest.workers.dev"
USER_AGENT = "muryoum-operations/1.1 (https://github.com/choimaest-hue/muryoum-operations)"
MAX_ATTEMPTS = 3
MAX_SLICES = 120  # Up to 100 validated details, list, snapshot, and lock contention.
MAX_SECONDS = 420  # Per district; workflow groups contain at most five districts.
SEOUL_DISTRICTS = frozenset({
    "관악구", "금천구", "서초구", "동작구", "강남구", "강동구", "강북구", "강서구", "광진구", "구로구",
    "노원구", "도봉구", "동대문구", "마포구", "서대문구", "성동구", "성북구", "송파구", "양천구", "영등포구",
    "용산구", "은평구", "종로구", "중구", "중랑구",
})
HTTP_CODES = frozenset({400, 401, 403, 404, 408, 413, 414, 422, 429, 500, 502,
                        503, 504, 520, 521, 522, 523, 524, 525, 526})
TRANSIENT_HTTP = frozenset({408, 429, 500, 502, 503, 504, 520, 521, 522, 523,
                           524, 525, 526})
SOURCE_CODES = frozenset({
    "COLLECTION_FAILED", "CONFIGURATION_INCOMPLETE", "SCOPE_EXCEEDS_PAGE_LIMIT",
    "INCOMPLETE_SOURCE_PAGE", "SOURCE_FILTER_MISMATCH",
    "SCOPE_EXCEEDS_VALIDATED_CAPACITY", "SOURCE_ID_INVALID_OR_DUPLICATED",
    "DETAIL_ID_MISMATCH", "INVALID_SOURCE_ID", "SEOUL_KEY_REQUIRED",
    "SEOUL_NETWORK", "SEOUL_INVALID_RESPONSE", "SEOUL_MISSING_RESULT",
    "SEOUL_INVALID_SHAPE", "SEOUL_INFO-100",
    *(f"SEOUL_ERROR-{n}" for n in (300, 301, 310, 331, 332, 333, 334, 335, 336,
                                  337, 500, 600, 601)),
    *(f"SEOUL_HTTP_{n}" for n in HTTP_CODES),
})
TRANSIENT_CODES = frozenset({
    "SEOUL_NETWORK", "SEOUL_ERROR-500", "SEOUL_ERROR-600",
    *(f"SEOUL_HTTP_{n}" for n in TRANSIENT_HTTP),
})
STATUSES = frozenset({"ok", "already_running", "not_configured", "error"})
PHASES = frozenset({"configuration", "lock", "list", "detail", "snapshot", "cleanup"})
UUID = re.compile(r"[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\Z")
REVISION = re.compile(r"[0-9a-f]{20}\Z")
CLIENT_CODES = frozenset({
    "CLIENT_CREDENTIAL_MISSING", "CLIENT_CREDENTIAL_INVALID", "CLIENT_HTTP_ERROR",
    "CLIENT_NETWORK_ERROR", "CLIENT_INVALID_RESPONSE", "CLIENT_RESPONSE_TOO_LARGE",
    "CLIENT_COLLECTION_NOT_READY", "CLIENT_COLLECTION_FAILED", "CLIENT_BOUNDED_LIMIT",
    "CLIENT_FRESHNESS_FAILED", "CLIENT_CATALOG_FAILED", "CLIENT_UNEXPECTED_ERROR",
    "CLIENT_MODE_INVALID", "CLIENT_DIAGNOSTIC_QUERY_INVALID",
    "CLIENT_DIAGNOSTIC_RESPONSE_INVALID", "DIAGNOSTICS_UNAVAILABLE",
})


class CollectionFailure(Exception):
    """Only fixed codes, never upstream exception strings, cross the CLI boundary."""

    def __init__(self, code: str, retryable: bool = False, http_status: int | None = None):
        self.code = code if code in CLIENT_CODES else "CLIENT_UNEXPECTED_ERROR"
        self.retryable = retryable
        self.http_status = http_status if type(http_status) is int and 100 <= http_status <= 599 else None
        super().__init__(self.code)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # urllib can forward Authorization on a redirected request. Never follow one.
        return None


def safe_diagnostic(payload):
    obj = payload if isinstance(payload, dict) else {}
    value = obj.get("status")
    status = value if isinstance(value, str) and value in STATUSES else "unknown"
    value = obj.get("phase")
    phase = value if isinstance(value, str) and value in PHASES else "unknown"
    value = obj.get("code")
    code = value if isinstance(value, str) and value in SOURCE_CODES else "COLLECTION_FAILED"
    if value is None and status in {"ok", "already_running"}:
        code = "none"
    elif value is None and status == "not_configured":
        code = "CONFIGURATION_INCOMPLETE"
    value = obj.get("runId")
    run_id = value.lower() if isinstance(value, str) and UUID.fullmatch(value) else "unknown"
    return status, phase, code, run_id


def _read_json(opener, request, limit, timeout):
    try:
        with opener(request, timeout=timeout) as response:
            body = response.read(limit + 1)
        if len(body) > limit:
            raise CollectionFailure("CLIENT_RESPONSE_TOO_LARGE")
        payload = json.loads(body)
        if not isinstance(payload, dict):
            raise CollectionFailure("CLIENT_INVALID_RESPONSE")
        return payload
    except urllib.error.HTTPError as error:
        # Do not read/log its body, URL, reason, headers, or exception text.
        error.close()
        raise CollectionFailure("CLIENT_HTTP_ERROR", error.code in TRANSIENT_HTTP,
                                error.code) from None
    except (urllib.error.URLError, TimeoutError, ConnectionError):
        raise CollectionFailure("CLIENT_NETWORK_ERROR", True) from None
    except CollectionFailure:
        raise
    except (ValueError, UnicodeError, TypeError):
        raise CollectionFailure("CLIENT_INVALID_RESPONSE") from None
    except Exception:
        raise CollectionFailure("CLIENT_UNEXPECTED_ERROR") from None


def _timestamp(value):
    if not isinstance(value, str) or len(value) > 40:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.timestamp() if parsed.tzinfo is not None else None
    except (ValueError, OverflowError, OSError):
        return None


def _credential(token):
    token = token.strip()
    if not token:
        raise CollectionFailure("CLIENT_CREDENTIAL_MISSING")
    if not token.isascii() or any(ord(c) < 33 or ord(c) > 126 for c in token):
        raise CollectionFailure("CLIENT_CREDENTIAL_INVALID")
    return token


def run_collection(token, *, opener=None, clock=time.time, sleep=time.sleep,
                   emit=print, max_slices=MAX_SLICES, scope_id=None):
    """Run against the fixed service URL; dependencies are injectable for offline tests."""
    token = _credential(token)
    opener = opener or urllib.request.build_opener(NoRedirect()).open
    run_started = clock()
    deadline = run_started + MAX_SECONDS
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}

    def pause(seconds):
        if clock() + seconds >= deadline:
            raise CollectionFailure("CLIENT_BOUNDED_LIMIT")
        sleep(seconds)

    def fetch(request, limit, label, collection=False):
        for attempt in range(MAX_ATTEMPTS):
            remaining = deadline - clock()
            if remaining <= 0:
                raise CollectionFailure("CLIENT_BOUNDED_LIMIT")
            try:
                result = _read_json(opener, request, limit, min(30, remaining))
            except CollectionFailure as error:
                http = error.http_status if error.http_status is not None else "unknown"
                emit(f"{label}: code={error.code}; http_status={http}; attempt={attempt + 1}")
                if not error.retryable or attempt + 1 == MAX_ATTEMPTS:
                    raise
            else:
                if not collection:
                    return result
                status, phase, code, run_id = safe_diagnostic(result)
                emit(f"Collection: status={status}; phase={phase}; code={code}; runId={run_id}; attempt={attempt + 1}")
                if status != "error":
                    return result
                # HTTP 200 source errors need the same bounded retry as transport errors.
                # Never trust a remote retryable flag or an arbitrary code/exception string.
                if code not in TRANSIENT_CODES or attempt + 1 == MAX_ATTEMPTS:
                    raise CollectionFailure("CLIENT_COLLECTION_FAILED")
            pause(5 * (attempt + 1))
        raise CollectionFailure("CLIENT_COLLECTION_FAILED")

    force_list = True
    for index in range(max_slices):
        query = {"scopeId": scope_id} if scope_id else {}
        if force_list:
            query["refresh"] = "full"
        path = "/internal/collect" + ("?" + urllib.parse.urlencode(query) if query else "")
        request = urllib.request.Request(
            BASE_URL + path, data=b"", method="POST",
            headers={**headers, "Authorization": "Bearer " + token},
        )
        result = fetch(request, 16384, "Collection request", collection=True)
        status, phase, _, _ = safe_diagnostic(result)
        if status == "ok":
            more = result.get("more")
            pending = result.get("pendingDetails", 0)
            if (phase not in {"list", "detail", "snapshot"} or type(more) is not bool
                    or type(pending) is not int or not 0 <= pending <= 1000
                    or (phase in {"list", "detail"} and not more)):
                raise CollectionFailure("CLIENT_INVALID_RESPONSE")
            if force_list and phase != "list":
                raise CollectionFailure("CLIENT_INVALID_RESPONSE")
            force_list = False
            emit(f"Slice {index + 1}: phase={phase}; pendingDetails={pending}")
            quality = result.get("quality")
            if phase in {"list", "snapshot"} and isinstance(quality, dict):
                safe = {key: quality[key] for key in ("raw", "eligible", "excluded", "published", "freeTuition", "openFree", "conflict", "sessionsVerified", "reminderEligible")
                        if type(quality.get(key)) is int and 0 <= quality[key] <= 1000}
                emit("Content quality: " + json.dumps(safe, sort_keys=True))
            if phase == "snapshot" and not more and not pending:
                break
        elif status != "already_running":
            raise CollectionFailure("CLIENT_COLLECTION_NOT_READY")
        pause(1)
    else:
        raise CollectionFailure("CLIENT_BOUNDED_LIMIT")

    # Public checks use no Authorization header. Bypass cached responses for freshness.
    public_headers = {**headers, "Cache-Control": "no-cache"}
    if scope_id:
        catalog = fetch(urllib.request.Request(BASE_URL + "/v2/catalog?" + urllib.parse.urlencode({"scopeId": scope_id}), headers=public_headers),
                        4 * 1024 * 1024, "Scoped catalog request")
        checked = _timestamp(catalog.get("fetchedAt"))
        if (catalog.get("schemaVersion") != 2 or catalog.get("coverageScope") != [scope_id]
                or checked is None or checked < run_started - 120 or checked > clock() + 120
                or not isinstance(catalog.get("courses"), list)):
            raise CollectionFailure("CLIENT_CATALOG_FAILED")
        ids = [c.get("id") if isinstance(c, dict) else None for c in catalog["courses"]]
        if any(not isinstance(value, str) or not value for value in ids) or len(set(ids)) != len(ids):
            raise CollectionFailure("CLIENT_CATALOG_FAILED")
        emit(f"Scoped catalog freshness verification passed: courses={len(ids)}")
        return
    health = fetch(urllib.request.Request(BASE_URL + "/v1/health", headers=public_headers),
                   65536, "Health request")
    checked = _timestamp(health.get("lastSuccess"))
    if (health.get("configured") is not True or health.get("stale") is not False
            or checked is None or checked < run_started - 120 or checked > clock() + 120):
        raise CollectionFailure("CLIENT_FRESHNESS_FAILED")
    catalog = fetch(urllib.request.Request(BASE_URL + "/v1/catalog", headers=public_headers),
                    4 * 1024 * 1024, "Catalog request")
    revision = catalog.get("revision")
    fetched = _timestamp(catalog.get("fetchedAt"))
    courses = catalog.get("courses")
    if (type(catalog.get("schemaVersion")) is not int or catalog["schemaVersion"] != 1
            or not isinstance(revision, str) or not REVISION.fullmatch(revision)
            or fetched is None or fetched < checked or fetched > clock() + 120
            or not isinstance(courses, list)):
        raise CollectionFailure("CLIENT_CATALOG_FAILED")
    ids = [c.get("id") if isinstance(c, dict) else None for c in courses]
    if any(not isinstance(value, str) or not value for value in ids) or len(set(ids)) != len(ids):
        raise CollectionFailure("CLIENT_CATALOG_FAILED")
    emit(f"Catalog refresh and freshness verification passed: revision={revision}; courses={len(courses)}")


def run_diagnostics(token, *, since="", until="", opener=None, clock=time.time,
                    sleep=time.sleep, emit=print):
    """Read bounded protected run metadata without triggering collection."""
    token = _credential(token)
    now = clock()
    query = {"limit": "100"}
    dates = {}
    for name, value in (("since", since), ("until", until)):
        if not value:
            continue
        stamp = _timestamp(value)
        if stamp is None or stamp < now - 7 * 86400 or stamp > now + 120:
            raise CollectionFailure("CLIENT_DIAGNOSTIC_QUERY_INVALID")
        query[name] = datetime.fromtimestamp(stamp, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        dates[name] = stamp
    if dates.get("since", now - 7 * 86400) >= dates.get("until", now + 120):
        raise CollectionFailure("CLIENT_DIAGNOSTIC_QUERY_INVALID")
    request = urllib.request.Request(
        BASE_URL + "/internal/diagnostics?" + urllib.parse.urlencode(query),
        headers={"Authorization": "Bearer " + token, "User-Agent": USER_AGENT,
                 "Accept": "application/json", "Cache-Control": "no-cache"},
    )
    opener = opener or urllib.request.build_opener(NoRedirect()).open
    try:
        result = _read_json(opener, request, 131072, 30)
    except CollectionFailure as error:
        if error.http_status == 404:
            raise CollectionFailure("DIAGNOSTICS_UNAVAILABLE") from None
        raise
    runs = result.get("runs")
    if (result.get("status") != "ok" or not isinstance(runs, list)
            or len(runs) > 100 or any(not isinstance(row, dict) for row in runs)):
        raise CollectionFailure("CLIENT_DIAGNOSTIC_RESPONSE_INVALID")
    for row in runs:
        outcome = row.get("outcome")
        outcome = outcome if isinstance(outcome, str) and outcome in {"ok", "error"} else "unknown"
        _, phase, code, run_id = safe_diagnostic({**row, "status": outcome})
        stamp = _timestamp(row.get("startedAt"))
        started_at = (datetime.fromtimestamp(stamp, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
                      if stamp is not None and now - 7 * 86400 <= stamp <= now + 120 else "unknown")
        requests = row.get("requests")
        requests = requests if type(requests) is int and 0 <= requests <= 1000 else "unknown"
        emit(f"Diagnostic: runId={run_id}; startedAt={started_at}; outcome={outcome}; code={code}; phase={phase}; requests={requests}")
    emit(f"Protected collection diagnostics checked: records={len(runs)}")


def main(*, environ=None, emit=print, **kwargs):
    try:
        env = os.environ if environ is None else environ
        mode = env.get("MURYOUM_OPERATION_MODE", "collect")
        token = env.get("MURYOUM_ADMIN_TOKEN", "")
        if mode == "diagnostics":
            run_diagnostics(token, since=env.get("MURYOUM_DIAGNOSTICS_SINCE", ""),
                            until=env.get("MURYOUM_DIAGNOSTICS_UNTIL", ""), emit=emit, **kwargs)
        elif mode == "collect":
            configured = env.get("MURYOUM_COLLECTION_DISTRICTS", "")
            if configured:
                districts = configured.split(",")
                if len(districts) != len(set(districts)) or any(d not in SEOUL_DISTRICTS for d in districts):
                    raise CollectionFailure("CLIENT_MODE_INVALID")
                failed = False
                for district in districts:
                    emit("Source scope: " + district)
                    try:
                        run_collection(token, scope_id=f"seoul:{district}:education", emit=emit, **kwargs)
                    except CollectionFailure as error:
                        failed = True
                        emit("Scope failed: " + district + "; code=" + error.code)
                if failed:
                    raise CollectionFailure("CLIENT_COLLECTION_FAILED")
            else:
                run_collection(token, emit=emit, **kwargs)
        else:
            raise CollectionFailure("CLIENT_MODE_INVALID")
        return 0
    except CollectionFailure as error:
        emit("Operation stopped: code=" + error.code)
    except Exception:
        # This includes invalid header construction and unexpected runtime failures.
        # No traceback, exception type/message, source response, or credential is logged.
        emit("Operation stopped: code=CLIENT_UNEXPECTED_ERROR")
    return 1


if __name__ == "__main__":
    sys.exit(main())
