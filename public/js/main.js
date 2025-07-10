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
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage, showProfilePageByID } from './pages.js';
import { router } from './router.js';
import { connectWebSocket } from './ws.js';
import { initializeLanguage, setLanguage, getTranslation } from './translations.js';
// Make router globally accessible
window.router = router;
// Setup routes
function setupRoutes() {
    console.log('Setting up routes'); // Debug log
    router.addRoute('/', () => {
        checkAuthAndRedirect();
    });
    router.addRoute('/login', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        }
        else {
            showLoginPage();
        }
    });
    router.addRoute('/register', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        }
        else {
            showRegisterPage();
        }
    });
    router.addRoute('/dashboard', () => {
        if (isAuthenticated()) {
            showDashboardPage();
        }
        else {
            router.navigate('/login');
        }
    });
    router.addRoute('/profile', () => {
        if (isAuthenticated()) {
            showProfilePage();
        }
        else {
            router.navigate('/login');
        }
    });
    router.addRoute('/profile/:id', (params) => {
        if (isAuthenticated()) {
            if (params && params.id) {
                console.log('Navigating to profile with ID:', params.id); // Debug log
                showProfilePageByID(params.id);
            }
            else {
                console.warn('No ID provided for profile route, redirecting to /profile'); // Debug log
                router.navigate('/profile');
            }
        }
        else {
            router.navigate('/login');
        }
    });
    router.addRoute('/edit-profile', () => {
        if (isAuthenticated()) {
            showEditProfilePage();
        }
        else {
            router.navigate('/login');
        }
    });
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
    console.log('Checking auth and redirecting'); // Debug log
    if (isAuthenticated()) {
        router.navigate('/dashboard');
    }
    else {
        router.navigate('/login');
    }
}
// Event listeners
function setupEventListeners() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    console.log('Setting up event listeners'); // Debug log
    // Login form
    (_a = document.getElementById('loginForm')) === null || _a === void 0 ? void 0 : _a.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const success = yield login({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        });
    }));
    // Register form
    (_b = document.getElementById('registerForm')) === null || _b === void 0 ? void 0 : _b.addEventListener('submit', (e) => __awaiter(this, void 0, void 0, function* () {
        var _u;
        e.preventDefault();
        const fileInput = document.getElementById('registerAvatar');
        const success = yield register({
            username: document.getElementById('registerUsername').value,
            password: document.getElementById('registerPassword').value,
            email: document.getElementById('registerEmail').value,
            avatar: (_u = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _u === void 0 ? void 0 : _u[0],
        });
    }));
    // Navigation buttons
    (_c = document.getElementById('GoToRegisterPage')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        router.navigate('/register');
    });
    (_d = document.getElementById('GoToLoginPage')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        var _a;
        router.navigate('/login');
        (_a = document.getElementById('registerSuccessModal')) === null || _a === void 0 ? void 0 : _a.classList.add('hidden');
    });
    // Profile actions
    (_e = document.getElementById('goToDashboard')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        router.navigate('/dashboard');
    });
    (_f = document.getElementById('editProfileButton')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        router.navigate('/edit-profile');
    });
    (_g = document.getElementById('playGameButton')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', () => {
        router.navigate('/game');
    });
    // Search friends
    (_h = document.getElementById('searchFriendsInput')) === null || _h === void 0 ? void 0 : _h.addEventListener('input', (e) => {
        const target = e.target;
        console.log("Pesquisa:", target.value);
        searchUsers(target.value);
    });
    (_j = document.getElementById('addFriendButton')) === null || _j === void 0 ? void 0 : _j.addEventListener('click', () => {
        const searchInput = document.getElementById('searchFriendsInput');
        if (searchInput) {
            searchInput.focus();
            alert(getTranslation('profile_add_friend')); // Use translation
        }
    });
    // Navigation bar buttons
    (_k = document.querySelector('[data-route="/dashboard"]')) === null || _k === void 0 ? void 0 : _k.addEventListener('click', () => {
        router.navigate('/dashboard');
    });
    (_l = document.querySelector('[data-route="/game"]')) === null || _l === void 0 ? void 0 : _l.addEventListener('click', () => {
        router.navigate('/game');
    });
    (_m = document.querySelector('[data-route="/profile"]')) === null || _m === void 0 ? void 0 : _m.addEventListener('click', () => {
        router.navigate('/profile');
    });
    (_o = document.getElementById('navLogoutButton')) === null || _o === void 0 ? void 0 : _o.addEventListener('click', () => {
        logout();
    });
    // Edit profile actions
    (_p = document.getElementById('saveProfileChangesButton')) === null || _p === void 0 ? void 0 : _p.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
        var _v;
        const fileInput = document.getElementById('newAvatar');
        const success = yield updateProfile({
            newUsername: document.getElementById('newUsername').value,
            newPassword: document.getElementById('newPassword').value,
            newEmail: document.getElementById('newEmail').value,
            newAvatar: (_v = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _v === void 0 ? void 0 : _v[0],
        });
    }));
    (_q = document.getElementById('cancelProfileChangesButton')) === null || _q === void 0 ? void 0 : _q.addEventListener('click', () => {
        router.navigate('/profile');
        clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
    });
    // Game back button
    (_r = document.getElementById('backToProfileButton')) === null || _r === void 0 ? void 0 : _r.addEventListener('click', () => {
        router.navigate('/profile');
    });
    // Avatar preview handlers
    (_s = document.getElementById('registerAvatar')) === null || _s === void 0 ? void 0 : _s.addEventListener('change', handleAvatarPreview);
    (_t = document.getElementById('newAvatar')) === null || _t === void 0 ? void 0 : _t.addEventListener('change', handleAvatarPreviewUpdate);
    // Language switcher
    const languageSwitcher = document.getElementById('languageSwitcher');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', (e) => {
            const lang = e.target.value;
            setLanguage(lang);
        });
    }
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
    console.log('Initializing application'); // Debug log
    initializeLanguage();
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
// Export router for external use
export { router };
