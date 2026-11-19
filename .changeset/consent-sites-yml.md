---
"@transcend-io/sdk": minor
"@transcend-io/cli": minor
---

Add a `consent-sites` section to `transcend.yml`. You can now manage the hosts that Airgap discovers, including their description, owners, teams, and attributes, with `transcend inventory pull --resources consentSites` and `transcend inventory push`. The existing `consent-manager.domains` list is unchanged. Pulling needs the View Consent Manager scope and pushing needs Manage Consent Manager.
