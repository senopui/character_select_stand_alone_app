const CAT = '[Language]'

export const SAMPLER_COMFYUI = ["euler_ancestral", "euler", "euler_cfg_pp", "euler_ancestral_cfg_pp", "heun", "heunpp2","dpm_2", "dpm_2_ancestral",
    "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_2s_ancestral_cfg_pp", "dpmpp_sde", "dpmpp_sde_gpu",
    "dpmpp_2m", "dpmpp_2m_cfg_pp", "dpmpp_2m_sde", "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpmpp_3m_sde_gpu", "ddpm", "lcm",
    "ipndm", "ipndm_v", "deis", "res_multistep", "res_multistep_cfg_pp", "res_multistep_ancestral", "res_multistep_ancestral_cfg_pp",
    "gradient_estimation", "er_sde", "seeds_2", "seeds_3"];
export const SCHEDULER_COMFYUI = ["normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform", "beta", "linear_quadratic", "kl_optimal"] ;

export const  SAMPLER_WEBUI = ["Euler a", "Euler", "DPM++ 2M", "DPM++ SDE", "DPM++ 2M SDE", "DPM++ 2M SDE Heun", "DPM++ 2S a", "DPM++ 3M SDE",
   "LMS", "Heun", "DPM2", "DPM2 a", "DPM fast", "DPM adaptive", "Restart"];
export const SCHEDULER_WEBUI = ["Automatic", "Uniform", "Karras", "Exponential", "Polyexponential", "SGM Uniform", "KL Optimal", "Align Your Steps", "Simple", "Normal", "DDIM", "Beta"];

function safeCheck(){
    if (!window.cachedFiles.language || !window.globalSettings.language) {
        console.error(CAT, 'Language data or globalSettings.language is not available.');
        return false;
    }

    const currentLanguage = window.cachedFiles.language[window.globalSettings.language];
    if (!currentLanguage) {
        console.error(CAT, `Language "${LANG}" not found in window.cachedFiles.language.`);
        return false;
    }

    return true;
}

function setDropdownLanguage(containerID, labelPrefixList){
    let labels = document.querySelectorAll(`.${containerID} .mydropdown-input-container`);
    let labelKeys = labelPrefixList;
    labels.forEach((label, index) => {
        if (labelKeys[index]) {
            label.title = labelKeys[index];
        }
    });
}

export function updateLanguage() {
    if(!safeCheck)
        return;    

    const LANG = window.cachedFiles.language[window.globalSettings.language];

    // Header 
    window.dropdownList.model.setTitle(LANG.api_model_file_select);
    window.dropdownList.vpred.setTitle(LANG.vpred);
    window.dropdownList.vpred.setValue(LANG.vpred, [LANG.vpred_auto, LANG.vpred_on, LANG.vpred_off]);
    window.dropdownList.settings.setTitle(LANG.title_settings_load);
    window.headerIcon.save.title = LANG.title_settings_save;
    window.headerIcon.reload.title = LANG.title_model_reload;
    window.headerIcon.refresh.title = LANG.title_global_refresh;
    window.headerIcon.swap.title = LANG.title_swap_layout;
    window.headerIcon.theme.title = LANG.title_theme;

    // Language List
    setDropdownLanguage('global-settings-language', [LANG.language_select]);

    // Character List
    setDropdownLanguage('dropdown-character', [LANG.character1, LANG.character2, LANG.character3, LANG.original_character]);
    window.characterList.setValueOnly(window.globalSettings.language === 'en-US');

    // View List
    setDropdownLanguage('dropdown-view', [LANG.view_angle, LANG.view_camera, LANG.view_background,LANG.view_style]);

    // Gallery Thumb
    let labels = document.querySelector('#gallery-thumb-span');
    labels.textContent = LANG.gallery_thumb_span;

    window.generate.seed.setTitle(LANG.random_seed);
    window.generate.cfg.setTitle(LANG.cfg);
    window.generate.step.setTitle(LANG.step);
    window.generate.width.setTitle(LANG.width);
    window.generate.height.setTitle(LANG.height);
    window.generate.batch.setTitle(LANG.batch);

    window.generate.hifix.setTitle(LANG.api_hf_enable);
    window.generate.hifix_dummy.setTitle(LANG.api_hf_enable);
    window.generate.refiner.setTitle(LANG.api_refiner_enable);
    window.generate.refiner_dummy.setTitle(LANG.api_refiner_enable);
    window.generate.landscape.setTitle(LANG.api_image_landscape);
    window.generate.tag_assist.setTitle(LANG.tag_assist);

    window.generate.sampler.setValue(LANG.api_model_sampler, window.globalSettings.api_interface==='ComfyUI'?SAMPLER_COMFYUI:SAMPLER_WEBUI);
    window.generate.scheduler.setValue(LANG.api_model_scheduler, window.globalSettings.api_interface==='ComfyUI'?SCHEDULER_COMFYUI:SCHEDULER_WEBUI);

    window.generate.generate_single.setTitle(LANG.run_button);
    window.generate.generate_batch.setTitle(LANG.run_random_button);
    window.generate.generate_same.setTitle(LANG.run_same_button);
    window.generate.generate_skip.setTitle(LANG.run_skip_button);
    window.generate.generate_cancel.setTitle(LANG.run_cancel_button);

    window.generate.api_interface.setTitle(LANG.api_interface);
    window.generate.api_address.setTitle(LANG.api_addr);
    window.generate.api_preview_refresh_time.setTitle(LANG.api_preview_refresh_time);    

    window.generate.model_path_comfyui.setTitle(LANG.model_path_comfyui);
    window.generate.model_path_webui.setTitle(LANG.model_path_webui);
    window.generate.model_filter.setTitle(LANG.model_filter);    
    window.generate.model_filter_keyword.setTitle(LANG.model_filter_keyword);
    window.generate.search_modelinsubfolder.setTitle(LANG.search_modelinsubfolder);

    window.generate.scrollToLatest.setTitle(LANG.scroll_to_last);
    window.generate.keepGallery.setTitle(LANG.keep_gallery);
    window.infoBox.image.setTitle(LANG.output_info);

    window.prompt.common.setTitle(LANG.custom_prompt);
    window.prompt.positive.setTitle(LANG.api_prompt);
    window.prompt.negative.setTitle(LANG.api_neg_prompt);
    window.prompt.ai.setTitle(LANG.ai_prompt);
    window.prompt.exclude.setTitle(LANG.prompt_ban);

    window.hifix.model.setTitle(LANG.api_hf_upscaler_selected);
    window.hifix.colorTransfer.setTitle(LANG.api_hf_colortransfer);
    window.hifix.randomSeed.setTitle(LANG.api_hf_random_seed);
    window.hifix.scale.setTitle(LANG.api_hf_scale);
    window.hifix.denoise.setTitle(LANG.api_hf_denoise);

    window.refiner.model.setTitle(LANG.api_refiner_model);
    window.refiner.addnoise.setTitle(LANG.api_refiner_add_noise);
    window.refiner.ratio.setTitle(LANG.api_refiner_ratio);
    window.refiner.vpred.setTitle(LANG.vpred);
    window.refiner.vpred.setValue(LANG.vpred, [LANG.vpred_auto, LANG.vpred_on, LANG.vpred_off]);

    window.ai.interface.setTitle(LANG.ai_interface);
    window.ai.remote_timeout.setTitle(LANG.remote_ai_timeout);
    window.ai.remote_address.setTitle(LANG.remote_ai_base_url);
    window.ai.remote_model_select.setTitle(LANG.remote_ai_model);
    window.ai.remote_apikey.setTitle('API Key');
    window.ai.ai_select.setTitle(LANG.batch_generate_rule, LANG.ai_select, LANG.ai_select_title);
    window.ai.local_address.setTitle(LANG.ai_local_addr);
    window.ai.local_temp.setTitle(LANG.ai_local_temp);
    window.ai.local_n_predict.setTitle(LANG.ai_local_n_predict);
    window.ai.ai_system_prompt.setTitle(LANG.ai_system_prompt_text);
    window.ai.ai_system_prompt.setValue(LANG.ai_system_prompt);

    window.overlay.buttons.reload();
    window.lora.reload();

    window.rightClick.updateLanguage();
}

export function updateSettings() {
    if(!safeCheck)
        return;    

    const SETTINGS = window.globalSettings;
    const LANG = window.cachedFiles.language[SETTINGS.language];

    window.dropdownList.languageList.updateDefaults(LANG.language);

    window.ai.remote_address.setValue(SETTINGS.remote_ai_base_url);
    window.ai.remote_model_select.setValue(SETTINGS.remote_ai_model);
    window.ai.remote_apikey.setValue(SETTINGS.remote_ai_api_key);
    window.ai.remote_timeout.setValue(SETTINGS.remote_ai_timeout);

    window.generate.model_path_comfyui.setValue(SETTINGS.model_path_comfyui);
    window.generate.model_path_webui.setValue(SETTINGS.model_path_webui);
    window.generate.model_filter.setValue(SETTINGS.model_filter);
    window.generate.model_filter_keyword.setValue(SETTINGS.model_filter_keyword);
    window.generate.search_modelinsubfolder.setValue(SETTINGS.search_modelinsubfolder);

    window.characterList.updateDefaults(SETTINGS.character1, SETTINGS.character2, SETTINGS.character3, 'None');
    window.generate.tag_assist.setValue(SETTINGS.tag_assist);

    window.viewList.updateDefaults(SETTINGS.view_angle, SETTINGS.view_camera, SETTINGS.view_background, SETTINGS.view_style);

    window.generate.sampler.updateDefaults(SETTINGS.api_model_sampler);
    window.generate.scheduler.updateDefaults(SETTINGS.api_model_scheduler);

    window.dropdownList.model.updateDefaults(SETTINGS.api_model_file_select);
    window.dropdownList.vpred.updateDefaults(SETTINGS.api_model_file_vpred);
    window.generate.seed.setValue(SETTINGS.random_seed);
    window.generate.cfg.setValue(SETTINGS.cfg);
    window.generate.step.setValue(SETTINGS.step);
    window.generate.width.setValue(SETTINGS.width);
    window.generate.height.setValue(SETTINGS.height);
    window.generate.batch.setValue(SETTINGS.batch);    
    window.generate.landscape.setValue(SETTINGS.api_image_landscape);
    window.generate.scrollToLatest.setValue(SETTINGS.scroll_to_last);
    window.generate.keepGallery.setValue(SETTINGS.keep_gallery);

    window.prompt.common.setValue(SETTINGS.custom_prompt);
    window.prompt.positive.setValue(SETTINGS.api_prompt);
    window.prompt.negative.setValue(SETTINGS.api_neg_prompt);
    window.prompt.ai.setValue(SETTINGS.ai_prompt);
    window.prompt.exclude.setValue(SETTINGS.prompt_ban);

    window.ai.interface.updateDefaults(SETTINGS.ai_interface);
    window.ai.local_address.setValue(SETTINGS.ai_local_addr);
    window.ai.local_temp.setValue(SETTINGS.ai_local_temp);
    window.ai.local_n_predict.setValue(SETTINGS.ai_local_n_predict);
    window.ai.ai_select.setValue(SETTINGS.ai_prompt_role);

    window.generate.api_interface.updateDefaults(SETTINGS.api_interface);
    window.generate.api_preview_refresh_time.setValue(SETTINGS.api_preview_refresh_time);
    window.generate.api_address.setValue(SETTINGS.api_addr);

    window.generate.hifix.setValue(SETTINGS.api_hf_enable);
    window.generate.hifix_dummy.setValue(SETTINGS.api_hf_enable);
    window.hifix.scale.setValue(SETTINGS.api_hf_scale);
    window.hifix.denoise.setValue(SETTINGS.api_hf_denoise);
    window.hifix.model.updateDefaults(SETTINGS.api_hf_upscaler_selected);
    window.hifix.colorTransfer.updateDefaults(SETTINGS.api_hf_colortransfer);
    window.hifix.randomSeed.setValue(SETTINGS.api_hf_random_seed);

    window.generate.refiner.setValue(SETTINGS.api_refiner_enable);
    window.generate.refiner_dummy.setValue(SETTINGS.api_refiner_enable);
    window.refiner.addnoise.setValue(SETTINGS.api_refiner_add_noise);    
    window.refiner.model.updateDefaults(SETTINGS.api_refiner_model);
    window.refiner.vpred.updateDefaults(SETTINGS.api_refiner_model_vpred);
    window.refiner.ratio.setValue(SETTINGS.api_refiner_ratio);
}