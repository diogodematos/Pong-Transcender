import { UserCredentials, RegisterData } from './types.js';
import { clearInputs } from './pages.js';
import { router } from './router.js';
import { connectWebSocket, disconnectWebSocket } from './ws.js';
import { getTranslation } from './translations.js';

export async function login(credentials: UserCredentials): Promise<boolean> {
  try {
    const res = await fetch('/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('authToken', data.token);
      clearInputs('username', 'password');
      connectWebSocket(data.token);
      router.navigate('/dashboard');
      return true;
    } else {
      displayError('loginResponseMessage', data.error);
      return false;
    }
  } catch {
    displayError('loginResponseMessage', getTranslation('login_error_server'));
    return false;
  }
}

export async function register(data: RegisterData): Promise<boolean> {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  formData.append('email', data.email);
  if (data.avatar) formData.append('avatar', data.avatar);

  try {
    const res = await fetch('/users/register', {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();

    if (res.ok) {
      document.getElementById('registerSuccessModal')!.classList.remove('hidden');
      clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
      return true;
    } else {
      displayError('registerResponseMessage', `Erro: ${json.error}`);
      return false;
    }
  } catch {
    displayError('registerResponseMessage', getTranslation('login_error_server'));
    return false;
  }
}

export function logout(): void {
  disconnectWebSocket();
  localStorage.removeItem('authToken');
  router.navigate('/login');
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('authToken') !== null;
}

function displayError(id: string, message: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}