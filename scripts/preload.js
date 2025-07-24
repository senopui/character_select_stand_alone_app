/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */

const { contextBridge, ipcRenderer } = require('electron');
const { createHash } = require('crypto');
const { gunzipSync } = require('zlib');
const DOMPurify = require('dompurify');
const bcrypt = require('bcrypt');

contextBridge.exposeInMainWorld('DOMPurify', {
  sanitize: (dirty) => DOMPurify.sanitize(dirty)
});

// main to render
let okm = {
  mainGallery_appendImageData: null,
  customOverlay_updatePreview: null,
  customOverlay_progressBar: null,
  rightClickMenu_spellCheck: null
}

contextBridge.exposeInMainWorld('okm', {
  setup_mainGallery_appendImageData: (callback) => {
      if (typeof callback === 'function') {
        okm.mainGallery_appendImageData = callback;
      } 
  },
  setup_customOverlay_updatePreview: (callback) => {
    if (typeof callback === 'function') {
      okm.customOverlay_updatePreview = callback;
    } 
  },
  setup_customOverlay_progressBar: (callback) => {
    if (typeof callback === 'function') {
      okm.customOverlay_progressBar = callback;
    } 
  },
  setup_rightClickMenu_spellCheck: (callback) => {
    if (typeof callback === 'function') {
      okm.rightClickMenu_spellCheck = callback;
    } 
  }
});

const generateFunctions = {
  updatePreview(base64) {
    if(okm.customOverlay_updatePreview)
      okm.customOverlay_updatePreview(base64);
  },
  appendImage(base64, seed, tags) {
    if(okm.customOverlay_updatePreview)
      okm.mainGallery_appendImageData(base64, seed, tags);
  },
  updateProgress(progress, totalProgress) {
    if(okm.customOverlay_progressBar)
      okm.customOverlay_progressBar(progress, totalProgress);
  }, 
  rightClickMenu_spellCheck(suggestions, word) {
    if(okm.rightClickMenu_spellCheck)
      okm.rightClickMenu_spellCheck(suggestions, word);
  }
};

ipcRenderer.on('generate-backend', (event, { functionName, args }) => {
  if (generateFunctions[functionName]) {
    generateFunctions[functionName](...args);
  } else {
      console.error('[generate-backend] Unknown function:', functionName);
  }
});

// render to main
contextBridge.exposeInMainWorld('api', {
  // version
  getAppVersion: async () => ipcRenderer.invoke('get-saa-version'),

  // fileHandlers
  readFile: async (relativePath, prefix, filePath) => ipcRenderer.invoke('read-file', relativePath, prefix, filePath),
  readSafetensors: async (modelPath, prefix, filePath) => ipcRenderer.invoke('read-safetensors', modelPath, prefix, filePath),
  readImage: async (buffer, fileName, fileType) => ipcRenderer.invoke('read-image-metadata', buffer, fileName, fileType ),
  readBase64Image: async (dataUrl) => ipcRenderer.invoke('read-base64-image-metadata', dataUrl),

  // globalSettings
  getGlobalSettings: async () => ipcRenderer.invoke('get-global-settings'),
  getSettingFiles: async () => ipcRenderer.invoke('get-all-settings-files'),
  updateSettingFiles: async () => ipcRenderer.invoke('update-all-setting-files'),
  loadSettingFile: async (fineName) => ipcRenderer.invoke('load-setting-file', fineName),
  saveSettingFile: async (fineName, settings) => ipcRenderer.invoke('save-setting-file', fineName, settings),
  // cachedFiles
  getCachedFiles: async () => ipcRenderer.invoke('get-cached-files'),
  // downloadFiles
  downloadURL: async () => ipcRenderer.invoke('download-url', url, filePath),
  // modelList
  updateModelList: async (args) => ipcRenderer.invoke('update-model-list', args),
  getModelList: async (args) => ipcRenderer.invoke('get-model-list', args),
  getModelListAll: async (args) => ipcRenderer.invoke('get-model-list-all', args),
  getLoRAList: async (args) => ipcRenderer.invoke('get-lora-list-all', args),
  // Tag Auto Complete
  tagReload: async () => ipcRenderer.invoke('tag-reload'),
  tagGet: async (text) => ipcRenderer.invoke('tag-get-suggestions', text),
  // AI
  remoteAI: async (options) => ipcRenderer.invoke('request-ai-remote', options),
  localAI: async (options) => ipcRenderer.invoke('request-ai-local', options),
  // generate_backend ComfyUI
  runComfyUI: async (generateData) => ipcRenderer.invoke('generate-backend-comfyui-run', generateData),
  runComfyUI_Regional: async (generateData) => ipcRenderer.invoke('generate-backend-comfyui-run-regional', generateData),
  getImageComfyUI: async () => ipcRenderer.invoke('generate-backend-comfyui-get-image'),
  openWsComfyUI: async (prompt_id) => ipcRenderer.invoke('generate-backend-comfyui-open-ws', prompt_id),
  closeWsComfyUI: async () => ipcRenderer.invoke('generate-backend-comfyui-close-ws'),
  cancelComfyUI: async () => ipcRenderer.invoke('generate-backend-comfyui-cancel'),
  // generate_backend WebUI
  runWebUI: async (generateData) => ipcRenderer.invoke('generate-backend-webui-run', generateData),
  cancelWebUI: async () => ipcRenderer.invoke('generate-backend-webui-cancel'),
  startPollingWebUI: async () => ipcRenderer.invoke('generate-backend-webui-start-polling'),
  stopPollingWebUI: async () => ipcRenderer.invoke('generate-backend-webui-stop-polling'),

  // spellcheck
  replaceMisspelling: async (word) => ipcRenderer.invoke('replace-misspelling', word),
  addToDictionary: async (word) => ipcRenderer.invoke('add-to-dictionary', word),

  // Wildcards
  loadWildcard: async (fileName, seed) => ipcRenderer.invoke('load-wildcards', fileName, seed),
  updateWildcards: async () => ipcRenderer.invoke('update-wildcards'),

  // md5 hash
  md5Hash: (input) => {
    if (typeof input !== 'string') {
        console.error('[get_md5_hash]: Input must be a string');
        return null;
    }

    try {
        const hash = createHash('md5');
        hash.update(input);
        return hash.digest('hex');
    } catch (error) {
        console.error('[get_md5_hash]: Error generating hash', error);
        return null;
    }
  },

  bcryptHash: (pass) => {
    return bcrypt.hash(pass, 12);
  },

  // decompress gzip
  decompressGzip: (base64Data) => {
    try {
        const compressedData = Buffer.from(base64Data, 'base64');
        const decompressedData = gunzipSync(compressedData);
        return decompressedData;
    } catch (error) {
        console.error('[decompressGzip]: Error decompressing data', error);
        return null;
    }
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

