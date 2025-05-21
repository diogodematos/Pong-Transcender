import { login, register } from './auth.js';
import { updateProfile } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage } from './pages.js';
// Adiciona ouvintes de eventos
window.onload = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
    (_c = document.getElementById('registerAvatar')) === null || _c === void 0 ? void 0 : _c.addEventListener('change', function (event) {
        const target = event.target;
        const file = target.files ? target.files[0] : null;
        const preview = document.getElementById('avatarImage');
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                var _a;
                preview.src = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
            };
            reader.readAsDataURL(file);
        }
        else {
            preview.src = '/img/default-avatar.jpg';
        }
    });
    (_d = document.getElementById('goToLoginButton')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        var _a;
        showLoginPage();
        (_a = document.getElementById('registerSuccessModal')) === null || _a === void 0 ? void 0 : _a.classList.add('hidden'); // Oculta o modal
    });
    (_e = document.getElementById('GoToLoginPage')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        showLoginPage();
        clearInputs('registerUsername', 'registerPassword', 'registerEmail');
    });
    (_f = document.getElementById('registerForm')) === null || _f === void 0 ? void 0 : _f.addEventListener('submit', (e) => {
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
    (_g = document.getElementById('logoutButton')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        showLoginPage();
    });
    (_h = document.getElementById('editProfileButton')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', showEditProfilePage);
    (_j = document.getElementById('saveProfileChangesButton')) === null || _j === void 0 ? void 0 : _j.addEventListener('click', () => {
        updateProfile({
            newUsername: document.getElementById('newUsername').value,
            newPassword: document.getElementById('newPassword').value,
            newEmail: document.getElementById('newEmail').value,
        });
    });
    (_k = document.getElementById('cancelProfileChangesButton')) === null || _k === void 0 ? void 0 : _k.addEventListener('click', () => {
        showProfilePage();
        clearInputs('newUsername', 'newPassword', 'newEmail');
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
