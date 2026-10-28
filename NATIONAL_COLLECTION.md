# Nationwide official collection

`scripts/collect-national.mjs` is generated from the Muryoum backend source at commit `1159832`. Its header records the SHA-256 of the normalization, venue matching and collection sources. Rebuild from the application repository with `node backend/scripts/bundle-national.mjs` while working in `backend` (command there: `node scripts/bundle-national.mjs`), then copy `backend/dist/collect-national.mjs` here. Do not edit the generated bundle manually.

The workflow reads all pages of the official public datasets 15013110 and 15013109, validates completeness and current course dates, stages batches in the Muryoum API, and publishes only after the complete count is confirmed. National dates are not claims of live registration availability and do not create time-specific alarms. Only exact education-address and institution matches receive library coordinates. No location is inferred from a regional center.

The daily schedule is 09:43 KST, after the free D1 daily quota resets at 09:00 KST. It runs only when `NATIONAL_COLLECTION_ENABLED=true`; enable after production validation. The existing repository secret `MURYOUM_ADMIN_TOKEN` is sent only to the fixed Muryoum origin with redirects disabled. No public data API key is required for these official downloadable datasets. The existing Seoul collection remains independent.

After publication the backend writes an atomic read snapshot to the free Muryoum KV namespace. Public search and saved-course updates do not read D1. D1 collection still has its free limits; a failed collection preserves the last verified public snapshot. Seoul retention cleanup now receives a started_at index before collection, preventing repeated scans of seven days of run history. User instruction: keep the free plan; do not upgrade billing.

Verification on 2026-10-28: full official snapshot 28,635 rows; 4,845 accepted courses, 1,976 tuition-free, 200 official coordinate matches. These are not counts of open registration. Bundle execution and source normalization returned the same counts. Existing Seoul orchestration tests: 30 PASS. Backend contract tests: 42 PASS.
