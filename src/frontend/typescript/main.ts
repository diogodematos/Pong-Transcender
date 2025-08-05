// src/frontend/typescript/main.ts

import { login, register, logout, isAuthenticated } from './auth.ts';
import { updateProfile, searchUsers, addFriend } from './profile.ts';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage, showUserProfilePage } from './pages.ts';
import { router } from './router.ts';
import { connectWebSocket } from './ws.ts';
// import { startGame3D } from './3d.ts'; // No longer directly used here, game.ts handles it
import { initializeMainMenu, cleanupCurrentGame } from './game.ts'; // Correctly imported
import { CredentialResponse } from 'google-one-tap';

// IMPORTANTE para o TypeScript: Declara a função handleGoogleLogin no escopo global
// para que o script do Google no HTML possa chamá-la.
declare global {
    interface Window {
        // Usa a CredentialResponse importada, que é a definição exata esperada.
        handleGoogleLogin: (response: CredentialResponse) => void;
    }
}

// Funções de configuração de rotas
function setupRoutes(): void {
    router.addRoute('/', () => {
        checkAuthAndRedirect();
    });

    router.addRoute('/login', () => {
        // Cleanup any game before showing login
        cleanupCurrentGame(); 
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        } else {
            showLoginPage();
        }
    });

    router.addRoute('/register', () => {
        // Cleanup any game before showing register
        cleanupCurrentGame();
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        } else {
            showRegisterPage();
        }
    });

    router.addRoute('/dashboard', () => {
        // Cleanup any game before showing dashboard
        cleanupCurrentGame();
        if (isAuthenticated()) {
            showDashboardPage();
        } else {
            router.navigate('/login');
        }
    });

    router.addRoute('/profile', () => {
        // Cleanup any game before showing profile
        cleanupCurrentGame();
        if (isAuthenticated()) {
            showProfilePage();
        } else {
            router.navigate('/login');
        }
    });
    
    router.addRoute('/edit-profile', () => {
        // Cleanup any game before showing edit profile
        cleanupCurrentGame();
        if (isAuthenticated()) {
            showEditProfilePage();
        } else {
            router.navigate('/login');
        }
    });

    router.addRoute('/game', () => {
        if (isAuthenticated()) {
            showGamePage();
            // initializeMainMenu() is called here because we are entering the game "section"
            // It will handle internal game UI states (dimension, difficulty, multiplayer)
            initializeMainMenu(); 
        } else {
            router.navigate('/login');
        }
    });

        router.addRoute('/profile/:id', (params) => {
        if (isAuthenticated()) {
            showUserProfilePage(params.id);
        } else {
            router.navigate('/login');
        }
    });
}

// Função para verificar autenticação e redirecionar
function checkAuthAndRedirect(): void {
    if (isAuthenticated()) {
        router.navigate('/dashboard');
    } else {
        router.navigate('/login');
    }
}

// Função de callback para o Google Sign-In
async function handleGoogleLogin(response: CredentialResponse) {
    try {
        const res = await fetch('/api/users/google-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential }),
        });
        const data = await res.json();

        if (data.token) {
            localStorage.setItem('authToken', data.token);
            console.log('Login Google bem-sucedido. Token recebido.');
            connectWebSocket(data.token); 
            router.navigate('/dashboard');
        } else {
            alert('Erro com login do Google: ' + (data.error || 'Detalhes desconhecidos.'));
            console.error('Erro no login Google (backend response):', data.error);
        }
    } catch (error) {
        console.error('Erro ao autenticar com Google:', error);
        alert('Erro ao autenticar com Google.');
    }
}

// Atribui a função ao objeto window para que o script do Google a possa invocar
window.handleGoogleLogin = handleGoogleLogin;


// Event listeners
function setupEventListeners(): void {
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await login({
            username: (document.getElementById('username') as HTMLInputElement).value,
            password: (document.getElementById('password') as HTMLInputElement).value
        });
    });

    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('registerAvatar') as HTMLInputElement;
        await register({
            username: (document.getElementById('registerUsername') as HTMLInputElement).value,
            password: (document.getElementById('registerPassword') as HTMLInputElement).value,
            email: (document.getElementById('registerEmail') as HTMLInputElement).value,
            avatar: fileInput?.files?.[0],
        });
    });

    document.getElementById('startOneVsOne')?.addEventListener('click', () => {
        console.log('Botão "Duel" clicado!');
        router.navigate('/game');
    });

    document.getElementById('startTournament')?.addEventListener('click', () => {
        console.log('Botão "League" clicado!');
        router.navigate('/game');
    });

    document.getElementById('startVsComputer')?.addEventListener('click', () => {
        console.log('Botão "IA Battle" clicado!');
        router.navigate('/game');
    });

    document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
        clearInputs('username', 'password');
        router.navigate('/register');
    });

    document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
        clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
        router.navigate('/login');
    });

    document.getElementById('goToLoginButton')?.addEventListener('click', () => {
        clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
        router.navigate('/login');
        document.getElementById('registerSuccessModal')?.classList.add('hidden');
    });

    document.getElementById('goToDashboard')?.addEventListener('click', () => {
        clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
        router.navigate('/dashboard');
    });

    document.getElementById('goToDashboardId')?.addEventListener('click', () => {
        router.navigate('/dashboard');
    });

    document.getElementById('editProfileButton')?.addEventListener('click', () => {
        router.navigate('/edit-profile');
    });

    document.getElementById('playGameButton')?.addEventListener('click', () => {
        router.navigate('/game');
    });

    document.getElementById('searchFriendsInput')?.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        console.log("Pesquisa:", target.value);
        searchUsers(target.value);
    });

    document.getElementById('addFriendButton')?.addEventListener('click', () => {
        const searchInput = document.getElementById('searchFriendsInput') as HTMLInputElement;
        if (searchInput) {
            alert('Digite o nome do utilizador no campo de pesquisa e selecione um para adicionar.');
        }
    });

    // Navigation items should also trigger cleanup when leaving /game
    document.querySelector('[data-route="/dashboard"]')?.addEventListener('click', () => {
        router.navigate('/dashboard');
    });

    document.querySelector('[data-route="/game"]')?.addEventListener('click', () => {
        // This will navigate to /game, which then calls initializeMainMenu()
        router.navigate('/game');
    });

    document.querySelector('[data-route="/profile"]')?.addEventListener('click', () => {
        router.navigate('/profile');
    });

    document.getElementById('navLogoutButton')?.addEventListener('click', () => {
        logout(); // Logout will typically redirect to /login, triggering cleanup
    });

    document.getElementById('saveProfileChangesButton')?.addEventListener('click', async () => {
        const fileInput = document.getElementById('newAvatar') as HTMLInputElement;
        await updateProfile({
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
    document.getElementById('backToProfileButton')?.addEventListener('click', () => {
        router.navigate('/profile');
    });
    document.getElementById('registerAvatar')?.addEventListener('change', handleAvatarPreview);
    document.getElementById('newAvatar')?.addEventListener('change', handleAvatarPreviewUpdate);
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
        preview.src = 'assets/img/default-avatar.jpg';
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

// Função executada quando a página é carregada
window.onload = (): void => {
    setupRoutes();
    setupEventListeners();
    router.handleInitialRoute();
    if (isAuthenticated()) {
        const token = localStorage.getItem('authToken');
        if (token) {
            connectWebSocket(token);
        }
    }
    checkAuthAndRedirect();
};

export { router };