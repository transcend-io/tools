---
'@transcend-io/sdk': major
---

Removed the SDK `ai` module and its root export. The backend no longer exposes the underlying large language model catalog, prompt thread, or prompt run message APIs.

**Removed exports:** `addMessagesToPromptRun`, `AddMessagesToPromptRunInput`; `fetchAllLargeLanguageModels`, `LargeLanguageModel`; `fetchAllPromptThreads`, `PromptThread`.