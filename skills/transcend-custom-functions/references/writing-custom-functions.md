# Writing Custom Functions

## Add a function

Initialize the project first, then scaffold a function:

```sh
transcend custom-functions new
```

Choose the smallest matching template:

- `general` for a General Custom Function
- `dsr-datapoint` for the DSR data-point handler
- `dsr-enricher` for the DSR request enricher
- `dsr-both` when both DSR exports are required

Inspect the generated source, manifest entry, and payloads before implementing. Keep the generated export shape unless the manifest and fixtures change with it.

## Type contracts

Import `CustomFunction` as a type from `@transcend-io/custom-function-types`:

- General functions default-export a handler using `CustomFunction.GeneralArgument`.
- DSR data-point functions default-export a handler using `CustomFunction.Argument`.
- DSR request enrichers export `enricher` using `CustomFunction.EnricherArgument`.

Handlers receive `payload`, `environment`, `sdk`, and `kv`. Use:

- `payload` for trigger data
- `environment` for configured values
- `sdk` for Transcend and external HTTP calls
- `kv` for small persistent strings

Check `response.ok` for every `sdk.fetch` call. Include the response status and useful response details in failures without exposing secrets.

## Manifest and fixtures

- Use `<<parameters.name>>` placeholders for local secret values.
- Add every external network destination to `allowed-hosts`. Transcend SDK routes do not require an allowed-host entry.
- Set `allow-third-party-imports` only when the implementation needs undeclared third-party modules.
- Keep fixtures minimal but realistic, with at least one case for every implemented export.
- Match DSR fixtures to `DATA_POINT` and `REQUEST_ENRICHER`. Do not hardcode values such as the data silo identity that the push workflow supplies.

## Validate and deploy

Run:

```sh
transcend custom-functions check "<custom-function-directory>"
transcend custom-functions push \
  --file="<custom-function-directory>/transcend-functions.yml" \
  --auth="$TRANSCEND_API_KEY" \
  --dryRun
```

Fix every check failure before pushing. Keep a revision as a draft with `--promote=false`. After the first successful push, use `--updateManifest` to record assigned IDs for stable future matching.
