# @transcend-io/mcp

## 0.15.8

### Patch Changes

- befa05d: Fix for linter

## 0.15.7

### Patch Changes

- ef34d80: Decouple `destructiveHint` from server confirmation gates so consequential
  consent writes can require approval without marking them destructive to hosts.

  Gate `consent_set_preferences`, `preferences_upsert`, and
  `preferences_append_identifiers` behind human confirmation while keeping
  `destructiveHint: false`.

- Updated dependencies [ef34d80]
  - @transcend-io/mcp-server-base@1.7.3
  - @transcend-io/mcp-server-consent@0.9.2
  - @transcend-io/mcp-server-preferences@0.6.6
  - @transcend-io/mcp-server-admin@0.6.6
  - @transcend-io/mcp-server-assessment@0.5.26
  - @transcend-io/mcp-server-discovery@0.5.26
  - @transcend-io/mcp-server-docs@0.3.24
  - @transcend-io/mcp-server-dsr@0.8.6
  - @transcend-io/mcp-server-inventory@0.7.6
  - @transcend-io/mcp-server-workflows@0.5.26

## 0.15.6

### Patch Changes

- Updated dependencies [cef7025]
  - @transcend-io/mcp-server-consent@0.9.1

## 0.15.5

### Patch Changes

- 4c1b802: Add an MCP App view to `consent_get_inventory_stats` that renders cookie and
  data-flow triage counts.
- 656903e: Add a private shared widget kit for MCP App views and teach the view builder to
  include its Tailwind sources only when a consuming package opts in.
- Updated dependencies [4c1b802]
- Updated dependencies [656903e]
  - @transcend-io/mcp-server-consent@0.9.0
  - @transcend-io/mcp-server-base@1.7.2
  - @transcend-io/mcp-server-admin@0.6.5
  - @transcend-io/mcp-server-assessment@0.5.25
  - @transcend-io/mcp-server-discovery@0.5.25
  - @transcend-io/mcp-server-docs@0.3.23
  - @transcend-io/mcp-server-dsr@0.8.5
  - @transcend-io/mcp-server-inventory@0.7.5
  - @transcend-io/mcp-server-preferences@0.6.5
  - @transcend-io/mcp-server-workflows@0.5.25

## 0.15.4

### Patch Changes

- @transcend-io/mcp-server-admin@0.6.4
- @transcend-io/mcp-server-assessment@0.5.24
- @transcend-io/mcp-server-consent@0.8.4
- @transcend-io/mcp-server-discovery@0.5.24
- @transcend-io/mcp-server-dsr@0.8.4
- @transcend-io/mcp-server-inventory@0.7.4
- @transcend-io/mcp-server-preferences@0.6.4
- @transcend-io/mcp-server-workflows@0.5.24

## 0.15.3

### Patch Changes

- Updated dependencies [4aa92a1]
  - @transcend-io/mcp-server-base@1.7.1
  - @transcend-io/mcp-server-dsr@0.8.3
  - @transcend-io/mcp-server-admin@0.6.3
  - @transcend-io/mcp-server-assessment@0.5.23
  - @transcend-io/mcp-server-consent@0.8.3
  - @transcend-io/mcp-server-discovery@0.5.23
  - @transcend-io/mcp-server-docs@0.3.22
  - @transcend-io/mcp-server-inventory@0.7.3
  - @transcend-io/mcp-server-preferences@0.6.3
  - @transcend-io/mcp-server-workflows@0.5.23

## 0.15.2

### Patch Changes

- @transcend-io/mcp-server-admin@0.6.2
- @transcend-io/mcp-server-assessment@0.5.22
- @transcend-io/mcp-server-consent@0.8.2
- @transcend-io/mcp-server-discovery@0.5.22
- @transcend-io/mcp-server-dsr@0.8.2
- @transcend-io/mcp-server-inventory@0.7.2
- @transcend-io/mcp-server-preferences@0.6.2
- @transcend-io/mcp-server-workflows@0.5.22

## 0.15.1

### Patch Changes

- Updated dependencies [388ed26]
  - @transcend-io/mcp-server-dsr@0.8.1

## 0.15.0

### Minor Changes

- 732e769: Switch `dsr_submit` / `TranscendRestClient.submitDSR` to `POST /v1/data-subject-request-bulk`. Callers pass `workflowConfigId` instead of `type`/`subjectType`; the API derives those from the published workflow config. Returns a minimal summary (`id`, `status`, `type`, `subjectType`, `link`) for each created request. DSR OAuth scopes now include `ViewWorkflows` so clients can list published workflow configs for submit.
- 732e769: Remove `dsr_submit_on_behalf`. DSR creation goes solely through `dsr_submit` → customer-ingress REST (`POST /v1/data-subject-request`), where Sombra attests the subject server-side. The GraphQL `employeeMakeDataSubjectRequest` create path (without `dhEncrypted`) is no longer exposed as an MCP tool.

### Patch Changes

- Updated dependencies [732e769]
- Updated dependencies [732e769]
  - @transcend-io/mcp-server-base@1.7.0
  - @transcend-io/mcp-server-dsr@0.8.0
  - @transcend-io/mcp-server-admin@0.6.1
  - @transcend-io/mcp-server-assessment@0.5.21
  - @transcend-io/mcp-server-consent@0.8.1
  - @transcend-io/mcp-server-discovery@0.5.21
  - @transcend-io/mcp-server-docs@0.3.21
  - @transcend-io/mcp-server-inventory@0.7.1
  - @transcend-io/mcp-server-preferences@0.6.1
  - @transcend-io/mcp-server-workflows@0.5.21

## 0.14.0

### Minor Changes

- 3f81b5d: Add full Admin Users filter parity to `admin_list_users` (`text`, booleans, `teamIds`, scopes, last-login bounds, offset pagination, and orderBy).
- d00bd92: Require human confirmation before the highest-consequence tools run. `dsr_cancel`, `dsr_submit`, `dsr_submit_on_behalf`, `dsr_enrich_identifiers`, `preferences_delete`, `preferences_delete_identifiers` and `preferences_update_identifiers` now declare `confirmation`, so a person is asked before the handler runs and the call refuses if nobody can be.

  `dsr_submit`, `dsr_submit_on_behalf`, `dsr_enrich_identifiers` and `preferences_update_identifiers` also flip to `destructiveHint: true`. Gating a tool and annotating it non-destructive tells hosts two different things about the same call, so the gate requires the annotation to agree. All four earn it: submitting an ERASURE or opt-out request starts irreversible deletion across connected systems, and both identifier tools overwrite values that determine whose data a request or consent record resolves to.

  Five of the seven are `requireSombra` and so were already omitted from Agentic Assist. The two that are not, `dsr_cancel` and `dsr_submit_on_behalf`, are the only ones this newly puts behind a confirmation for HTTP callers.

- 2b82ee8: Add `inventory_write_category` to create or update Data Inventory data subcategories (ZEL-8169). Enrich `inventory_list_categories` to query `dataSubCategories` with ids, owners, teams, and optional text search.
- bd397d4: Add `inventory_write_data_silo` to create or update data systems in one MCP call (ZEL-8221). Create-by-integrationName always creates a new silo; update-by-id applies metadata without title upsert. Replaces `inventory_create_data_silo` and `inventory_update_data_silo`.
- 0e77676: Move the TRANSCEND_SCOPES catalog off `admin_create_api_key`'s tools/list descriptor onto compact `admin_list_scopes`, keeping runtime ScopeName validation on create. Cap every tool description at 700 characters and the umbrella tools/list JSON at 85k characters.

### Patch Changes

- d00bd92: `inventory_create_data_silo` now annotates `destructiveHint: false`. It adds a data-map entry and touches nothing existing, which is what the MCP spec calls an additive update; the previous `true` read as "this writes" rather than "this destroys". The neighbouring `inventory_update_data_silo` — which does overwrite existing metadata — was already `false`, so the pair had the asymmetry backwards.

  Hosts use `destructiveHint` to decide how loudly to warn before a call, so labelling a harmless create as destructive trains people to click through warnings and cheapens them on the tools that need them.

- 9263c9d: Readme adjustments
- 3f81b5d: Fix `admin_list_users` crashing when no filter is provided by sending `filterBy: {}` instead of letting `$filterBy` resolve to `null`.
- Updated dependencies [3f81b5d]
- Updated dependencies [d00bd92]
- Updated dependencies [bfd2b1a]
- Updated dependencies [d00bd92]
- Updated dependencies [3f81b5d]
- Updated dependencies [d00bd92]
- Updated dependencies [2b82ee8]
- Updated dependencies [bd397d4]
- Updated dependencies [bb8e59b]
- Updated dependencies [0e77676]
  - @transcend-io/mcp-server-admin@0.6.0
  - @transcend-io/mcp-server-base@1.6.0
  - @transcend-io/mcp-server-consent@0.8.0
  - @transcend-io/mcp-server-inventory@0.7.0
  - @transcend-io/mcp-server-preferences@0.6.0
  - @transcend-io/mcp-server-dsr@0.7.0
  - @transcend-io/mcp-server-assessment@0.5.20
  - @transcend-io/mcp-server-discovery@0.5.20
  - @transcend-io/mcp-server-docs@0.3.20
  - @transcend-io/mcp-server-workflows@0.5.20

## 0.13.0

### Minor Changes

- 9032822: **@transcend-io/mcp-server-base:** Renames a `ConfirmationPolicy` member shipped in 1.3.0. `ASK_OR_TOKEN` is now `ELICIT_OR_TOKEN`, and the new `ELICIT_ONLY` joins it. The enum names the mechanism that carries the question everywhere else in the package — `McpClientCapability.Elicitation`, `requestElicitation`, `elicitInput` — and was the one place calling it asking. Nothing in the product needs migrating, since the policy is how a transport tells the gate what it may do rather than anything a caller passes in, but an embedder that referenced `ConfirmationPolicy.AskOrToken` directly must update the name.

  Ask for confirmation over HTTP too, bound to the call that triggered it. This replaces the behavior described in 1.3.0, where the HTTP policy was `REFUSE` and every gated call refused: that made an agent platform read-only for gated tools. `ELICIT_ONLY` asks the user with no approval-token fallback and is what `transport: 'http'` now selects. Under it a form that cannot be bound to a call is not sent at all, and a host that cannot render one gets `CONFIRMATION_UNAVAILABLE` rather than a token, because the agent there sits on the far side of the transport and would be the one relaying it.

  `McpSession` now carries the `tools/call` a handler is serving, its JSON-RPC id and abort signal, and `requestElicitation` passes both to the host. Two things follow. Streamable HTTP routes an outbound message by `relatedRequestId` onto that call's own SSE stream, so the form reaches whoever made the call instead of the connection's shared stream, where it could surface in another user's turn; and if nothing is listening on the shared stream the SDK stores the event for replay and returns, so an undelivered form used to sit until the 10-minute timeout with no error logged anywhere. Binding also means abandoning the call tears the form down, which closes a real hazard: a client that gave up at its own tool timeout left the form on screen, and a yes clicked afterwards still resolved and ran the mutation into a call nobody was listening to.

  `canObtainApproval(gate, client)` reports whether a gated tool could actually be approved on a connection, and `tools/list` now withholds gated tools where it cannot: over HTTP from a client that did not declare form elicitation, and always from the in-process `ToolRegistry`. An agent shown a tool that refuses every call plans around it, calls it, and spends the turn on a refusal it can do nothing about. Withholding is for the model's benefit only — nothing in the protocol stops a client calling a tool it was never shown, so the gate still runs on every `tools/call` and remains the actual boundary.

  The trust assumption is worth stating plainly, since it changed. Over HTTP, whether a person is asked now rests on a capability the caller declared about itself. A client that declares form elicitation and then answers its own prompt has approved on the user's behalf, and nothing server-side can tell that apart from a person clicking yes. What the gate does enforce is that such a client asked at all, that the prompt went to the stream of the call it belongs to, and that no token is ever issued for the model to relay. Deployments fronting MCP with an agent platform should declare `elicitation: { form: {} }` only on paths where a person is actually present for the call, and never synthesize an answer on an unattended one.

  **@transcend-io/mcp:** `ToolRegistry.getToolList` no longer describes gated tools, since `executeTool` on that path can never confirm one.

### Patch Changes

- Updated dependencies [9032822]
  - @transcend-io/mcp-server-base@1.5.0
  - @transcend-io/mcp-server-admin@0.5.19
  - @transcend-io/mcp-server-assessment@0.5.19
  - @transcend-io/mcp-server-consent@0.7.1
  - @transcend-io/mcp-server-discovery@0.5.19
  - @transcend-io/mcp-server-docs@0.3.19
  - @transcend-io/mcp-server-dsr@0.6.4
  - @transcend-io/mcp-server-inventory@0.6.8
  - @transcend-io/mcp-server-preferences@0.5.19
  - @transcend-io/mcp-server-workflows@0.5.19

## 0.12.0

### Minor Changes

- c8df618: Add MCP prompts support to mcp-server-base (`prompts/list` and `prompts/get`), and ship three consent workflow prompts (`consent-triage`, `consent-research-tracker`, `consent-inspect-site`) on the consent and umbrella servers.

### Patch Changes

- Updated dependencies [c8df618]
  - @transcend-io/mcp-server-base@1.4.0
  - @transcend-io/mcp-server-consent@0.7.0
  - @transcend-io/mcp-server-admin@0.5.18
  - @transcend-io/mcp-server-assessment@0.5.18
  - @transcend-io/mcp-server-discovery@0.5.18
  - @transcend-io/mcp-server-docs@0.3.18
  - @transcend-io/mcp-server-dsr@0.6.3
  - @transcend-io/mcp-server-inventory@0.6.7
  - @transcend-io/mcp-server-preferences@0.5.18
  - @transcend-io/mcp-server-workflows@0.5.18

## 0.11.1

### Patch Changes

- @transcend-io/mcp-server-consent@0.6.17
- @transcend-io/mcp-server-admin@0.5.17
- @transcend-io/mcp-server-assessment@0.5.17
- @transcend-io/mcp-server-discovery@0.5.17
- @transcend-io/mcp-server-dsr@0.6.2
- @transcend-io/mcp-server-inventory@0.6.6
- @transcend-io/mcp-server-preferences@0.5.17
- @transcend-io/mcp-server-workflows@0.5.17
- @transcend-io/mcp-server-base@1.3.1
- @transcend-io/mcp-server-docs@0.3.17

## 0.11.0

### Minor Changes

- c787e9d: **@transcend-io/mcp-server-base:** Add a server-enforced confirmation gate. A tool declaring `confirmation: { hint }` on its `ToolDefinition` no longer reaches its handler until a human agrees. On a host that renders forms the gate asks through `elicitation/create`; on one that cannot it issues a single-use approval token bound to the tool, a hash of the arguments, and the caller's auth subject, which the agent replays after getting the user's agreement.

  How approval may be obtained is decided by the transport, not by the caller. `buildMcpServer` now requires `transport`, and over HTTP the policy is `REFUSE`: the caller there is another service rather than a person at a keyboard, so gated tools refuse every call with `CONFIRMATION_UNAVAILABLE` and point the user at the admin dashboard. The check happens before anything the client declared is consulted, because a declared elicitation capability is a claim by the party being gated — a client that says it renders forms and then answers its own prompt has approved on the user's behalf.

  Declaring the capability is also not a promise to honor the request. A host that errors, never answers within the timeout, or replies with a shape the SDK validates and rejects now falls through to the approval-token fallback rather than surfacing an opaque `MCP error`, and confirmation forms are given 10 minutes rather than the SDK's 60-second default, which used to cancel the request while the dialog was still on the user's screen.

  `expandToolsForClient` requires its gate argument for the same reason `transport` is required: a default would let a new serving path pick a confirmation policy it never considered.

  **@transcend-io/mcp:** `ToolRegistry.executeTool` now applies the gate rather than calling the registered handler directly, so an embedder driving the registry in-process refuses gated tools instead of running them unconfirmed.

### Patch Changes

- Updated dependencies [5819bc1]
- Updated dependencies [c787e9d]
  - @transcend-io/mcp-server-base@1.3.0
  - @transcend-io/mcp-server-admin@0.5.16
  - @transcend-io/mcp-server-assessment@0.5.16
  - @transcend-io/mcp-server-consent@0.6.16
  - @transcend-io/mcp-server-discovery@0.5.16
  - @transcend-io/mcp-server-docs@0.3.16
  - @transcend-io/mcp-server-dsr@0.6.1
  - @transcend-io/mcp-server-inventory@0.6.5
  - @transcend-io/mcp-server-preferences@0.5.16
  - @transcend-io/mcp-server-workflows@0.5.16

## 0.10.4

### Patch Changes

- 7d980a1: Expose DSR request assignees and connected-system owners through MCP so Agentic Assist can answer who owns approval bottlenecks and failed systems.

  `dsr_list` and `dsr_get_details` now return each request's assigned owners and teams. A new `dsr_list_request_data_silos` tool lists per-system processing status (including errors) with nested data-silo owners and teams, so bottleneck questions no longer hit a capability gap.

- Updated dependencies [4404c48]
- Updated dependencies [7d980a1]
  - @transcend-io/mcp-server-base@1.2.0
  - @transcend-io/mcp-server-dsr@0.6.0
  - @transcend-io/mcp-server-admin@0.5.15
  - @transcend-io/mcp-server-assessment@0.5.15
  - @transcend-io/mcp-server-consent@0.6.15
  - @transcend-io/mcp-server-discovery@0.5.15
  - @transcend-io/mcp-server-docs@0.3.15
  - @transcend-io/mcp-server-inventory@0.6.4
  - @transcend-io/mcp-server-preferences@0.5.15
  - @transcend-io/mcp-server-workflows@0.5.15

## 0.10.3

### Patch Changes

- Updated dependencies [26fadc4]
  - @transcend-io/mcp-server-base@1.1.1
  - @transcend-io/mcp-server-consent@0.6.14
  - @transcend-io/mcp-server-dsr@0.5.14
  - @transcend-io/mcp-server-inventory@0.6.3
  - @transcend-io/mcp-server-admin@0.5.14
  - @transcend-io/mcp-server-assessment@0.5.14
  - @transcend-io/mcp-server-discovery@0.5.14
  - @transcend-io/mcp-server-docs@0.3.14
  - @transcend-io/mcp-server-preferences@0.5.14
  - @transcend-io/mcp-server-workflows@0.5.14

## 0.10.2

### Patch Changes

- @transcend-io/mcp-server-admin@0.5.13
- @transcend-io/mcp-server-assessment@0.5.13
- @transcend-io/mcp-server-consent@0.6.13
- @transcend-io/mcp-server-discovery@0.5.13
- @transcend-io/mcp-server-dsr@0.5.13
- @transcend-io/mcp-server-inventory@0.6.2
- @transcend-io/mcp-server-preferences@0.5.13
- @transcend-io/mcp-server-workflows@0.5.13

## 0.10.1

### Patch Changes

- @transcend-io/mcp-server-admin@0.5.12
- @transcend-io/mcp-server-assessment@0.5.12
- @transcend-io/mcp-server-consent@0.6.12
- @transcend-io/mcp-server-discovery@0.5.12
- @transcend-io/mcp-server-dsr@0.5.12
- @transcend-io/mcp-server-inventory@0.6.1
- @transcend-io/mcp-server-preferences@0.5.12
- @transcend-io/mcp-server-workflows@0.5.12

## 0.10.0

### Minor Changes

- 2faaff6: Add `inventory_update_or_create_data_point` for field-level purpose of processing assignments (ZEL-8168).
- 5b239dc: Improve inventory MCP DX: split data-silo create into catalog `integrationName` + optional display `title`/`description`, add `text` (and silo `titles`) list filters, and stop fabricating datapoint timestamps.
- 5b239dc: Add `inventory_list_catalog_integrations` so agents can search the Transcend catalog for valid `integrationName` values before creating a data silo.
- 6293072: Add processing purpose list/write MCP tools and expand `inventory_update_data_silo` for Data Systems fields (ZEL-8168 stack).
- daffc18: Enrich inventory MCP read tools with silo vendor/purposes/owners metadata, datapoint filtering, vendor field detail, and subcategory normalization; add `inventory_list_business_entities` and `inventory_list_data_subjects` (ZEL-8168 stack PR1).
- dc9ab41: Add `inventory_write_vendor` MCP tool to create/update vendors in Data Inventory (ZEL-8168 stack).

### Patch Changes

- 5b239dc: Tool copy changes
- 5b239dc: Small type adjustment to Datapoint
- Updated dependencies [2faaff6]
- Updated dependencies [5b239dc]
- Updated dependencies [5b239dc]
- Updated dependencies [6293072]
- Updated dependencies [daffc18]
- Updated dependencies [dc9ab41]
- Updated dependencies [5b239dc]
- Updated dependencies [97fa941]
- Updated dependencies [5b239dc]
- Updated dependencies [80d9f9e]
  - @transcend-io/mcp-server-inventory@0.6.0
  - @transcend-io/mcp-server-base@1.1.0
  - @transcend-io/mcp-server-admin@0.5.11
  - @transcend-io/mcp-server-assessment@0.5.11
  - @transcend-io/mcp-server-consent@0.6.11
  - @transcend-io/mcp-server-dsr@0.5.11
  - @transcend-io/mcp-server-preferences@0.5.11
  - @transcend-io/mcp-server-workflows@0.5.11
  - @transcend-io/mcp-server-discovery@0.5.11
  - @transcend-io/mcp-server-docs@0.3.13

## 0.9.4

### Patch Changes

- @transcend-io/mcp-server-base@1.0.0
- @transcend-io/mcp-server-admin@0.5.10
- @transcend-io/mcp-server-assessment@0.5.10
- @transcend-io/mcp-server-consent@0.6.10
- @transcend-io/mcp-server-discovery@0.5.10
- @transcend-io/mcp-server-docs@0.3.12
- @transcend-io/mcp-server-dsr@0.5.10
- @transcend-io/mcp-server-inventory@0.5.10
- @transcend-io/mcp-server-preferences@0.5.10
- @transcend-io/mcp-server-workflows@0.5.10

## 0.9.3

### Patch Changes

- Updated dependencies [f6ca084]
- Updated dependencies [66e641e]
  - @transcend-io/mcp-server-base@0.14.0
  - @transcend-io/mcp-server-admin@0.5.9
  - @transcend-io/mcp-server-assessment@0.5.9
  - @transcend-io/mcp-server-consent@0.6.9
  - @transcend-io/mcp-server-discovery@0.5.9
  - @transcend-io/mcp-server-docs@0.3.11
  - @transcend-io/mcp-server-dsr@0.5.9
  - @transcend-io/mcp-server-inventory@0.5.9
  - @transcend-io/mcp-server-preferences@0.5.9
  - @transcend-io/mcp-server-workflows@0.5.9

## 0.9.2

### Patch Changes

- @transcend-io/mcp-server-admin@0.5.8
- @transcend-io/mcp-server-assessment@0.5.8
- @transcend-io/mcp-server-consent@0.6.8
- @transcend-io/mcp-server-discovery@0.5.8
- @transcend-io/mcp-server-dsr@0.5.8
- @transcend-io/mcp-server-inventory@0.5.8
- @transcend-io/mcp-server-preferences@0.5.8
- @transcend-io/mcp-server-workflows@0.5.8

## 0.9.1

### Patch Changes

- 6d2b56d: Publish sourcemaps that reference their sources rather than embedding them, taking the maps across these packages from roughly 817 KB to 174 KB.

  Stack traces keep their mapped TypeScript positions; what is lost is the surrounding code frame, and only where the sources are not on disk. A fair trade for a server a host launches as a subprocess, and the reason this is scoped to the MCP packages rather than set for every published library.

- Updated dependencies [4bc21f7]
- Updated dependencies [e127dfc]
- Updated dependencies [f3ce7dc]
- Updated dependencies [6d2b56d]
  - @transcend-io/mcp-server-base@0.13.0
  - @transcend-io/mcp-server-admin@0.5.7
  - @transcend-io/mcp-server-assessment@0.5.7
  - @transcend-io/mcp-server-consent@0.6.7
  - @transcend-io/mcp-server-discovery@0.5.7
  - @transcend-io/mcp-server-docs@0.3.10
  - @transcend-io/mcp-server-dsr@0.5.7
  - @transcend-io/mcp-server-inventory@0.5.7
  - @transcend-io/mcp-server-preferences@0.5.7
  - @transcend-io/mcp-server-workflows@0.5.7

## 0.9.0

### Minor Changes

- 1b93859: Serve `ui://` HTML resources and resolve tools to a per-capability variant, so one tool definition can return plain text to a scripted client, a form to a host that supports elicitation, and an interactive view to a host that supports MCP Apps (SEP-1865).

  `defineToolWithCapabilities` declares the variants; `buildMcpServer` resolves them per connection and registers `resources/list` and `resources/read` for any bound views. Tools carry a `_meta.ui.resourceUri` binding, emitted in both the canonical nested and deprecated flat forms because hosts shipped against the earlier draft still read the flat key. App-only tools stay callable through `tools/call` while being hidden from `tools/list`, so a view can reach its own helpers without cluttering the model's tool set.

  For a server with no views nothing changes on the wire: the `resources` capability is only declared when at least one `ui://` resource exists, so those handshakes stay byte-identical.

### Patch Changes

- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [1b93859]
- Updated dependencies [c166809]
- Updated dependencies [1b93859]
  - @transcend-io/mcp-server-base@0.12.0
  - @transcend-io/mcp-server-admin@0.5.6
  - @transcend-io/mcp-server-assessment@0.5.6
  - @transcend-io/mcp-server-consent@0.6.6
  - @transcend-io/mcp-server-discovery@0.5.6
  - @transcend-io/mcp-server-docs@0.3.9
  - @transcend-io/mcp-server-dsr@0.5.6
  - @transcend-io/mcp-server-inventory@0.5.6
  - @transcend-io/mcp-server-preferences@0.5.6
  - @transcend-io/mcp-server-workflows@0.5.6

## 0.8.3

### Patch Changes

- Updated dependencies [6932df1]
  - @transcend-io/mcp-server-base@0.11.0
  - @transcend-io/mcp-server-admin@0.5.5
  - @transcend-io/mcp-server-assessment@0.5.5
  - @transcend-io/mcp-server-consent@0.6.5
  - @transcend-io/mcp-server-discovery@0.5.5
  - @transcend-io/mcp-server-docs@0.3.8
  - @transcend-io/mcp-server-dsr@0.5.5
  - @transcend-io/mcp-server-inventory@0.5.5
  - @transcend-io/mcp-server-preferences@0.5.5
  - @transcend-io/mcp-server-workflows@0.5.5

## 0.8.2

### Patch Changes

- @transcend-io/mcp-server-admin@0.5.4
- @transcend-io/mcp-server-assessment@0.5.4
- @transcend-io/mcp-server-consent@0.6.4
- @transcend-io/mcp-server-discovery@0.5.4
- @transcend-io/mcp-server-dsr@0.5.4
- @transcend-io/mcp-server-inventory@0.5.4
- @transcend-io/mcp-server-preferences@0.5.4
- @transcend-io/mcp-server-workflows@0.5.4

## 0.8.1

### Patch Changes

- @transcend-io/mcp-server-admin@0.5.3
- @transcend-io/mcp-server-assessment@0.5.3
- @transcend-io/mcp-server-consent@0.6.3
- @transcend-io/mcp-server-discovery@0.5.3
- @transcend-io/mcp-server-dsr@0.5.3
- @transcend-io/mcp-server-inventory@0.5.3
- @transcend-io/mcp-server-preferences@0.5.3
- @transcend-io/mcp-server-workflows@0.5.3

## 0.8.0

### Minor Changes

- c00f3c5: Serve `ui://` HTML resources and resolve tools to a per-capability variant, so one tool definition can return plain text to a scripted client, a form to a host that supports elicitation, and an interactive view to a host that supports MCP Apps (SEP-1865).

  `defineToolWithCapabilities` declares the variants; `buildMcpServer` resolves them per connection and registers `resources/list` and `resources/read` for any bound views. Tools carry a `_meta.ui.resourceUri` binding, emitted in both the canonical nested and deprecated flat forms because hosts shipped against the earlier draft still read the flat key. App-only tools stay callable through `tools/call` while being hidden from `tools/list`, so a view can reach its own helpers without cluttering the model's tool set.

  For a server with no views nothing changes on the wire: the `resources` capability is only declared when at least one `ui://` resource exists, so those handshakes stay byte-identical.

### Patch Changes

- Updated dependencies [8034d59]
- Updated dependencies [c00f3c5]
  - @transcend-io/mcp-server-base@0.10.0
  - @transcend-io/mcp-server-admin@0.5.2
  - @transcend-io/mcp-server-assessment@0.5.2
  - @transcend-io/mcp-server-consent@0.6.2
  - @transcend-io/mcp-server-discovery@0.5.2
  - @transcend-io/mcp-server-dsr@0.5.2
  - @transcend-io/mcp-server-inventory@0.5.2
  - @transcend-io/mcp-server-preferences@0.5.2
  - @transcend-io/mcp-server-workflows@0.5.2
  - @transcend-io/mcp-server-docs@0.3.7

## 0.7.1

### Patch Changes

- Updated dependencies [c65d41e]
  - @transcend-io/mcp-server-base@0.9.0
  - @transcend-io/mcp-server-admin@0.5.1
  - @transcend-io/mcp-server-assessment@0.5.1
  - @transcend-io/mcp-server-consent@0.6.1
  - @transcend-io/mcp-server-discovery@0.5.1
  - @transcend-io/mcp-server-dsr@0.5.1
  - @transcend-io/mcp-server-inventory@0.5.1
  - @transcend-io/mcp-server-preferences@0.5.1
  - @transcend-io/mcp-server-workflows@0.5.1
  - @transcend-io/mcp-server-docs@0.3.6

## 0.7.0

### Minor Changes

- 637b357: Enables sombra integration with mcp

### Patch Changes

- cf74715: enforce orgs mcp x sombra setting
- 29821b9: Adds condition sombra header and lazy load the customers sombra url
- fb24b96: Adds sombra metadata to tools
- Updated dependencies [29821b9]
- Updated dependencies [cf74715]
- Updated dependencies [29821b9]
- Updated dependencies [fb24b96]
- Updated dependencies [637b357]
  - @transcend-io/mcp-server-consent@0.6.0
  - @transcend-io/mcp-server-preferences@0.5.0
  - @transcend-io/mcp-server-assessment@0.5.0
  - @transcend-io/mcp-server-discovery@0.5.0
  - @transcend-io/mcp-server-inventory@0.5.0
  - @transcend-io/mcp-server-workflows@0.5.0
  - @transcend-io/mcp-server-admin@0.5.0
  - @transcend-io/mcp-server-base@0.8.0
  - @transcend-io/mcp-server-dsr@0.5.0
  - @transcend-io/mcp-server-docs@0.3.5

## 0.6.13

### Patch Changes

- @transcend-io/mcp-server-admin@0.4.13
- @transcend-io/mcp-server-assessment@0.4.13
- @transcend-io/mcp-server-consent@0.5.1
- @transcend-io/mcp-server-discovery@0.4.13
- @transcend-io/mcp-server-dsr@0.4.13
- @transcend-io/mcp-server-inventory@0.4.13
- @transcend-io/mcp-server-preferences@0.4.13
- @transcend-io/mcp-server-workflows@0.4.13

## 0.6.12

### Patch Changes

- Updated dependencies [ac7537b]
  - @transcend-io/mcp-server-consent@0.5.0
  - @transcend-io/mcp-server-admin@0.4.12
  - @transcend-io/mcp-server-assessment@0.4.12
  - @transcend-io/mcp-server-discovery@0.4.12
  - @transcend-io/mcp-server-dsr@0.4.12
  - @transcend-io/mcp-server-inventory@0.4.12
  - @transcend-io/mcp-server-preferences@0.4.12
  - @transcend-io/mcp-server-workflows@0.4.12

## 0.6.11

### Patch Changes

- @transcend-io/mcp-server-admin@0.4.11
- @transcend-io/mcp-server-assessment@0.4.11
- @transcend-io/mcp-server-consent@0.4.12
- @transcend-io/mcp-server-discovery@0.4.11
- @transcend-io/mcp-server-dsr@0.4.11
- @transcend-io/mcp-server-inventory@0.4.11
- @transcend-io/mcp-server-preferences@0.4.11
- @transcend-io/mcp-server-workflows@0.4.11

## 0.6.10

### Patch Changes

- Updated dependencies [e410109]
  - @transcend-io/mcp-server-base@0.7.0
  - @transcend-io/mcp-server-admin@0.4.10
  - @transcend-io/mcp-server-assessment@0.4.10
  - @transcend-io/mcp-server-consent@0.4.11
  - @transcend-io/mcp-server-discovery@0.4.10
  - @transcend-io/mcp-server-docs@0.3.4
  - @transcend-io/mcp-server-dsr@0.4.10
  - @transcend-io/mcp-server-inventory@0.4.10
  - @transcend-io/mcp-server-preferences@0.4.10
  - @transcend-io/mcp-server-workflows@0.4.10

## 0.6.9

### Patch Changes

- Updated dependencies [3f41944]
  - @transcend-io/mcp-server-base@0.6.2
  - @transcend-io/mcp-server-admin@0.4.9
  - @transcend-io/mcp-server-assessment@0.4.9
  - @transcend-io/mcp-server-consent@0.4.10
  - @transcend-io/mcp-server-discovery@0.4.9
  - @transcend-io/mcp-server-docs@0.3.3
  - @transcend-io/mcp-server-dsr@0.4.9
  - @transcend-io/mcp-server-inventory@0.4.9
  - @transcend-io/mcp-server-preferences@0.4.9
  - @transcend-io/mcp-server-workflows@0.4.9

## 0.6.8

### Patch Changes

- @transcend-io/mcp-server-admin@0.4.8
- @transcend-io/mcp-server-assessment@0.4.8
- @transcend-io/mcp-server-consent@0.4.9
- @transcend-io/mcp-server-discovery@0.4.8
- @transcend-io/mcp-server-dsr@0.4.8
- @transcend-io/mcp-server-inventory@0.4.8
- @transcend-io/mcp-server-preferences@0.4.8
- @transcend-io/mcp-server-workflows@0.4.8

## 0.6.7

### Patch Changes

- @transcend-io/mcp-server-admin@0.4.7
- @transcend-io/mcp-server-assessment@0.4.7
- @transcend-io/mcp-server-consent@0.4.8
- @transcend-io/mcp-server-discovery@0.4.7
- @transcend-io/mcp-server-dsr@0.4.7
- @transcend-io/mcp-server-inventory@0.4.7
- @transcend-io/mcp-server-preferences@0.4.7
- @transcend-io/mcp-server-workflows@0.4.7

## 0.6.6

### Patch Changes

- @transcend-io/mcp-server-admin@0.4.6
- @transcend-io/mcp-server-assessment@0.4.6
- @transcend-io/mcp-server-consent@0.4.7
- @transcend-io/mcp-server-discovery@0.4.6
- @transcend-io/mcp-server-dsr@0.4.6
- @transcend-io/mcp-server-inventory@0.4.6
- @transcend-io/mcp-server-preferences@0.4.6
- @transcend-io/mcp-server-workflows@0.4.6

## 0.6.5

### Patch Changes

- @transcend-io/mcp-server-consent@0.4.6
- @transcend-io/mcp-server-admin@0.4.5
- @transcend-io/mcp-server-assessment@0.4.5
- @transcend-io/mcp-server-discovery@0.4.5
- @transcend-io/mcp-server-dsr@0.4.5
- @transcend-io/mcp-server-inventory@0.4.5
- @transcend-io/mcp-server-preferences@0.4.5
- @transcend-io/mcp-server-workflows@0.4.5

## 0.6.4

### Patch Changes

- Updated dependencies [212568a]
  - @transcend-io/mcp-server-docs@0.3.2
  - @transcend-io/mcp-server-consent@0.4.5
  - @transcend-io/mcp-server-admin@0.4.4
  - @transcend-io/mcp-server-assessment@0.4.4
  - @transcend-io/mcp-server-discovery@0.4.4
  - @transcend-io/mcp-server-dsr@0.4.4
  - @transcend-io/mcp-server-inventory@0.4.4
  - @transcend-io/mcp-server-preferences@0.4.4
  - @transcend-io/mcp-server-workflows@0.4.4

## 0.6.3

### Patch Changes

- cbe9d3a: Update links in the readmes
- Updated dependencies [cbe9d3a]
  - @transcend-io/mcp-server-preferences@0.4.3
  - @transcend-io/mcp-server-assessment@0.4.3
  - @transcend-io/mcp-server-discovery@0.4.3
  - @transcend-io/mcp-server-inventory@0.4.3
  - @transcend-io/mcp-server-workflows@0.4.3
  - @transcend-io/mcp-server-consent@0.4.4
  - @transcend-io/mcp-server-admin@0.4.3
  - @transcend-io/mcp-server-base@0.6.1
  - @transcend-io/mcp-server-dsr@0.4.3
  - @transcend-io/mcp-server-docs@0.3.1

## 0.6.2

### Patch Changes

- @transcend-io/mcp-server-consent@0.4.3

## 0.6.1

### Patch Changes

- 02bab58: Rename docs MCP tools to match domain-server naming: `transcend_docs_list` → `docs_list`, `transcend_docs_fetch` → `docs_fetch`. Update umbrella server initialize instructions accordingly.
- Updated dependencies [02bab58]
  - @transcend-io/mcp-server-docs@0.3.0

## 0.6.0

### Minor Changes

- a2b1e8b: Wire documentation lookup tools into the unified umbrella MCP server.

### Patch Changes

- 8fb4627: **@transcend-io/mcp-server-base:** Add per-tool `requireAuth` (call time) and `requireStartupAuth` on `createMCPServer` (boot). Add optional MCP initialize `instructions` on `buildMcpServer`, plus `resolveStdioStartupAuthOptional` for servers that include public tools.

  **@transcend-io/mcp-server-docs:** Docs tools set `requireAuth: false` so they skip lazy OAuth. Standalone CLI uses `requireStartupAuth: false` (no API key or OAuth at startup). Remove unused docs OAuth scopes.

  **@transcend-io/mcp:** Umbrella server uses optional startup auth, registers docs tools first, and ships initialize instructions guiding agents to `transcend_docs_list` / `transcend_docs_fetch` before org-specific API tools. Read CLI version from `package.json`.

  **Domain MCP servers:** Read CLI version from `package.json` instead of a hardcoded value.

- Updated dependencies [8fb4627]
  - @transcend-io/mcp-server-base@0.6.0
  - @transcend-io/mcp-server-docs@0.2.2
  - @transcend-io/mcp-server-admin@0.4.2
  - @transcend-io/mcp-server-assessment@0.4.2
  - @transcend-io/mcp-server-consent@0.4.2
  - @transcend-io/mcp-server-discovery@0.4.2
  - @transcend-io/mcp-server-dsr@0.4.2
  - @transcend-io/mcp-server-inventory@0.4.2
  - @transcend-io/mcp-server-preferences@0.4.2
  - @transcend-io/mcp-server-workflows@0.4.2

## 0.5.1

### Patch Changes

- @transcend-io/mcp-server-admin@0.4.1
- @transcend-io/mcp-server-assessment@0.4.1
- @transcend-io/mcp-server-consent@0.4.1
- @transcend-io/mcp-server-discovery@0.4.1
- @transcend-io/mcp-server-dsr@0.4.1
- @transcend-io/mcp-server-inventory@0.4.1
- @transcend-io/mcp-server-preferences@0.4.1
- @transcend-io/mcp-server-workflows@0.4.1

## 0.5.0

### Minor Changes

- 8240631: Updates docs to direct users in integrating mcp with oauth
- 6a48672: Adopt typed `graphql()` operations across every MCP server, plus tool input
  parameter cleanups that surfaced during the migration.

  Schema-level changes:
  - All hand-written GraphQL strings are replaced with `graphql()`-tagged
    `TypedDocumentNode`s generated from the committed `schema.graphql`. Any
    drift between the consumer operation and the staging schema now fails
    `tsc` instead of slipping through to a runtime error.
  - `admin_create_api_key` returns the same shape (`apiKey`, `token`,
    `warning`, `message`), but the underlying mutation has been corrected to
    match the schema's `CreatedApiKey` payload.
  - `workflows_update_config` is split into a mutation followed by a
    follow-up `workflowConfig` read because `UpdateWorkflowConfigPayload`
    only exposes `success`/`clientMutationId`. The tool no longer accepts
    `show_in_privacy_center`; the GraphQL API does not expose that field.
  - `inventory_list_data_silos` no longer requests `DataSilo.updatedAt`
    (not present on the type).

  Tool input parameter renames (BREAKING — every tool input is now
  camelCase). Tool _names_ are unchanged. The full list of renamed fields:
  - `assessment_id` → `assessmentId`
  - `assessment_section_ids` → `assessmentSectionIds`
  - `assessment_question_id` → `assessmentQuestionId`
  - `assessment_answer_ids` → `assessmentAnswerIds`
  - `assessment_answer_values` → `assessmentAnswerValues`
  - `assessment_group_id` → `assessmentGroupId`
  - `assessment_name` → `assessmentName`
  - `template_id` → `templateId`
  - `reviewer_ids` → `reviewerIds`
  - `due_date` → `dueDate`
  - `assignee_ids` → `assigneeIds`
  - `assignee_emails` → `assigneeEmails`
  - `external_assignee_emails` → `externalAssigneeEmails`
  - `submit_for_review` → `submitForReview`
  - `tracking_purposes` → `trackingPurposes`
  - `is_junk` → `isJunk`
  - `data_flows` → `dataFlows`
  - `show_zero_activity` → `showZeroActivity`
  - `order_field` → `orderField`
  - `order_direction` → `orderDirection`
  - `data_silo_id` → `dataSiloId`
  - `data_point_id` → `dataPointId`
  - `scan_id` → `scanId`
  - `entity_types` → `entityTypes`
  - `request_id` → `requestId`
  - `profile_ids` → `profileIds`
  - `data_silos` → `dataSilos` (admin_create_api_key)
  - `workflow_config_id` → `workflowConfigId`
  - `user_id` → `userId`
  - `show_in_privacy_center` (removed; not in schema)

  Removed tools:
  - `discovery_start_scan` and `discovery_get_scan` are removed. They called
    `startClassificationScan` / `classificationScan(id:)`, which do not exist
    in Transcend's GraphQL schema, so they could only ever fail at runtime.

  `defineTool` now recursively rejects any input field (at any nesting depth)
  that is missing a meaningful Zod description, and a repo-wide
  `scripts/check-mcp-descriptions.test.ts` audit enforces the same in CI.

### Patch Changes

- b1d1f0b: Adds oauth flow to browser and callback html
- 20e0336: Adds the ability to call either prod region api
- d00a847: Integrates mcp packages with oauth flow
- Updated dependencies [f04564e]
- Updated dependencies [b4b7c81]
- Updated dependencies [20e0336]
- Updated dependencies [b1d1f0b]
- Updated dependencies [8240631]
- Updated dependencies [d00a847]
- Updated dependencies [6a48672]
- Updated dependencies [6a48672]
  - @transcend-io/mcp-server-base@0.5.0
  - @transcend-io/mcp-server-preferences@0.4.0
  - @transcend-io/mcp-server-assessment@0.4.0
  - @transcend-io/mcp-server-discovery@0.4.0
  - @transcend-io/mcp-server-inventory@0.4.0
  - @transcend-io/mcp-server-workflows@0.4.0
  - @transcend-io/mcp-server-consent@0.4.0
  - @transcend-io/mcp-server-admin@0.4.0
  - @transcend-io/mcp-server-dsr@0.4.0

## 0.4.23

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.19
- @transcend-io/mcp-server-assessment@0.3.20
- @transcend-io/mcp-server-consent@0.3.6
- @transcend-io/mcp-server-dsr@0.3.20

## 0.4.22

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.18
- @transcend-io/mcp-server-assessment@0.3.19
- @transcend-io/mcp-server-consent@0.3.5
- @transcend-io/mcp-server-dsr@0.3.19

## 0.4.21

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.17
- @transcend-io/mcp-server-assessment@0.3.18
- @transcend-io/mcp-server-consent@0.3.4
- @transcend-io/mcp-server-dsr@0.3.18

## 0.4.20

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.16
- @transcend-io/mcp-server-assessment@0.3.17
- @transcend-io/mcp-server-consent@0.3.3
- @transcend-io/mcp-server-dsr@0.3.17

## 0.4.19

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.15
- @transcend-io/mcp-server-assessment@0.3.16
- @transcend-io/mcp-server-consent@0.3.2
- @transcend-io/mcp-server-dsr@0.3.16

## 0.4.18

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.14
- @transcend-io/mcp-server-assessment@0.3.15
- @transcend-io/mcp-server-consent@0.3.1
- @transcend-io/mcp-server-dsr@0.3.15

## 0.4.17

### Patch Changes

- c14ba60: Add consent analytics MCP tools (`consent_get_aggregate_analytics`, `consent_get_timeseries_analytics`, `consent_get_analytics_data`) backed by new SDK airgap bundle analytics fetchers and consent analytics enums in privacy-types. Rename `consent_get_triage_stats` to `consent_get_inventory_stats` to clarify it returns inventory counts, not site analytics.
- Updated dependencies [c14ba60]
  - @transcend-io/mcp-server-consent@0.3.0
  - @transcend-io/mcp-server-admin@0.3.13
  - @transcend-io/mcp-server-assessment@0.3.14
  - @transcend-io/mcp-server-dsr@0.3.14

## 0.4.16

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.12
- @transcend-io/mcp-server-assessment@0.3.13
- @transcend-io/mcp-server-consent@0.2.16
- @transcend-io/mcp-server-dsr@0.3.13

## 0.4.15

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.11
- @transcend-io/mcp-server-assessment@0.3.12
- @transcend-io/mcp-server-consent@0.2.15
- @transcend-io/mcp-server-dsr@0.3.12

## 0.4.14

### Patch Changes

- @transcend-io/mcp-server-consent@0.2.14

## 0.4.13

### Patch Changes

- Updated dependencies [ec9f959]
  - @transcend-io/mcp-server-inventory@0.3.7

## 0.4.12

### Patch Changes

- Updated dependencies [6d32f5e]
- Updated dependencies [85f24d0]
  - @transcend-io/mcp-server-admin@0.3.10
  - @transcend-io/mcp-server-inventory@0.3.6
  - @transcend-io/mcp-server-base@0.4.5
  - @transcend-io/mcp-server-assessment@0.3.11
  - @transcend-io/mcp-server-consent@0.2.13
  - @transcend-io/mcp-server-dsr@0.3.11
  - @transcend-io/mcp-server-discovery@0.3.6
  - @transcend-io/mcp-server-preferences@0.3.6
  - @transcend-io/mcp-server-workflows@0.3.6

## 0.4.11

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.9
- @transcend-io/mcp-server-assessment@0.3.10
- @transcend-io/mcp-server-consent@0.2.12
- @transcend-io/mcp-server-dsr@0.3.10

## 0.4.10

### Patch Changes

- 467109b: Return canonical `app.transcend.io` deep links from assessment tools so MCP
  clients (Claude Desktop, Cursor, etc.) stop fabricating 404 URLs like
  `/privacy-requests/assessments/:id`.
  - `assessments_create`, `assessments_get`, `assessments_update`,
    `assessments_submit_response`, and `assessments_list` now include a single
    `url` field in their result payloads, always pointing at the form's
    read-only response page (`/assessments/forms/{id}/response`) — the same
    destination as the dashboard's "View Responses" row action, which works
    for any user with assessment view scope.
  - `assessments_create_group` and `assessments_list_groups` include a
    `groupUrl` (`/assessments/groups/{id}`).
  - Per-assessment tools intentionally do **not** return `groupUrl` as a
    sibling of `url`. When both were exposed, downstream LLM clients reliably
    surfaced `groupUrl` over `url` and every clicked link ended up at the
    parent group instead of the specific assessment. Group navigation lives
    on the dedicated group tools above.
  - The fillable `/assessments/forms/{id}/view` route is also intentionally
    not surfaced — it 404s for anyone who isn't the form's assignee, which
    the MCP can't verify.
  - Tool `description`s now instruct the model to surface the returned `url`
    / `groupUrl` verbatim instead of constructing URLs from raw IDs.
  - `ToolClients` gains a `dashboardUrl` field (always
    `https://app.transcend.io` in production) plus a new
    `DEFAULT_DASHBOARD_URL` export from `@transcend-io/mcp-server-base`.
  - New optional `TRANSCEND_DASHBOARD_URL` env var overrides the dashboard
    base URL for testing against staging or local dashboards. Unset in
    production so we fall through to the canonical `app.transcend.io`.
  - `assessmentGroupId` is now surfaced on the `Assessment` type via the
    underlying GraphQL queries, so callers can still navigate from a specific
    assessment to its parent group via the group tools.
  - Standalone server CLIs (`mcp-server-admin`, `mcp-server-discovery`,
    `mcp-server-dsr`, `mcp-server-inventory`, `mcp-server-preferences`,
    `mcp-server-workflows`) were updated to accept the new `dashboardUrl`
    field on `CreateClientsArgs`. Runtime behavior is unchanged for everything
    except the assessment server, which now uses it to build deep links.

  Fixes ZEL-7538.

- Updated dependencies [467109b]
  - @transcend-io/mcp-server-assessment@0.3.9
  - @transcend-io/mcp-server-base@0.4.4
  - @transcend-io/mcp-server-admin@0.3.8
  - @transcend-io/mcp-server-discovery@0.3.5
  - @transcend-io/mcp-server-dsr@0.3.9
  - @transcend-io/mcp-server-inventory@0.3.5
  - @transcend-io/mcp-server-preferences@0.3.5
  - @transcend-io/mcp-server-workflows@0.3.5
  - @transcend-io/mcp-server-consent@0.2.11

## 0.4.9

### Patch Changes

- ed322d2: Adjust readme to clarify api key requirements
- Updated dependencies [ed322d2]
  - @transcend-io/mcp-server-preferences@0.3.4
  - @transcend-io/mcp-server-assessment@0.3.8
  - @transcend-io/mcp-server-discovery@0.3.4
  - @transcend-io/mcp-server-inventory@0.3.4
  - @transcend-io/mcp-server-workflows@0.3.4
  - @transcend-io/mcp-server-consent@0.2.10
  - @transcend-io/mcp-server-admin@0.3.7
  - @transcend-io/mcp-server-base@0.4.3
  - @transcend-io/mcp-server-dsr@0.3.8

## 0.4.8

### Patch Changes

- Updated dependencies [3cb3a63]
  - @transcend-io/mcp-server-dsr@0.3.7

## 0.4.7

### Patch Changes

- Updated dependencies [644c65a]
  - @transcend-io/mcp-server-assessment@0.3.7
  - @transcend-io/mcp-server-consent@0.2.9

## 0.4.6

### Patch Changes

- @transcend-io/mcp-server-consent@0.2.8

## 0.4.5

### Patch Changes

- Updated dependencies [a9634e4]
  - @transcend-io/mcp-server-base@0.4.2
  - @transcend-io/mcp-server-admin@0.3.6
  - @transcend-io/mcp-server-assessment@0.3.6
  - @transcend-io/mcp-server-consent@0.2.7
  - @transcend-io/mcp-server-discovery@0.3.3
  - @transcend-io/mcp-server-dsr@0.3.6
  - @transcend-io/mcp-server-inventory@0.3.3
  - @transcend-io/mcp-server-preferences@0.3.3
  - @transcend-io/mcp-server-workflows@0.3.3

## 0.4.4

### Patch Changes

- Updated dependencies [a33cfa5]
- Updated dependencies [a33cfa5]
  - @transcend-io/mcp-server-base@0.4.1
  - @transcend-io/mcp-server-admin@0.3.5
  - @transcend-io/mcp-server-assessment@0.3.5
  - @transcend-io/mcp-server-consent@0.2.6
  - @transcend-io/mcp-server-discovery@0.3.2
  - @transcend-io/mcp-server-dsr@0.3.5
  - @transcend-io/mcp-server-inventory@0.3.2
  - @transcend-io/mcp-server-preferences@0.3.2
  - @transcend-io/mcp-server-workflows@0.3.2

## 0.4.3

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.4
- @transcend-io/mcp-server-assessment@0.3.4
- @transcend-io/mcp-server-consent@0.2.5
- @transcend-io/mcp-server-dsr@0.3.4

## 0.4.2

### Patch Changes

- @transcend-io/mcp-server-consent@0.2.4

## 0.4.1

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.3
- @transcend-io/mcp-server-assessment@0.3.3
- @transcend-io/mcp-server-consent@0.2.3
- @transcend-io/mcp-server-dsr@0.3.3

## 0.4.0

### Minor Changes

- d2822d5: Stop Datadog (and other container log collectors that key off the stream) from tagging every MCP info log as Error. `SimpleLogger` previously wrote all log levels to stderr unconditionally; in HTTP transport that meant routine lines like `Executing tool: ...`, `Returning N tools`, and `HTTP server listening` were classified as `Error` in Datadog despite the JSON `level` field saying `info`.

  `SimpleLogger` now exposes a static `setInfoToStdout(enabled)` configuration. When enabled (called automatically for HTTP transport in `createMCPServer` and the unified `mcp` CLI), `info` and `debug` route to `process.stdout` while `warn` and `error` stay on `process.stderr`. The default remains all-stderr so stdio MCP transport keeps working without polluting the JSON-RPC protocol on stdout.

  Also:
  - The duplicate-tool-name warning in `ToolRegistry` now goes through `SimpleLogger.warn` instead of bypassing it with a direct `process.stderr.write`, so it benefits from the same routing config and emits structured JSON consistent with the rest of the server's logs.
  - `SimpleLogger` keeps strict `(message: string, data?: unknown)` method signatures for compile-time safety on direct callers, while satisfying a wider variadic `Logger` interface (structurally identical to the one in `@transcend-io/utils`) via TypeScript's method bivariance. No new runtime dependencies introduced.

### Patch Changes

- 270f4f2: While this is not intended as a functional change, we’ve migrated GitHub repositories and build tooling
- Updated dependencies [270f4f2]
- Updated dependencies [d2822d5]
  - @transcend-io/mcp-server-consent@0.2.2
  - @transcend-io/mcp-server-base@0.4.0
  - @transcend-io/mcp-server-admin@0.3.2
  - @transcend-io/mcp-server-assessment@0.3.2
  - @transcend-io/mcp-server-discovery@0.3.1
  - @transcend-io/mcp-server-dsr@0.3.2
  - @transcend-io/mcp-server-inventory@0.3.1
  - @transcend-io/mcp-server-preferences@0.3.1
  - @transcend-io/mcp-server-workflows@0.3.1

## 0.3.1

### Patch Changes

- @transcend-io/mcp-server-admin@0.3.1
- @transcend-io/mcp-server-assessment@0.3.1
- @transcend-io/mcp-server-consent@0.2.1
- @transcend-io/mcp-server-dsr@0.3.1

## 0.3.0

### Minor Changes

- af70fbf: Align MCP env var naming with the rest of the repo.
  - `TRANSCEND_API_URL` now points at the GraphQL backend (default `https://api.transcend.io`), matching `@transcend-io/cli` and the convention used throughout `transcend-io/main`.
  - The Sombra REST endpoint moves to `SOMBRA_URL` (default `https://multi-tenant.sombra.transcend.io`), matching the env var already read by `@transcend-io/cli` and `@transcend-io/sdk` (`createSombraGotInstance`). Setting `SOMBRA_URL` once now applies to both the CLI/SDK and the MCP server.
  - `TRANSCEND_GRAPHQL_URL` is removed.

  **Breaking:**
  - Anyone who previously set `TRANSCEND_API_URL` to a Sombra URL must rename it to `SOMBRA_URL`.
  - Anyone who previously set `TRANSCEND_GRAPHQL_URL` must rename it to `TRANSCEND_API_URL`.

### Patch Changes

- Updated dependencies [af70fbf]
  - @transcend-io/mcp-server-base@0.3.0
  - @transcend-io/mcp-server-admin@0.3.0
  - @transcend-io/mcp-server-assessment@0.3.0
  - @transcend-io/mcp-server-consent@0.2.0
  - @transcend-io/mcp-server-discovery@0.3.0
  - @transcend-io/mcp-server-dsr@0.3.0
  - @transcend-io/mcp-server-inventory@0.3.0
  - @transcend-io/mcp-server-preferences@0.3.0
  - @transcend-io/mcp-server-workflows@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [c07cb4f]
  - @transcend-io/mcp-server-workflows@0.2.1
  - @transcend-io/mcp-server-consent@0.1.3

## 0.2.0

### Minor Changes

- d6c7dbf: Add Streamable HTTP transport and dual-auth support (API key + session cookie) to all MCP server packages.

  **Breaking (core):** `TranscendGraphQLBase` and `TranscendRestClient` constructors now accept `AuthCredentials | null` instead of a plain API key string. `createMCPServer`'s `createClients` callback receives `AuthCredentials | null` as its first argument.

  **New:**
  - `--transport http` flag starts an Express-based Streamable HTTP server with per-session isolation
  - `AuthCredentials` discriminated union (`apiKey` | `sessionCookie`) for outbound request authentication
  - `AsyncLocalStorage`-based per-request auth context (`requestAuthContext` / `getRequestAuth`) for safe concurrent multi-tenant operation
  - `resolveAuth` / `tryResolveAuth` for resolving credentials from inbound HTTP headers or env var
  - `buildMcpServer` lower-level factory for creating `Server` instances without transport
  - `runMcpHttp` for starting HTTP servers with session management, SSE resume, health check, and CORS
  - Auth-free initialization for sidecar deployments (Prometheus/Mastra pattern)

### Patch Changes

- 9d2a663: Update for mcp packages to consume new package names for previously name mcp-server, mcp-server-assessments, and mcp-server-core
- Updated dependencies [d6c7dbf]
- Updated dependencies [9d2a663]
  - @transcend-io/mcp-server-base@0.2.0
  - @transcend-io/mcp-server-admin@0.2.0
  - @transcend-io/mcp-server-assessment@0.2.0
  - @transcend-io/mcp-server-discovery@0.2.0
  - @transcend-io/mcp-server-dsr@0.2.0
  - @transcend-io/mcp-server-inventory@0.2.0
  - @transcend-io/mcp-server-preferences@0.2.0
  - @transcend-io/mcp-server-workflows@0.2.0
  - @transcend-io/mcp-server-consent@0.1.2

## 0.0.3

### Patch Changes

- @transcend-io/mcp-server-admin@0.0.3
- @transcend-io/mcp-server-assessments@0.0.3
- @transcend-io/mcp-server-consent@1.0.2
- @transcend-io/mcp-server-dsr@0.0.3

## 0.0.2

### Patch Changes

- @transcend-io/mcp-server-admin@0.0.2
- @transcend-io/mcp-server-assessments@0.0.2
- @transcend-io/mcp-server-consent@1.0.1
- @transcend-io/mcp-server-dsr@0.0.2

## 0.0.1

### Patch Changes

- 8185679: feat(sdk): split consent GQL queries into domain files with shared types

  **SDK (`@transcend-io/sdk`):**
  - Split monolithic `consent/gqls/consentManager.ts` (800+ lines) into domain-focused modules: `cookies.ts`, `dataFlows.ts`, `experiences.ts`, `purposes.ts`, `partitions.ts`, `stats.ts`, `consentManager.ts`
  - Add shared field selection constants (`SERVICE_FIELDS`, `TRACKING_PURPOSE_FIELDS`, `OWNER_FIELDS`, `TEAM_FIELDS`, `ATTRIBUTE_VALUE_FIELDS`) to deduplicate GQL field lists across queries
  - Add `Transcend*Gql` response types next to every GQL constant (e.g. `TranscendCliCookiesResponse`, `TranscendCliDataFlowsResponse`)
  - Add missing GQL queries: `PURPOSES`, `COOKIE_STATS`, `DATA_FLOW_STATS`, `DELETE_COOKIES`, `DELETE_DATA_FLOWS`
  - Extend `DATA_FLOWS` and `COOKIES` queries with parameterized `$filterBy`/`$orderBy` variables and triage fields (`occurrences`, `frequency`, `purposes`, etc.)
  - Extend `UPDATE_DATA_FLOWS` mutation to return full data flow fields
  - Add `totalCount` to `EXPERIENCES` query response
  - Add `id` to owners, teams, and attribute values in all GQL selections
  - Move generic types (`TranscendOwnerGql`, `TranscendTeamGql`, `TranscendAttributeValueGql`) to SDK-wide `gqls/shared.ts`
  - Delete redundant type aliases (`Cookie`, `DataFlow`, `ConsentManagerTheme`, `TranscendPartition`) from fetch/sync files; use GQL types directly
  - Expose optional `orderBy` parameter in `fetchAllDataFlows` and `fetchAllCookies`
  - Add barrel exports: `consent/gqls/index.ts` and `gqls/index.ts`

  **Privacy Types (`@transcend-io/privacy-types`):**
  - Add `OrderDirection` enum (`Asc = 'ASC'`, `Desc = 'DESC'`)

  **MCP Server Core (`@transcend-io/mcp-server-core`):**
  - Make `TranscendGraphQLBase.makeRequest` public (was `protected`)
  - Remove consent-specific types from `types/transcend.ts` (moved to SDK)
  - Remove `@transcend-io/privacy-types` re-exports (consumers import directly)

  **MCP Server Consent (`@transcend-io/mcp-server-consent`):**
  - **BREAKING:** Delete `graphql.ts` (`ConsentMixin`) — tools now call `makeRequest` directly with GQL from SDK
  - **BREAKING:** Remove `airgap_bundle_id` from all tool inputs — auto-resolved from API key via `resolveAirgapBundleId`
  - **BREAKING:** Merge `consent_list_triage_cookies`/`consent_list_triage_data_flows` into `consent_list_cookies`/`consent_list_data_flows` with required `status` filter
  - **BREAKING:** Rename tool `consent_list_triage_cookies` → `consent_list_cookies`, `consent_list_triage_data_flows` → `consent_list_data_flows`
  - Replace hardcoded regimes with real `EXPERIENCES` API call
  - Add `show_zero_activity` support to `consent_get_triage_stats`
  - Use `ConsentTrackerStatus`/`OrderDirection` enums from `@transcend-io/privacy-types` instead of hardcoded strings
  - Import all GQL response types from SDK — zero inline `makeRequest<{...}>` type parameters

  **Future work:** Reuse SDK fetch functions (`fetchAllDataFlows`, `fetchConsentManagerExperiences`) directly once `TranscendGraphQLBase` is compatible with `graphql-request`'s `GraphQLClient` interface.

- Updated dependencies [8185679]
- Updated dependencies [d3f8140]
- Updated dependencies [29868af]
  - @transcend-io/mcp-server-core@0.1.0
  - @transcend-io/mcp-server-consent@1.0.0
  - @transcend-io/mcp-server-dsr@0.0.1
  - @transcend-io/mcp-server-admin@0.0.1
  - @transcend-io/mcp-server-assessments@0.0.1
  - @transcend-io/mcp-server-discovery@0.0.1
  - @transcend-io/mcp-server-inventory@0.0.1
  - @transcend-io/mcp-server-preferences@0.0.1
  - @transcend-io/mcp-server-workflows@0.0.1
