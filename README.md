# Muryoum catalog operations

This repository contains the public deployment workflow for the Muryoum public-course catalog. It contains no Android source, user data, source API credentials, or signing material.

The hourly workflow calls the dedicated authenticated collection endpoint and checks catalog freshness. It uses a standard GitHub-hosted runner without artifact or cache uploads. Collection remains disabled until the production data contract has been validated.

GitHub schedules can be delayed or disabled after repository inactivity. Check Actions and the service health endpoint during release/maintenance. A scheduled workflow does not promise immediate detection of announcements. The Android app's reminders are local reminders for courses explicitly selected by the user.

- Site: https://muryoum.choimaest.workers.dev
- Health: https://muryoum.choimaest.workers.dev/v1/health
- Enable after validation: set repository variable `COLLECTION_ENABLED=true` and secret `MURYOUM_ADMIN_TOKEN`.
- Cloudflare Workers Free account cron quota was already fully allocated to other applications; those jobs remain unchanged.
