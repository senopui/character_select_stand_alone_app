import { decodeThumb } from './customThumbGallery.js';
import { generateImage } from './generate.js';
import { generateRegionalImage } from './generate_regional.js';
import { doSwap, reloadFiles } from './myCollapsed.js';
import { SAMPLER_COMFYUI, SAMPLER_WEBUI, SCHEDULER_COMFYUI, SCHEDULER_WEBUI, updateLanguage, updateSettings } from './language.js';
import { setBlur, setNormal } from './myDialog.js';
import { applyTheme } from './mytheme.js';
import { sendWebSocketMessage } from '../../webserver/front/wsRequest.js';

export async function callback_mySettingList(index, selectedValue) {    
    if(!window.initialized)
        return;
    console.log('Loading settings file:', selectedValue);
    
    const value = selectedValue[0];
    const old_css = window.globalSettings.css_style;
    setBlur();
    window.initialized = false;
    if (!window.inBrowser) {
        window.globalSettings = await window.api.loadSettingFile(value);
    } else {
        window.globalSettings = await sendWebSocketMessage({ type: 'API', method: 'loadSettingFile', params: [value] });
    }
    doSwap(window.globalSettings.rightToleft);    
    await reloadFiles()
    updateLanguage(true, window.inBrowser); 
    updateSettings(true);
    window.dropdownList.settings.updateDefaults(value);
    if(old_css !== window.globalSettings.css_style)
        applyTheme(window.globalSettings.css_style);
    
    window.lora.flush();
    window.initialized = true;
    setNormal();
}

export async function callback_api_interface(index, selectedValue){
    window.globalSettings.api_interface = selectedValue[0];

    const SETTINGS = window.globalSettings;
    const LANG = window.cachedFiles.language[SETTINGS.language];
    window.generate.sampler.setValue(LANG.api_model_sampler, (SETTINGS.api_interface==='ComfyUI')?SAMPLER_COMFYUI:SAMPLER_WEBUI);
    window.generate.scheduler.setValue(LANG.api_model_scheduler, (SETTINGS.api_interface==='ComfyUI')?SCHEDULER_COMFYUI:SCHEDULER_WEBUI);

    if (!window.inBrowser) {
        window.cachedFiles.modelList = await window.api.getModelList(SETTINGS.api_interface);
        window.cachedFiles.modelListAll = await window.api.getModelListAll(SETTINGS.api_interface);
        window.cachedFiles.loraList = await window.api.getLoRAList(SETTINGS.api_interface);
    } else {
        window.cachedFiles.modelList = await sendWebSocketMessage({ type: 'API', method: 'getModelList', params: [SETTINGS.api_interface] });
        window.cachedFiles.modelListAll = await sendWebSocketMessage({ type: 'API', method: 'getModelListAll', params: [SETTINGS.api_interface] });
        window.cachedFiles.loraList = await sendWebSocketMessage({ type: 'API', method: 'getLoRAList', params: [SETTINGS.api_interface] });
    }
    window.lora.reload();

    if(window.generate.api_interface.getValue() !== 'ComfyUI'){
        window.hifix.colorTransfer.setValue(LANG.api_hf_colortransfer, ['None']);
        window.hifix.colorTransfer.updateDefaults('None');
    } else {
        window.hifix.colorTransfer.setValue(LANG.api_hf_colortransfer, ['None', 'Mean', 'Lab']);
        window.hifix.colorTransfer.updateDefaults(SETTINGS.api_hf_colortransfer);        
    }   
}

export async function callback_myCharacterList_updateThumb(){
    if(window.globalSettings.regional_condition) {
        const L = window.characterListRegional.getKey()[0];
        const R = window.characterListRegional.getKey()[1];

        const iL = await decodeThumb(L);
        const iR = await decodeThumb(R);
        const imgData = [];

        if (iR !== null) imgData.push(iR);
        if (iL !== null) imgData.push(iL);                

        window.thumbGallery.update(imgData);

        window.globalSettings.character_left = L;
        window.globalSettings.character_right = R;
    } else {
        const c1 = window.characterList.getKey()[0];
        const c2 = window.characterList.getKey()[1];
        const c3 = window.characterList.getKey()[2];

        const i1 = await decodeThumb(c1);
        const i2 = await decodeThumb(c2);
        const i3 = await decodeThumb(c3);
        const imgData = [];

        if (i3 !== null) imgData.push(i3);
        if (i2 !== null) imgData.push(i2);
        if (i1 !== null) imgData.push(i1);

        window.thumbGallery.update(imgData);

        window.globalSettings.character1 = c1;
        window.globalSettings.character2 = c2;
        window.globalSettings.character3 = c3;
    }
}

export function callback_myViewList_Update(){
    const v1 = window.viewList.getValue()[0];
    const v2 = window.viewList.getValue()[1];
    const v3 = window.viewList.getValue()[2];
    const v4 = window.viewList.getValue()[3];

    window.globalSettings.view_angle = v1;
    window.globalSettings.view_camera = v2;
    window.globalSettings.view_background = v3;
    window.globalSettings.view_style = v4;
}

export function callback_sync_click_hf(triggeredId) {
    if(!window.initialized)
        return;

    if (triggeredId === 'generate-hires-fix') {
        window.generate.hifix_dummy.setValue(window.generate.hifix.getValue());
    } else if (triggeredId === 'generate-hires-fix-dummy') {
        window.generate.hifix.setValue(window.generate.hifix_dummy.getValue());
    }
}

export function callback_sync_click_refiner(triggeredId) {
    if(!window.initialized)
        return;

    if (triggeredId === 'generate-refiner') {
        window.generate.refiner_dummy.setValue(window.generate.refiner.getValue());
    } else if (triggeredId === 'generate-refiner-dummy') {
        window.generate.refiner.setValue(window.generate.refiner_dummy.getValue());
    }
}

export async function callback_generate_start(loops = 1, runSame = false){
    window.generate.skipClicked = false;
    window.generate.cancelClicked = false;
    window.generate.generate_skip.setClickable(true);
    window.generate.generate_cancel.setClickable(true);

    if(window.globalSettings.regional_condition) {
        await generateRegionalImage(loops, runSame);
    } else {
        await generateImage(loops, runSame);
    }
}

export function callback_generate_skip() {
    window.generate.generate_skip.setClickable(false);
    window.generate.skipClicked = true;
}

export async function callback_generate_cancel() {
    window.generate.generate_skip.setClickable(false);
    window.generate.generate_cancel.setClickable(false);
    window.generate.cancelClicked = true;

    if (!window.inBrowser) {
        const apiInterface = window.generate.nowAPI;
        if(apiInterface === 'ComfyUI') {
            await window.api.cancelComfyUI();
        } else if(apiInterface === 'WebUI') {
            await window.api.cancelWebUI();
        }
    } else {
        const apiInterface = window.generate.nowAPI;
        if(apiInterface === 'ComfyUI') {
            await sendWebSocketMessage({ type: 'API', method: 'cancelComfyUI' });
        } else if(apiInterface === 'WebUI') {
            await sendWebSocketMessage({ type: 'API', method: 'cancelWebUI' });
        }
    }
}

export function callback_keep_gallery() {
    const keepGallery = window.generate.keepGallery.getValue();
    if(!keepGallery) {
        window.mainGallery.clearGallery();
    }

    window.globalSettings.keep_gallery = keepGallery;
}

export function callback_regional_condition(trigger, dummy = false){
    if (dummy) {
        window.generate.regionalCondition.setValue(window.generate.regionalCondition_dummy.getValue());
    } else {
        window.generate.regionalCondition_dummy.setValue(window.generate.regionalCondition.getValue());
    }
    window.globalSettings.regional_condition = trigger;

    const SETTINGS = window.globalSettings;
    const LANG = window.cachedFiles.language[SETTINGS.language];    
    
    const dropdown1 = document.querySelector('.dropdown-character');
    const dropdown2 = document.querySelector('.dropdown-character-regional');
    const text1 = document.querySelector('.prompt-positive-right');

    if (trigger) {
        dropdown1.style.display = 'none';
        dropdown2.style.display = 'flex';
        text1.style.display = 'block';       

        window.prompt.common.setTitle(LANG.regional_custom_prompt);
        window.prompt.positive.setTitle(LANG.regional_api_prompt);

        window.prompt.positive_right.setValue(SETTINGS.api_prompt_right);
    } else {
        dropdown1.style.display = 'flex';
        dropdown2.style.display = 'none';
        text1.style.display = 'none';

        window.prompt.common.setTitle(LANG.custom_prompt);
        window.prompt.positive.setTitle(LANG.api_prompt);
    }
}