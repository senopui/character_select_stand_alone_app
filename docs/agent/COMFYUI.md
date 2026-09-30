# ComfyUI integration reference

Audited 2026-09-30 at detached HEAD `4d9e945ba3254ad1ef74bc6595490799b1c36993`. This is a source audit, not evidence of successful generation on the user's installation. Recheck the source after upstream changes. Statements below are **verified from this snapshot** unless labeled recommendation or **Needs runtime verification**. For process boundaries see [ARCHITECTURE.md](ARCHITECTURE.md); for executable checks see [DEVELOPMENT.md](DEVELOPMENT.md).

## Entry points and ownership

| Responsibility | Source / symbols |
| --- | --- |
| UI components, address input, local callback registration | [scripts/renderer.js](../../scripts/renderer.js): `setupLeftRight`; `globalThis.generate`; `okm` registration |
| Generate, skip, cancel, queue controls | [callbacks.js](../../scripts/renderer/callbacks.js): `callback_generate_start`, `callback_generate_skip`, `callback_generate_skip_current`, `callback_generate_cancel` |
| Prompt/settings snapshot and serial dispatch | [generate.js](../../scripts/renderer/generate.js): `generateImage`, `createPrompt`, `startQueue`, `seartGenerate`, `runComfyUI` (the `seart` spelling is intentional here) |
| Regional and tiled upscale UI routes | [generate_regional.js](../../scripts/renderer/generate_regional.js): `generateRegionalImage`, `seartGenerateRegional`; [generate_miraITU.js](../../scripts/renderer/generate_miraITU.js): `generateMiraITU`, `startGenerateMiraITU` |
| Renderer queue storage | [myQueueSlot.js](../../scripts/renderer/slots/myQueueSlot.js): `QueueManager`, `attach`, `getFirstSlot`, `pop`, `deleteSlot` |
| Desktop bridge | [scripts/preload.js](../../scripts/preload.js): `api` request methods and `okm` callbacks |
| Backend registration | [main.js](../../main.js): calls `setupGenerateBackendComfyUI`; the SAAC-connected quit-confirmation path calls `cancelAllComfyUI` |
| Transport, workflow builders, session maps | [generate_backend_comfyui.js](../../scripts/main/generate_backend_comfyui.js): `ComfyUI` class and exported `runComfyUI*` wrappers |
| Workflow graph constants | [comfyui_workflow.js](../../scripts/main/comfyui_workflow.js): `WORKFLOW*`, `VAE_LOADER` |
| Shared backend locks | [main-common.js](../../main-common.js): `makeBackendLockKey`, `tryAcquireBackendBusy`, `releaseBackendBusy` |
| Preview/progress rendering and final gallery | [generate_backend.js](../../scripts/renderer/generate_backend.js): `from_main_updatePreview`, `from_main_customOverlayProgress`; [customGallery.js](../../scripts/renderer/customGallery.js): `appendImageData` |

The renderer owns prompts, UI state, queue order, gallery metadata, and translated user errors. Electron main owns filesystem model discovery, workflow construction, the ComfyUI connection, image fetching, and locks. ComfyUI executes the graph and its image saver writes the original output. SAA's renderer receives a base64 data URL.

## Settings and model discovery

- [globalSettings.js](../../scripts/main/globalSettings.js) defines `api_interface`, `api_addr`, `api_preview_refresh_time`, `model_path_comfyui`, `image_save_path_comfyui`, checkpoint/UNET/CLIP/VAE selections, Hires Fix/refiner options, and busy retry settings. `setupGlobalSettings` loads the runtime `settings/settings.json`; `saveSettings`/`loadSettings` handle named settings. These runtime files may not exist in a clean checkout.
- `scripts/renderer.js` creates `api_address`; its change callback updates `globalThis.globalSettings.api_addr`. `language.js` restores control values from settings. Generation reads current component values into each queue item's `generateData`; later UI changes do not rewrite all queued jobs. AI prompt placeholder replacement happens when a job runs.
- `extractHostPort` in `generate.js` reduces URL input to `URL.host`. ComfyUI submission/interruption use `http://` and its socket uses `ws://`; supplying an HTTPS URL in the UI does not enable TLS to ComfyUI. `auth` is carried into the class but not used as a ComfyUI authorization header. SAAC HTTPS authentication is a separate connection.
- [modelList.js](../../scripts/main/modelList.js), principally `updateModelAndLoRAList`, scans files on the **SAA host**, not ComfyUI's `/object_info` API. `model_path_comfyui` points to the checkpoint directory; normal fallbacks derive sibling `loras`, `vae`, `diffusion_models`, `unet`, `text_encoders`, `controlnet`, `clip_vision`, `ipadapter`, `upscale_models`, `onnx`, and detector directories. Each list has its own extension/filter behavior.
- `loadCustomConfig` supports [data/custom_path.yaml](../../data/custom_path.yaml) when `use_custom_path` is true. `readExtraModelPaths` reads `extra_model_paths.yaml` relative to the configured checkpoint location and specifically expects an `a111.base_path` section; it is not a complete implementation of arbitrary ComfyUI path configurations.
- Samplers, schedulers, CLIP types/devices and related choices are defined in [scripts/types.js](../../scripts/types.js), not discovered dynamically from the running ComfyUI version.
- `Default` checkpoint selection leaves template filenames intact. It does **not** select the model currently open in a ComfyUI browser. Remote model availability, template defaults, and filesystem-to-backend model-name agreement: **Needs runtime verification**.

## Generation lifecycle

```mermaid
sequenceDiagram
    participant R as Renderer / SAAC UI
    participant B as Preload IPC / SAAC RPC
    participant M as Electron ComfyUI backend
    participant C as ComfyUI
    R->>R: callback_generate_start -> generateImage -> QueueManager.attach
    R->>B: startQueue -> runComfyUI(generateData)
    B->>M: runComfyUI (or regional / MiraITU)
    M->>M: acquire address lock; clone and mutate workflow
    M->>C: connectWS /ws?clientId=clientID
    M->>C: POST /prompt {prompt, client_id}
    C-->>M: JSON containing prompt_id
    M-->>R: submit response through bridge
    R->>B: openWsComfyUI(prompt_id, skipFirst, outputNode)
    B->>M: openWS installs message handlers
    C-->>M: progress and binary preview frames
    M-->>R: updateProgress / updatePreview callbacks
    C-->>M: executing completion / queue status
    M->>C: GET /history/prompt_id then GET /view
    M-->>R: data:image/png;base64,...; release lock
    R->>R: mainGallery.appendImageData; advance queue
    R->>B: closeWsComfyUI(prompt_id) in finally
```

1. `generateImage` creates one `generateData` per loop, containing `addr`, `uuid`, `refresh`, prompts, seed, dimensions, sampling, optional feature objects, `img_prefix`, and `queueManager` display/AI metadata. Regional generation adds two positive prompts and region controls. MiraITU supplies a gzipped base64 image and `taggerOptions`.
2. `startQueue` is guarded by the renderer-global `inGenerating`. It dispatches one queued job at a time; batch generation is multiple jobs, with template latent `batch_size: 1`.
3. `beginComfyJob` acquires the shared address lock, obtains a persistent `ComfyUI` instance, sets owner `uuid`, clears `cancelMark`, and selects the relevant workflow builder.
4. `run` attempts to preconnect the socket, then posts `{prompt: workflow, client_id: this.clientID}`. It returns the HTTP response as a **JSON string**, or an error string. `finishComfySubmit` remembers a valid `prompt_id`; failed/invalid submission releases the lock.
5. The renderer parses that string and separately awaits `openWsComfyUI`. This returns the final image URL, not a socket handle. ControlNet preprocessing is different: `runComfyUI_ControlNet` performs submission, waits for its image, and closes the socket entirely in main.
6. Successful final data is appended to the gallery with seed, prompt, and optional `queueManager.finalInfo`; errors are translated and shown through gallery/loading overlays. Errors normally pause auto-start while retaining the unsuccessful queued item. The specific busy error text triggers [autoRetry.js](../../scripts/renderer/tools/autoRetry.js); settings control interval/count.

### IPC/API contract

The API names below are exposed in preload and, except the unused getter, mirrored in the SAAC `methodHandlers` table.

| API | Desktop IPC suffix after `generate-backend-comfyui-` | Result |
| --- | --- | --- |
| `runComfyUI(generateData)` | `run` | Submission JSON/error string |
| `runComfyUI_Regional(generateData)` | `run-regional` | Submission JSON/error string |
| `runComfyUI_MiraITU(generateData)` | `run-mira-itu` | Submission JSON/error string |
| `runComfyUI_ControlNet(generateData)` | `run-controlnet` | Preprocessed image/error string |
| `openWsComfyUI(prompt_id, skipFirst, index)` | `open-ws` | Final image/error string |
| `closeWsComfyUI(prompt_id)` | `close-ws` | Close selected instance socket |
| `cancelComfyUI()` | `cancel` | Request interruption for caller's owner |

`getImageComfyUI` exists in preload but `generate-backend-comfyui-get-image` has **no registered handler** in this snapshot. Do not use it as an existing result-fetch API.

## HTTP, socket, preview and result behavior

| Connection | Implementation / purpose |
| --- | --- |
| `POST /prompt` | `run`: JSON workflow and stable client ID |
| `WS /ws?clientId=...` | `connectWS`, `openWS`: execution events and previews |
| `GET /history/{prompt_id}` | `getImage`: reads a specific output node's `images[0]` |
| `GET /view?filename=...&subfolder=...&type=...` | `getImage`: fetches the selected output as a buffer |
| `POST /interrupt` | `cancelGenerate`: interruption without a prompt ID |
| `GET /` | `checkHttpAlive`: any HTTP response counts as reachable |

No `/queue` deletion, model enumeration, `/upload/image`, or arbitrary user workflow loading is implemented by this ComfyUI adapter. ControlNet and MiraITU embed gzipped base64 input in custom nodes.

`getComfyBackend` creates one instance per normalized backend kind/address key, with one random `clientID`. `clientID` is reused across jobs at that address; the owner `uuid` is separate (`none` for desktop; SAAC client UUID for browser requests). `rememberComfyPrompt` maps returned prompt IDs to instances. `resolveComfyBackend` first uses that map, then falls back to `lastComfyBackend` or the only instance. Always pass the prompt ID when opening/closing.

`openWS` resets counters/listeners and stores `prompt_id`. JSON `progress` increments `step` and emits progress callbacks. A matching `executing`/`status` message with `node === null` and nonzero `step` triggers `getImage`. With no sampling and `queue_remaining === 0`, a message containing `sid` is treated as a repeated/cached request error; without `sid`, the adapter tries history retrieval. Repeated identical requests and changes that reuse sampling but replace VAE/configuration: **Needs runtime verification**.

`sendPreviewFrame` normalizes Buffer, ArrayBuffer and typed-array input, then `extractPreviewImage` handles event type 1 (eight-byte header), type 4 (metadata-length header), raw JPEG/PNG, and a fallback header strip. `refresh === 0` disables previews; other values decimate by frame count, not elapsed seconds. The initial frame counter is skipped, and `skipFirst` suppresses the first eligible valid preview. `processImage` base64-encodes the bytes; the data URL is labeled PNG even when the payload came from a JPEG preview.

Final output indices are a cross-layer contract:

| Job | History output node |
| --- | --- |
| Normal / regional, checkpoint or diffusion | `29` (`ImageSaverMira`) |
| MiraITU checkpoint / diffusion / pre-bake dry run | `14` (`ImageSaverMira`) |
| ControlNet preprocessor preview | `3` (`PreviewImage`) |

Only the **first image** from the chosen node is retrieved. Adding multi-image/video/other outputs requires changes to retrieval and the renderer contract, not only a workflow edit. Normal/regional `img_prefix` is passed to saver node `29`; metadata inputs are also mutated there. Keep output dimensions, seed, model name and prompt metadata consistent with the generated image.

## Locks, cancellation, and SAAC

- `main-common.js` uses `async-mutex` to protect `busySlots`; its mutex covers map updates rather than the entire generation. The persistent slot is keyed by backend kind plus normalized host/port. An occupied slot rejects any new request, even from its existing owner. Different addresses and ComfyUI/WebUI kinds have separate slots.
- A valid submission keeps its slot until `openWS.finalize` releases it using captured job address/owner. Submission failures release earlier. There is no lock lease or expiry; not attaching the result listener after successful submission can leave a slot occupied.
- Each renderer has its own serial queue. Several SAAC clients can therefore contend for one backend, or run on different addresses. These locks coordinate requests through this SAA process only; they do not reserve an external ComfyUI server against other applications.
- `cancelComfyUI(owner)` marks **all stored instances with that owner**, then sends `/interrupt` on each; desktop IPC uses `none`, SAAC cancellation uses the authenticated caller UUID. `/interrupt` itself has no prompt ID and is not scoped to that owner inside ComfyUI. Cancellation does not delete pending ComfyUI queue entries or directly release the local slot.
- UI cancel clears the renderer queue and stops retries. Skip-current requests interruption when generation is active; skip-following removes later jobs. Inspect `callbacks.js` and `myQueueSlot.js` together before changing these semantics. `cancelAllComfyUI` iterates all stored instances during quit confirmation with connected SAAC clients, before the user confirms; ordinary exit with no connected SAAC clients bypasses that path.
- `python_runComfyUI` is exported through SAAC, waits for final output in main, returns `Success` while sending the image through `updateProgress(newImage)`, and supplies a fallback VAE object. [saa-agent.py](../../scripts/python/saa-agent/saa-agent.py) `ProgressCallback` distinguishes one image argument, two progress arguments, and three log arguments; this differs from browser gallery delivery. It currently selects the checkpoint builders, not the diffusion dispatch used by normal UI requests. Its `skeletonKey` option force-releases the address lock: a recovery escape hatch, not safe scheduling.

SAAC is a browser client of **SAA**, not a direct ComfyUI client. [wsRequest.js](../../scripts/webserver/front/wsRequest.js) sends `{type: 'API', method, params}` with message IDs and the logged-in UUID. [wsService.js](../../scripts/webserver/back/wsService.js) authenticates sessions and dispatches allowed method names to the same main-process functions; it does not use Electron preload. Generation payload `uuid` comes from the client-supplied object, whereas cancel uses the authenticated RPC UUID; changes to this surface should validate ownership explicitly.

`sendToRenderer` sends desktop callbacks as `generate-backend` IPC, which preload dispatches to registered `okm` functions. For SAAC it sends `Callback` messages named `${uuid}-${functionName}`; browser registration dispatches them to the same renderer helpers. The final image travels as the `openWsComfyUI` response. SAAC read-only policy restricts selected settings/layout writes; it does not prohibit generation. Model paths and output paths still refer to the SAA/ComfyUI hosts.

## Workflow construction and feature map

Builders `structuredClone` graph constants before mutation. Graphs are API-format objects keyed by numeric **strings**; edges are `[nodeId, outputIndex]`. They are not UI/editor workflow JSON. The template file's header says to edit in ComfyUI using a generation result; for graph changes, validate an exported graph in ComfyUI and deliberately preserve/remap the IDs consumed by builders. Unconnected optional nodes may remain in a cloned graph; some branches instead delete nodes.

| Capability | Implemented path and constraints |
| --- | --- |
| Basic checkpoint generation | `createWorkflow` clones `WORKFLOW`; loaders `45`/`43`, positive/negative `32`/`33`, canvas `17`, base sampler `36`, final saver `29`. Prompt LoRA syntax from `getLoRAs` is interpreted by `LoRAfromText` nodes. |
| Hires Fix | `createHiFix` packages options; checkpoint builders configure second sampler `20`, model upscale or `LatentUpscaleBy`, tiled VAE and optional color transfer. `createWorkflowUNet` instead uses upscale `54`/`55`, sampler `61`, color transfer `62`; it does not implement the checkpoint latent-upscale branch. Regional UNET has its own latent branch. |
| Refiner | `createRefiner`; checkpoint `createWorkflow`/`createWorkflowRegional` split steps between `36`/`37` and load `43`. Enabled with a different model changes sampling/noise handoff; equal-model cases reconnect around the refiner. Related downstream `refiner.enable` branches remain and deserve combination testing. |
| Regional generation | `generateRegionalImage` packages left/right prompt, ratio, overlap, strength and conditioning-area controls. `createWorkflowRegional` clones `WORKFLOW_REGIONAL`; `createWorkflowRegionalUnet` clones **`WORKFLOW_REIONAL_UNET`** (existing spelling). Mira mask creation/conversion plus `ConditioningSetMask`/`ConditioningCombine` replace the positive conditioning path. |
| ControlNet | UI [imageInfoControlNet.js](../../scripts/renderer/components/imageInfoControlNet.js) and [myControlNetSlot.js](../../scripts/renderer/slots/myControlNetSlot.js); `createControlNet` serializes slots. `applyControlnet` appends decode, optional `AIO_Preprocessor`, loader and `ControlNetApplyAdvanced` nodes, then rewires base/refiner/Hires conditioning. `On` uses original input; `Post` uses the processed input. Separate preprocessing uses `WORKFLOW_CONTROLNET`. |
| IP Adapter | Same slots and `applyControlnet`; `ip-adapter->` premodel plus `IPA->` postmodel names select `AV_IPAdapter` nodes and rewire model inputs. Only the first active IP Adapter slot is accepted. Check model/refiner connections when extending this branch. |
| Diffusion models | `generateData.unet.enable` selects `createWorkflowUNet` or `createWorkflowRegionalUnet`; loaders use independently chosen diffusion model, CLIP, dtype/type/device and VAE. `.gguf` replaces loaders with `LoaderGGUF`/`ClipLoaderGGUF`. Current diffusion builders do not apply checkpoint refiner or ControlNet/IP Adapter objects; do not assume checkpoint feature parity. |
| Custom VAE | Checkpoint `vae.vae_override` clones `VAE_LOADER` and rewires base/Hires encode/decode. Diffusion builders use selected separate VAE. ControlNet/ADetailer helpers have their own VAE edges; an override is not automatically propagated everywhere. |
| ADetailer | `applyADetailer` and `applyADetailerUnet` append SAM, detector, text encoding and `FaceDetailer` nodes, chaining images to saver `29`. The helper chooses fresh random seeds rather than the primary generation seed. |
| MiraITU | [imageInfoMiraITU.js](../../scripts/renderer/components/imageInfoMiraITU.js) owns controls/settings; `generateMiraITU` queues gzipped image plus `taggerOptions`. `createWorkflowMiraITU_Normal`/`_Unet` use `WORKFLOW_MIRA_ITU`/`_UNET`, tile/crop/sample/merge, optional model upscale, tiled VAE and color correction. Tagging is supplied SAA text, ComfyUI CL/WD/Camie nodes, or disabled. |
| MiraITU pre-bake | Diffusion builder merges `WORKFLOW_MIRA_ITU_UNET_PREBAKE` when `prebakeDenoise !== 0`; configures sizing, sampling/reference mode and noise settings; dry run redirects saver `14` to pre-bake output. MiraITU's diffusion loader path does not perform normal-generation GGUF replacement. |

ControlNet images are transient renderer slot state; they are not saved in normal settings. MiraITU has separate load/save methods in `globalSettings.js`. For a new persisted feature, trace its own UI serialization path rather than assuming every component is in the main settings object.

### External custom-node assumptions

The classes are verified in graph templates/builders. Package associations come from [README.md](../../README.md), not an installed-environment check; actual compatible versions: **Needs runtime verification**. This repository does not lock ComfyUI or its custom-node dependencies.

| Package described by repository README | Required classes/features observed in source |
| --- | --- |
| `ComfyUI_Mira` | `ImageSaverMira`, `CanvasCreatorAdvanced`, `TextBoxMira`, `LoRAfromText`, `ImageColorTransferMira`, `GzippedBase64ToImage`, regional mask nodes, Mira taggers and checkpoint loader |
| `ComfyUI_MiraSubPack` | `ImageTiledKSamplerWithTagger_MiraSubPack`, tile crop/merge, VAE wrappers, tiled color correction, pre-bake upscale calculator |
| `comfyui_controlnet_aux` | `AIO_Preprocessor` |
| `comfyui-art-venture` and `ComfyUI_IPAdapter_plus` | `AV_IPAdapter` path and its model dependencies |
| `ComfyUI-Impact-Pack` and `ComfyUI-Impact-Subpack` | `SAMLoader`, `UltralyticsDetectorProvider`, `FaceDetailer` |
| `calcuis/gguf` (the README's lowercase `gguf` package) | `LoaderGGUF`, `ClipLoaderGGUF`; do not substitute another package based only on a similar name |

## Known fragile areas in this snapshot

These are source observations to investigate when relevant, not changes made by this documentation task.

- `run()` preconnects before prompt submission, but `openWS()` installs result listeners only after the caller receives `prompt_id`; there is no event buffer or immediate history check on attach. Fast/cached completions and repeated identical requests: **Needs runtime verification**.
- Completion checks only some messages by prompt ID; progress/previews and the zero-queue/no-step branch are not all prompt-filtered. `execution_error`, `execution_interrupted`, and `execution_success` are not explicitly handled.
- `TIMEOUT` is 5 seconds; diffusion builders select 15 seconds. `openWS` checks HTTP after socket inactivity, treating any response as alive and rescheduling indefinitely. These values are not a maximum generation duration. `connectWS` has no explicit connection timer.
- `getUrl` blocks an address for five minutes after non-200/error/timeout on history/image fetches. This does not prevent all other request methods from submitting to that address. Its mutable `urlPrefix` and instance fields assume one active job per instance.
- `run` error/timeout branches reference undefined `timeout` and `req`; `cancelGenerate` references undefined `resolve` on non-200 and does not return a completion promise. Exact error-path behavior **Needs runtime verification**; do not document cancellation/timeout recovery as guaranteed.
- Workflow construction and some JSON parsing occur after lock acquisition without comprehensive `try/finally` cleanup. Thrown exceptions can strand busy slots. The backend/prompt maps are not pruned after jobs; old prompt IDs point to reused instances. Late close/cancel requests require care.
- `sendToRenderer` callback failure changes `lastComfyBackend.uuid` to `error`, rather than receiving an explicit instance. With concurrent addresses this can affect the wrong instance and owner-dependent cleanup. Treat `lastComfyBackend` fallback and owner changes as concurrency hotspots.
- Hardcoded IDs, duplicated checkpoint/regional/UNET builders, and `generate.js`/`callbacks.js`/`scripts/renderer.js` are likely upstream merge-conflict hotspots. Feature parity must be checked branch by branch.

## Adding a capability safely (recommendations)

1. Specify the user behavior, supported model paths and optional-node requirements in an ExecPlan for substantial changes. Decide whether it extends an existing queued job or introduces a new result type.
2. Add the smallest UI/settings payload field at the renderer boundary; preserve absent/disabled behavior. Include settings defaults, restore/save handling and localization when applicable. Avoid sending secrets or full unrelated settings in a new request.
3. Implement graph transformation as a focused helper/module where practical, cloning templates and accepting explicit input/output connections. Keep numeric IDs/output slots and saver IDs deliberate; keep unaffected branches byte-for-byte stable where possible.
4. Extend the matching builder(s), including regional/diffusion/MiraITU only when the capability is supported there. Add model discovery/type-list changes separately if needed. Establish custom-node availability with the local installation; there is no current capability handshake to rely on.
5. If the operation needs a new transport method, update preload registration, main IPC, SAAC handler routing and browser callbacks together. Preserve caller ownership and prompt-address identity through submission, preview, completion, cancellation and errors.
6. Use focused graph assertions or mocked transport checks for meaningful new behavior; pure helper extraction can make these possible without importing Electron. Require local end-to-end evidence for the actual node graph. Avoid broad rewrites of template IDs or renderer globals solely to add one feature.

## End-to-end validation checklist

Static/headless work can inspect graphs and payloads and run checks in [DEVELOPMENT.md](DEVELOPMENT.md); it cannot establish local GPU/custom-node compatibility.

- [ ] Record backend version, required node versions and model names without publishing secrets/private paths. Confirm SAA's local model lists match files available to the selected ComfyUI instance.
- [ ] Start SAA on Windows; select ComfyUI and its reachable host/port. Confirm settings restore and a named-setting reload retain the intended options.
- [ ] Run one baseline checkpoint image. Check submit response, prompt/output node, progress, preview on/off, final gallery image and original ComfyUI saved image/metadata.
- [ ] Test the changed feature enabled and disabled, plus its affected regional/diffusion/Hires/refiner/VAE combinations. Test only supported combinations; use missing-node/model cases to verify readable errors and recovery.
- [ ] Queue multiple jobs; change UI options after enqueueing; verify queued values and order. Repeat an identical request and a same-seed VAE/config change to exercise cached/no-sampling paths.
- [ ] Cancel all, skip current, skip following, and remove the active queue slot as relevant; confirm no stale image appears and a subsequent job can acquire the lock.
- [ ] Exercise unavailable backend, interrupted socket, ComfyUI execution failure and slow model loading. Confirm both UI and backend become usable after failure; inspect main-process and ComfyUI logs when they disagree.
- [ ] When routing/concurrency changes: test SAA plus SAAC on one address, busy retries, two addresses when available, owner-scoped cancellation, browser disconnect and shutdown. Verify previews/results reach the intended client.
- [ ] When shared generation/UI code changes: smoke-test Forge Neo's preserved route if locally available. Report it untested if unavailable.

All unchecked GUI, filesystem, model, custom-node, GPU, and integration behavior **Needs runtime verification** on the user's Windows machine; Codex Cloud has no implied access to those resources.
