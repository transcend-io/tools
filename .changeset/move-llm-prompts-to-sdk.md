---
'@transcend-io/sdk': minor
'@transcend-io/cli': minor
---

Move LLM and prompt fetch GraphQL functions from CLI to SDK

- Add to `ai/` module in SDK: `fetchAllLargeLanguageModels`, `fetchAllPrompts`, `fetchPromptsWithVariables`, `fetchAllPromptGroups`, `fetchAllPromptPartials`, `fetchAllPromptThreads`
- All imports updated to use `@transcend-io/sdk` directly
