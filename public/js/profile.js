var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { clearInputs } from './pages.js';
import { router } from './router.js';
export function getProfile() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return;
        }
        try {
            const res = yield fetch('/users/profile', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = yield res.json();
            if (res.ok) {
                updateProfileUI(data);
            }
            else {
                alert('Erro ao obter perfil.');
                if (res.status === 401) {
                    // Token invalid, redirect to login
                    localStorage.removeItem('authToken');
                    router.navigate('/login');
                }
            }
        }
        catch (_a) {
            alert('Erro de conexão ao buscar perfil.');
        }
    });
}
export function updateProfile(newData) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return false;
        }
        const formData = new FormData();
        if (newData.newUsername)
            formData.append('newUsername', newData.newUsername);
        if (newData.newEmail)
            formData.append('newEmail', newData.newEmail);
        if (newData.newPassword)
            formData.append('newPassword', newData.newPassword);
        if (newData.newAvatar)
            formData.append('newAvatar', newData.newAvatar);
        try {
            const res = yield fetch('/users/updateProfile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
            if (res.ok) {
                alert('Perfil atualizado com sucesso!');
                clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
                router.navigate('/profile');
                return true;
            }
            else {
                const data = yield res.json();
                alert(data.error);
                clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
                if (res.status === 401) {
                    localStorage.removeItem('authToken');
                    router.navigate('/login');
                }
                return false;
            }
        }
        catch (_a) {
            alert('Erro ao atualizar o perfil.');
            clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
            return false;
        }
    });
}
function updateProfileUI(profile) {
    const usernameEl = document.getElementById('profileUsername');
    const emailEl = document.getElementById('profileEmail');
    const avatarEl = document.getElementById('profileAvatar');
    if (usernameEl)
        usernameEl.textContent = profile.username;
    if (emailEl)
        emailEl.textContent = profile.email;
    if (avatarEl)
        avatarEl.src = profile.avatar || '/img/default-avatar.jpg';
    // Also update edit form with current values
    prefillEditForm(profile);
}
function prefillEditForm(profile) {
    const newUsernameInput = document.getElementById('newUsername');
    const newEmailInput = document.getElementById('newEmail');
    const avatarPreview = document.getElementById('avatarImageUpdate');
    if (newUsernameInput)
        newUsernameInput.placeholder = profile.username;
    if (newEmailInput)
        newEmailInput.placeholder = profile.email;
    if (avatarPreview)
        avatarPreview.src = profile.avatar || '/img/default-avatar.jpg';
}
