const { createHash } = require('crypto');
const { gunzipSync } = require('zlib');
const path = require('node:path');
const fs = require('fs');
const http = require('http'); 
const https = require('https');
const express = require('express');
const helmet = require('helmet');
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

let server; // HTTP or HTTPS server instance
let wss; // WebSocket or WebSocket Secure server instance
let clients = new Map(); // Track clients with UUIDs

// Function to set up the HTTP or HTTPS server based on certificate availability
function setupHttpServer(basePatch, wsAddr, wsPort) {
    // Check for certificate files
    const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../../html/cert.pem');
    const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../../html/key.pem');
    let useHttps = false;

    try {
        // Verify that both certificate files exist and are readable
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            fs.accessSync(certPath, fs.constants.R_OK);
            fs.accessSync(keyPath, fs.constants.R_OK);
            useHttps = true;
            console.log(CAT, 'Certificate files found. Starting HTTPS server.');
        } else {
            console.log(CAT, 'Certificate files not found or inaccessible. Falling back to HTTP server.');
        }
    } catch (error) {
        console.warn(CAT, 'Error accessing certificate files. Falling back to HTTP server:', error);
    }

    const expressApp = express();

    if (useHttps) {
      // Setup helmet for security headers
      expressApp.use(helmet({
          contentSecurityPolicy: {
              directives: {
                  defaultSrc: ["'self'"],
                  connectSrc: ["'self'", `wss://${wsAddr}:${wsPort}`, `ws://${wsAddr}:${wsPort}`], // Allow both WS and WSS
                  scriptSrc: ["'self'"],
                  styleSrc: ["'self'"],
                  imgSrc: ["'self'", 'data:'],
              },
          },
          hsts: {
              maxAge: 31536000, // 1 year, only applied for HTTPS
              includeSubDomains: true,
              preload: true,
          },
      }));
    }

    // Set up rate limiter: max 100 requests per 15 minutes per IP for index.html
    const indexLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
    });

    expressApp.use(express.static(basePatch));

    // Serve index_browser.html for browser access
    expressApp.get('/', indexLimiter, (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    // API endpoint to provide WebSocket configuration
    expressApp.get('/api/ws-config', (req, res) => {
        const host = req.headers.host.split(':')[0];
        const protocol = req.headers['x-forwarded-proto'] || (useHttps ? 'https' : 'http');
        const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
        res.json({
            wsAddress: `${wsProtocol}://${host}:${wsPort}`,
            wsPort: wsPort,
        });        
    });

    // Start HTTPS or HTTP server
    if (useHttps) {
        try {
            const options = {
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath),
            };
            server = https.createServer(options, expressApp).listen(wsPort, wsAddr, () => {
                console.log(CAT, `HTTPS server running at https://${wsAddr}:${wsPort}`);
            });
        } catch (error) {
            console.error(CAT, 'Failed to start HTTPS server:', error);
            throw error;
        }
    } else {
        server = http.createServer(expressApp).listen(wsPort, wsAddr, () => {
            console.log(CAT, `HTTP server running at http://${wsAddr}:${wsPort}`);
        });
    }

    // Set up WebSocket server
    wss = createWebSocketServer(server, useHttps);
}

function closeWebSocketServer() {
    if (wss) {
        wss.close(() => {
            console.log(CAT, 'WebSocket server closed');
        });
        clients.clear();
    }

    if (server) {
        server.close(() => {
            console.log(CAT, 'Server closed');
        });
    }
}

function createWebSocketServer(server, useHttps) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        console.log(CAT, `WebSocket${useHttps ? ' Secure' : ''} client connected`);
        const tempId = crypto.randomUUID();
        clients.set(tempId, { ws, uuid: null });

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                const { id, type } = data;

                // Sanitize input
                if (typeof data !== 'object' || data === null) {
                    ws.send(JSON.stringify({ type: 'APIError', id, error: 'Invalid message format' }));
                    return;
                }

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
                        if (!method || typeof method !== 'string') {
                            ws.send(JSON.stringify({ type: 'APIError', id, error: 'Method not specified or invalid' }));
                            console.warn(CAT, 'Received API message with invalid method');
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
            console.log(CAT, `WebSocket${useHttps ? ' Secure' : ''} client disconnected`);
            for (let [key, client] of clients) {
                if (client.ws === ws) {
                    clients.delete(key);
                    console.log(CAT, `Removed client with UUID: ${client.uuid || tempId}`);
                    break;
                }
            }
        });

        ws.on('error', (error) => {
            console.error(CAT, `WebSocket${useHttps ? ' Secure' : ''} error:`, error);
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

// API method handler (unchanged)
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
        result = await handler(params);
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
    broadcastMessage,
};

exports.sendToClient = sendToClient;