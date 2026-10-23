from datetime import datetime, timezone
import io
import json
import unittest
import urllib.error
from unittest.mock import patch

from scripts import collect_catalog as collector

NOW = datetime(2026, 10, 23, 0, 0, tzinfo=timezone.utc).timestamp()
STAMP = "2026-10-23T00:00:00.000Z"
TOKEN = "TEST_ONLY_SECRET_MUST_NEVER_APPEAR"
RUN_ID = "d13edbaa-ae60-4b0b-b344-54100c53a402"


def list_ok(**fields):
    return {"status": "ok", "phase": "list", "more": True, **fields}


def snapshot_ok(**fields):
    return {"status": "ok", "phase": "snapshot", "more": False,
            "pendingDetails": 0, **fields}


def health_ok(**fields):
    return {"configured": True, "stale": False, "lastSuccess": STAMP, **fields}


def catalog_ok(**fields):
    return {"schemaVersion": 1, "revision": "0123456789abcdefabcd", "fetchedAt": STAMP,
            "courses": [{"id": "seoul:S1", "title": TOKEN}], **fields}


class ScriptedHTTP:
    """Every response is local; these tests cannot contact the production service."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []

    def __call__(self, request, timeout):
        self.requests.append(request)
        if not self.responses:
            raise AssertionError("Unexpected request")
        value = self.responses.pop(0)
        if isinstance(value, Exception):
            raise value
        return io.BytesIO(value if isinstance(value, bytes) else json.dumps(value).encode())


class CollectionTests(unittest.TestCase):
    def test_scoped_catalog_checks_coverage_and_never_sends_admin_token_to_public_api(self):
        scope='seoul:관악구:education'
        catalog=catalog_ok(schemaVersion=2,coverageScope=[scope])
        http=ScriptedHTTP([list_ok(),snapshot_ok(),catalog])
        collector.run_collection(TOKEN,scope_id=scope,opener=http,clock=lambda:NOW,sleep=lambda _:None,emit=lambda _:None)
        self.assertIn('scopeId=',http.requests[0].full_url)
        self.assertIsNone(http.requests[-1].get_header('Authorization'))
        http=ScriptedHTTP([list_ok(),snapshot_ok(),{**catalog,'coverageScope':['seoul:다른구:education']}])
        with self.assertRaises(collector.CollectionFailure):
            collector.run_collection(TOKEN,scope_id=scope,opener=http,clock=lambda:NOW,sleep=lambda _:None,emit=lambda _:None)

    def test_one_failed_scope_does_not_skip_healthy_districts(self):
        calls=[]
        def run(token, **kwargs):
            calls.append(kwargs['scope_id'])
            if len(calls)==1:
                raise collector.CollectionFailure('CLIENT_COLLECTION_FAILED')
        with patch.object(collector,'run_collection',side_effect=run):
            result=collector.main(environ={'MURYOUM_ADMIN_TOKEN':TOKEN,'MURYOUM_COLLECTION_DISTRICTS':'관악구,금천구,서초구,동작구'},emit=lambda line:None)
        self.assertEqual(result,1)
        self.assertEqual(len(calls),4)

    def run_case(self, responses, *, token=TOKEN, mode="collect", since="", until="", **kwargs):
        http = ScriptedHTTP(responses)
        lines, sleeps = [], []
        code = collector.main(environ={"MURYOUM_ADMIN_TOKEN": token,
                                      "MURYOUM_OPERATION_MODE": mode,
                                      "MURYOUM_DIAGNOSTICS_SINCE": since,
                                      "MURYOUM_DIAGNOSTICS_UNTIL": until}, opener=http,
                              clock=lambda: NOW, sleep=sleeps.append, emit=lines.append,
                              **kwargs)
        output = "\n".join(lines)
        self.assertNotIn(TOKEN, output)
        self.assertNotIn("Traceback", output)
        return code, output, http.requests, sleeps

    def test_existing_worker_success_and_public_checks_have_no_credential(self):
        code, output, requests, sleeps = self.run_case([
            list_ok(), {"status": "ok", "phase": "detail", "more": True},
            snapshot_ok(), health_ok(), catalog_ok(),
        ])
        self.assertEqual(code, 0)
        self.assertIn("freshness verification passed", output)
        self.assertIn("courses=1", output)
        self.assertTrue(requests[0].full_url.endswith("?refresh=full"))
        self.assertNotIn("?refresh", requests[1].full_url)
        for request in requests[:3]:
            self.assertEqual(request.get_method(), "POST")
            self.assertEqual(request.get_header("Authorization"), "Bearer " + TOKEN)
        for request in requests[3:]:
            self.assertEqual(request.get_method(), "GET")
            self.assertIsNone(request.get_header("Authorization"))
            self.assertEqual(request.get_header("Cache-control"), "no-cache")
        self.assertEqual(sleeps, [1, 1])

    def test_first_full_refresh_is_retained_after_lock_contention(self):
        code, _, requests, _ = self.run_case([
            {"status": "already_running"}, list_ok(), snapshot_ok(), health_ok(), catalog_ok(),
        ])
        self.assertEqual(code, 0)
        self.assertTrue(all(r.full_url.endswith("?refresh=full") for r in requests[:2]))

    def test_http_200_transient_error_retries_and_records_safe_run_id(self):
        code, output, requests, sleeps = self.run_case([
            {"status": "error", "code": "SEOUL_NETWORK", "phase": "list", "runId": RUN_ID},
            list_ok(), snapshot_ok(), health_ok(), catalog_ok(),
        ])
        self.assertEqual(code, 0)
        self.assertIn("code=SEOUL_NETWORK", output)
        self.assertIn("runId=" + RUN_ID, output)
        self.assertEqual(requests[0].full_url, requests[1].full_url)
        self.assertEqual(sleeps, [5, 1])

    def test_validation_error_is_not_retried_even_if_server_says_retryable(self):
        code, output, requests, sleeps = self.run_case([
            {"status": "error", "code": "SOURCE_FILTER_MISMATCH", "phase": "list",
             "retryable": True, "message": TOKEN},
        ])
        self.assertEqual(code, 1)
        self.assertIn("code=SOURCE_FILTER_MISMATCH", output)
        self.assertEqual(len(requests), 1)
        self.assertEqual(sleeps, [])

    def test_transient_budget_is_three_attempts(self):
        code, output, requests, sleeps = self.run_case([
            {"status": "error", "code": "SEOUL_HTTP_503"},
        ] * 3)
        self.assertEqual(code, 1)
        self.assertIn("CLIENT_COLLECTION_FAILED", output)
        self.assertEqual(len(requests), 3)
        self.assertEqual(sleeps, [5, 10])

    def test_unknown_fields_and_codes_cannot_be_used_to_log_secrets(self):
        for result in (
            {"status": "error", "code": TOKEN, "phase": TOKEN, "runId": TOKEN, "retryable": True},
            {"status": TOKEN, "code": TOKEN, "phase": TOKEN, "runId": TOKEN},
            {"status": [], "code": {}, "phase": {}, "runId": []},
            {"status": "ok", "phase": TOKEN, "more": False},
        ):
            with self.subTest(result=result):
                code, output, requests, _ = self.run_case([result])
                self.assertEqual(code, 1)
                self.assertEqual(len(requests), 1)
                self.assertIn("phase=unknown", output)

    def test_http_error_retries_without_emitting_url_headers_or_body(self):
        error = urllib.error.HTTPError("https://example.test/" + TOKEN, 503, TOKEN,
                                      {"X-Secret": TOKEN}, io.BytesIO(TOKEN.encode()))
        code, output, _, sleeps = self.run_case([
            error, list_ok(), snapshot_ok(), health_ok(), catalog_ok(),
        ])
        self.assertEqual(code, 0)
        self.assertIn("http_status=503", output)
        self.assertEqual(sleeps, [5, 1])

    def test_http_credential_error_is_not_retried(self):
        error = urllib.error.HTTPError("https://example.test/" + TOKEN, 401, TOKEN,
                                      {}, io.BytesIO(TOKEN.encode()))
        code, output, requests, _ = self.run_case([error])
        self.assertEqual(code, 1)
        self.assertIn("http_status=401", output)
        self.assertEqual(len(requests), 1)

    def test_network_error_is_bounded_and_sanitized(self):
        code, output, requests, sleeps = self.run_case([
            urllib.error.URLError(TOKEN), TimeoutError(TOKEN), ConnectionError(TOKEN),
        ])
        self.assertEqual(code, 1)
        self.assertIn("CLIENT_NETWORK_ERROR", output)
        self.assertEqual(len(requests), 3)
        self.assertEqual(sleeps, [5, 10])

    def test_invalid_response_and_exceptions_never_expose_the_message(self):
        for response in (TOKEN.encode(), [TOKEN], ValueError(TOKEN), RuntimeError(TOKEN),
                         b"x" * 16385):
            with self.subTest(response_type=type(response).__name__):
                code, _, requests, _ = self.run_case([response])
                self.assertEqual(code, 1)
                self.assertEqual(len(requests), 1)

    def test_invalid_credentials_fail_without_a_request(self):
        for token in ("", "  ", TOKEN + "\nInjected: value", TOKEN + "\x00"):
            with self.subTest(length=len(token)):
                code, _, requests, _ = self.run_case([], token=token)
                self.assertEqual(code, 1)
                self.assertEqual(requests, [])

    def test_request_construction_exception_is_sanitized(self):
        with patch.object(collector.urllib.request, "Request", side_effect=ValueError(TOKEN)):
            code, output, requests, _ = self.run_case([])
        self.assertEqual(code, 1)
        self.assertIn("CLIENT_UNEXPECTED_ERROR", output)
        self.assertEqual(requests, [])

    def test_not_configured_and_unknown_status_fail(self):
        for response in ({"status": "not_configured"}, {"status": "new_status"}):
            code, output, requests, _ = self.run_case([response])
            self.assertEqual(code, 1)
            self.assertIn("CLIENT_COLLECTION_NOT_READY", output)
            self.assertEqual(len(requests), 1)

    def test_malformed_success_cannot_skip_collection(self):
        for result in (snapshot_ok(), list_ok(more=False), list_ok(pendingDetails=True),
                       list_ok(more="false"), list_ok(pendingDetails=-1)):
            code, output, requests, _ = self.run_case([result])
            self.assertEqual(code, 1)
            self.assertIn("CLIENT_INVALID_RESPONSE", output)
            self.assertEqual(len(requests), 1)

    def test_health_must_confirm_this_run_and_a_real_boolean_state(self):
        for health in (
            health_ok(configured=False), health_ok(stale=True), health_ok(stale=0),
            health_ok(lastSuccess="2026-10-22T23:57:59Z"),
            health_ok(lastSuccess="2026-10-23T00:02:01Z"),
            health_ok(lastSuccess="2026-10-23T00:00:00"), health_ok(lastSuccess=TOKEN),
        ):
            with self.subTest(health=health):
                code, output, requests, _ = self.run_case([list_ok(), snapshot_ok(), health])
                self.assertEqual(code, 1)
                self.assertIn("CLIENT_FRESHNESS_FAILED", output)
                self.assertEqual(len(requests), 3)

    def test_public_catalog_must_match_freshness_and_schema(self):
        for catalog in (
            catalog_ok(fetchedAt="2026-10-22T23:59:59Z"), catalog_ok(revision=TOKEN),
            catalog_ok(schemaVersion=True), catalog_ok(courses=[{"id": "x"}, {"id": "x"}]),
            catalog_ok(courses=[{"id": []}]), catalog_ok(courses=TOKEN),
        ):
            with self.subTest(catalog=catalog):
                code, output, _, _ = self.run_case([list_ok(), snapshot_ok(), health_ok(), catalog])
                self.assertEqual(code, 1)
                self.assertIn("CLIENT_CATALOG_FAILED", output)

    def test_empty_catalog_is_valid_when_the_source_has_no_eligible_courses(self):
        code, output, _, _ = self.run_case([
            list_ok(), snapshot_ok(), health_ok(), catalog_ok(courses=[]),
        ])
        self.assertEqual(code, 0)
        self.assertIn("courses=0", output)

    def test_health_network_failure_can_retry_without_admin_header(self):
        code, _, requests, sleeps = self.run_case([
            list_ok(), snapshot_ok(), TimeoutError(TOKEN), health_ok(), catalog_ok(),
        ])
        self.assertEqual(code, 0)
        self.assertTrue(all(r.get_header("Authorization") is None for r in requests[2:]))
        self.assertEqual(sleeps, [1, 5])

    def test_slice_limit_does_not_report_a_false_success(self):
        code, output, requests, _ = self.run_case(
            [{"status": "already_running"}] * 3, max_slices=3)
        self.assertEqual(code, 1)
        self.assertIn("CLIENT_BOUNDED_LIMIT", output)
        self.assertEqual(len(requests), 3)

    def test_deadline_ends_before_another_request(self):
        lines = []
        http = ScriptedHTTP([])
        code = collector.main(environ={"MURYOUM_ADMIN_TOKEN": TOKEN}, opener=http,
                              clock=iter([NOW, NOW + collector.MAX_SECONDS + 1]).__next__,
                              emit=lines.append)
        self.assertEqual(code, 1)
        self.assertIn("CLIENT_BOUNDED_LIMIT", "\n".join(lines))
        self.assertEqual(http.requests, [])

    def test_authentication_is_never_forwarded_via_redirect(self):
        self.assertIsNone(collector.NoRedirect().redirect_request(
            None, None, 302, TOKEN, {}, "https://elsewhere.test/" + TOKEN))

    def test_diagnostics_only_reads_safe_protected_metadata(self):
        code, output, requests, _ = self.run_case([{
            "status": "ok", "runs": [{"runId": RUN_ID, "startedAt": STAMP,
            "outcome": "error", "code": "SEOUL_NETWORK", "phase": "list", "requests": 1,
            "message": TOKEN, "rawResponse": TOKEN}],
        }], mode="diagnostics", since="2026-10-22T07:36:00Z", until="2026-10-22T07:39:00Z")
        self.assertEqual(code, 0)
        self.assertIn("code=SEOUL_NETWORK", output)
        self.assertIn("records=1", output)
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].get_method(), "GET")
        self.assertIn("/internal/diagnostics?", requests[0].full_url)
        self.assertNotIn("/internal/collect", requests[0].full_url)
        self.assertEqual(requests[0].get_header("Authorization"), "Bearer " + TOKEN)

    def test_diagnostics_unavailable_on_old_worker_does_not_collect(self):
        error = urllib.error.HTTPError("https://example.test/" + TOKEN, 404, TOKEN,
                                      {}, io.BytesIO(TOKEN.encode()))
        code, output, requests, _ = self.run_case([error], mode="diagnostics")
        self.assertEqual(code, 1)
        self.assertIn("DIAGNOSTICS_UNAVAILABLE", output)
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].get_method(), "GET")

    def test_diagnostic_metadata_is_allowlisted_again_on_the_client(self):
        code, output, _, _ = self.run_case([{"status": "ok", "runs": [{
            "runId": TOKEN, "startedAt": TOKEN, "outcome": TOKEN,
            "code": TOKEN, "phase": TOKEN, "requests": TOKEN,
        }]}], mode="diagnostics")
        self.assertEqual(code, 0)
        self.assertIn("runId=unknown", output)
        self.assertIn("code=COLLECTION_FAILED", output)
        self.assertIn("requests=unknown", output)

    def test_invalid_diagnostic_query_or_mode_never_sends_requests(self):
        for values in (
            {"since": TOKEN}, {"since": "2026-10-10T00:00:00Z"},
            {"since": STAMP, "until": "2026-10-22T00:00:00Z"},
            {"until": "2026-10-30T00:00:00Z"}, {"mode": TOKEN},
        ):
            code, _, requests, _ = self.run_case([], **{"mode": "diagnostics", **values})
            self.assertEqual(code, 1)
            self.assertEqual(requests, [])

    def test_invalid_diagnostic_shape_fails_safely(self):
        for body in ({"status": "error", "code": TOKEN}, {"status": "ok", "runs": [TOKEN]},
                     {"status": "ok", "runs": [{}] * 101}):
            code, output, _, _ = self.run_case([body], mode="diagnostics")
            self.assertEqual(code, 1)
            self.assertIn("CLIENT_DIAGNOSTIC_RESPONSE_INVALID", output)


if __name__ == "__main__":
    unittest.main()
