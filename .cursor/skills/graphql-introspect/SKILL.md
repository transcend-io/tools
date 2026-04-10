---
name: graphql-introspect
description: >-
  Validate and audit GraphQL queries against the live Transcend API schema.
  Use when adding or modifying GQL definitions in the SDK, when MCP tools fail
  with GRAPHQL_VALIDATION_FAILED errors, or when auditing schema drift.
---

# GraphQL Schema Validation

Validate GraphQL queries against the live Transcend API schema using the
`graphql_introspect` MCP tool. This tool sends queries to the API and reports
schema validation errors without executing them.

## When to Use

- Before adding new fields to GQL query/mutation strings
- Before adding new arguments to existing queries
- When an MCP tool call fails with `GRAPHQL_VALIDATION_FAILED`
- When auditing existing GQL definitions for schema drift
- When extending TypeScript response interfaces with new fields

## The Tool

`graphql_introspect` is registered on the **transcend-admin** MCP server
(`project-0-tools-transcend-admin`). It accepts a `query` string and optional
`variables`, sends them to the live API, and returns structured validation
results.

### Parameters

| Parameter   | Type   | Description                                        |
| ----------- | ------ | -------------------------------------------------- |
| `query`     | string | The GraphQL query/mutation string to validate      |
| `variables` | object | Optional dummy variables for parameterized queries |

### Response Shape

```json
{
  "valid": true | false,
  "validationErrors": [{ "message": "...", "locations": [...] }],
  "executionErrors": ["..."],
  "note": "..."
}
```

- `valid: false` + `validationErrors` = schema mismatch (fields/args/types wrong)
- `valid: true` + `executionErrors` = schema is fine, runtime errors from dummy vars
- `valid: true` + `note` = everything passed

## Validation Workflow

### 1. Validate a Single Query

Send the exact query string from the codebase:

```
graphql_introspect {
  query: "query Test($input: AirgapBundleInput!, $first: Int!) { dataFlows(input: $input, first: $first, offset: 0) { totalCount nodes { id value } } }"
}
```

If `valid: false`, the `validationErrors` will say exactly what's wrong, e.g.:

- `Cannot query field "pageInfo" on type "DataFlowsPayload"`
- `Unknown argument "filterBy" on field "Query.cookieStats"`

### 2. Check if a Field Exists

To check whether a specific field exists on a type, include it in a minimal
query and see if validation passes:

```
graphql_introspect {
  query: "query Test($input: AirgapBundleInput!) { cookieStats(input: $input) { liveCount needReviewCount junkCount newFieldName } }"
}
```

### 3. Check if an Argument Exists

```
graphql_introspect {
  query: "query Test($input: AirgapBundleInput!, $filterBy: CookiesFiltersInput) { cookieStats(input: $input, filterBy: $filterBy) { liveCount } }"
}
```

## Extending GQL Definitions

When adding new fields or arguments to the SDK's GraphQL definitions, follow
this sequence:

### Step 1: Validate the New Field/Argument

Use `graphql_introspect` to confirm the field or argument exists in the live
schema before writing any code.

### Step 2: Update the GQL String

Edit the query/mutation constant in `packages/sdk/src/consent/gqls/`. Add the
new field to the selection set or the new argument to the variable definitions.

### Step 3: Update the TypeScript Interface

Add the corresponding property to the response interface in the same file.
Every property must have a `/** JSDoc */` comment per project rules.

### Step 4: Update the Tool Handler

If the new field is user-facing, update the MCP tool handler in
`packages/mcp/mcp-server-consent/src/tools/` to expose it.

### Step 5: Build and Test

```bash
pnpm run --dir packages/sdk build
pnpm run --dir packages/mcp/mcp-server-consent build
pnpm run --dir packages/mcp/mcp-server-consent test
```

## Full Audit Workflow

To audit all GQL definitions for schema drift:

1. Read each file in `packages/sdk/src/consent/gqls/`
2. Extract each `gql` tagged template string
3. Send each to `graphql_introspect` (batch in parallel where possible)
4. Collect any `valid: false` results
5. Fix the GQL strings and TypeScript interfaces
6. Rebuild and re-test

### Files to Audit

| File                       | Queries/Mutations                                                           |
| -------------------------- | --------------------------------------------------------------------------- |
| `cookies.ts`               | `COOKIES`, `UPDATE_OR_CREATE_COOKIES`, `DELETE_COOKIES`                     |
| `dataFlows.ts`             | `DATA_FLOWS`, `CREATE_DATA_FLOWS`, `UPDATE_DATA_FLOWS`, `DELETE_DATA_FLOWS` |
| `experiences.ts`           | `EXPERIENCES`, `UPDATE_CONSENT_EXPERIENCE`, `CREATE_CONSENT_EXPERIENCE`     |
| `purposes.ts`              | `PURPOSES`                                                                  |
| `stats.ts`                 | `COOKIE_STATS`, `DATA_FLOW_STATS`                                           |
| `partitions.ts`            | `CONSENT_PARTITIONS`, `CREATE_CONSENT_PARTITION`                            |
| `consentManager.ts`        | `FETCH_CONSENT_MANAGER`, `FETCH_CONSENT_MANAGER_ID`, etc.                   |
| `consentManagerMetrics.ts` | `CONSENT_MANAGER_ANALYTICS_DATA`                                            |
| `policy.ts`                | `POLICIES`, `UPDATE_POLICIES`                                               |
| `privacyCenter.ts`         | `PRIVACY_CENTER`, `FETCH_PRIVACY_CENTER_ID`, etc.                           |
| `processingPurpose.ts`     | `PROCESSING_PURPOSE_SUB_CATEGORIES`, etc.                                   |

## Key Directories

- GQL definitions: `packages/sdk/src/consent/gqls/`
- MCP tool handlers: `packages/mcp/mcp-server-consent/src/tools/`
- GraphQL client: `packages/mcp/mcp-server-core/src/clients/graphql/base.ts`
