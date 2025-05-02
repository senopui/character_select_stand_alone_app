export function setupButtons(containerId, buttonText = 'Button', options = {}, callback = null) {
    let {
        defaultColor = '#007bff', 
        hoverColor = '#0056b3', 
        disabledColor = '#cccccc',
        width = '100px', 
        height = '40px',
        hidden = false,
        clickable = true
    } = options;

    const container = document.querySelector(`.${containerId}`);
    if (!container) {
        console.error(`[myButtons] Container with class "${containerId}" not found.`);
        return;
    }

    container.innerHTML = `
    <div class="myButton-${containerId}-container">
        <button class="myButton-${containerId}">
            ${buttonText}
        </button>
    </div>
    `;

    const button = container.querySelector(`.myButton-${containerId}`);
    if (!button) {
        console.error(`[myButtons] Failed to create button.`);
        return;
    }

    button.style.backgroundColor = defaultColor;
    button.style.width = width;
    button.style.height = height;
    button.style.display = hidden ? 'none' : 'inline-block';
    button.style.cursor = clickable ? 'pointer' : 'not-allowed';
    button.style.border = 'none';
    button.style.color = 'white';
    button.style.borderRadius = '4px';
    button.style.fontSize = '14px';
    button.style.transition = 'background-color 0.3s ease';
    button.disabled = !clickable;

    button.addEventListener('mouseover', () => {
        if (clickable) {
            button.style.backgroundColor = hoverColor;
        }
    });

    button.addEventListener('mouseout', () => {
        if (clickable) {
            button.style.backgroundColor = defaultColor;
        }
    });

    button.addEventListener('click', () => {
        if (clickable && callback) {
            callback();
        }
    });

    return {
        click: () => {
            if (clickable && callback) {
                callback();
            }
        },
        setTitle: (text) => {
            button.textContent = text;
        },
        setColors: (defaultCol, hoverCol, disabledCol) => {
            defaultColor = defaultCol;
            hoverColor = hoverCol;
            disabledColor = disabledCol;
            button.style.backgroundColor = clickable ? defaultColor : disabledColor;
        },
        getDefaultColor: () => {
            return defaultColor;
        },
        getHoverColor: () => {
            return hoverColor;
        },
        setSize: (btnWidth, btnHeight) => {
            button.style.width = btnWidth;
            button.style.height = btnHeight;
        },
        setVisibility: (isVisible) => {
            button.style.display = isVisible ? 'inline-block' : 'none';
        },
        setClickable: (isClickable) => {
            clickable = isClickable;
            button.style.cursor = isClickable ? 'pointer' : 'not-allowed';
            button.disabled = !isClickable;
            button.style.backgroundColor = isClickable ? defaultColor : disabledColor;
        }
    };
}

let showButtons1 = false;
export function toggleButtons() {
    const buttons1 = document.getElementById('generate-buttons-1');
    const buttons2 = document.getElementById('generate-buttons-2');

    if (showButtons1) {
        buttons1.style.display = 'flex';
        buttons2.style.display = 'none';
    } else {
        buttons1.style.display = 'none';
        buttons2.style.display = 'flex';
    }

    showButtons1 = !showButtons1;
}

