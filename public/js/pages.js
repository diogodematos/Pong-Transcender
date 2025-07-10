import { getTranslation } from './translations.js';
import { getDashboard, getFriendsForProfile, getProfile, getProfileByID } from "./profile.js";
export function showLoginPage() {
    togglePages('loginPage');
    hideNavigation();
    updatePageTranslations('loginPage');
}
export function showRegisterPage() {
    togglePages('registerPage');
    hideNavigation();
    updatePageTranslations('registerPage');
}
export function showDashboardPage() {
    getDashboard();
    togglePages('dashboardPage');
    showNavigation();
    updatePageTranslations('dashboardPage');
}
export function showProfilePage() {
    getProfile();
    getFriendsForProfile();
    togglePages('profilePage');
    showNavigation();
    updatePageTranslations('profilePage');
}
export function showEditProfilePage() {
    togglePages('editProfilePage');
    showNavigation();
    updatePageTranslations('editProfilePage');
}
export function showProfilePageByID(id) {
    togglePages('profilePageByID');
    showNavigation();
    getProfileByID(id);
    updatePageTranslations('profilePageByID');
}
export function showGamePage() {
    togglePages('gamePage');
    showNavigation();
    updatePageTranslations('gamePage');
    // Initialize game if needed
    initializeGame();
}
export function clearInputs(...ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'file') {
                el.value = '';
                // Reset avatar preview if applicable
                resetAvatarPreview(id);
            }
            else {
                el.value = '';
            }
        }
    });
}
function togglePages(visiblePageId) {
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage', 'gamePage', 'dashboardPage', 'profilePageByID'];
    pages.forEach(page => {
        const el = document.getElementById(page);
        if (el) {
            el.classList.toggle('hidden', page !== visiblePageId);
        }
    });
}
function showNavigation() {
    const nav = document.getElementById('mainNavigation');
    if (nav) {
        nav.classList.remove('hidden');
        console.log('Navigation bar shown'); // Debug log
    }
}
function hideNavigation() {
    const nav = document.getElementById('mainNavigation');
    if (nav) {
        nav.classList.add('hidden');
        console.log('Navigation bar hidden'); // Debug log
    }
}
function resetAvatarPreview(inputId) {
    if (inputId === 'registerAvatar') {
        const preview = document.getElementById('avatarImage');
        if (preview) {
            preview.src = '/img/default-avatar.jpg';
        }
    }
    else if (inputId === 'newAvatar') {
        const preview = document.getElementById('avatarImageUpdate');
        if (preview) {
            preview.src = '';
        }
    }
}
function initializeGame() {
    console.log('Initializing Pong Game...'); // Debug log
    const canvas = document.getElementById('pongCanvas');
    if (canvas) {
        console.log('Canvas ready for Pong game'); // Debug log
    }
}
function updatePageTranslations(pageId) {
    const elements = document.querySelectorAll(`#${pageId} [data-i18n]`);
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const translation = getTranslation(key);
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            }
            else {
                element.textContent = translation;
            }
        }
    });
}
