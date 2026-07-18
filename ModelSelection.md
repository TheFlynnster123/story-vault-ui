# Model Selection

Current model selection has a few short comings -

## Field Clarity

The fields aren't super clear to novice users. What is temperature? What are the K or P values? We should describe each field, and also describe what typical ranges might be.

## Re-selection

The user may swap between models semi-regularly, and, when they do, they'd need to reconfigure the model *each* time! We should allow them to save presets and reselect them!

## Edit/View

When we click the model that is configured, there's an interesting hitch - we can't see what's currently configured or make *slight* tweaks. We only see the default, and have to re-build our model config from there.

# TODO

Implemented:

- Every advanced field now includes a plain-language explanation and practical
  starting ranges. The selector only displays parameters supported by the
  chosen OpenRouter model.
- Named presets persist a model and all of its request settings in a global
  per-user managed blob, so they follow the signed-in user across devices.
  Saved presets appear at the top of the selector for quick reuse and can be
  deleted when no longer useful.
- Each model's centered disclosure arrow expands its advanced settings inline.
  The selected model starts expanded with its current configuration so users
  can review, reset, slightly adjust, select, or save it as a preset.
- Model and preset behavior is covered by focused component and service tests.

## Refactor opportunities

- `ModelSelectorModal` owns model grouping, virtualization, preset controls,
  advanced-field rendering, and modal behavior. Extracting the presentation
  pieces into adjacent components would make future UI changes safer once this
  area needs another feature.
- The modal and `ModelSelect` currently use inline styles. Moving their shared
  controls and colors into styled components or the Mantine theme would reduce
  duplication and make interaction states more consistent.
- Recent models remain a browser-local convenience, while named presets use
  account storage. If recent-model synchronization is desired later, it can
  move to the same global managed-blob pattern.
