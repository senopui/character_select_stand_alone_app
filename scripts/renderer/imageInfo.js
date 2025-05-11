export function setupImageUploadOverlay() {
    const fullBody = document.querySelector('#full-body');
    
    function defaultUploadOverlaySize(){
        const width = window.innerWidth;
        const height = window.innerHeight;
        uploadOverlay.style.width = `${width*0.6}px`;
        uploadOverlay.style.height = `${height*0.6}px`;
        uploadOverlay.style.minWidth = `768px`;
        uploadOverlay.style.minHeight = `768px`;
        uploadOverlay.style.maxWidth = `${width*0.6}px`;
        uploadOverlay.style.maxHeight = `${height*0.6}px`;
        uploadOverlay.style.top = `${(width - width*0.6) / 2}px`;
        uploadOverlay.style.left = `${(height - height*0.6) / 2}px`;

        closeButton.style.display = 'none';
    }

    function showImageUploadOverlaySize(imageWidth, imageHeight){
        uploadOverlay.style.width = `${imageWidth}px`;
        uploadOverlay.style.height = `${imageHeight}px`;

        const width = uploadOverlay.getBoundingClientRect().width;
        const height = uploadOverlay.getBoundingClientRect().height;

        uploadOverlay.style.top = `${Math.floor((window.innerHeight - height) / 2)}px`;
        uploadOverlay.style.left = `${Math.floor((window.innerWidth - width) / 2)}px`;

        closeButton.style.display = 'flex';
    }

    const uploadOverlay = document.createElement('div');
    uploadOverlay.className = 'im-image-upload-overlay';
    uploadOverlay.style.display = 'none'; 
    fullBody.appendChild(uploadOverlay);

    const closeButton = document.createElement('button');
    closeButton.className = 'cg-close-button';
    closeButton.style.display = 'none'; 
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        hideOverlay();
    });
    uploadOverlay.appendChild(closeButton);

    defaultUploadOverlaySize();

    const svgIcon = document.createElement('div');
    svgIcon.id = 'upload-svg-icon';
    svgIcon.innerHTML = `
        <img id="image-info-icon" src="scripts/svg/save.svg" alt="Upload" fill="currentColor">
    `;
    uploadOverlay.appendChild(svgIcon);

    const imagePreview = document.createElement('div');
    imagePreview.id = 'image-preview-container';
    imagePreview.style.display = 'none';
    const previewImg = document.createElement('img');
    previewImg.id = 'preview-image';
    previewImg.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        hideOverlay();
    });

    let isDragging = false;
    let isShowing = false;
    let dragStartX, dragStartY, initialLeft, initialTop;
    previewImg.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        initialLeft = parseFloat(getComputedStyle(uploadOverlay).left) || 0;
        initialTop = parseFloat(getComputedStyle(uploadOverlay).top) || 0;
        previewImg.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            uploadOverlay.style.left = `${initialLeft + deltaX}px`;
            uploadOverlay.style.top = `${initialTop + deltaY}px`;
        }
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            previewImg.style.cursor = 'grab';
        } else if (isShowing && !window.currentImageMetadata) {
            hideOverlay();
        } 
    });
    imagePreview.appendChild(previewImg);
    uploadOverlay.appendChild(imagePreview);

    const metadataContainer = document.createElement('div');
    metadataContainer.id = 'metadata-container';
    metadataContainer.style.maxHeight = '150px';
    metadataContainer.style.display = 'none'; 
    uploadOverlay.appendChild(metadataContainer);

    const updateDynamicHeights = () => {
        const isImageDisplayed = imagePreview.style.display !== 'none';
        if (isImageDisplayed) {
            const imageWidth = previewImg.getBoundingClientRect().width;
            const imageHeight = previewImg.getBoundingClientRect().height;                       
            metadataContainer.style.display = 'center';
            showImageUploadOverlaySize(imageWidth, imageHeight);
        } else {
            metadataContainer.style.display = 'none';
            defaultUploadOverlaySize();
        }
    };
    requestAnimationFrame(updateDynamicHeights);

    window.currentImageMetadata = null;
    function showOverlay() {
        uploadOverlay.style.display = 'flex';        
        requestAnimationFrame(updateDynamicHeights);
        isShowing = true;
    }

    function hideOverlay() {
        uploadOverlay.style.display = 'none';
        clearImageAndMetadata();
        isShowing = false;
    }

    function clearImageAndMetadata() {
        imagePreview.style.display = 'none';
        metadataContainer.style.display = 'none';
        svgIcon.style.display = 'flex';
        window.currentImageMetadata = null;
        metadataContainer.innerHTML = '';
        previewImg.src = '';
        defaultUploadOverlaySize();
        requestAnimationFrame(updateDynamicHeights);
    }

    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.currentImageMetadata) {
            clearImageAndMetadata();
        }
        if (e.dataTransfer.types.includes('Files')) {
            showOverlay();
        }
    });

    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.clientX <= 0 || e.clientY <= 0 || 
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            if (!window.currentImageMetadata) {
                hideOverlay();
            }
        } 
    });

    uploadOverlay.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();        
        uploadOverlay.classList.add('dragover');
    });

    uploadOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadOverlay.classList.remove('dragover');
    });

    uploadOverlay.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadOverlay.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const file = files[0];
            try {
                const metadata = await extractImageMetadata(file);
                showImagePreview(file);
                displayFormattedMetadata(metadata);
            } catch (err) {
                console.error('Failed to process image metadata:', err);
                const fallbackMetadata = {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    lastModified: file.lastModified,
                    error: 'Metadata extraction failed'
                };
                showImagePreview(file);
                displayFormattedMetadata(fallbackMetadata);
            }
        }
    });

    function showImagePreview(file) {
        svgIcon.style.display = 'none';
        imagePreview.style.display = 'flex';
        metadataContainer.style.display = 'block';

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.onload = () => {
                requestAnimationFrame(updateDynamicHeights);
            };
        };
        reader.readAsDataURL(file);
    }

    function createActionButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'metadata-buttons';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-all-metadata';
        copyButton.textContent = 'Copy All';

        copyButton.addEventListener('click', () => {
            let fullText = '';
            const parsedMetadata = window.currentImageMetadata;

            if (parsedMetadata.positivePrompt) {
                fullText += `Positive prompt: ${parsedMetadata.positivePrompt}\n`;
            }
            if (parsedMetadata.negativePrompt) {
                fullText += `Negative prompt: ${parsedMetadata.negativePrompt}\n\n`;
            }
            if (parsedMetadata.otherParams) {
                fullText += parsedMetadata.otherParams;
            }

            navigator.clipboard.writeText(fullText);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy All';
            }, 2000);
        });
        
        const sendButton = document.createElement('button');
        sendButton.className = 'send-metadata';
        sendButton.textContent = 'Send';
        
        sendButton.addEventListener('click', () => {
            const parsedMetadata = window.currentImageMetadata;
            
            sendPrompt(parsedMetadata);
            window.generate.landscape.setValue(false);
            window.ai.ai_select.setValue(0);
            
            sendButton.textContent = 'Sent!';
            setTimeout(() => {
                sendButton.textContent = 'Send';
            }, 2000);
        });
        
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(sendButton);
        
        return buttonContainer;
    }

    function sendPrompt(parsedMetadata) {
        function findInt(keyWord, otherParamsLines) {
            const line = otherParamsLines.find(line => line.trim().startsWith(keyWord));  
            if (line) {
                const escapedKeyWord = keyWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`${escapedKeyWord}\\s*(\\d+)`);
                const match = line.match(regex);
                if (match?.[1]) {
                    return match[1];
                }
            }
            return null;
        }

        const defaultPositivePrompt = "masterpiece, best quality, amazing quality";
        const defaultNegativePrompt = "bad quality, worst quality, worst detail, sketch";
        
        const extractedData = {
            positivePrompt: parsedMetadata.positivePrompt || defaultPositivePrompt,
            negativePrompt: parsedMetadata.negativePrompt || defaultNegativePrompt,
            steps: '30',
            cfgScale: "7.0",
            width: parsedMetadata.width || `1024`,
            height: parsedMetadata.height || `1360`,
            seed: '-1'
        };
        
        if (parsedMetadata.otherParams) {
            const otherParamsLines = parsedMetadata.otherParams.split('\n');

            extractedData.steps = findInt('Steps:', otherParamsLines);
            extractedData.seed = findInt('Seed:', otherParamsLines);
        
            const cfgLine = otherParamsLines.find(line => line.trim().startsWith('CFG scale:'));
            if (cfgLine) {
                const cfgMatch = cfgLine.match(/CFG scale:\s*(\d+\.?\d*)/);
                if (cfgMatch?.[1]) {
                    extractedData.cfgScale = cfgMatch[1];
                }
            }           
        
            const sizeLine = otherParamsLines.find(line => line.trim().startsWith('Size:'));
            if (sizeLine) {
                const sizeMatch = sizeLine.match(/Size:\s*(\d+)x(\d+)/);
                if (sizeMatch?.[1] && sizeMatch?.[2]) {
                    extractedData.width = sizeMatch[1];
                    extractedData.height = sizeMatch[2];
                }
            }
        }

        // Extract <lora:...> strings from positivePrompt
        const loraRegex = /<lora:[^>]+>/g;
        const loraMatches = extractedData.positivePrompt.match(loraRegex) || [];
        const allLora = loraMatches.join('\n');
        const allPrompt = extractedData.positivePrompt.replace(loraRegex, '').replace(/,\s*,/g, ',').replace(/(^,\s*)|(\s*,$)/g, '').trim();

        window.prompt.common.setValue(allPrompt || defaultPositivePrompt);
        window.prompt.positive.setValue(allLora);
        window.prompt.negative.setValue(extractedData.negativePrompt);    
        window.generate.seed.setValue(extractedData.seed);
        window.generate.cfg.setValue(extractedData.cfgScale);
        window.generate.step.setValue(extractedData.steps);
        window.generate.width.setValue(extractedData.width);
        window.generate.height.setValue(extractedData.height);    
    }

    function displayFormattedMetadata(metadata) {
        const parsedMetadata = parseGenerationParameters(metadata);
        window.currentImageMetadata = parsedMetadata;
        metadataContainer.innerHTML = '';

        const hasMetadata = parsedMetadata.positivePrompt || 
                           parsedMetadata.negativePrompt || 
                           parsedMetadata.otherParams;
        
        if (hasMetadata) {
            const buttonContainer = createActionButtons();
            metadataContainer.appendChild(buttonContainer);
        }

        const metadataDisplay = document.createElement('div');
        metadataDisplay.className = `metadata-custom-textbox-data`;
        metadataDisplay.style.whiteSpace = 'pre-wrap';
        metadataDisplay.style.overflow = 'auto';
        
        let metadataText = '';
        metadataText += `File name: ${parsedMetadata.fileName}\n`;
        if (parsedMetadata.width && parsedMetadata.height) {
            metadataText += `Size: ${parsedMetadata.width}x${parsedMetadata.height}\n`;
        }
        
        if (parsedMetadata.positivePrompt) {
            metadataText += `\nPositive prompt: ${parsedMetadata.positivePrompt}\n`;
        } else if (!parsedMetadata.error) {
            metadataText += '\nNo prompt metadata found\n';
        }
        
        if (parsedMetadata.negativePrompt) {
            metadataText += `Negative prompt: ${parsedMetadata.negativePrompt}\n`;
        }
        
        if (parsedMetadata.otherParams) {
            metadataText += `\n${parsedMetadata.otherParams}`;
        }
        
        if (parsedMetadata.error) {
            metadataText += `\nError: ${parsedMetadata.error}\n`;
        }
        
        metadataDisplay.textContent = metadataText;
        metadataContainer.appendChild(metadataDisplay);
    }

    function parseGenerationParameters(metadata) {
        const result = extractBasicMetadata(metadata);
        if (metadata.error || !isValidGenerationParameters(metadata)) {
          return result;
        }
      
        const { positivePrompt, negativePrompt, otherParams } = parsePrompts(metadata.generationParameters);
        return assignResults(result, positivePrompt, negativePrompt, otherParams);
    }
      
    function extractBasicMetadata(metadata) {
        const result = {};
        const fields = ['fileName', 'fileSize', 'fileType', 'lastModified', 'error'];
        fields.forEach(field => {
            if (metadata[field]) result[field] = metadata[field];
        });
        return result;
    }

    function isValidGenerationParameters(metadata) {
        return metadata.generationParameters && typeof metadata.generationParameters === 'string';
    }

    function parsePrompts(paramString) {
        const lines = paramString.split('\n').map(line => line.trim()).filter(line => line);
        let positivePrompt = [];
        let negativePrompt = '';
        let otherParams = [];
        let inNegativePrompt = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('Negative prompt:')) {
            inNegativePrompt = true;
            negativePrompt = line.slice('Negative prompt:'.length).trim();
            } else if (line.startsWith('Steps:')) {
            const remaining = lines.slice(i).join(', ');
            otherParams = parseKeyValuePairs(remaining);
            break;
            } else if (inNegativePrompt) {
            negativePrompt += `, ${line}`;
            } else {
            positivePrompt.push(line);
            }
        }

        return { positivePrompt, negativePrompt, otherParams };
    }

    function parseKeyValuePairs(input) {
        const pairs = [];
        let currentPair = '';
        let braceCount = 0;
        let inQuotes = false;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            if (char === '{' || char === '[') braceCount++;
            else if (char === '}' || char === ']') braceCount--;
            else if (char === '"' && input[i - 1] !== '\\') inQuotes = !inQuotes;

            if (char === ',' && braceCount === 0 && !inQuotes) {
            if (currentPair.trim()) pairs.push(currentPair.trim());
            currentPair = '';
            continue;
            }
            currentPair += char;
        }
        if (currentPair.trim()) pairs.push(currentPair.trim());

        return pairs
            .map(pair => {
            const colonIndex = pair.indexOf(':');
            if (colonIndex === -1) return null;
            const key = pair.slice(0, colonIndex).trim();
            const value = pair.slice(colonIndex + 1).trim();
            return `${key}: ${value}`;
            })
            .filter(Boolean);
    }

    function assignResults(result, positivePrompt, negativePrompt, otherParams) {
        if (positivePrompt.length > 0) {
            result.positivePrompt = positivePrompt.join(', ');
        }
        if (negativePrompt) {
            result.negativePrompt = negativePrompt;
        }
        if (otherParams.length > 0) {
            result.otherParams = otherParams.join('\n');
        }
        return result;
    }

    async function extractImageMetadata(file) {
        const basicMetadata = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            lastModified: file.lastModified
        };

        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        try {
            const result = await window.api.readImage(Array.from(uint8Array), file.name, file.type);
            if (result.error || !result.metadata) {
                console.warn('Main process metadata extraction failed:', result.error || 'No metadata found');
                return basicMetadata;
            }
            return {
                ...basicMetadata,
                generationParameters: result.metadata
            };
        } catch (error) {
            throw new Error(`Metadata extraction failed: ${error.message}`);
        }
    }

    window.addEventListener('resize', () => {
        if (uploadOverlay.style.display !== 'none') {            
            requestAnimationFrame(updateDynamicHeights);
        }
    });

    uploadOverlay.showOverlay = showOverlay;
    uploadOverlay.hideOverlay = hideOverlay;
    uploadOverlay.clearImageAndMetadata = clearImageAndMetadata;

    uploadOverlay._cleanup = () => {
        document.removeEventListener('dragenter', showOverlay);
        uploadOverlay.remove();
    };


    window.imageUploadOverlay = uploadOverlay;
    return uploadOverlay;
}