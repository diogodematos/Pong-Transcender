var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { showProfilePage, clearInputs } from './pages.js';
export function login(credentials) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch('/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            const data = yield res.json();
            if (res.ok) {
                localStorage.setItem('authToken', data.token);
                showProfilePage();
                clearInputs('username', 'password');
            }
            else {
                displayError('loginResponseMessage', data.error);
            }
        }
        catch (_a) {
            displayError('loginResponseMessage', 'Erro ao conectar com o servidor.');
        }
    });
}
export function register(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const formData = new FormData();
        formData.append('username', data.username);
        formData.append('password', data.password);
        formData.append('email', data.email);
        if (data.avatar)
            formData.append('avatar', data.avatar);
        try {
            const res = yield fetch('/users/register', {
                method: 'POST',
                body: formData,
            });
            const json = yield res.json();
            if (res.ok) {
                document.getElementById('registerSuccessModal').classList.remove('hidden');
                clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
            }
            else {
                displayError('registerResponseMessage', `Erro: ${json.error}`);
            }
        }
        catch (_a) {
            displayError('registerResponseMessage', 'Erro ao conectar com o servidor.');
        }
    });
}
function displayError(id, message) {
    const el = document.getElementById(id);
    if (el)
        el.textContent = message;
}
