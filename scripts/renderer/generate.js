import { decodeThumb } from './customThumbGallery.js';
import { getAiPrompt } from './remoteAI.js';

const CAT = '[Generate]';

function generateRandomSeed() {
    return Math.floor(Math.random() * 4294967296); // 4294967296 = 2^32
}

function createViewTag(view_list, in_tag, seed) {
    let out_tag = '';

    if (in_tag.toLowerCase() === 'random') {
        if (!window.cachedFiles.viewTags[view_list]) {
            console.error(CAT, `[createViewTag] Invalid view_list: ${view_list}`);
            return '';
        }
        const tags = window.cachedFiles.viewTags[view_list];
        const index = seed % tags.length;
        const selectedIndex = (index === 0 || index === 1) ? 2 : index;
        out_tag = `${tags[selectedIndex].toLowerCase()}`;
    } else if (in_tag.toLowerCase() !== 'none') {
        out_tag = `${in_tag.toLowerCase()}`;
    } else {
        return '';
    }

    out_tag = out_tag.trim().replace(/\(/g, '\\(').replace(/\)/g, '\\)');    
    return out_tag;
}

function getViewTags(view_angle, view_camera, view_background, view_style, seed) {
    const tag_angle = createViewTag('angle', view_angle, seed);
    const tag_camera = createViewTag('camera', view_camera, seed);
    const tag_background = createViewTag('background', view_background, seed);
    const tag_style = createViewTag('style', view_style, seed);

    let combo = '';
    if(tag_angle !== '')
        combo += `${tag_angle}, `;

    if(tag_camera !== '')
        combo += `${tag_camera}, `;

    if(tag_background !== '')
        combo += `${tag_background}, `;

    if(tag_style !== '')
        combo += `${tag_style}, `;

    return combo;
}

function createCharacters(index, seeds) {
    const FILES = window.cachedFiles;
    const character = window.characterList.getKey()[index];
    const isValueOnly = window.characterList.isValueOnly();
    const seed = seeds[index];

    if (character.toLowerCase() === 'none') {
        return { tag: '', tag_assist: '', thumb: null, info: '' };
    }

    const isOriginalCharacter = index === 3;
    const { tag, thumb, info } = isOriginalCharacter
        ? handleOriginalCharacter(character, seed, isValueOnly, FILES)
        : handleStandardCharacter(character, seed, isValueOnly, index, FILES);

    const tagAssist = getTagAssist(tag, window.generate.tag_assist.getValue(), FILES, index, info);

    return {
        tag: isOriginalCharacter ? `${tag}, ` : tag.replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
        tag_assist: tagAssist.tas,
        thumb,
        info: tagAssist.info
    };
}

function handleStandardCharacter(character, seed, isValueOnly, index, FILES) {
    let tag, thumb, info;
    if (character.toLowerCase() === 'random') {
        const selectedIndex = getRandomIndex(seed, FILES.characterListArray.length);
        tag = FILES.characterListArray[selectedIndex][1];
        thumb = decodeThumb(FILES.characterListArray[selectedIndex][0]);
        info = formatCharacterInfo(index, isValueOnly, {
        key: FILES.characterListArray[selectedIndex][0],
        value: FILES.characterListArray[selectedIndex][1]
        });
    } else {
        tag = FILES.characterList[character];
        thumb = decodeThumb(isValueOnly ? character: FILES.characterList[character]);
        info = formatCharacterInfo(index, isValueOnly, {
        key: character,
        value: window.characterList.getValue()[index]
        });
    }
    return { tag, thumb, info };
}

function handleOriginalCharacter(character, seed, isValueOnly, FILES) {
    let tag, info;
    if (character.toLowerCase() === 'random') {
        const selectedIndex = getRandomIndex(seed, FILES.ocListArray.length);
        tag = FILES.ocListArray[selectedIndex][1];
        info = formatOriginalCharacterInfo({
        key: FILES.ocListArray[selectedIndex][0],
        value: FILES.ocListArray[selectedIndex][1]
        });
    } else {
        tag = FILES.ocList[character];
        info = formatOriginalCharacterInfo({ key: character, value: tag }, isValueOnly);
    }
    return { tag, thumb: null, info };
}

function getRandomIndex(seed, listLength) {
    const idx = seed % listLength;
    return (idx === 0 || idx === 1) ? 2 : idx;
}

function formatCharacterInfo(index, isValueOnly, { key, value }) {
    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const blueColor = (window.globalSettings.css_style==='dark')?'DeepSkyBlue':'MidnightBlue';

    const comboCharacterInfo = isValueOnly
        ? `[color=${blueColor}]${value}[/color]`
        : `[color=${brownColor}]${key}[/color] [[color=${blueColor}]${value}[/color]]`;
    return `Character ${index + 1}: ${comboCharacterInfo}\n`;
}

function formatOriginalCharacterInfo({ key, value }, isValueOnly = false) {
    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const blueColor = (window.globalSettings.css_style==='dark')?'DeepSkyBlue':'MidnightBlue';

    const comboCharacterInfo = isValueOnly
        ? `[color=${blueColor}]${value}[/color]`
        : `[color=${brownColor}]${key}[/color] [[color=${blueColor}]${value}[/color]]`;
    return `Original Character: ${comboCharacterInfo}\n`;
}

function getTagAssist(tag, useTAS, FILES, index, characterInfo) {
    const tomatoColor = (window.globalSettings.css_style==='dark')?'Tomato':'Maroon';

    let tas = '';
    let info = characterInfo;
    if (useTAS && tag in FILES.tagAssist) {
        tas = FILES.tagAssist[tag];
        info += `Tag Assist ${index + 1}: [[color=${tomatoColor}]${tas}[/color]]\n`;
    }
    return { tas, info };
}

function getCharacters(){
    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    let random_seed = window.generate.seed.getValue();
    if (random_seed === -1){
        random_seed = generateRandomSeed();
    }
    const seeds = [random_seed, Math.floor(random_seed /3), Math.floor(random_seed /7), 4294967296 - random_seed];

    let character = '';
    let information = '';
    let thumbImages = [];
    for(let index=0; index < 4; index++) {
        let {tag, tag_assist, thumb, info} = createCharacters(index, seeds);
        character += (tag !== '')?`${tag}, `:'';
        character += (tag_assist !== '')?`${tag_assist}, `:'';        

        if (thumb) {            
            thumbImages.push(thumb);
        }
        information += `${info}`;
    }

    information += `Seed: [[color=${brownColor}]${seeds[0]}[/color]]\n`;

    return{
        thumb: thumbImages,
        characters_tag:character,
        information: information,
        seed:random_seed
    }
}

function getPrompts(characters, views, ai='', apiInterface = 'None'){    
    const commonColor = (window.globalSettings.css_style==='dark')?'darkorange':'Sienna';
    const viewColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const aiColor = (window.globalSettings.css_style==='dark')?'hotpink':'Purple';
    const characterColor = (window.globalSettings.css_style==='dark')?'DeepSkyBlue':'MidnightBlue';
    const positiveColor = (window.globalSettings.css_style==='dark')?'LawnGreen':'SeaGreen';

    let common = window.prompt.common.getValue();
    let positive = window.prompt.positive.getValue().trim();
    let aiPrompt = ai.trim();
    const exclude = window.prompt.exclude.getValue();

    if (common !== '' && !common.endsWith(',')) {
        common += ', ';
    }

    if(aiPrompt !== '' && !aiPrompt.endsWith(','))
        aiPrompt += ', ';

    let positivePrompt = `${common}${views}${aiPrompt}${characters}${positive}`.replace(/\n+/g, ''); 
    let positivePromptColored = `[color=${commonColor}]${common}[/color][color=${viewColor}]${views}[/color][color=${aiColor}]${aiPrompt}[/color][color=${characterColor}]${characters}[/color][color=${positiveColor}]${positive}[/color]`.replace(/\n+/g, ', '); 

    const excludeKeywords = exclude.split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);

        excludeKeywords.forEach(keyword => {
            const escapedKeyword = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); 
            const pattern = new RegExp(
                `(^|,\\s*|\\n\\s*)${escapedKeyword}(\\s*,\\s*|\\s*$|\\s*\\n)`,
                'gi'
            );
            positivePrompt = positivePrompt.replace(pattern, '$1'); 
            positivePromptColored = positivePromptColored.replace(pattern, '$1'); 
        });

    const loraPromot = getLoRAs(apiInterface);
    return {pos:positivePrompt, posc:positivePromptColored, lora:loraPromot}
}

function getLoRAs(apiInterface) {
    const loraData = window.lora.getValues();
    if (!Array.isArray(loraData) || loraData.length === 0 || apiInterface === 'None') {
        return '';
    }
    
    const formattedStrings = [];
    
    for (const slot of loraData) {
        if (!Array.isArray(slot) || slot.length < 4) continue;
        
        const [loraName, modelStrength, clipStrength, enableMode] = slot;
        
        // Skip if mode is "OFF"
        if (enableMode === "OFF") continue;
        
        if(apiInterface === 'ComfyUI') {
            // Format based on enable mode
            switch (enableMode) {
                case "ALL":
                    formattedStrings.push(`<lora:${loraName}:${modelStrength}:${clipStrength}>`);
                    break;
                case "Base":
                    formattedStrings.push(`<lora:${loraName}:${modelStrength}:${clipStrength}:0:0>`);
                    break;
                case "HiFix":
                    formattedStrings.push(`<lora:${loraName}:0:0:${modelStrength}:${clipStrength}>`);
                    break;
                default:
                    // Handle any unexpected cases
                    console.warn(`Unknown enable mode for LoRA: ${enableMode}`);
                    break;
            }
        } else {
            const pattern = /([^/\\]+?)(?=\.safetensors$)/i;
            const match = loraName.match(pattern);
            if (match) {
                formattedStrings.push(`<lora:${match[1]}:${modelStrength}>`);
            }
            
        }
    }
    
    return formattedStrings.join('\n');
}

function createPrompt(runSame, aiPromot, apiInterface){
    let finalInfo = ''
    let randomSeed = -1;
    let positivePrompt = '';
    let positivePromptColored = '';
    let negativePrompt = '';

    if(runSame) {
        let seed = window.generate.seed.getValue();
        if (seed === -1){
            randomSeed = generateRandomSeed();
        }
        positivePrompt = window.generate.lastPos;
        positivePromptColored = window.generate.lastPosColored;
        negativePrompt = window.generate.lastNeg;

    } else {            
        const {thumb, characters_tag, information, seed} = getCharacters();
        randomSeed = seed;
        finalInfo = information;

        const views = getViewTags(window.viewList.getValue()[0], window.viewList.getValue()[1], window.viewList.getValue()[2], window.viewList.getValue()[3], seed);
        const {pos, posc, lora} = getPrompts(characters_tag, views, aiPromot, apiInterface);
        if(lora === ''){
            positivePrompt = pos;
        }
        else{
            const loraColor = (window.globalSettings.css_style==='dark')?'AliceBlue':'DarkBlue';
            positivePrompt = `${pos}\n${lora}`;
            finalInfo += `LoRA: [color=${loraColor}]${lora}[/color]\n`;
        }
        positivePromptColored = posc;            
        negativePrompt = window.prompt.negative.getValue();
        window.thumbGallery.append(thumb);            
    }

    return {finalInfo, randomSeed, positivePrompt, positivePromptColored, negativePrompt}
}

function createHiFix(randomSeed, apiInterface, brownColor){
    const hfSeed = generateRandomSeed();
    let hifix = {
        enable: window.generate.hifix.getValue(),
        model: window.hifix.model.getValue(),
        colorTransfer: window.hifix.colorTransfer.getValue(),
        randomSeed: window.hifix.randomSeed.getValue(),
        seed: window.hifix.randomSeed.getValue()?hfSeed:randomSeed,
        scale: window.hifix.scale.getFloat(),
        denoise: window.hifix.denoise.getFloat(),
        info: ''
    }
    if(hifix.enable) {
        if(apiInterface === 'ComfyUI') {
            if(!hifix.model.endsWith('(C)')) {
                console.warn(CAT, `Reset ${hifix.model} to 4x-UltraSharp`);
                hifix.model = '4x-UltraSharp';
            } else {
                hifix.model = hifix.model.replace('(C)', ''); 
            }
        } else if(apiInterface === 'WebUI') {
            if(!hifix.model.endsWith('(W)')) {
                console.warn(CAT, `Reset ${hifix.model} to R-ESRGAN 4x+`);
                hifix.model = 'R-ESRGAN 4x+';
            } else {
                hifix.model = hifix.model.replace('(W)', ''); 
            }
        }

        if(hifix.randomSeed) {
            hifix.info = `Hires Fix Seed: [[color=${brownColor}]${hfSeed}[/color]]\n`;
            hifix.seed = hfSeed;
        }
    }

    return hifix;
}

function createRefiner(){
    const refinerVpred = window.refiner.vpred.getValue();        
    let vPred = 0;
    if(refinerVpred == window.cachedFiles.language[window.globalSettings.language].vpred_on)
        vPred = 1;
    else if(refinerVpred == window.cachedFiles.language[window.globalSettings.language].vpred_off)
        vPred = 2;   

    const refiner = {
        enable: window.generate.refiner.getValue(),
        model: window.refiner.model.getValue(),
        vpred: vPred,
        addnoise: window.refiner.addnoise.getValue(),
        ratio: window.refiner.ratio.getFloat(),
        info: ''
    }
    if(refiner.enable && refiner.model !== window.dropdownList.model.getValue())
    {
        const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
        refiner.info = `Refiner Model: [[color=${brownColor}]${refiner.model}[/color]]\n`;
    }
     return refiner;
}

function checkVpred(){
    let vPred = 0;
    const modelVpred = window.dropdownList.vpred.getValue();
    if(modelVpred === window.cachedFiles.language[window.globalSettings.language].vpred_on)
        vPred = 1;
    else if(modelVpred === window.cachedFiles.language[window.globalSettings.language].vpred_off)
        vPred = 2;

    return vPred;
}

export async function generateImage(loops, runSame){
    let ret = 'success';
    let retCopy = '';
    
    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];
    const apiInterface = window.generate.api_interface.getValue();
        
    window.generate.toggleButtons();
    window.mainGallery.showLoading(LANG.overlay_title, LANG.overlay_te, LANG.overlay_sec);
    window.thumbGallery.clear();
    window.infoBox.image.clear();
    
    const negativeColor = (window.globalSettings.css_style==='dark')?'red':'Crimson';
    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';

    for(let loop = 0; loop < loops; loop++){
        if(window.generate.skipClicked || window.generate.cancelClicked){
            break;
        }
                
        const aiPromot = await getAiPrompt(loop, LANG.generate_ai);

        window.generate.loadingMessage = LANG.generate_start.replace('{0}', `${loop+1}`).replace('{1}', loops);

        const createPromptResult = createPrompt(runSame, aiPromot, apiInterface);                
        const landscape = window.generate.landscape.getValue();
        const width = landscape?window.generate.height.getValue():window.generate.width.getValue();
        const height = landscape?window.generate.width.getValue():window.generate.height.getValue();
        
        const hifix = createHiFix(createPromptResult.randomSeed, apiInterface,brownColor);
        const refiner = createRefiner();
        
        window.generate.lastPos = createPromptResult.positivePrompt;
        window.generate.lastPosColored = createPromptResult.positivePromptColored;
        window.generate.lastNeg = createPromptResult.negativePrompt;

        const generateData = {
            addr: window.generate.api_address.getValue(),
            model: window.dropdownList.model.getValue(),
            vpred: checkVpred(),
            positive: createPromptResult.positivePrompt,
            negative: createPromptResult.negativePrompt,
            width: width,
            height: height,
            cfg: window.generate.cfg.getValue(),
            step: window.generate.step.getValue(),
            seed: createPromptResult.randomSeed,
            sampler: window.generate.sampler.getValue(),
            scheduler: window.generate.scheduler.getValue(),
            refresh:window.generate.api_preview_refresh_time.getValue(),
            hifix: hifix,
            refiner: refiner,            
        }

        let finalInfo = `${createPromptResult.finalInfo}\n`;
        finalInfo += `Positive: ${createPromptResult.positivePromptColored}\n`;
        finalInfo += `Negative: [color=${negativeColor}]${generateData.negative}[/color]\n\n`;
        finalInfo += `Layout: [[color=${brownColor}]${generateData.width} x ${generateData.height}[/color]]\t`;
        finalInfo += `CFG: [[color=${brownColor}]${generateData.cfg}[/color]]\t`;
        finalInfo += `Setp: [[color=${brownColor}]${generateData.step}[/color]]\n`;
        finalInfo += `Sampler: [[color=${brownColor}]${generateData.sampler}[/color]]\n`;
        finalInfo += `Scheduler: [[color=${brownColor}]${generateData.scheduler}[/color]]\n`;
        finalInfo += hifix.info;
        finalInfo += refiner.info;        
        finalInfo +=`\n`;
        window.infoBox.image.appendValue(finalInfo);        

        // in-case click cancel too quick or during AI gen
        if(window.generate.cancelClicked) {
            break;
        }

        // start generate        
        const result = await seartGenerate(apiInterface, generateData);
        ret = result.ret;
        retCopy = result.retCopy;
        if(result.breakNow)
            break;    
    }

    window.mainGallery.hideLoading(ret, retCopy);
    window.generate.toggleButtons();
}

async function seartGenerate(apiInterface, generateData){
    let ret = 'success';
    let retCopy = '';
    let breakNow = false;

    if(apiInterface === 'None') {
        console.warn('apiInterface', apiInterface);
    } else if(apiInterface === 'ComfyUI') {
        const result = await runComfyUI(apiInterface, generateData);
        ret = result.ret;
        retCopy = result.retCopy;
        breakNow = result.breakNow
    } else if(apiInterface === 'WebUI') {
        const result = await runWebUI(apiInterface, generateData);
        ret = result.ret;
        retCopy = result.retCopy;
        breakNow = result.breakNow
    }

    return {ret, retCopy, breakNow}
}

async function runComfyUI(apiInterface, generateData){
    function sendToGallery(image, generateData){
        if(!image)  // same prompts from backend will return null
            return;

        if(!keepGallery)
            window.mainGallery.clearGallery();
        window.mainGallery.appendImageData(image, `${generateData.seed}`, generateData.positive, keepGallery);
    }

    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    window.generate.nowAPI = apiInterface;
    const keepGallery = window.generate.keepGallery.getValue();
    let ret = 'success';
    let retCopy = '';
    let breakNow = false;

    try {
        const result = await window.api.runComfyUI(generateData);
        if(result.startsWith('Error')){                    
            ret = LANG.gr_error_creating_image.replace('{0}',result).replace('{1}', apiInterface)
            retCopy = result;
            breakNow = true;
        } else {
            const parsedResult = JSON.parse(result);
            if (parsedResult.prompt_id) {
                try {
                    const image = await window.api.openWsComfyUI(parsedResult.prompt_id);
                    if(window.generate.cancelClicked){
                        breakNow = true;
                    } else {                    
                        sendToGallery(image, generateData);
                    }
                } catch (error){
                    ret = LANG.gr_error_creating_image.replace('{0}',error.message).replace('{1}', apiInterface);
                    retCopy = error.message;
                    breakNow = true;
                } finally {
                    window.api.closeWsComfyUI();
                }                
            }
        }
    } catch (error) {
        ret = LANG.gr_error_creating_image.replace('{0}',error.message).replace('{1}', apiInterface)
        retCopy = error.message;
        breakNow = true;
    }

    return {ret, retCopy, breakNow }
}

async function runWebUI(apiInterface, generateData) {
    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    window.generate.nowAPI = apiInterface;
    const keepGallery = window.generate.keepGallery.getValue();
    let ret = 'success';
    let retCopy = '';
    let breakNow = false;

    try {
        const result = await window.api.runWebUI(generateData);
        
        if(window.generate.cancelClicked) {
            breakNow = true;
        } else {
            const typeResult = typeof result;
            if(typeResult === 'string'){
                if(result.startsWith('Error')){
                    ret = LANG.gr_error_creating_image.replace('{0}',result).replace('{1}', apiInterface)
                    retCopy = result;
                    breakNow = true;
                }

                if(!keepGallery)
                    window.mainGallery.clearGallery();
                window.mainGallery.appendImageData(result, `${generateData.seed}`, generateData.positive, keepGallery);
            }
        }
    } catch (error) {
        ret = LANG.gr_error_creating_image.replace('{0}',error.message).replace('{1}', apiInterface)
        retCopy = error.message;
        breakNow = true;
    }

    window.api.stopPollingWebUI();    
    return {ret, retCopy, breakNow }
}
