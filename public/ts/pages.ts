import { getDashboard, getProfile} from "./profile.js";

export function showLoginPage(): void {
    togglePages('loginPage');
    hideNavigation();
}

export function showRegisterPage(): void {
    togglePages('registerPage');
    hideNavigation();
}

export function showDashboardPage(): void {
    getDashboard();
    togglePages('dashboardPage');
    showNavigation();
}

export function showProfilePage(): void {
    getProfile();
    togglePages('profilePage');
    showNavigation();
}

export function showEditProfilePage(): void {
    togglePages('editProfilePage');
    showNavigation();
}

export function showGamePage(): void {
    togglePages('gamePage');
    showNavigation();
    // Initialize game if needed
    initializeGame();
}

export function clearInputs(...ids: string[]): void {
    ids.forEach(id => {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) {
            if (el.type === 'file') {
                el.value = '';
                // Reset avatar preview if applicable
                resetAvatarPreview(id);
            } else {
                el.value = '';
            }
        }
    });
}

function togglePages(visiblePageId: string): void {
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage', 'gamePage', 'dashboardPage'];
    pages.forEach(page => {
        const el = document.getElementById(page);
        if (el) {
            el.classList.toggle('hidden', page !== visiblePageId);
        }
    });
}

function showNavigation(): void {
    const nav = document.getElementById('mainNavigation');
    if (nav) {
        nav.classList.remove('hidden');
    }
}

function hideNavigation(): void {
    const nav = document.getElementById('mainNavigation');
    if (nav) {
        nav.classList.add('hidden');
    }
}

function resetAvatarPreview(inputId: string): void {
    if (inputId === 'registerAvatar') {
        const preview = document.getElementById('avatarImage') as HTMLImageElement;
        if (preview) {
            preview.src = '/img/default-avatar.jpg';
        }
    } else if (inputId === 'newAvatar') {
        const preview = document.getElementById('avatarImageUpdate') as HTMLImageElement;
        if (preview) {
            preview.src = '';
        }
    }
}

function initializeGame(): void {
    // Initialize your pong game here
    console.log('Initializing Pong Game...');
    // You can add your pong game logic here
    
    // Example: Get canvas and start game
    const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
    if (canvas) {
        // Initialize your game logic here
        console.log('Canvas ready for Pong game');
    }
}