# Explore controls

The Snapshots section is hidden when the active filter uses no controls. It reappears when at least one control is active.

Explore offers per-control locks, Reset, Randomize, Mutate, one-step Undo, and four session snapshots. Author's control editor retains numeric indices.

Locks constrain Randomize and Mutate only. Manual edits, Reset, and snapshot recall ignore them. The Locks menu can lock, unlock, or invert all active controls. Randomize uses each widget's authored range and step; Mutate varies the current value by up to 8%, 18%, 35%, or 70% of that range (Low, Medium, High, Chaos). Those factors are also toggle flip probabilities. Seed controls reroll through the existing seed normalization. The combined Mutate button shows the current strength and opens the strength menu. Selecting any strength mutates immediately, including selecting the current strength again.

Reset restores the immutable control values captured when the filter was activated. Its menu also retains the existing **Reset to pass-through** command. In production this loads the Pass Through filter, so it clears the current Explore session, including Undo. It is intentionally not a control-only undoable reset: restoring an old control array cannot restore the replaced formulas or filter identity.

Undo restores the complete control array before the latest Randomize, Mutate, Reset to defaults, or snapshot recall. It is consumed after use. Manual editing clears pending Undo. Each bulk action commits controls together and schedules one preview through the existing debounce; pending Author formula edits still require Update Preview.

Use **Save current** to save or explicitly replace A–D. Clicking an empty slot does not save. A saved slot recalls its controls; subsequent changes show “modified” and expose **Update A/B/C/D** without changing the saved values. The overflow menu clears the active slot or all slots without changing current controls.

Locks, snapshots, and Undo are session-only and never enter JSON, PNG filter metadata, or My Filters. Source-image changes and Explore/Author switching preserve them. Committing another filter clears them; cancelling a Filter Library preview preserves them. Formula edits invalidate the session but retain the activation defaults. Changing control presentation schema starts a new baseline from the current controls; opening the editor or changing labels alone does not. Saving a filter with new default values (or saving it under a new identity) also starts a new session. Mutation strength returns to Medium when the session is reset.

Explore dropdowns open below their buttons when space permits. They flip above near a viewport or scroll-container boundary; when neither side fits, the menu scrolls within the larger available space. Placement updates while scrolling or resizing.
