# Character Appearance Migration Retirement

## Purpose

Version 2 renamed the persisted image-focused character field from
`description` to `appearance`. Version 3 replaces the narrative `sheet` string
with `sheetItems` and adds activity state. Existing chat blobs are encrypted and
migrated by the client when their characters are first accessed.

This document defines how to retire the migration safely.

## Active migration behavior

For a chat whose `ChatSettings.charactersSchemaVersion` is missing or lower
than `3`:

1. Read the existing `character-descriptions` blob.
2. Convert each v1 record's `description` value to `appearance` if no
   `appearance` exists.
3. Convert the v2 `sheet` string to version 3 `sheetItems` and initialize
   activity state.
4. Save the converted records to the same blob.
5. After the character save succeeds, set `charactersSchemaVersion` to `3`.

The order is intentional. If the settings write fails, the next attempt repeats a safe, idempotent conversion.

New chats must be created with `charactersSchemaVersion: 3`.

## Compatibility fallback

While the migration exists, all readers of character appearance must tolerate both shapes:

```ts
const appearance = character.appearance ?? character.description ?? "";
```

This fallback is required because users can return to an encrypted chat long after a calendar-based migration window. The application cannot guarantee that every offline or dormant chat has been opened and rewritten.

## Retirement gates

Do not remove the migration merely because a few weeks have elapsed. Begin retirement only when all of these are true:

- The v3 release has been available for the agreed support window.
- New-chat creation has written version `3` throughout that period.
- Client telemetry or an explicit support audit shows no recent accesses needing a v1 migration. If telemetry is unavailable, extend the compatibility window instead of assuming completion.
- The release notes announce the final legacy-compatibility removal date.
- A final test fixture proves that a known v1 blob is either migrated by a supported release or intentionally handled by the fallback.

## Two-stage removal

### Stage 1: stop automatic migration writes

In a scheduled cleanup release, remove the per-chat write migration and version-update path. Keep the read fallback in place:

```ts
const appearance = character.appearance ?? character.description ?? "";
```

This stops repeated migration checks without making dormant chats unreadable. Keep the legacy `description?: string` property in the decoder type for this stage.

### Stage 2: remove v1 read compatibility

Only in a later breaking-change release, after the gates above have remained satisfied for an additional support window:

1. Remove `description` from the legacy decoder/type.
2. Remove the fallback and read only `appearance`.
3. Remove `charactersSchemaVersion` only if no future migration will use it. Prefer retaining the version field; it is inexpensive and supports later schema upgrades.
4. Delete v1 fixtures and replace them with an explicit changelog entry documenting the unsupported version.

## Verification checklist

- A v1 record migrates `description` to `appearance` without changing its ID, name, dates, or preferred image.
- A partially migrated record with both values preserves `appearance` as the authoritative value.
- A failed settings write leaves the data safe to retry.
- A dormant v1 chat still renders an appearance during Stage 1.
- A new v3 chat never invokes the migration path.
