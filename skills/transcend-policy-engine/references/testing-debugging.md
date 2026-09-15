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

Keep a sanitized `input.example.json` in each publish directory. Put realistic
local data in `input.json` there (gitignored). VS Code / Regal Evaluate look for
a file named `input.json` beside the policy or in a parent directory.

Do not put credentials, personal data, or production payloads in fixtures unless
repository policy explicitly permits sanitized versions.

## Run the complete gate

Lint and test **each** publish directory (CLI ≥ 11 uses a positional directory):

```sh
transcend policy lint transcend/policy/example-bundle --noInteractive
transcend policy test transcend/policy/example-bundle
opa check --strict -b transcend/policy/example-bundle -s transcend/policy/schemas
```

`policy lint` / `policy test` currently invoke directory-mode `opa test` (not
`-b`). If both `input.json` and `input.example.json` are present, OPA can report
`input.json: merge error`. CI only has the committed example file. Locally use:

```sh
opa test --fail-on-empty -b transcend/policy/example-bundle
```

Use `transcend policy lint --help` for formatter flags. Review Regal findings
deliberately instead of applying broad rewrites.

## Evaluate a query

```sh
transcend policy eval --pkg data.example.result \
  --input transcend/policy/example-bundle/input.json \
  transcend/policy/example-bundle
```

Or `opa eval -b … -i …` with the caller's query path. If the result differs from
expectations, inspect package paths, imports, defaults, input field presence,
and the selected bundle directory before changing policy logic.
