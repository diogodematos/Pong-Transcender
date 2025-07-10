import { login, register, logout, isAuthenticated } from './auth.js';
import { updateProfile, searchUsers } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage, showProfilePageByID } from './pages.js';
import { router, RouteParams } from './router.js';
import { connectWebSocket } from './ws.js';
import { initializeLanguage, setLanguage, getTranslation, Language } from './translations.js';

// Make router globally accessible
(window as any).router = router;

// Setup routes
function setupRoutes(): void {
    console.log('Setting up routes'); // Debug log
    router.addRoute('/', () => {
        checkAuthAndRedirect();
    });

    router.addRoute('/login', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        } else {
            showLoginPage();
        }
    });

    router.addRoute('/register', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        } else {
            showRegisterPage();
        }
    });

    router.addRoute('/dashboard', () => {
        if (isAuthenticated()) {
            showDashboardPage();
        } else {
            router.navigate('/login');
        }
    });

    router.addRoute('/profile', () => {
        if (isAuthenticated()) {
            showProfilePage();
        } else {
            router.navigate('/login');
        }
    });

    router.addRoute('/profile/:id', (params?: RouteParams) => {
        if (isAuthenticated()) {
            if (params && params.id) {
                console.log('Navigating to profile with ID:', params.id); // Debug log
                showProfilePageByID(params.id);
            } else {
                console.warn('No ID provided for profile route, redirecting to /profile'); // Debug log
                router.navigate('/profile');
            }
        } else {
            router.navigate('/login');
        }
    });

    router.addRoute('/edit-profile', () => {
        if (isAuthenticated()) {
            showEditProfilePage();
        } else {
            router.navigate('/login');
        }
    });

    router.addRoute('/game', () => {
        if (isAuthenticated()) {
            showGamePage();
        } else {
            router.navigate('/login');
        }
    });
}

function checkAuthAndRedirect(): void {
    console.log('Checking auth and redirecting'); // Debug log
    if (isAuthenticated()) {
        router.navigate('/dashboard');
    } else {
        router.navigate('/login');
    }
}

// Event listeners
function setupEventListeners(): void {
    console.log('Setting up event listeners'); // Debug log
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const success = await login({
            username: (document.getElementById('username') as HTMLInputElement).value,
            password: (document.getElementById('password') as HTMLInputElement).value
        });
    });

    // Register form
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('registerAvatar') as HTMLInputElement;
        const success = await register({
            username: (document.getElementById('registerUsername') as HTMLInputElement).value,
            password: (document.getElementById('registerPassword') as HTMLInputElement).value,
            email: (document.getElementById('registerEmail') as HTMLInputElement).value,
            avatar: fileInput?.files?.[0],
        });
    });

    // Navigation buttons
    document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
        router.navigate('/register');
    });

    document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
        router.navigate('/login');
        document.getElementById('registerSuccessModal')?.classList.add('hidden');
    });

    // Profile actions
    document.getElementById('goToDashboard')?.addEventListener('click', () => {
        router.navigate('/dashboard');
    });

    document.getElementById('editProfileButton')?.addEventListener('click', () => {
        router.navigate('/edit-profile');
    });

    document.getElementById('playGameButton')?.addEventListener('click', () => {
        router.navigate('/game');
    });

    // Search friends
    document.getElementById('searchFriendsInput')?.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        console.log("Pesquisa:", target.value);
        searchUsers(target.value);
    });

    document.getElementById('addFriendButton')?.addEventListener('click', () => {
        const searchInput = document.getElementById('searchFriendsInput') as HTMLInputElement;
        if (searchInput) {
            searchInput.focus();
            alert(getTranslation('profile_add_friend')); // Use translation
        }
    });

    // Navigation bar buttons
    document.querySelector('[data-route="/dashboard"]')?.addEventListener('click', () => {
        router.navigate('/dashboard');
    });

    document.querySelector('[data-route="/game"]')?.addEventListener('click', () => {
        router.navigate('/game');
    });

    document.querySelector('[data-route="/profile"]')?.addEventListener('click', () => {
        router.navigate('/profile');
    });

    document.getElementById('navLogoutButton')?.addEventListener('click', () => {
        logout();
    });

    // Edit profile actions
    document.getElementById('saveProfileChangesButton')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('newAvatar') as HTMLInputElement;
        const success = await updateProfile({
            newUsername: (document.getElementById('newUsername') as HTMLInputElement).value,
            newPassword: (document.getElementById('newPassword') as HTMLInputElement).value,
            newEmail: (document.getElementById('newEmail') as HTMLInputElement).value,
            newAvatar: fileInput?.files?.[0],
        });
    });

    document.getElementById('cancelProfileChangesButton')?.addEventListener('click', () => {
        router.navigate('/profile');
        clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
    });

    // Game back button
    document.getElementById('backToProfileButton')?.addEventListener('click', () => {
        router.navigate('/profile');
    });

    // Avatar preview handlers
    document.getElementById('registerAvatar')?.addEventListener('change', handleAvatarPreview);
    document.getElementById('newAvatar')?.addEventListener('change', handleAvatarPreviewUpdate);

    // Language switcher
    const languageSwitcher = document.getElementById('languageSwitcher');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', (e) => {
            const lang = (e.target as HTMLSelectElement).value as Language;
            setLanguage(lang);
        });
    }
}

function handleAvatarPreview(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    const preview = document.getElementById('avatarImage') as HTMLImageElement;
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
            if (preview && e.target?.result) {
                preview.src = e.target.result as string;
            }
        };
        reader.readAsDataURL(file);
    } else if (preview) {
        preview.src = '/img/default-avatar.jpg';
    }
}

function handleAvatarPreviewUpdate(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    const preview = document.getElementById('avatarImageUpdate') as HTMLImageElement;
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
            if (preview && e.target?.result) {
                preview.src = e.target.result as string;
            }
        };
        reader.readAsDataURL(file);
    } else if (preview) {
        preview.src = '';
    }
}

// Initialize application
window.onload = (): void => {
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