# Workflow Image Model Migration Progress

## Goal

Make workflow image models the first-class format. Legacy job-based image models remain visible for compatibility, but they are read-only until the user explicitly migrates them to workflow format.

## Implementation Checklist

- [x] Audit image model, variant, selection, and generation call sites.
- [x] Add explicit workflow/legacy model classification helpers.
- [x] Move legacy job-to-workflow conversion into an explicit conversion service.
- [x] Stop automatically converting legacy models during reads.
- [x] Add migration actions for global and chat-scoped image models.
- [x] Lock editing and generation for legacy models until migration.
- [x] Update variant resolution/editing to require workflow models.
- [x] Update UI labels, badges, and disabled states.
- [x] Add coverage for converter, services, variants, and UI behavior.
- [x] Run tests and build.

## Notes

- Preserve model ids during migration so character selections, variants, and chat references continue to point at the same logical model.
- Treat only records stamped with `format: "workflow"` as editable workflow models.
- Treat unstamped records, including already-flat orchestration-shaped inputs, as legacy until explicit migration stamps them as workflow.
- Treat old nested job `params` input as legacy and require explicit migration.
- Do not silently persist conversion during reads.

## Current Implementation Notes

- `ImageModel` remains the workflow-only type used by generation and editors.
- Stored model collections now use `AnyImageModel`, a union of workflow and legacy job records.
- Legacy records are classified at read time and converted only through explicit migration methods.
- Workflow editability is explicit: only records stamped with `format: "workflow"` are treated as workflow models.
- Unstamped flat records from the earlier silent migration are treated as legacy until the user clicks `Migrate to workflow`.
- Global/chat model lists show a `Legacy image model` badge and disable selection until migration.
- Global/chat edit pages show a locked migration view for legacy records.
- Variant editing and selection require a workflow parent model.

## Verification

- `npm run build` passed.
- `npm run test-skip-stress` passed: 83 files, 1173 tests.
