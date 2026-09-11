# Testing and debugging

## Write executable tests

Place tests next to the package they exercise and suffix test modules with `_test.rego`. A separate `_test` package makes the production API and test helpers easy to distinguish:

```rego
package policy_engine.example_test

import data.policy_engine.example
import rego.v1

test_denies_missing_input if {
	result := example.result with input as {}
	result == {
		"decision": "deny",
		"reason_code": "untrusted_or_invalid_input",
	}
}
```

Cover at least:

- the ordinary allow case;
- explicit deny cases;
- absent, malformed, and unknown input;
- important result fields and reason codes;
- interactions between packages when one policy reads another document.

`transcend policy lint` invokes `opa test --fail-on-empty`, so an empty suite fails validation.

## Use local inputs safely

Keep a sanitized `input.example.json` in source control. Put realistic local data in the target-local `input.json`, which the generated `.gitignore` excludes. Do not put credentials, personal data, or production payloads in fixtures unless repository policy explicitly permits sanitized versions.

## Run the complete gate

```sh
transcend policy lint ./transcend/policy --noInteractive
```

Use `transcend policy lint --help` to inspect `--fix` and JSON output. The lint gate checks:

- manifest shape and package-root coverage;
- compatible OPA and Regal versions;
- OPA formatting;
- a strict production-only OPA check that excludes local test modules;
- Regal lint with warnings treated as failures;
- non-empty OPA tests.

Use `--fix` only for OPA formatting. Review Regal findings deliberately instead of applying broad rewrites.

## Evaluate a query

Use `transcend policy eval --help` to construct a local query with a sanitized input file and optional bundle directory. Evaluate the exact query used by the caller. If the result differs from expectations, inspect package paths, imports, defaults, input field presence, and the selected bundle root before changing policy logic.
