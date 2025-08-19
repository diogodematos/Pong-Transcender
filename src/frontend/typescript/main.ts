// src/frontend/typescript/main.ts

import { register, logout, isAuthenticated, displayError, fetchTwofaStatus} from './auth.ts';
import { updateProfile, searchUsers} from './profile.ts';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage, showUserProfilePage, showTourneyPage } from './pages.ts';
import { router } from './router.ts';
import { connectWebSocket } from './ws.ts';
import { startGame2D, currentGame2D } from './2d.ts'; // Importa a função de início do jogo 2D
import { startGame3D, currentGame3D } from './3d.ts'; // No longer directly used here, game.ts handles it
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

    router.addRoute('/tourney', () => {
        if (isAuthenticated()) {
            showTourneyPage(); // Uncomment if you have a tourney page
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
            localStorage.setItem('userName', data.user.username);
            console.log('Login Google bem-sucedido. Token recebido.');
            connectWebSocket(data.token); 
            router.navigate('/dashboard');
            document.getElementById('enable2faButton')!.classList.add('hidden');
            document.getElementById('disableTwofaBtn')!.classList.add('hidden');
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
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        // First, try login without 2FA code
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userName', data.dbUser.username);
            localStorage.setItem('userId', data.dbUser.id);
            clearInputs('username', 'password');
            connectWebSocket(data.token);
            router.navigate('/dashboard');
            // document.getElementById('enable2faButton')!.classList.remove('hidden');
            // document.getElementById('disableTwofaBtn')!.classList.add('hidden');
        } else if (data.error === '2FA code required') {
            // Show 2FA modal
            document.getElementById('twoFAModal')?.classList.remove('hidden');
            // Store username/password for next step
            (window as any).pendingLogin = { username, password };
        } else {
            displayError('loginResponseMessage', data.error || 'Credenciais inválidas.');
        }
    });
    // 2FA modal logic
    document.getElementById('submitTwofaCode')?.addEventListener('click', async () => {
        const code = (document.getElementById('modalTwofaCode') as HTMLInputElement).value;
        const errorDiv = document.getElementById('modalTwofaError');
        const pending = (window as any).pendingLogin;
        if (!pending || !code) {
            if (errorDiv) errorDiv.textContent = 'Código 2FA obrigatório.';
            return;
        }
        // Try login with 2FA code
        const res = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: pending.username, password: pending.password, twofa_code: code })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userName', data.dbUser.username);
            localStorage.setItem('userId', data.dbUser.id);
            clearInputs('username', 'password', 'modalTwofaCode');
            connectWebSocket(data.token);
            document.getElementById('twoFAModal')?.classList.add('hidden');
            (window as any).pendingLogin = null;
            router.navigate('/dashboard');
            // document.getElementById('disableTwofaBtn')!.classList.remove('hidden');
            // document.getElementById('enable2faButton')!.classList.add('hidden');
        } else {
            if (errorDiv) errorDiv.textContent = data.error || 'Código 2FA inválido.';
        }
    });
    document.getElementById('closeTwoFAModal')?.addEventListener('click', () => {
        document.getElementById('twoFAModal')?.classList.add('hidden');
        (window as any).pendingLogin = null;
        (document.getElementById('modalTwofaCode') as HTMLInputElement).value = '';
        document.getElementById('modalTwofaError')!.textContent = '';
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

    let gameRunning = false;


    //                                            Tourney 
    document.getElementById('startTournament')?.addEventListener('click', () => {
        router.navigate('/tourney');
    });

    //                                            IA Battle

    let iaSelectedMode: '2d' | '3d' | null = null;
    const scr = document.getElementById('score-display') as HTMLDivElement;

    
    // Abrir modal no clique do botão IA Battle
    document.getElementById('startVsComputer')?.addEventListener('click', () => {
      document.getElementById('iaModal')!.classList.remove('hidden');
      document.getElementById('step-dimension')!.classList.remove('hidden');
      document.getElementById('step-difficulty')!.classList.add('hidden');
      iaSelectedMode = null;
    });
    
    // Fechar modal
    document.getElementById('closeIaModal')?.addEventListener('click', () => {
      document.getElementById('iaModal')!.classList.add('hidden');
    });
    
    // Passo 1 — Escolher dimensão
    document.querySelectorAll('#step-dimension button').forEach(btn => {
      btn.addEventListener('click', () => {
        iaSelectedMode = (btn as HTMLElement).getAttribute('data-mode') as '2d' | '3d';
        document.getElementById('step-dimension')!.classList.add('hidden');
        document.getElementById('step-difficulty')!.classList.remove('hidden');
      });
    });
    
    // Passo 2 — Escolher dificuldade e iniciar jogo IA
    document.querySelectorAll('#step-difficulty button').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!iaSelectedMode) return;
      
          const diff = (btn as HTMLElement).getAttribute('data-diff') as 'easy' | 'medium' | 'hard';
          document.getElementById('iaModal')!.classList.add('hidden');
      
          if (gameRunning) {
            alert('Um jogo já está em execução.');
            return;
          }
      
          gameRunning = true;
        try {
          if (iaSelectedMode === '2d') {
            console.log(`Iniciando 2D IA [${diff}]`);
            startGame2D(); // futuramente podes passar diff;
            if (currentGame2D && diff) {
                currentGame2D.setDifficulty(diff);
            }
            router.navigate('/game'); // Navega para a página do jogo 2D
          } else {
            console.log(`Iniciando 3D IA [${diff}]`);
            showGamePage(); // Ensure gamePage is visible before starting 3D game
            await waitForCanvas('renderCanvas', 1000); // Wait for canvas to be present
            await startGame3D('', true, false); // cria instância e inicia
            if (currentGame3D) {
              currentGame3D.setDifficulty(diff); // aplica dificuldade
            }
            router.navigate('/game'); // Navega para a página do jogo 3D
            scr.hidden = false;
          }
        } catch (error) {
          console.error('Erro ao iniciar jogo IA:', error);
          gameRunning = false;
        }
      });
    });

        //                                           PvP Battle
        // Abrir modal no clique do botão Duel
    document.getElementById('startOneVsOne')?.addEventListener('click', () => {
        clearInputs('pvpGameIdInput');
        document.getElementById('pvpModal')!.classList.remove('hidden');
        //document.getElementById('pvp-step-dimension')!.classList.add('hidden');
        document.getElementById('pvp-step-3d-options')!.classList.remove('hidden');
    });
    
    // Fechar modal
    document.getElementById('closePvpModal')?.addEventListener('click', () => {
        document.getElementById('pvpModal')!.classList.add('hidden');
    });
    
    // Etapa 2 (apenas 3D) — Criar ou Entrar
    document.querySelectorAll('#pvp-step-3d-options button').forEach(btn => {
        btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).getAttribute('data-action');
        const gameId = (document.getElementById('pvpGameIdInput') as HTMLInputElement).value.trim();
    
        // 🔹 Ler a bola escolhida
        const selectedBall = (document.querySelector('input[name="ball-option"]:checked') as HTMLInputElement).value;
    
        // 🔹 Guardar no botão como atributo dataset (igual ao diff)
        (btn as HTMLElement).setAttribute('data-ball', selectedBall);
    
        // Fechar modal
        document.getElementById('pvpModal')!.classList.add('hidden');
    
        if (action === 'create') {
            iniciarPvP3D(true);
        } else if (action === 'join') {
            if (!gameId) {
            alert('Por favor insere um Game ID');
            return;
            }
            iniciarPvP3D(false, gameId);
        }
        });
    });
    
    // // Funções para iniciar jogos
    // function iniciarPvp2D() {
    //     if (gameRunning) {
    //     alert('Já há um jogo a decorrer.');
    //     return;
    //     }
    //     gameRunning = true;
    //     console.log('Iniciando PvP 2D...');
    //     startGame2D(); // Até aqui, sem multiplayer real, podes adaptar depois
    //     router.navigate('/game'); // Navega para a página do jogo 2D
    // }
    
    function iniciarPvP3D(isHost: boolean, gameId: string = '') {
        if (gameRunning) {
        alert('Já há um jogo a decorrer.');
        return;
        }
        gameRunning = true;
        const selectedBall = document.querySelector('#pvp-step-3d-options button[data-ball]')?.getAttribute("data-ball") || "ball1";
    
        if (isHost) {
        console.log('Criando jogo 3D...');
        // Lê a bola escolhida do botão
        (window as any).selectedBall = selectedBall;
        showGamePage();
        startGame3D('', true, true);
        router.navigate('/game'); // Navega para a página do jogo 3D
        scr.hidden = false;

        } else {
        console.log(`Entrando no jogo 3D com ID: ${gameId}`);
        // Lê a bola escolhida do botão
        (window as any).selectedBall = selectedBall;
        showGamePage();
        startGame3D(gameId, false, true);
        router.navigate('/game');
        scr.hidden = false;
        }
    }
  

    document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
        clearInputs('username', 'password');
        const errorElement = document.getElementById('loginResponseMessage');
        if (errorElement) {
          errorElement.textContent = '';
          errorElement.classList.add('hidden');
        }
        router.navigate('/register');
    });

    document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
        clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
        const errorElement = document.getElementById('registerResponseMessage');
        if (errorElement) {
          errorElement.textContent = '';
          errorElement.classList.add('hidden');
        }
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
        fetchTwofaStatus();
        document.getElementById('disableTwofaMessage')!.classList.add('hidden');
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

    document.getElementById('cancelTourneyButton')?.addEventListener('click', () => {
        router.navigate('/dashboard');
    });
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
    // Show loading overlay immediately
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    setupRoutes();
    setupEventListeners();
    router.handleInitialRoute();
    if (isAuthenticated()) {
        const token = localStorage.getItem('authToken');
        if (token) {
            connectWebSocket(token);
        }
    }
    // Delay hiding overlay until auth check and initial route are handled
    setTimeout(() => {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }, 400); // 400ms for smoother transition
    checkAuthAndRedirect();
};

export { router };

// Helper function to wait for the renderCanvas element
async function waitForCanvas(canvasId: string, timeout = 1000): Promise<HTMLCanvasElement> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.getElementById(canvasId);
    if (el instanceof HTMLCanvasElement) return el;
    await new Promise(res => setTimeout(res, 20));
  }
  throw new Error(`Canvas element with id "${canvasId}" not found after ${timeout}ms`);
}