// auth.ts

import { UserCredentials, RegisterData } from './types.js';
import { clearInputs } from './pages.js';
import { router } from './router.js';
import { connectWebSocket, disconnectWebSocket } from './ws.js';

/**
 * Tenta fazer login com as credenciais fornecidas.
 * @param credentials Objeto com username e password.
 * @returns true se o login for bem-sucedido, false caso contrário.
 */
export async function login(credentials: UserCredentials): Promise<boolean> {
  try {
    const res = await fetch('/api/users/login', { // CORRIGIDO: URL com prefixo /api/users
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(credentials),
     });

    const data = await res.json();

    if (res.ok) {
       localStorage.setItem('authToken', data.token,); // Armazena o token de autenticação
       localStorage.setItem('userName', data.dbUser.username) // Armazena o username
       clearInputs('username', 'password');
       connectWebSocket(data.token); // Inicializa a conexão WebSocket com o token
       router.navigate('/dashboard'); // Redireciona para o dashboard
       return true;
     } else {
       console.error('Login failed:', data.error);
       displayError('loginResponseMessage', data.error || 'Credenciais inválidas.'); // Exibe erro na UI
       return false;
     }
  } catch (error) {
     console.error('Login request error:', error);
     displayError('loginResponseMessage', 'Erro ao conectar com o servidor.'); // Exibe erro de rede/servidor
     return false;
  }
}

/**
 * Tenta registrar um novo utilizador.
 * @param data Objeto com dados de registro (username, password, email, avatar).
 * @returns true se o registro for bem-sucedido, false caso contrário.
 */
export async function register(data: RegisterData): Promise<boolean> {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  formData.append('email', data.email);
  if (data.avatar) formData.append('avatar', data.avatar);

  try {
    const res = await fetch('/api/users/register', { // CORRIGIDO: URL com prefixo /api/users
       method: 'POST',
       body: formData,
     });

    const result = await res.json();

    if (res.ok) {
       console.log('Registration successful:', result.message);
       // Exibe o modal de sucesso e limpa os campos
       document.getElementById('registerSuccessModal')?.classList.remove('hidden');
       // Ajuste os IDs dos inputs de registro para corresponderem ao seu HTML
       clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
       const errorElement = document.getElementById('registerResponseMessage');
       if (errorElement) {
         errorElement.textContent = '';
         errorElement.classList.add('hidden');
       }
       return true;
     } else {
       console.error('Registration failed:', result.error);
       displayError('registerResponseMessage', result.error || 'Erro no registro.'); // Exibe erro na UI
       return false;
     }
  } catch (error) {
     console.error('Registration request error:', error);
     displayError('registerResponseMessage', 'Erro ao conectar com o servidor.'); // Exibe erro de rede/servidor
     return false;
  }
}

/**
 * Faz logout do utilizador atual, desconectando o WebSocket e limpando o token.
 */
export function logout(): void {
  disconnectWebSocket(); // Desconecta o WebSocket
  localStorage.removeItem('authToken'); // Remove o token de autenticação
  const errorElement = document.getElementById('loginResponseMessage');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
  }
  router.navigate('/login'); // Redireciona para a página de login
}

/**
 * Verifica se o utilizador está atualmente autenticado.
 * @returns true se um token de autenticação estiver presente, false caso contrário.
 */
export function isAuthenticated(): boolean {
  return localStorage.getItem('authToken') !== null;
}

export function getLoggedUsername(): string {
  return localStorage.getItem('userName') || 'Jogador';
}

/**
 * Função utilitária para exibir mensagens de erro em um elemento HTML específico.
 * @param id O ID do elemento HTML onde a mensagem de erro será exibida.
 * @param message A mensagem de erro a ser exibida.
 */
function displayError(id: string, message: string) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}