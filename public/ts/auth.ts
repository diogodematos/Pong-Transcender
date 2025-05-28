import { UserCredentials, RegisterData } from './types.js';
import { showProfilePage, showLoginPage, clearInputs } from './pages.js';

export async function login(credentials: UserCredentials): Promise<void> {
  try {
    const res = await fetch('/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('authToken', data.token);
      showProfilePage();
      clearInputs('username', 'password');
    } else {
      displayError('loginResponseMessage', data.error);
    }
  } catch {
    displayError('loginResponseMessage', 'Erro ao conectar com o servidor.');
  }
}

export async function register(data: RegisterData): Promise<void> {
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
      clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'RegisterAvatar');
    } else {
      displayError('registerResponseMessage', `Erro: ${json.error}`);
    }
  } catch {
    displayError('registerResponseMessage', 'Erro ao conectar com o servidor.');
  }
}

function displayError(id: string, message: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}
