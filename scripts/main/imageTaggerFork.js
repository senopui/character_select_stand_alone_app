
const ort = require("onnxruntime-node");
const fs = require("fs");
const path = require("path");

const { preprocessImageWD, runWd14Tagger } = require("./tagger/wd14tagger");
const { preprocessImageCL, runClTagger } = require("./tagger/clTagger");
const { preprocessCamieImage, runCamieTagger } = require("./tagger/camieTagger");

const CAT = '[imageTaggerChild]';

function getClCategories(model_options) {
  if (model_options === 'All') {
    return ['General', 'Character', 'Artist', 'Copyright', 'Meta', 'Model', 'Rating', 'Quality'];
  } else if (model_options === 'General/Character/Artist/CopyRight') {
    return ['General', 'Character', 'Artist', 'Copyright'];
  } else {
    return [model_options];
  }
}

function getWd14Flags(model_options) {
  return {
    mCutGeneral: model_options === 'General' || model_options === 'Both',
    mCutCharacter: model_options === 'Character' || model_options === 'Both'
  };
}

function getCamieCategories(model_options) {
  if (model_options === 'All') {
    return ["general", "rating", "meta", "character", "artist", "copyright", "year"];
  } else if (model_options === 'without Year') {
    return ["general", "rating", "meta", "character", "artist", "copyright"];
  } else if (model_options === 'without Year/Rating') {
    return ["general", "meta", "character", "artist", "copyright"];
  } else if (model_options === 'General/Character/Artist/CopyRight') {
    return ["general", "character", "artist", "copyright"];
  } else {
    return [model_options];
  }
}

async function runModel({ image_input, model_choice, gen_threshold, char_threshold, model_options }) {
  try {
    const modelsDir = path.join(__dirname, "..", "..", "models", "tagger");
    const modelPath = path.join(modelsDir, model_choice);
    if (!fs.existsSync(modelPath)) throw new Error(`${CAT}Model not found: ${modelPath}`);

    const runStart = Date.now();
    let result = "";
    console.log(CAT, `Loading model: ${model_choice}`);

    if (model_choice.startsWith('cl_')) {
      const cat = getClCategories(model_options);
      const spatialSize = 448;
      const imgArray = await preprocessImageCL(image_input, spatialSize);
      const inputTensorCl = new ort.Tensor("float32", imgArray, [1, 3, spatialSize, spatialSize]);
      result = await runClTagger(modelPath, inputTensorCl, gen_threshold, char_threshold, cat);
    } else if (model_choice.startsWith('wd-')) {
      const { mCutGeneral, mCutCharacter } = getWd14Flags(model_options);
      const spatialSize = 448;
      const imgArray = await preprocessImageWD(image_input, spatialSize);
      const inputTensor = new ort.Tensor("float32", imgArray, [1, spatialSize, spatialSize, 3]);
      result = await runWd14Tagger(modelPath, inputTensor, gen_threshold, char_threshold, mCutGeneral, mCutCharacter);
    } else if (model_choice.startsWith("camie-")) {
      const cat = getCamieCategories(model_options);
      const spatialSize = 512;
      const imgArray = await preprocessCamieImage(image_input, spatialSize);
      const inputTensor = new ort.Tensor("float32", imgArray, [1, 3, spatialSize, spatialSize]);
      result = await runCamieTagger(modelPath, inputTensor, {
        overall: gen_threshold,
        categories: cat
      });
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
    // exit after one task
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log(CAT, 'Subprocess terminating');
  process.exit(0);
});