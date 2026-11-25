---
'@transcend-io/sdk': patch
---

Push the consent manager `unknownCookiePolicy` when it is set on its own, and warn when a purpose sets `default-consent`, which the API ignores.
