const ort = require("onnxruntime-node");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const os = require("os");

const CAT = "[camieTagger]";

async function preprocessCamieImage(base64Str, targetSize = 512) {
  const buffer = Buffer.from(base64Str, "base64");
  let image = sharp(buffer).ensureAlpha().removeAlpha().flatten({ background: { r: 124, g: 116, b: 104 } });
  const meta = await image.metadata();
  const { width, height } = meta;
  const aspect = width / height;

  let newW, newH;
  if (aspect > 1) {
    newW = targetSize;
    newH = Math.round(targetSize / aspect);
  } else {
    newH = targetSize;
    newW = Math.round(targetSize * aspect);
  }

  const resized = await image.resize(newW, newH).toBuffer();
  const canvas = sharp({
    create: {
      width: targetSize,
      height: targetSize,
      channels: 3,
      background: { r: 124, g: 116, b: 104 },
    },
  });

  const compositeOptions = [{ input: resized, top: Math.floor((targetSize - newH) / 2), left: Math.floor((targetSize - newW) / 2) }];
  const compositePipeline = canvas.composite(compositeOptions);
  const composite = await compositePipeline.clone().raw().toBuffer({ resolveWithObject: true });

  const { data: src, info } = composite;
  const channels = info.channels || 3;
  const N = targetSize * targetSize;    
  const chwArray = new Float32Array(3 * N);

  // ImageNet mean/std
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  // Precompute plane offsets
  const planeR = 0;
  const planeG = N;
  const planeB = 2 * N;

  let srcIdx = 0;
  for (let p = 0; p < N; p++) {
    const r = src[srcIdx] / 255.0;
    const g = src[srcIdx + 1] / 255.0;
    const b = src[srcIdx + 2] / 255.0;

    chwArray[planeR + p] = (r - mean[0]) / std[0];
    chwArray[planeG + p] = (g - mean[1]) / std[1];
    chwArray[planeB + p] = (b - mean[2]) / std[2];

    srcIdx += channels;
  }

  return chwArray;
}

async function runCamieTagger(modelPath, inputTensor, thresholds) {
  const modelDir = path.dirname(modelPath);
  const metadataPath = path.join(modelDir, path.basename(modelPath).replace(/\.onnx$/, "-metadata.json"));
  if (!fs.existsSync(metadataPath)) throw new Error(`${CAT} Missing metadata file: ${metadataPath}`);

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
  const tagMapping = metadata?.dataset_info?.tag_mapping;
  if (!tagMapping?.idx_to_tag) {
    throw new Error(`${CAT} Invalid tag mapping structure in metadata`);
  }

  const session = await ort.InferenceSession.create(modelPath, { 
    executionProviders: ['dml', 'cpu'],
    
    intraOpNumThreads: Math.max(1, os.cpus().length - 1),
    interOpNumThreads: 1,
    
    graphOptimizationLevel: 'all',  // 'disabled' | 'basic' | 'extended' | 'all'
    enableCpuMemArena: true,
    enableMemPattern: true,
    executionMode: 'sequential',      // 'sequential' | 'parallel'
  });

  const inputName = session.inputNames[0];
  const outputs = await session.run({ [inputName]: inputTensor });
  
  const outputKeys = Object.keys(outputs);
  let logits;
  if (outputKeys.length >= 2) {
    // Use refined predictions (second output)
    // Using refined predictions from output[1]
    logits = outputs[outputKeys[1]].data;
  } else {
    // Using single output
    logits = outputs[outputKeys[0]].data;
  }

  // Apply sigmoid
  const probs = logits.map((x) => 1 / (1 + Math.exp(-Number(x))));

  const { idx_to_tag, tag_to_category } = tagMapping;
  const threshold = thresholds.overall ?? 0.35;
  const categoryThresholds = thresholds.category_thresholds ?? {}; // Per-category thresholds
  const minConfidence = thresholds.min_confidence ?? 0.1; // Minimum confidence
  const categories = thresholds.categories ?? [];

  const allProbsByCategory = {};  
  for (const [idxStr, tagName] of Object.entries(idx_to_tag)) {
    const i = parseInt(idxStr, 10);
    const p = probs[i];
    
    // Filter by min_confidence first
    if (p < minConfidence) continue;

    const cat = tag_to_category[tagName] || "general";
    
    // Only include requested categories
    if (categories.length > 0 && !categories.includes(cat)) continue;
    
    if (!allProbsByCategory[cat]) allProbsByCategory[cat] = [];
    allProbsByCategory[cat].push({ tag: tagName, prob: p });
  }
  // Sort each category by probability
  for (const cat of Object.keys(allProbsByCategory)) {
    allProbsByCategory[cat].sort((a, b) => b.prob - a.prob);
  }

  const filteredTagsByCategory = {};
  for (const [cat, tags] of Object.entries(allProbsByCategory)) {
    // Use category-specific threshold if available
    const catThreshold = categoryThresholds[cat] ?? threshold;
    
    filteredTagsByCategory[cat] = tags
      .filter(t => t.prob >= catThreshold)
      .map(t => ({ tag: t.tag.replace(/_/g, " "), prob: t.prob }));
  }

  // Flatten for backward compatibility
  const allTags = Object.values(filteredTagsByCategory)
    .flat()
    .map((t) => t.tag);

  console.log(CAT, `Generated ${allTags.length} tags.`);
  return allTags;
}

module.exports = {
  preprocessCamieImage,
  runCamieTagger
};
