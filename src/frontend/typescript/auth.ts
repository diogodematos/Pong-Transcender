// auth.ts

import { UserCredentials, RegisterData } from './types.js';
import { clearInputs } from './pages.js';
import { router } from './router.js';
import { connectWebSocket, disconnectWebSocket } from './ws.js';

/**
 * Attempts to log in with the provided credentials.
 * @param credentials Object with username and password.
 * @returns true if login is successful, false otherwise.
 */
export async function login(credentials: UserCredentials ): Promise<boolean> {
  try {
  const res = await fetch('/api/users/login', { // FIXED: URL with /api/users prefix
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(credentials),
     });

    const data = await res.json();

    if (res.ok) {
  localStorage.setItem('authToken', data.token,); // Stores the authentication token
  localStorage.setItem('userName', data.dbUser.username) // Stores the username
  clearInputs('username', 'password');
  connectWebSocket(data.token); // Initializes the WebSocket connection with the token
  router.navigate('/dashboard'); // Redirects to the dashboard
       return true;
     } else {
       console.error('Login failed:', data.error);
  displayError('loginResponseMessage', data.error || 'Invalid credentials.'); // Displays error in the UI
       return false;
     }
  } catch (error) {
     console.error('Login request error:', error);
  displayError('loginResponseMessage', 'Error connecting to server.'); // Displays network/server error
     return false;
  }
}

export async function setup2FA() {
  const token = localStorage.getItem('authToken');
  const res = await fetch('/api/users/twofa/setup', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { qrCode } = await res.json();

  const modal = document.getElementById('twofaModal');
  if (modal) {
    const qrImg = modal.querySelector('img');
    if (qrImg) {
      qrImg.src = qrCode;
  qrImg.alt = "QR Code for 2FA";
    }
    modal.classList.remove('hidden');
    document.getElementById('enable2faButton')!.classList.add('hidden');
    document.getElementById('disableTwofaBtn')!.classList.remove('hidden');
  }
}

document.getElementById('disableTwofaBtn')?.addEventListener('click', async () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Login required to disable 2FA.');
    return;
  }
  const res = await fetch('/api/users/twofa/disable', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  const messageDiv = document.getElementById('disableTwofaMessage');
  if (res.ok) {
    if (messageDiv) {
  messageDiv.textContent = '2FA successfully disabled.';
      messageDiv.style.color = 'green';
      document.getElementById('disableTwofaBtn')!.classList.add('hidden');
      document.getElementById('enable2faButton')!.classList.remove('hidden');
    }
  } else {
    if (messageDiv) {
  messageDiv.textContent = data.error || 'Error disabling 2FA.';
      messageDiv.style.color = 'red';
    }
  }
});

function updateTwofaButtons(twofaEnabled: boolean) {
  if (twofaEnabled) {
    document.getElementById('enable2faButton')!.classList.add('hidden');
    document.getElementById('disableTwofaBtn')!.classList.remove('hidden');
  } else {
    document.getElementById('enable2faButton')!.classList.remove('hidden');
    document.getElementById('disableTwofaBtn')!.classList.add('hidden');
  }
}

export async function fetchTwofaStatus() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      updateTwofaButtons(false);
      return;
    }
  
    const res = await fetch('/api/users/twofa/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  
    if (res.ok) {
      const data = await res.json();
      updateTwofaButtons(data.twofa_enabled);
    } else {
      updateTwofaButtons(false);
    }
  }
  
  // Update buttons when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    fetchTwofaStatus();
  });


// document.addEventListener('DOMContentLoaded', () => {
//   fetchTwofaStatus();
// });


/**
 * Attempts to register a new user.
 * @param data Object with registration data (username, password, email, avatar).
 * @returns true if registration is successful, false otherwise.
 */
export async function register(data: RegisterData): Promise<boolean> {
  const formData = new FormData();
  formData.append('username', data.username);
  formData.append('password', data.password);
  formData.append('email', data.email);
  if (data.avatar) formData.append('avatar', data.avatar);

  try {
  const res = await fetch('/api/users/register', { // FIXED: URL with /api/users prefix
       method: 'POST',
       body: formData,
     });

    const result = await res.json();

    if (res.ok) {
       console.log('Registration successful:', result.message);
       // Show the success modal and clear the fields
       document.getElementById('registerSuccessModal')?.classList.remove('hidden');
       // Adjust the registration input IDs to match your HTML
       clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
       const errorElement = document.getElementById('registerResponseMessage');
       if (errorElement) {
         errorElement.textContent = '';
         errorElement.classList.add('hidden');
       }
       return true;
     } else {
       console.error('Registration failed:', result.error);
      displayError('registerResponseMessage', result.error || 'Registration error.'); // Displays error in the UI
       return false;
     }
  } catch (error) {
     console.error('Registration request error:', error);
    displayError('registerResponseMessage', 'Error connecting to server.'); // Displays network/server error
     return false;
  }
}

/**
 * Logs out the current user, disconnecting the WebSocket and clearing the token.
 */
export function logout(): void {
  disconnectWebSocket(); // Disconnects the WebSocket
  localStorage.removeItem('authToken'); // Removes the authentication token
  localStorage.removeItem('userName'); // Removes the username
  localStorage.removeItem('google'); // Removes Google login status
  const errorElement = document.getElementById('loginResponseMessage');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
  }
  window.location.reload(); // Reloads the page to clear state
  // router.navigate('/login'); // Redirects to the login page
}

/**
 * Checks if the user is currently authenticated.
 * @returns true if an authentication token is present, false otherwise.
 */
export function isAuthenticated(): boolean {
  return localStorage.getItem('authToken') !== null;
}

export function getLoggedUsername(): string {
  return localStorage.getItem('userName') || 'Player';
}

/**
 * Utility function to display error messages in a specific HTML element.
 * @param id The ID of the HTML element where the error message will be displayed.
 * @param message The error message to display.
 */
export function displayError(id: string, message: string) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
  }
}