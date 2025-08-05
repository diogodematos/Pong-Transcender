let socket: WebSocket | null = null;
const RECONNECT_INTERVAL = 5000;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function getWebSocketUrl(token: string, endpoint: string = '/api/users/ws'): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const params = new URLSearchParams({ token });
    return `${protocol}//${hostname}${endpoint}?${params.toString()}`;
}

function setupReconnect(token: string, endpoint: string) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.warn(`Attempting to reconnect... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => connectWebSocket(token, endpoint), RECONNECT_INTERVAL);
    } else {
        console.error('Max reconnect attempts reached. Please refresh the page or log in again.');
    }
}

export async function connectWebSocket(token: string, endpoint: string = '/api/users/ws'): Promise<void> {
    if (!token) {
        console.error('Authentication token not provided. Cannot establish WebSocket connection.');
        return;
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket is already connected or connecting. Skipping new connection.');
        return;
    }

    if (socket && socket.readyState !== WebSocket.CLOSED) {
        console.warn('Existing WebSocket connection in a non-closed state. Closing before establishing a new one.');
        socket.close();
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        const wsUrl = getWebSocketUrl(token, endpoint);
        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        
        socket = new WebSocket(wsUrl);
        reconnectAttempts = 0;

        socket.onopen = () => {
            console.log(`Successfully connected to WebSocket at ${endpoint}.`);
            reconnectAttempts = 0;
            if (socket) {
                socket.send(JSON.stringify({ type: 'client_status', message: 'Hello from client' }));
            }
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data as string);
                console.log(`Message from server (${endpoint}):`, message);
            } catch (e) {
                console.error(`Failed to parse WebSocket message from ${endpoint}:`, e, 'Raw data:', event.data);
            }
        };

        socket.onclose = (event) => {
            console.log(`Disconnected from WebSocket at ${endpoint}. Code: ${event.code}, Reason: ${event.reason || 'No reason specified'}`);
            socket = null;
            if (event.code === 1008) {
                console.error(`WebSocket at ${endpoint}: Authentication failed or token expired. Please log in again.`);
            } else if (event.code !== 1000) {
                setupReconnect(token, endpoint);
            }
        };

        socket.onerror = (error) => {
            console.error(`WebSocket error occurred at ${endpoint}:`, error);
            if (socket) {
                socket.close();
            }
        };
    } catch (e) {
        console.error(`Error creating WebSocket connection object for ${endpoint}:`, e);
        setupReconnect(token, endpoint);
    }
}

export function disconnectWebSocket(): void {
    if (socket) {
        console.log('Client initiated WebSocket disconnection.');
        reconnectAttempts = 0;
        socket.close(1000, 'Client initiated disconnect');
        socket = null;
    } else {
        console.log('WebSocket is not open or already closed. No disconnection needed.');
    }
}

export { socket };