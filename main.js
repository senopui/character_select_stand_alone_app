// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('node:path')
const { setupFileHandlers } = require('./scripts/main/fileHandlers'); 
const { setupGlobalSettings } = require('./scripts/main/globalSettings'); 
const { setupDownloadFiles } = require('./scripts/main/downloadFiles'); 
const { setupModelList } = require('./scripts/main/modelList'); 
const { setupTagAutoCompleteBackend } = require('./scripts/main/tagAutoComplete_backend');
const { setupModelApi } = require('./scripts/main/remoteAI_backend');
const { setupGenerateBackendComfyUI } = require('./scripts/main/generate_backend_comfyui');
const { setupGenerateBackendWebUI } = require('./scripts/main/generate_backend_webui');
const { setupCachedFiles } = require('./scripts/main/cachedFiles'); 

function createWindow () {
  // Create the browser window.
  let mainWindow = new BrowserWindow({
    //titleBarStyle: 'hidden',
    autoHideMenuBar: true,  // Hide menu
    width: 1300,
    height: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'scripts/preload.js'),
      contextIsolation: true, // Enable context isolation
      nodeIntegration: false, // Disable Node.js integration
      nodeIntegrationInWorker: true // Enable mulitthread
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {  
  setupFileHandlers();  
  const SETTINGS = setupGlobalSettings();
  setupModelList(SETTINGS);
  const downloadSuccess = await setupDownloadFiles();
  const cacheSuccess = setupCachedFiles();
  const tacSuccess = await setupTagAutoCompleteBackend();
  setupModelApi();
  setupGenerateBackendComfyUI();
  setupGenerateBackendWebUI();

  if (downloadSuccess && cacheSuccess && tacSuccess) {
    createWindow();

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  }else {
    console.error('Failed to download required files. Exiting...');
    app.quit();
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
