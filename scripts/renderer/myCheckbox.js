const CAT_CB = '[myCheckbox]'
const CAT_RB = '[myRadiobox]';

export function setupCheckbox(containerId, spanText = 'myCheckbox', defaultChecked = false, mirror = false, callback = null) {
    const container = document.querySelector(`.${containerId}`);
    if (!container) {
        console.error(CAT_CB, `Container with class "${containerId}" not found.`);
        return;
    }

    container.innerHTML = `
        <span class="myCheckbox-${containerId}-span">${spanText}</span>        
        <input class="myCheckbox-${containerId}-input" type="checkbox" ${defaultChecked ? 'checked' : ''}>    
    `;

    const checkboxInput = container.querySelector(`.myCheckbox-${containerId}-input`);
    const checkboxSpan = container.querySelector(`.myCheckbox-${containerId}-span`);

    if (!checkboxInput || !checkboxSpan) {
        console.error(CAT_CB, `Failed to create checkbox elements.`);
        return;
    }

    if(mirror) {
        container.insertBefore(checkboxInput, checkboxSpan);
    }

    container.addEventListener('click', (event) => {
        if (event.target !== checkboxInput) {
            checkboxInput.checked = !checkboxInput.checked;            
        }   
        if(callback)
            callback();
    });

    return {
        setValue: (value) => {
            if (typeof value === 'boolean') {
                checkboxInput.checked = value;
            } else {
                console.warn(CAT_CB, `Invalid value for setValue. Expected true or false: `, typeof value);
            }
        },
        getValue: () => {
            return checkboxInput.checked;
        },
        setTitle: (text) => {
            checkboxSpan.textContent = text;
        }
    };
}

export function setupRadiobox(containerId, spanText = 'myRadiobox', items = 'ON,OFF', items_title = 'on,off', defaultSelectedIndex = 0, callback = null) {
    const container = document.querySelector(`.${containerId}`);
    if (!container) {
        console.error(CAT_RB, `Container with class "${containerId}" not found.`);
        return;
    }

    const groupName = `radiobox-${containerId}`;
    let itemArray = items.split(',').map(item => item.trim());
    let titleArray = items_title.split(',').map(title => title.trim());

    if (defaultSelectedIndex < 0 || defaultSelectedIndex >= itemArray.length) {
        console.warn(CAT_RB, `Invalid defaultSelectedIndex: ${defaultSelectedIndex}. Defaulting to 0.`);
        defaultSelectedIndex = 0;
    }

    const renderRadioboxItems = () => {
        return itemArray
            .map((item, index) => {
                const isChecked = index === defaultSelectedIndex ? 'checked' : '';
                const title = titleArray[index] || ''; 
                return `
                    <label class="myRadiobox-${containerId}-item" title="${title}">
                        <input class="myRadiobox-${containerId}-input" type="radio" name="${groupName}" value="${index}" ${isChecked} title="${title}">
                        <span class="myRadiobox-${containerId}-label" title="${title}">${item}</span>
                    </label>
                `;
            })
            .join('');
    };

    const renderRadiobox = () => {
        container.innerHTML = `        
            <div class="myRadiobox-${containerId}-group">
                <span class="myRadiobox-${containerId}-span">${spanText}</span>
                ${renderRadioboxItems()}
            </div>
        `;
    };

    renderRadiobox();

    const radioboxInputs = () => container.querySelectorAll(`.myRadiobox-${containerId}-input`);
    const radioboxSpan = () => container.querySelector(`.myRadiobox-${containerId}-span`);

    if (!radioboxInputs().length || !radioboxSpan()) {
        console.error(CAT_RB, `Failed to create radiobox elements.`);
        return;
    }

    container.addEventListener('click', (event) => {
        if(callback)
            callback();
    });

    return {
        setValue: (index) => {
            if (index < 0 || index >= radioboxInputs().length) {
                console.warn(CAT_RB, `Invalid index "${index}".`);
                return;
            }
            radioboxInputs().forEach((input, i) => {
                input.checked = i === index;
            });
        },
        getValue: () => {
            let selectedIndex = -1;
            radioboxInputs().forEach((input, index) => {
                if (input.checked) {
                    selectedIndex = index;
                }
            });
            return selectedIndex;
        },
        setTitle: (newSpanText, newItems, newItemsTitle) => {
            if (newSpanText) {
                spanText = newSpanText;
                radioboxSpan().textContent = spanText;
            }

            if (newItems) {
                itemArray = newItems.split(',').map(item => item.trim());
            }
            if (newItemsTitle) {
                titleArray = newItemsTitle.split(',').map(title => title.trim());
            }

            if (itemArray.length !== titleArray.length) {
                console.warn(CAT_RB, `Mismatch between items and items_title lengths. Expected ${itemArray.length}, got ${titleArray.length}.`);
                return;
            }

            renderRadiobox();
        }
    };
}