import { customCommonOverlay } from './customOverlay.js';

export function from_main_updateGallery(base64, seed, tagsString){
    const keepGallery = window.generate.keepGallery.getValue();
    if(!keepGallery)
        window.mainGallery.clearGallery();
    window.mainGallery.appendImageData(base64, seed, tagsString, keepGallery);
}

export function from_main_updatePreview(base64){
    let overlay = document.getElementById('cg-loading-overlay');
    if (!overlay) {
        overlay = customCommonOverlay().createLoadingOverlay();
    }
    const imgElement = overlay.querySelector('img');
    if (imgElement) {
        imgElement.src = base64;
        imgElement.style.maxWidth = '256px';
        imgElement.style.maxHeight = '384px';
        imgElement.style.objectFit = 'contain';
        imgElement.onerror = () => {
            imgElement.src = window.cachedFiles.loadingWait;
            imgElement.style.maxWidth = '192px';
            imgElement.style.maxHeight = '192px';
            imgElement.onerror = null;
        };
    } 
}

export function from_main_customOverlayProgress(progress, totalProgress){
    const loadingMessage = window.generate.loadingMessage.split('(')[0];
    window.generate.loadingMessage = `${loadingMessage}(${progress}/${totalProgress})`;
}