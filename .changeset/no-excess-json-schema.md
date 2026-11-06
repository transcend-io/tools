---
"@transcend-io/type-utils": minor
---

`toJsonSchema` now supports `noExcess` codecs. The wrapped object schema gets `additionalProperties: false`, and a wrapped intersection is merged into one object schema first.
