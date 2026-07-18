# Characters

Character Sheets now separate narrative identity from physical appearance,
track which characters are active, and require approval before model-generated
changes affect saved character state.

## What changed

### Identity-focused Character Sheets

- Character Sheets are stored and edited as explicit bullet items.
- Each item describes who the character is: personality, beliefs, motivations,
  goals, fears, relationships, voice, habits, boundaries, or other stable
  constraints.
- Sheets exclude scene actions, plot chronology, current location, temporary
  conditions, and physical appearance.
- The update model receives the complete current list and must return a complete
  replacement list. It can preserve, revise, or remove items.
- The structured response is bounded to ten concise items per character.

Character Appearance remains a separate field used only by image generation.

### Active characters

Each character has two activity values:

- `detectedActive` is proposed by the active-cast model.
- `activeOverride` is an optional user choice.

The effective value is `activeOverride ?? detectedActive`. A user can switch a
character on or off at any time and later choose **Use automatic activity** to
return control to active-cast detection.

Only approved, effectively active, non-empty Character Sheets enter text-model
context. Appearance never enters that context.

### Automatic synchronization

Per-chat settings on the Characters page control:

- whether synchronization is enabled;
- the number of saved user turns between runs; and
- how many recent messages remain after durable character context.

When due, synchronization:

1. Determines the active cast from recent scene messages.
2. Reconciles canonical names and conservatively discovers new named primary
   characters.
3. Sends every effectively active character and their full current bullet list
   to the sheet-update model.
4. Validates that every requested character appears exactly once.
5. Saves a proposal without changing character records.

This work runs after a user message is saved and does not delay the normal
assistant response. Existing chats migrate with automatic synchronization off;
new chats start with it on and a three-turn cadence.

### Approval through Async Controls

Automatic synchronization and per-character **Generate sheet** /
**Update sheet** actions never apply model output directly.

An actionable proposal is stored in the encrypted
`character-update-proposal` managed blob. A character-themed
**Review character updates** Async Control appears beneath Quick Chat Controls.
The review shows activity and sheet changes, including current and proposed
bullet lists.

The user may:

- confirm or dismiss each character independently, then apply the confirmed
  set;
- dismiss the complete proposal; or
- close the review and return later.

Approval re-reads current characters and rejects the confirmed set if any
affected record changed after generation or if a confirmed new name now
conflicts with an existing record. The confirmed set is applied atomically; an
unchecked or dismissed character is an explicit user decision, not a partial
failure. A conflicted proposal remains available until dismissed.

### Manual triggers

Users can prepare the same approval-gated update workflow from:

- **Prepare Character Sheet Updates** in Quick Chat Controls;
- **Prepare updates now** in the Characters settings panel; or
- **Generate sheet** / **Update sheet** on an individual character card.

Only one unresolved character proposal is kept at a time, so a new run cannot
silently replace work awaiting a decision.

### Characters page and Flow

Character synchronization settings now appear in a dedicated panel at the top
of the Characters page. Character cards provide:

- name and appearance editing;
- explicit bullet add/edit/delete controls;
- effective activity and override controls;
- per-character generation/update;
- preferred image-model selection; and
- deletion.

The Character Flow entry is intentionally compact and shows only the active and
total counts before navigating to the full page.

## Migration

Character schema version 3 replaces legacy `sheet?: string` with
`sheetItems: string[]` and adds activity state.

- Markdown-only legacy bullet sheets become individual items.
- Legacy prose is preserved as one item to avoid lossy interpretation.
- Missing activity defaults to active.
- The character blob is saved before the schema-version setting.
- Legacy cadence values are normalized into the canonical settings.
- Legacy enablement does not automatically opt an existing chat into the new,
  broader synchronization behavior.

## Further simplification opportunities

- Retire legacy character-setting and system-prompt decoder fields after the
  migration window described by the repository’s compatibility policy.
- Move shared proposal/conflict primitives into a generic approval workflow if
  more features adopt the same Async Control pattern.
- Add per-item provenance only if users need to understand why an individual
  fact was proposed; avoid it while the complete-list workflow remains clear.
- Consider a combined background-maintenance scheduler if Character Sheets and
  Agent Flow eventually need shared cadence or request coordination.
