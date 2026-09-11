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

- Use `<<parameters.ENV_NAME>>` placeholders for secret values, matching each placeholder name to its environment key.
- Add every external network destination to `allowed-hosts`. Transcend SDK routes do not require an allowed-host entry.
- Set `allow-third-party-imports` only when the implementation needs undeclared third-party modules.
- Keep each function self-contained in its entry source file. Local runtime imports are not deployed; remote and `npm:` imports follow `allow-third-party-imports`.
- Keep fixtures minimal but realistic, with at least one case for every implemented export.
- Match DSR fixtures to `DATA_POINT` and `REQUEST_ENRICHER`. Do not hardcode values such as the data silo identity that the push workflow supplies.

## Run locally

Exercise every configured fixture and show `console.log` output:

```sh
transcend custom-functions run "<custom-function-directory>" \
  --function="<function-name>" \
  --variables=TRANSCEND_API_KEY:placeholder
```

The local simulator mirrors Deno permissions, payload preparation, export selection, timeouts, environment isolation, and KV limits. It starts KV empty for each fixture and simulates `sdk.fetch` with a logged HTTP 200 response without making a request. Pass every `<<parameters.name>>` value through `--variables="name:value"`. Native network calls are denied unless the user explicitly passes `--allowNetwork`; those real requests can have side effects. Treat the simulator as a fast development loop, not proof of production behavior.

## Validate and deploy

Run:

```sh
transcend custom-functions check "<custom-function-directory>" \
  --variables=TRANSCEND_API_KEY:placeholder
transcend custom-functions push "<custom-function-directory>" \
  --auth="$TRANSCEND_API_KEY" \
  --variables="TRANSCEND_API_KEY:$TRANSCEND_API_KEY" \
  --dryRun
```

Run, check, and push require every manifest variable. Placeholder values are sufficient for local validation; pass real secrets only when they are needed for authenticated push tests or deployment. Fix every check failure before pushing. Keep a revision as a draft with `--promote=false`. After the first successful push, use `--updateManifest` to record assigned IDs for stable future matching.
