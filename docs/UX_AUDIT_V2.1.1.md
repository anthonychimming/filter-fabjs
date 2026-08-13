# Filter FabJS v2.1.1 UX audit

## Executive finding

The v2.1.0 interface had a destructive edit loop: formula input, validation, rendering, and global UI locking were treated as one action. A 110 ms debounce only delayed that loop; it did not separate the responsibilities. When rendering started, every textarea was disabled, so the browser removed focus before a user could finish a normal expression.

The v2.1.1 revision splits the workflow into three explicit states:

1. **Editing** — keystrokes remain uninterrupted.
2. **Validation** — formulas are parsed and compiled after a short pause without rendering.
3. **Rendering** — the user explicitly updates the preview with **Render** or **Ctrl/⌘ + Enter**.

## Findings and revisions

| Area | v2.1.0 issue | Impact | v2.1.1 response |
| --- | --- | --- | --- |
| Formula entry | Every input event scheduled a render. | Critical: the field disabled itself and lost focus mid-entry. | Removed render dispatch from formula input; added 220 ms validation only. |
| Mental model | The UI mentioned a shortcut but did not provide a visible primary render action. | High: mouse-first users could not confidently tell when the preview should update. | Added a prominent Render button with its shortcut shown in context. |
| Preview state | A valid checkmark did not say whether the canvas matched the formula text. | High: “valid” and “rendered” were visually conflated. | Added explicit **Preview current**, **Ready to render**, and **Fix formula errors** states. |
| Render locking | Intentional renders disabled the focused control and never restored it. | Medium: keyboard flow was broken even when Ctrl/⌘ + Enter was used correctly. | Capture and restore the focused element and text selection after rendering. |
| Validation errors | Error text was visual only and stale while the next edit was underway. | Medium: assistive technology lacked a reliable field/error relationship. | Added channel labels, `aria-describedby`, `aria-invalid`, and immediate stale-error clearing. |
| Control sliders | Range `input` events rendered during the drag. | Medium: sliders could lock under the pointer and send redundant work. | Values update continuously; rendering waits for the committed `change` event. |
| Keyboard focus | Most controls relied on browser-default focus treatment, which was weak against the dark UI. | Medium: keyboard navigation was easy to lose. | Added a consistent high-contrast `:focus-visible` ring. |
| Formula affordance | Edited formulas looked the same as the last rendered formulas. | Medium: pending work was easy to miss. | Added an amber edited border and matching pending-status treatment. |
| Small screens | Formula guidance and shortcut text competed with the editor at narrow widths. | Low: unnecessary crowding in the 410 px sidebar and mobile layout. | Collapse secondary guidance and shortcut text below 560 px. |

## Broader interface critique

The core workspace hierarchy is solid: preview on the left, authoring controls on the right, and persistent render diagnostics below. The dark, tool-like visual language fits the product and the RGBA color coding is immediately legible. The transparency treatment and original/filtered/split modes are also strong.

The weaker parts are information density and action hierarchy. The top toolbar contains image loading, clipboard, export, filter import/export, GitHub, and help in one strip. At mid-size desktop widths it wraps into a second row, changing the canvas height and making the interface feel less stable. A later pass should consolidate low-frequency import/export actions into a File menu while keeping **Open image** and **Export PNG** visible.

The preset header also gives Save, Delete, Reset, name, and author nearly equal visual weight. Reset is potentially destructive to an unsaved formula but has no dirty-state warning. A future revision should track project-level changes, distinguish “reset parameters” from “reset filter,” and warn only when work would actually be lost.

The formula quick reference is useful but dense. It behaves like documentation embedded inside the production controls. Searchable autocomplete, syntax insertion, and function signatures would eventually outperform a long chip list, but that belongs to a dedicated editor milestone rather than this bug fix.

The bottom status bar reports useful engine detail but can become a long, low-contrast sentence, especially after GPU fallback. A stronger diagnostics model would separate human status (“Rendered on CPU”) from technical detail (“IR v1 · 24 ops · 186 ms”) and put verbose fallback reasons behind a disclosure.

Finally, native `prompt()` and `confirm()` dialogs for preset actions interrupt the visual system and offer weak context. Replacing them with in-app dialogs would improve consistency and make overwrite/delete consequences clearer.

## Recommended next UX milestone

1. Consolidate the top toolbar into clear **Image**, **Filter**, and **Help** groups or a compact File menu.
2. Add project-level dirty-state tracking and safe reset/import confirmation.
3. Separate plain-language render status from expandable diagnostics.
4. Replace browser prompts with accessible in-app preset dialogs.
5. Prototype formula autocomplete only after the editing lifecycle remains stable in real use.
