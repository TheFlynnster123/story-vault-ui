  This gives us:

  - Omitted means false.
  - Callers cannot clutter configs with explicit false.
  - {} returns no context and fetches nothing.
  - Plan generation can request { history: true }.
  - Book generation can request { characterSheets: true }.
  - Chat can explicitly request all applicable sources.
  - Each selection remains locally owned by its pipeline.

  artifacts/context/story-vault-llm-request-context-inventory-2026-07-26.html

  No production code was changed.
