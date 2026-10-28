# Moving ChromaMeld RGBA to a new origin

Browser storage does not move between origins. Keep the existing site accessible before any redirect so users can export My Filters. Before launch, export a backup on the old site and import it on the new staging site; verify custom filters, favorites and tags. Save unsaved work separately. Renderer preferences and other session state may need to be set again.

On the new origin, verify HTTPS, relative assets and real browser cross-origin access to the existing Online Library catalogue, thumbnails, previews and package downloads, including refresh and offline/error behavior. Preserve package origin and redirect validation. Confirm GitHub Pages domain ownership and configure its custom domain before changing DNS. Keep the old origin available with a migration notice until users have had an opportunity to recover stored data.
