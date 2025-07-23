import { from_main_updateGallery, from_main_updatePreview, from_main_customOverlayProgress } from '../../scripts/renderer/generate_backend.js';

function setHTMLTitle(title) {
    document.title = title;
}

let version;
let ws;
let messageId = 0; // Unique ID for tracking messages
const callbacks = new Map(); // Registry for message type callbacks
let clientUUID = null; // Store client's UUID
let reconnectingTrigger = false;
let securedConnection = false;

// Store the instance of message by id
const pendingMessages = new Map();

export function isSecuredConnection(){
    return securedConnection;
}

export async function initWebSocket() {
    try {
        const { wsAddress, wsPort } = await fetchWsConfig();
        await connectWebSocket(wsAddress, wsPort);
        setupBeforeUnloadListener();
        version = await sendWebSocketMessage({ type: 'API', method: 'getAppVersion' });
        setHTMLTitle(`SAA Client ${version} (Connected)`);
        // Warn if using HTTP/WS in a production-like environment
        if (wsAddress.startsWith('ws://') && window.location.hostname !== 'localhost') {
            console.warn('Using non-secure WebSocket (ws://) on a non-localhost server. Consider enabling HTTPS for security.');
        } else {
            securedConnection = true;
        }
        return true;
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }

    return false;
}

// Function to fetch WebSocket configuration
async function fetchWsConfig() {
    try {
        const response = await fetch('/api/ws-config', {
            credentials: 'same-origin',
        });
        const data = await response.json();
        return {
            wsAddress: data.wsAddress,
            wsPort: data.wsPort,
        };
    } catch (error) {
        console.error('Failed to fetch WebSocket config:', error);
        // Fallback to current protocol and host
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return {
            wsAddress: `${protocol}://${window.location.host || 'localhost'}`,
            wsPort: window.location.port || 51028,
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
            if (ws.readyState === WebSocket.OPEN) {
                console.log(`Connected to WebSocket${wsAddress.startsWith('wss://') ? ' Secure' : ''} server`, wsAddress, `Port: ${wsPort}`);
                console.log('Requesting UUID registration');
                ws.send(JSON.stringify({ type: 'registerUUID', id: messageId++ }));
                reconnectingTrigger = false;
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'registerUUIDResponse') {
                    console.log(`UUID registration response: ${data.value}`);
                    clientUUID = data.value;
                    resolve();
                } else {
                    console.error(`Unexpected message at init stage type: ${data.type}`);
                    reject(new Error(`Unexpected message at init stage type: ${data.type}`));
                }
            } catch (error) {
                console.error('Error parsing message:', error);
                reject(new Error(`Error parsing message: ${error}`));
            }
        };

        ws.onclose = () => {
            const SETTINGS = window.globalSettings;
            const FILES = window.cachedFiles;
            const LANG = FILES.language[SETTINGS.language];
            console.warn('Disconnected from SAA');
            window.overlay.custom.createErrorOverlay(LANG.saac_disconnected , 'Disconnected from SAA');

            pendingMessages.forEach(({ reject }, id) => {
                reject(new Error('WebSocket connection closed'));
                pendingMessages.delete(id);
            });
            callbacks.clear();
            console.log('Cleared all pending messages and callbacks');
            ws = null;
            setHTMLTitle('SAA Client (Disconnected)');
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            const errorMessage = wsAddress.startsWith('wss://') && (err.message?.includes('SSL') || err.message?.includes('certificate'))
                ? 'WebSocket connection failed due to SSL certificate issue. Please ensure the server certificate is valid or accept it in your browser.'
                : 'WebSocket connection error. Please check the server status.';
            reconnectingTrigger = false;
            reject(new Error(errorMessage));
        };
    });
}

// Function to check if WebSocket is open
function isWebSocketOpen(ws) {
    return ws?.readyState === WebSocket.OPEN;
}

// Function to send a message with reconnection handling
export async function sendWebSocketMessage(message) {
    const id = messageId++;
    const messageWithId = { ...message, id };

    if (!isWebSocketOpen(ws)) {
        if (reconnectingTrigger) {
            throw new Error('Reconnection in progress');
        }

        console.log('WebSocket is not open, attempting to reconnect...');
        try {
            reconnectingTrigger = true;
            const { wsAddress, wsPort } = await fetchWsConfig();
            await connectWebSocket(wsAddress, wsPort);
            window.clientUUID = getClientUUID();
            registerCallback('updatePreview', from_main_updatePreview);
            registerCallback('appendImage', from_main_updateGallery);
            registerCallback('updateProgress', from_main_customOverlayProgress);
            version = await sendWebSocketMessage({ type: 'API', method: 'getAppVersion' });
            setHTMLTitle(`SAA Client ${version} (Connected)`);
        } catch (error) {
            console.error('Failed to reconnect:', error);
            throw error;
        }
    }

    if (!isWebSocketOpen(ws)) {
        console.error('Failed to send message: WebSocket still not open');
        throw new Error('WebSocket not open after reconnection attempt');
    }

    const messageHandler = (event) => {
        try {
            const data = JSON.parse(event.data);
            const { type, id, method, value, error } = data;

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
            pendingMessages.get(id)?.reject(new Error(`Error parsing message: ${error}`));
        }
    };

    ws.onmessage = messageHandler;

    return new Promise((resolve, reject) => {
        pendingMessages.set(id, { resolve, reject });

        try {
            ws.send(JSON.stringify(messageWithId));
        } catch (error) {
            console.error('Failed to send message:', error);
            ws.onmessage = null;
            pendingMessages.delete(id);
            reject(new Error(`Failed to send message: ${error}`));
        }
    });
}