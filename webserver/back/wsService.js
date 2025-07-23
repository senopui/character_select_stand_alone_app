const { createHash } = require('crypto');
const { gunzipSync } = require('zlib');
const path = require('node:path')
const express = require('express'); 
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const { getGlobalSettings, getSettingFiles, updateSettingFiles, loadSettings, saveSettings } = require('../../scripts/main/globalSettings');
const { getCachedFilesWithoutThumb, getCharacterThumb } = require('../../scripts/main/cachedFiles');
const { getModelList, getModelListAll, getLoRAList, updateModelAndLoRAList } = require('../../scripts/main/modelList');
const { updateWildcards, loadWildcard } = require('../../scripts/main/wildCards');
const { tagReload, tagGet } = require('../../scripts/main/tagAutoComplete_backend');
const { runComfyUI, runComfyUI_Regional, openWsComfyUI, closeWsComfyUI, cancelComfyUI } = require('../../scripts/main/generate_backend_comfyui');
const { runWebUI, cancelWebUI, startPollingWebUI, stopPollingWebUI } = require('../../scripts/main/generate_backend_webui');
const { remoteAI, localAI } = require('../../scripts/main/remoteAI_backend');
const { loadFile, readImage, readSafetensors, readBase64Image } = require('../../scripts/main/fileHandlers');
const Main = require('../../main');

const CAT = '[WSS]';

let server; // HTTP server instance
let wss; // WebSocket server instance
let clients = new Map(); // Track clients with UUIDs

// Function to set up the HTTP server
function setupHttpServer(basePatch, wsAddr, wsPort, mainWindow) {
  const expressApp = express();
  
  // Set up rate limiter: max 100 requests per 15 minutes per IP for index.html
  const indexLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  expressApp.use(express.static(basePatch));

  // Serve index_browser.html for browser access
  expressApp.get('/', indexLimiter, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  // API endpoint to provide WebSocket configuration
  expressApp.get('/api/ws-config', (req, res) => {
    const host = req.headers.host.split(':')[0]; // Get hostname from request
    const protocol = req.headers['x-forwarded-proto'] || 'http'; // Detect protocol (useful for proxies)
    const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
    res.json({
      wsAddress: `${wsProtocol}://${host}:${wsPort}`,
      wsPort: wsPort
    });
  });

  server = expressApp.listen(wsPort, wsAddr, () => {
    console.log(CAT, `HTTP server running at http://${wsAddr}:${wsPort}`);
  });

  // Set up WebSocket server
  wss = createWebSocketServer(server);
}

function closeWebSocketServer() {
  if (wss) {
    wss.close(() => {
      console.log(CAT, 'WebSocket server closed');
    });
    clients.clear(); // Clear connected clients
  }

  if (server) {
    server.close(() => {
      console.log(CAT, 'HTTP server closed');
    });
  }
}

function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log(CAT, 'WebSocket client connected');
    const tempId = crypto.randomUUID(); // Temporary ID for the client
    clients.set(tempId, { ws, uuid: null });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        const { id, type } = data; // Extract message ID

        switch (type) {
          case 'registerUUID': {
            const uuid = crypto.randomUUID();
            clients.set(uuid, { ws, uuid });
            clients.delete(tempId);
            console.log(CAT, `Client registered with UUID: ${uuid}`);
            ws.send(JSON.stringify({ type: 'registerUUIDResponse', id, value: uuid }));
            return;
          }
          case 'API': {
            const { method, params = {} } = data;
            if (!method) {
              ws.send(JSON.stringify({ type: 'APIError', id, error: 'Method not specified' }));
              console.warn(CAT, 'Received API message without method');
              return;
            }
            await handleApiRequest(ws, method, params, id);
            break;
          }
          default:
            console.warn(CAT, `Unknown message type: ${type}`);
            ws.send(JSON.stringify({ type: 'APIError', id, error: `Unknown message type: ${type}` }));
        }
      } catch (error) {
        console.error(CAT, 'Error processing message:', error);
        ws.send(JSON.stringify({ type: 'APIError', id, error: 'Invalid message format or server error' }));
      }
    });

    ws.on('close', () => {
      console.log(CAT, 'WebSocket client disconnected');
      // Cleanup clients Map
      for (let [key, client] of clients) {
        if (client.ws === ws) {
          clients.delete(key);
          console.log(CAT, `Removed client with UUID: ${client.uuid || tempId}`);
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error(CAT, 'WebSocket error:', error);
      // Cleanup clients Map
      for (let [key, client] of clients) {
        if (client.ws === ws) {
          clients.delete(key);
          console.log(CAT, `Removed client with UUID: ${client.uuid || tempId} due to error`);
          break;
        }
      }
    });
  });

  return wss;
}

// Function to send a message to a specific client by UUID
function sendToClient(uuid, type, data) {
  const client = clients.get(uuid);
  if (client && client.ws.readyState === client.ws.OPEN) {
    try {
      const message = JSON.stringify({ type, value: data });
      client.ws.send(message);
      return true;
    } catch (error) {
      console.error(CAT, `Failed to send message to client ${uuid}:`, error);
      return false;
    }
  } else {
    console.warn(CAT, `Client ${uuid} not found or not open`);
    return false;
  }
}

// Function to broadcast a message to all connected clients
function broadcastMessage(type, data) {
  const message = JSON.stringify({ type, value: data });
  clients.forEach((client, uuid) => {
    if (client.ws.readyState === client.ws.OPEN) {
      try {
        client.ws.send(message);
        console.log(CAT, `Broadcasted message of type ${type} to client ${uuid}`);
      } catch (error) {
        console.error(CAT, `Failed to broadcast to client ${uuid}:`, error);
      }
    }
  });
}

// API method handler
const methodHandlers = {
  // version
  'getAppVersion': ()=> Main.getAppVersion(),

  // cached files
  'getCachedFiles': ()=> getCachedFilesWithoutThumb(),

  // fileHandlers
  'readFile': (params)=> loadFile(...params),
  'readImage': (params)=> readImage(...params),
  'readSafetensors': (params)=> readSafetensors(...params),
  'readBase64Image': (params)=> readBase64Image(...params),

  // global settings
  'getGlobalSettings': ()=> getGlobalSettings(),
  'loadSettingFile': (params)=> loadSettings(...params),
  'saveSettingFile': (params)=> saveSettings(...params),
  'getSettingFiles': ()=> getSettingFiles(),
  'updateSettingFiles': ()=> updateSettingFiles(),

  // file lists
  'getModelList': (params)=> getModelList(...params),
  'getModelListAll': (params)=> getModelListAll(...params),
  'getLoRAList': (params)=> getLoRAList(...params),
  'updateModelList': (params)=> updateModelAndLoRAList(...params),

  // wildcards
  'updateWildcards': ()=> updateWildcards(),
  'loadWildcard': (params)=> loadWildcard(...params),

  // tag auto complete
  'tagReload': ()=> tagReload(),
  'tagGet': (params)=> tagGet(...params),

  // AI
  'remoteAI': (params)=> remoteAI(...params),
  'localAI': (params)=> localAI(...params),

  // character thumb
  'getCharacterThumb': (params)=> getCharacterThumb(...params),

  // md5 hash
  'md5Hash': (params) => {
    const input = params[0];
    const hash = createHash('md5');
    hash.update(input);
    return hash.digest('hex');
  },

  // decompressGzip
  'decompressGzip': (params) => {
    const base64Data = params[0];
    const compressedData = Buffer.from(base64Data, 'base64');
    const decompressedData = gunzipSync(compressedData);
    return decompressedData;
  },
  
  // comfyui
  'runComfyUI': (params)=> runComfyUI(...params),
  'runComfyUI_Regional': (params)=> runComfyUI_Regional(...params),
  'openWsComfyUI': (params)=> openWsComfyUI(...params),
  'closeWsComfyUI': ()=> closeWsComfyUI(),
  'cancelComfyUI': ()=> cancelComfyUI(),

  // webui
  'runWebUI': (params)=> runWebUI(...params),
  'cancelWebUI': ()=> cancelWebUI(),
  'startPollingWebUI': ()=> startPollingWebUI(),
  'stopPollingWebUI': ()=> stopPollingWebUI(),
};

async function handleApiRequest(ws, method, params, id) {
  let result;

  const handler = methodHandlers[method];
  if (handler) {
    result = await handler(params); // Use await for async methods
  } else {
    ws.send(JSON.stringify({ type: 'APIError', method, id, error: `Unknown API method: ${method}` }));
    console.warn(CAT, `Unknown API method: ${method}`);
    return;
  }

  try {
    ws.send(JSON.stringify({ type: 'APIResponse', method, id, value: result }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'APIError', method, id, error: error.message }));
    console.error(CAT, `Error executing API method ${method}:`, error);
  }
}

module.exports = {
  setupHttpServer,
  closeWebSocketServer,
  broadcastMessage  
};

exports.sendToClient = sendToClient;