// src/frontend/typescript/ws.ts

let socket: WebSocket | null = null;
const RECONNECT_INTERVAL = 5000; // Tentar reconectar a cada 5 segundos
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5; // Número máximo de tentativas de reconexão

function getWebSocketUrl(token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    const hostname = window.location.hostname;
   
    //const port = window.location.port ? `:${window.location.port}` : '';
    
    // O caminho para o endpoint WebSocket da API, que é proxy pelo Nginx para o backend
    const apiPath = '/api/users/ws';

    // Constrói a URL completa
    return `${protocol}//${hostname}${apiPath}?token=${token}`;
}

// Função interna para lidar com a lógica de reconexão
function setupReconnect(token: string) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.warn(`Attempting to reconnect... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => connectWebSocket(token), RECONNECT_INTERVAL);
    } else {
        console.error('Max reconnect attempts reached. Please refresh the page or log in again.');
        // Opcional: Aqui você pode adicionar lógica para deslogar o usuário ou mostrar um aviso persistente.
    }
}

export async function connectWebSocket(token: string): Promise<void> {
    if (!token) {
        console.error('Authentication token not provided. Cannot establish WebSocket connection.');
        return;
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        console.log('WebSocket is already connected or connecting. Skipping new connection.');
        return;
    }

    // Se houver um socket existente que não esteja completamente fechado, feche-o para evitar estados inconsistentes.
    if (socket && socket.readyState !== WebSocket.CLOSED) {
        console.warn('Existing WebSocket connection in a non-closed state. Closing before establishing a new one.');
        socket.close(); 
        // Pequena pausa para garantir o fechamento antes de abrir um novo, se necessário.
        await new Promise(resolve => setTimeout(100)); 
    }

    try {
        const wsUrl = getWebSocketUrl(token);
        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        
        socket = new WebSocket(wsUrl);
        reconnectAttempts = 0; // Resetar tentativas ao iniciar uma nova conexão

        socket.onopen = () => {
            console.log('Successfully connected to WebSocket.');
            reconnectAttempts = 0; // Resetar tentativas de reconexão ao conectar com sucesso
            // Exemplo: Envia uma mensagem de teste ao conectar
            if (socket) {
                socket.send(JSON.stringify({ type: 'client_status', message: 'Hello from client' }));
            }
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data as string);
                console.log('Message from server:', message);
                // Aqui você processa as mensagens recebidas do servidor.
                // Ex: dispatch(updateGameState(message));
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e, 'Raw data:', event.data);
            }
        };

        socket.onclose = (event) => {
            console.log(`Disconnected from WebSocket. Code: ${event.code}, Reason: ${event.reason || 'No reason specified'}`);
            socket = null;
            if (event.code === 1008) {
                console.error('WebSocket: Authentication failed or token expired. Please log in again.');
            } else if (event.code !== 1000) { // Tenta reconectar se não for um fechamento normal
                setupReconnect(token);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error occurred:', error);
            // O evento 'onerror' é seguido por 'onclose', então a lógica de reconexão
            // será tratada no 'onclose'. Apenas logamos o erro aqui.
            if (socket) {
                // Força o fechamento para que 'onclose' seja invocado e a lógica de reconexão ativada
                socket.close(); 
            }
        };
    } catch (e) {
        console.error('Error creating WebSocket connection object:', e);
        // Se a criação do objeto WebSocket falhar, tente reconectar.
        setupReconnect(token);
    }
}

export function disconnectWebSocket(): void {
    if (socket) {
        console.log('Client initiated WebSocket disconnection.');
        reconnectAttempts = 0; // Resetar tentativas de reconexão
        socket.close(1000, 'Client initiated disconnect'); // 1000 é Normal Closure
        socket = null; // Limpa a referência
    } else {
        console.log('WebSocket is not open or already closed. No disconnection needed.');
    }
}