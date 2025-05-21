var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { clearInputs, showProfilePage } from './pages.js';
export function getProfile() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token)
            return;
        try {
            const res = yield fetch('/users/profile', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = yield res.json();
            if (res.ok) {
                document.getElementById('profileUsername').textContent = data.username;
                document.getElementById('profileEmail').textContent = data.email;
                document.getElementById('profileAvatar').src = data.avatar;
            }
            else {
                alert('Erro ao obter perfil.');
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
        try {
            const res = yield fetch('/users/updateProfile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newData),
            });
            if (res.ok) {
                alert('Perfil atualizado com sucesso!');
                showProfilePage();
                clearInputs('newUsername', 'newPassword', 'newEmail');
            }
            else {
                const data = yield res.json();
                alert(data.error);
            }
        }
        catch (_a) {
            alert('Erro ao atualizar o perfil.');
            clearInputs('newUsername', 'newPassword', 'newEmail');
        }
    });
}
