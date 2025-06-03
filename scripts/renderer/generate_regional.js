import { decodeThumb } from './customThumbGallery.js';
import { getAiPrompt } from './remoteAI.js';
import { generateRandomSeed, getTagAssist, getLoRAs, getRandomIndex, formatCharacterInfo, formatOriginalCharacterInfo,
    getViewTags, createHiFix, createRefiner, extractHostPort, checkVpred } from './generate.js';

const CAT = '[Generate Regional]';

function getPrompts(character_left, character_right, views, ai='', apiInterface = 'None'){    
    const commonColor = (window.globalSettings.css_style==='dark')?'darkorange':'Sienna';
    const viewColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const aiColor = (window.globalSettings.css_style==='dark')?'hotpink':'Purple';
    const characterColor = (window.globalSettings.css_style==='dark')?'DeepSkyBlue':'MidnightBlue';
    const positiveColor = (window.globalSettings.css_style==='dark')?'LawnGreen':'SeaGreen';
    const positiveRColor = (window.globalSettings.css_style==='dark')?'LightSkyBlue':'Navy';

    let common = window.prompt.common.getValue();
    let positive = window.prompt.positive.getValue().trim();
    let positiveR = window.prompt.positive_right.getValue().trim();
    let aiPrompt = ai.trim();
    const exclude = window.prompt.exclude.getValue();

    if (common !== '' && !common.endsWith(',')) {
        common += ', ';
    }

    if(aiPrompt !== '' && !aiPrompt.endsWith(','))
        aiPrompt += ', ';

    let positivePromptLeft = `${common}${views}${aiPrompt}${character_left}${positive}`.replace(/\n+/g, ''); 
    let positivePromptRight = `${common}${views}${aiPrompt}${character_right}${positiveR}`.replace(/\n+/g, ''); 
    let positivePromptLeftColored = `[color=${commonColor}]${common}[/color][color=${viewColor}]${views}[/color][color=${aiColor}]${aiPrompt}[/color][color=${characterColor}]${character_left}[/color][color=${positiveColor}]${positive}[/color]`.replace(/\n+/g, ''); 
    let positivePromptRightColored = `[color=${commonColor}]${common}[/color][color=${viewColor}]${views}[/color][color=${aiColor}]${aiPrompt}[/color][color=${characterColor}]${character_right}[/color][color=${positiveRColor}]${positiveR}[/color]`.replace(/\n+/g, ''); 

    const excludeKeywords = exclude.split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);

        excludeKeywords.forEach(keyword => {
            const escapedKeyword = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); 
            const pattern = new RegExp(
                `(^|,\\s*|\\n\\s*)${escapedKeyword}(\\s*,\\s*|\\s*$|\\s*\\n)`,
                'gi'
            );
            positivePromptLeft = positivePromptLeft.replace(pattern, '$1'); 
            positivePromptLeftColored = positivePromptLeftColored.replace(pattern, '$1'); 
            positivePromptRight = positivePromptRight.replace(pattern, '$1'); 
            positivePromptRightColored = positivePromptRightColored.replace(pattern, '$1'); 
        });

    const loraPromot = getLoRAs(apiInterface);
    return {
        posL:positivePromptLeft, posLc:positivePromptLeftColored, 
        posR:positivePromptRight, posRc:positivePromptRightColored, 
        lora:loraPromot}
}

function createCharacters(index, seeds) {
    const FILES = window.cachedFiles;
    const character = window.characterListRegional.getKey()[index];
    const isValueOnly = window.characterListRegional.isValueOnly();
    const seed = seeds[index];

    if (character.toLowerCase() === 'none') {
        return { tag: '', tag_assist: '', thumb: null, info: '' };
    }

    const isOriginalCharacter = (index === 3 || index === 2);
    const { tag, thumb, info, weight } = isOriginalCharacter
        ? handleOriginalCharacter(character, seed, isValueOnly, index, FILES)
        : handleStandardCharacter(character, seed, isValueOnly, index, FILES);    

    const tagAssist = getTagAssist(tag, window.generate.tag_assist.getValue(), FILES, index, info);
    if (tagAssist.tas !== '')
        tagAssist.tas = `${tagAssist.tas}, `;

    const finalTag = isOriginalCharacter ? `${tag}` : tag.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    return {
        tag: finalTag,
        tag_assist: tagAssist.tas,
        thumb,
        info: tagAssist.info,
        weight: weight
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
        thumb = decodeThumb(character);
        info = formatCharacterInfo(index, isValueOnly, {
        key: character,
        value: window.characterListRegional.getValue()[index]
        });        
    }
    const weight = window.characterListRegional.getTextValue(index);
    return { tag, thumb, info, weight };
}

function handleOriginalCharacter(character, seed, isValueOnly, index, FILES) {
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
    const weight = window.characterListRegional.getTextValue(index);
    return { tag, thumb: null, info, weight };
}


function getCharacters(){    
    function parseCharacter(weight, tag){
        if(weight === 1.0){
            return (tag !== '')?`${tag}, `:'';
        } 

        return (tag !== '')?`(${tag}:${weight}), `:'';
    }

    let random_seed = window.generate.seed.getValue();
    if (random_seed === -1){
        random_seed = generateRandomSeed();
    }
    const seeds = [random_seed, Math.floor(random_seed /3), Math.floor(random_seed /7), 4294967296 - random_seed];

    let character_left = '';
    let character_right = '';
    let information = '';
    let thumbImages = [];

    for(let index=0; index < 4; index++) {
        let {tag, tag_assist, thumb, info, weight} = createCharacters(index, seeds);
        if (index === 0 || index === 2){
            character_left += parseCharacter(weight, tag);
            character_left += tag_assist;

            if (thumb) {            
                thumbImages.unshift(thumb);
            }            
        } else {
            character_right += parseCharacter(weight, tag);
            character_right += tag_assist;

            if (thumb) {            
                thumbImages.unshift(thumb);
            }     
        }

        information += `${info}`;
    }

    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    information += `Seed: [[color=${brownColor}]${seeds[0]}[/color]]\n`;    

    return{
        thumb: thumbImages,
        character_left:character_left,
        character_right:character_right,
        information: information,
        seed:random_seed
    }
}

function createPrompt(runSame, aiPromot, apiInterface){
    let finalInfo = ''
    let randomSeed = -1;
    let positivePromptLeft = '';
    let positivePromptLeftColored = '';
    let positivePromptRight = '';
    let positivePromptRightColored = '';
    let negativePrompt = '';

    if(runSame) {
        let seed = window.generate.seed.getValue();
        if (seed === -1){
            randomSeed = generateRandomSeed();
        }
        positivePromptLeft = window.generate.lastPos;
        positivePromptLeftColored = window.generate.lastPosColored;
        positivePromptRight = window.generate.lastPosR;
        positivePromptRightColored = window.generate.lastPosRColored;
        negativePrompt = window.generate.lastNeg;

    } else {            
        const {thumb, character_left, character_right, information, seed} = getCharacters();
        randomSeed = seed;
        finalInfo = information;

        const views = getViewTags(seed);
        const {posL, posLc, posR, posRc, lora} = getPrompts(character_left, character_right, views, aiPromot, apiInterface);
        if(lora === ''){
            positivePromptLeft = posL;
            positivePromptRight = posR;
        }
        else{
            const loraColor = (window.globalSettings.css_style==='dark')?'AliceBlue':'DarkBlue';
            positivePromptLeft = `${posL}\n${lora}`; // only need all lora once
            positivePromptRight = `${posR}\n`;
            finalInfo += `LoRA: [color=${loraColor}]${lora}[/color]\n`;
        }
        positivePromptLeftColored = posLc;
        positivePromptRightColored = posRc;
        negativePrompt = window.prompt.negative.getValue();
        window.thumbGallery.append(thumb);            
    }

    return {finalInfo, randomSeed, positivePromptLeft, positivePromptRight, positivePromptLeftColored, positivePromptRightColored, negativePrompt}
}

function createRegional() {
    const overlap_ratio = window.regional.overlap_ratio.getValue();
    const image_ratio = window.regional.image_ratio.getValue();

    const a = image_ratio / 50;
    const c = 2 - a;
    const b = overlap_ratio / 100;

    const ratio =`${a},${(b===0)?0.01:b},${c}`;

    const str_left = window.regional.str_left.getFloat();
    const str_right = window.regional.str_right.getFloat();

    const option_left = window.regional.option_left.getValue();
    const option_right = window.regional.option_right.getValue();    

    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const info = `Regional Condition:\n\tOverlap Ratio: [[color=${brownColor}]${overlap_ratio}[/color]]\n\tImage Ratio: [[color=${brownColor}]${image_ratio}[/color]]\n\tLeft Str: [[color=${brownColor}]${str_left}[/color]]\tMask Area: [[color=${brownColor}]${option_left}[/color]]\n\tRight Str: [[color=${brownColor}]${str_right}[/color]]\tMask Area: [[color=${brownColor}]${option_right}[/color]]\n`;

    return {info, ratio, str_left, str_right, option_left, option_right};
}

function createGenerateData(createPromptResult, apiInterface){    
    const brownColor = (window.globalSettings.css_style==='dark')?'BurlyWood':'Brown';

    const landscape = window.generate.landscape.getValue();
    const width = landscape?window.generate.height.getValue():window.generate.width.getValue();
    const height = landscape?window.generate.width.getValue():window.generate.height.getValue();
    const swap = window.regional.swap.getValue();
    
    const hifix = createHiFix(createPromptResult.randomSeed, apiInterface,brownColor);
    const refiner = createRefiner();
    const regional = createRegional();

    const generateData = {
            addr: extractHostPort(window.generate.api_address.getValue()),
            model: window.dropdownList.model.getValue(),
            vpred: checkVpred(),
            positive_left: swap?createPromptResult.positivePromptRight:createPromptResult.positivePromptLeft,
            positive_right: swap?createPromptResult.positivePromptLeft:createPromptResult.positivePromptRight,
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
            regional: regional
        }

    return generateData;
}

export async function generateRegionalImage(loops, runSame){
    const apiInterface = window.generate.api_interface.getValue();
    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    if(apiInterface !== 'ComfyUI') {
        console.warn('apiInterface', apiInterface);
        const errorMessage = LANG.regional_error_not_comfyui;
        window.mainGallery.hideLoading(errorMessage, errorMessage);
        return;
    }
    
    let ret = 'success';
    let retCopy = '';

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
        window.generate.lastPos = createPromptResult.positivePromptLeft;
        window.generate.lastPosColored = createPromptResult.positivePromptLeftColored;
        window.generate.lastPosR = createPromptResult.positivePromptRight;
        window.generate.lastPosRColored = createPromptResult.positivePromptRightColored;
        window.generate.lastNeg = createPromptResult.negativePrompt;

        const generateData = createGenerateData(createPromptResult, apiInterface);

        let finalInfo = `${createPromptResult.finalInfo}\n`;
        finalInfo += `Positive Left: ${createPromptResult.positivePromptLeftColored}\n`;
        finalInfo += `Positive Right: ${createPromptResult.positivePromptRightColored}\n`;
        finalInfo += `Negative: [color=${negativeColor}]${generateData.negative}[/color]\n\n`;
        finalInfo += `Layout: [[color=${brownColor}]${generateData.width} x ${generateData.height}[/color]]\t`;
        finalInfo += `CFG: [[color=${brownColor}]${generateData.cfg}[/color]]\t`;
        finalInfo += `Setp: [[color=${brownColor}]${generateData.step}[/color]]\n`;
        finalInfo += `Sampler: [[color=${brownColor}]${generateData.sampler}[/color]]\n`;
        finalInfo += `Scheduler: [[color=${brownColor}]${generateData.scheduler}[/color]]\n`;
        finalInfo += generateData.hifix.info;
        finalInfo += generateData.refiner.info;
        finalInfo += generateData.regional.info;
        finalInfo +=`\n`;

        window.infoBox.image.appendValue(finalInfo);        

        // in-case click cancel too quick or during AI gen
        if(window.generate.cancelClicked) {
            break;
        }

        // start generate        
        const result = await seartGenerateRegional(apiInterface, generateData);
        ret = result.ret;
        retCopy = result.retCopy;
        if(result.breakNow)
            break;    
    }

    window.mainGallery.hideLoading(ret, retCopy);
    window.generate.toggleButtons();
}

async function seartGenerateRegional(apiInterface, generateData){    
    const result = await runComfyUI(apiInterface, generateData);
    const ret = result.ret;
    const retCopy = result.retCopy;
    const breakNow = result.breakNow

    return {ret, retCopy, breakNow}
}

async function runComfyUI(apiInterface, generateData){
    function sendToGallery(image, generateData){
        if(!image)  // same prompts from backend will return null
            return;

        if(!keepGallery)
            window.mainGallery.clearGallery();
        window.mainGallery.appendImageData(image, `${generateData.seed}`, `${generateData.positive_left}\n${generateData.positive_right}`, keepGallery, window.globalSettings.scroll_to_last);
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
        const result = await window.api.runComfyUI_Regional(generateData);
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