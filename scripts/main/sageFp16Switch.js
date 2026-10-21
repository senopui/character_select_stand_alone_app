// SageFP16Switch_MiraSubPack: model in, model out.
// PyTorch_FP16 casts compute to fp16. Sage_FP16 also casts attention q/k/v for SageAttention.
const FP16_CAST = {
  PyTorch_FP16: { compute_fp16: true, sage_cast: false },
  Sage_FP16: { compute_fp16: true, sage_cast: true },
};

export const SAGE_FP16_NODE_ID = '4';

export function isFp16CastDtype(dtype) {
  return Object.hasOwn(FP16_CAST, dtype);
}

// Dropdown callbacks store the whole selection, so a saved dtype is often ["Sage_FP16"].
export function normalizeDiffusionDtype(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw !== '' ? raw : 'default';
}

export function visibleDiffusionDtype(saved, modelType, allChoices) {
  const dtype = normalizeDiffusionDtype(saved);
  const choices = modelType === 'Checkpoint'
    ? allChoices.filter((item) => !isFp16CastDtype(item))
    : allChoices;
  const visible = choices.includes(dtype) ? dtype : (choices[0] || 'default');
  return { saved: dtype, choices, visible };
}

export function diffusionLoaderDtype(dtype) {
  return isFp16CastDtype(dtype) ? 'default' : dtype;
}

function retargetLoaderModel(workflow, loaderId, switchId) {
  for (const node of Object.values(workflow)) {
    const inputs = node?.inputs;
    if (!inputs || typeof inputs !== 'object') continue;
    for (const value of Object.values(inputs)) {
      if (!Array.isArray(value) || value.length < 2) continue;
      if (String(value[0]) === loaderId && Number(value[1]) === 0) {
        value[0] = switchId;
      }
    }
  }
}

export function applySageFp16Switch(workflow, loaderNodeId, dtype) {
  const mode = FP16_CAST[dtype];
  if (!mode) return workflow;

  const switchId = SAGE_FP16_NODE_ID;
  if (workflow[switchId]) {
    console.warn(`[ComfyUI] Node ${switchId} is already used. Sage FP16 switch was not inserted.`);
    return workflow;
  }

  const loaderId = String(loaderNodeId);
  retargetLoaderModel(workflow, loaderId, switchId);
  workflow[switchId] = {
    inputs: {
      model: [loaderId, 0],
      compute_fp16: mode.compute_fp16,
      sage_cast: mode.sage_cast,
    },
    class_type: 'SageFP16Switch_MiraSubPack',
    _meta: {
      title: 'Sage FP16 Switch (Mira SubPack)',
    },
  };
  return workflow;
}
