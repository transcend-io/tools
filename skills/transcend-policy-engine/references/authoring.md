# Idiomatic Rego and document-tree authoring

## Start from the document tree

OPA evaluates queries against one document tree:

- `input` is the request-specific document supplied by the caller.
- `data` contains loaded policy packages and static data.
- A Rego `package` determines where a module contributes documents below `data`.

Choose package paths from the application's required query and ownership boundaries. Keep directory and package names aligned when practical, and cover every publishable package with a `manifest.json` root.

Use Rego v1 explicitly:

```rego
package policy_engine.example

import rego.v1
```

When one publishable package reads another package under the same manifest root, import it and use the local name:

```rego
import data.policy_engine.facts

allow if facts.subject_is_trusted
```

Do not use a fully qualified `data.policy_engine...` reference directly in a rule body. Policy Engine re-namespaces package declarations and imports during activation, and `transcend policy lint` rejects direct self-root references that would change meaning.

## Define the contract before implementation

Find the actual caller and document:

1. the query path below `data`;
2. required and optional `input` fields;
3. the result document consumed by the caller;
4. fail-closed behavior for absent, malformed, or unknown input;
5. stable reason codes and any fields reserved for later extension.

Do not infer a product contract from the generated example. Replace its package names and fields when the repository's contract is known.

## Prefer declarative result construction

String decisions inside an object remain readable and extensible. Keep one result document shape and derive its fields from named rules:

```rego
default decision := "deny"

decision := "allow" if {
	input.subject.trusted == true
}

default reason_code := "untrusted_or_invalid_input"

reason_code := "trusted_subject" if {
	decision == "allow"
}

result := {
	"decision": decision,
	"reason_code": reason_code,
}
```

Rego rules define documents; they are not an imperative sequence of variable assignments. Prefer small named predicates and one result constructor over repeated branch-specific copies of the full output object.

## Fail closed

- Give the externally queried decision or result a deny/error default.
- Treat missing fields and unknown enum values as non-authorizing.
- Avoid broad truthiness checks when exact values are required.
- Add tests for malformed and incomplete inputs, not only expected allow cases.
- Add result fields compatibly so existing consumers can continue reading the stable core.
