import { setBlur, setNormal, showDialog } from './myDialog.js';
import { sendWebSocketMessage } from '../../webserver/front/wsRequest.js';

const CAT = '[myCollapsed]'

export function setupCollapsed(containerId, collapsed = false) {
    const mainItem = document.querySelector(`.${containerId}-main`);
    if (!mainItem) {
        console.error(CAT, 'mainItem not found', `.${containerId}-main`);
        return null;
    }

    const container = document.querySelector(`.${containerId}-container`);
    if (!container) {
        console.error(CAT, 'Container not found', `.${containerId}-container`);
        return null;
    }

    const arrowId = `${containerId}-toggle`;
    const toggleArrow = document.getElementById(arrowId);
    if (!toggleArrow) {
        console.error(CAT, 'Element not found', arrowId);
        return null;
    }
    
    toggleArrow.addEventListener('click', () => {
        setCollapsed(!container.classList.contains('collapsed'));
    });

    setCollapsed(collapsed);

    function setCollapsed(isCollapsed) {
        if (isCollapsed) {
            mainItem.classList.add('collapsed');
            container.classList.add('collapsed');
            toggleArrow.classList.add('collapsed');
        } else {
            mainItem.classList.remove('collapsed');
            container.classList.remove('collapsed');
            toggleArrow.classList.remove('collapsed');
        }
    }

    return {
        setCollapsed
    };
}

export async function setupSaveSettingsToggle(){
    const saveSettingsButton = document.getElementById('settings-save-toggle');
    if (!saveSettingsButton) {
        console.error(CAT, '[setupSaveSettingsToggle] Save button not found');
        return null;
    }  

    saveSettingsButton.addEventListener('click', async () => {
        setBlur();
        const inputResult = await showDialog('input', { message: window.cachedFiles.language[window.globalSettings.language].save_settings_title, placeholder: 'tmp_settings', defaultValue: 'tmp_settings' });
        if(inputResult){
            window.globalSettings.lora_slot = window.lora.getValues();
            let result;
            if (!window.inBrowser) {
                result = await window.api.saveSettingFile(`${inputResult}.json`, window.globalSettings);
            } else {
                result = await sendWebSocketMessage({ type: 'API', method: 'saveSettingFile', params: [`${inputResult}.json`, window.globalSettings] });
            }

            if(result === true) {
                await showDialog('info', { message: window.cachedFiles.language[window.globalSettings.language].save_settings_success.replace('{0}', inputResult) });
                if (!window.inBrowser) {
                    window.cachedFiles.settingList = await window.api.updateSettingFiles();
                } else {
                    window.cachedFiles.settingList = await sendWebSocketMessage({ type: 'API', method: 'updateSettingFiles' });
                }
                window.dropdownList.settings.setOptions(window.cachedFiles.settingList);
                window.dropdownList.settings.updateDefaults(`${inputResult}.json`);
            } else {
                await showDialog('info', { message: window.cachedFiles.language[window.globalSettings.language].save_settings_failed.replace('{0}', inputResult) });
            }
        }
        setNormal();
    });

    return saveSettingsButton;
}

export async function setupModelReloadToggle() {
    const refreshButton = document.getElementById('model-refresh-toggle');
    if (!refreshButton) {
        console.error(CAT, '[setupModelReloadToggle] Reload button not found');
        return null;
    }

    refreshButton.addEventListener('click', async () => {
        await reloadFiles();
    });

    return refreshButton;
}

export async function reloadFiles(){
    const SETTINGS = window.globalSettings;
    const LANG = window.cachedFiles.language[SETTINGS.language];
    const args = [window.globalSettings.model_path_comfyui,
                window.globalSettings.model_path_webui,
                window.globalSettings.model_filter_keyword,
                window.globalSettings.model_filter,
                window.globalSettings.search_modelinsubfolder];

    if (!window.inBrowser) {
        await window.api.updateModelList(args);
        await window.api.updateWildcards();
        await window.api.tagReload();

        window.cachedFiles.modelList = await window.api.getModelList(SETTINGS.api_interface);
        window.cachedFiles.modelListAll = await window.api.getModelListAll(SETTINGS.api_interface);
        window.cachedFiles.loraList = await window.api.getLoRAList(SETTINGS.api_interface);
        window.cachedFiles.settingList = await window.api.updateSettingFiles();
    } else {
        await sendWebSocketMessage({ type: 'API', method: 'updateModelList', params: [args] });
        await sendWebSocketMessage({ type: 'API', method: 'updateWildcards'});
        await sendWebSocketMessage({ type: 'API', method: 'tagReload'});

        window.cachedFiles.modelList = await sendWebSocketMessage({ type: 'API', method: 'getModelList', params: [SETTINGS.api_interface] });
        window.cachedFiles.modelListAll = await sendWebSocketMessage({ type: 'API', method: 'getModelListAll', params: [SETTINGS.api_interface] });
        window.cachedFiles.loraList = await sendWebSocketMessage({ type: 'API', method: 'getLoRAList', params: [SETTINGS.api_interface] });
        window.cachedFiles.settingList = await sendWebSocketMessage({ type: 'API', method: 'updateSettingFiles' });
    }
    window.dropdownList.model.setValue(LANG.api_model_file_select, window.cachedFiles.modelList);
    window.dropdownList.settings.setValue('', window.cachedFiles.settingList);

    window.refiner.model.setValue(LANG.api_refiner_model, window.cachedFiles.modelListAll);    
}

export function setupRefreshToggle() {
    const refreshButton = document.getElementById('global-refresh-toggle');
    if (!refreshButton) {
        console.error(CAT, '[setupRefreshToggle] Refresh button not found');
        return null;
    }

    refreshButton.addEventListener('click', () => {
        location.reload(); 
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'F5') {
            event.preventDefault(); 
            location.reload(); 
        }
    });

    return refreshButton;
}

export function doSwap(rightToLeft) {
    const split = document.getElementById('split');
    const left = document.getElementById('left');
    const right = document.getElementById('right');

    if (rightToLeft) {
        split.insertBefore(left, right);
        left.style.marginLeft = '10px';
        left.style.marginRight = '5px';
        right.style.marginLeft = '5px';
        right.style.marginRight = '10px';
    } else {
        split.insertBefore(right, left);
        left.style.marginLeft = '5px';
        left.style.marginRight = '10px';
        right.style.marginLeft = '10px';
        right.style.marginRight = '5px';
    }
}

export function setupSwapToggle(){
    const swapButton = document.getElementById('global-settings-swap-layout-toggle');
    if (!swapButton) {
        console.error(CAT, '[setupSwapToggle] Swap button not found');
        return null;
    }
    
    swapButton.addEventListener('click', () => {
        window.globalSettings.rightToleft = !window.globalSettings.rightToleft;
        doSwap(window.globalSettings.rightToleft);
    });    

    return swapButton;
}

