import { login, register } from './auth.js';
import { getProfile, updateProfile } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage } from './pages.js';

// Adiciona ouvintes de eventos
window.onload = () => {
  checkAuth();
  //initGoogleSignIn();

  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    login({
      username: (document.getElementById('username') as HTMLInputElement).value,
      password: (document.getElementById('password') as HTMLInputElement).value
    });
  });

  document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
    showRegisterPage();
    clearInputs('username', 'password');
  });

  document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
    showLoginPage();
    clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
  });

  document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('registerAvatar') as HTMLInputElement;
    register({
      username: (document.getElementById('registerUsername') as HTMLInputElement).value,
      password: (document.getElementById('registerPassword') as HTMLInputElement).value,
      email: (document.getElementById('registerEmail') as HTMLInputElement).value,
      avatar: fileInput?.files?.[0],
    });
  });

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    showLoginPage();
  });

  document.getElementById('editProfileButton')?.addEventListener('click', showEditProfilePage);

  document.getElementById('saveProfileChangesButton')?.addEventListener('click', () => {
    updateProfile({
      username: (document.getElementById('newUsername') as HTMLInputElement).value,
      newPassword: (document.getElementById('newPassword') as HTMLInputElement).value,
      email: (document.getElementById('newEmail') as HTMLInputElement).value,
    });
  });
};

function checkAuth() {
  const token = localStorage.getItem('authToken');
  token ? getProfile() : showLoginPage();
}

// Google login
// function initGoogleSignIn() {
//   google.accounts.id.initialize({
//     client_id: "188335469204-dff0bjf48ubspckenk92t6730ade1o0i.apps.googleusercontent.com",
//     callback: handleGoogleLogin,
//   });

//   google.accounts.id.renderButton(
//     document.getElementById("googleSignInButton"),
//     { theme: "outline", size: "large" }
//   );
// }

// function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
//   fetch('/users/google-login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ idToken: response.credential }),
//   })
//     .then(res => res.json())
//     .then(data => {
//       if (data.token) {
//         localStorage.setItem('authToken', data.token);
//         getProfile();
//       } else {
//         alert('Erro com login do Google');
//       }
//     })
//     .catch(() => alert('Erro ao autenticar com Google.'));
// }
