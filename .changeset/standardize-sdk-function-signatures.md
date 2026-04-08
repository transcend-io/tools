---
'@transcend-io/sdk': major
---

Standardize SDK function signatures to follow `(client, options)` convention

BREAKING CHANGES:

- `fetchRequestDataSilosCount`, `fetchRequestDataSilos`, `fetchRequestDataSilo`: collapse separate filter + options params into single `options: { logger, filterBy? }`
- `fetchRequestFilesForRequest`: collapse 4 positional params into `(client, options: { logger, pageSize?, filterBy })`
- `fetchAllCookies`, `fetchAllDataFlows`: move `status` param into `options.filterBy.status`
- `updateDataFlows`, `createDataFlows`, `syncDataFlows`: move `classifyService` boolean into options object
- `loginUser`, `assumeRole`: separate logger from domain data into `(client, credentials, { logger })`
- `fetchAllTemplates`: move `title` filter into `options.filterBy.title`
- `fetchPromptsWithVariables`: move `promptTitles`/`promptIds` into `options.filterBy.titles`/`options.filterBy.ids`
- `fetchAllApiKeys`: move `titles` filter into `options.filterBy.titles`
- `fetchApiKeys`: move `client` to first param, collapse `apiKeyInputs`/`fetchAll` into options
