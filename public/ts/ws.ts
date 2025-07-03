let socket: WebSocket | null = null;

export async function connectWebSocket(token: string): Promise<void> {
  if (!token) {
    console.error('Token de autenticação não fornecido.');
    return;
  }

  // Remove o "const" para usar a variável global
  socket = new WebSocket(`ws://localhost:3000/users/ws?token=${token}`);

  socket.onopen = () => {
    console.log('Connected to WebSocket');
    if (socket) {
      // Envia uma mensagem de teste ao conectar
      socket.send('Hello from client');
    }
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
  if (socket) {
    socket.close();
    console.log('WebSocket connection closed');
    socket = null; // Limpa a referência
  } else {
    console.log('WebSocket is not open or already closed');
  }
}

