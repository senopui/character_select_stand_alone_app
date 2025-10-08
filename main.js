// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
// Force enable sandbox
app.enableSandbox();

const path = require('node:path')
const { Mutex } = require('async-mutex');
const { createHash } = require('crypto');
const zlib = require('zlib');
const bcrypt = require('bcrypt');

// WebSocket server
const { setupHttpServer, closeWebSocketServer } = require('./webserver/back/wsService');
// Import custom modules
const { setupFileHandlers } = require('./scripts/main/fileHandlers'); 
const { setupGlobalSettings } = require('./scripts/main/globalSettings'); 
const { setupDownloadFiles } = require('./scripts/main/downloadFiles'); 
const { setupModelList } = require('./scripts/main/modelList'); 
const { setupTagAutoCompleteBackend } = require('./scripts/main/tagAutoComplete_backend');
const { setupModelApi } = require('./scripts/main/remoteAI_backend');
const { setupGenerateBackendComfyUI, sendToRenderer } = require('./scripts/main/generate_backend_comfyui');
const { setupGenerateBackendWebUI } = require('./scripts/main/generate_backend_webui');
const { setupCachedFiles } = require('./scripts/main/cachedFiles'); 
const { setupWildcardsHandlers } = require('./scripts/main/wildCards');
const { setupTagger } = require('./scripts/main/imageTagger');

const version = app.getVersion();

let backendBusy = false;
const mutex = new Mutex();
async function getMutexBackendBusy() {
  const release = await mutex.acquire();
  try {
    return backendBusy; 
  } finally {
    release(); 
  }
}

async function setMutexBackendBusy(newValue) {
  const release = await mutex.acquire();
  try {
    backendBusy = newValue;
    return { success: true, value: backendBusy };
  } finally {
    release(); 
  }
}

async function getAppVersion() {
  return version;
}

async function compressGzipThenBase64(byteArray){
  try {
      const buffer = Buffer.from(byteArray);
      const gzipped = zlib.gzipSync(buffer,);
      return gzipped.toString('base64');
    } catch (error) {
      console.error('[compressGzip]: Error on compressing', error);
      return null;
    }
}

exports.getMutexBackendBusy = getMutexBackendBusy;
exports.setMutexBackendBusy = setMutexBackendBusy;
exports.getAppVersion = getAppVersion;
exports.compressGzipThenBase64 = compressGzipThenBase64;

let mainWindow; // Main browser window instance

function replaceMisspelling(word) {
  mainWindow.webContents.replaceMisspelling(word);
  return true;
}

function addToDictionary(word) {
  mainWindow.webContents.session.addWordToSpellCheckerDictionary(word);
  return true;
}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,  // Hide menu
    width: 1300,
    height: 1200,
    icon: path.join(__dirname, 'html/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'scripts/preload.js'),
      contextIsolation: true, // Enable context isolation
      nodeIntegration: false, // Disable Node.js integration
      nodeIntegrationInWorker: true, // Enable multithread
      spellcheck: true, // Enable spellcheck
      sandbox: true, // Enable sandbox
      webSecurity: true, //Enable web security
    }
  });

  // Set the spellchecker to check English US
  mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']);

  // Send the spellcheck suggestions to the renderer process
  mainWindow.webContents.on('context-menu', (event, params) => {
    event.preventDefault();
    const suggestions = params.dictionarySuggestions || [];
    const word = params.misspelledWord || '';
    sendToRenderer(`none`, `rightClickMenu_spellCheck`, suggestions, word);
  });

  // and load the index_electron.html of the app.
  mainWindow.loadFile('index_electron.html');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {     
  console.log("Character Select SAA Version:", version);

  setupFileHandlers();  
  const SETTINGS = setupGlobalSettings();
  setupModelList(SETTINGS);
  const downloadSuccess = await setupDownloadFiles();
  const cacheSuccess = setupCachedFiles();

  // Ensure wildcards list are set up before tag auto-complete
  setupWildcardsHandlers();

  const tacSuccess = await setupTagAutoCompleteBackend();
  setupModelApi();
  setupGenerateBackendComfyUI();
  setupGenerateBackendWebUI();  
  setupTagger();

  if (downloadSuccess && cacheSuccess && tacSuccess) {   
    createWindow();
    mainWindow.setTitle(`Wai Character Select SAA ${version}`);

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } else {
    console.error('[Main] Failed to download required files. Exiting...');
    app.quit();
  }

  // IPC handlers for spellcheck
  ipcMain.handle('replace-misspelling', async (event, word) => {    
    return replaceMisspelling(word);
  });
  ipcMain.handle('add-to-dictionary', async (event, word) => {    
    return addToDictionary(word);
  });

  // Version
  ipcMain.handle('get-saa-version', async (event) => {    
    return version;
  });

  ipcMain.handle('md5-hash', async (event, input) => {
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
  });

  ipcMain.handle('decompress-gzip', async (event, base64Data) => {
    try {
      const compressedData = Buffer.from(base64Data, 'base64');      
      const decompressedData = zlib.gunzipSync(compressedData);      
      return decompressedData;
    } catch (error) {
      console.error('[decompressGzip]: Error decompressing data', error);
      return null;
    }
  });

  ipcMain.handle('compress-gzip', async (event, byteArray) => {
    return await compressGzipThenBase64(byteArray);
  });

  ipcMain.handle('bcrypt-hash', async (event, pass) => {
    try {
      return await bcrypt.hash(pass, 12);
    } catch (error) {
      console.error('[bcryptHash]: Error generating hash', error);
      return null;
    }
  });

  // Start the HTTP server
  if(SETTINGS.ws_service) {
    setupHttpServer(path.join(__dirname), SETTINGS.ws_addr, SETTINGS.ws_port);
  }
})

// Quit when all windows are closed
app.on('window-all-closed', function () {
  // close the WebSocket server
  closeWebSocketServer();

  app.quit()
})
