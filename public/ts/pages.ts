import { getTranslation } from './translations.js';
import { getDashboard, getFriendsForProfile, getProfile, getProfileByID } from "./profile.js";

export function showLoginPage(): void {
    togglePages('loginPage');
    hideNavigation();
    updatePageTranslations('loginPage');
}

export function showRegisterPage(): void {
    togglePages('registerPage');
    hideNavigation();
    updatePageTranslations('registerPage');
}

export function showDashboardPage(): void {
    getDashboard();
    togglePages('dashboardPage');
    showNavigation();
    updatePageTranslations('dashboardPage');
}

export function showProfilePage(): void {
    getProfile();
    getFriendsForProfile();
    togglePages('profilePage');
    showNavigation();
    updatePageTranslations('profilePage');
}

export function showEditProfilePage(): void {
    togglePages('editProfilePage');
    showNavigation();
    updatePageTranslations('editProfilePage');
}

export function showProfilePageByID(id: string): void {
    togglePages('profilePageByID');
    showNavigation();
    getProfileByID(id);
    updatePageTranslations('profilePageByID');
}

export function showGamePage(): void {
    togglePages('gamePage');
    showNavigation();
    updatePageTranslations('gamePage');
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
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage', 'gamePage', 'dashboardPage', 'profilePageByID'];
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
        console.log('Navigation bar shown'); // Debug log
    }
}

function hideNavigation(): void {
    const nav = document.getElementById('mainNavigation');
    if (nav) {
        nav.classList.add('hidden');
        console.log('Navigation bar hidden'); // Debug log
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
    console.log('Initializing Pong Game...'); // Debug log
    const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
    if (canvas) {
        console.log('Canvas ready for Pong game'); // Debug log
    }
}

function updatePageTranslations(pageId: string): void {
    const elements = document.querySelectorAll(`#${pageId} [data-i18n]`);
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const translation = getTranslation(key);
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                (element as HTMLInputElement).placeholder = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
}