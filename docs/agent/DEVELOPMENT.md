# Development and validation

## Audit snapshot (version-specific)

Audited on **2026-09-30**, application **2.9.6**, commit
`4d9e945ba3254ad1ef74bc6595490799b1c36993`, **detached HEAD**.
`origin` is `https://github.com/mirabarukaso/character_select_stand_alone_app.git`;
the live `origin` main branch advertised the same commit during the audit.
Tracked files were clean before this documentation task. An untracked local
`.codex/environments/environment.toml` and ignored `node_modules/` already existed.
Recheck Git state before future work; this is not an assertion about later checkouts.

The newest [changelog](../../CHANGELOGS.md) entries are 2.9.6 (SAAC read-only
policy and favorite hotkeys) and 2.9.5 (per-address generation locks, request-owner
preview/result routing, SAAC service controls, backend log). These areas deserve
regression coverage when touching settings, generation, or SAAC.

## Dependencies and commands

The authoritative manifests are [package.json](../../package.json) and
[package-lock.json](../../package-lock.json). This is an npm/Electron application
using JavaScript ES modules, without a bundler or transpilation step. Python
utilities are separate; there is **no root `requirements.txt`, Docker requirement,
or `setup.sh`** in this checkout.

Run from the repository root unless a section says otherwise:

| Command | Purpose and limits |
| --- | --- |
| `npm ci` | Reproduce the lockfile, including Electron and native dependencies. Replaces the installed dependency tree; requires package/download network access on a fresh install. |
| `npm start` | Runs the declared `electron .` script and enters `main.js`; requires a graphical environment. |
| `npm ls --depth=0` | Check the installed top-level dependency tree. |
| `npm outdated` | Inspect available dependency updates; a nonzero result can mean updates exist. |
| `npm update` | Intentionally refresh dependencies within declared ranges and update the lockfile. Review the resulting diff and validate; do not run as routine setup. |
| `npm run package` | Declared Windows packaging command; see the missing tool prerequisite below. |
| `npm run package_mac` | Declared macOS packaging command; same missing prerequisite. |

For an intentional dependency addition/version change, use npm installation
commands for that dependency and commit the manifest and lockfile together.
Keep existing `overrides` in mind (`onnxruntime-node`/`adm-zip` and
`@electron/get`/`undici`); do not hand-edit resolved lock entries.

At the audit, lockfile version is 3 and root package name, version, dependency,
and devDependency maps agree with the manifest. Locked Electron is **44.5.1**
and its installer requires **Node >=22.12.0**. The repository has no root Node
engine/version pin. Use a compatible Node version and recheck dependency engines
after upgrades. Electron supplies its own runtime; the shell's Node version is
not proof of Electron runtime compatibility. `sharp`, `bcrypt`, and
`onnxruntime-node` load native components; keep platform-specific installs separate.

### Packaging gap

Both package scripts call `electron-packager`, but neither `electron-packager`
nor `@electron/packager` is declared or locked. The CLI was also absent from this
audit environment's PATH. **A clean `npm ci` is insufficient to make packaging
reproducible.** A packaging task should select and declare a compatible packaging
tool explicitly, then validate the existing commands; this bootstrap does not
change dependencies to resolve it.

The Windows script targets `win32`, writes to `release/`, uses `--overwrite`,
and supplies exclusion expressions for settings, tagger assets, certificates,
example images, and thumbnail comparison data. The macOS script targets `darwin`
with no equivalent exclusions. Neither script pins an architecture or defines
signing/installer/release-upload steps. Exclusion expressions are not a guarantee
that private data is omitted: inspect the actual output before sharing a package.
**Needs runtime verification:** packaging and packaged-app startup.

## Local Windows development

1. Install dependencies with `npm ci` when needed; launch with `npm start`.
2. First startup can download missing thumbnail/tag datasets from GitHub and
   Hugging Face via `setupDownloadFiles()` in
   [downloadFiles.js](../../scripts/main/downloadFiles.js). `initializeApp()` in
   [main.js](../../main.js) waits for downloads, caches, and tag autocomplete before
   creating the window; failure can exit before any UI appears. Inspect terminal
   output first, then the Settings **Backend log** overlay once the UI is available.
3. Set **Image API Interface** to **ComfyUI**, configure its address and model
   folders in Settings, and verify discovery/connection before generation. SAA
   does not install or launch ComfyUI. See [COMFYUI.md](COMFYUI.md) for custom nodes,
   workflows, API traffic, and feature-specific validation.
4. Save a test settings profile before altering the user's active configuration.
   Keep ComfyUI models, custom nodes, GPU behavior, Windows paths, and actual
   image generation validation on the user's local machine.

Settings and downloaded data live under the application directory in development;
many modules use `resources/app` beside the executable in packaged mode, rather
than Electron's user-data directory. The directory must be writable. Settings
can contain backend addresses, local paths, and API credentials.

### Runtime/generated files

Consult [.gitignore](../../.gitignore), but do not assume it covers every personal
file. Normally keep `node_modules/`, `release/`, generated datasets, user settings,
layout sidecars, logs, certificates, downloaded tagger models, and generated
images out of commits. Important exceptions to a blanket directory rule:

- `settings/*.json` and `settings/ui_layout/*.json` are ignored; the supplied
  `settings/MiraITU/*.json` presets are **tracked**. Distinguish preset changes
  from personal saves.
- `.gitignore` lists particular downloaded datasets, not all of `data/`.
  Startup also references tracked source datasets; inspect their diffs after runs.
- `models/tagger/` has a tracked placeholder, but `.onnx` and tag metadata files
  are **not generally ignored**. These assets are manually supplied for the
  Node image tagger and are separate from ComfyUI's models.
- `html/ca/user.csv` is **tracked**; `*.pem` is ignored. Do not commit real
  credential hashes or private certificates. The optional SAAC server uses this
  file and certificates for HTTPS authentication; see
  [ARCHITECTURE.md](ARCHITECTURE.md) before changing service exposure.
- `scripts/python/thumb-generator/` and `scripts/python/thumb-compare/` have
  selected data/output directories ignored; use `git status --short` and
  `git check-ignore` to inspect new artifacts instead of blanket staging.

## Codex Cloud / headless development

Use Cloud for source inspection, isolated implementation, dependency installation,
syntax checks, pure-module tests, review, refactoring, and documentation. Configure
its own setup to run `npm ci` with a compatible Node version. The local generated
`.codex/environments/environment.toml` already uses `npm ci` for all listed
platforms; **no change is needed for this bootstrap**. Its presence does not
establish that a separate cloud environment is configured.
For cloud setup controls, consult the [official environment documentation](https://learn.chatgpt.com/docs/environments/cloud-environment).

Do not assume Cloud can access local settings, Windows paths, ComfyUI, custom
nodes, model files, credentials, or a GPU. `npm start` is a desktop launch, not a
headless test runner or server-only entry point. Electron on Linux may require
display/system libraries; browser emulation cannot validate native dialogs,
Windows filesystem behavior, or the user's actual installation. Do not weaken
Electron security settings just to get a headless startup to run.

Pure code tests can use fixtures/mocks for workflow data and responses. Report
them as such, and list required local follow-up explicitly. A successful install,
syntax check, mocked request, or cloud startup is not an end-to-end ComfyUI test.

## Separate Python utilities

Use a dedicated Python environment outside the tracked tree, or ensure any local
virtual environment is excluded. No Python dependency versions are pinned here.
Commands below are verified against imports/manifests/launchers.
**Needs runtime verification:** utility runtime compatibility and generation.

| Utility | Setup and launch | Purpose / constraints |
| --- | --- | --- |
| [thumb-generator](../../scripts/python/thumb-generator/README.md) | From `scripts/python/thumb-generator/`: `python -m pip install -r requirements.txt`, then `python -m streamlit run app.py --server.port 58080`. | Requirements: Streamlit, Pillow, websocket-client, requests. Uses local `workflow_api.json` / `workflow_diffusion_api.json`, calls ComfyUI directly, creates thumbnail datasets. Source has Python 3.9+ built-in collection annotations. The README's `-r requirements` omits the actual `.txt` extension. |
| [thumb-compare](../../scripts/python/thumb-compare/README.md) | From `scripts/python/thumb-compare/`: `python -m pip install streamlit`, then `python -m streamlit run app.py`. | No requirements file of its own. Streamlit app compares local datasets/images; `process_rework.py`, `process_sortList.py`, and `process_trimList.py` are standard-library processing scripts. Inspect their configured inputs/outputs before running them. |
| [saa-agent](../../scripts/python/saa-agent/README_HUMAN.md) | From root: `python -m pip install websockets aiohttp`, then `python scripts/python/saa-agent/saa-agent.py --help`. | No requirements file of its own. Async CLI connects to a running SAA SAAC service, authenticates when required, and requests generation. Does not replace the Electron host. Use the actual `saa-agent.py` filename; some embedded help examples name an older filename. |

The `app.bat` launchers implement the Streamlit commands above. Python is not
required to launch the main Electron application or its Node ONNX tagger.

## Validation: available checks versus manual coverage

There is **no formal automated test suite**, npm `test`/`lint`/typecheck script,
ESLint/formatter configuration, or CI workflow in the audited checkout.
`.github/` contains issue templates. A wildcard fixture named `nesting_test.txt`
is not a test runner. Do not claim nonexistent coverage or use `npm test` as the
project's validation command.

These are useful **ad hoc checks**, not existing repository test scripts:

```powershell
# From root: syntax only; does not execute imports or exercise DOM/IPC behavior.
$jsFiles = @(git ls-files '*.js')
foreach ($jsFile in $jsFiles) {
    node --check $jsFile
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $jsFile" }
}

# Parse tracked Python without importing third-party modules or creating __pycache__.
python -c 'import ast, pathlib, subprocess; files = subprocess.check_output(["git", "ls-files", "*.py"], text=True).splitlines(); [ast.parse(pathlib.Path(p).read_text(encoding="utf-8-sig"), filename=p) for p in files]; print(f"Parsed {len(files)} Python files")'

npm ls --depth=0
git diff --check
```

For a targeted cross-platform JavaScript check, for example:
`node --check scripts/main/comfyui_workflow.js`. Add new untracked code files to
the check explicitly: `git ls-files` only sees tracked/staged files. Node syntax
checks do not validate browser-only APIs, preload runtime semantics, native
modules, JSON workflow validity against ComfyUI, or renderer script ordering.

### Manual smoke-test matrix (select rows relevant to the change)

| Stage | Check | Where / evidence |
| --- | --- | --- |
| Static | Syntax, manifest/lock agreement, diff and paths; inspect changed imports and IPC names. | Local or Cloud; record exact commands and results. |
| Targeted module | Exercise pure transformations with representative fixtures when behavior warrants it, especially workflow branch selection and payload shapes. | Local or Cloud; no existing automated harness. Mock network/Electron dependencies explicitly. |
| Startup | Launch; confirm datasets load, window renders, saved profile loads, terminal/backend log has no new failures. | Local Windows. A first-run download failure is distinct from a renderer regression. |
| UI/settings | Change affected control; save/reload profile; verify layout modes, localization, hotkeys, and gallery interactions when touched. | Local Windows; SAAC browser too for shared UI changes. |
| ComfyUI connection | Resolve configured model folders/lists, connect to API, verify custom nodes relevant to the feature. | Local installation; missing assets can be environmental. |
| Generation | Small known-good generation, then changed feature; check progress/preview, final gallery image, seed and metadata. | Local GPU/ComfyUI; use [COMFYUI.md](COMFYUI.md) checklist for branch combinations. |
| Cancellation/errors | Cancel current and queued work; retry after cancel/failure; exercise unavailable backend or missing-node response. | Local Windows/ComfyUI; verify locks release and UI recovers. |
| Concurrency/regression | SAA and SAAC request/result ownership; same-address busy handling versus distinct backends; read-only behavior. Smoke Forge Neo if shared backend abstractions changed and that backend is available. | Local; unavailable paths must be reported as untested. |
| Packaging | Build only when packaging is touched; inspect bundled files, then launch package and verify settings/data writes. | Target platform after resolving missing packaging tool. |

Audit checks actually performed: all **72 tracked JavaScript files** passed
`node --check`; all **6 tracked Python files** passed AST parsing; root manifest
and lock metadata/dependency maps matched; `npm ls --depth=0` passed. The host was
Node 26.8.1 / npm 11.17.0 / Python 3.14.7. These are observations, not required
version pins. Dependency installation, GUI startup, Python app execution,
packaging, and real ComfyUI/Forge Neo generation were not run for this
documentation-only audit.
