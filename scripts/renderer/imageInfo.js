import { sendWebSocketMessage } from '../../webserver/front/wsRequest.js';
import { generateControlnetImage, fileToBase64 } from './generate.js';
import { getControlNetLiet } from "./myControlNetSlot.js"

let cachedImage = '';
let lastTaggerOptions = null;

function createHtmlOptions(itemList) {
    let options = [];
    if(window.globalSettings.api_interface === 'ComfyUI') {
        itemList.forEach((item) => {
            if(String(item).startsWith('CV->'))
                return;
            options.push(`<option value="${item}">${item}</option>`);
        });
    } else {
        // 'WebUI'
        itemList.forEach((item) => {
            options.push(`<option value="${item}">${item}</option>`);
        });
    }
    return options.join();
}

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
        <img class="filter-controlnet-icon" id="global-image-upload-icon" src="scripts/svg/image-upload.svg" alt="Upload" fill="currentColor">
        <img class="filter-controlnet-icon" id="global-file-upload-icon" src="scripts/svg/file-upload.svg" alt="Upload" fill="currentColor">
        <img class="filter-controlnet-icon" id="global-clipboard-paste-icon" src="scripts/svg/paste.svg" alt="Upload" fill="currentColor">
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

    // helper for pasted image items
    async function handlePastedImageItem(item) {
        const file = item.getAsFile();
        if (!file) return false;
        cachedImage = file;
        try {
            const metadata = await extractImageMetadata(file);
            showImagePreview(file);
            displayFormattedMetadata(metadata);
        } catch (err) {
            console.error('Failed to process pasted image metadata:', err);
            const fallbackMetadata = {
                fileName: file.name || 'pasted_image.png',
                fileSize: file.size,
                fileType: file.type,
                lastModified: file.lastModified || Date.now(),
                error: 'Metadata extraction failed'
            };
            showImagePreview(file);
            displayFormattedMetadata(fallbackMetadata);
        }
        return true;
    }

    // helper for pasted json/csv file items
    async function handlePastedJsonOrCsvFile(item) {
        const file = item.getAsFile();
        if (!file) return false;
        console.log('Pasted file:', file.name);
        await window.jsonlist.addJsonSlotFromFile(file, file.type);
        window.collapsedTabs.jsonlist.setCollapsed(false);
        hideOverlay();
        return true;
    }

    // helper for pasted plain text items (keeps async logic inside callback but not nested deeply)
    function handlePastedPlainTextItem(item) {
        return new Promise((resolve) => {
            item.getAsString(async (text) => {
                try {
                    // Try parsing as JSON
                    JSON.parse(text);
                    const file = new File([text], 'pasted_data.json', { type: 'application/json', lastModified: Date.now() });
                    console.log('Pasted JSON text:', file.name);
                    await window.jsonlist.addJsonSlotFromFile(file, 'application/json');
                    window.collapsedTabs.jsonlist.setCollapsed(false);
                    hideOverlay();
                    resolve(true);
                } catch (jsonErr) {
                    console.error('Failed to parse pasted text as JSON:', jsonErr);
                    // If not JSON, treat as CSV (basic validation: check for comma-separated values)
                    if (text.includes(',')) {
                        const file = new File([text], 'pasted_data.csv', { type: 'text/csv', lastModified: Date.now() });
                        console.log('Pasted CSV text:', file.name);
                        await window.jsonlist.addJsonSlotFromFile(file, 'text/csv');
                        window.collapsedTabs.jsonlist.setCollapsed(false);
                        hideOverlay();
                        resolve(true);
                    } else {
                        console.warn('Pasted text is not valid JSON or CSV:', text.slice(0, 50));
                        hideOverlay();
                        resolve(true);
                    }
                }
            });
        });
    }

    const handlePaste = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const items = e.clipboardData.items;

        for (const item of items) {
            try {
                if (item.type.startsWith('image/')) {
                    if (await handlePastedImageItem(item)) break;
                } else if (item.type === 'application/json' || item.type === 'text/csv') {
                    if (await handlePastedJsonOrCsvFile(item)) break;
                } else if (item.type === 'text/plain') {
                    await handlePastedPlainTextItem(item);
                    break;
                } else {
                    console.log("Unknown type:", item.type);
                }
            } catch (err) {
                console.error('Error handling pasted item:', err);
            }
        }
    };

    function showOverlay() {
        uploadOverlay.style.display = 'flex';
        requestAnimationFrame(updateDynamicHeights);
        isShowing = true;
        // Add Ctrl+V
        document.addEventListener('paste', handlePaste);
    }

    function hideOverlay() {
        uploadOverlay.style.display = 'none';
        clearImageAndMetadata();
        isShowing = false;
        // Disable Ctrl+V
        document.removeEventListener('paste', handlePaste);
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
        if (files.length > 0) {
            if(files[0].type.startsWith('image/')) {
                const file = files[0];
                cachedImage = file;
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
            } else if (files[0].type === `application/json` 
                    || files[0].type === `text/csv`) {
                console.log('Dropped JSON file:', files[0].name);
                await window.jsonlist.addJsonSlotFromFile(files[0], files[0].type);
                window.collapsedTabs.jsonlist.setCollapsed(false);
                hideOverlay();
            } else {
                console.warn('Dropped file ', files[0].name, ' is not support. File type: ', files[0].type);
                hideOverlay();
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

    function createControlNetButtons(apiInterface) {
        const SETTINGS = window.globalSettings;
        const FILES = window.cachedFiles;
        const LANG = FILES.language[SETTINGS.language];

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'controlnet-buttons';

        const controlNetSelect = document.createElement('select');
        controlNetSelect.className = 'controlnet-select';
        controlNetSelect.innerHTML = createHtmlOptions(getControlNetLiet());

        const controlNetResolution = document.createElement('select');
        controlNetResolution.className = 'controlnet-select';
        controlNetResolution.innerHTML = createHtmlOptions([512,640,768,1024,1280,1536,2048]);

        const controlNetPostSelect = document.createElement('select');
        controlNetPostSelect.className = 'controlnet-select';
        controlNetPostSelect.innerHTML = createHtmlOptions(window.cachedFiles.controlnetList);
        
        const postProcessButton = document.createElement('button');
        postProcessButton.className = 'controlnet-postprocess';
        postProcessButton.textContent = LANG.image_info_add_controlnet;

        function setProcessingState() {
            postProcessButton.textContent = LANG.image_info_add_controlnet_processing;
            postProcessButton.style.cursor = 'not-allowed';
            postProcessButton.disabled = true;
        }

        function setNormalState() {
            postProcessButton.textContent = LANG.image_info_add_controlnet;
            postProcessButton.style.cursor = 'pointer';
            postProcessButton.disabled = false;
        }

        async function handleGeneratedControlNet(preImageBase64) {
            const {preImage, preImageAfter, preImageAfterBase64} =
                await generateControlnetImage(
                    cachedImage, controlNetSelect.value, controlNetResolution.value,
                    apiInterface !== 'ComfyUI'); // WebUI skip gzip

            if (preImageAfterBase64?.startsWith('data:image/png;base64,')) {
                const slotValues = [[
                    controlNetSelect.value,          // preProcessModel
                    controlNetResolution.value,      // preProcessResolution
                    'Post',                          // slot_enable
                    controlNetPostSelect.value,      // postModel
                    0.6,                             // postProcessStrength
                    0,                               // postProcessStart
                    0.5,                             // postProcessEnd
                    preImage,                        // pre_image
                    preImageAfter,                   // pre_image_after
                    preImageBase64,                  // pre_image_base64
                    preImageAfterBase64,             // pre_image_after_base64
                ]];
                window.controlnet.AddControlNetSlot(slotValues);

                previewImg.src = preImageAfterBase64;
                setTimeout(() => {
                    postProcessButton.textContent = LANG.image_info_add_controlnet_added;
                    window.collapsedTabs.controlnet.setCollapsed(false);
                }, 200);
            } else {
                postProcessButton.textContent = LANG.image_info_add_controlnet_failed;
                setTimeout(() => {
                    setNormalState();
                }, 5000);
            }
        }

        async function handleDirectControlNet(preImageBase64) {
            async function compressForComfy(buffer) {
                if (!window.inBrowser) {
                    return await window.api.compressGzip(buffer);
                } else {
                    const base64String = await blobOrFileToBase64(cachedImage);
                    return await sendWebSocketMessage({ type: 'API', method: 'compressGzip', params: [base64String.replace('data:image/png;base64,', '')] });
                }
            }

            let buffer = await cachedImage.arrayBuffer();
            let preImageGzipped = buffer;
            let refImage = null;
            let aftImageB64 = null;
            const onTrigger = controlNetSelect.value.startsWith('ip-adapter');
            if (onTrigger) {
                refImage = `data:image/png;base64,${arrayBufferToBase64(buffer)}`;                
                const afterBuffer = await resizeImageToControlNetResolution(buffer, controlNetResolution.value, false, apiInterface === 'ComfyUI');   // not sure A1111 requires a square image or not
                aftImageB64 = `data:image/png;base64,${arrayBufferToBase64(afterBuffer)}`;
                preImageGzipped = afterBuffer;
            }

            if (apiInterface === 'ComfyUI') {
                preImageGzipped = await compressForComfy(preImageGzipped);
            } else { 
                // WebUI
                preImageGzipped = arrayBufferToBase64(preImageGzipped);
            }            

            const slotValues = [[
                controlNetSelect.value,          // preProcessModel
                controlNetResolution.value,      // preProcessResolution
                onTrigger ? 'On' : 'Post',       // slot_enable
                controlNetPostSelect.value,      // postModel
                0.8,                             // postProcessStrength
                0,                               // postProcessStart
                0.8,                             // postProcessEnd
                onTrigger ? preImageGzipped : null,         // pre_image
                !onTrigger ? preImageGzipped : null,        // pre_image_after
                refImage,                                   // pre_image_base64
                onTrigger ? aftImageB64 : preImageBase64,   // pre_image_after_base64 
            ]];
            window.controlnet.AddControlNetSlot(slotValues);

            setTimeout(() => {
                postProcessButton.textContent = LANG.image_info_add_controlnet_added;
                window.collapsedTabs.controlnet.setCollapsed(false);
            }, 200);
        }

        postProcessButton.addEventListener('click', async (e) => {
            if (postProcessButton.disabled) return;
            setProcessingState();

            try {
                const preImageBase64 = await fileToBase64(cachedImage);

                if (controlNetSelect.value !== 'none' && !controlNetSelect.value.startsWith('ip-adapter')) {
                    await handleGeneratedControlNet(preImageBase64);
                } else {
                    await handleDirectControlNet(preImageBase64);
                }
            } catch (err) {
                console.error('Post process error:', err);
                postProcessButton.textContent = LANG.image_info_add_controlnet_failed;
                setTimeout(() => {
                    setNormalState();
                }, 2000);
            } finally {
                // if the button shows "added" keep that briefly, otherwise reset immediately
                if (!postProcessButton.textContent.includes(LANG.image_info_add_controlnet_added)) {
                    setNormalState();
                } else {
                    setTimeout(() => setNormalState(), 2000);
                }
            }
        });

        buttonContainer.appendChild(controlNetSelect);
        buttonContainer.appendChild(controlNetResolution);
        buttonContainer.appendChild(controlNetPostSelect);        
        buttonContainer.appendChild(postProcessButton);
        return buttonContainer;
    }

    function createActionButtons() {
        const SETTINGS = window.globalSettings;
        const FILES = window.cachedFiles;
        const LANG = FILES.language[SETTINGS.language];

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'metadata-buttons';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-all-metadata';
        copyButton.textContent = LANG.image_info_copy_metadata;

        copyButton.addEventListener('click', async () => {
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
            
            try {
                await navigator.clipboard.writeText(fullText);
            } catch (err){
                console.warn('Failed to copy:', err);
                const SETTINGS = window.globalSettings;
                const FILES = window.cachedFiles;
                const LANG = FILES.language[SETTINGS.language];
                window.overlay.custom.createCustomOverlay('none', LANG.saac_macos_clipboard.replace('{0}', fullText));
            }
            copyButton.textContent = LANG.image_info_copy_metadata_copied;
            setTimeout(() => {
                copyButton.textContent = LANG.image_info_copy_metadata;
            }, 2000);
        });
        
        const sendButton = document.createElement('button');
        sendButton.className = 'send-metadata';
        sendButton.textContent = LANG.image_info_send_tags;
        
        sendButton.addEventListener('click', () => {
            const parsedMetadata = window.currentImageMetadata;
            
            sendPrompt(parsedMetadata);
            window.generate.landscape.setValue(false);
            window.ai.ai_select.setValue(0);
            
            sendButton.textContent = LANG.image_info_send_tags_sent;
            setTimeout(() => {
                sendButton.textContent = LANG.image_info_send_tags;
            }, 2000);
        });
        
        buttonContainer.appendChild(sendButton);
        buttonContainer.appendChild(copyButton);        
        
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

    function createImageTagger() {
        function modelOptionsOptions(modelChoice) {
            if(modelChoice.startsWith('wd-')) {
                return ['mCut:OFF', 'General', 'Character', 'Both'];            
            } else if(modelChoice.startsWith('cl_')) {
                return ['All', 'General/Character/Artist/CopyRight', 'General', 'Character', 'Artist', 'Copyright', 'Meta', 'Model', 'Rating', 'Quality'];
            } else if(modelChoice.startsWith('camie-')) {
                return ['without Year', 'All', 'without Year/Rating', 'General/Character/Artist/CopyRight', 'general', 'rating', 'meta', 'character', 'artist', 'copyright', 'year'];
            } else {
                return ['N/A']
            }
        }

        const SETTINGS = window.globalSettings;
        const FILES = window.cachedFiles;
        const LANG = FILES.language[SETTINGS.language];

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'image-tagger-buttons';

        const modelOptions = document.createElement('select');
        const genThreshold = document.createElement('select');
        const charThreshold = document.createElement('select');

        const imageTaggerModels = document.createElement('select');
        imageTaggerModels.className = 'controlnet-select';
        imageTaggerModels.innerHTML = createHtmlOptions(FILES.imageTaggerModels);
        imageTaggerModels.value = lastTaggerOptions?.model_choice || FILES.imageTaggerModels[0];
        imageTaggerModels.addEventListener('change', () => {
            modelOptions.innerHTML = createHtmlOptions(modelOptionsOptions(imageTaggerModels.value));
        });
        buttonContainer.appendChild(imageTaggerModels);
        
        genThreshold.className = 'controlnet-select';
        genThreshold.innerHTML = createHtmlOptions([0.25,0.30,0.35,0.40,0.45,0.50,0.55,0.60,0.65,0.70,0.75,0.80,0.85,0.90,0.95,1.00]);
        genThreshold.value = lastTaggerOptions?.gen_threshold || 0.55;
        buttonContainer.appendChild(genThreshold);
        
        charThreshold.className = 'controlnet-select';
        charThreshold.innerHTML = createHtmlOptions([0.25,0.30,0.35,0.40,0.45,0.50,0.55,0.60,0.65,0.70,0.75,0.80,0.85,0.90,0.95,1.00]);
        charThreshold.value = lastTaggerOptions?.char_threshold || 0.60;
        buttonContainer.appendChild(charThreshold);

        modelOptions.className = 'controlnet-select';
        modelOptions.innerHTML = createHtmlOptions(modelOptionsOptions(lastTaggerOptions?.model_choice || FILES.imageTaggerModels[0]));
        buttonContainer.appendChild(modelOptions);

        const imageTaggerButton = document.createElement('button');
        imageTaggerButton.className = 'image-tagger-process';
        imageTaggerButton.textContent = LANG.image_tagger_run;
        imageTaggerButton.addEventListener('click', async () => {            
            if(!imageTaggerButton.disabled) {
                if(imageTaggerModels.value === 'none') {
                imageTaggerButton.textContent = 'Select Model';
                imageTaggerButton.style.cursor = 'not-allowed';
                imageTaggerButton.disabled = true;
                
                setTimeout(() => {
                    imageTaggerButton.textContent = LANG.image_tagger_run;
                    imageTaggerButton.style.cursor = 'pointer';
                    imageTaggerButton.disabled = false;
                }, 500);
                return;
            }

                imageTaggerButton.textContent = LANG.image_tagger_run_processing;
                imageTaggerButton.style.cursor = 'not-allowed';
                imageTaggerButton.disabled = true;
                try {                    
                    let imageBase64 = await fileToBase64(cachedImage);
                    if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:')) {
                        imageBase64 = imageBase64.split(',')[1];
                    }

                    let result = '';
                    if (!window.inBrowser) {
                        result = await window.api.runImageTagger({
                            image_input: imageBase64,
                            model_choice: imageTaggerModels.value,
                            gen_threshold: genThreshold.value,
                            char_threshold: charThreshold.value,
                            model_options: modelOptions.value
                        });
                    } else {
                        result = await sendWebSocketMessage({ 
                            type: 'API', 
                            method: 'runImageTagger', 
                            params: [
                                imageBase64,
                                imageTaggerModels.value,
                                genThreshold.value,
                                charThreshold.value,
                                modelOptions.value
                            ]});
                    } 

                    lastTaggerOptions = {
                        model_choice: imageTaggerModels.value,
                        gen_threshold: genThreshold.value,
                        char_threshold: charThreshold.value
                    };

                    if(result) {
                        imageTaggerButton.textContent = LANG.image_tagger_run_tagged;
                        console.log(result.join(', '));
                        window.overlay.custom.createCustomOverlay('none', "\n\n" + result.join(', '));
                    } else {
                        imageTaggerButton.textContent = LANG.image_tagger_run_no_tag;
                    }   
                } catch (err) {
                    console.error('Image Tagger error:', err);
                    imageTaggerButton.textContent = LANG.image_tagger_run_error;
                }
                setTimeout(() => {
                    imageTaggerButton.textContent = LANG.image_tagger_run;
                    imageTaggerButton.style.cursor = 'pointer';
                    imageTaggerButton.disabled = false;
                }, 2000);
            }
        });
        buttonContainer.appendChild(imageTaggerButton);
        
        metadataContainer.appendChild(buttonContainer);
    }

    function displayFormattedMetadata(metadata) {
        const apiInterface = window.generate.api_interface.getValue();
        const parsedMetadata = parseGenerationParameters(metadata);
        window.currentImageMetadata = parsedMetadata;
        metadataContainer.innerHTML = '';

        const hasMetadata = parsedMetadata.positivePrompt || 
                           parsedMetadata.negativePrompt || 
                           parsedMetadata.otherParams;
        
        createImageTagger();

        if(apiInterface !== 'None') {
            metadataContainer.appendChild(createControlNetButtons(apiInterface));        
        }

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
      
        const { positivePrompt, negativePrompt, otherParams } = parsePrompts(metadata);        
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
        if (metadata.fileType === 'image/jpeg' || metadata.fileType === 'image/webp')
        {
            return metadata.generationParameters.data && typeof metadata.generationParameters.data === 'string';
        }
        else if (metadata.fileType === 'image/png') {
            return metadata.generationParameters.parameters && typeof metadata.generationParameters.parameters === 'string';
        }

        return false;
    }

    function parsePrompts(metadata) {
        let paramString = '';
        if (metadata.fileType === 'image/jpeg' || metadata.fileType === 'image/webp')
        {
            paramString = metadata.generationParameters.data;
        }
        else if (metadata.fileType === 'image/png') {
            paramString = metadata.generationParameters.parameters;
        }        
        
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
            let result;
            if (!window.inBrowser) {
                result = await window.api.readImage(Array.from(uint8Array), file.name, file.type);
            } else {
                result = await sendWebSocketMessage({ type: 'API', method: 'readImage', params: [Array.from(uint8Array), file.name, file.type]});
            }
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

async function blobOrFileToBase64(blobOrFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blobOrFile);
    });
}

// Convert various input forms into a Blob.
function toBlob(data) {
    if (data instanceof File || data instanceof Blob) {
        return data;
    }
    if (typeof data === 'string') {
        const arr = data.split(',');
        const mimeMatch = /:(.*?);/.exec(arr[0]);
        const mime = mimeMatch ? mimeMatch[1] : '';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
    if (data instanceof ArrayBuffer) {
        return new Blob([data]);
    }
    if (data instanceof Uint8Array) {
        return new Blob([data.buffer]);
    }
    throw new Error('Unsupported image data type');
}

// Load an image element from a Blob and return it (async).
function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            resolve(img);
        };
        img.onerror = reject;
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Convert a canvas to a Blob using a Promise.
function canvasToBlobAsync(canvas, type) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas toBlob returned null'));
        }, type);
    });
}

// Get image size from a Blob.
async function getImageSizeFromBlob(blob) {
    const img = await loadImageFromBlob(blob);
    return { width: img.width, height: img.height };
}

async function resizeImageBlob(blob, maxRes, input, toSquare) {
    const img = await loadImageFromBlob(blob);

    // Resize a Blob (or File) to fit within maxRes while preserving aspect ratio.
    const scale = Math.min(maxRes / Math.max(img.width, img.height), 1);
    const newWidth = Math.round(img.width * scale);
    const newHeight = Math.round(img.height * scale);
    
    const intermediateCanvas = document.createElement('canvas');
    intermediateCanvas.width = newWidth;
    intermediateCanvas.height = newHeight;
    const ictx = intermediateCanvas.getContext('2d');
    ictx.drawImage(img, 0, 0, newWidth, newHeight);    
    const intermediateBlob = await canvasToBlobAsync(intermediateCanvas, blob.type || 'image/png');

    
    // Scale the intermediate result to a square of size maxRes x maxRes (final canvas)
    const finalCanvas = document.createElement('canvas');
    if(toSquare) {
        finalCanvas.width = maxRes;
        finalCanvas.height = maxRes;
    } else {
        finalCanvas.width = newWidth;
        finalCanvas.height = newHeight;
    }
    const fctx = finalCanvas.getContext('2d');
    const intermediateImg = await loadImageFromBlob(intermediateBlob);
    fctx.drawImage(intermediateImg, 0, 0, maxRes, maxRes);

    const resizedBlob = await canvasToBlobAsync(finalCanvas, blob.type || 'image/png');
    if (input instanceof File) {
        return new File([resizedBlob], input.name, { type: input.type });
    }
    return resizedBlob;
}

function arrayBufferToBase64(buf) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(buf)) {
        return Buffer.from(buf).toString('base64');
    }

    let bytes;
    if (buf instanceof ArrayBuffer) bytes = new Uint8Array(buf);
    else if (buf instanceof Uint8Array) bytes = buf;
    else throw new Error('Unsupported buffer type');

    const chunkSize = 0x8000; // 32KB chunk
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

export async function resizeImageToControlNetResolution(input, resolution, toB64 = false, toSquare = false) {
    let processed = input;
    try {
        const blob = toBlob(input);
        const size = await getImageSizeFromBlob(blob);
        console.log(`Resizing image from ${size.width}x${size.height} to max ${resolution}x${resolution}`);
        processed = await resizeImageBlob(blob, resolution, input, toSquare);
        // Ensure we return ArrayBuffer like original behavior when resized
        if (processed.arrayBuffer) {
            processed = await processed.arrayBuffer();
        } else if (processed instanceof ArrayBuffer) {
            // already ArrayBuffer
        } else if (processed instanceof Uint8Array) {
            processed = processed.buffer;
        }
    } catch (err) {
        console.warn('Resize image failed, use original size', err);
    }
    return toB64?arrayBufferToBase64(processed):processed;
}
