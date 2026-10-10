# Filter FabJS Library Manager

## Repository Synchronization

After merging a publication PR and confirming its deployed Online catalogue,
open **Workspace → Repository Synchronization → Check Sync Status**. Review the
current branch/HEAD, local and official main SHAs, ancestry and publication
evidence. Choose **Sync with Main**, then **Confirm Sync**; Cancel leaves the
checkout unchanged. Checking deliberately fetches only official main into the
`origin/main` tracking ref for ancestry inspection. It does not change files,
the index or the checked-out branch. There is no startup polling or automatic
synchronization.

The server accepts only clean `main` or a recorded `library/publish-*` branch.
A publication branch additionally needs a freshly verified merged PR, its
reviewed registry, a merge commit reachable from official main, and a validated
deployed catalogue matching every published/removed revision. Catalogue absence
alone cannot authorize an unpublish. Unrecorded older branches need manual
review. Local main must exist and be equal to or behind official main; ahead or
diverged commits are preserved and block synchronization. Main occupied in
another worktree, unsafe origins/URL rewrites, nonstandard `--base-ref`, pending
or inspected candidates, publication reviews, stale state, recovery journals,
Git operations/locks and any tracked/untracked changes also block execution.
Hidden assume-unchanged/skip-worktree entries require manual review.
Opening an upload records a live session on the server, so even an unsubmitted
candidate blocks synchronization. **Cancel Candidate** or **Cancel Candidate
Inspection** explicitly clears that session/inspection while retaining pending
publication changes.

`POST /api/git/sync-main/preview {}` returns bounded status fields and an opaque
five-minute review token. `POST /api/git/sync-main/apply` requires
`{confirmed: true, reviewToken}`. The server binds the token to the repository,
branch, HEAD, main, live remote SHA, index/canonical fingerprint, Manager base
and verified publication/deployment state. Tokens are consumed on an apply
attempt, and other Manager POST operations invalidate them. Existing origin,
session-token and serialized-request protections apply. Expired/reused tokens
and changed state require a fresh check; client SHA values are never authority.
Other tracked and ignored files are also fingerprinted. Ancillary inspection is
bounded to 1,024 regular files, 16 MiB per file and 64 MiB total; ancillary
symlinks or larger inputs require manual synchronization. Their bytes are never
rewritten by the inspection.

Confirmation rechecks safety and live main, fetches only official main without
tags/submodules, verifies the exact reviewed SHA and ancestry, validates the
target catalogue and retained source/package files, then rechecks before
switching. It uses a normal `git switch main` and `git merge --ff-only` of the
verified SHA, with ignored-file overwrites and auto-stashing disabled. It never
resets, stashes, cleans, deletes publication branches, rewrites commits, pushes,
creates/merges PRs or deploys. Git credentials/GCM/SSH remain responsible for Git
transport; existing REST authentication handles PR proof.

Success verifies main/HEAD, clean status and refreshed library health, then
rebuilds the normal snapshot, history, base and online observations. The next
batch starts from that main HEAD and its current registry version. Completed PR
history remains visible for the session. Already-current main reports that
state without a confirmation token or checkout operation. Sync does not replace
publication validation or remote-base freshness safeguards.
The result includes old/new branch and main SHAs plus the before/after checkout
`libraryVersion`; the version can stay unchanged when the completed publication
already had the deployed registry.

For Git for Windows CRLF checkouts, refresh aligns equivalent source text only
in the disposable comparison base. Canonical JSON and immutable PNG files are
not rewritten; source content changes still require the existing revision rules.

Failures report the actual checkout and require refresh/recheck. If switching
succeeds but fast-forward/verification fails, the Manager leaves that safe state
in place and performs no rollback. Another Git process is not transactionally
locked out; immediate rechecks and Git's non-force rules protect operations. A
remote advance after the final check is reported with guidance to check again.
For manual fallback, inspect `git status`, the actual branch/HEAD and PR/Online
evidence first. Once all the same safety gates hold, fetch official main, switch
to main and merge `--ff-only origin/main`; retain the old publication branch.
Reconcile ahead/diverged commits yourself without discarding them.

`tests/library-manager-sync-smoke.mjs` uses disposable bare remotes and real Git
commands, including checkouts with spaces; GitHub/Online observations and network
transport are injected. It never touches the production library or live GitHub.
The UI suite covers readiness, confirmation/cancel, stale/blocked/in-flight
states and refreshed catalogue/base/details. Live credentials, actual GitHub
merge/Pages deployment and OneDrive synchronization require maintainer acceptance
using the normal `npm.cmd run library:manager -- --library-root ../filter-fabjs-library`
launch. Restart the Manager after installing these code changes.

### Implementation and verification — October 10, 2026

Changed files:

- `tools/library-manager/lib/sync-main.mjs` — guarded Git inspection, completion
  proof, preview tokens, safe switching/fast-forward and partial-state reporting.
- `tools/library-manager/lib/operations.mjs` — Manager integration, explicit
  upload/inspection sessions, completed PR history and CRLF comparison-base fix.
- `tools/library-manager/server.mjs` — protected, serialized sync/session intents
  and preview invalidation by other POST operations.
- `tools/library-manager/ui/library-manager.js` and `library-manager.css` —
  separate synchronization section, confirmation/cancel, progress, guidance,
  refreshed views and responsive layout. The HTML shell is unchanged.
- `tests/library-manager-sync-smoke.mjs` and `library-manager-ui-smoke.mjs` —
  disposable real-Git safety/publication fixtures and UI interaction coverage.
- `package.json` — registers the new sync suite in `library:manager:test`.
- `docs/LIBRARY_MANAGER.md` — workflow, safety/limits and acceptance instructions.

`npm.cmd run library:manager:test`, `npm.cmd run library:test`, `npm.cmd test`
and `npm.cmd run verify` all completed with exit code 0. Verification checked 51
modules, passed the regressions, built v2.9.3 and validated static/standalone
output. The final result-version fields also passed a focused real-Git
fast-forward check. `git diff --check` passed; generated `dist/` files are
unchanged. No commits, application branches, GitHub writes or production-library
mutations were made; unrelated `tmp/` content was retained.

Real Git for Windows fixtures covered current/behind main, successive squash
publications with fresh parents/versions, unpublish evidence, retained branch
trees, pending/inspection/upload/review state, recovery/Git operations, dirty and
conflicted files, ignored-file preservation/invalidation, hidden index flags,
unsafe/missing/occupied branches, ahead/diverged main, unsafe/unavailable remotes,
invalid target registries, stale/expired/reused confirmations, remote fetch
races, partial failures and origin/session/queue protection. GitHub and Online
observations were injected; no tests contacted production GitHub.

A disposable browser fixture verified preview, cancel, keyboard confirmation,
success and merged history at 520- and 800-pixel widths without horizontal text
overflow. It used simulated state and performed no Git/publication writes.

Initial failures were resolved: sandbox Git could not create temporary HEAD
refs, so approved host-side fixture runs were used; squash synchronization
exposed the CRLF/LF comparison-base mismatch, fixed above. A temporary result
test was initially launched before its file creation completed and passed after
retry. Sandbox DNS also prevented the initial PR #15 lookup; a read-only host
request confirmed it was then open and unmerged. An initial browser binding
lookup was corrected before the responsive acceptance checks. No final test or
build failures remain. During commit/push preparation, a fresh fetch found PR #15
had subsequently merged as `91b5267`; this implementation was rebased onto those
publication safeguards and the full verification workflow was rerun. This task
did not merge or modify PR #15. Live GCM/SSH transport,
GitHub merge/Pages deployment and real OneDrive library synchronization remain
manual acceptance steps; hardware WebGPU parity was not run.

The Library Manager is a local maintainer tool for the official Online Filter
Library. It translates Add, Update, Unpublish and Republish into canonical library
changes, a reviewed local Git commit, and an explicitly confirmed GitHub pull request. It does not replace the publisher,
GitHub validation or GitHub Pages deployment.

## Publication version and remote truth

One Manager batch that changes discovery increments `libraryVersion` exactly once:
add, update, republish or unpublish uses the prior version plus one, even with
multiple filters. A draft-only deletion retains the prior version. The review,
candidate tree and planned registry bytes must agree before canonical application.
Immediately before commit, the Manager reads `git show :registry.json`, validates
that exact index blob, and checks its version against the independently calculated
batch version. All planned writes require exact staged-byte equality (including
entries, revisions and `publishedAt`); planned deletions must be absent from the
index. Reconstructed preparation records also check the committed registry version.
A mismatch aborts preparation and restores only Manager-created changes.

External conflict resolution can alter a valid preparation after push. Refresh
looks up the PR before treating a changed remote branch as a conflict, reads PR
details by number, and checks repository, head branch, base branch and head SHA.
For a changed head, the GitHub comparison must prove the prepared commit is its
ancestor. Such a branch is observable but cannot receive further automatic writes.
Its remote registry version and reviewed add/remove/revision entries are checked;
any mismatch is shown as requiring repair. This observation does not substitute
for authoritative CI validation of all remote source/package bytes.

`merged` takes precedence over open/cached state. A known merged PR remains merged
when a later API refresh fails. A closed unmerged PR is shown as **PR Closed**;
an absent PR clears cached open status. **Published Online** requires the exact
revision in the validated production catalogue. A merged PR with a stale catalogue
shows **Merged · Awaiting Online Deployment**, even when Pages reports success.
A failed Pages run for its merge commit shows **Merged · Deployment Failed**.
Unavailable Actions access leaves deployment unknown; it never proves publication.
The bounded Actions lookup reads only `pages.yml` runs for the merge SHA on main.
Grant the token optional Actions read access to enable it.

Failed validation checks show **Checks Failed** and, for an open PR, **Do not merge
this pull request until validation passes.** Merge remains manual. Require the
Online Library validation check in main branch protection as repository hardening;
the Manager does not change protection settings.

## Repairing the October 9, 2026 publication

Read-only inspection established that preparation `a5fbb87551a47048734908676641a39bed61669a`
contained `libraryVersion: 4`. The later GitHub conflict-resolution commit
[`ba889b7`](https://github.com/anthonychimming/filter-fabjs-library/commit/ba889b712d2d01f24bc5f1bd748e8880396410ce)
changed it back to 3. PR #2 merged that result into
`9f52ac2c587831791b2cd7f7cbb9617ddfce5fec`. The increment was lost after preparation,
in remote merge conflict resolution, rather than in planning, staging or the
Manager-created commit. Refresh previously checked the changed branch SHA before
PR lookup and retained a cached open PR when that check failed.

Use a normal metadata-only repair PR. Do not create r2, amend merged history or
force push. The existing local publication branch still contains version 4, so
do not blindly increment that checkout to 5. Inspect fresh main and its history;
if another valid publication has since consumed version 4, stop and reassess.
The following commands are manual maintainer steps, run from the app checkout:

```powershell
git clone https://github.com/anthonychimming/filter-fabjs-library.git ../filter-fabjs-library-repair
git -C ../filter-fabjs-library-repair status --short
git -C ../filter-fabjs-library-repair log --oneline -n 10
git -C ../filter-fabjs-library-repair switch -c codex/repair-library-version
```

Confirm main is the affected merge with version 3, that no valid publication
consumed 4, and that the existing `chromatic-signal-weave` r1 source, PNG and
registry entry are present. Change only the version, preserving file formatting:

```powershell
node --input-type=module -e "import fs from 'node:fs'; const p='../filter-fabjs-library-repair/registry.json'; const text=fs.readFileSync(p,'utf8'); const r=JSON.parse(text); if(r.libraryVersion!==3 || !r.filters.some(e=>e.id==='chromatic-signal-weave' && e.revision===1)) throw Error('Unexpected repair state'); const next=text.replace(/(\u0022libraryVersion\u0022\s*:\s*)3\b/, (_,prefix)=>prefix+'4'); if(next===text) throw Error('Version field not found'); fs.writeFileSync(p,next);"
git -C ../filter-fabjs-library-repair diff -- registry.json
npm run library:validate -- --library-root ../filter-fabjs-library-repair --base-ref origin/main
npm run library:validate -- --library-root ../filter-fabjs-library-repair --base-ref 8ca71252519bd30e918d3ed9a0868ce27b5d6db6
npm run library:build -- --library-root ../filter-fabjs-library-repair --base-ref origin/main
node --input-type=module -e "import fs from 'node:fs'; const c=JSON.parse(fs.readFileSync('../filter-fabjs-library-repair/dist/catalogue.json')); if(c.libraryVersion!==4 || !c.filters.some(e=>e.id==='chromatic-signal-weave' && e.revision===1)) throw Error('Repair catalogue mismatch');"
git -C ../filter-fabjs-library-repair add -- registry.json
git -C ../filter-fabjs-library-repair diff --cached -- registry.json
git -C ../filter-fabjs-library-repair show :registry.json
git -C ../filter-fabjs-library-repair commit -m 'Fix Online Library catalogue version after failed publication'
git -C ../filter-fabjs-library-repair push -u origin codex/repair-library-version
```

PowerShell users may use `npm.cmd`. If command-line quoting of the Node edit is
inconvenient, edit only `libraryVersion: 3` to `4` in a text editor. Both validators
must report valid before pushing: one compares to the broken merge, the other to
the last valid publication. The staged diff must contain only the version line.
All source files and historical packages remain unchanged.

Open a PR into main titled **Fix Online Library catalogue version after failed
publication**. Wait for passing validation, review the diff, then merge manually.
Wait for **Publish library Pages** to succeed; if required, dispatch that existing
workflow on repaired main. Check the deployed `catalogue.json` with a fresh request:
version 4 and `chromatic-signal-weave` revision 1 must be present. Reload the app's
Online Library and Refresh the Manager on the original publication branch; only
catalogue confirmation permits **Published Online · r1**. A successful workflow
with a stale catalogue remains awaiting deployment. No live repair was performed
as part of this implementation; the steps above are deliberately reviewable.
Restart the Manager after updating its code, then reload its browser page to use
the new reconciliation and reporting behavior.

## Publication fix implementation report

The loss point and recovery are documented above. Public REST inspection also
confirmed that `ba889b7` descends from the prepared commit and that Pages run
[`38004071832`](https://github.com/anthonychimming/filter-fabjs-library/actions/runs/38004071832)
failed for the merged main SHA. No production repair, push, PR creation, merge,
workflow dispatch or branch-protection change was performed by this implementation.

Files changed for this fix (preserving the existing working-tree changes):

| Files | Change |
| --- | --- |
| `tools/library-manager/lib/operations.mjs` | Independent batch version, review/candidate consistency and exact index verification, including deletions. |
| `tools/library-manager/lib/remote-publication.mjs` | Committed-version verification, PR lookup before remote-head conflict handling, cached terminal-state retention. |
| `tools/library-manager/lib/github-client.mjs` | Authoritative PR details, descendant proof, remote registry inspection, bounded Pages run lookup. |
| `tools/library-manager/lib/publication-state.mjs` | Merged, failed deployment, closed PR, failed checks and temporarily unknown PR status precedence. |
| `tools/library-manager/ui/library-manager.js`, `ui/index.html` | Visible failures, merge advisory, repair guidance and status filters. |
| `tests/library-manager-smoke.mjs` | Versions 3→4, 4→5, 5→6; staged version/entry corruption; missing/changed plan writes; metadata repair validation/build; PR/deployment refresh transitions. Existing batch and draft-only coverage retained. |
| `tests/library-manager-github-smoke.mjs` | Stale open list versus merged details, merged flag precedence, changed-head ancestry and mismatch rejection, Pages pending/failure/success. |
| `tests/library-manager-ui-smoke.mjs` | Failed-check merge warning, failed deployment/repair guidance and catalogue-confirmed repair completion. |
| `docs/LIBRARY_MANAGER.md`, `docs/ONLINE_LIBRARY_PUBLISHING.md` | Invariant, verification, remote states, recovery commands and branch-protection recommendation. |

The disposable recovery test first commits source, r1 PNG and a registry entry
without advancing the version, proves the authoritative publisher rejects it,
then changes only the version. Validation succeeds against both the broken merge
and last valid publication; the built catalogue contains version 4 and r1, with
source/package bytes retained. This verifies repair capability without modifying
the live library or claiming a completed production deployment.

Verification results: `npm run library:manager:test`, `npm run library:test`,
`npm test` and `npm run verify` all passed with exit code 0 (the Manager command
also runs inside the full test and verification workflows). Verification checked
49 JavaScript modules, passed all smoke suites, built v2.9.3 and passed static and
standalone output validation. `git diff --check` passed. Hardware WebGPU parity
was not run; this fix changes only the maintainer publication workflow.
All nine generated output files matched their pre-verification bytes exactly;
the existing dirty worktree and its generated output changes were preserved.

Initial attempts to run the Manager suite inside the Windows sandbox failed with
`EPERM` from `realpath`, both for the system temporary directory and a repository
temporary directory. Automatically approved execution outside the sandbox passed.
The first full lifecycle attempt also exposed an outdated fixture expectation:
it removed the PR while expecting a remote-branch conflict. The fixture now keeps
the merged PR present and changes only the remote ref; subsequent full runs pass.
No final test or build failures remain.

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
published commit with `--base-ref <commit>`. This validation base is independent
of deployment status. The deployed catalogue confirms Online discovery, but does
not identify the Git commit Pages deployed. Remote publication may fetch main, push the recorded publication branch and create a PR after explicit confirmation. Merge remains manual.

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
  publication history: a never-published Ready for Publication Review candidate is deletable.
  For a new pending Add, deletion immediately cancels the Add and discards its
  candidate source/package; canonical files remain untouched and the pending count
  decreases. Unrelated working-tree edits are preserved. For an existing canonical
  draft source, deletion replaces any pending Add with a source deletion and is a
  reviewed Git change, so Git retains the source's history. It does not bump the
  catalogue version when no discovery change is included.
- **History:** view retained packages, sizes, metadata, validation, current revision
  and previews. Dates come from registry entries found in Git history; a commit
  timestamp is shown separately and never presented as proof of publication.

Content lifecycle is derived from canonical files and the pending workspace:
Draft, ready, Changed, Unpublished, Invalid or Incomplete. A matching local
registry/source/package establishes readiness, never Online publication.
The server returns history-based action capabilities used by the UI and deletion
handler. Prepare Draft is hidden once a candidate is pending.

## Publication status and refresh

Content lifecycle, Git progress and deployed catalogue status are independent:

- **Ready for Publication Review:** an approved pending candidate or uncommitted ready content. This is the visible label; the existing API status remains Ready to Publish.
- **Prepared Locally:** the expected registry state exists in a local commit,
  including after restarting on a prepared branch. This does not confirm deployment.
- **Pushed:** the containing HEAD is reachable from the current branch's remote
  upstream, and its validated registry contains the expected revision/state.
- **PR Open:** a GitHub PR for the exact prepared commit targets main. Checks are Pending, Passed, Failed or Unknown; passed checks never establish deployment.
- **Merged · Awaiting Online Deployment:** `origin/main` contains the expected
  revision but the successfully checked live catalogue does not. A removal also
  requires HEAD reachability; absence alone cannot prove a removal was merged.
- **Merged · Online Status Unknown:** Git evidence is available but the catalogue
  cannot be checked.
- **Published Online:** the validated production catalogue contains the exact
  expected filter ID and revision. An online r1 never confirms a locally prepared r2.

Startup and **Refresh Library** independently inspect the checkout, HEAD, upstream
and `origin/main`, and fetch the production catalogue at
`https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`. Catalogue
transport reuses the app client: HTTPS, no credentials/cache/redirects, an 8 MiB
limit, UTF-8 and schema validation, and an eight-second timeout. Failures clear
the previous deployment result and show **Online status unknown** while local
management remains available. Check time and diagnostics are exposed in details.

Git observations retain local-ref evidence and supplement it with verified remote branch and PR observations for recorded preparations. Startup and Refresh query remote status without pushing. The confirmed remote operation fetches only main before PR creation; no reset, merge or rebase occurs. Missing refs or failed observations cannot establish deployment. Git and network failures do
not make valid local content unhealthy or disable local operations.

The detail panel shows local candidate, local commit, remote main and deployed
revision separately. Prepared/pushed/unconfirmed merged work is also listed in
the workspace after the pending candidates have been cleared, including after
restart. An older deployed revision remains visible while a newer one is prepared.
Unpublish/Republish still operate on the local registry; preparing a removal does
not remove the currently deployed filter until the updated catalogue goes live.

**Workspace N** counts in-memory local changes awaiting preparation, not unfinished
Online publication. It becomes zero after preparation; the prepared commit and
deployment progress remain separate. Discard clears pending work without undoing
prepared commits.

Historical safety remains conservative: retained PNGs and local registry history
still prevent deletion/overwrite, including prepared revisions. `hasHistory` and
`historicallyProtected` describe that protection. `hasEverBeenPublished` is true
only with positive deployed-catalogue evidence observed in this session, false
for a new unprotected draft, and otherwise unknown (`null`). Remembering a past
confirmation does not preserve stale current deployment status across failures;
restart rechecks the catalogue. Registry dates are not deployment proof.

## Review and prepare

From an accepted candidate’s filter detail, select **Review & Publish** next to
Publication. This opens the shared Workspace and focuses/scrolls the pending card
by filter ID, even when names repeat. The top Workspace tab and footer
**Review & Publish →** use the same navigation. Without a selected pending card,
they focus the workspace heading. Navigation does not validate, prepare or push.

The path is **Filter detail → Review & Publish → Workspace → Validate Publication
→ Prepare Publication**, followed by the existing confirmed push/PR, manual merge
and deployment steps. The detail action appears for authoritative pending, ready
content and sits above the preview/description in normal flow. Published, prepared,
pushed, PR/merged, invalid/incomplete and unaccepted draft states do not receive
this review CTA. History remains secondary; Delete Draft retains danger styling.
Focus has a visible outline and the focused card is labelled by its filter heading.

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
   **Prepare Publication prepares a local Git branch and commit. It does not
   itself publish the filter to GitHub or the Online Library.** The success summary
   states the branch/commit and offers GitHub publication readiness and a PR preview.
5. Review the generated PR preview, then confirm **Push & Create Pull Request**. Review CI and manually merge using **Open Pull Request**. Refresh after Pages deployment to confirm the exact Online revision. See
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

Automatic rendering, previous/current visual comparison, bulk management, release QA and duplicate detection are deferred. The orchestration
boundary leaves those extensions separate from authoritative publishing logic.

## Implementation files and verification

- `tools/library-manager/server.mjs`: loopback server, bounded intent APIs,
  origin/Host/token checks and serialized operations.
- `tools/library-manager/lib/repository.mjs`, `catalogue-state.mjs`,
  `operations.mjs`, `git-client.mjs`, `publication-state.mjs`: canonical scanning,
  content/Git/deployment states and summaries,
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

## Remote main freshness before publishing

The Library Manager checks the **live** `origin/main` SHA before publication actions. It does not trust a stale local `origin/main` ref or the fact that a candidate passed an earlier local validation. The official GitHub origin is verified before a read or write; failure to contact a configured official remote blocks online publication safely. An offline fixture/checkout without `origin` can still be used for local authoring, but cannot push or create PRs.

**Publication gates:**

- **Validate Publication:** when a candidate is pending, the local reviewed base and local HEAD must correspond to current live `main`. If `main` has moved, validation is blocked with `REMOTE_MAIN_ADVANCED` and no files are changed.
- **Prepare Publication:** checks the same live base before writing anything and again after candidate validation. An earlier review token never authorizes a commit after the remote base changes.
- **Push & Create Pull Request:** verifies the prepared commit's recorded parent against live `main` during readiness, immediately before push and again before creating a PR. A late change after push stops PR creation and preserves the pushed branch; no force push, reset, rebase or merge is performed automatically.
- **Existing merged PRs:** historical merged PR status is retained when `main` subsequently advances. A newer main is normal after merge; it does not convert a completed PR back into an error.

The Publication Workspace displays the reviewed SHA, live `main` SHA and a **Remote main freshness** row. A stale base is an actionable warning, not an auto-merge prompt.

**Manual recovery** for an unpublished candidate based on old `main`:

1. Stop the Manager and preserve the original source/PNG inputs. If there are pending candidates in memory, keep copies; switching branches may invalidate their approval/review and require re-adding them.
2. In a PowerShell terminal, inspect `git -C ..\\filter-fabjs-library status --short --branch`. Do **not** reset or discard unrelated modifications.
3. For a clean library checkout with no unfinished publication that must be preserved, switch to `main` and run `git -C ..\\filter-fabjs-library pull --ff-only origin main`. If the fast-forward fails, stop and inspect divergence; do not force it.
4. Restart/Refresh the Manager, restore/re-approve any pending candidates, and run **Validate Publication** again against the new versioned registry. Confirm the review's `libraryVersion` is the current `main` version plus one per batch.
5. Prepare a **new** reviewed publication commit/branch and push/create its PR. Never reuse an outdated review token or force-push the old prepared branch.

For a **previously pushed branch or an open PR** that has become stale, preserve it and stop publication writes. A maintainer must reconcile changes against current `main`, run the authoritative validation against that new base and review the final diff before pushing any updated branch. Merging PRs with unresolved `registry.json` conflicts directly through GitHub's web editor can silently regress `libraryVersion`; avoid doing so without validation. GitHub branch protection should require successful library validation checks before merge.

This feature prevents publishing **from an already outdated base at the time of each check**. GitHub may advance after a PR is opened, so branch protection and CI remain the final merge gate; the Manager does not continuously watch remote branches while idle.

## Push and create pull request

The Manager uses Node 22 built-in fetch for GitHub REST coordination; no GitHub CLI or npm dependency is required. Git still pushes branches using existing Git/SSH/Git Credential Manager authentication. REST authentication is separate and does not prove push access. Push authentication is labelled verified only after the exact remote branch is confirmed.

For REST authentication, the server tries two sources in priority order:

1. **Explicit override:** if `FILTER_FABJS_GITHUB_TOKEN` is set, use that token exclusively (including when it is malformed; do not silently switch GitHub accounts).
2. **Git Credential Manager (GCM):** otherwise call `git credential-manager get` with the fixed `https://github.com` credential request. The Manager calls GCM **directly**, not `git credential fill`, so arbitrary configured helpers are never executed. This is noninteractive (`GCM_INTERACTIVE=0`, `GIT_TERMINAL_PROMPT=0`) and reuses an already signed-in credential from the OS-backed credential store. The credential provider never writes or erases credentials.

On Git for Windows, initialize the GCM login once in PowerShell **outside** the Manager:

```powershell
git credential-manager --version
git credential-manager github login
```

Complete the GCM sign-in flow using your GitHub account with access to `anthonychimming/filter-fabjs-library`. Then launch or refresh the Manager normally:

```powershell
npm.cmd run library:manager -- --library-root ../filter-fabjs-library
```

The status row identifies the source as **Git Credential Manager**. Browser refresh, server restart and reboot should reuse the OS credential while it is valid; a new sign-in is needed after revocation, expiration, account change, or a missing/insufficiently scoped credential. **If GCM is unavailable or no stored credential exists, the Manager fails safely and displays sign-in guidance; it never launches a browser/login dialog during background refresh.** A sign-in from an SSH-only Git workflow does not necessarily populate HTTPS GCM credentials.

For those who prefer a repository-restricted fine-grained token, create it through GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**. Select resource owner anthonychimming and **Only select repositories → anthonychimming/filter-fabjs-library**. Set an appropriate expiry and grant only:

- **Pull requests: Read and write** for listing, reading and creating PRs. [GitHub pull-request permissions](https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request).
- **Checks: Read** for the Actions check runs used by this library. [GitHub check-run permissions](https://docs.github.com/en/rest/checks/runs#list-check-runs-for-a-git-reference).
- **Metadata: Read**, implicitly included, for repository verification. [GitHub repository permissions](https://docs.github.com/en/rest/repos/repos#get-a-repository).

Contents, Commit statuses, Actions, Administration and account permissions are not requested by these endpoints. Reading the authenticated account through GET /user requires no additional token permissions. Repository/PR read access can be checked without creating anything; PR write permission is ultimately verified on creation, not inferred from a successful read. GCM-managed OAuth credentials may have **broader privileges** than a dedicated fine-grained token; choose the token override when strict repository-scoped least privilege is required.

To use the explicit override instead of GCM, set it before launching the Manager:

```powershell
$env:FILTER_FABJS_GITHUB_TOKEN="YOUR_FINE_GRAINED_TOKEN"
npm.cmd run library:manager -- --library-root ../filter-fabjs-library
```

Do not commit tokens or place them in repository/configuration files. There is no .env support or browser token entry. For an expired/invalid explicit token, replace or unset it and restart the Manager; when using GCM, complete sign-in and click **Refresh Library** without restarting. Neither provider exposes the credential to browser data, UI summaries or logs. The explicit token is stripped from Git subprocess environments. REST authentication does not prove Git push permission: Git continues to use its own HTTPS/SSH credentials.

GCM use is tightly bounded: GitHub.com host only, fixed command without shell, no prompts, 8-second timeout, 8-KiB output limit, strict credential parsing, no untrusted stdout/stderr in diagnostics, short private memory cache, and REST verification of the authenticated account/repository before publication. The server never invokes `credential approve`, `reject`, `store`, or `erase`. [GCM environment and interactivity documentation](https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/environment.md). [Git credential helper contract](https://git-scm.com/docs/gitcredentials).

All API requests pin https://api.github.com and reject redirects, cache use and arbitrary endpoint construction. API version 2022-11-28 is centralized in GITHUB_API_VERSION; it remains supported until March 10, 2028. [GitHub supported API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions).

After Prepare Publication, the Publish view shows branch/commit and the generated PR title, reviewed operation summary, repository, base and head. One confirmation permits the combined Push & Create Pull Request operation. If the branch is already pushed without a PR, **Retry Create Pull Request** reconciles it before continuing. A normal PR is created with a deterministic count-based title. Its body includes only bounded portable IDs, operation/revision summaries, catalogue versions and validation statements; uploaded formulas, descriptions, filesystem paths and credentials are excluded. Only a validated link to the official GitHub PR opens in a new tab. There is no merge action.

The remote must be an unambiguous standard HTTPS or SCP-style SSH GitHub origin for anthonychimming/filter-fabjs-library. Fetch and push URLs are checked; non-GitHub origins, other repositories, multiple URLs and URL rewrite rules fail closed. GitHub REST independently confirms repository identity and default branch main. Automatic pushes target only the recorded library/publish-YYYY-MM-DD[-N] branch with the exact prepared commit. HEAD, branch, canonical fingerprint, reviewed commit files, clean worktree/index, pending candidates and recovery journal are checked before remote writes. No force push, tags, ref deletion or direct main push is available. An identical remote commit is accepted; any different remote commit is a conflict requiring manual review. Fetch updates only origin/main, without merging, rebasing, resetting, switching or deleting local branches.

New preparations embed a bounded version-1 review record in their Git commit message, including the validation base, original parent, reviewed files/operations and canonical fingerprint. Startup reconstructs that record from Git rather than an in-memory session or new database. Older prepared commits without this record remain inspectable, but cannot be automatically pushed: use the manual GitHub workflow for those commits. A publication branch name alone never authorizes push. The record assumes the maintainer controls local Git history/configuration and installed Git/credential helpers; it is review metadata, not a cryptographic attestation. Multiple Manager processes and simultaneous external Git writers are not locked out; observations are checked immediately before operations and Git enforces normal non-force update rules.

Successful remote effects are retained when a later step fails. A push followed by failed PR creation remains **Pushed · PR not created or unavailable**. Timeouts may represent remote success: Refresh/retry checks the exact remote branch and queries PRs for the exact repository/head/base/commit before creating anything. An existing open PR is reused; closed-unmerged PRs block creation; merged PRs refresh publication progress without creating another PR. Ambiguous PR results fail closed. Network/authentication/permission failures offer a retry and preserve local changes and any successful push. PR/check retrieval failures retain known PR state within the session and label checks unavailable; restart re-queries it.

PR Open with passing checks still shows the previous deployed revision. Merged with an old catalogue means **Merged · Awaiting Online Deployment**. Only the validated production catalogue exact revision establishes **Published Online**. Online transport errors clear deployment confirmation rather than substituting Git/PR state. Ref-based observations remain labelled with their freshness.

REST reads are bounded to 20 seconds and PR creation to 60 seconds, including response streaming. Responses are limited to 1 MiB, creation payloads to 32 KiB, PR discovery to fewer than 100 matches and CI aggregation to 100 latest check runs. Oversized/truncated/paginated observations fail closed rather than claiming success. Git fetches remain bounded to 60 seconds and pushes to 120 seconds, using argument arrays and noninteractive execution. Raw HTTP bodies, headers and network errors are excluded from UI/log error paths; projected fields are validated and credential echoes rejected. Server loopback/Host/origin/session-token protections and the serialized operation queue also cover the new remote-status and push-and-create-pr intent endpoints.

Remote regressions use disposable bare Git repositories and injected REST fetch responses. They cover exact pushes, dirty/stale/wrong-branch rejection, identical/conflicting remote refs, partial failures, timeout reconciliation, restart recovery, open/closed/merged PRs, safe URLs/JSON, authentication and check states. No automated test writes to production GitHub. New implementation modules are tools/library-manager/lib/github-client.mjs and remote-publication.mjs; the separate REST client suite is tests/library-manager-github-smoke.mjs.

## REST CI aggregation and failures

The current validate.yml workflow runs on PRs into main and reports Actions check runs. The client reads GET /repos/anthonychimming/filter-fabjs-library/commits/{preparedSHA}/check-runs with filter=latest. It does not query legacy commit statuses or build an Actions administration client. No checks means Pending; any failure/cancelled/timed-out/action-required/startup-failure/stale conclusion means Failed; otherwise active/queued runs mean Pending; all completed success/neutral/skipped results mean Passed; unfamiliar or unavailable observations mean Unknown. Checks cannot prove that all required branch-protection checks have appeared; GitHub review/merge gates remain authoritative.

401 requests require replacing authentication; 403 distinguishes permission failures from rate-limit headers; 429 indicates rate limiting; 404 means unavailable resource or missing token access; 5xx and network failures remain retryable. Rate limits show an actionable error without automatic retry loops. If check retrieval fails, retain the PR and show Checks unavailable. API refresh failures retain the known PR with explicit stale/unavailable status. A 422 creation response is reconciled through exact PR lookup; invalid parameters fail if no reusable PR exists. POST timeouts are unknown outcomes, and later Refresh/restart/retry performs lookup before creating another PR. Successful pushes are never rolled back.

## Manual acceptance run without a CLI

1. Configure a fine-grained REST token as above and existing Git push authentication. Launch the Manager with Node 22 and Git; a CLI is unnecessary.
2. Add/update an approved filter candidate. Validate, review the diff and confirm Prepare Publication. Use a newly recorded preparation; older unrecorded commits retain their manual limitation.
3. Review Remote Publication readiness, the exact branch/commit and generated PR preview. Confirm Push & Create Pull Request once.
4. Confirm the remote branch contains the exact prepared commit and the UI shows a PR with Pending/Passed/Failed/Unknown checks. Refresh or restart to confirm the same PR is rediscovered.
5. Open Pull Request, review CI and merge manually on GitHub. With the old catalogue, Refresh must show Merged · Awaiting Online Deployment and preserve the earlier Online revision.
6. After successful Pages deployment, Refresh must show Published Online only for the exact validated catalogue revision.
7. For recovery, interrupt the API connection after a confirmed push or creation attempt, then restore access and Refresh/retry. The existing branch/PR must be reused without a force push or duplicate.

## REST implementation report — October 9, 2026

1. **Architecture:** replaced the Manager’s subprocess-based GitHub client with Node 22 built-in fetch. Git remains responsible for the exact publication-branch push; REST handles authentication, PR coordination and CI observations. No dependency, persisted schema, formula semantics or rendering code changed.
2. **Files changed for this REST replacement:** `tools/library-manager/lib/github-client.mjs`, `git-client.mjs`, `remote-publication.mjs`, `tools/library-manager/ui/library-manager.js`, `tests/library-manager-github-smoke.mjs`, `tests/library-manager-smoke.mjs` and this guide. The existing server intent endpoints, preparation record and operation queue were reused.
3. **CLI removal:** the Manager and its tests no longer execute gh or require its installation/authentication. The unrelated optional initial-repository setup guide is unchanged.
4. **Credential provider:** only the private server-side FILTER_FABJS_GITHUB_TOKEN environment provider is supported. Missing, malformed, expired and rejected tokens produce fixed, actionable errors. No token is read from browser storage or written to disk.
5. **Credential-helper decision:** REST reuse of git credential fill was deferred because helpers may prompt, invoke external programs and provide unsuitable or excessively scoped credentials. Existing Git authentication remains available for pushes, with the REST environment token removed from child environments.
6. **Fine-grained permissions:** select only anthonychimming/filter-fabjs-library; grant Pull requests Read/write, Checks Read and implicit Metadata Read. The linked official endpoint documentation supports this minimum. GET /user needs no extra permission. Readiness reports successful read access honestly; creation checks write permission.
7. **Endpoints:** GET /user; GET /repos/anthonychimming/filter-fabjs-library; GET /pulls scoped to the official repository/head/base; POST /pulls for a generated normal PR into main; GET /pulls/{number}; GET /commits/{preparedSHA}/check-runs, always under that same repository. There are no merge, close, delete, arbitrary URL or arbitrary API request intents.
8. **Transport:** pinned HTTPS api.github.com, redirect rejection, explicit API version, Accept and User-Agent headers, 20-second read/60-second create timeouts covering streams, abort/cancel cleanup, 1 MiB response cap, 32 KiB creation cap and bounded observations. Incomplete pagination cannot become Passed or a safe-to-create decision.
9. **Redaction:** raw HTTP messages, error bodies, response headers and transport exceptions never enter Manager diagnostics. Essential projected fields are validated; credential echoes and untrusted stream exceptions are rejected. Sentinel tests cover errors, client serialization, Manager summaries, HTTP responses, logs and prepared commit messages.
10. **Discovery:** exact repository, main base, publication head, prepared SHA, PR number and GitHub URL are checked before projecting a PR. Open PRs are reused, closed unmerged PRs block another creation, merged PRs advance reconciliation, and ambiguous matches fail closed. Restart reconstructs the exact reviewed preparation and rediscovers its PR.
11. **Creation and recovery:** existing clean/stale/fingerprint/review/remote checks still run before writes. Creation uses only the server-generated preview. A 422 triggers exact lookup before reporting invalid parameters. Timeouts remain unknown outcomes; refresh/retry looks up the existing PR before creating. Confirmed pushes survive API failures and are never rolled back.
12. **CI:** latest check runs for the exact prepared SHA produce Pending, Passed, Failed or Unknown using the rules above. Failed check retrieval preserves the known PR and shows unavailable/stale status. No legacy statuses or Actions administration access is requested; branch-protection and human review remain authoritative.
13. **Failures:** distinct safe errors cover authentication, permissions, rate limits, missing resources, malformed/oversized data, offline access, server failures and timeouts. Rate limits do not start automatic retry loops. Local preparation and historical packages remain intact.
14. **UI and publication states:** replaced CLI readiness with separate Git push authentication, GitHub API authentication and PR-access rows. Existing one-confirmation Push & Create Pull Request, generated preview, safe Open Pull Request link and Refresh remain. PR/CI success cannot substitute for the exact validated Online catalogue revision. Merge stays manual.
15. **Tests:** injected fetch fixtures cover API headers, authentication, permission/rate/server/network errors, redirects, JSON/schema/stream bounds, secret redaction, PR identity/lifecycle/duplicates, CI states and creation timeout reconciliation. Disposable bare Git integration exercises exact branch pushes, partial failure, restart, stale/dirty/conflicting states and Online revision separation without production GitHub writes.
16. **Verification:** `npm run library:manager:test`, `npm run library:test`, `npm test` and `npm run verify` all passed with exit code 0. Full verification syntax-checked 49 modules, passed the smoke suites, built v2.9.3 and validated fingerprinted/static and standalone output. The separate REST suite also passed after the final decoded Unicode-echo regression was added. All nine original dist files were preserved byte-for-byte after building; unrelated dirty worktree changes were retained. The production library checkout remained clean. No final test/build failures remain.
17. **Manual acceptance and limitations:** follow the seven-step run above with real Git credentials and an appropriately scoped token. Live GitHub creation, hardware WebGPU parity, manual merge and Pages deployment were not exercised. Older unrecorded preparations still need the manual workflow; interactive OAuth/helper reuse and automated merge remain deferred.

## Publication CTA/navigation implementation report — October 9, 2026

The detail view showed an accepted filter as ready while offering only History and
Delete Draft; the next review step was confined to the top tab and footer. The
new primary **Review & Publish** button is adjacent to Publication and appears
before long previews/descriptions. It opens the existing shared batch Workspace,
without validating or performing remote writes.

Changed files: `tools/library-manager/ui/library-manager.js`, `index.html`,
`library-manager.css`, `tests/library-manager-ui-smoke.mjs`,
`tests/library-manager-smoke.mjs`, `package.json` and this guide. No backend or
publication lifecycle rules changed. The visible label is now **Ready for
Publication Review**; API status/filter values remain **Ready to Publish**.

All three entry points use `openPublicationWorkspace`. Selected filter IDs are
preserved; pending cards expose their ID and an accessible heading label. The
matching card receives programmatic focus and scrolls into view, with a visible
outline. If no card matches, focus moves to the workspace heading. Semantic
buttons, existing primary/danger classes and normal responsive flow are reused.

The new UI suite executes real rendering functions and event listeners against
a DOM double. It covers the primary CTA, status/filter copy, published/draft and
later lifecycle exclusions, all three navigation routes, single/multi-item focus,
duplicate display names, batch preservation, no navigation API writes and History
before tertiary Delete Draft. Existing lifecycle assertions are retained; their
DOM double only gained dataset support.

Verification: `npm run library:manager:test`, `npm run library:test`, `npm test`
and `npm run verify` all passed with exit code 0. Full verification syntax-checked
49 modules, passed the existing and new smoke suites, built v2.9.3 and passed
static/standalone output validation. `git diff --check` passed. All nine original
dist files were preserved byte-for-byte after building; unrelated changes and
the user’s prepared library checkout were retained.

An isolated read-only browser fixture confirmed the Chromatic Signal Weave
pending-review detail, keyboard Enter navigation, focus on its pending card with
a visible outline, and normal-flow CTA placement above the preview at 800- and
520-pixel widths. No publication API writes were performed; the disposable server
and helper were removed. The existing Manager remains running on port 8091.

The first focused UI-test run failed because its exclusion fixture modified the
first sorted filter rather than the selected ID; the fixture was corrected to
target the ID, and all assertions now pass. The first browser fixture hosted in
the sandbox timed out; a host-side disposable fixture completed the checks.
No final regression or build failures remain.

## Semantic status badges

The filter list, detail header and publication workspace reuse compact badges
with explicit status text and revision metadata. PR, CI, Pages deployment,
Online catalogue and library validation summaries use the same semantic styles.
Status text remains authoritative; color is supplemental. Existing state labels,
status derivation, validation and publication operations are unchanged.

| Group | Color | Publication states |
| --- | --- | --- |
| Success | Muted green | Published Online |
| Progress | Muted blue | Ready to Publish (displayed as Ready for Publication Review), Prepared Locally, Pushed, PR Open |
| Attention | Muted amber | Merged · Awaiting Online Deployment, Merged · Online Status Unknown, Online Status Unknown, PR Status Unknown, PR Closed, Changed |
| Failure | Muted red | Merged · Deployment Failed, PR Open · Checks Failed, Deployment Failed, Validation Failed, Invalid |
| Neutral | Gray | Draft, Unpublished, Incomplete, Unknown, any unmapped future state |

Combined failure states use failure semantics. Exact API keys are mapped in the
UI's centralized `statusSemantics` table through `statusSemanticClass`; display
text fragments are never searched for colors. PR OPEN maps to progress; MERGED
and CLOSED map to attention. Checks Passed/Pending/Failed/Unknown map to
success/progress/failure/attention. Deployment Passed/Pending/Failed/Unknown map
to success/attention/failure/attention. Valid/invalid library health maps to
success/failure. These summaries describe their own observations; passing CI or
deployment does not establish Published Online.

The dark-theme CSS defines `--status-<group>-fg`, `-bg` and `-border` tokens,
consumed by `.status-badge` and `.status-<group>` classes. Revision text inherits
the badge color. Opaque backgrounds give measured text contrast ratios of
8.43:1 success, 8.34:1 progress, 8.36:1 attention, 8.08:1 failure and 8.82:1
neutral, exceeding normal-text WCAG AA's 4.5:1 requirement. Forced-colors mode
uses system Canvas/CanvasText colors and borders. Text wraps within available
width, with no fixed badge height, hover dependency or interaction requirement.
Existing layout breakpoints remain in place.

Regression coverage in `tests/library-manager-ui-smoke.mjs` executes the actual
list, detail and workspace renderers, checks all semantic mappings and revision
labels, verifies safe future-state fallback and unchanged lifecycle data, and
calculates contrast from the CSS tokens. The lifecycle suite's DOM harness loads
the shared presentation helpers while retaining its existing state assertions.

Badge acceptance checks used the running Manager plus an isolated read-only
fixture containing Published Online, Ready for Publication Review, Prepared
Locally, PR Open, merged awaiting deployment, merged deployment failure, Draft
and Unknown. At 800- and 520-pixel widths, list/detail badges remained consistent
and wrapped without text clipping; workspace badges used the same treatment.
Doubled CSS zoom also preserved badge text. Native browser 200% zoom was not
exercised; the narrow doubled-CSS-zoom fixture can overflow existing navigation
and toolbar controls. No overall layout redesign was included.

Verification: `npm run library:manager:test`, `npm run library:test`, `npm test`
and `npm run verify` all passed with exit code 0. Verification checked 49 modules,
built v2.9.3 and passed static/standalone build-output validation. Initial sandbox
attempts failed with Windows temporary-directory `EPERM`; host-side reruns
passed. The first manager run exposed a missing badge-helper import in its VM
harness, which was fixed without weakening lifecycle assertions. The temporary
browser fixture and task-created test leftovers were removed, and all nine
pre-existing dist files were preserved byte-for-byte. No backend or GitHub
publication actions were performed by the browser acceptance checks.
