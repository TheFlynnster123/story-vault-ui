# Async Controls

## Purpose

Async Controls are the standard handoff from background work to a user decision.
They make unfinished approvals visible without blocking chat, writing transient
messages into chat history, or reopening a modal over the user's current work.

Examples include:

- Reviewing a generated chapter draft.
- Approving a completed plan suggestion.
- Resolving a background import or migration conflict.
- Retrying background work that requires user attention.

## Placement

Async Controls appear directly beneath Quick Chat Controls in a vertical stack
at the top-right of the chat page.

Each pending item gets its own icon button. New controls stack downward in the
order they become actionable. They do not appear inside the Quick Chat Controls
modal because the outstanding action must remain visible while the modal is
closed.

## Visual Standard

Every Async Control must have:

- A feature-specific icon.
- The feature's primary, secondary, and border colors.
- A small red attention indicator at the button's top-right.
- A concise tooltip and matching accessible label that names the required
  action, such as **Review chapter draft**.

The red indicator means “you have something to do,” not merely “work is
running.” A control should therefore appear only when user action is possible.
Background progress remains a toast or feature-specific status.

`AsyncActionControl` implements this shared visual and accessibility contract.
Callers provide the icon, label, theme, and action.

## Lifecycle

1. Start background work without blocking the current interaction.
2. Show transient progress through a toast or inline status.
3. Persist the result when it becomes actionable.
4. Add an Async Control beneath Quick Chat Controls.
5. Open the appropriate review, approval, retry, or conflict-resolution UI when
   selected.
6. Remove the control only after the user completes or explicitly discards the
   action.

Failed work may use an Async Control when retry or correction is possible. Its
label must state the recovery action, for example **Retry chapter draft**.

## State and History

Async Controls represent application workflow state, not story content.
Their status should not be committed to chat history.

Actionable state should be recoverable across modal closure and navigation. If
losing the work would be surprising, persist it across refresh as well. The
control must be derived from that source of truth rather than from independent
component state.

## Chapter Example

Chapter generation shows a progress notification while the model runs. Once the
draft is ready, a chapter-themed button with the chapter icon and red attention
indicator appears beneath Quick Chat Controls. Selecting it opens the shared
chapter review editor. Creating or discarding the draft removes the control.

Generation failures use the same location with the accessible label
**Retry chapter draft**.

## Character Sheet Example

Preparing Character Sheet updates persists a proposal and adds a
character-themed control with the accessible label **Review character
updates**. Selecting it opens the shared review modal.

Each affected character must be confirmed or dismissed independently before
the decisions can be applied. Only confirmed changes update Character Sheets;
dismissed characters remain unchanged. The control disappears after the
decisions are applied or the entire proposal is dismissed.

## Agent Flow Example

Automatic Agent Flow analysis persists actionable suggestions for review. When
an analysis proposes one or more workflow actions, an Agent Flow-themed control
with the accessible label **Review Agent Flow suggestions** appears beneath
Quick Chat Controls.

Selecting it opens a review modal with the reasoning behind each suggested
action. Confirming an action runs it and removes it from the pending review. The
control remains visible while other actions are unresolved and disappears only
after every action is confirmed or the user selects **Dismiss suggestion**.

Another analysis does not replace an unresolved suggestion. Suggestions with no
executable actions do not create an Async Control.

## Implementation Checklist

- Is the item actionable now?
- Is its state recoverable?
- Does it use `AsyncActionControl`?
- Does it use the owning feature's theme and icon?
- Does the label describe the user action?
- Does the red indicator disappear only after completion or explicit discard?
- Is transient status kept out of chat history?
- Are keyboard activation and accessible naming covered by tests?
