---
"@transcend-io/type-utils": minor
---

`toJsonSchema` now supports `noExcess` codecs. A strict intersection of objects is also merged into one object schema, so `additionalProperties: false` does not reject the other member's keys.
