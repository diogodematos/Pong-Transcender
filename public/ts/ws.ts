let socket: WebSocket | null = null;

export async function connectWebSocket(token: string): Promise<void> {

    if (!token) {
        console.error('Token de autenticação não fornecido.');
        return;
    }

    
    //const userId = 'user123'; // Usa o ID do utilizador autenticado

    const socket = new WebSocket(`ws://localhost:3000/users/ws?token=${token}`);

    socket.onopen = () => {
    console.log('Connected to WebSocket');
    // Enviar mensagens se quiseres
    socket.send('Hello from client');
    };

    socket.onmessage = (event) => {
    console.log('Message from server:', event.data);
    };

    socket.onclose = () => {
    console.log('Disconnected from WebSocket');
    };

    socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    };
}

export async function disconnectWebSocket(): Promise<void> {
    // Aqui podes implementar a lógica para fechar a conexão WebSocket
    // Exemplo:
    if (socket) {
        socket.close();
        console.log('WebSocket connection closed');
    } else {
        console.log('WebSocket is not open or already closed');
    }
}
