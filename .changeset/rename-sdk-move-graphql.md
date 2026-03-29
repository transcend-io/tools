---
'@transcend-io/sdk': minor
'@transcend-io/utils': minor
'@transcend-io/cli': minor
---

Rename @transcend-io/core to @transcend-io/sdk, make utils and sdk public, move GraphQL/REST API foundation and preference management fetchers into SDK

- Rename packages/core to packages/sdk (@transcend-io/sdk)
- Make @transcend-io/utils and @transcend-io/sdk publishable (remove private flag)
- Add api/ module to SDK: buildTranscendGraphQLClient, makeGraphQLRequest, createSombraGotInstance with Logger DI
- Add preference-management/ module to SDK: fetchAllPurposes, fetchAllPreferenceTopics, fetchAllPurposesAndPreferences, fetchAllIdentifiers, createPreferenceAccessTokens
- Move bluebird map/mapSeries wrapper from CLI to @transcend-io/utils
