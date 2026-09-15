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

`transcend policy lint` requires a non-empty test suite.

## Use local inputs safely

Keep a sanitized `input.example.json` in each publish directory. `policy new`
also writes a gitignored `input.json` beside it (same contents) so VS Code /
Regal Evaluate work immediately. Customize `input.json` locally; keep
`input.example.json` committed and free of credentials or personal data.

## Run the complete gate

With no directory argument, `policy lint` and `policy test` verify every
immediate child under the workspace (`transcend/policy`) that contains a
`.manifest`. Pass one bundle path to target a single unit:

```sh
transcend policy lint --noInteractive
transcend policy test
transcend policy lint transcend/policy/example-bundle --noInteractive
transcend policy test transcend/policy/example-bundle
opa check --strict -b transcend/policy/example-bundle -s transcend/policy/schemas
```

`policy lint` and `policy test` run `opa test -b` (bundle mode) so a local
gitignored `input.json` beside `input.example.json` does not cause a merge
error. Prefer the CLI over raw directory-mode `opa test`. Strict OPA checks use
Rego v1 (no `--v0-compatible`).

Use `transcend policy lint --help` for formatter flags. Review Regal findings
deliberately instead of applying broad rewrites.

## Evaluate a query

`policy eval` requires an explicit bundle directory:

```sh
transcend policy eval transcend/policy/example-bundle \
  --package data.example.result \
  --input transcend/policy/example-bundle/input.json
```

Or `opa eval -b … -i …` with the caller's query path. If the result differs from
expectations, inspect package paths, imports, defaults, input field presence,
and the selected bundle directory before changing policy logic.
