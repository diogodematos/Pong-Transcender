var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { login, register, logout, isAuthenticated } from './auth.js';
import { updateProfile, searchUsers } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage } from './pages.js';
import { router } from './router.js';
import { connectWebSocket } from './ws.js';
// Setup routes
function setupRoutes() {
    // Default route - check authentication
    router.addRoute('/', () => {
        checkAuthAndRedirect();
    });
    // Login page
    router.addRoute('/login', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        }
        else {
            showLoginPage();
        }
    });
    // Register page
    router.addRoute('/register', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        }
        else {
            showRegisterPage();
        }
    });
    // Dashboard page
    router.addRoute('/dashboard', () => {
        if (isAuthenticated()) {
            showDashboardPage();
        }
        else {
            router.navigate('/login');
        }
    });
    // Profile page (requires auth)
    router.addRoute('/profile', () => {
        if (isAuthenticated()) {
            showProfilePage();
        }
        else {
            router.navigate('/login');
        }
    });
    // Edit profile page (requires auth)
    router.addRoute('/edit-profile', () => {
        if (isAuthenticated()) {
            showEditProfilePage();
        }
        else {
            router.navigate('/login');
        }
    });
    // Game page (requires auth)
    router.addRoute('/game', () => {
        if (isAuthenticated()) {
            showGamePage();
        }
        else {
            router.navigate('/login');
        }
    });
}
function checkAuthAndRedirect() {
    if (isAuthenticated()) {
        router.navigate('/dashboard');
    }
    else {
        router.navigate('/login');
    }
}
// Event listeners
function setupEventListeners() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    // Login form
    (_a = document.getElementById('loginForm')) === null || _a === void 0 ? void 0 : _a.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const success = yield login({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        });
        // Login function now handles navigation via router
    }));
    // Register form
    (_b = document.getElementById('registerForm')) === null || _b === void 0 ? void 0 : _b.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        e.preventDefault();
        const fileInput = document.getElementById('registerAvatar');
        const success = yield register({
            username: document.getElementById('registerUsername').value,
            password: document.getElementById('registerPassword').value,
            email: document.getElementById('registerEmail').value,
            avatar: (_a = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _a === void 0 ? void 0 : _a[0],
        });
        // Register function handles success modal
    }));
    // Navigation buttons
    (_c = document.getElementById('GoToRegisterPage')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        router.navigate('/register');
    });
    (_d = document.getElementById('GoToLoginPage')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        router.navigate('/login');
    });
    (_e = document.getElementById('goToLoginButton')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        var _a;
        router.navigate('/login');
        (_a = document.getElementById('registerSuccessModal')) === null || _a === void 0 ? void 0 : _a.classList.add('hidden');
    });
    // Profile actions
    (_f = document.getElementById('goToDashboard')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        router.navigate('/dashboard');
    });
    (_g = document.getElementById('editProfileButton')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', () => {
        router.navigate('/edit-profile');
    });
    (_h = document.getElementById('playGameButton')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', () => {
        router.navigate('/game');
    });
    // Event listener para pesquisa de amigos
    (_j = document.getElementById('searchFriendsInput')) === null || _j === void 0 ? void 0 : _j.addEventListener('input', (e) => {
        const target = e.target;
        console.log("Pesquisa:", target.value);
        searchUsers(target.value);
    });
    // Event listener para o botão adicionar amigo (opcional)
    (_k = document.getElementById('addFriendButton')) === null || _k === void 0 ? void 0 : _k.addEventListener('click', () => {
        const searchInput = document.getElementById('searchFriendsInput');
        if (searchInput) {
            searchInput.focus();
            alert('Digite o nome do utilizador no campo de pesquisa acima.');
        }
    });
    // Navigation bar buttons (for authenticated users)
    (_l = document.querySelector('[data-route="/dashboard"]')) === null || _l === void 0 ? void 0 : _l.addEventListener('click', () => {
        router.navigate('/dashboard');
    });
    (_m = document.querySelector('[data-route="/game"]')) === null || _m === void 0 ? void 0 : _m.addEventListener('click', () => {
        router.navigate('/game');
    });
    (_o = document.querySelector('[data-route="/profile"]')) === null || _o === void 0 ? void 0 : _o.addEventListener('click', () => {
        router.navigate('/profile');
    });
    (_p = document.getElementById('navLogoutButton')) === null || _p === void 0 ? void 0 : _p.addEventListener('click', () => {
        logout();
    });
    // Edit profile actions
    (_q = document.getElementById('saveProfileChangesButton')) === null || _q === void 0 ? void 0 : _q.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const fileInput = document.getElementById('newAvatar');
        const success = yield updateProfile({
            newUsername: document.getElementById('newUsername').value,
            newPassword: document.getElementById('newPassword').value,
            newEmail: document.getElementById('newEmail').value,
            newAvatar: (_a = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _a === void 0 ? void 0 : _a[0],
        });
        // updateProfile function handles navigation on success
    }));
    (_r = document.getElementById('cancelProfileChangesButton')) === null || _r === void 0 ? void 0 : _r.addEventListener('click', () => {
        router.navigate('/profile');
        clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
    });
    // Game back button
    (_s = document.getElementById('backToProfileButton')) === null || _s === void 0 ? void 0 : _s.addEventListener('click', () => {
        router.navigate('/profile');
    });
    // Avatar preview handlers
    (_t = document.getElementById('registerAvatar')) === null || _t === void 0 ? void 0 : _t.addEventListener('change', handleAvatarPreview);
    (_u = document.getElementById('newAvatar')) === null || _u === void 0 ? void 0 : _u.addEventListener('change', handleAvatarPreviewUpdate);
}
function handleAvatarPreview(event) {
    const target = event.target;
    const file = target.files ? target.files[0] : null;
    const preview = document.getElementById('avatarImage');
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            var _a;
            if (preview && ((_a = e.target) === null || _a === void 0 ? void 0 : _a.result)) {
                preview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
    else if (preview) {
        preview.src = '/img/default-avatar.jpg';
    }
}
function handleAvatarPreviewUpdate(event) {
    const target = event.target;
    const file = target.files ? target.files[0] : null;
    const preview = document.getElementById('avatarImageUpdate');
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            var _a;
            if (preview && ((_a = e.target) === null || _a === void 0 ? void 0 : _a.result)) {
                preview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
    else if (preview) {
        preview.src = '';
    }
}
// Initialize application
window.onload = () => {
    setupRoutes();
    setupEventListeners();
    checkAuthAndRedirect();
    if (isAuthenticated()) {
        const token = localStorage.getItem('authToken');
        if (token) {
            connectWebSocket(token);
        }
    }
};
// Export router for external use if needed
export { router };
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
