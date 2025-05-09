const CAT = '[ThumbGallery]'

function decompressImageData(base64Data) {
    try {
        const decompressedData = window.api.decompressGzip(base64Data);
        if (decompressedData) {
            return new Uint8Array(decompressedData);
        }
    } catch (error) {
        console.error(CAT, '[ThumbGallery] Error decompressing image data:', error);
    }
    return null;
}

function convertWebPToBase64(webpData) {
    try {
        const binaryString = Array.from(webpData)
            .map(byte => String.fromCharCode(byte))
            .join('');
        const base64Data = btoa(binaryString);

        return base64Data;
    } catch (error) {
        console.error(CAT, '[ThumbGallery] Error converting WebP data to Base64:', error);
        return null;
    }
}

function setupScrollableContainer(container) {
    let isDragging = false, startX, scrollLeft;
    container.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        document.body.style.userSelect = 'none';
    });
    container.addEventListener('mouseleave', () => {
        isDragging = false;
        container.style.cursor = 'grab';
        document.body.style.userSelect = '';
    });
    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
        document.body.style.userSelect = '';
    });
    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - startX) * 1;
        container.scrollLeft = scrollLeft - walk;
    });
}

function ensureSwitchModeButton(container, toggleFunction, id, images_length) {
    let button = document.getElementById(id);
    if (!button) {
        button = document.createElement('button');
        button.id = id;
        button.className = 'cg-button';
        button.textContent = images_length > 0 ? `<${images_length}>` : '<>';
        button.addEventListener('click', async () => {
            const overlay = createModeSwitchOverlay(container);
            overlay.classList.add('visible');

            await new Promise(resolve => setTimeout(resolve, 100));
            toggleFunction();

            handleOverlayAnimation(overlay);
        });
        
        function handleOverlayAnimation(overlay) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    overlay.classList.remove('visible');
                    removeOverlayAfterDelay(overlay, 300);
                }, 10000); // assume 10 seconds for the animation to finish
            });
        }
        
        function removeOverlayAfterDelay(overlay, delay) {
            setTimeout(() => overlay.remove(), delay);
        }
        container.appendChild(button);
    }
    else {
        button.textContent = images_length > 0 ? `<${images_length}>` : '<>';
    }
}

function createModeSwitchOverlay(container) {
    let overlay = document.getElementById('cg-mode-switch-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'cg-mode-switch-overlay';
        overlay.className = 'cg-mode-switch-overlay';
        overlay.innerHTML = `
            <div class="cg-mode-switch-spinner"></div>
            <div class="cg-mode-switch-text">${window.cachedFiles.language[window.globalSettings.language].switch_gallery_mode}</div>
        `;
        container.appendChild(overlay);
    }
    return overlay;
}

export function setupThumbOverlay() {
    if (window.thumbGallery.isThumbOverlaySetup) return;
    window.thumbGallery.isThumbOverlaySetup = true;

    let images = [];
    let lastCharacter = null;

    const container = document.createElement('div');
    container.id = 'cg-thumb-overlay';
    container.className = 'cg-overlay cg-thumb-overlay';
    container.style.position = 'fixed';
    container.style.display = 'none';
    container.style.background = 'rgba(0, 0, 0, 0.5)';
    container.style.borderRadius = '8px';
    container.style.padding = '10px';
    container.style.zIndex = '10003';
    container.style.boxSizing = 'border-box';
    container.style.willChange = 'transform';
    document.body.appendChild(container);

    console.log(CAT, 'Setting up the thumbnail overlay', container);

    function renderOverlay(newImages) {
        if (JSON.stringify(newImages) === JSON.stringify(images)) return;
        images = newImages;

        const scrollContainer = container.querySelector('.cg-thumb-overlay-container') || document.createElement('div');
        scrollContainer.className = 'cg-thumb-overlay-container scroll-container';
        scrollContainer.style.display = 'flex';
        scrollContainer.style.flexWrap = 'wrap';
        scrollContainer.style.gap = '10px';
        scrollContainer.style.maxHeight = '460px';
        scrollContainer.style.overflowY = 'auto';
        setupScrollableContainer(scrollContainer);

        const existingImages = Array.from(scrollContainer.children);
        const fragment = document.createDocumentFragment();

        newImages.forEach((url, idx) => {
            let img = existingImages[idx] || document.createElement('img');
            img.src = url;
            img.loading = 'lazy'; 
            img.className = 'cg-thumb-overlay-image';
            img.style.width = '307px';
            img.style.height = '460px';
            img.style.margin = '10px';
            img.style.cursor = 'pointer';
            img.style.objectFit = 'contain';
            img.onerror = () => {
                console.error('[renderOverlay] Failed to load image:', url);
                img.remove();
            };
            fragment.appendChild(img);
        });

        existingImages.slice(newImages.length).forEach(img => img.remove());
        scrollContainer.innerHTML = '';
        scrollContainer.appendChild(fragment);
        if (!container.contains(scrollContainer)) container.appendChild(scrollContainer);

        const imgWidth = 314;
        const containerWidth = Math.max(314, images.length * imgWidth);
        container.style.width = `${Math.min(containerWidth, window.innerWidth * 0.8)}px`;
    }

    window.updateThumbOverlay = function (character, imageData) {
        if (typeof character !== 'string' || character === lastCharacter) return;
        lastCharacter = character;

        const overlayContainer = document.getElementById('cg-thumb-overlay');
        if (!overlayContainer) {
            console.warn('[updateThumbOverlay] Overlay container not found');
            return;
        }

        overlayContainer.innerHTML = '';

        if (imageData) {
            const img = document.createElement('img');
            img.src = imageData;
            img.loading = 'lazy';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            overlayContainer.appendChild(img);
        }
    };

    renderOverlay([]);
    return () => {
        container.remove();
        window.thumbGallery.isThumbOverlaySetup = false;
    };
}

export function setupThumb(containerId) {
    if (window.thumbGallery.isThumbSetup) return;
    window.thumbGallery.isThumbSetup = true;

    let isGridMode = false;
    let images = [];
    let renderedImageCount = 0;

    const container = document.querySelector(`.${containerId}`);
    if (!container) {
        console.error(CAT, 'Thumbnail gallery container not found', containerId);
        return;
    }

    console.log(CAT, 'Setting up the thumbnail gallery', container);

    function thumb_renderGridMode(incremental = false) {
        if (!images || images.length === 0) {
            container.innerHTML = '';
            renderedImageCount = 0;
            const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
            if (switchModeButton) switchModeButton.remove();
            return;
        }

        let gallery = container.querySelector('.cg-thumb-grid-container');
        let lastAspectRatio = parseFloat(localStorage.getItem('thumbGridAspectRatio') || '0');

        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        const firstImage = new Image();
        firstImage.src = images[images.length - 1]; // Use latest image for aspect ratio
        firstImage.onload = () => {
            const aspectRatio = firstImage.width / firstImage.height;
            const needsRedraw = !incremental || Math.abs(aspectRatio - lastAspectRatio) > 0.001;

            if (!gallery || needsRedraw) {
                container.innerHTML = '';
                gallery = document.createElement('div');
                gallery.className = 'cg-thumb-grid-container scroll-container';
                container.appendChild(gallery);
                renderedImageCount = 0;
            }

            const targetHeight = containerHeight / 1.2;
            const targetWidth = targetHeight * aspectRatio;
            const itemsPerRow = Math.floor(containerWidth / (targetWidth + 10));
            gallery.style.gridTemplateColumns = `repeat(${itemsPerRow}, ${targetWidth}px)`;

            const fragment = document.createDocumentFragment();
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const imgContainer = entry.target;
                        const img = imgContainer.querySelector('img');
                        img.src = img.dataset.src;
                        img.className = 'cg-thumb-image visible';
                        observer.unobserve(imgContainer);
                    }
                });
            }, { root: gallery, threshold: 0.1 });

            // Render only new images in incremental mode
            for (let i = images.length - 1; i >= renderedImageCount; i--) {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'cg-thumb-item';
                imgContainer.style.width = `${targetWidth}px`;
                imgContainer.style.height = `${targetHeight}px`;

                const img = document.createElement('img');
                img.className = 'cg-thumb-image';
                img.dataset.src = images[i];
                img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Placeholder
                img.loading = 'lazy';
                img.onerror = () => {
                    console.error('[thumb_renderGridMode] Failed to load image:', images[i]);
                    imgContainer.remove();
                };
                imgContainer.appendChild(img);
                fragment.appendChild(imgContainer);
                observer.observe(imgContainer);
            }

            gallery.prepend(fragment); // Prepend to match gallery's order
            renderedImageCount = images.length;

            localStorage.setItem('thumbGridAspectRatio', aspectRatio.toString());

            ensureSwitchModeButton(container, () => {
                isGridMode = !isGridMode;
                isGridMode ? thumb_renderGridMode() : thumb_renderSplitMode();
            }, 'cg-thumb-switch-mode-button', images.length);
        };

        firstImage.onerror = () => {
            console.error('[thumb_renderGridMode] Failed to load latest image');
            container.innerHTML = '';
            renderedImageCount = 0;
            const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
            if (switchModeButton) switchModeButton.remove();
        };
    }

    function thumb_renderSplitMode(incremental = false) {
        if (!images || images.length === 0) {
            container.innerHTML = '';
            renderedImageCount = 0;
            const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
            if (switchModeButton) switchModeButton.remove();
            return;
        }

        let scrollContainer = container.querySelector('.cg-thumb-scroll-container');
        if (!scrollContainer || !incremental) {
            container.innerHTML = '';
            scrollContainer = document.createElement('div');
            scrollContainer.className = 'cg-thumb-scroll-container scroll-container';
            setupScrollableContainer(scrollContainer);
            container.appendChild(scrollContainer);
            renderedImageCount = 0;
        }

        const fragment = document.createDocumentFragment();
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.className = 'cg-thumb-scroll-image visible';
                    observer.unobserve(img);
                }
            });
        }, { root: scrollContainer, threshold: 0.1 });

        // Render only new images in incremental mode
        for (let i = images.length - 1; i >= renderedImageCount; i--) {
            const img = document.createElement('img');
            img.className = 'cg-thumb-scroll-image';
            img.dataset.src = images[i];
            img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Placeholder
            img.loading = 'lazy';
            img.onerror = () => {
                console.error('[thumb_renderSplitMode] Failed to load image:', images[i]);
                img.remove();
            };
            fragment.appendChild(img);
            observer.observe(img);
        }

        scrollContainer.prepend(fragment); // Prepend to match gallery's order
        renderedImageCount = images.length;

        ensureSwitchModeButton(container, () => {
            isGridMode = !isGridMode;
            isGridMode ? thumb_renderGridMode() : thumb_renderSplitMode();
        }, 'cg-thumb-switch-mode-button', images.length);
    }

    window.thumbGallery.clear = function() {
        window.thumbGallery.update(null);
    }

    window.thumbGallery.update = function (imageData) {
        if (!Array.isArray(imageData) || imageData.length === 0) {
            container.innerHTML = '';
            const switchModeButton = document.getElementById('cg-thumb-switch-mode-button');
            if (switchModeButton) switchModeButton.remove();
            images = [];
            renderedImageCount = 0;
            return;
        }

        images = imageData;
        renderedImageCount = 0;
        isGridMode ? thumb_renderGridMode() : thumb_renderSplitMode();
    };

    window.thumbGallery.append = function (imageData) {
        if (!Array.isArray(imageData) || imageData.length === 0) {
            return;
        }

        images = [...images, ...imageData];
        isGridMode ? thumb_renderGridMode(true) : thumb_renderSplitMode(true);
    };

    thumb_renderGridMode();
}

export function decodeThumb(character, random_seed = -1) {
    if (!isValidCharacter(character, random_seed)) return null;

    const chara = getCharacterData(character);
    if (!chara) return null;

    const md5Chara = getMd5Hash(chara);
    if (!md5Chara) return null;

    const gzipWebp = window.cachedFiles.characterThumb[md5Chara];
    if (!gzipWebp) return null;

    return getBase64Image(gzipWebp);
}

function isValidCharacter(character, random_seed) {
    if (!character || character === 'None') return false;
    return !(character === 'Random' && random_seed === -1);
}

function getCharacterData(character) {
    return window.cachedFiles.characterList[character] || null;
}

function getMd5Hash(chara) {
    return window.api.md5Hash(chara.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'));
}

function getBase64Image(gzipWebp) {
    const webpData = decompressImageData(gzipWebp);
    if (!webpData) return null;

    const base64Data = convertWebPToBase64(webpData);
    if (!base64Data) return null;

    return `data:image/webp;base64,${base64Data}`;
}