export function showLoginPage() {
    togglePages('loginPage');
}
export function showRegisterPage() {
    togglePages('registerPage');
}
export function showProfilePage() {
    togglePages('profilePage');
}
export function showEditProfilePage() {
    togglePages('editProfilePage');
}
export function clearInputs(...ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el)
            el.value = '';
    });
}
function togglePages(visiblePageId) {
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage'];
    pages.forEach(page => {
        const el = document.getElementById(page);
        if (el)
            el.classList.toggle('hidden', page !== visiblePageId);
    });
}
