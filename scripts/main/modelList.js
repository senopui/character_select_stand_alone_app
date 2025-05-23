const fs = require('fs');
const path = require('node:path');
const { app, ipcMain } = require('electron');

const CAT = '[ModelList]';
let MODELLIST_COMFYUI = ['Default'];
let MODELLIST_WEBUI = ['Default'];
let MODELLIST_ALL_COMFYUI = MODELLIST_COMFYUI;
let MODELLIST_ALL_WEBUI = MODELLIST_WEBUI;
let LORALIST_COMFYUI = ['None'];
let LORALIST_WEBUI = ['None'];

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

function updateLoRAList(model_path_comfyui, model_path_webui, search_subfolder) {
    const loraPathComfyUI = path.join(path.dirname(model_path_comfyui), 'loras');
    const loraPathWebUI = path.join(path.dirname(model_path_webui), 'Lora');

    if (fs.existsSync(loraPathComfyUI)) {
        LORALIST_COMFYUI = readDirectory(loraPathComfyUI, '', search_subfolder);
    } 
    
    if (fs.existsSync(loraPathWebUI)) {
        LORALIST_WEBUI = readDirectory(loraPathWebUI, '', search_subfolder);
    }
}

function updateModelList(model_path_comfyui, model_path_webui, model_filter, enable_filter, search_subfolder) {
    if (fs.existsSync(model_path_comfyui)) {
        MODELLIST_ALL_COMFYUI = readDirectory(model_path_comfyui, '', search_subfolder);
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

function setupModelList(settings) {
    ipcMain.handle('update-model-list', (event, args) => {
        // model_path, model_path_2nd, model_filter, enable_filter, search_subfolder
        console.log('Update model/lora list with following args: ', args);
        updateModelList(args[0], args[1], args[2], args[3], args[4]);
        updateLoRAList(args[0], args[1], args[4]);
    });

    ipcMain.handle('get-model-list', async (event, args) => {
        if(args === 'ComfyUI')
            return MODELLIST_COMFYUI;
        else if (args === 'WebUI')
            return MODELLIST_WEBUI;
        else
            return ['Default'];
    });

    ipcMain.handle('get-model-list-all', async (event, args) => {
        if(args === 'ComfyUI')
            return MODELLIST_ALL_COMFYUI;
        else if (args === 'WebUI')
            return MODELLIST_ALL_WEBUI;
        else
            return ['None'];
    });

    ipcMain.handle('get-lora-list-all', async (event, args) => {
        if(args === 'ComfyUI')
            return LORALIST_COMFYUI;
        else if (args === 'WebUI')
            return LORALIST_WEBUI;
        else
            return ['None'];
    });

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
}

module.exports = {
    setupModelList,
};