# Muryoum catalog operations

This repository contains the public deployment workflow for the Muryoum public-course catalog. It contains no Android source, user data, source API credentials, or signing material.

The hourly workflow calls the dedicated authenticated collection endpoint and checks catalog freshness. It uses a standard GitHub-hosted runner without artifact or cache uploads. Collection remains disabled until the production data contract has been validated.

## Execution and tests

- Pull requests run offline regression tests only. They receive no collection secret and cannot start collection or read protected diagnostics.
- The hourly schedule, an explicit `workflow_dispatch` with mode `collect`, and relevant changes pushed to `main` run collection after tests pass. Actual collection also requires `COLLECTION_ENABLED=true`.
- Workflow dispatch mode `diagnostics` reads protected run metadata only. It does not refresh, remove, or publish courses. Both production jobs are restricted to `main`.
- Checkout is pinned to an immutable commit and does not persist its GitHub credential.

Run the same tests locally with Python 3.10 or newer; no third-party dependencies or service credentials are needed:

```sh
python3 -m unittest discover -s tests -v
```

`scripts/collect_catalog.py` is the single collection client. When invoked normally it performs a real production collection using the existing `MURYOUM_ADMIN_TOKEN` environment variable. Never put the token on the command line or in a committed file. Tests inject local responses and never call the service.

## Failure handling and public verification

The client prints only allowlisted status, phase, and error codes; UUID run identifiers; bounded numeric counts; and a validated catalog revision. It never prints response bodies, upstream URLs, headers, arbitrary exception messages, or unknown code strings. The Seoul source API puts its key in the URL path, so source URLs must not be logged. Redirects are rejected to prevent forwarding the administration token to another URL. Public health and catalog requests carry no administration token.

An HTTP 200 response can still contain `status: error`. Such a response now receives the same bounded retry policy as transient transport failures: three total attempts, with five- and ten-second delays. The client retries only its own explicit transient-code allowlist, regardless of a remote `retryable` flag. Network failures, selected temporary HTTP statuses, and Seoul `ERROR-500`/`ERROR-600` are transient. Configuration, source shape, ID, scope, and filter-validation failures stop immediately. The complete allowlists are `SOURCE_CODES` and `TRANSIENT_CODES` in the client; unknown codes are reported as `COLLECTION_FAILED`.

Each run forces a fresh source list, including after initial lock contention. At most 120 slices and seven minutes are allowed, within the workflow's eight-minute collection-job timeout. This accommodates the current maximum of 100 validated source rows plus list/publication steps. A workflow failure is not itself proof that the published catalog is unchanged; preservation is verified by Worker regression tests and public snapshot comparisons.

Success requires all of the following:

1. Collection reaches the snapshot phase with no pending details.
2. `/v1/health` reports configured, not stale, and a valid `lastSuccess` no earlier than two minutes before this run.
3. `/v1/catalog` returns schema version 1, a valid revision, a timestamp at least as recent as the checked health state, and a list without missing or duplicate course IDs.

An empty catalog can be legitimate when the official source has no eligible courses; it is not replaced with invented content. Existing source validation and public API URLs remain the publishing authority.

## Diagnosing a past collection failure

After the Worker version providing `/internal/diagnostics` is deployed, select **Run workflow → mode: diagnostics**. Optionally set `since` and `until` to UTC ISO times within the last seven days. For the 2026-10-22 16:37 KST incident, use:

```text
since: 2026-10-22T07:36:00Z
until: 2026-10-22T07:39:00Z
```

The Worker retains run metadata for seven days. A query returns at most 100 records; narrow the time window when more records may exist. The workflow outputs only a validated run UUID, timestamp, outcome, allowlisted code and phase, and bounded request count. Older records may have no phase. The old Worker counted source requests only after a successful response, so a historical `requests=0` does not prove that no request was attempted.

An older Worker without the protected endpoint returns the fixed `DIAGNOSTICS_UNAVAILABLE` failure. This does not change collection behavior and must not be interpreted as an empty diagnostic history. No raw D1 values, source payloads, credentials, or exception text should be added to workflow logs to work around it.

GitHub schedules can be delayed or disabled after repository inactivity. Check Actions and the service health endpoint during release/maintenance. A scheduled workflow does not promise immediate detection of announcements. The Android app's reminders are local reminders for courses explicitly selected by the user.

- Site: https://muryoum.choimaest.workers.dev
- Health: https://muryoum.choimaest.workers.dev/v1/health
- Enable after validation: set repository variable `COLLECTION_ENABLED=true` and secret `MURYOUM_ADMIN_TOKEN`.
- Cloudflare Workers Free account cron quota was already fully allocated to other applications; those jobs remain unchanged.
