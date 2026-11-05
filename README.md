# Muryoum catalog operations

This repository contains the public deployment workflow for the Muryoum public-course catalog. It contains no Android source, user data, source API credentials, or signing material.

The six-hourly Seoul workflow calls the dedicated authenticated collection endpoint and verifies all publication receipts after collection. It uses the existing GitHub-hosted runner and retains bounded, credential-free receipts for seven days. Collection remains gated by the repository enable variable.

## Execution and tests

- Pull requests run offline regression tests only. They receive no collection secret and cannot start collection or read protected diagnostics.
- The six-hourly schedule and an explicit `workflow_dispatch` with mode `collect` run collection after tests pass. Actual collection also requires `COLLECTION_ENABLED=true`. Pushes run regression tests only, avoiding extra full collections during releases.
- Workflow dispatch mode `diagnostics` reads protected run metadata only. It does not refresh, remove, or publish courses. Both production jobs are restricted to `main`.
- Checkout is pinned to an immutable commit and does not persist its GitHub credential.

Run the same tests locally with Python 3.10 or newer; no third-party dependencies or service credentials are needed:

```sh
python3 -m unittest discover -s tests -v
```

`scripts/collect_catalog.py` is the single collection client. When invoked normally it performs a real production collection using the existing `MURYOUM_ADMIN_TOKEN` environment variable. Never put the token on the command line or in a committed file. Tests inject local responses and never call the service.

## Failure handling and public verification

As of 2026-11-05, Seoul runs at 03:17, 09:17, 15:17 and 21:17 KST. Ordinary unchanged details are checked every 24 hours; new, changed, and important details are checked in the applicable collection round. List staleness uses an eight-hour threshold; detailed evidence retains its separate expiry. A successful list fetch does not renew detailed evidence. Nationwide metadata is checked daily at 10:43 KST with Monday full reconciliation. Library metadata is checked Monday at 10:13 KST, with full reconciliation on the first Monday of the month. These are reductions in specific work, not guarantees of a total cost reduction. See `NATIONAL_COLLECTION.md`.

Account usage at 70% is a warning; at 85%, ordinary detail checks and national full collection are deferred. Missing or over-two-hour-old telemetry also defers optional work. The current telemetry task requires the existing logged-in Windows session; public data and important checks remain available while telemetry is unavailable. The daily quota resets at 09:00 KST, and fresh telemetry is required to resume optional work.

The client prints only allowlisted status, phase, and error codes; UUID run identifiers; bounded numeric counts; and a validated catalog revision. It never prints response bodies, upstream URLs, headers, arbitrary exception messages, or unknown code strings. The Seoul source API puts its key in the URL path, so source URLs must not be logged. Redirects are rejected to prevent forwarding the administration token to another URL. Public health and catalog requests carry no administration token.

An HTTP 200 response can still contain `status: error`. Such a response now receives the same bounded retry policy as transient transport failures: three total attempts, with five- and ten-second delays. The client retries only its own explicit transient-code allowlist, regardless of a remote `retryable` flag. Network failures, selected temporary HTTP statuses, and Seoul `ERROR-500`/`ERROR-600` are transient. Configuration, source shape, ID, scope, and filter-validation failures stop immediately. The complete allowlists are `SOURCE_CODES` and `TRANSIENT_CODES` in the client; unknown codes are reported as `COLLECTION_FAILED`.

Each district run forces a fresh source list, including after initial lock contention. At most 120 slices and seven minutes are allowed per district. All 25 Seoul districts are split into five independent groups of five, with at most two groups running concurrently and a 40-minute timeout per group. A failed district does not skip the remaining districts. The workflow serializes collection through public verification, so a newer scheduled/manual run cannot replace the receipt being verified. Diagnostics and regression-only runs do not hold that lock. A workflow failure is not itself proof that the published catalog is unchanged; preservation is verified by Worker regression tests and public snapshot comparisons.

Success requires all of the following:

1. Collection reaches the snapshot phase and returns a validated publication receipt for every district.
2. The aggregate `/v2/catalog` passes schema, scope, coverage and unique-ID checks.
3. Every district's revision, source confirmation time, public count and sorted-ID hash match its receipt.

Only older publication metadata is retried: once at eight minutes after the last publication, using a public GET with no collection or admin credential. Persistent delay fails with `PUBLICATION_NOT_VISIBLE`. Structural/content errors fail immediately. Logs contain the failed condition and bounded comparison evidence, never raw source payloads. A verified empty scope is valid.

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
