// src/frontend/typescript/main.ts

import { register, logout, isAuthenticated, displayError, fetchTwofaStatus} from './auth.ts';
import { updateProfile, searchUsers} from './profile.ts';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage, showGamePage, showDashboardPage, showUserProfilePage, showTourneyPage } from './pages.ts';
import { router } from './router.ts';
import { connectWebSocket } from './ws.ts';
import { startGame2D, currentGame2D } from './2d.ts'; // Importa a função de início do jogo 2D
import { startGame3D, currentGame3D } from './3d.ts'; // No longer directly used here, game.ts handles it
// Define CredentialResponse type manually since 'google-one-tap' module is not available
interface CredentialResponse {
    clientId: string;
    credential: string;
    select_by: string;
}

// IMPORTANT for TypeScript: Declare the handleGoogleLogin function in the global scope
// para que o script do Google no HTML possa chamá-la.
declare global {
    interface Window {
    // Uses the imported CredentialResponse, which is the exact expected definition.
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

function checkAuthAndRedirect(): void {
    if (isAuthenticated()) {
        router.navigate('/dashboard');
    } else {
        router.navigate('/login');
    }
}

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
            localStorage.setItem('google', 'true');
            console.log('Google login successful. Token received.');
            connectWebSocket(data.token); 
            router.navigate('/dashboard');
        } else {
            alert('Error with Google login: ' + (data.error || 'Unknown details.'));
            console.error('Error in Google login (backend response):', data.error);
        }
    } catch (error) {
    console.error('Error authenticating with Google:', error);
    alert('Error authenticating with Google.');
    }
}

// Assign the function to the window object so the Google script can invoke it
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
            displayError('loginResponseMessage', data.error || 'Invalid credentials.');
        }
    });
    // 2FA modal logic
    document.getElementById('submitTwofaCode')?.addEventListener('click', async () => {
        const code = (document.getElementById('modalTwofaCode') as HTMLInputElement).value;
        const errorDiv = document.getElementById('modalTwofaError');
        const pending = (window as any).pendingLogin;
        if (!pending || !code) {
            if (errorDiv) errorDiv.textContent = '2FA code required.';
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

    
    document.getElementById('startVsComputer')?.addEventListener('click', () => {
      document.getElementById('iaModal')!.classList.remove('hidden');
      document.getElementById('step-dimension')!.classList.remove('hidden');
      document.getElementById('step-difficulty')!.classList.add('hidden');
      iaSelectedMode = null;
    });
    
    document.getElementById('closeIaModal')?.addEventListener('click', () => {
      document.getElementById('iaModal')!.classList.add('hidden');
    });
    
    // Step 1 — Choose dimension
    document.querySelectorAll('#step-dimension button').forEach(btn => {
      btn.addEventListener('click', () => {
        iaSelectedMode = (btn as HTMLElement).getAttribute('data-mode') as '2d' | '3d';
        document.getElementById('step-dimension')!.classList.add('hidden');
        document.getElementById('step-difficulty')!.classList.remove('hidden');
      });
    });
    
    // Step 2 — Choose difficulty and start AI game
    document.querySelectorAll('#step-difficulty button').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!iaSelectedMode) return;
      
          const diff = (btn as HTMLElement).getAttribute('data-diff') as 'easy' | 'medium' | 'hard';
          document.getElementById('iaModal')!.classList.add('hidden');
      
          if (gameRunning) {
            alert('A game is already running.');
            return;
          }
      
          gameRunning = true;
        try {
          if (iaSelectedMode === '2d') {
            console.log(`Starting 2D AI [${diff}]`);
            startGame2D(); // you can pass diff in the future;
            if (currentGame2D && diff) {
                currentGame2D.setDifficulty(diff);
            }
            router.navigate('/game'); // Navigate to the 2D game page
          } else {
                console.log(`Starting 3D AI [${diff}]`);
                showGamePage(); // Ensure gamePage is visible before starting 3D game
                await waitForCanvas('renderCanvas', 1000); // Wait for canvas to be present
                await startGame3D('', true, false); // create instance and start
                if (currentGame3D) {
                    currentGame3D.setDifficulty(diff); // apply difficulty
                }
                router.navigate('/game'); // Navigate to the 3D game page
                scr.hidden = false;
          }
        } catch (error) {
          console.error('Error starting AI game:', error);
          gameRunning = false;
        }
      });
    });

        //                                           PvP Battle
    // Open modal on Duel button click
    document.getElementById('startOneVsOne')?.addEventListener('click', () => {
        clearInputs('pvpGameIdInput');
        document.getElementById('pvpModal')!.classList.remove('hidden');
        //document.getElementById('pvp-step-dimension')!.classList.add('hidden');
        document.getElementById('pvp-step-3d-options')!.classList.remove('hidden');
    });
    
    // Close modal
    document.getElementById('closePvpModal')?.addEventListener('click', () => {
        document.getElementById('pvpModal')!.classList.add('hidden');
    });
    
    // Step 2 (3D only) — Create or Join
    document.querySelectorAll('#pvp-step-3d-options button').forEach(btn => {
        btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).getAttribute('data-action');
        const gameId = (document.getElementById('pvpGameIdInput') as HTMLInputElement).value.trim();
    
    // 🔹 Read the selected ball
        const selectedBall = (document.querySelector('input[name="ball-option"]:checked') as HTMLInputElement).value;
    
    // 🔹 Store in button as dataset attribute (same as diff)
        (btn as HTMLElement).setAttribute('data-ball', selectedBall);
    
    // Close modal
        document.getElementById('pvpModal')!.classList.add('hidden');
    
        if (action === 'create') {
            iniciarPvP3D(true);
        } else if (action === 'join') {
            if (!gameId) {
            alert('Please enter a Game ID');
            return;
            }
            iniciarPvP3D(false, gameId);
        }
        });
    });
    
    // function startPvp2D() {
    //     if (gameRunning) {
    //     alert('A game is already running.');
    //     return;
    //     }
    //     gameRunning = true;
    //     console.log('Starting PvP 2D...');
    //     startGame2D(); // No real multiplayer yet, you can adapt later
    //     router.navigate('/game'); // Navigate to the 2D game page
    // }
    
    function iniciarPvP3D(isHost: boolean, gameId: string = '') {
    if (gameRunning) {
    alert('A game is already running.');
    return;
    }
        gameRunning = true;
        const selectedBall = document.querySelector('#pvp-step-3d-options button[data-ball]')?.getAttribute("data-ball") || "ball1";
    
        if (isHost) {
    console.log('Creating 3D game...');
        // Read the selected ball from the button
        (window as any).selectedBall = selectedBall;
        showGamePage();
        startGame3D('', true, true);
        router.navigate('/game');
        scr.hidden = false;

        } else {
    console.log(`Joining 3D game with ID: ${gameId}`);
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
        const google = localStorage.getItem('google');
        console.log("Google login status:", google);
        if (google) {
            document.getElementById('disableTwofaBtn')!.classList.add('hidden');
            document.getElementById('enable2faButton')!.classList.add('hidden');
        }   
        else {
            fetchTwofaStatus();
        }
        document.getElementById('disableTwofaMessage')!.classList.add('hidden');
        router.navigate('/edit-profile');
    });

    document.getElementById('playGameButton')?.addEventListener('click', () => {
        router.navigate('/game');
    });

    document.getElementById('searchFriendsInput')?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    console.log("Search:", target.value);
    searchUsers(target.value);
    });

    document.getElementById('addFriendButton')?.addEventListener('click', () => {
        const searchInput = document.getElementById('searchFriendsInput') as HTMLInputElement;
        if (searchInput) {
            alert('Type the username in the search field and select one to add.');
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