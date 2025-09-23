const fs = require('fs');
const path = require('node:path');
const { app, ipcMain } = require('electron');
const Main = require('../../main');

const CAT = '[ModelList]';
let MODELLIST_COMFYUI = ['Default'];
let MODELLIST_WEBUI = ['Default'];
let MODELLIST_ALL_COMFYUI = MODELLIST_COMFYUI;
let MODELLIST_ALL_WEBUI = MODELLIST_WEBUI;
let LORALIST_COMFYUI = ['None'];
let LORALIST_WEBUI = ['None'];
let CONTROLNET_COMFYUI = ['None'];
let CONTROLNET_WEBUI = ['None'];
let EXTRA_MODELS = {
    exist: false,
    yamlContent: null,
    checkpoints: [],
    loras: [],
    controlnet: []
};

function readDirectory(directory, basePath = '', search_subfolder = false, maxDepth = Infinity, currentDepth = 0) {
    let files = [];
    try {
        files = fs.readdirSync(directory, { withFileTypes: true });
    } catch (err) {
        console.error(CAT, `Failed to read directory: ${directory}`, err);
        return [];
    }

    let result = [];
    for (const file of files) {
        const relativePath = path.join(basePath, file.name);
        const fullPath = path.join(directory, file.name);

        if (file.isDirectory() && search_subfolder && currentDepth < maxDepth) {
            result = result.concat(readDirectory(fullPath, relativePath, search_subfolder, maxDepth, currentDepth + 1));
        } else if (file.isFile() && file.name.endsWith('.safetensors')) {
            result.push(relativePath);
        }
    }
    return result;
}

function updateControlNetList(model_path_comfyui, model_path_webui, search_subfolder) {
    const cnPathComfyUI = path.join(path.dirname(model_path_comfyui), 'controlnet');
    const clipVisionPathComfyUI = path.join(path.dirname(model_path_comfyui), 'clip_vision');
    const ipadapterPathComfyUI = path.join(path.dirname(model_path_comfyui), 'ipadapter');
    const cnPathWebUI = path.join(path.dirname(model_path_webui), '..', 'extensions', 'sd-webui-controlnet', 'models');

    if (fs.existsSync(cnPathComfyUI)) {
        CONTROLNET_COMFYUI = readDirectory(cnPathComfyUI, '', search_subfolder);
        if(fs.existsSync(clipVisionPathComfyUI) && fs.existsSync(ipadapterPathComfyUI)) {
            let clipList = readDirectory(clipVisionPathComfyUI, '', search_subfolder);
            let ipaList = readDirectory(ipadapterPathComfyUI, '', search_subfolder);

            let clipVisionListWithPrefix = [];
            clipList.forEach((item) => {
                clipVisionListWithPrefix.push('CV->' + item);
            });

            let ipaListWithPrefix = [];
            ipaList.forEach((item) => {
                ipaListWithPrefix.push('IPA->' + item);
            });

            CONTROLNET_COMFYUI = CONTROLNET_COMFYUI.concat(clipVisionListWithPrefix, ipaListWithPrefix);

            if (EXTRA_MODELS.exist && Array.isArray(EXTRA_MODELS.controlnet) && EXTRA_MODELS.controlnet.length > 0) {
                const baseList = Array.isArray(CONTROLNET_COMFYUI) ? CONTROLNET_COMFYUI : [];
                CONTROLNET_COMFYUI = Array.from(new Set([...baseList, ...EXTRA_MODELS.controlnet]));
            }
        }
    } 
    
    if (fs.existsSync(cnPathWebUI)) {
        CONTROLNET_WEBUI = readDirectory(cnPathWebUI, '', search_subfolder);
    }

    if (CONTROLNET_COMFYUI.length > 0) {
        CONTROLNET_COMFYUI.unshift('none');
    } else {
        CONTROLNET_COMFYUI = ['none'];
    }

    if (CONTROLNET_WEBUI.length > 0) {
        CONTROLNET_WEBUI.unshift('none');
    } else {
        CONTROLNET_WEBUI = ['none'];
    }
}

function updateLoRAList(model_path_comfyui, model_path_webui, search_subfolder) {
    const loraPathComfyUI = path.join(path.dirname(model_path_comfyui), 'loras');
    const loraPathWebUI = path.join(path.dirname(model_path_webui), 'Lora');

    if (fs.existsSync(loraPathComfyUI)) {
        LORALIST_COMFYUI = readDirectory(loraPathComfyUI, '', search_subfolder);

        if (EXTRA_MODELS.exist && Array.isArray(EXTRA_MODELS.loras) && EXTRA_MODELS.loras.length > 0) {
            const baseList = Array.isArray(LORALIST_COMFYUI) ? LORALIST_COMFYUI : [];
            LORALIST_COMFYUI = Array.from(new Set([...baseList, ...EXTRA_MODELS.loras]));
        }
    } 
    
    if (fs.existsSync(loraPathWebUI)) {
        LORALIST_WEBUI = readDirectory(loraPathWebUI, '', search_subfolder);
    }
}

function updateModelList(model_path_comfyui, model_path_webui, model_filter, enable_filter, search_subfolder) {
    if (fs.existsSync(model_path_comfyui)) {
        MODELLIST_ALL_COMFYUI = readDirectory(model_path_comfyui, '', search_subfolder);

        if (EXTRA_MODELS.exist && Array.isArray(EXTRA_MODELS.checkpoints) && EXTRA_MODELS.checkpoints.length > 0) {
            const baseList = Array.isArray(MODELLIST_ALL_COMFYUI) ? MODELLIST_ALL_COMFYUI : [];
            MODELLIST_ALL_COMFYUI = Array.from(new Set([...baseList, ...EXTRA_MODELS.checkpoints]));
        }
    }
    
    if (fs.existsSync(model_path_webui)) {
        MODELLIST_ALL_WEBUI = readDirectory(model_path_webui, '', search_subfolder);
    }

    if (enable_filter && model_filter) {
        const filters = model_filter.split(',').map(f => f.trim().toLowerCase());
        MODELLIST_COMFYUI = MODELLIST_ALL_COMFYUI.filter(fileName =>
            filters.some(filter => fileName.toLowerCase().includes(filter))
        );
        MODELLIST_WEBUI = MODELLIST_ALL_WEBUI.filter(fileName =>
            filters.some(filter => fileName.toLowerCase().includes(filter))
        );
    } else {
        MODELLIST_COMFYUI = [...MODELLIST_ALL_COMFYUI];
        MODELLIST_WEBUI = [...MODELLIST_ALL_WEBUI];
    }

    if (MODELLIST_COMFYUI.length > 0) {        
        MODELLIST_COMFYUI.unshift('Default');
    } else {
        MODELLIST_COMFYUI = ['Default'];
    }

    if (MODELLIST_WEBUI.length > 0) {
        MODELLIST_WEBUI.unshift('Default');
    } else {
        MODELLIST_WEBUI = ['Default'];
    }
}

function collectRelativePaths(fieldName) {
    const raw = EXTRA_MODELS.yamlContent.a111[fieldName];
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map(r => String(r).trim()).filter(r => r);
    } else {
        return String(raw).split(/\r?\n/).map(s => s.trim()).filter(s => s);
    }
}

function readExtraModelPaths(model_path_comfyui) {    
    const basePath = path.dirname(path.dirname(model_path_comfyui));
    const extraModelPathsFile = path.join(basePath, 'extra_model_paths.yaml');

    if (!fs.existsSync(extraModelPathsFile)) {
        console.log(CAT, 'readExtraModelPaths: extra_model_paths.yaml not found at', extraModelPathsFile);
        return false;
    }

    console.log(CAT, 'readExtraModelPaths: reading from', extraModelPathsFile);

    try {
        const raw = fs.readFileSync(extraModelPathsFile, 'utf8');
        const yaml = require('js-yaml');
        EXTRA_MODELS.yamlContent = yaml.load(raw);
    } catch (err) {
        console.log(CAT, 'readExtraModelPaths: failed to read/parse yaml', err);
        return false;
    }

    if (!EXTRA_MODELS.yamlContent?.a111?.base_path) {
        return false;
    }

    const a111Base = EXTRA_MODELS.yamlContent.a111.base_path;
    if (!fs.existsSync(a111Base)) {
        console.log(CAT, 'readExtraModelPaths: a111 base_path does not exist:', a111Base);
        return false;
    }

    function collectFromRelativeList(relList, targetArray) {
        for (const rel of relList) {
            const absPath = path.isAbsolute(rel) ? rel : path.join(a111Base, rel);
            if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
                try {
                    const items = readDirectory(absPath, '', true);
                    if (items?.length) {
                        targetArray.push(...items);
                    }
                } catch (e) {
                    console.log(CAT, 'readExtraModelPaths: readDirectory failed for', absPath, e);
                }
            }
        }
    }

    // checkpoints
    collectFromRelativeList(collectRelativePaths('checkpoints'), EXTRA_MODELS.checkpoints);
    // loras
    collectFromRelativeList(collectRelativePaths('loras'), EXTRA_MODELS.loras);
    // controlnet
    collectFromRelativeList(collectRelativePaths('controlnet'), EXTRA_MODELS.controlnet);

    EXTRA_MODELS.checkpoints = Array.from(new Set(EXTRA_MODELS.checkpoints));
    EXTRA_MODELS.loras = Array.from(new Set(EXTRA_MODELS.loras));
    EXTRA_MODELS.controlnet = Array.from(new Set(EXTRA_MODELS.controlnet));

    console.log(CAT, 'readExtraModelPaths: found extra models:', {
        checkpoints: EXTRA_MODELS.checkpoints.length,
        loras: EXTRA_MODELS.loras.length,
        controlnet: EXTRA_MODELS.controlnet.length
    });

    return true;
}

function setupModelList(settings) {
    ipcMain.handle('update-model-list', (event, args) => {                
        updateModelAndLoRAList(args);
    });

    ipcMain.handle('get-model-list', async (event, args) => {
        return getModelList(args);
    });

    ipcMain.handle('get-model-list-all', async (event, args) => {
        return getModelListAll(args);
    });

    ipcMain.handle('get-lora-list-all', async (event, args) => {
        return getLoRAList(args);
    });

    ipcMain.handle('get-controlnet-list', async (event, args) => {
        return getControlNetList(args);
    });

    EXTRA_MODELS.exist = false;
    if (settings.api_interface === 'ComfyUI') {
        EXTRA_MODELS.exist = readExtraModelPaths(settings.model_path_comfyui);
    }

    updateModelList(
        settings.model_path_comfyui,
        settings.model_path_webui,
        settings.model_filter_keyword,
        settings.model_filter,
        settings.search_modelinsubfolder
    );

    updateLoRAList(
        settings.model_path_comfyui,
        settings.model_path_webui,
        settings.search_modelinsubfolder
    );

    updateControlNetList(
        settings.model_path_comfyui,
        settings.model_path_webui,
        settings.search_modelinsubfolder
    );
}

function getModelList(apiInterface) {
    if (apiInterface === 'ComfyUI') {
        return MODELLIST_COMFYUI;
    } else if (apiInterface === 'WebUI') {
        return MODELLIST_WEBUI;
    } else {
        return ['None'];
    }
}

function getModelListAll(apiInterface) {
    if (apiInterface === 'ComfyUI') {
        return MODELLIST_ALL_COMFYUI;
    } else if (apiInterface === 'WebUI') {
        return MODELLIST_ALL_WEBUI;
    } else {
        return ['None'];
    }
}

function getLoRAList(apiInterface) {
    if (apiInterface === 'ComfyUI') {
        return LORALIST_COMFYUI;
    } else if (apiInterface === 'WebUI') {
        return LORALIST_WEBUI;
    } else {
        return ['None'];
    }
}

function getControlNetList(apiInterface) {
    if (apiInterface === 'ComfyUI') {
        return CONTROLNET_COMFYUI;
    } else if (apiInterface === 'WebUI') {
        return CONTROLNET_WEBUI;
    } else {
        return ['None'];
    }
}


function updateModelAndLoRAList(args) {
    // model_path, model_path_2nd, model_filter, enable_filter, search_subfolder
    console.log(CAT, 'Update model/lora list with following args: ', args);

    EXTRA_MODELS.exist = false;
    if (settings.api_interface === 'ComfyUI') {
        EXTRA_MODELS.exist = readExtraModelPaths(settings.model_path_comfyui);
    }

    updateModelList(args[0], args[1], args[2], args[3], args[4]);
    updateLoRAList(args[0], args[1], args[4]);
    updateControlNetList(args[0], args[1], args[4]);

    // This is the Skeleton Key to unlock the Mutex Lock
    // In case ...
    console.warn(CAT, 'The Skeleton Key triggerd, Mutex Lock set to false');
    Main.setMutexBackendBusy(false);
}

module.exports = {
    setupModelList,
    getModelList,
    getModelListAll,
    getLoRAList,
    getControlNetList,
    updateModelAndLoRAList,
    collectRelativePaths,
    getExtraModels: () => EXTRA_MODELS    
};

