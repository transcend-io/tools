---
name: mcp-tool-design
description: Standards and review checklist for writing MCP tools, including naming, caller vocabulary, input schemas, safety annotations, error recovery, response size, and description budgets. Use when adding, wrapping, consolidating, or reviewing an MCP tool, generating tools from an existing REST/GraphQL API, or when an agent keeps calling the wrong tool.
---

# MCP Tool Design

Two modes. Pick one before starting.

| Mode          | Trigger                                                              | Output                                             |
| ------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| **Authoring** | Adding a tool, or generating tools from an existing API              | Tool code + filled checklist                       |
| **Review**    | Auditing an existing tool or a PR that adds one                      | Verdict per checklist item, with specific rewrites  |

Both modes use the same checklist. In review mode, every item is pass/fail with a
named reason — never "looks fine."

## Core premise

Every tool you add competes with every tool already there. Retrieval degrades as
the catalog grows, and it degrades fastest from **near-duplicates**, not from
unrelated tools. A tool that closely resembles its siblings costs recall on
queries meant for those siblings. So the cost of a new tool is paid by the tools
that already work.

This is why the first question is not "how do I write this tool" but "should this
tool exist."

## Step 0: Should this tool exist?

Do not mirror the API. One tool per endpoint is the default failure mode when
generating from an existing REST or GraphQL surface.

Ask in order:

1. **Can an existing tool absorb this behind one parameter?** If yes, extend it.
2. **Would a caller ever want these as separate steps?** If no, merge them.
3. **Do the candidates share a safety class?** (see [Safety contract](#safety-contract)) If they diverge, they must stay separate.
4. **Do the candidates share a parameter shape?** If merging forces a union type with mutually exclusive fields, keep them separate.

Merging is right by default; 3 and 4 are the real limits on it.

<details>
<summary>Example: when not to merge</summary>

Three tools with identical parameters (`partition`, `userId`, `identifiers`)
look like obvious merge candidates, but their safety classes diverge:

| Tool                             | `destructiveHint` | `idempotentHint` |
| -------------------------------- | ----------------- | ---------------- |
| `preferences_append_identifiers` | false             | false            |
| `preferences_update_identifiers` | true              | true             |
| `preferences_delete_identifiers` | true              | false            |

Annotations are static per tool, so a merged tool must advertise the most
conservative combination and would over-warn on the safe path. Keep them split
— but then apply the [distinguishability test](#naming-and-domain), because
these three are exactly the cluster that causes misrouting.

</details>

## Checklist

Copy this and fill it in. Numbers match the sections below.

```
- [ ] 0. Existence: cannot be absorbed by an existing tool
- [ ] 1. Name: domain-prefixed, consistent verb, distinguishable from siblings
- [ ] 2. Vocabulary: 3 caller queries written; their terms appear in the tool text
- [ ] 3. Input schema: every field has a describe(); enums point somewhere
- [ ] 4. Safety: readOnly + annotations argued for, not copied
- [ ] 5. Errors: name valid alternatives, the right tool, and how to get access
- [ ] 6. Response: default-trimmed, paginated, no per-call noise
- [ ] 7. Description: within budget; catalogs relocated, not inlined
- [ ] 8. Tier: declared, and defaults to extended
```

## 1. Naming and domain

**Prefix with the domain.** `inventory_list_sub_data_points`, not
`list_sub_data_points`. This buys two distinct things: it makes domain scoping
possible at all (the single largest retrieval win available), and it puts the
domain term into the indexed text.

**Prefix with the word the caller uses, not the internal one.** The prefix only
matches when the caller names the domain. `inventory_` matches "list the data
silos in our inventory" and does nothing for "what systems are in our data map."
If callers use a different word for the domain, that word belongs in the
description.

**Keep verbs consistent across the whole server.** Pick one set —
`list`/`get`/`write`/`analyze` — and never introduce a synonym for one of them.
Inconsistent verbs make scoping unpredictable and add noise terms.

<a id="naming-and-domain"></a>
**Distinguishability test (sibling collision).** Given only the name and the
first line of the description, can you tell two same-domain tools apart? If not,
the agent can't either. Fix by making the description's first clause state the
_distinguishing_ fact, not the shared one.

```
Bad  — differ only by verb, share every other term:
  preferences_update_identifiers: "Update existing identifiers for a user"
  preferences_append_identifiers: "Append additional identifiers to a user"

Better — lead with what makes the choice:
  preferences_update_identifiers: "Rewrite an existing identifier value, moving
    its consent history to the new value. Old value stops resolving."
  preferences_append_identifiers: "Add another identifier that resolves to an
    existing user. Leaves current identifiers intact."
```

**Cross-domain collision check.** Before adding a tool, grep the catalog for its
distinctive terms. If another domain already owns a term, you will steal its
queries. `assessments_list_groups` captures queries containing "group,"
including ones meant for `admin_list_teams`.

## 2. Caller vocabulary

The highest-leverage item on this list, and the one most often waved through
because it reads as a platitude. Make it a test.

**The three-query test.** Before writing the description, write three queries a
real user would type — phrased without looking at the tool name. Then check
every significant term appears somewhere in the tool's name, description, or
parameter descriptions.

```
Tool: admin_list_api_keys
Queries: "what credentials do we have"
         "show me our API tokens"
         "who has access keys in this org"
Terms to cover: credentials, tokens, access keys
```

If a term is missing, add it. If it does not fit the budget, it displaces prose
— synonyms outrank explanation, because an unfound tool's description is worth
nothing.

**Failure modes this catches**, all real:

| Tool                     | Caller says   | Tool text says | Result             |
| ------------------------ | ------------- | -------------- | ------------------ |
| `admin_list_api_keys`    | "credentials" | "API keys"     | zero term overlap  |
| `admin_get_current_user` | "signed in"   | "authenticated"| zero term overlap  |
| `admin_list_teams`       | "groups"      | "teams"        | wrong domain wins  |

Write descriptions in the caller's vocabulary throughout, not just for
synonyms. Internal product nouns, service names, and table names are invisible
to callers and should not appear unless callers say them.

## 3. Input schema

- **Every field gets a `describe()`.** No exceptions — parameter descriptions
  are indexed text and are often where caller vocabulary fits when the
  description is full.
- **Describe the field's meaning, not its type.** `"Partition/organization
  context"` beats `"partition string"`.
- **Never inline a large enum.** Point at where the values live (see
  [Description budget](#description-budget)).
- **Give optional fields real defaults**, and make the default the cheap
  behavior — see `includeDetails` in [Response shape](#response-shape).
- **Prefer one flexible tool over several narrow ones**, but only where the
  parameter shape stays coherent. A parameter that is required only when
  another parameter has a specific value is a sign you merged too far.

## 4. Safety contract

<a id="safety-contract"></a>

The only item on this list where being wrong is a security bug rather than a
performance cost. Hosts use annotations to decide whether to **auto-approve** a
call without showing the user.

Each tool must declare, and the review must argue, all of:

| Field                            | Question                                                        |
| -------------------------------- | --------------------------------------------------------------- |
| `readOnly`                       | Does this mutate anything at all?                               |
| `annotations.readOnlyHint`       | Same answer as `readOnly` — must not disagree.                  |
| `annotations.destructiveHint`    | Can this remove or overwrite data a caller can't reconstruct?   |
| `annotations.idempotentHint`     | Does calling it twice with the same args equal calling it once?  |
| `confirmation`                   | Should a human see the arguments before this runs?               |
| visibility / capability gating   | Should this be hidden when the client can't support it?          |

Rules:

- **Never copy an annotation block from a neighboring tool.** The
  `preferences_*_identifiers` table above shows three adjacent tools with three
  different correct answers.
- **One tool, one safety class.** If a tool's destructiveness depends on its
  arguments, split it.
- **A `confirmation` hint must name what is at stake and what to check**, in the
  caller's terms — it is shown to a human, so it is prose, not a label:

  ```
  "Rewrites identifier values in the preference store, moving the consent
   history attached to each old value onto the new one. The old values stop
   resolving. Check the old and new values in the call arguments before agreeing."
  ```

- **Never return secrets silently.** If a response contains a
  once-only token, say so in the payload, not only in the description.

## 5. Errors

Errors are the recovery path for everything above. Assume the agent will reach
for the wrong tool and pass the wrong arguments, because retrieval on paraphrased
intent is unreliable.

Every error needs a machine-readable code, a retryable flag, and a message that
tells the agent what to do next. Four requirements:

**Name the valid alternatives.** Not "invalid scope" but:

```
"Unknown scope. Call admin_list_scopes for valid ScopeName values."
```

**Name the right tool when the caller picked wrong.** This is the cheapest
backstop for retrieval failure that exists. If a tool is called with arguments
that clearly belong to a sibling, say which sibling.

**Say how to obtain missing access.** An authorization failure should carry the
route and the required scopes as structured details, not just a 403 message.

**Distinguish "no results" from "lookup failed."** Never return empty success
for not-found. An empty list and a filter that matched nothing are different
states, and agents conflate them.

Anti-patterns: passing raw upstream error text through untranslated; `retryable`
defaulting to true on non-transient failures; a stack trace where a next step
belongs.

## 6. Response shape

<a id="response-shape"></a>

Descriptions get capped by review. Responses usually don't, and they are far
larger — a single fetch returning 120,000 characters dwarfs every description in
the catalog combined. Budget both.

- **Trim by default, expand on request.** Ship a compact row shape and an
  `includeDetails`-style boolean defaulting to `false`:

  ```ts
  includeDetails: z
    .boolean()
    .optional()
    .default(false)
    .describe('When true, add description and products. Default false returns compact rows.'),
  ```

- **Paginate by token budget, not record count.** Twenty records of one shape
  and twenty of another differ by an order of magnitude. Cap the serialized
  size and report truncation explicitly.
- **Set a default limit.** An unbounded list tool will eventually be called
  unbounded.
- **Use flat/tabular shapes for flat data.** Repeating JSON keys per row is pure
  overhead at scale.
- **Strip per-call noise.** A `timestamp: new Date().toISOString()` on every
  result carries no information the caller lacks, and makes responses
  non-deterministic in a way that defeats prompt caching.
- **Declare an `outputSchema`** where the protocol supports it. It enables
  programmatic composition and lets callers avoid parsing prose.

## 7. Description budget

<a id="description-budget"></a>

Set two numeric caps and enforce them in CI: **per-tool description length** and
**total `tools/list` payload size**. The specific numbers matter less than
having them fail a build.

```ts
const MAX_TOOL_DESCRIPTION_CHARS = 700;
const MAX_TOOLS_LIST_JSON_CHARS = 85_000;
```

Assert the full list size against the serialized descriptors — name,
description, `inputSchema`, and `annotations` — since schemas often outweigh
prose. Prefer trimming or consolidating over raising the cap.

**The relocation pattern.** When a description wants to embed a catalog, enum,
or lookup table, extract it into a companion `list`-style tool and have the
description and the validation error point at it.

```
Before: admin_create_api_key inlined the entire scope catalog in its description.
After:  the catalog moved to admin_list_scopes; the description now says
        "Call admin_list_scopes for valid names, titles, and dependencies."
```

That one relocation is why an 81-tool catalog serializes to ~76,000 chars
instead of blowing the 85,000 cap. The always-loaded cost became an on-demand
one.

**Declare tool dependencies.** If a description references another tool by name,
that is a real dependency — it breaks silently if toolsets are split so the pair
lands on opposite sides. Record it, and check it when partitioning.

**Overflow destinations, in order of preference:** a companion list tool → an
MCP resource → external docs. Docs are last because they are only reachable if
the server has real docs search. If docs lookup is title-substring matching,
"put it in the docs" is close to "delete it."

## 8. Tier

Declare a tier for every tool. **Default to extended; core requires
justification.** A default-core policy produces an all-core server.

The criterion is not importance, it is **interference**. The most heavily
populated domains are the worst distractors, because their tools surface in
top-k results for queries they have nothing to do with. A tool that closely
resembles many others is a candidate for extended even when it is frequently
used.

When a tool is not loaded, its absence must be recoverable: an agent that needs
it should be able to find out it exists and how to enable it. A capability error
that names the missing toolset is the minimum.

## Review output format

```markdown
## Tool review: <tool_name>

**Verdict:** Approve / Approve with changes / Needs rework

| # | Item        | Verdict | Note                                          |
| - | ----------- | ------- | --------------------------------------------- |
| 0 | Existence   | Pass    | No existing tool covers writes to this entity |
| 1 | Naming      | Fail    | Indistinguishable from `x_update_y` on line 1 |
| ... |

### Required changes
1. <specific rewrite, with the replacement text>

### Optional
1. <suggestion>
```

Quote the replacement text rather than describing it. A review that says
"improve the description" produces no change.

## Anti-patterns

| Pattern                                       | Why it fails                                              |
| --------------------------------------------- | --------------------------------------------------------- |
| One tool per API endpoint                     | Near-duplicates cost recall on every sibling              |
| Internal product nouns in descriptions        | Callers never type them, so the tool is unreachable       |
| Annotations copied from the neighboring file  | Adjacent tools routinely have different correct answers   |
| Enum catalog inlined in a description         | Always-loaded cost for rarely-needed data                 |
| `describe()` omitted on a parameter           | Discards indexed text where vocabulary fits for free      |
| Raw upstream error passed through             | Agent gets a symptom with no next step                    |
| Empty success for not-found                   | Agent cannot distinguish "none" from "failed"             |
| Unbounded list response                       | Uncapped context cost, unlike the capped description      |
| Description says "improve" / "handle properly"| Not a spec; nothing is verifiable                         |
