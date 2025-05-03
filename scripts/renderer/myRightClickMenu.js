import { getAiPrompt } from './remoteAI.js';

const CAT = '[RightClickMenu]';

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export function setupRightClickMenu() {
    if (window.rightClick?.initialized) {
        console.log(CAT, 'RightClickMenu already initialized');
        return;
    }

    console.log(CAT, 'Initializing RightClickMenu system');

    const menuBox = document.createElement('div');
    menuBox.className = 'right-click-menu';
    menuBox.style.zIndex = '10002';
    document.body.appendChild(menuBox);

    let menuConfig = [];
    let rightClickStartX, rightClickStartY, rightClickStartTime;
    let allowMenu = false;
    let isMoved = false;

    window.rightClick = {
        initialized: true,
        push: (index, displayName, handler) => {
            if (typeof index !== 'string' && typeof index !== 'number') {
                console.error(CAT, 'Invalid index:', index);
                return;
            }
            if (menuConfig.some(item => item.index === index)) {
                console.warn(CAT, `Index ${index} already exists, use update or remove first`);
                return;
            }
            const newItem = { index, displayName, handler };
            if (menuConfig.length === 0 || !displayName) {
                menuConfig.push(newItem);
            } else {
                menuConfig.unshift(newItem); // Insert at start
            }
        },
        append: (index, displayName, handler) => {
            if (typeof index !== 'string' && typeof index !== 'number') {
                console.error(CAT, 'Invalid index:', index);
                return;
            }
            if (menuConfig.some(item => item.index === index)) {
                console.warn(CAT, `Index ${index} already exists, use update or remove first`);
                return;
            }
            const newItem = { index, displayName, handler };
            menuConfig.push(newItem); // Append at end
        },
        remove: (index) => {
            const itemIndex = menuConfig.findIndex(item => item.index === index);
            if (itemIndex === -1) {
                console.warn(CAT, `No menu item found with index ${index}`);
                return;
            }
            menuConfig.splice(itemIndex, 1);
        },
        setTitle: (index, newDisplayName) => {
            const item = menuConfig.find(item => item.index === index);
            if (!item) {
                console.warn(CAT, `No menu item found with index ${index}`);
                return;
            }
            if (item.displayName === null) {
                console.warn(CAT, `Cannot update display name for separator at index ${index}`);
                return;
            }
            item.displayName = newDisplayName;
        },
        updateLanguage: () => {
            updateRightClickMenu();
        }
    };

    document.addEventListener('mousedown', (e) => {
        if (e.button === 2 && !allowMenu && !isMoved) { // Right-click
            rightClickStartX = e.clientX;
            rightClickStartY = e.clientY;
            rightClickStartTime = Date.now();
            allowMenu = true;
        }
    });

    document.addEventListener('mousemove', (e) => {        
        if (typeof rightClickStartX === 'number' && typeof rightClickStartY === 'number' && allowMenu) {
            const deltaX = Math.abs(e.clientX - rightClickStartX);
            const deltaY = Math.abs(e.clientY - rightClickStartY);
            if (deltaX > 5 || deltaY > 5) {
                allowMenu = false; // Significant movement, likely resizing
                isMoved = true;
            }
        }
    });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!menuConfig.length) return;

        const duration = Date.now() - rightClickStartTime;
        if (allowMenu && duration > 300 || isMoved) {
            rightClickStartX = undefined;
            rightClickStartY = undefined;
            rightClickStartTime = undefined;
            allowMenu = false;
            isMoved = false;
            return; // Suppress entire menu
        }

        const targetElement = e.target;
        renderMenu(e.clientX, e.clientY, targetElement);
        rightClickStartX = undefined;
        rightClickStartY = undefined;
        rightClickStartTime = undefined;
        allowMenu = false;
        isMoved = false;
    });

    document.addEventListener('click', (e) => {
        if (!menuBox.contains(e.target)) {
            menuBox.style.display = 'none';
        }
    });

    document.addEventListener('scroll', debounce(() => {
        if (menuBox.style.display !== 'none') {
            updateMenuPosition();
        }
    }, 100), true);

    function renderMenu(x, y, targetElement) {
        const fragment = document.createDocumentFragment();
        let maxWidth = 0;
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        tempDiv.style.whiteSpace = 'nowrap';
        document.body.appendChild(tempDiv);

        menuConfig.forEach((item) => {
            if (item.displayName === null && item.handler === null) {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                fragment.appendChild(separator);
                return;
            }

            if (typeof item.handler === 'object' && item.handler.selector) {
                if (!targetElement.closest(item.handler.selector)) {
                    return;
                }
            }

            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.style.padding = '6px 12px';
            menuItem.style.cursor = 'pointer';
            menuItem.style.fontSize = '14px';
            menuItem.style.userSelect = 'none';
            menuItem.innerHTML = item.displayName;
            menuItem.dataset.index = item.index;

            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = '#f0f0f0';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'none';
            });

            menuItem.addEventListener('click', () => {
                executeMenuAction(item.handler, targetElement);
                menuBox.style.display = 'none';
            });

            tempDiv.textContent = item.displayName;
            maxWidth = Math.max(maxWidth, tempDiv.offsetWidth);
            fragment.appendChild(menuItem);
        });

        document.body.removeChild(tempDiv);
        if (!fragment.children.length) {
            menuBox.style.display = 'none';
            return;
        }

        menuBox.innerHTML = '';
        menuBox.appendChild(fragment);
        menuBox.style.width = `${Math.min(maxWidth + 24, 300)}px`;
        updateMenuPosition(x, y);
        menuBox.style.display = 'block';
    }

    function executeMenuAction(handler, targetElement) {
        try {
            if (typeof handler === 'function') {
                handler();
            } else if (typeof handler === 'object' && handler.func && handler.selector) {
                const element = targetElement.closest(handler.selector);
                if (element) {
                    handler.func(element);
                }
            } else {
                console.warn(CAT, 'Invalid handler:', handler);
            }
        } catch (error) {
            console.error(CAT, 'Error executing menu action:', error);
        }
    }

    function updateMenuPosition(x, y) {
        const menuWidth = menuBox.offsetWidth || 200;
        const menuHeight = menuBox.offsetHeight || 100;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const paddingX = 10;
        const paddingY = 10;

        let newLeft = x;
        let newTop = y;

        if (newLeft + menuWidth > windowWidth - paddingX) {
            newLeft = Math.max(0, windowWidth - menuWidth - paddingX);
        }
        if (newTop + menuHeight > windowHeight - paddingY) {
            newTop = Math.max(0, y - menuHeight - paddingY);
        }

        menuBox.style.left = `${newLeft}px`;
        menuBox.style.top = `${newTop}px`;
    }

    registerDefaultMenuItems();
}

function updateRightClickMenu(){
    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    window.rightClick.setTitle('copy_image', LANG.right_menu_copy_image);
    window.rightClick.setTitle('copy_image_metadata', LANG.right_menu_copy_image_metadata);
    window.rightClick.setTitle('clear_gallery', LANG.right_menu_clear_gallery);
    window.rightClick.setTitle('test_ai_generate', LANG.right_menu_test_ai_generate);
}

function registerDefaultMenuItems() {
    const SETTINGS = window.globalSettings;
    const FILES = window.cachedFiles;
    const LANG = FILES.language[SETTINGS.language];

    window.rightClick.append('copy_image', LANG.right_menu_copy_image, {
        selector: '.cg-main-image-container',
        func: (element) => menu_copyImage(element)
    });

    window.rightClick.append('copy_image_metadata', LANG.right_menu_copy_image_metadata, {
        selector: '.cg-main-image-container',
        func: async (element) => await menu_copyImageMetadata(element)
    });

    window.rightClick.append('test_ai_generate', LANG.right_menu_test_ai_generate, {
        selector: '.prompt-ai',
        func: async (element) => await test_ai_generate(element)
    });    

    window.rightClick.append('separator_1', null, null);

    window.rightClick.append('clear_gallery', LANG.right_menu_clear_gallery, () => {
        window.mainGallery.clearGallery();
    });
}

function menu_copyImage(element) {
    const img = element.querySelector('img');
    if (img?.src.startsWith('data:image/')) {
        try {
            const image = new Image();
            image.src = img.src;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]).then(() => {}).catch((err) => {
                            console.error(CAT, 'Failed to copy PNG image to clipboard:', err);
                        });
                    } 
                }, 'image/png');
            };
            image.onerror = () => {
                console.error(CAT, 'Failed to load image for conversion');
            };
        } catch (err) {
            console.error(CAT, 'Error processing image:', err);
        }
    }
}

async function menu_copyImageMetadata(element) {
    const img = element.querySelector('img');
    if (img?.src.startsWith('data:image/')) {
        try {
            const result = await window.api.readBase64Image(img.src);
            if (result.error || !result.metadata) {
                return ;
            }
            navigator.clipboard.writeText(result.metadata).then(() => {}).catch((err) => {
                console.error(CAT, 'Failed to copy PNG image metadata to clipboard:', err);
            });
        } catch (error) {
            throw new Error(`Metadata extraction failed: ${error.message}`);
        }
    }
}

async function test_ai_generate(element){
    try {
        const textarea = element.querySelector('.myTextbox-prompt-ai-textarea');
        if (!textarea) {
            console.warn(CAT, 'No textarea found with class myTextbox-prompt-ai-textarea');
            return;
        }

        const text = textarea.value.trim();
        if (!text) {
            console.warn(CAT, 'Textarea is empty');
            return;
        }

        const aiText = await getAiPrompt(0, text);
        window.overlay.custom.createCustomOverlay('none', `\n\n\n${aiText}`);
    } catch (err) {
        console.error(CAT, 'Error on get AI prompt:', err);
    }
}