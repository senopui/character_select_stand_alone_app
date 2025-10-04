
const ort = require("onnxruntime-node");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp"); 
const os = require("os");

const CAT = '[imageTaggerChild]';

async function preprocessImageWD(base64Str, targetSize=448) {
  const buffer = Buffer.from(base64Str, "base64");
  let image = sharp(buffer);
  const proc = await image
    .clone()
    .removeAlpha()
    .png()
    .toBuffer();
  const resized = sharp(proc).resize(targetSize, targetSize, { fit: 'fill', kernel: 'cubic' });

  const { data: rawBuffer, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== targetSize || info.height !== targetSize || info.channels < 3) {
    throw new Error(`${CAT}Unexpected raw image shape: ${info.width}x${info.height}x${info.channels}`);
  }

  const imgArray = new Float32Array(targetSize * targetSize * 3);  // NHWC flat: H*W*3, BGR per pixel  
  for (let h = 0; h < targetSize; h++) {
    for (let w = 0; w < targetSize; w++) {
      const idx = (h * targetSize + w) * 3;  // RGB: idx+0=R, +1=G, +2=B
      let r = rawBuffer[idx + 0];
      let g = rawBuffer[idx + 1];
      let b = rawBuffer[idx + 2];

      // BGR order in NHWC: pixel offset *3: B, G, R
      imgArray[(h * targetSize + w) * 3 + 0] = b;  // B first
      imgArray[(h * targetSize + w) * 3 + 1] = g;
      imgArray[(h * targetSize + w) * 3 + 2] = r;
    }
  }

  return imgArray;  // flat NHWC BGR
}

async function preprocessImageCL(base64Str, targetSize=448) {
  const buffer = Buffer.from(base64Str, "base64");

  let image = sharp(buffer);
  // ensure alpha channel and flatten on white background
  image = image.ensureAlpha().flatten({ background: { r: 255, g: 255, b: 255 } });

  const { width, height } = await image.metadata();
  const size = Math.max(width, height);

  // top=floor, bottom=ceil，left=floor, right=ceil
  const padTop = Math.max(0, Math.floor((size - height) / 2));
  const padBottom = Math.max(0, Math.ceil((size - height) / 2));
  const padLeft = Math.max(0, Math.floor((size - width) / 2));
  const padRight = Math.max(0, Math.ceil((size - width) / 2));

  // create padded image, fill with white, remove alpha, then resize to targetSize x targetSize
  const proc = await image
    .clone()
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .removeAlpha()
    .png()
    .toBuffer();
  const resized = sharp(proc).resize(targetSize, targetSize, { fit: 'fill' });

  // check dimensions and get raw pixel data
  const { data: rawBuffer, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== targetSize || info.height !== targetSize || info.channels < 3) {
    throw new Error(`${CAT}Unexpected raw image shape: ${info.width}x${info.height}x${info.channels}`);
  }

  // normalize to [0,1], then (x - mean) / std
  // HWC -> CHW, produce channels in RGB order (R,G,B) 
  const channels = info.channels || 3;
  const chwArray = new Float32Array(3 * targetSize * targetSize);
  const mean = [0.5, 0.5, 0.5];
  const std = [0.5, 0.5, 0.5];

  for (let h = 0; h < targetSize; h++) {
    for (let w = 0; w < targetSize; w++) {
      const srcIdx = (h * targetSize + w) * channels; // rawBuffer stride
      const r = rawBuffer[srcIdx + 0] / 255.0;
      const g = rawBuffer[srcIdx + 1] / 255.0;
      const b = rawBuffer[srcIdx + 2] / 255.0;

      const p = h * targetSize + w;
      // CHW: channel 0 = R, 1 = G, 2 = B
      chwArray[0 * targetSize * targetSize + p] = (r - mean[0]) / std[0];
      chwArray[1 * targetSize * targetSize + p] = (g - mean[1]) / std[1];
      chwArray[2 * targetSize * targetSize + p] = (b - mean[2]) / std[2];
    }
  }

  // return CHW float32 array ready for new ort.Tensor("float32", chwArray, [1,3,targetSize,targetSize])
  return chwArray;
}

async function loadTagMappingFromCSV(filePath) {
  const kaomojis = [
    "0_0",
    "(o)_(o)",
    "+_+",
    "+_-",
    "._.",
    "<o>_<o>",
    "<|>_<|>",
    "=_=",
    ">_<",
    "3_3",
    "6_9",
    ">_o",
    "@_@",
    "^_^",
    "o_o",
    "u_u",
    "x_x",
    "|_|",
    "||_||",
  ];

  const csvData = await fs.promises.readFile(filePath, 'utf-8');
  const lines = csvData.split("\n").filter(line => line.trim() !== "");
  
  const tags = [];
  
  // Skip header line (tag_id,name,category,count)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma, assuming no commas in tag names
    const parts = line.split(",");
    if (parts.length >= 4) {
      let tag_id = parts[0];
      let name = parts[1];
      const category = parts[2];
      const count = parts[3];
      
      // Process name: replace _ with space unless it's a kaomoji
      const processedName = kaomojis.includes(name) ? name : name.replace(/_/g, " ");
      
      tags.push({ tag_id, name: processedName, category, count });
    }
  }

  console.log(CAT, `Loaded ${tags.length} tags from CSV.`);
  return tags;
}

function mcutThreshold(probs) {
  // Maximum Cut Thresholding (MCut)
  const sortedProbs = [...probs].sort((a, b) => b - a);
  const difs = [];
  for (let i = 0; i < sortedProbs.length - 1; i++) {
    difs.push(sortedProbs[i] - sortedProbs[i + 1]);
  }
  if (difs.length === 0) return 0;
  const t = difs.indexOf(Math.max(...difs));
  return (sortedProbs[t] + sortedProbs[t + 1]) / 2;
}

async function runWd14Tagger(modelPath, inputTensor, gen_threshold=0.35, char_threshold=0.85, general_mcut_enabled=false, character_mcut_enabled=false) {
  const session = await ort.InferenceSession.create(modelPath);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  const results = await session.run({ [inputName]: inputTensor });
  const logits = results[outputName].data;

  const probs = logits; // WD14 models output probabilities directly

  console.log(CAT, 'Model run complete. Mapping tags...');
  
  // Load tag mapping (from CSV file)
  const mappingPath = modelPath.replace(/\.onnx$/, "_selected_tags.csv");
  if (!fs.existsSync(mappingPath)) throw new Error(`${CAT}Missing tag mapping file.`);
  const tagMapping = await loadTagMappingFromCSV(mappingPath);

  // Separate tags by category
  const ratingTags = [];
  const generalTags = [];
  const characterTags = [];

  // Collect all general and character probs for potential MCut
  const generalProbs = [];
  const characterProbs = [];

  // First pass: collect ratings, and probs for general/character
  for (let idx = 0; idx < tagMapping.length; idx++) {
    const tag = tagMapping[idx];
    const p = probs[idx];
    
    if (typeof p === "undefined") continue;

    // Category 9: Rating tags
    if (tag.category === "9") {
      console.log(CAT, `Rating tag: ${tag.name} (${(p * 100).toFixed(2)}%)`);
      ratingTags.push({ name: tag.name, prob: p });
    }
    // Category 0: General tags - collect probs
    else if (tag.category === "0") {
      generalProbs.push(p);
      generalTags.push({ name: tag.name, prob: p });
    }
    // Category 4: Character tags - collect probs
    else if (tag.category === "4") {
      characterProbs.push(p);
      characterTags.push({ name: tag.name, prob: p });
    }
  }

  // Apply thresholds, with optional MCut
  let effectiveGenThresh = gen_threshold;
  if (general_mcut_enabled && generalProbs.length > 0) {
    effectiveGenThresh = mcutThreshold(generalProbs);
  }

  let effectiveCharThresh = char_threshold;
  if (character_mcut_enabled && characterProbs.length > 0) {
    effectiveCharThresh = Math.max(0.15, mcutThreshold(characterProbs));
  }

  // Filter general tags
  const filteredGeneralTags = generalTags.filter(tag => tag.prob > effectiveGenThresh);

  // Filter character tags
  const filteredCharacterTags = characterTags.filter(tag => tag.prob > effectiveCharThresh);

  // Sort general tags by probability (descending)
  filteredGeneralTags.sort((a, b) => b.prob - a.prob);

  // Combine tags: characters first (unsorted, in original order), then general tags
  let outputTags = [];
  
  // Add character tags (preserve original order)
  outputTags.push(...filteredCharacterTags.map(t => t.name));
  
  // Add general tags
  outputTags.push(...filteredGeneralTags.map(t => t.name));

  console.log(CAT, `Generated ${outputTags.length} tags (${filteredCharacterTags.length} characters, ${filteredGeneralTags.length} general).`);
  
  // Log rating prediction (argmax equivalent)
  if (ratingTags.length > 0) {
    const topRating = ratingTags.reduce((max, tag) => tag.prob > max.prob ? tag : max, ratingTags[0]);
    console.log(CAT, `Rating: ${topRating.name} (${(topRating.prob * 100).toFixed(2)}%)`);
  }

  return outputTags;
}

async function runClTagger(modelPath, inputTensor, gen_threshold=0.55, char_threshold=0.6) {
  // Sigmoid function with clamping to avoid overflow
  function sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
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
  const outputName = session.outputNames[0];

  const results = await session.run({ [inputName]: inputTensor });
  const logits = results[outputName].data;

  const probs = logits.map(sigmoid);

  console.log(CAT, 'Model run complete. Mapping tags...');
  // Load tag mapping
  const mappingPath = modelPath.replace(/\.onnx$/, "_tag_mapping.json");
  if (!fs.existsSync(mappingPath)) throw new Error(`${CAT}Missing tag mapping file.`);
  const tagMapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));

  let outputTags = [];

  // Apply thresholds and collect tags
  for (const [idxStr, entry] of Object.entries(tagMapping)) {
    const i = parseInt(idxStr, 10);
    if (Number.isNaN(i)) continue;

    const tag = (entry?.tag) ? entry.tag : String(entry);
    const category = (entry?.category) ? entry.category : "General";

    const p = probs[i];
    if (typeof p === "undefined") continue;

    const threshold =
      ["Character", "Copyright", "Artist"].includes(category)
        ? char_threshold
        : gen_threshold;

    if (p >= threshold) {
      outputTags.push(String(tag).replace(/_/g, " "));
    }
  }
  console.log(CAT, `Generated ${outputTags.length} tags.`);
  return outputTags;
}

async function runModel({ image_input, model_choice, gen_threshold, char_threshold, general_mcut_enabled = false, character_mcut_enabled = false }) {
  try {
    const modelsDir = path.join(__dirname, "..", "..", "models", "tagger");  
    const modelPath = path.join(modelsDir, model_choice);
    if (!fs.existsSync(modelPath)) throw new Error(`${CAT}Model not found: ${modelPath}`);

    const runStart = Date.now();
    let result = "";
    console.log(CAT, `Loading model: ${model_choice}`);

    const spatialSize = 448;
    if (model_choice.startsWith('cl_')) {
      const imgArray = await preprocessImageCL(image_input, spatialSize);
      const inputTensorCl = new ort.Tensor("float32", imgArray, [1, 3, spatialSize, spatialSize]);
      result = await runClTagger(modelPath, inputTensorCl, gen_threshold, char_threshold);
    } else if (model_choice.startsWith('wd-')) {
      const imgArray = await preprocessImageWD(image_input, spatialSize);
      const inputTensor = new ort.Tensor("float32", imgArray, [1, spatialSize, spatialSize, 3]);
      result = await runWd14Tagger(modelPath, inputTensor, gen_threshold, char_threshold, general_mcut_enabled, character_mcut_enabled);
    } else {
      result = `${CAT}Unsupported model choice: ${model_choice}`;
    }

    const runMs = Date.now() - runStart;
    console.log(CAT, `Inference run time: ${runMs} ms`);
    return result;
  } catch (err) {
    console.error(CAT, "Error in runModel:", err);
    throw err;
  }
}

process.on('message', async (args) => {
  try {
    let result = '';
    result = await runModel(args);   
    process.send({ type: 'result', data: result });    
  } catch (err) {
    process.send({ type: 'error', data: err.message });
  } finally {
    // Optional: exit after one task
    // process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log(CAT, 'Subprocess terminating');
  process.exit(0);
});