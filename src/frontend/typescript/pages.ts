// src/frontend/typescript/pages.ts

import { getDashboard, getFriendsForProfile, getProfile, getUserProfile} from "./profile.ts";

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
    getFriendsForProfile();
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
    // Inicialize o menu principal do jogo e os controles (botões de dificuldade, etc.)
    console.log('Attempting to initialize game main menu from showGamePage...');
}

export function showUserProfilePage(userId: string): void {
    // Assuming you have a function to fetch and display user profile by ID
    getUserProfile(userId);
    togglePages('userProfilePage');
    showNavigation();
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
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage', 'gamePage', 'dashboardPage', 'userProfilePage'];
    
    pages.forEach(page => {
        const el = document.getElementById(page);
        if (el) {
            if (page === 'gamePage' && visiblePageId !== 'gamePage' && !el.classList.contains('hidden')) {
                console.log("Leaving game page, cleaning up current game...");
            }
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
            preview.src = 'assets/img/default-avatar.jpg';
        }
    } else if (inputId === 'newAvatar') {
        const preview = document.getElementById('avatarImageUpdate') as HTMLImageElement;
        if (preview) {
            preview.src = '';
        }
    }
}

// A função initializeGame() antiga foi removida conforme discutido.