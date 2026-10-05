# Testing and debugging

## Write executable tests

Place tests next to the package they exercise and suffix test modules with
`_test.rego`. A separate `_test` package makes the production API and test
helpers easy to distinguish. Keep the `_test` package under the same manifest
root (for example `example.result_test`, not a sibling root), so bundle-mode
loads accept it.

```rego
package example.result_test

import data.example.result
import rego.v1

test_denies_missing_input if {
	result.decision == "deny" with input as {}
	result.reason_code == "untrusted_or_invalid_input" with input as {}
}
```

Cover at least:

- the ordinary allow case;
- explicit deny cases;
- absent, malformed, and unknown input;
- important result fields and reason codes;
- interactions between packages when one policy reads another document.

`transcend policy check` requires a non-empty test suite.

## Use local inputs safely

Keep a sanitized `input.example.json` in each publish directory. `policy new`
also writes a gitignored `input.json` beside it (same contents) so VS Code /
Regal Evaluate work immediately. Customize `input.json` locally; keep
`input.example.json` committed and free of credentials or personal data.

## Run the complete gate

With no directory argument, `policy check` and `policy test` verify every
immediate child under the workspace (`transcend/policy`) that contains a
`.manifest`. Pass one bundle path to target a single unit:

```sh
transcend policy check --noInteractive
transcend policy test
transcend policy check transcend/policy/permissions-bundle --noInteractive
transcend policy test transcend/policy/permissions-bundle
opa check --strict -b transcend/policy/permissions-bundle -s transcend/policy/permissions-bundle/input.schema.json
```

`policy check` and `policy test` run `opa test -b` (bundle mode) so a local
gitignored `input.json` beside `input.example.json` does not cause a merge
error. Prefer the CLI over raw directory-mode `opa test`. Strict OPA checks use
Rego v1 (no `--v0-compatible`).

Use `transcend policy lint` for OPA formatting and Regal only (with `--fix` to
repair formatting). Use `transcend policy check --help` for the full gate.
Review Regal findings deliberately instead of applying broad rewrites.

## Evaluate a query

`policy eval` requires an explicit local publish directory (`<bundle>`).

Generic example bundle:

```sh
transcend policy eval transcend/policy/example-bundle \
  --package=data.example.result \
  --input=transcend/policy/example-bundle/input.json
```

To simulate the Permissions API, pass the bundle, a purpose query (`--package`),
the local envelope (`--input`), and the bundle's input schema (`--schema`) so
OPA type-checks `input`:

```sh
transcend policy eval transcend/policy/permissions-bundle \
  --package=data.permissions.purposes \
  --input=transcend/policy/permissions-bundle/input.json \
  --schema=transcend/policy/permissions-bundle/input.schema.json
```

Or pipe the envelope with `--stdin-input`. `policy eval` ignores `*_test.rego`
(same as lint/publish — tests are not shipped). Use `transcend policy eval --help`
for curated `opa eval` pass-through flags (format, explain, metrics, and similar).
Exit-on-result flags like OPA `--fail` are not exposed — production Evaluate uses
the Data API (policy deny is a successful evaluation).

Or `opa eval -b … -i …` with the caller's query path. If the result differs from
expectations, inspect package paths, imports, defaults, input field presence,
and the selected bundle directory before changing policy logic.
