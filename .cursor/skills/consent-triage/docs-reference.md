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

## Additional Reference

For detailed investigation methodology, research steps, console commands,
URL override parameters, and classification guidance, use the MCP prompts
and resources registered in the consent server:

- `consent-inspect-site` prompt -- URL overrides, console commands, JS evaluation snippets
- `consent-research-tracker` prompt -- CMP databases, research methodology

MCP resources fetch live content from the docs links above with static fallback.
Use `FetchMcpResource` to pull any of them into context.
