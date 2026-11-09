# Canvas mouse navigation: manual browser QA

Run in Chrome and Edge on Windows (and Firefox if available), at desktop and narrow widths, with the inspector open and hidden.

- Load small, large, wide and tall images. Wheel over image and stage whitespace in Fit and manual modes; check cursor anchoring, 10%/400% bounds, readout, and transitions into and out of overflow. Check Ctrl+wheel remains browser zoom.
- Middle-click without moving and confirm zoom stays unchanged; use the toolbar or 0 to Fit. Middle-drag in both axes, past scroll bounds, outside the stage and back, and on an image that fits. Confirm a drag never triggers Fit or browser autoscroll. Check cancellation on blur, image replacement, render, and Library opening.
- Repeat in Original, Filtered and Split; check overlay alignment after wheel, pan, Fit and resize. Check divider drag, image tap, and divider keyboard controls remain functional and middle gestures do not change the split.
- Wheel over toolbar, sidebar, Library and Help; check normal scrolling and no canvas zoom. Check toolbar buttons, keyboard shortcuts, viewport restoration, touch scrolling and narrow layout.
- Check export dimensions and pixels are unchanged. Repeat at different browser zoom and display scaling where available.
