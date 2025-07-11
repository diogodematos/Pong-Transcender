import { login, register, logout, isAuthenticated } from './auth.ts';
import { updateProfile, searchUsers, addFriend } from './profile.ts';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage } from './pages.ts';
import { router } from './router.ts';
import { connectWebSocket } from './ws.ts'; // Conexão WebSocket para o frontend
import { startGame3D } from './3d.ts';  

// Setup routes
function setupRoutes(): void {
    // Default route - check authentication
    router.addRoute('/', () => {
        checkAuthAndRedirect();
    });

    // Login page
    router.addRoute('/login', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        } else {
            showLoginPage();
        }
    });

    // Register page
    router.addRoute('/register', () => {
        if (isAuthenticated()) {
            router.navigate('/dashboard');
        } else {
            showRegisterPage();
        }
    });

    // Dashboard page
    router.addRoute('/dashboard', () => {
        if (isAuthenticated()) {
            showDashboardPage();
        } else {
            router.navigate('/login');
        }
    });

    // Profile page (requires auth)
    router.addRoute('/profile', () => {
        if (isAuthenticated()) {
            showProfilePage();
        } else {
            router.navigate('/login');
        }
    });
    
    // Edit profile page (requires auth)
    router.addRoute('/edit-profile', () => {
        if (isAuthenticated()) {
            showEditProfilePage();
        } else {
            router.navigate('/login');
        }
    });

    // Game page (requires auth)
    router.addRoute('/game', () => {
        if (isAuthenticated()) {
            //showGamePage();
            startGame3D();
        } else {
            router.navigate('/login');
        }
    });
}

function checkAuthAndRedirect(): void {
    if (isAuthenticated()) {
        router.navigate('/dashboard');
    } else {
        router.navigate('/login');
    }
}

// Event listeners
function setupEventListeners(): void {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const success = await login({
            username: (document.getElementById('username') as HTMLInputElement).value,
            password: (document.getElementById('password') as HTMLInputElement).value
        });
        // Login function now handles navigation via router and WebSocket connection
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
        // Register function handles success modal and navigation
    });

    // Game buttons (mantidos, mas pode refatorar para um módulo de jogo)
    document.getElementById('startOneVsOneButton')?.addEventListener('click', () => {
        console.log('Botão "Duel" clicado!');
        router.navigate('/game');
    });

    document.getElementById('startTournamentButton')?.addEventListener('click', () => {
        console.log('Botão "League" clicado!');
        router.navigate('/game');
    });

    document.getElementById('startVsComputerButton')?.addEventListener('click', () => {
        console.log('Botão "IA Battle" clicado!');
        router.navigate('/game');
    });

    // Navigation buttons
    document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
        router.navigate('/register');
    });

    document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
        router.navigate('/login');
    });

    document.getElementById('goToLoginButton')?.addEventListener('click', () => {
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

    // Event listener para pesquisa de amigos
    document.getElementById('searchFriendsInput')?.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        console.log("Pesquisa:", target.value);
        searchUsers(target.value);
    });

    // Event listener para o botão adicionar amigo (opcional)
    document.getElementById('addFriendButton')?.addEventListener('click', () => {
        const searchInput = document.getElementById('searchFriendsInput') as HTMLInputElement;
        if (searchInput) {
            // Este botão precisaria de saber o ID do amigo para adicionar.
            // Provavelmente você chamaria addFriend(friendId) com o ID obtido da pesquisa.
            alert('Digite o nome do utilizador no campo de pesquisa e selecione um para adicionar.');
        }
    });

    // Navigation bar buttons (for authenticated users)
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

// Google login (mantido comentado como no seu código, mas com nota para o WebSocket)
/*
function initGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: "188335469204-dff0bjf48ubspckenk92t6730ade1o0i.apps.googleusercontent.com", // Seu client_id
    callback: handleGoogleLogin,
  });

  google.accounts.id.renderButton(
    document.getElementById("googleSignInButton"),
    { theme: "outline", size: "large" }
  );
}

async function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
  try {
    const res = await fetch('/api/users/google-login', { // CORRIGIDO: Adicionado /api/users
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    });
    const data = await res.json();

    if (data.token) {
      localStorage.setItem('authToken', data.token);
      // Conectar WebSocket após login Google também
      connectWebSocket(data.token); 
      router.navigate('/dashboard'); // Redireciona para o dashboard após login bem-sucedido
    } else {
      alert('Erro com login do Google: ' + (data.error || 'Detalhes desconhecidos.'));
    }
  } catch (error) {
    console.error('Erro ao autenticar com Google:', error);
    alert('Erro ao autenticar com Google.');
  }
}
*/