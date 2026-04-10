# Transcend Consent Documentation Reference

Read these docs before beginning a triage session to understand the full context.

## Key Documentation Links

| Doc                           | URL                                                                                                         | When to Read                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Triage Guide                  | https://docs.transcend.io/docs/articles/consent-management/configuration/triage-cookies-and-dataflows-guide | Before starting any triage         |
| Debugging & Testing           | https://docs.transcend.io/docs/articles/consent-management/reference/debugging-and-testing                  | Before live site investigation     |
| Troubleshooting               | https://docs.transcend.io/docs/articles/consent-management/reference/troubleshoot-consent                   | When investigation hits issues     |
| Data Flows & Cookies Overview | https://docs.transcend.io/docs/articles/consent-management/concepts/data-flows-and-cookies                  | Background on how telemetry works  |
| Tracking Purposes             | https://docs.transcend.io/docs/articles/consent-management/concepts/tracking-purposes                       | Understanding purpose taxonomy     |
| Regional Experiences          | https://docs.transcend.io/docs/articles/consent-management/configuration/regional-experiences               | Understanding regime configuration |
| Telemetry Overview            | https://docs.transcend.io/docs/articles/consent-management/configuration/telemetry-overview                 | How trackers are discovered        |

## URL Override Parameters for Testing

Load a site with hash parameters to control consent behavior without changing
configuration. These are critical for live site investigation.

```
https://{site}/#tcm-regime={regime_name}&tcm-prompt=Hidden&log=*
```

| Parameter          | Description                     | Example                                |
| ------------------ | ------------------------------- | -------------------------------------- |
| `tcm-regime`       | Force a specific privacy regime | `GDPR+-+Standard`, `CCPA`, `No+Regime` |
| `tcm-prompt`       | Control UI behavior             | `Hidden` (suppress banner)             |
| `log`              | Enable debug logging            | `*` (all logs)                         |
| `data-report-only` | Override regulation mode        | `off` (enforce blocking)               |

### Choosing the Right Regime Override

Goal: Load the page in a state where all non-essential trackers are **allowed**
so you can observe them firing.

1. Fetch regimes with `consent_list_regimes` -- this returns real consent
   experience data including purposes, optedOutPurposes, regions, and viewState
2. Find the most permissive regime (fewest opted-out purposes, or where most
   purposes default to opted-in)
3. If no regime allows everything, use any regime and then opt in manually:

```javascript
airgap.optIn(Object.fromEntries(airgap.getRegimePurposes().map((p) => [p, true])));
```

4. Verify: `airgap.getConsent().purposes` -- all should be `true` or `"Auto"`

## Useful Console Commands

| Command                                           | Purpose                                                      |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `airgap.getConsent().purposes`                    | Current consent state per purpose                            |
| `airgap.getRegimes()`                             | Active regime(s) for this session                            |
| `airgap.getRegimePurposes()`                      | Purposes regulated under current regime                      |
| `await airgap.getPurposes('{url}')`               | What purposes a URL is classified under                      |
| `await airgap.isAllowed('{url}')`                 | Whether a URL is currently allowed                           |
| `await airgap.isCookieAllowed({name:'{name}'})`   | Whether a cookie is allowed                                  |
| `await airgap.getCookiePurposes({name:'{name}'})` | Cookie's assigned purposes                                   |
| `airgap.export().requests`                        | Quarantined requests                                         |
| `airgap.export().cookies`                         | Quarantined cookies                                          |
| `airgap.export().sentRequests`                    | Requests detected as sent (needs `data-monitoring="export"`) |
| `airgap.export().setCookies`                      | Cookies detected as set (needs `data-monitoring="export"`)   |
| `airgap.loadOptions.reportOnly`                   | Whether report-only mode is active                           |
| `airgap.version`                                  | Current airgap version                                       |

## External Research Tools

| Tool                | URL                                | Use For                        |
| ------------------- | ---------------------------------- | ------------------------------ |
| CookieDatabase.org  | https://cookiedatabase.org/        | Cookie name lookup             |
| better.fyi trackers | https://better.fyi/trackers/       | Domain-to-company lookup       |
| Ghostery TrackerDB  | https://www.ghostery.com/trackerdb | Tracker classification         |
| Cookiepedia         | https://cookiepedia.co.uk/         | Cookie purpose database        |
| BuiltWith           | https://builtwith.com/             | Identify site technology stack |
| urlscan.io          | https://urlscan.io/                | Domain/infrastructure analysis |

## MCP Tools Quick Reference

All tools auto-resolve the airgap bundle ID from the API key. You never need
to pass `airgap_bundle_id`.

### Read-only (safe to call anytime)

- `consent_list_airgap_bundles` -- get consent manager info (bundle ID, URLs, config)
- `consent_get_triage_stats` -- backlog overview (supports `show_zero_activity` filter)
- `consent_list_purposes` -- available tracking purposes
- `consent_list_regimes` -- consent experiences with regions, purposes, opted-out purposes
- `consent_list_cookies { status: "NEEDS_REVIEW" }` -- cookies needing review (paginated)
- `consent_list_cookies { status: "LIVE" }` -- approved cookies
- `consent_list_data_flows { status: "NEEDS_REVIEW" }` -- data flows needing review (paginated)
- `consent_list_data_flows { status: "LIVE" }` -- approved data flows

### Write (require user confirmation before calling)

- `consent_update_cookies` -- update individual cookies (purposes, description, status, service)
- `consent_update_data_flows` -- update individual data flows
- `consent_bulk_triage` -- bulk approve or junk multiple items at once
