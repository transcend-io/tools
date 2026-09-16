# Idiomatic Rego and document-tree authoring

## Start from the document tree

OPA evaluates queries against one document tree:

- `input` is the request-specific document supplied by the caller.
- `data` contains loaded policy packages and static data.
- A Rego `package` determines where a module contributes documents below `data`.

Choose package paths from the application's required query and ownership
boundaries. Keep directory and package names aligned
(`directory-package-mismatch`), and cover every publishable package with a
`.manifest` root.

### Multi-bundle template layout

Prefer a publish directory named `{root}-bundle/` so the package-root folder can
be `{root}/` without doubling names:

```
example-bundle/               # transcend policy publish … <dir>
  .manifest                   # roots + optional metadata.transcend.io.template / templateVersion
  example/
    result/…                  # package example.result
  input.example.json
  input.json                  # gitignored; VS Code / Regal Evaluate
  input.schema.json           # input JSON Schema for editors and opa --schema
```

Permissions starters use the same layout. Upload does not branch on template
metadata; Permissions API still loads only the remote bundle named
`permissions` (publish with `--remote-bundle-name=permissions`). Local folder
(`--bundle-dir` / `{root}-bundle/`) and remote `--remote-bundle-name` are independent.

OPA `.rego` placement follows the `package` line; `data.json` paths follow the
filesystem and must sit under the manifest root prefix on disk.

Use Rego v1 explicitly:

```rego
package example.result

import rego.v1
```

When one publishable package reads another package under the same manifest root,
import it and use the local name:

```rego
import data.example.facts

allow if facts.subject_is_trusted
```

Do not use a fully qualified `data.<root>…` reference directly in a rule body.
Policy Engine re-namespaces package declarations and imports during activation,
and `transcend policy lint` rejects direct self-root references that would
change meaning.

## Define the contract before implementation

Find the actual caller and document:

1. the query path below `data`;
2. required and optional `input` fields;
3. the result document consumed by the caller;
4. fail-closed behavior for absent, malformed, or unknown input;
5. stable reason codes and any fields reserved for later extension.

Do not infer a product contract from the generated example. Replace its package
names and fields when the repository's contract is known.

Keep the input JSON Schema as `input.schema.json` in the publish directory.
Pass that file to `opa check -s` / `transcend policy eval --schema` when you want
OPA to type-check `input`.

## Prefer declarative result construction

String decisions inside an object remain readable and extensible. Keep one
result document shape and derive its fields from named rules:

```rego
default decision := "deny"

decision := "allow" if {
	input.subject.trusted == true
}

default reason_code := "untrusted_or_invalid_input"

reason_code := "trusted_subject" if {
	decision == "allow"
}
```

Rego rules define documents; they are not an imperative sequence of variable
assignments. Prefer small named predicates and one result constructor over
repeated branch-specific copies of the full output object.

## Fail closed

- Give the externally queried decision or result a deny/error default.
- Treat missing fields and unknown enum values as non-authorizing.
- Avoid broad truthiness checks when exact values are required.
- Add tests for malformed and incomplete inputs, not only expected allow cases.
- Add result fields compatibly so existing consumers can continue reading the
  stable core.
