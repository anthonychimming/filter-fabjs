# Filter FabJS Library Manager

The Library Manager is a local maintainer tool for the official Online Filter
Library. It translates Add, Update, Unpublish and Republish into canonical library
changes and a reviewed local Git commit. It does not replace the publisher,
GitHub validation or GitHub Pages deployment.

## Launch

Use Node 22 and Git, with the app and library checkouts beside each other:

```text
projects/filter-fabjs/
projects/filter-fabjs-library/
```

From the app checkout:

```bash
npm run library:manager -- --library-root ../filter-fabjs-library
```

Open `http://127.0.0.1:8091`. On Windows PowerShell, use `npm.cmd` if the `npm`
PowerShell shim drops option arguments. `--port 8092` selects another local port.
The server binds only to `127.0.0.1`.

The library must be a Git repository with an initial commit, `registry.json`,
`source/` and `filters/`. Configure the maintainer's Git name/email normally before
preparation. The default publication comparison base is the current `HEAD`.
If the checkout contains unpublished commits, explicitly select the last known
published commit with `--base-ref <commit>`. The tool cannot determine which
commit GitHub Pages actually deployed. No fetch, push, PR creation or merge occurs.

## Working with filters

- **Library:** search names, IDs, authors, descriptions and tags; filter by status;
  sort by name, ID, status, revision, modification date or publication date.
- **Add Filter:** supply native version-2 JSON plus an approved 512×512 portable
  PNG, or supply that PNG alone. Inspect the candidate, review its image and select
  the explicit visual approval checkbox before adding it to the pending workspace.
- **Update:** inspect revised source/package, compare metadata, controls and RGBA
  formulas, then approve the preview. Revisions are one above the highest retained
  package revision, even when history has gaps.
- **Unpublish:** confirm removal from Online discovery. Source and every historical
  PNG stay intact. This removal remains pending until publication preparation.
- **Republish:** supply and approve a matching source/package. A returning filter
  receives a new revision above all retained history; the registry never points
  backward to an old revision.
- **Delete Draft:** available only for never-published sources, checked against
  retained packages and registry entries in Git history. Missing historic packages
  do not make a previously published filter a draft. Readiness does not establish
  publication history: a never-published Ready to Publish candidate is deletable.
  For a new pending Add, deletion immediately cancels the Add and discards its
  candidate source/package; canonical files remain untouched and the pending count
  decreases. Unrelated working-tree edits are preserved. For an existing canonical
  draft source, deletion replaces any pending Add with a source deletion and is a
  reviewed Git change, so Git retains the source's history. It does not bump the
  catalogue version when no discovery change is included.
- **History:** view retained packages, sizes, metadata, validation, current revision
  and previews. Dates come from registry entries found in Git history; a commit
  timestamp is shown separately and never presented as proof of publication.

Statuses are derived from canonical files and the pending workspace. A source
without history is Draft; matching discovered source/package is Published; a
portable-content mismatch is Changed; retained history outside discovery is
Unpublished. Missing required material is Incomplete; invalid input is Invalid.
An approved pending change is Ready to Publish. These labels are not a database.
The server returns history-based action capabilities used by the UI and deletion
handler. Prepare Draft is hidden once a candidate is pending.

## Review and prepare

1. Add coordinated operations to the pending workspace. Canonical files remain
   untouched. A later operation for the same ID replaces its pending operation.
2. Select **Validate Publication**. The manager copies canonical inputs into an
   isolated temporary candidate tree and invokes the authoritative publisher
   against the selected Git base. Review the file list, change summaries and Git
   diff. PNG differences use Git's binary-file summary, with previews for visual QA.
3. Publication Details shows one `libraryVersion` increment for the entire batch,
   automatically calculated revisions and the local preparation date. Dates are
   strictly validated by the existing registry contract. If midnight passes after
   review, validation must run again. There is no ordinary manual version/date field.
4. Confirm **Prepare Publication**. Validation runs again; the manager applies only
   the planned changes, creates `library/publish-YYYY-MM-DD` (with `-2`, `-3`, etc.
   on collision), stages those files and creates the publication commit.
5. Review the local commit and use the existing GitHub PR/CI/Pages workflow. See
   [Online Library publishing](ONLINE_LIBRARY_PUBLISHING.md) for publication rules
   and the authoritative final deployment gates.

## Validation reuse and PNG ingestion

`tools/online-library/publish-library.mjs` exports shared native-source and
portable-package inspectors, `portableEqual`, `validateRegistry`,
`validateLibrary` and `validationReport`. Both manager and publisher use the same
native validator, bounded PNG metadata/dimension parser, portable-content
projection, registry/manifest validation and base-publication checks. Formula,
native JSON, PNG, registry, catalogue and IR formats are unchanged.

PNG-only ingestion is supported because the envelope contains a complete native
version-2 filter. The manager serializes the validated, known-fields projection
deterministically. When an existing source has matching portable content, it
preserves its original bytes to avoid formatting-only revision churn. Supplied
JSON bytes are retained exactly. PNG bytes are never re-encoded. Source/package
parity is mandatory in both modes. Structural validity does not establish visual
quality; the maintainer must review the preview.

Structured validation is also available without the manager:

```bash
npm run library:validate -- --library-root ../filter-fabjs-library --report-json
```

The report contains `valid`, `errors`, `warnings` and (on success) `summary`.
Diagnostic objects contain stable `code`, `path` and `message` fields. Important
codes include `PACKAGE_SOURCE_MISMATCH`, `HISTORICAL_PACKAGE_DELETED` and
`HISTORICAL_PACKAGE_MODIFIED`. The fail-fast publisher reports its first failure;
the dashboard also reports independent source/package scan failures. Existing
human-readable CLI output remains the default.

## Safety and recovery

Read-only browsing is available with a dirty checkout. Candidate acceptance and
preparation require a clean library worktree and index, including untracked files.
Cancelling a new, memory-only pending Add can preserve unrelated Git changes;
canonical draft deletion retains the clean-worktree requirement.
This conservative boundary avoids silently incorporating unrelated edits. The
manager never resets the entire checkout, removes unrelated untracked files or
changes the app repository's Git state.

All library paths are derived from validated IDs. The server exposes domain
operations, not arbitrary paths/commands. It rejects remote origins and unexpected
Host headers, requires a per-session API token, bounds request/upload sizes, sends
a restrictive CSP and treats imported text as text. Reads/writes reject symlinks
and case collisions. Git uses explicit argument arrays, disables hooks/signing
and external diff/text conversion, and refuses configured clean filters or
working-tree encodings on intended publication files. Repository content and
formula text are never executed. A command-local `safe.directory` applies only
to the explicitly selected root; no global Git configuration is modified.

Existing package paths are never overwritten, renamed, deleted or re-encoded.
The authoritative base comparison rejects historical package mutation/removal.
Source backups and planned file hashes are recorded in
`.git/filter-fabjs-manager-transaction.json` during preparation (in the worktree's
Git metadata directory for linked worktrees). Failures restore only intended file
and index paths and retain the candidate for retry. Failed manager-created
branches are removed only while they still point at the original commit.

**Discard Publication Changes** removes in-memory candidates without modifying
canonical files. After interrupted preparation, it uses the transaction record
to restore manager-created files, provided those files have not been externally
modified and `HEAD` still matches the original commit. Conflicts fail closed for
manual review; committed history is never automatically reverted. If a crash
occurs after a successful commit but before journal removal, review that commit
and remove the recovery marker manually after confirming the result.

Use **Refresh Library** for external edits. HEAD and canonical content hashes are
checked again before operations/preparation; stale candidates cannot be published.
Concurrent operations within one server are serialized. Pending candidates are
session-only and are lost on server restart; canonical state is rescanned. The
transaction record is a recovery journal, not a second source of library truth.

## Limits, checks and extensions

Existing source, PNG, registry, formula and manifest limits still apply. Additional
manager bounds are 1,000 sources, 10,000 historical packages, 100 pending changes,
128 MiB of candidate data and a 12 MiB request body. Derived package metadata is
cached in memory by content hash; search/navigation do not reparse historical
PNGs. Publication history inspects up to 2,000 registry commits and 10,000 published
revisions per refresh. Missing previously discovered packages make the library
unhealthy. With truncated, malformed or shallow registry history, new IDs and draft
deletion are disabled because prior publication cannot be ruled out. Unknown dates
remain unknown. Large library snapshots require temporary disk space and
Git history inspection can take time. The tool assumes the maintainer controls
the selected local repository; it does not lock out simultaneous external editors.

Run:

```bash
npm run library:manager:test
npm run library:test
npm test
npm run verify
```

Automatic rendering, previous/current visual comparison, GitHub PR creation,
bulk management, release QA and duplicate detection are deferred. The orchestration
boundary leaves those extensions separate from authoritative publishing logic.

## Implementation files and verification

- `tools/library-manager/server.mjs`: loopback server, bounded intent APIs,
  origin/Host/token checks and serialized operations.
- `tools/library-manager/lib/repository.mjs`, `catalogue-state.mjs`,
  `operations.mjs`, `git-client.mjs`: canonical scanning, states and summaries,
  candidate batches, history, transactions, recovery and constrained Git calls.
- `tools/library-manager/ui/index.html`, `library-manager.js`,
  `library-manager.css`: accessible, responsive Library/History/Publish UI.
- `tools/online-library/publish-library.mjs`: shared inspectors and structured
  reporting, with existing validator/build/CLI behavior retained.
- `tests/library-manager-smoke.mjs`: domain, filesystem, Git and HTTP regression
  coverage; integrated into `npm test` through `library:manager:test`.
- `package.json`, `README.md`, `docs/ONLINE_LIBRARY_PUBLISHING.md` and this guide:
  launch/test scripts, discovery and workflow documentation.

Completion verification on October 4, 2026: `npm run library:manager:test`,
`npm run library:test`, `npm test` and `npm run verify` all passed with exit code 0.
Verification included syntax checks of 46 modules, existing smoke suites, the
production build and generated-output smoke checks. The existing dirty `dist/`
files matched their pre-verification snapshot byte-for-byte afterward. No unrelated
user changes were overwritten; the real library checkout remained clean.

Browser checks exercised search/details/history against the real library and
PNG-only Add → review → validate → Prepare Publication, followed by Unpublish
and Republish as r2 in a disposable Git checkout. The decoded preview was 512×512,
approval gated preparation, branches/commits were created only in test checkouts,
and r1 remained intact. No hardware WebGPU parity run was needed or performed for
this maintainer-only change. The PowerShell npm option-forwarding failure was
resolved with `npm.cmd`; no final verification failures remain.
