import { login, register } from './auth.js';
import { updateProfile } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage } from './pages.js';
// Adiciona ouvintes de eventos
window.onload = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    checkAuth();
    //initGoogleSignIn();
    (_a = document.getElementById('loginForm')) === null || _a === void 0 ? void 0 : _a.addEventListener('submit', (e) => {
        e.preventDefault();
        login({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        });
    });
    (_b = document.getElementById('GoToRegisterPage')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        showRegisterPage();
        clearInputs('username', 'password');
    });
    (_c = document.getElementById('goToLoginButton')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        var _a;
        showLoginPage();
        (_a = document.getElementById('registerSuccessModal')) === null || _a === void 0 ? void 0 : _a.classList.add('hidden'); // Oculta o modal
    });
    (_d = document.getElementById('GoToLoginPage')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        showLoginPage();
        clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
    });
    (_e = document.getElementById('registerForm')) === null || _e === void 0 ? void 0 : _e.addEventListener('submit', (e) => {
        var _a;
        e.preventDefault();
        const fileInput = document.getElementById('registerAvatar');
        register({
            username: document.getElementById('registerUsername').value,
            password: document.getElementById('registerPassword').value,
            email: document.getElementById('registerEmail').value,
            avatar: (_a = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _a === void 0 ? void 0 : _a[0],
        });
    });
    (_f = document.getElementById('logoutButton')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        showLoginPage();
    });
    (_g = document.getElementById('editProfileButton')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', showEditProfilePage);
    (_h = document.getElementById('saveProfileChangesButton')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', () => {
        updateProfile({
            username: document.getElementById('newUsername').value,
            newPassword: document.getElementById('newPassword').value,
            email: document.getElementById('newEmail').value,
        });
        console.log('Salvando alterações de perfil...');
        console.log('Novo nome de usuário:', document.getElementById('newUsername').value);
    });
    (_j = document.getElementById('cancelProfileChangesButton')) === null || _j === void 0 ? void 0 : _j.addEventListener('click', () => {
        showProfilePage();
    });
};
function checkAuth() {
    const token = localStorage.getItem('authToken');
    token ? showProfilePage() : showLoginPage();
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
