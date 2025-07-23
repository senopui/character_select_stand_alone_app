import { from_main_updateGallery, from_main_updatePreview, from_main_customOverlayProgress } from '../../scripts/renderer/generate_backend.js';
import { customCommonOverlay } from '../../scripts/renderer/customOverlay.js';

function setHTMLTitle(title) {
    document.title = title;
}

let version;
let ws;
let messageId = 0; // Unique ID for tracking messages
const callbacks = new Map(); // Registry for message type callbacks
let clientUUID = null; // Store client's UUID
let reconnectingTrigger = false;

// Stroge the instance of message by id
const pendingMessages = new Map();

export async function initWebSocket() {
    try {
        const { wsAddress, wsPort } = await fetchWsConfig();
        await connectWebSocket(wsAddress, wsPort);
        setupBeforeUnloadListener();
        version = await sendWebSocketMessage({ type: 'API', method: 'getAppVersion'});
        setHTMLTitle(`SAA Client ${version} (Connected)`);
        return true;
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }

    return false;
}

// Function to fetch WebSocket configuration
async function fetchWsConfig() {
    try {
        const response = await fetch('/api/ws-config');
        const data = await response.json();
        return {
            wsAddress: data.wsAddress,
            wsPort: data.wsPort
        };
    } catch (error) {
        console.error('Failed to fetch WebSocket config:', error);
        return {
            wsAddress: 'ws://localhost', // Fallback address
            wsPort: 51028 // Fallback port
        };
    }
}

// Function to register a callback for a specific message type
export function registerCallback(messageType, callback) {
    const callbackName = `${getClientUUID()}-${messageType}`;
    callbacks.set(callbackName, callback);
    console.log(`Registered callback for message type: ${callbackName}`);
}

// Function to unregister a callback for a specific message type
export function unregisterCallback(messageType) {
    const callbackName = `${getClientUUID()}-${messageType}`;
    callbacks.delete(callbackName);
    console.log(`Unregistered callback for message type: ${callbackName}`);
}

// Function to unregister all callbacks
export function unregisterAllCallbacks() {
    if (clientUUID) {
        for (const callbackName of callbacks.keys()) {
            if (callbackName.startsWith(`${clientUUID}-`)) {
                callbacks.delete(callbackName);
                console.log(`Unregistered callback: ${callbackName}`);
            }
        }
    }
    console.log('All callbacks unregistered');
}

// Function to set up beforeunload event listener
function setupBeforeUnloadListener() {
    window.addEventListener('beforeunload', () => {
        unregisterAllCallbacks();
        if (ws && isWebSocketOpen(ws)) {
            ws.close();
            console.log('WebSocket connection closed on page unload');
        }
    });
}

// Function to get the client's UUID
export function getClientUUID() {
    return clientUUID;
}

async function connectWebSocket(wsAddress, wsPort) {
    return new Promise((resolve, reject) => {
        if (ws && ws.readyState !== WebSocket.CLOSED) {
            ws.close();
        }

        ws = new WebSocket(wsAddress);

        ws.onopen = () => {
            if(ws.readyState === WebSocket.OPEN) {
                console.log('Connected to WebSocket server', wsAddress, `Port: ${wsPort}`);
                // Request Register UUID with the server
                console.log('Requesting UUID registration');
                ws.send(JSON.stringify({ type: 'registerUUID', id: messageId++}));
                reconnectingTrigger = false;                
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Register the client UUID on the first message
                // then override the onmessage handler in sendWebSocketMessage
                if (data.type === 'registerUUIDResponse') {
                    console.log(`UUID registration response: ${data.value}`);
                    clientUUID = data.value; // Store the client's UUID
                    resolve();
                } else {
                    console.error(`Unexpected message at init stage type: ${data.type}`);
                    reject(new Error(`Unexpected message at init stage type: ${data.type}`));
                }
            } catch (error) {
                console.error('Error parsing message:', error);
                reject(new Error('Error parsing message:', error));
            }
        };

        ws.onclose = () => {
            const SETTINGS = window.globalSettings;
            const FILES = window.cachedFiles;
            const LANG = FILES.language[SETTINGS.language];
            console.warn('Disconnected from SAA');
            customCommonOverlay().createErrorOverlay(LANG.saac_disconnected, 'Disconnected from SAA');

            // cleanup pendingMessages
            pendingMessages.forEach(({ reject }, id) => {
                reject(new Error('WebSocket connection closed'));
                pendingMessages.delete(id);
            });
            // cleanup callbacks
            callbacks.clear();
            console.log('Cleared all pending messages and callbacks');
            ws = null;
            setHTMLTitle("SAA Client (Disconnected)");
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);            
            reconnectingTrigger = false;
        };
    });
}

// Function to check if WebSocket is open
function isWebSocketOpen(ws) {
    return ws?.readyState === WebSocket.OPEN;
}

// Function to send a message with reconnection handling
export async function sendWebSocketMessage(message) {
    // Assign a unique message ID
    const id = messageId++;
    const messageWithId = { ...message, id };

    if (!isWebSocketOpen(ws)) {
        if(reconnectingTrigger)
            return;

        console.log('WebSocket is not open, attempting to reconnect...');
        try {
            reconnectingTrigger = true;
            const { wsAddress, wsPort } = await fetchWsConfig();
            await connectWebSocket(wsAddress, wsPort);
            // Update uuid and register callbacks
            window.clientUUID = getClientUUID();    // Get the ws client UUID
            registerCallback('updatePreview', from_main_updatePreview);
            registerCallback('appendImage', from_main_updateGallery);
            registerCallback('updateProgress', from_main_customOverlayProgress);            

            version = await sendWebSocketMessage({ type: 'API', method: 'getAppVersion'});
            setHTMLTitle(`SAA Client ${version} (Connected)`);
        } catch (error) {
            console.error('Failed to reconnect:', error);
            return;
        }
    }

    // Verify WebSocket is open after reconnection
    if (!isWebSocketOpen(ws)) {
        console.error('Failed to send message: WebSocket still not open');
        return;
    }

    // Set up a one-time message listener
    const messageHandler = (event) => {
        try {
            const data = JSON.parse(event.data);
            const { type, id, method, value, error } = data;

            // Handle existing request-response messages
            if (type === 'APIResponse' || type === 'APIError') {
                const promiseCallback = pendingMessages.get(id);
                if (promiseCallback) {
                    if (type === 'APIResponse') {
                        promiseCallback.resolve(value);
                    } else {
                        console.error('API Error for method:', method, 'error:', error);
                        promiseCallback.reject(new Error(`API Error for method ${method}: ${error}`));
                    }
                    pendingMessages.delete(id);
                } else {
                    console.warn(`No callback found for message ID: ${id}`);
                }
            } else if (type === 'Callback') {
                const { callbackName, args } = value;
                const callback = callbacks.get(callbackName);
                if (typeof callback === 'function') {
                    callback(...args);
                } else {
                    console.warn(`No valid callback registered for ${callbackName}`);
                }
            } else {
                console.warn(`Unexpected message type: ${type}`);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
            reject(new Error('Error parsing message:', error));
        }
    };

    // Attach the listener
    ws.onmessage = messageHandler;

    // Create a Promise to handle the response
    return new Promise((resolve, reject) => {
        // Function to attempt sending the message
        pendingMessages.set(id, { resolve, reject });

        // Send the message
        try {
            ws.send(JSON.stringify(messageWithId));
        } catch (error) {
            console.error('Failed to send message:', error);
            ws.onmessage = null; // Clean up listener
            reject(new Error(error));
        }
    });
}