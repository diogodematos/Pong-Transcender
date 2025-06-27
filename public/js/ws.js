var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
let socket = null;
export function connectWebSocket(token) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
export function disconnectWebSocket() {
    return __awaiter(this, void 0, void 0, function* () {
        // Aqui podes implementar a lógica para fechar a conexão WebSocket
        // Exemplo:
        if (socket) {
            socket.close();
            console.log('WebSocket connection closed');
        }
        else {
            console.log('WebSocket is not open or already closed');
        }
    });
}
