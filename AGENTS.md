# Working in this repository

SAA is an Electron application for character/prompt composition and image generation, with a browser client (SAAC) served by the Electron host. This checkout supports a personalized downstream version that may grow beyond upstream functionality. **ComfyUI is the primary image backend.** Preserve Forge Neo (`WebUI` in code) unless the task explicitly changes that support.

## Start and find the right context

Run commands from the repository root:

```sh
npm ci
npm start
```

Use a Node version compatible with the locked dependencies; see [DEVELOPMENT.md](docs/agent/DEVELOPMENT.md) for prerequisites, packaging limitations, and checks. There is no root Python environment to install for the Electron app.

Load references conditionally, not all before every task:

- For ComfyUI generation, workflow construction, models, previews, locking, cancellation, or custom nodes, read [COMFYUI.md](docs/agent/COMFYUI.md).
- For UI/state/settings, main/preload/renderer changes, IPC, SAAC, file handling, or security boundaries, read [ARCHITECTURE.md](docs/agent/ARCHITECTURE.md).
- For setup, dependencies, packaging, Python utilities, validation, or local/cloud constraints, read [DEVELOPMENT.md](docs/agent/DEVELOPMENT.md).
- For complex features, architecture changes, substantial refactors, cross-boundary multi-file work, major ComfyUI workflows, migrations, or uncertain multi-stage implementation, use an ExecPlan following [.agent/PLANS.md](.agent/PLANS.md). Trivial fixes do not need one.

## Source of truth and modification approach

- Resolve disagreements in this order: current worktree source; manifests/lockfiles/configuration; repository documentation; current upstream information; historical changelogs/issues; assumptions. The deeper documents identify their audited snapshot; recheck affected code after upstream changes.
- Prefer small modules and existing extension seams over invasive rewrites. Keep unrelated formatting and dependency churn out of changes; shared startup, UI construction, settings, and workflow tables are frequent upstream conflict points.
- Preserve the Electron main / preload / renderer boundary. Browser SAAC uses a separate WebSocket API dispatch surface; changing only preload does not update SAAC.
- Renderer state is distributed. Persisted settings must be recognized by the main-process defaults and connected to UI initialization, updates, and request serialization. Do not assume adding a control persists or submits its value.
- Keep workflow templates immutable during requests; clone before mutation. Preserve per-backend locking, job ownership, prompt IDs, output-node contracts, and cleanup on success/error/cancel. Check repeated requests and SAA/SAAC routing when those paths change.
- Treat model paths, backend addresses, remote AI settings, and API/file inputs as trust boundaries. Preserve SAAC read-only restrictions; do not infer that read-only means unprivileged or isolated.
- Change dependencies deliberately and keep `package.json` and `package-lock.json` consistent. Prefer `npm ci` for reproduction; do not use broad upgrades or automatic audit fixes as incidental cleanup.

## Worktree and validation discipline

- Inspect `git status` and the current branch/HEAD first. Preserve pre-existing edits and untracked environment files. Do not reset, clean, change remotes, commit, or push without task authorization.
- `origin` is the user's fork (`senopui`); `upstream` is the original project (`mirabarukaso`). Verify `git remote -v` and branch tracking before synchronization. Use explicit remote names; authorized downstream publishing targets `origin`. See DEVELOPMENT for the worktree and upstream-update workflow.
- Normally exclude `node_modules/`, `release/`, runtime settings/layout JSON, downloaded thumbnails/tag data, model weights, certificates, logs, and Python utility outputs. Consult [.gitignore](.gitignore) and tracked files: some data, MiraITU presets, and wildcard examples are intentional source assets. Do not blanket-delete or ignore whole data/settings trees.
- Never commit real API keys, authentication data, or private local paths. Check new runtime outputs even when Git does not ignore them.
- No formal automated test suite is currently provided. Use the relevant validation ladder and smoke matrix in DEVELOPMENT; do not report syntax checks as application tests. Add focused behavioral checks for meaningful new logic when practical.
- Local Windows is authoritative for Electron GUI, Windows paths, installed ComfyUI/custom nodes/models, GPU behavior, and end-to-end generation. Cloud/headless work can inspect, install dependencies, refactor, and run static or isolated checks; it does not inherit the user's local ComfyUI, files, settings, secrets, or GPU.

## Definition of done

The requested behavior is implemented (or a documentation task is fully delivered), relevant checks have run, `git diff --check` passes, and the final diff has been reviewed for scope and private/generated files. Report what passed and what remains **Needs runtime verification**, with concrete local steps. Update the affected agent reference and ExecPlan when architecture/contracts or verification commands actually change; keep this file concise.
