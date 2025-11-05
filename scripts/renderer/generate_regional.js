import { decodeThumb } from './customThumbGallery.js';
import { getAiPrompt } from './remoteAI.js';
import { generateRandomSeed, getTagAssist, getLoRAs, replaceWildcardsAsync, getRandomIndex, formatCharacterInfo, formatOriginalCharacterInfo,
    getViewTags, createHiFix, createRefiner, extractHostPort, checkVpred, extractAPISecure,
    createControlNet, processRandomString } from './generate.js';
import { sendWebSocketMessage } from '../../webserver/front/wsRequest.js';

// eslint-disable-next-line sonarjs/cognitive-complexity
function getCustomJSON(loop=-1){
    let BeforeOfPromptsL = '';
    let BeforeOfCharacterL = '';
    let EndOfCharacterL = '';
    let EndOfPromptsL = '';

    let BeforeOfPromptsR = '';
    let BeforeOfCharacterR = '';
    let EndOfCharacterR = '';
    let EndOfPromptsR = '';
    
    const jsonSlots = globalThis.jsonlist.getValues(loop);

    for(const {prompt, strength, regional, method} of jsonSlots) {
        if(method === 'Off')
            continue;

        const trimmedPrompt = prompt.replaceAll('\\', '\\\\').replaceAll('(', String.raw`\(`).replaceAll(')', String.raw`\)`).replaceAll(':', ' ');
        let finalPrompt;
        if (Number.parseFloat(strength) === 1)
            finalPrompt = `${trimmedPrompt}, `;
        else
            finalPrompt = `(${trimmedPrompt}:${strength}), `;


        if(regional == 'Both') {
            if(method === 'BOP') {
                BeforeOfPromptsL = BeforeOfPromptsL + finalPrompt;
                BeforeOfPromptsR = BeforeOfPromptsR + finalPrompt;
            }
            else if(method === 'EOP') {
                EndOfPromptsL = EndOfPromptsL + finalPrompt;
                EndOfPromptsR = EndOfPromptsR + finalPrompt;
            }
            if(method === 'BOC') {
                BeforeOfCharacterL = BeforeOfCharacterL + finalPrompt;
                BeforeOfCharacterR = BeforeOfCharacterR + finalPrompt;
            }
            else if(method === 'EOC') {
                EndOfCharacterL = EndOfCharacterL + finalPrompt;
                EndOfCharacterR = EndOfCharacterR + finalPrompt;
            }
        } else if(regional == 'Left') {
            if(method === 'BOP') {
                BeforeOfPromptsL = BeforeOfPromptsL + finalPrompt;
            }
            else if(method === 'EOP') {
                EndOfPromptsL = EndOfPromptsL + finalPrompt;
            }
            if(method === 'BOC') {
                BeforeOfCharacterL = BeforeOfCharacterL + finalPrompt;
            }
            else if(method === 'EOC') {
                EndOfCharacterL = EndOfCharacterL + finalPrompt;
            }
        } else if(regional == 'Right') {
            if(method === 'BOP') {
                BeforeOfPromptsR = BeforeOfPromptsR + finalPrompt;
            }
            else if(method === 'EOP') {
                EndOfPromptsR = EndOfPromptsR + finalPrompt;
            }
            if(method === 'BOC') {
                BeforeOfCharacterR = BeforeOfCharacterR + finalPrompt;
            }
            else if(method === 'EOC') {
                EndOfCharacterR = EndOfCharacterR + finalPrompt;
            }
        } 
    };

    return {
        BOPL: BeforeOfPromptsL,
        BOCL: BeforeOfCharacterL,
        EOCL: EndOfCharacterL,
        EOPL: EndOfPromptsL,
        BOPR: BeforeOfPromptsR,
        BOCR: BeforeOfCharacterR,
        EOCR: EndOfCharacterR,
        EOPR: EndOfPromptsR
    }
}

function getPrompts(character_left, character_right, views, ai='', apiInterface = 'None', loop = -1){
    const commonColor = (globalThis.globalSettings.css_style==='dark')?'darkorange':'Sienna';
    const viewColor = (globalThis.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const aiColor = (globalThis.globalSettings.css_style==='dark')?'hotpink':'Purple';
    const characterColor = (globalThis.globalSettings.css_style==='dark')?'DeepSkyBlue':'MidnightBlue';
    const positiveColor = (globalThis.globalSettings.css_style==='dark')?'LawnGreen':'SeaGreen';
    const positiveRColor = (globalThis.globalSettings.css_style==='dark')?'LightSkyBlue':'Navy';

    let common = globalThis.prompt.common.getValue();
    let positive = globalThis.prompt.positive.getValue().trim();
    let positiveR = globalThis.prompt.positive_right.getValue().trim();
    let aiPrompt = ai.trim();
    const exclude = globalThis.prompt.exclude.getValue();

    if (common !== '' && !common.endsWith(',')) {
        common += ', ';
    }

    if(aiPrompt !== '' && !aiPrompt.endsWith(','))
        aiPrompt += ', ';

    const {BOPL, BOCL, EOCL, EOPL, BOPR, BOCR, EOCR, EOPR} = getCustomJSON(loop);

    let positivePromptLeft = `${BOPL}${common}${views}${aiPrompt}${BOCL}${character_left}${EOCL}${positive}${EOPL}`.replaceAll(/\n+/g, ''); 
    let positivePromptRight = `${BOPR}${common}${views}${aiPrompt}${BOCR}${character_right}${EOCR}${positiveR}${EOPR}`.replaceAll(/\n+/g, ''); 

    let positivePromptLeftColored = `[color=${commonColor}]${BOPL}${common}[/color][color=${viewColor}]${views}[/color][color=${aiColor}]${aiPrompt}[/color][color=${characterColor}]${BOCL}${character_left}${EOCL}[/color][color=${positiveColor}]${positive}${EOPL}[/color]`.replaceAll(/\n+/g, ''); 
    let positivePromptRightColored = `[color=${commonColor}]${BOPR}${common}[/color][color=${viewColor}]${views}[/color][color=${aiColor}]${aiPrompt}[/color][color=${characterColor}]${BOCR}${character_right}${EOCR}[/color][color=${positiveRColor}]${positiveR}${EOPR}[/color]`.replaceAll(/\n+/g, ''); 

    const excludeKeywords = exclude.split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);

    for (const keyword of excludeKeywords) {
        const escapedKeyword = keyword.replaceAll(/[-[\]{}()*+?.,\\^$|#\s]/g, String.raw`\$&`);
        const pattern = new RegExp(
            `(^|,\\s*|\\n\\s*)${escapedKeyword}(\\s*,\\s*|\\s*$|\\s*\\n)`,
            'gi'
        );
        positivePromptLeft = positivePromptLeft.replace(pattern, '$1');
        positivePromptLeftColored = positivePromptLeftColored.replace(pattern, '$1');
        positivePromptRight = positivePromptRight.replace(pattern, '$1');
        positivePromptRightColored = positivePromptRightColored.replace(pattern, '$1');
    }

    const loraPromot = getLoRAs(apiInterface);
    return {
        posL:positivePromptLeft, posLc:positivePromptLeftColored, 
        posR:positivePromptRight, posRc:positivePromptRightColored, 
        lora:loraPromot}
}

async function createCharacters(index, seeds) {
    const FILES = globalThis.cachedFiles;
    const character = globalThis.characterListRegional.getKey()[index];
    const isValueOnly = globalThis.characterListRegional.isValueOnly();
    const seed = seeds[index];

    if (character.toLowerCase() === 'none') {
        return { tag: '', tag_assist: '', thumb: null, info: '' };
    }

    const isOriginalCharacter = (index === 3 || index === 2);
    const { tag, thumb, info, weight } = isOriginalCharacter
        ? handleOriginalCharacter(character, seed, isValueOnly, index, FILES)
        : await handleStandardCharacter(character, seed, isValueOnly, index, FILES);    

    const tagAssist = getTagAssist(tag, globalThis.generate.tag_assist.getValue(), FILES, index, info);
    if (tagAssist.tas !== '')
        tagAssist.tas = `${tagAssist.tas}, `;

    const finalTag = isOriginalCharacter ? `${tag}` : tag.replaceAll('\\', '\\\\').replaceAll('(', String.raw`\(`).replaceAll(')', String.raw`\)`);
    return {
        tag: finalTag,
        tag_assist: tagAssist.tas,
        thumb,
        info: tagAssist.info,
        weight: weight
    };
}

async function handleStandardCharacter(character, seed, isValueOnly, index, FILES) {
    let tag, thumb, info;
    if (character.toLowerCase() === 'random') {
        const selectedIndex = getRandomIndex(seed, FILES.characterListArray.length);
        tag = FILES.characterListArray[selectedIndex][1];
        thumb = await decodeThumb(FILES.characterListArray[selectedIndex][0]);
        info = formatCharacterInfo(index, isValueOnly, {
        key: FILES.characterListArray[selectedIndex][0],
        value: FILES.characterListArray[selectedIndex][1]
        });        
    } else {
        tag = FILES.characterList[character];
        thumb = await decodeThumb(character);
        info = formatCharacterInfo(index, isValueOnly, {
        key: character,
        value: globalThis.characterListRegional.getValue()[index]
        });        
    }
    const weight = globalThis.characterListRegional.getTextValue(index);
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
    const weight = globalThis.characterListRegional.getTextValue(index);
    return { tag, thumb: null, info, weight };
}

function parseCharacter(weight, tag){
    if(weight === 1){
        return (tag === '')?'':`${tag}, `;
    } 

    return (tag === '')?'':`(${tag}:${weight}), `;
}

async function getCharacters(){    
    let random_seed = globalThis.generate.seed.getValue();
    if (random_seed === -1){
        random_seed = generateRandomSeed();
    }
    const seeds = [random_seed, Math.floor(random_seed /3), Math.floor(random_seed /7), 4294967296 - random_seed];

    let character_left = '';
    let character_right = '';
    let information = '';
    let thumbImages = [];

    for(let index=0; index < 4; index++) {
        let {tag, tag_assist, thumb, info, weight} = await createCharacters(index, seeds);
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

    const brownColor = (globalThis.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    information += `Seed: [[color=${brownColor}]${seeds[0]}[/color]]\n`;    

    return{
        thumb: thumbImages,
        character_left:character_left,
        character_right:character_right,
        information: information,
        seed:random_seed
    }
}

async function createPrompt(runSame, aiPromot, apiInterface, loop=-1){
    let finalInfo = ''
    let randomSeed = -1;
    let randomSeedr = -1;
    let positivePromptLeft = '';
    let positivePromptLeftColored = '';
    let positivePromptRight = '';
    let positivePromptRightColored = '';
    let negativePrompt = '';

    if(runSame) {
        let seed = globalThis.generate.seed.getValue();
        if (seed === -1){
            randomSeed = generateRandomSeed();
        }
        positivePromptLeft = globalThis.generate.lastPos;
        positivePromptLeftColored = globalThis.generate.lastPosColored;
        positivePromptRight = globalThis.generate.lastPosR;
        positivePromptRightColored = globalThis.generate.lastPosRColored;
        negativePrompt = globalThis.generate.lastNeg;

    } else {            
        const {thumb, character_left, character_right, information, seed} = await getCharacters();
        randomSeed = seed;
        randomSeedr = Math.floor(seed / 3);
        finalInfo = information;

        const views = getViewTags(seed);
        let {posL, posLc, posR, posRc, lora} = getPrompts(character_left, character_right, views, aiPromot, apiInterface, loop);

        posL = await replaceWildcardsAsync(posL, randomSeed);
        posLc = await replaceWildcardsAsync(posLc, randomSeed);

        posR = await replaceWildcardsAsync(posR, randomSeedr);
        posRc = await replaceWildcardsAsync(posRc, randomSeedr);

        posL = processRandomString(posL);
        posLc = processRandomString(posLc);

        posR = processRandomString(posR);
        posRc = processRandomString(posRc);

        if(lora === ''){
            positivePromptLeft = posL;
            positivePromptRight = posR;
        }
        else{
            const loraColor = (globalThis.globalSettings.css_style==='dark')?'AliceBlue':'DarkBlue';
            positivePromptLeft = `${posL}\n${lora}`; // only need all lora once
            positivePromptRight = `${posR}\n`;
            finalInfo += `LoRA: [color=${loraColor}]${lora}[/color]\n`;
        }
        positivePromptLeftColored = posLc;
        positivePromptRightColored = posRc;
        negativePrompt = globalThis.prompt.negative.getValue();
        globalThis.thumbGallery.append(thumb);            
    }

    return {finalInfo, randomSeed, positivePromptLeft, positivePromptRight, positivePromptLeftColored, positivePromptRightColored, negativePrompt}
}

function createRegional() {
    const overlap_ratio = globalThis.regional.overlap_ratio.getValue();
    const image_ratio = globalThis.regional.image_ratio.getValue();

    const a = image_ratio / 50;
    const c = 2 - a;
    const b = overlap_ratio / 100;

    const ratio =`${a},${(b===0)?0.01:b},${c}`;

    const str_left = globalThis.regional.str_left.getFloat();
    const str_right = globalThis.regional.str_right.getFloat();

    const option_left = globalThis.regional.option_left.getValue();
    const option_right = globalThis.regional.option_right.getValue();    

    const brownColor = (globalThis.globalSettings.css_style==='dark')?'BurlyWood':'Brown';
    const info = `Regional Condition:\n\tOverlap Ratio: [[color=${brownColor}]${overlap_ratio}[/color]]\n\tImage Ratio: [[color=${brownColor}]${image_ratio}[/color]]\n\tLeft Str: [[color=${brownColor}]${str_left}[/color]]\tMask Area: [[color=${brownColor}]${option_left}[/color]]\n\tRight Str: [[color=${brownColor}]${str_right}[/color]]\tMask Area: [[color=${brownColor}]${option_right}[/color]]\n`;

    return {info, ratio, str_left, str_right, option_left, option_right};
}

async function createGenerateData(createPromptResult, apiInterface){    
    const brownColor = (globalThis.globalSettings.css_style==='dark')?'BurlyWood':'Brown';

    const landscape = globalThis.generate.landscape.getValue();
    const width = landscape?globalThis.generate.height.getValue():globalThis.generate.width.getValue();
    const height = landscape?globalThis.generate.width.getValue():globalThis.generate.height.getValue();
    const swap = globalThis.regional.swap.getValue();
    
    const hifix = createHiFix(createPromptResult.randomSeed, apiInterface,brownColor);
    const refiner = createRefiner();
    const regional = createRegional();

    let browserUUID = 'none';
    if(globalThis.inBrowser) {
        browserUUID = globalThis.clientUUID;
    }   

    const generateData = {
            addr: extractHostPort(globalThis.generate.api_address.getValue()),
            auth: extractAPISecure(apiInterface),
            uuid: browserUUID,
            
            model: globalThis.dropdownList.model.getValue(),
            vpred: checkVpred(),
            positive_left: swap?createPromptResult.positivePromptRight:createPromptResult.positivePromptLeft,
            positive_right: swap?createPromptResult.positivePromptLeft:createPromptResult.positivePromptRight,
            negative: createPromptResult.negativePrompt,
            width: width,
            height: height,
            cfg: globalThis.generate.cfg.getValue(),
            step: globalThis.generate.step.getValue(),
            seed: createPromptResult.randomSeed,
            sampler: globalThis.generate.sampler.getValue(),
            scheduler: globalThis.generate.scheduler.getValue(),
            refresh:globalThis.generate.api_preview_refresh_time.getValue(),
            hifix: hifix,
            refiner: refiner,
            regional: regional,
            controlnet: await createControlNet(),            
        }

    return generateData;
}

export async function generateRegionalImage(loops, runSame){
    const apiInterface = globalThis.generate.api_interface.getValue();
    const SETTINGS = globalThis.globalSettings;
    const FILES = globalThis.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    if(apiInterface !== 'ComfyUI') {
        console.warn('apiInterface', apiInterface);
        const errorMessage = LANG.regional_error_not_comfyui;
        globalThis.mainGallery.hideLoading(errorMessage, errorMessage);
        return;
    }
    
    let ret = 'success';
    let retCopy = '';

    globalThis.generate.toggleButtons();
    globalThis.mainGallery.showLoading(LANG.overlay_title, LANG.overlay_te, LANG.overlay_sec);
    globalThis.thumbGallery.clear();
    globalThis.infoBox.image.clear();

    const negativeColor = (globalThis.globalSettings.css_style==='dark')?'red':'Crimson';
    const brownColor = (globalThis.globalSettings.css_style==='dark')?'BurlyWood':'Brown';

    for(let loop = 0; loop < loops; loop++){
        if(globalThis.generate.skipClicked || globalThis.generate.cancelClicked){
            break;
        }

        const aiPromot = await getAiPrompt(loop, LANG.generate_ai);

        globalThis.generate.loadingMessage = LANG.generate_start.replace('{0}', `${loop+1}`).replace('{1}', loops);

        const createPromptResult = await createPrompt(runSame, aiPromot, apiInterface, (loops > 1)?loop:-1);
        globalThis.generate.lastPos = createPromptResult.positivePromptLeft;
        globalThis.generate.lastPosColored = createPromptResult.positivePromptLeftColored;
        globalThis.generate.lastPosR = createPromptResult.positivePromptRight;
        globalThis.generate.lastPosRColored = createPromptResult.positivePromptRightColored;
        globalThis.generate.lastNeg = createPromptResult.negativePrompt;

        const generateData = await createGenerateData(createPromptResult, apiInterface);

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

        globalThis.infoBox.image.appendValue(finalInfo);        

        // in-case click cancel too quick or during AI gen
        if(globalThis.generate.cancelClicked) {
            break;
        }

        // start generate        
        const result = await seartGenerateRegional(apiInterface, generateData);
        ret = result.ret;
        retCopy = result.retCopy;
        if(result.breakNow)
            break;    
    }

    globalThis.mainGallery.hideLoading(ret, retCopy);
    globalThis.generate.toggleButtons();
}

async function seartGenerateRegional(apiInterface, generateData){    
    const result = await runComfyUI(apiInterface, generateData);
    const ret = result.ret;
    const retCopy = result.retCopy;
    const breakNow = result.breakNow

    return {ret, retCopy, breakNow}
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function runComfyUI(apiInterface, generateData){
    function sendToGallery(image, generateData){
        if(!image)  // same prompts from backend will return null
            return;

        if(!keepGallery)
            globalThis.mainGallery.clearGallery();
        globalThis.mainGallery.appendImageData(image, `${generateData.seed}`, `${generateData.positive_left}\n${generateData.positive_right}`, keepGallery, globalThis.globalSettings.scroll_to_last);
    }

    const SETTINGS = globalThis.globalSettings;
    const FILES = globalThis.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    globalThis.generate.nowAPI = apiInterface;
    const keepGallery = globalThis.generate.keepGallery.getValue();
    let ret = 'success';
    let retCopy = '';
    let breakNow = false;

    try {
        let result;
        if (globalThis.inBrowser) {
            result = await sendWebSocketMessage({ type: 'API', method: 'runComfyUI_Regional', params: [generateData] });
        } else {
            result = await globalThis.api.runComfyUI_Regional(generateData);
        }

        if(result.startsWith('Error')){                    
            ret = LANG.gr_error_creating_image.replace('{0}',result).replace('{1}', apiInterface);
            retCopy = result;
            breakNow = true;
        } else {
            const parsedResult = JSON.parse(result);            
            if (parsedResult.prompt_id) {
                try {
                    let image;
                    if (globalThis.inBrowser) {
                        image = await sendWebSocketMessage({ type: 'API', method: 'openWsComfyUI', params: [parsedResult.prompt_id] });
                    } else {
                        image = await globalThis.api.openWsComfyUI(parsedResult.prompt_id);
                    }

                    if(globalThis.generate.cancelClicked) {
                        breakNow = true;
                    } else {                    
                        sendToGallery(image, generateData);
                    }
                } catch (error){
                    ret = LANG.gr_error_creating_image.replace('{0}',error.message).replace('{1}', apiInterface);
                    retCopy = error.message;
                    breakNow = true;
                } finally {
                    if (globalThis.inBrowser) {
                        sendWebSocketMessage({ type: 'API', method: 'closeWsComfyUI' });
                    } else {
                        globalThis.api.closeWsComfyUI();
                    }
                }                
            } else {
                ret = parsedResult;
                retCopy = result;
                breakNow = true;
            }
        }
    } catch (error) {
        ret = LANG.gr_error_creating_image.replace('{0}',error.message).replace('{1}', apiInterface)
        retCopy = error.message;
        breakNow = true;
    }

    return {ret, retCopy, breakNow }
}