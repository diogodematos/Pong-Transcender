import { getDashboard, getProfile } from "./profile.js";
export function showLoginPage() {
    togglePages('loginPage');
    hideNavigation();
}
export function showRegisterPage() {
    togglePages('registerPage');
    hideNavigation();
}
export function showDashboardPage() {
    getDashboard();
    togglePages('dashboardPage');
    showNavigation();
}
export function showProfilePage() {
    getProfile();
    togglePages('profilePage');
    showNavigation();
}
export function showEditProfilePage() {
    togglePages('editProfilePage');
    showNavigation();
}
export function showGamePage() {
    togglePages('gamePage');
    showNavigation();
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
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage', 'gamePage', 'dashboardPage'];
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
    }
}
function hideNavigation() {
    const nav = document.getElementById('mainNavigation');
    if (nav) {
        nav.classList.add('hidden');
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
    // Initialize your pong game here
    console.log('Initializing Pong Game...');
    // You can add your pong game logic here
    // Example: Get canvas and start game
    const canvas = document.getElementById('pongCanvas');
    if (canvas) {
        // Initialize your game logic here
        console.log('Canvas ready for Pong game');
    }
}
