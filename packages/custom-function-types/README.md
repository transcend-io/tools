# Custom Function types

TypeScript types and JSON Schemas for building Transcend Custom Functions:

- handler arguments and payloads;
- the Custom Function software development kit and key-value store;
- test payloads for General and data subject request (DSR) functions.

## Install

```sh
npm install --save-dev @transcend-io/custom-function-types
```

For a Deno-only project, pin the npm package in the type-only import:

```ts
import type { CustomFunction } from 'npm:@transcend-io/custom-function-types@0.1.0';
```

## Type a Custom Function

```ts
import type { CustomFunction } from '@transcend-io/custom-function-types';

export async function enricher({ payload }: CustomFunction.EnricherArgument): Promise<void> {
  console.info(`Enriching ${payload.requestIdentifier.name}`);
}

export default async function customFunction({
  payload,
  sdk,
}: CustomFunction.Argument): Promise<void> {
  console.info(`Running ${payload.type}`);
  await sdk.ping();
}
```

The `CustomFunction` namespace is already available when writing code in
Transcend's Custom Function editor, so no import is needed there.

## Validate test payloads

The root module exports generated schema constants and a typed selector:

```ts
import {
  CustomFunctionSchemaType,
  getCustomFunctionPayloadSchema,
} from '@transcend-io/custom-function-types';

const schema = getCustomFunctionPayloadSchema(CustomFunctionSchemaType.DsrDataPoint);
```

The generated draft-07 JSON Schemas are also available from the package's
`./schemas/*` exports.

## Compatibility and versioning

The package follows semantic versioning:

- patch releases clarify documentation or schema metadata without changing
  accepted values;
- minor releases add backward-compatible types or optional fields;
- major releases remove exports or narrow values accepted by existing code.
