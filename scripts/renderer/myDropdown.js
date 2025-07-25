import { updateLanguage } from './language.js';
import { decodeThumb } from './customThumbGallery.js';
import { callback_myCharacterList_updateThumb, callback_myViewList_Update } from './callbacks.js'
import { generateGUID } from './myLoRASlot.js'

const CAT = '[myDropdown]'

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Global registry to track active dropdowns (only for managing overlapping dropdowns)
const activeDropdownsRegistry = {
    activeId: null,
    registry: new Map(),
    
    register(id, instance) {
        this.registry.set(id, instance);
    },
    
    unregister(id) {
        this.registry.delete(id);
    },
    
    setActive(id) {
        this.activeId = id;
        // Close all other dropdowns
        this.registry.forEach((instance, dropdownId) => {
            if (dropdownId !== id && instance) {
                instance._closeDropdown();
            }
        });
    },
    
    getActive() {
        return this.activeId;
    }
};

export function myCharacterList(containerId, wai_characters, oc_characters) {
    function handleCharacterOptions(options, filteredOptions, args, dropdownCount) {
        const [[keys, values], oc] = args;
        if (!Array.isArray(keys) || !Array.isArray(values) || keys.length !== values.length) {
            console.error(CAT, '[handleCharacterOptions] Invalid keys or values:', keys, values);
            return;
        }
        if (!Array.isArray(oc)) {
            console.error(CAT, '[handleCharacterOptions] Invalid oc:', oc);
            return;
        }

        const charOptions = [{ key: 'Random', value: 'random' }, { key: 'None', value: 'none' }].concat(keys.map((key, idx) => ({ key, value: values[idx] })));
        for (let i = 0; i < dropdownCount - 1; i++) {
            options[i] = charOptions;
            filteredOptions[i] = [...charOptions];
        }

        const originalOptions = [{ key: 'Random', value: 'random' }, { key: 'None', value: 'none' }].concat(oc.map(key => ({ key, value: key })));
        options[dropdownCount - 1] = originalOptions;
        filteredOptions[dropdownCount - 1] = [...originalOptions];
    }    

    const dropdown = createDropdown({
        containerId: containerId,
        dropdownCount: 4,
        labelPrefixList: ['character1', 'character2', 'character3', 'original_character'],
        textboxIds: ['cd-character1', 'cd-character2', 'cd-character3', 'cd-original-character'],
        optionHandler: handleCharacterOptions,
        callback_func: callback_myCharacterList_updateThumb,
        enableSearch: true,
        enableOverlay: true,
        valueOnly: (window.globalSettings.language === 'en-US'),
        height: 40,
        enableNumberInput: true
    });

    if (wai_characters) {
        const keys = Object.keys(wai_characters);
        const values = Object.values(wai_characters);
        const oc_keys = Object.keys(oc_characters);
        
        if (dropdown) {
            const labelPrefixList = `
            ${window.cachedFiles.language[window.globalSettings.language].character1},
            ${window.cachedFiles.language[window.globalSettings.language].character2},
            ${window.cachedFiles.language[window.globalSettings.language].character3},
            ${window.cachedFiles.language[window.globalSettings.language].original_character}`
            dropdown.setOptions([keys, values], oc_keys, labelPrefixList, 'None', 'None', 'None', 'None', true);
            
            return dropdown;
        } else {
            console.error(CAT, `[myCharacterList] Dropdown with containerId "${containerId}" not found.`);
        }
    }
    
    return dropdown;
}

export function myRegionalCharacterList(containerId, wai_characters, oc_characters) {
    function handleCharacterOptions(options, filteredOptions, args, dropdownCount) {
        const [[keys, values], oc] = args;
        if (!Array.isArray(keys) || !Array.isArray(values) || keys.length !== values.length) {
            console.error(CAT, '[handleCharacterOptions] Invalid keys or values:', keys, values);
            return;
        }
        if (!Array.isArray(oc)) {
            console.error(CAT, '[handleCharacterOptions] Invalid oc:', oc);
            return;
        }

        const charOptions = [{ key: 'Random', value: 'random' }, { key: 'None', value: 'none' }].concat(keys.map((key, idx) => ({ key, value: values[idx] })));
        for (let i = 0; i < 2; i++) {
            options[i] = charOptions;
            filteredOptions[i] = [...charOptions];
        }

        const originalOptions = [{ key: 'Random', value: 'random' }, { key: 'None', value: 'none' }].concat(oc.map(key => ({ key, value: key })));
        for (let i = 2; i < dropdownCount; i++) {
            options[i] = originalOptions;
            filteredOptions[i] = [...originalOptions];
        }
    }    

    const dropdown = createDropdown({
        containerId: containerId,
        dropdownCount: 4,
        labelPrefixList: ['character_left', 'character_right', 'original_character_left', 'original_character_right'],
        textboxIds: ['cd-character1', 'cd-character2', 'cd-original-character-left', 'cd-original-character-right'],
        optionHandler: handleCharacterOptions,
        callback_func: callback_myCharacterList_updateThumb,
        enableSearch: true,
        enableOverlay: true,
        valueOnly: (window.globalSettings.language === 'en-US'),
        height: 40,
        enableNumberInput: true
    });

    if (wai_characters) {
        const keys = Object.keys(wai_characters);
        const values = Object.values(wai_characters);
        const oc_keys = Object.keys(oc_characters);
        
        if (dropdown) {
            const labelPrefixList = `
            character_left,
            character_right,
            original_character_left,
            original_character_right`;
            dropdown.setOptions([keys, values], oc_keys, labelPrefixList, 'None', 'None', 'None', 'None', true);
            
            return dropdown;
        } else {
            console.error(CAT, `[myDualCharacterList] Dropdown with containerId "${containerId}" not found.`);
        }
    }
    
    return dropdown;
}

export function myViewsList(containerId, view_tags) {
    function handleViewOptions(options, filteredOptions, args, dropdownCount) {
        const [data] = args;
        if (typeof data !== 'object' || data === null || Object.keys(data).length !== dropdownCount) return;
        
        const keys = ['angle', 'camera', 'background', 'style'];
        options.forEach((_, index) => {
            const key = keys[index];
            options[index] = [{ key: 'random', value: 'random' }, { key: 'none', value: 'none' }].concat(data[key].map(item => ({ key: item, value: item })));
            filteredOptions[index] = [...options[index]];
        });
    }
    
    const dropdown = createDropdown({
        containerId: containerId,
        dropdownCount: 4,
        labelPrefixList: ['angle', 'camera', 'background', 'view'],
        textboxIds: ['cd-view-angle', 'cd-view-camera', 'cd-view-background', 'cd-view-style'],
        optionHandler: handleViewOptions,
        callback_func: callback_myViewList_Update,
        enableSearch: true,
        enableOverlay: false,
        valueOnly: true,
        height: 30,
        enableNumberInput: true
    });

    if (view_tags && dropdown) {
        const labelPrefixList = `
        ${window.cachedFiles.language[window.globalSettings.language].view_angle},
        ${window.cachedFiles.language[window.globalSettings.language].view_camera},
        ${window.cachedFiles.language[window.globalSettings.language].view_background},
        ${window.cachedFiles.language[window.globalSettings.language].view_style}`;
        dropdown.setOptions(view_tags, null, labelPrefixList, 'None', 'None', 'None', 'None', false);
    } else if (!dropdown) {
        console.error(CAT, `[myViewsList] Dropdown with containerId "${containerId}" not found.`);
    }
    
    return dropdown;
}

export function myLanguageList(language) {
    if (!language || typeof language !== 'object') {
        console.error('[myLanguageList] Invalid language data provided.');
        return null;
    }    

    const containerId = 'global-settings-language';
    const options = Object.keys(language).map(key => ({
        key: key, 
        value: language[key].language
    }));

    const callback = (index, selectedValue) => {
        window.globalSettings.language = selectedValue[0];
        updateLanguage(false, window.inBrowser);    
    };

    const dropdown = createDropdown({
        containerId: containerId,
        dropdownCount: 1,
        labelPrefixList: [window.cachedFiles.language[window.globalSettings.language].language_select],
        textboxIds: [`${containerId}-dropdown`],
        optionHandler: (optionsArray, filteredOptionsArray, args) => {
            optionsArray[0] = options;
            filteredOptionsArray[0] = [...options];
        },
        callback_func: callback,
        enableSearch: false,
        enableOverlay: false,
        valueOnly: true,
        height: 15
    });

    if (dropdown) {
        dropdown.setOptions(options);
        dropdown.updateDefaults(window.cachedFiles.language[window.globalSettings.language].language);
    }
    
    return dropdown;
}

export function mySimpleList(containerId, label, options, callback_func = null, height = 15, enableSearch = true, showTitle = false) {
    function handleOptions(optionsArray, filteredOptionsArray, args, dropdownCount) {
        const [data] = args;
        if (!Array.isArray(data)) {
            console.error(`[mySimpleList] Invalid options data:`, data);
            return;
        }

        optionsArray[0] = data.map(item => ({ key: item, value: item }));
        filteredOptionsArray[0] = [...optionsArray[0]];
    }

    const dropdown = createDropdown({
        containerId: containerId,
        dropdownCount: 1, 
        labelPrefixList: [label], 
        textboxIds: [`${containerId}-dropdown`], 
        optionHandler: handleOptions, 
        callback_func: callback_func,
        enableSearch: enableSearch, 
        enableOverlay: false, 
        valueOnly: true, 
        height: height,
        showTitle: showTitle
    });
    
    if (options && dropdown) {
        dropdown.setOptions(options, null, label, options[0]);
    } else if (!dropdown) {
        console.error(`[mySimpleList] Dropdown with containerId "${containerId}" not found.`);
    }

    return dropdown;
}

function createDropdown({
    containerId, dropdownCount, labelPrefixList, textboxIds, 
    optionHandler, callback_func = null, 
    enableSearch = true, enableOverlay = false, isValueOnly = true, height = 15, showTitle = false, enableNumberInput = false}) {
    
    let valueOnly = isValueOnly;
    const container = document.querySelector(`.${containerId}`);
    if (!container) {
        console.error(CAT, `[createDropdown] Container with class "${containerId}" not found.`);
        return null;
    }

    // Clear any existing dropdown
    const existingDropdown = activeDropdownsRegistry.registry.get(containerId);
    if (existingDropdown) {
        existingDropdown.cleanup();
    }

    container.innerHTML = '';
    
    // Generate unique ID for this dropdown instance
    const uniqueId = `${containerId}-${generateGUID()}`;
    
    // Create DOM structure
    let html = `<div class="mydropdown-container-${dropdownCount}${enableNumberInput ? ' mydropdown-with-number' : ''}">`;
    if (showTitle) {
        html = `<div class="mydropdown-container-grid">`;
    }
    for (let i = 0; i < dropdownCount; i++) {
        if (showTitle) {
            html += `
            <div class="mydropdown-${containerId}-header">${labelPrefixList[i]}</div>
            `;
        }
        if(enableNumberInput){
            html += `
                <div class="mydropdown-wrapper-with-text" data-index="${i}">
                    <div class="mydropdown-input-container" title=${labelPrefixList[i]}>
                        <input type="text" id="${textboxIds[i]}-overlay" class="mydropdown-input" placeholder="..." ${!enableSearch ? 'readonly' : ''}>
                        <img class="mydropdown-arrow" src="scripts/svg/mydropdown-arrow.svg">
                    </div>
                    <div class="mydropdown-number-wrapper">
                        <input type="text" class="mydropdown-number-input" data-index="${i}" placeholder="1.0" pattern="[0-9]*\\.?[0-9]{0,2}" value="1.0">
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="mydropdown-wrapper" data-index="${i}">
                    <div class="mydropdown-input-container" title=${labelPrefixList[i]}>
                        <input type="text" id="${textboxIds[i]}-overlay" class="mydropdown-input" placeholder="..." ${!enableSearch ? 'readonly' : ''}>
                        <img class="mydropdown-arrow" src="scripts/svg/mydropdown-arrow.svg">
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';
    container.innerHTML = html;

    const inputs = container.querySelectorAll('.mydropdown-input');
    const numberInputs = enableNumberInput ? container.querySelectorAll('.mydropdown-number-input') : [];
    const optionsList = document.createElement('div');
    optionsList.className = `mydropdown-options mydropdown-options-${uniqueId} scroll-container`;
    optionsList.style.display = 'none';
    document.body.appendChild(optionsList);

    let options = Array(dropdownCount).fill().map(() => []);
    let filteredOptions = Array(dropdownCount).fill().map(() => []);
    let activeInput = null;
    let isEditing = Array(dropdownCount).fill(false);
    let selectedKeys = Array(dropdownCount).fill('');
    let selectedValues = Array(dropdownCount).fill('');
    let numberValues = Array(dropdownCount).fill('1.0');
    
    // Create dropdown instance
    const dropdown = {
        uniqueId,
        
        setOptions: function(data, oc, labelPrefixList, ...rest) {
            const defaults = rest.slice(0, dropdownCount);
            const newEnableSearch = rest[dropdownCount] !== undefined ? rest[dropdownCount] : enableSearch;
    
            optionHandler(options, filteredOptions, [data, oc], dropdownCount);
    
            let updatedLabelPrefixList = labelPrefixList;
            if (typeof labelPrefixList === 'string') {
                updatedLabelPrefixList = labelPrefixList.split(',').map(label => label.trim());
            }
            if (Array.isArray(updatedLabelPrefixList) && updatedLabelPrefixList.length === dropdownCount) {
                labelPrefixList = updatedLabelPrefixList;
            }
    
            inputs.forEach((input, index) => {
                const value = defaults[index] || '';
                selectedValues[index] = value;
                selectedKeys[index] = value;
                input.value = value;
                if (!newEnableSearch) input.setAttribute('readonly', 'readonly');
            });
            const labels = container.querySelectorAll('.mydropdown-label');
            labels.forEach((label, index) => label.textContent = labelPrefixList[index]);
            this._updateOptionsList(0); 
            return this;
        },
        
        updateDefaults: function(...defaults) {
            let defaultValues;
            if (defaults.length === 1 && Array.isArray(defaults[0])) {
                defaultValues = defaults[0].slice(0, dropdownCount);
            } else {
                defaultValues = defaults.slice(0, dropdownCount);
            }
            inputs.forEach((input, index) => {
                if (!isEditing[index]) {
                    const value = defaultValues[index] || '';
                    selectedValues[index] = value;
                    selectedKeys[index] = value;
                    input.value = value;
                }
            });
            return this;
        },
        
        getKey: function() {
            return selectedKeys.slice();
        },
        
        getValue: function() {
            const value = selectedValues.slice();
            if(value.length===1){
                if(typeof value[0] === 'object') 
                    return value[0][0];
                else
                    return value[0];
            }
            return value;
        },
        
        getTextValue: function(index) {
            if (enableNumberInput && numberInputs[index]) {
                return parseFloat(numberInputs[index].value) || 1.0;
            }
            return 1.0;
        },
        
        setValueOnly: function(trigger) {
            valueOnly = trigger;
        },

        isValueOnly: function() {
            return valueOnly;
        },
        
        cleanup: function() {
            document.removeEventListener('click', this._clickHandler);
            document.removeEventListener('scroll', this._scrollHandler, true);
            optionsList.remove();
            activeDropdownsRegistry.unregister(containerId);
        },
        
        setTitle: function(newLabelPrefixList) {
            if (typeof newLabelPrefixList === 'string') {
                newLabelPrefixList = newLabelPrefixList.split(',').map(label => label.trim());
            }
        
            if (Array.isArray(newLabelPrefixList) && newLabelPrefixList.length === dropdownCount) {
                const labels = container.querySelectorAll('.mydropdown-input-container');
                if (labels.length !== 0) {
                    labels.forEach((label, index) => {
                        label.title = newLabelPrefixList[index];
                    });
                }
        
                const headers = container.querySelectorAll(`.mydropdown-${containerId}-header`);
                if (headers.length !== 0) {
                    headers.forEach((header, index) => {
                        header.textContent = newLabelPrefixList[index];
                    });
                }
            } else {
                console.error(`[setTitle] Invalid labelPrefixList:`, newLabelPrefixList);
            }
            return this;
        },
        
        setValue: function(label, options) {
            this.setOptions(options, null, label, options[0]);
            return this;
        },
        
        // Private methods (prefixed with _)
        _closeDropdown: function() {
            optionsList.style.display = 'none';
            inputs.forEach((input, index) => {
                input.value = valueOnly ? selectedValues[index] : selectedKeys[index];
                isEditing[index] = false;
            });
            activeInput = null;
        },
        
        _updateOptionsList: function(activeIndex, searchText = null) {
            const existingItems = Array.from(optionsList.children);
            const fragment = document.createDocumentFragment();
            let currentOptions = [];
    
            if (searchText) {            
                currentOptions = filteredOptions[activeIndex].filter(option =>
                    option.key.toLowerCase().includes(searchText) ||
                    option.value.toLowerCase().includes(searchText)
                );        
            } else {
                currentOptions = filteredOptions[activeIndex];
            }
    
            currentOptions.forEach((option, idx) => {
                let item = existingItems[idx] || document.createElement('div');
                item.className = 'mydropdown-item';
                let textContent = valueOnly
                        ? `${option.value}` 
                        : `${option.key}\n(${option.value})`;

                if ((containerId === 'dropdown-character' && activeIndex === 3) ||
                    (containerId === 'dropdown-character-regional' && (activeIndex === 2 || activeIndex === 3))) {
                    textContent = option.key;
                }

                item.textContent = textContent;
                item.dataset.key = `${option.key}`; 
                item.dataset.value = `${option.value || ''}`;
                fragment.appendChild(item);
            });
        
            existingItems.slice(currentOptions.length).forEach(item => item.remove());
            optionsList.innerHTML = '';
            optionsList.appendChild(fragment);
    
            requestAnimationFrame(() => {
                this._updateOptionsPosition(activeIndex);
            });
            
            optionsList.onclick = (e) => {
                const item = e.target.closest('.mydropdown-item');
                if (!item) return;
                const wrapper = activeInput ? activeInput.closest('.mydropdown-wrapper, .mydropdown-wrapper-with-text') : null;
                const index = wrapper ? parseInt(wrapper.dataset.index) : activeIndex;
                selectedValues[index] = item.dataset.value;
                selectedKeys[index] = item.dataset.key;
                activeInput.value = valueOnly ? item.dataset.value : item.dataset.key;
        
                optionsList.style.display = 'none';
                isEditing[index] = false;
                activeDropdownsRegistry.setActive(null);
                const event = new CustomEvent(`${containerId}-change`, { detail: { value: selectedKeys } });
                document.dispatchEvent(event);
        
                if (callback_func) {
                    callback_func(index, selectedKeys);
                }
            };
    
            const validOverlayIds = ['cd-character1-overlay', 'cd-character2-overlay', 'cd-character3-overlay'];
            const shouldAddOverlayEvents = enableOverlay && activeInput && validOverlayIds.includes(activeInput.id);
            let lastOptionKey = null;
            let lastUpdateTime = 0;
            const throttleDelay = 8; // 120 fps
            let overlayTaskId = 0;
       
            if (shouldAddOverlayEvents && (containerId === 'dropdown-character' || containerId === 'dropdown-character-regional')) {
                optionsList.removeEventListener('mouseenter', optionsList._onMouseEnter);
                optionsList.removeEventListener('mouseleave', optionsList._onMouseLeave);
    
                optionsList._onMouseEnter = async (e) => {
                    const item = e.target.closest('.mydropdown-item');
                    if (!item) {
                        return;
                    }
        
                    const now = performance.now();
                    if (now - lastUpdateTime < throttleDelay) {
                        return;
                    }
                    lastUpdateTime = now;
        
                    if (lastOptionKey === item.dataset.key) {
                        return;
                    }
                    lastOptionKey = item.dataset.key;
                    
                    overlayTaskId++;
                    const currentTaskId = overlayTaskId;

                    const image = await decodeThumb(lastOptionKey);
                    if (currentTaskId !== overlayTaskId) return;

                    window.updateThumbOverlay(lastOptionKey, image);
        
                    const overlayContainer = document.getElementById('cg-thumb-overlay');
                    if (overlayContainer) {
                        const hasImage = overlayContainer.querySelector('img') !== null;
                        overlayContainer.style.display = hasImage ? 'block' : 'none';
                        if (hasImage) {
                            overlayContainer.style.background = 'rgba(39,39,42, 0.2)';
                            overlayContainer.style.border = 'none';
        
                            requestAnimationFrame(() => {
                                const inputRect = activeInput.getBoundingClientRect();
                                const optionsRect = optionsList.getBoundingClientRect();
                                const itemRect = item.getBoundingClientRect();
        
                                const optionsWidth = Math.min(inputRect.width, 600);
                                let left;
                                let top = itemRect.top;
                                const overlayWidth = overlayContainer.offsetWidth || 327;
                                const overlayHeight = overlayContainer.offsetHeight || 480;
        
                                const inputId = activeInput.id;
                                if (inputId === 'cd-character1-overlay' || inputId === 'cd-character2-overlay') {
                                    left = optionsRect.left + optionsWidth + window.scrollX + 30;
                                } else if (inputId === 'cd-character3-overlay') {
                                    left = optionsRect.left + window.scrollX - overlayWidth - 10;
                                } else {
                                    overlayContainer.style.display = 'none';
                                    return;
                                }
                                            
                                if (top + overlayHeight > window.innerHeight - 10) {
                                    top = window.innerHeight - overlayHeight - 10;
                                }
                                if (top < 10) {
                                    top = 10;
                                }
                                if (top + overlayHeight - window.scrollY > window.innerHeight - 10) {
                                    top = window.innerHeight - overlayHeight - 10;
                                }
    
                                overlayContainer.style.transform = `translate(${left}px, ${top}px)`;
                                overlayContainer.style.left = '0';
                                overlayContainer.style.top = '0';
                                overlayContainer.style.zIndex = '10003';
                            });
                        }
                    } else {
                        console.warn(`[MouseEnter] cg-thumb-overlay not found`);
                    }
                };
        
                optionsList._onMouseLeave = (e) => {
                    overlayTaskId++;
                    const item = e.target.closest('.mydropdown-item');
                    if (!item) {
                        return;
                    }
                    const overlayContainer = document.getElementById('cg-thumb-overlay');
                    if (overlayContainer) {
                        overlayContainer.style.display = 'none';
                        lastOptionKey = null;
                    }
                };        
                optionsList.addEventListener('mouseenter', optionsList._onMouseEnter, true);
                optionsList.addEventListener('mouseleave', optionsList._onMouseLeave, true);
            }
        },
        
        _updateOptionsPosition: function(index) {
            if (!activeInput) activeInput = inputs[index];
            const inputRect = activeInput.getBoundingClientRect();
            const actualOptionsHeight = 30 * height;
            let maxHeight = Math.min(actualOptionsHeight, window.innerHeight * 0.8);
            const spaceBelow = window.innerHeight - inputRect.bottom;
            const spaceAbove = inputRect.top;
            const showAbove = spaceBelow < maxHeight && spaceAbove >= maxHeight;
    
            if(showAbove){
                maxHeight = Math.min(optionsList.scrollHeight, window.innerHeight * 0.8);
            }
    
            const styles = {
                width: `${Math.min(inputRect.width, 600)}px`,
                left: `${inputRect.left + window.scrollX}px`,
                top: showAbove
                    ? `${inputRect.top + window.scrollY - maxHeight}px`
                    : `${inputRect.bottom + window.scrollY}px`,
                zIndex: '10002',
                maxHeight: `${maxHeight}px`
            };
    
            if (showAbove && styles.top < window.scrollY) {
                styles.top = window.scrollY;
            }
    
            Object.assign(optionsList.style, styles);
        }
    };
    
    // Setup number input validation
    if (enableNumberInput && numberInputs.length > 0) {
        numberInputs.forEach((numberInput, index) => {
            numberInput.addEventListener('input', (e) => {
                const value = e.target.value;
                // Allow empty input or intermediate states (e.g., "1.", ".")
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    numberValues[index] = value;
                    return;
                }
                // Revert to previous valid value if input is invalid
                e.target.value = numberValues[index];
            });

            numberInput.addEventListener('blur', (e) => {
                let value = e.target.value.trim();
                if (value === '' || !/^\d*\.?\d*$/.test(value)) {
                    value = '1.0'; 
                } else {
                    let numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue < 0.1) {
                        numValue = 0.1; 
                    } else if (numValue > 2.0) {
                        numValue = 2.0; 
                    }
                    value = numValue.toFixed(1); // Format to 1 decimal places
                }
                e.target.value = value;
                numberValues[index] = value;
            });
        });
    }
    
    // Setup event handlers
    dropdown._clickHandler = (e) => {
        if (!container.contains(e.target) && !optionsList.contains(e.target)) {
            dropdown._closeDropdown();
            activeDropdownsRegistry.setActive(null);
        }
    };

    dropdown._scrollHandler = debounce(() => {
        if (optionsList.style.display !== 'none' && activeInput) {
            const index = parseInt(activeInput.closest('.mydropdown-wrapper, .mydropdown-wrapper-with-text').dataset.index);
            dropdown._updateOptionsPosition(index);
        }
    }, 100);

    document.addEventListener('click', dropdown._clickHandler);
    document.addEventListener('scroll', dropdown._scrollHandler, true);

    if (enableSearch) {        
        inputs.forEach((input, index) => {
            input.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); 
        
                activeDropdownsRegistry.setActive(uniqueId);                
                activeInput = input;
                isEditing[index] = true;
                input.value = ''; 
                filteredOptions[index] = [...options[index]];
                dropdown._updateOptionsList(index);
                dropdown._updateOptionsPosition(index);
                optionsList.style.display = filteredOptions[index].length > 0 ? 'block' : 'none';
                input.focus();
            });
        
            input.addEventListener('input', debounce(() => {
                const searchText = input.value.toLowerCase();            
                dropdown._updateOptionsList(index, searchText);
            }, 100));
        });
    } else {
        inputs.forEach((input, index) => {
            input.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                activeDropdownsRegistry.setActive(uniqueId);

                if (activeInput === input && optionsList.style.display === 'block') {
                    optionsList.style.display = 'none';
                    activeInput = null;
                    activeDropdownsRegistry.setActive(null);
                } else {
                    if (activeInput !== null) {
                        const prevIndex = parseInt(activeInput.closest('.mydropdown-wrapper, .mydropdown-wrapper-with-text').dataset.index);
                        inputs[prevIndex].value = valueOnly ? selectedValues[prevIndex] : selectedKeys[prevIndex];
                        isEditing[prevIndex] = false;
                    }
                    activeInput = input;
                    filteredOptions[index] = [...options[index]];
                    dropdown._updateOptionsList(index);
                    optionsList.style.display = filteredOptions[index].length > 0 ? 'block' : 'none';
                    input.value = valueOnly ? selectedValues[index] : selectedKeys[index];
                }
            });
        });
    }

    // Register this dropdown instance
    activeDropdownsRegistry.register(containerId, dropdown);
    
    return dropdown;
}