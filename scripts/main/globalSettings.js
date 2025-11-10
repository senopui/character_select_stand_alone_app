import { app, ipcMain } from 'electron';
import path from 'node:path';
import { loadJSONFile } from './fileHandlers.js';
import * as fs from 'node:fs';

const CAT = '[GlobalSettings]'
const appPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'resources', 'app') : app.getAppPath();
let SETTINGFILES = [];
let globalSettings;

const defaultSettings = {
    "ws_service": true,
    "ws_addr": '0.0.0.0',
    "ws_port": 51028,

    "setup_wizard": true,
    "language": "en-US",
    "css_style": "dark",
    "rightToleft": true,
    
    "model_path_comfyui": "",
    "model_path_webui": "",
    "webui_auth" : "user:pass",
    "webui_auth_enable" : "OFF",

    "model_filter": false,
    "model_filter_keyword": "waiNSFW,waiSHUFFLENOOB",
    "search_modelinsubfolder": true,
    
    "character1": "Random",
    "character2": "None",
    "character3": "None",
    "tag_assist": false,
    "wildcard_random": false,

    "regional_condition": false,    
    "regional_swap": false,
    "regional_overlap_ratio": 20,
    "regional_image_ratio": 50,
    "regional_str_left": 1,
    "regional_str_right": 1,
    "regional_option_left": "default",
    "regional_option_right": "default",
    "character_left": "None",
    "character_right": "None",
    
    "view_angle": "None",
    "view_camera": "None",
    "view_background": "None",
    "view_style": "None",
    
    "api_model_sampler" : "euler_ancestral", 
    "api_model_scheduler" : "normal",
    "api_model_file_select" : "Default",
    "api_model_file_vpred" : "Auto",
    "random_seed": -1,
    "cfg": 7,
    "step": 30,
    "width": 1024,
    "height": 1360,
    "batch": 3,
    "api_image_landscape": false,
    "scroll_to_last": false,
    "keep_gallery": true,
    
    "custom_prompt": "",
    "api_prompt": "masterpiece, best quality, amazing quality",
    "api_prompt_right": ":d, selfie",
    "api_neg_prompt": "bad quality,worst quality,worst detail,sketch,censor",
    "ai_prompt": "",
    "prompt_ban" : "",
    
    "remote_ai_base_url": "https://api.groq.com/openai/v1/chat/completions",
    "remote_ai_model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    "remote_ai_api_key":"<Your API Key here>",
    "remote_ai_timeout":10,

    "ai_interface": "None",
    "ai_local_addr": "http://127.0.0.1:8080/chat/completions",
    "ai_local_temp": 0.7,
    "ai_local_n_predict": 768,
    "ai_prompt_role": 1,
    
    "api_interface": "None",
    "api_preview_refresh_time": 1,
    "api_addr": "127.0.0.1:7860",
    
    "api_hf_enable": false,
    "api_hf_scale": 1.5,
    "api_hf_denoise": 0.4,
    "api_hf_upscaler_selected": "None",
    "api_hf_colortransfer": "Mean",
    "api_hf_random_seed": false,
    "api_hf_steps": 20,
    
    "api_refiner_enable": false,
    "api_refiner_add_noise": true,
    "api_refiner_model": "Default",
    "api_refiner_model_vpred": "Auto",
    "api_refiner_ratio": 0.4,

    "api_controlnet_enable": false,
    "api_adetailer_enable": false,

    "lora_slot": [],

    "generate_auto_start": true,
    //4:3:2=9 views 0-3, characters 4-6, regional characters 7-8
    "weights4dropdownlist": [1,1,1,1, 1,1,1, 1,1], 
}

function setupGlobalSettings() { 
    globalSettings = structuredClone(defaultSettings);
    const filePath = path.join(appPath, 'settings', 'settings.json');
    const mySettings = loadJSONFile(filePath);
    if (mySettings) {
        for (const [key, value] of Object.entries(mySettings)) {
            if (Object.hasOwn(globalSettings, key)) {
                globalSettings[key] = value;
            } else {
                console.warn(CAT, `Key "${key}" not found in globalSettings. Ignoring.`);
            }
        }
    } else {
        console.warn(CAT, `File settings.json not found, use default settings.`);
    }

    // All setting files
    SETTINGFILES = enumSettings();

    // Setup IPC
    ipcMain.handle('get-global-settings', async () => {
        return getGlobalSettings();
    });
    
    ipcMain.handle('get-all-settings-files', async () => {
        return getSettingFiles();
    });

    ipcMain.handle('update-all-setting-files', async () => {
        return updateSettingFiles();
    });
    
    ipcMain.handle('load-setting-file', async (event, fineName) => {
        return loadSettings(fineName);
    });

    ipcMain.handle('save-setting-file', async (event, fineName, settings) => {
        return saveSettings(fineName, settings);
    });
    return globalSettings;
}

function saveSettings(fineName, settings) {   
    if (!fineName || typeof fineName !== 'string' || !fineName.toLowerCase().endsWith('.json')) {
        console.error(CAT, `Invalid filename: "${fineName}". Must be a non-empty string ending with .json`);
        return false;
    }
    if (!settings || typeof settings !== 'object') {
        console.error(CAT, `Invalid settings: must be a non-null object`);
        return false;
    }

    const settingsDir = path.join(appPath, 'settings', fineName.replaceAll(/[/|\\:*?"<>]/g, " "));
    const settingsParentDir = path.join(appPath, 'settings');

    try {
        if (!fs.existsSync(settingsParentDir)) {
            fs.mkdirSync(settingsParentDir, { recursive: true });
            console.log(CAT, `Created settings directory: ${settingsParentDir}`);
        }

        if (fs.existsSync(settingsDir)) {
            fs.unlinkSync(settingsDir);
            console.log(CAT, `Deleted existing file: ${settingsDir}`);
        }

        const settingsJson = JSON.stringify(settings, null, 2);    
        fs.writeFileSync(settingsDir, settingsJson, 'utf8');
        console.log(CAT, `Successfully saved settings to: ${settingsDir}`);
        return true;
    } catch (err) {
        console.error(CAT, `Failed to save settings to ${settingsDir}: ${err.message}`);
        return false;
    }
}

function loadSettings(fineName) {
    globalSettings = structuredClone(defaultSettings);
    const settingsDir = path.join(appPath, 'settings', fineName);
    console.log(CAT, `Loading ${settingsDir}`);
    const mySettings = loadJSONFile(settingsDir);
    if (mySettings) {
        for (const [key, value] of Object.entries(mySettings)) {
            if (Object.hasOwn(globalSettings, key)) {
                globalSettings[key] = value;
            } else {
                console.warn(CAT, `Key "${key}" not found in globalSettings. Ignoring.`);
            }
        }
        
        // Migrate old upscaler settings format (pre-1.16.0)
        // Old format: api_hf_upscaler_selected was an array like ["RealESRGAN_x4plus_anime_6B(C)"]
        // New format: api_hf_upscaler_selected is a string like "RealESRGAN_x4plus_anime_6B.pth"
        if (globalSettings.api_hf_upscaler_selected) {
            if (Array.isArray(globalSettings.api_hf_upscaler_selected)) {
                // Convert array to string (take first element)
                const oldValue = globalSettings.api_hf_upscaler_selected[0] || defaultSettings.api_hf_upscaler_selected;
                globalSettings.api_hf_upscaler_selected = oldValue;
                console.log(CAT, `Migrated api_hf_upscaler_selected from array to string: ${globalSettings.api_hf_upscaler_selected}`);
            }
            
            // Remove old (C) or (W) suffixes from upscaler names
            if (typeof globalSettings.api_hf_upscaler_selected === 'string') {
                const cleanValue = globalSettings.api_hf_upscaler_selected.replace(/\s*\([CW]\)\s*$/, '');
                if (cleanValue !== globalSettings.api_hf_upscaler_selected) {
                    console.log(CAT, `Removed (C)/(W) suffix from upscaler: ${globalSettings.api_hf_upscaler_selected} -> ${cleanValue}`);
                    globalSettings.api_hf_upscaler_selected = cleanValue;
                }
                
                // Ensure .pth extension is present if not 'None'
                if (globalSettings.api_hf_upscaler_selected !== 'None' && 
                    !globalSettings.api_hf_upscaler_selected.endsWith('.pth') && 
                    !globalSettings.api_hf_upscaler_selected.endsWith('.safetensors')) {
                    globalSettings.api_hf_upscaler_selected += '.pth';
                    console.log(CAT, `Added .pth extension to upscaler: ${globalSettings.api_hf_upscaler_selected}`);
                }
            }
        }
        
        // Migrate color transfer if it's an array (old format)
        if (Array.isArray(globalSettings.api_hf_colortransfer)) {
            globalSettings.api_hf_colortransfer = globalSettings.api_hf_colortransfer[0] || defaultSettings.api_hf_colortransfer;
            console.log(CAT, `Migrated api_hf_colortransfer from array to string: ${globalSettings.api_hf_colortransfer}`);
        }
        
        // Remove obsolete api_hf_upscaler_list key if present
        if (mySettings.api_hf_upscaler_list) {
            console.log(CAT, `Removed obsolete api_hf_upscaler_list from settings`);
        }
    } else {
        console.error(CAT, `Failed to load settings directory: ${settingsDir}`);
        console.log(CAT, 'Reset to default');
    }
    
    return globalSettings;
}

function enumSettings() {
    const settingsDir = path.join(appPath, 'settings');
    let jsonFiles = [];

    try {
        const files = fs.readdirSync(settingsDir);
        jsonFiles = files.filter(file => file.toLowerCase().endsWith('.json'));

        const settingsIndex = jsonFiles.findIndex(file => file.toLowerCase() === 'settings.json');
        if (settingsIndex !== -1) {
            const [settingsFile] = jsonFiles.splice(settingsIndex, 1);
            jsonFiles.unshift(settingsFile);
        }
    } catch (err) {
        console.error(CAT, `Failed to enumerate settings directory: ${settingsDir}`, err);
    }

    return jsonFiles;
}

function getGlobalSettings() {
    return globalSettings;
}

function getSettingFiles() {
    return SETTINGFILES;
}

function updateSettingFiles() {
    SETTINGFILES = enumSettings();
    return getSettingFiles();
}

export {
    setupGlobalSettings,
    getGlobalSettings,
    getSettingFiles,
    updateSettingFiles,
    loadSettings,
    saveSettings
};