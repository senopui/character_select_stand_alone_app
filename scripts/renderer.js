import { updateLanguage, updateSettings } from './renderer/language.js';
import { setupGallery } from './renderer/customGallery.js';
import { setupThumbOverlay, setupThumb } from './renderer/customThumbGallery.js';
import { setupSuggestionSystem } from './renderer/tagAutoComplete.js';
import { setupButtonOverlay, customCommonOverlay } from './renderer/customOverlay.js';
import { myCharacterList, myRegionalCharacterList, myViewsList, myLanguageList, mySimpleList } from './renderer/myDropdown.js';
import { callback_mySettingList, callback_api_interface, callback_sync_click_hf, callback_sync_click_refiner,
    callback_generate_start, callback_generate_skip, callback_generate_cancel,callback_keep_gallery,
    callback_regional_condition
 } from './renderer/callbacks.js';
import { setupSlider } from './renderer/mySlider.js';
import { setupCheckbox, setupRadiobox } from './renderer/myCheckbox.js';
import { setupButtons, toggleButtons } from './renderer/myButtons.js';
import { setupCollapsed, setupSaveSettingsToggle, setupModelReloadToggle, 
    setupRefreshToggle, setupSwapToggle, doSwap, reloadFiles } from './renderer/myCollapsed.js';
import { setupTextbox, setupInfoBox } from './renderer/myTextbox.js';
import { from_main_updateGallery, from_main_updatePreview, from_main_customOverlayProgress } from './renderer/generate_backend.js';
import { setupLoRA } from './renderer/myLoRASlot.js';
import { setupControlNet } from './renderer/myControlNetSlot.js';
import { setupJsonSlot } from './renderer/myJsonSlot.js';
import { setBlur, setNormal, showDialog } from './renderer/myDialog.js';
import { setupImageUploadOverlay } from './renderer/imageInfo.js';
import { setupThemeToggle } from './renderer/mytheme.js';
import { setupRightClickMenu, addSpellCheckSuggestions } from './renderer/myRightClickMenu.js';
import { extractHostPort } from './renderer/generate.js';

function afterDOMinit() {
    console.log("Script loaded, attempting initial setup");
    (async () => {
        const version = await window.api.getAppVersion();
        document.title = `Wai Character Select SAA ${version}`;

        setBlur();
        await init();
        window.okm.setup_mainGallery_appendImageData(from_main_updateGallery);
        window.okm.setup_customOverlay_updatePreview(from_main_updatePreview);
        window.okm.setup_customOverlay_progressBar(from_main_customOverlayProgress);
        window.okm.setup_rightClickMenu_spellCheck(addSpellCheckSuggestions);
        if (window.initialized) {
            setNormal();
        }
    })();    
}

export async function setupHeader(SETTINGS, FILES, LANG){
    window.dropdownList = {
        languageList: myLanguageList(FILES.language),            
        model: mySimpleList('model-select', LANG.api_model_file_select, FILES.modelList, 
            (index, value) => { window.globalSettings.api_model_file_select = value; }, 50),
        vpred:  mySimpleList('model-vpred', LANG.vpred, [LANG.vpred_auto, LANG.vpred_on, LANG.vpred_off], 
            (index, value) => { window.globalSettings.api_model_file_vpred = value; }, 5, false, false),            
        settings: mySimpleList('settings-select', LANG.title_settings_load, FILES.settingList, callback_mySettingList)
    }
    window.dropdownList.languageList.updateDefaults(LANG.language);
    window.dropdownList.vpred.updateDefaults(SETTINGS.api_model_file_vpred);

    // Setup Header button
    window.headerIcon = {
        save: setupSaveSettingsToggle(),
        reload: await setupModelReloadToggle(),
        refresh: setupRefreshToggle(),
        swap: setupSwapToggle(),
        theme: setupThemeToggle()
    }        

    // Character and OC List
    window.characterList = myCharacterList('dropdown-character', FILES.characterList, FILES.ocList);
    window.characterListRegional = myRegionalCharacterList('dropdown-character-regional', FILES.characterList, FILES.ocList);
}

export async function setupLeftRight(SETTINGS, FILES, LANG) {
    // Init Left
    window.viewList = myViewsList('dropdown-view', FILES.viewTags);        
    setupGallery('gallery-main-main');        
    window.infoBox = {
        image: setupInfoBox('image-infobox-main', LANG.output_info, '', true, 320),            
    }

    // Init Right
    setupThumb('gallery-thumb-main');
    setupThumbOverlay();
    window.imageInfo = setupImageUploadOverlay();

    window.collapsedTabs = {
        infoBox: setupCollapsed('image-infobox', false),
        gallery: setupCollapsed('gallery-main', false),
        thumb: setupCollapsed('gallery-thumb', true),
        hires: setupCollapsed('highres-fix', true),
        refiner: setupCollapsed('refiner', true),
        controlnet: setupCollapsed('controlnet', true),
        lora: setupCollapsed('add-lora', true),
        settings: setupCollapsed('system-settings', true),
        regional: setupCollapsed('regional-condition', true),
        jsonlist: setupCollapsed('jsonlist', true),
    }
}

export async function createGenerate(SETTINGS, FILES, LANG) {
    console.log('Creating window.generate');
    window.generate = {
        skipClicked: false,
        cancelClicked: false,
        nowAPI: 'none',
        lastPos: 'solo, masterpiece, best quality, amazing quality',
        lastPosColored: 'solo, masterpiece, best quality, amazing quality',
        lastNeg: 'bad quality,worst quality,worst detail,sketch',
        loadingMessage: null,

        regionalCondition: setupCheckbox('regional-condition-trigger', LANG.regional_condition, SETTINGS.regional_condition, true, (value) => { callback_regional_condition(value, false); }),
        regionalCondition_dummy: setupCheckbox('regional-condition-trigger-dummy', LANG.regional_condition, SETTINGS.regional_condition, true, (value) => { callback_regional_condition(value, true); }),
        scrollToLatest: setupCheckbox('gallery-main-latest', LANG.scroll_to_last, SETTINGS.scroll_to_last, true, (value) => { window.globalSettings.scroll_to_last = value; }),
        keepGallery: setupCheckbox('gallery-main-keep', LANG.keep_gallery, SETTINGS.keep_gallery, true, callback_keep_gallery),

        seed: setupSlider('generate-random-seed', LANG.random_seed, -1, 4294967295, 1, SETTINGS.random_seed, (value) =>{window.globalSettings.random_seed = value;}),
        cfg: setupSlider('generate-cfg', LANG.cfg, 1, 20, 0.01, SETTINGS.cfg, (value) =>{window.globalSettings.cfg = value;}),
        step: setupSlider('generate-step', LANG.step, 1, 100, 1, SETTINGS.step, (value) =>{window.globalSettings.step = value;}),
        width: setupSlider('generate-width', LANG.width, 512, 2048, 8, SETTINGS.width, (value) =>{window.globalSettings.width = value;}),
        height: setupSlider('generate-height', LANG.height, 512, 2048, 8, SETTINGS.height, (value) =>{window.globalSettings.height = value;}),
        batch: setupSlider('generate-batch', LANG.batch, 1, 2038, 1, SETTINGS.batch, (value) =>{window.globalSettings.batch = value;}),
        hifix: setupCheckbox('generate-hires-fix', LANG.api_hf_enable, SETTINGS.api_hf_enable, true, (value) => { window.globalSettings.api_hf_enable = value; callback_sync_click_hf('generate-hires-fix'); }),
        hifix_dummy: setupCheckbox('generate-hires-fix-dummy', LANG.api_hf_enable, SETTINGS.api_hf_enable, true, (value) => { window.globalSettings.api_hf_enable = value; callback_sync_click_hf('generate-hires-fix-dummy'); }),
        refiner: setupCheckbox('generate-refiner', LANG.api_refiner_enable, SETTINGS.api_refiner_enable, true, (value) => { window.globalSettings.api_refiner_enable = value; callback_sync_click_refiner('generate-refiner'); }),
        refiner_dummy: setupCheckbox('generate-refiner-dummy', LANG.api_refiner_enable, SETTINGS.api_refiner_enable, true, (value) => { window.globalSettings.api_refiner_enable = value; callback_sync_click_refiner('generate-refiner-dummy'); }),
        controlnet: setupCheckbox('generate-controlnet', LANG.api_controlnet_enable, SETTINGS.api_controlnet_enable, true, (value) => { 
                window.globalSettings.api_controlnet_enable = value; 
                if(value && window.generate.api_interface.getValue() === 'ComfyUI') 
                    window.overlay.custom.createErrorOverlay(LANG.message_controlnet_comfyui , 'Links:\nhttps://github.com/Fannovel16/comfyui_controlnet_aux\nhttps://github.com/sipherxyz/comfyui-art-venture'); 
                if(value && window.generate.api_interface.getValue() === 'WebUI') 
                    window.overlay.custom.createErrorOverlay(LANG.message_controlnet_webui , 'https://github.com/Mikubill/sd-webui-controlnet'); 
            }),
        landscape: setupCheckbox('generate-landscape', LANG.api_image_landscape, SETTINGS.api_image_landscape, true, (value) =>{window.globalSettings.api_image_landscape = value;}),
        tag_assist: setupCheckbox('generate-tag-assist', LANG.tag_assist, SETTINGS.tag_assist, true, (value) =>{ window.globalSettings.tag_assist = value; }),
        wildcard_random: setupCheckbox('generate-wildcard-random', LANG.wildcard_random, SETTINGS.wildcard_random, true, (value) =>{ window.globalSettings.wildcard_random = value; }),
        sampler: mySimpleList('generate-sampler', LANG.api_model_sampler, ['Auto'], (index, value) =>{ window.globalSettings.api_model_sampler = value; }, 20, false, false),
        scheduler: mySimpleList('generate-scheduler', LANG.api_model_scheduler, ['Auto'], (index, value) =>{ window.globalSettings.api_model_scheduler = value; }, 20, false, false),

        generate_single: setupButtons('generate-button-single', LANG.run_button, {
                defaultColor: 'rgb(234,88,12)',
                hoverColor: 'rgb(194,65,12)',
                disabledColor: 'rgb(136, 121, 115)',
                width: '100%',
                height: '32px',
                hidden: false,
                clickable: true              
            }, async () =>{
                await callback_generate_start(1, false);                    
            }),
        generate_batch: setupButtons('generate-button-batch', LANG.run_random_button, {
                defaultColor: 'rgb(185,28,28)',
                hoverColor: 'rgb(153,27,27)',
                disabledColor: 'rgb(134, 103, 103)',
                width: '100%',
                height: '32px',
                hidden: false,
                clickable: true              
            }, async () =>{
                await callback_generate_start(window.generate.batch.getValue(), false);                    
            }),
        generate_same: setupButtons('generate-button-same', LANG.run_same_button, {
                defaultColor: 'rgb(20,28,46)',
                hoverColor: 'rgb(40,48,66)',
                disabledColor: 'rgb(112, 123, 148)',
                width: '100%',
                height: '32px',
                hidden: false,
                clickable: true              
            }, async () =>{
                await callback_generate_start(window.generate.batch.getValue(), true);
            }),            
        generate_skip: setupButtons('generate-button-skip', LANG.run_skip_button, {
                defaultColor: 'rgb(82,82,91)',
                hoverColor: 'rgb(63,63,70)',
                disabledColor: 'rgb(175, 175, 182)',
                width: '100%',
                height: '32px',
                hidden: false,
                clickable: true              
            }, () =>{
                callback_generate_skip();
            }),
        generate_cancel: setupButtons('generate-button-cancel', LANG.run_cancel_button, {
                defaultColor: 'rgb(82,82,91)',
                hoverColor: 'rgb(63,63,70)',
                disabledColor: 'rgb(175, 175, 182)',
                width: '100%',
                height: '32px',
                hidden: false,
                clickable: true              
            }, () =>{
                callback_generate_cancel();
            }),
        api_interface: mySimpleList('system-settings-api-interface', LANG.api_interface, ['None', 'ComfyUI', 'WebUI'], callback_api_interface, 5, false, true),
        api_address: setupTextbox('system-settings-api-address', LANG.api_addr, {
            value: SETTINGS.api_addr,
            maxLines: 1
            }, true, (value) => { window.globalSettings.api_addr = value; }),
        api_preview_refresh_time: setupSlider('system-settings-api-refresh-rate', 
            LANG.api_preview_refresh_time, 0, 5, 1, SETTINGS.api_preview_refresh_time, 
            (value) => { window.globalSettings.api_preview_refresh_time = value; }),
        
        model_filter:setupCheckbox('system-settings-api-fliter', LANG.model_filter, SETTINGS.model_filter,
            false, (value) => {
            window.globalSettings.model_filter = value;
        }),
        model_filter_keyword:setupTextbox('system-settings-api-fliter-list', LANG.model_filter_keyword, {
            value: SETTINGS.model_filter_keyword,
            maxLines: 1
            }, true, (value) => {
            window.globalSettings.model_filter_keyword = value;
        }),
        search_modelinsubfolder:setupCheckbox('system-settings-api-subfolder', LANG.search_modelinsubfolder, SETTINGS.search_modelinsubfolder,
            false, (value) => {
            window.globalSettings.search_modelinsubfolder = value;
        }),

        model_path_comfyui:setupTextbox('system-settings-api-comfyui', LANG.model_path_comfyui, {
            value: SETTINGS.model_path_comfyui,
            maxLines: 1
            }, true, (value) => { window.globalSettings.model_path_comfyui = value; }),
        model_path_webui:setupTextbox('system-settings-api-webui', LANG.model_path_webui, {
            value: SETTINGS.model_path_webui,
            maxLines: 1
            }, true, (value) => {
                window.globalSettings.model_path_webui = value;
        }),
        webui_auth: setupTextbox('system-settings-api-webui-auth', 'API Key', {
            value: SETTINGS.remote_ai_webui_auth,
            defaultTextColor: 'MediumAquaMarine',
            maxLines: 1
            }, true, (value) => { window.globalSettings.remote_ai_webui_auth = value;}, true),  
        webui_auth_enable: mySimpleList('system-settings-api-webui-auth-enable', LANG.remote_ai_webui_auth_enable, ['OFF', 'ON'], 
            (value) => {window.globalSettings.remote_ai_webui_auth_enable = value; }, 5, false, true),
    };
}

export async function createPrompt(SETTINGS, FILES, LANG) {
    console.log('Creating window.prompt');
    window.prompt = {
        common: setupTextbox('prompt-common', LANG.custom_prompt, {
            value: SETTINGS.custom_prompt,
            defaultTextColor: 'darkorange',
            maxLines: 5                
            }, false, (value) => { window.globalSettings.custom_prompt = value; }),
        positive: setupTextbox('prompt-positive', LANG.api_prompt, {
            value: SETTINGS.api_prompt,
            defaultTextColor: 'LawnGreen',
            maxLines: 5
            }, false, (value) => { window.globalSettings.api_prompt = value; }),
        positive_right: setupTextbox('prompt-positive-right', LANG.api_prompt, {    //Regional Condition
            value: SETTINGS.api_prompt_right,
            defaultTextColor: 'LawnGreen',
            maxLines: 5
            }, false, (value) => { window.globalSettings.api_prompt_right = value; }),
        negative: setupTextbox('prompt-negative', LANG.api_neg_prompt, {
            value: SETTINGS.api_neg_prompt,
            defaultTextColor: 'Crimson',
            maxLines: 5
            }, false, (value) => { window.globalSettings.api_neg_prompt = value; }),
        ai: setupTextbox('prompt-ai', LANG.ai_prompt, {
            value: SETTINGS.ai_prompt,
            defaultTextColor: 'hotpink',
            maxLines: 5
            }, false, (value) => { window.globalSettings.ai_prompt = value; }),
        exclude: setupTextbox('prompt-exclude', LANG.prompt_ban, {
            value: SETTINGS.prompt_ban,
            defaultTextColor: 'khaki',
            maxLines: 5
            }, false, (value) => { window.globalSettings.prompt_ban = value; })
    }
    console.log('Creating setupSuggestionSystem');
    setupSuggestionSystem();
}

export async function createHifixRefiner(SETTINGS, FILES, LANG) {
    console.log('Creating window.hifix');
    window.hifix = {
        model: mySimpleList('hires-fix-model', LANG.api_hf_upscaler_selected, SETTINGS.api_hf_upscaler_list,
            (vindex, value) => { window.globalSettings.api_hf_upscaler_selected = value; }, 10, true, true),
        colorTransfer: mySimpleList('hires-fix-color-transfer', LANG.api_hf_colortransfer, ['None', 'Mean', 'Lab']
            , (index, value) => { window.globalSettings.api_hf_colortransfer = value; }, 3, false, true),
        randomSeed: setupCheckbox('hires-fix-random-seed',LANG.api_hf_random_seed, SETTINGS.api_hf_random_seed, true, 
            (value) => { window.globalSettings.api_hf_random_seed = value; }),
        scale: setupSlider('hires-fix-scale', LANG.api_hf_scale, 1, 2, 0.1, SETTINGS.api_hf_scale, 
            (value) => { window.globalSettings.api_hf_scale = value; }),
        denoise: setupSlider('hires-fix-denoise', LANG.api_hf_denoise, 0.1, 1, 0.01, SETTINGS.api_hf_denoise, 
            (value) => { window.globalSettings.api_hf_denoise = value; }),
        steps: setupSlider('hires-fix-steps', LANG.api_hf_steps, 1, 100, 1, SETTINGS.api_hf_steps,
            (value) => { window.globalSettings.api_hf_steps = value; })
    }

    console.log('Creating window.refiner');
    window.refiner = {
        model: mySimpleList('refiner-model', LANG.api_refiner_model, FILES.modelListAll, 
            (index, value) => { window.globalSettings.api_refiner_model = value; }, 15, true, true),
        vpred: mySimpleList('refiner-vpred', LANG.vpred, [LANG.vpred_auto, LANG.vpred_on, LANG.vpred_off], 
            (index, value) => { window.globalSettings.api_refiner_model_vpred = value; }, 5, false, false),
        addnoise: setupCheckbox('refiner-addnoise', LANG.api_refiner_add_noise, SETTINGS.api_refiner_add_noise, true,
            (value) => { window.globalSettings.api_refiner_add_noise = value; }),
        ratio: setupSlider('refiner-ratio', LANG.api_refiner_ratio, 0.1, 1, 0.1, SETTINGS.api_refiner_ratio,
            (value) => { window.globalSettings.api_refiner_ratio = value; })
    }
}

export async function createRegional(SETTINGS, FILES, LANG) {
    console.log('Creating window.regional');
    window.regional = {
        swap: setupCheckbox('regional-condition-swap', LANG.regional_swap, SETTINGS.regional_swap, true,
            (value) => { window.globalSettings.regional_swap = value; }),
        overlap_ratio: setupSlider('regional-condition-overlap-ratio', LANG.regional_overlap_ratio, 0, 200, 10, SETTINGS.regional_overlap_ratio,
            (value) => { window.globalSettings.regional_overlap_ratio = value; }),
        image_ratio: setupSlider('regional-condition-image-ratio', LANG.regional_image_ratio, 10, 90, 5, SETTINGS.regional_image_ratio,
            (value) => { window.globalSettings.regional_image_ratio = value; }),
        str_left: setupSlider('regional-condition-strength-left', LANG.regional_str_left, 0, 10, 0.1, SETTINGS.regional_str_left,
            (value) => { window.globalSettings.regional_str_left = value; }),
        str_right: setupSlider('regional-condition-strength-right', LANG.regional_str_right, 0, 10, 0.1, SETTINGS.regional_str_right,
            (value) => { window.globalSettings.regional_str_right = value; }),
        option_left: mySimpleList('regional-condition-option-left', LANG.regional_option_left, ['default', 'mask bounds'],
            (index, value) => { window.globalSettings.regional_option_left = value; }, 5, false, true),
        option_right: mySimpleList('regional-condition-option-right', LANG.regional_option_right, ['default', 'mask bounds'],
            (index, value) => { window.globalSettings.regional_option_right = value; }, 5, false, true)
    }
}

export async function createAI(SETTINGS, FILES, LANG) {
    console.log('Creating window.ai');
    window.ai ={
        ai_select: setupRadiobox("system-settings-ai-select", LANG.batch_generate_rule, LANG.ai_select, LANG.ai_select_title, SETTINGS.ai_prompt_role, 
            (value) => { window.globalSettings.ai_prompt_role = value; }),
        interface: mySimpleList('system-settings-ai-interface', LANG.ai_interface, ['None', 'Remote', 'Local'], 
            (index, value) => {window.globalSettings.ai_interface = value;}, 5, false, true),
        remote_timeout: setupSlider('system-settings-ai-timeout', LANG.remote_ai_timeout, 2, 60, 1, SETTINGS.remote_ai_timeout, 
            (value) => { window.globalSettings.remote_ai_timeout = value; }),
        remote_address: setupTextbox('system-settings-ai-address', LANG.remote_ai_base_url, {
            value: SETTINGS.remote_ai_base_url,
            maxLines: 1
            }, true, (value) => { window.globalSettings.remote_ai_base_url = value; }),
        remote_model_select: setupTextbox('system-settings-ai-modelselect', LANG.remote_ai_model, {
            value: SETTINGS.remote_ai_model,
            maxLines: 1
            }, true, (value) => { window.globalSettings.remote_ai_model = value; }),
        remote_apikey: setupTextbox('system-settings-ai-apikey', 'API Key', {
            value: SETTINGS.remote_ai_api_key,
            defaultTextColor: 'CornflowerBlue',
            maxLines: 1
            }, true, (value) => { window.globalSettings.remote_ai_api_key = value;}, true),  

        local_address: setupTextbox('system-settings-ai-local-address', LANG.ai_local_addr, {
            value: SETTINGS.ai_local_addr,
            maxLines: 1
            }, true, (value) => { window.globalSettings.ai_local_addr = value;}),
        local_temp: setupSlider('system-settings-ai-local-temperature', 
            LANG.ai_local_temp, 0.1, 2, 0.1, SETTINGS.ai_local_temp,
            (value) => { window.globalSettings.ai_local_temp = value;} ),
        local_n_predict: setupSlider('system-settings-ai-local-npredict', 
            LANG.ai_local_n_predict, 256, 4096, 256, SETTINGS.ai_local_n_predict,
            (value) => { window.globalSettings.ai_local_n_predict = value;} ),

        ai_system_prompt: setupTextbox('system-settings-ai-sysprompt', LANG.ai_system_prompt_text, {
            value: LANG.ai_system_prompt,
            maxLines: 30
            }, true),  
    }
}

async function init(){
    window.initialized = false;
    window.inBrowser = false; // Set to false for Electron environment
        
    try {
        // Init Global Settings
        window.globalSettings = await window.api.getGlobalSettings();

        // Setup main func
        window.mainGallery = {};
        window.thumbGallery = {};        

        // Loading files
        const cachedFiles = await window.api.getCachedFiles();
        window.cachedFiles = {
            language: cachedFiles.languages,
            characterThumb: cachedFiles.characterThumb,
            characterList: cachedFiles.characters,
            ocList: cachedFiles.ocCharacters,
            viewTags: cachedFiles.viewTags,
            tagAssist: cachedFiles.tagAssist,            
            settingList: await window.api.getSettingFiles(),
            loadingWait:`data:image/webp;base64,${cachedFiles.loadingWait.data}`,
            loadingFailed:`data:image/webp;base64,${cachedFiles.loadingFailed.data}`,
            privacyBall:`data:image/webp;base64,${cachedFiles.privacyBall.data}`
        };       
        
        const SETTINGS = window.globalSettings;
        const FILES = window.cachedFiles;
        const LANG = FILES.language[SETTINGS.language];

        window.cachedFiles.modelList = await window.api.getModelList(SETTINGS.api_interface);
        window.cachedFiles.modelListAll = await window.api.getModelListAll(SETTINGS.api_interface);
        window.cachedFiles.loraList = await window.api.getLoRAList(SETTINGS.api_interface);
        window.cachedFiles.controlnetList = await window.api.getControlNetList(SETTINGS.api_interface);
        window.cachedFiles.characterListArray = Object.entries(FILES.characterList);
        window.cachedFiles.ocListArray = Object.entries(FILES.ocList);
        window.cachedFiles.imageTaggerModels = await window.api.getImageTaggerModels();

        // Init Header
        await setupHeader(SETTINGS, FILES, LANG);

        // Init Left & Right
        await setupLeftRight(SETTINGS, FILES, LANG);
        
        // Functons
        await createGenerate(SETTINGS, FILES, LANG);
        await createPrompt(SETTINGS, FILES, LANG);
        await createHifixRefiner(SETTINGS, FILES, LANG);
        await createRegional(SETTINGS, FILES, LANG);
        await createAI(SETTINGS, FILES, LANG);
        
        // LoRA
        window.lora = setupLoRA('add-lora-main');
        
        // Control Net
        window.controlnet = setupControlNet('controlnet-main');

        // Custom JSON
        window.jsonlist = setupJsonSlot('jsonlist-main');

        // Setup Overlay
        window.overlay = {
            buttons: setupButtonOverlay(),
            custom: customCommonOverlay()
        }

        window.generate.toggleButtons = toggleButtons;
        window.generate.lastPos = '';
        window.generate.lastPosColored = '';
        window.generate.lastPosR = '';
        window.generate.lastPosRColored = '';
        window.generate.lastNeg = '';

        // Right Click Menu
        // window.rightClick
        setupRightClickMenu();

        // Done
        window.initialized = true;        
        if(SETTINGS.setup_wizard) {
            window.globalSettings.setup_wizard = false;
            await setupWizard();
            await setupModelReloadToggle();
        }
        doSwap(window.globalSettings.rightToleft);   //default is right to left        
        updateLanguage(false, window.inBrowser);
        updateSettings();        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function setupWizard(){
    const languageSelect = await showDialog('radio', { 
        message: 'Select your language\n请选择界面语言',
        items: 'en-US,zh-CN',
        itemsTitle:'English (US),中文（简体）',
        buttonText: 'OK'
    });
    console.log(languageSelect);
    window.globalSettings.language = ['en-US','zh-CN'][languageSelect];

    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    await showDialog('info', { message: LANG.setup_greet_message, buttonText:SETTINGS.setup_ok});
    const interfaceSelectIndex = await showDialog('radio', { 
        message: LANG.setup_webui_comfyui_select,
        items: 'ComfyUI,WebUI,None',
        itemsTitle:'ComfyUI,WebUI,None',
        buttonText: SETTINGS.setup_ok
    });
    const interfaceSelect= ['ComfyUI', 'WebUI', 'None'];
    window.globalSettings.api_interface = interfaceSelect[interfaceSelectIndex];

    console.log('window.globalSettings.api_interface', window.globalSettings.api_interface);

    if(window.globalSettings.api_interface !== 'None'){       
        if(window.globalSettings.api_interface === 'ComfyUI'){
            window.globalSettings.model_path_comfyui = await showDialog('input', { 
                message: LANG.setup_model_folder,
                placeholder: SETTINGS.model_path_comfyui, 
                defaultValue: SETTINGS.model_path_comfyui,
                showCancel: false,
                buttonText: LANG.setup_ok
            });                
        } else {
            window.globalSettings.model_path_webui = await showDialog('input', { 
                message: LANG.setup_model_folder,
                placeholder: SETTINGS.model_path_webui, 
                defaultValue: SETTINGS.model_path_webui,
                showCancel: false,
                buttonText: LANG.setup_ok
            });    
        }

        const api_addr = await showDialog('input', { 
            message: LANG.setup_webui_comfyui_api_addr.replace('{0}', window.globalSettings.api_interface),
            placeholder: SETTINGS.api_addr, 
            defaultValue: SETTINGS.api_addr,
            showCancel: false,
            buttonText: LANG.setup_ok
        });
        window.globalSettings.api_addr = extractHostPort(api_addr);

        window.globalSettings.model_filter = await showDialog('confirm', { 
            message: LANG.setup_model_filter,
            yesText: LANG.setup_yes,
            noText: LANG.setup_no
        });

        window.globalSettings.model_filter_keyword = await showDialog('input', { 
            message: LANG.setup_model_filter_keyword,
            placeholder: SETTINGS.model_filter_keyword, 
            defaultValue: SETTINGS.model_filter_keyword,
            showCancel: false,
            buttonText: LANG.setup_ok
        });

        window.globalSettings.search_modelinsubfolder = await showDialog('confirm', { 
            message: LANG.setup_search_modelinsubfolder,
            yesText: LANG.setup_yes,
            noText: LANG.setup_no
        });
    } else {
        const skipWizard = await await showDialog('confirm', { 
            message: LANG.setup_skip_wizard,
            yesText: LANG.setup_yes,
            noText: LANG.setup_no
        });

        if(skipWizard)
            return;
    }

    const aiInterfaceSelectIndex = await showDialog('radio', { 
        message: LANG.setup_remote_ai_interface,
        items: 'None,Remote,Local',
        itemsTitle:'None,Remote,Local',
        buttonText: LANG.setup_ok
    });
    const aiInterfaceSelect= ['None', 'Remote', 'Local'];
    window.globalSettings.ai_interface = aiInterfaceSelect[aiInterfaceSelectIndex];

    if(window.globalSettings.ai_interface === 'Remote') {
        window.globalSettings.remote_ai_base_url = await showDialog('input', { 
            message: LANG.setup_remote_ai_addr,
            placeholder: SETTINGS.remote_ai_base_url, 
            defaultValue: SETTINGS.remote_ai_base_url,
            showCancel: false,
            buttonText: SETTINGS.setup_ok
        });

        window.globalSettings.remote_ai_model = await showDialog('input', { 
            message: LANG.setup_remote_ai_model,
            placeholder: SETTINGS.remote_ai_model, 
            defaultValue: SETTINGS.remote_ai_model,
            showCancel: false,
            buttonText: LANG.setup_ok
        });

        window.globalSettings.remote_ai_api_key = await showDialog('input', { 
            message: LANG.setup_remote_ai_api_key,
            placeholder: SETTINGS.remote_ai_api_key, 
            defaultValue: '',
            showCancel: false,
            buttonText: LANG.setup_ok
        });
    } else if(window.globalSettings.ai_interface === 'Local') {
        window.globalSettings.ai_local_addr = await showDialog('input', { 
            message: LANG.setup_local_ai_addr,
            placeholder: SETTINGS.ai_local_addr, 
            defaultValue: SETTINGS.ai_local_addr,
            showCancel: false,
            buttonText: LANG.setup_ok
        });
    }

    await window.api.saveSettingFile('settings.json', window.globalSettings);
    window.cachedFiles.settingList = await window.api.updateSettingFiles();
    window.dropdownList.settings.setOptions(window.cachedFiles.settingList);
    window.dropdownList.settings.updateDefaults(`settings.json`);
    await reloadFiles();
    await showDialog('info', { message: LANG.setup_done, buttonText:SETTINGS.setup_ok});
}

// Run the init function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {    
    afterDOMinit();        
});
