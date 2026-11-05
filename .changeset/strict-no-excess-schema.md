---
"@transcend-io/type-utils": patch
---

`toJsonSchema` reads `noExcess` codecs, and it merges a strict intersection into one object schema so `additionalProperties: false` does not reject the other member's keys.
