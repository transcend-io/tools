---
'@transcend-io/cli': patch
---

Migrate from `inquirer` to `@inquirer/prompts`

- Replace legacy `inquirer` and `inquirer-autocomplete-prompt` with `@inquirer/prompts` and `@inquirer/autocomplete`
- Remove custom `inquirer.ts` helper and `inquirer-autocomplete-prompt` type declaration
- Update all interactive prompt call sites to use the new `@inquirer/prompts` API
