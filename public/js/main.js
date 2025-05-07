import { login, register } from './auth.js';
import { getProfile, updateProfile } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage } from './pages.js';
// Adiciona ouvintes de eventos
window.onload = () => {
    var _a, _b, _c, _d, _e, _f, _g;
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
    (_c = document.getElementById('GoToLoginPage')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        showLoginPage();
        clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
    });
    (_d = document.getElementById('registerForm')) === null || _d === void 0 ? void 0 : _d.addEventListener('submit', (e) => {
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
    (_e = document.getElementById('logoutButton')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        showLoginPage();
    });
    (_f = document.getElementById('editProfileButton')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', showEditProfilePage);
    (_g = document.getElementById('saveProfileChangesButton')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', () => {
        updateProfile({
            username: document.getElementById('newUsername').value,
            newPassword: document.getElementById('newPassword').value,
            email: document.getElementById('newEmail').value,
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
