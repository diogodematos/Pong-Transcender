var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { router } from './router.js';
export function getFriends() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return;
        }
        try {
            const res = yield fetch('/friends', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = yield res.json();
                updateFriendsUI(data.friends);
            }
            else {
                alert('Erro ao obter lista de amigos.');
                if (res.status === 401) {
                    localStorage.removeItem('authToken');
                    router.navigate('/login');
                }
            }
        }
        catch (_a) {
            alert('Erro de conexão ao buscar amigos.');
        }
    });
}
export function searchUsers(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return;
        }
        if (username.length < 2) {
            clearSearchResults();
            return;
        }
        try {
            const res = yield fetch(`/friends/search/${encodeURIComponent(username)}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = yield res.json();
                updateSearchResultsUI(data.users);
            }
            else {
                alert('Erro ao pesquisar utilizadores.');
            }
        }
        catch (_a) {
            alert('Erro de conexão na pesquisa.');
        }
    });
}
export function addFriend(friendId) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return false;
        }
        try {
            const res = yield fetch('/friends/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ friendId }),
            });
            if (res.ok) {
                alert('Amigo adicionado com sucesso!');
                getFriends(); // Refresh friends list
                return true;
            }
            else {
                const data = yield res.json();
                alert(data.error || 'Erro ao adicionar amigo.');
                return false;
            }
        }
        catch (_a) {
            alert('Erro ao adicionar amigo.');
            return false;
        }
    });
}
export function removeFriend(friendId) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return false;
        }
        if (!confirm('Tens a certeza que queres remover este amigo?')) {
            return false;
        }
        try {
            const res = yield fetch(`/friends/${friendId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                alert('Amigo removido com sucesso!');
                getFriends(); // Refresh friends list
                return true;
            }
            else {
                const data = yield res.json();
                alert(data.error || 'Erro ao remover amigo.');
                return false;
            }
        }
        catch (_a) {
            alert('Erro ao remover amigo.');
            return false;
        }
    });
}
function updateFriendsUI(friends) {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList)
        return;
    if (friends.length === 0) {
        friendsList.innerHTML = '<p class="text-gray-500 text-center py-4">Ainda não tens amigos adicionados.</p>';
        return;
    }
    friendsList.innerHTML = friends.map(friend => `
        <div class="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <img src="${friend.avatar || '/img/default-avatar.jpg'}" 
                     alt="${friend.username}" 
                     class="w-12 h-12 rounded-full object-cover">
                <div>
                    <h3 class="font-semibold text-gray-900">${friend.username}</h3>
                    <p class="text-sm text-gray-600">${friend.email}</p>
                    <p class="text-xs text-gray-500">Vitórias: ${friend.wins} | Derrotas: ${friend.losses}</p>
                </div>
            </div>
            <button onclick="handleRemoveFriend(${friend.id})" 
                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                Remover
            </button>
        </div>
    `).join('');
}
function updateSearchResultsUI(users) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults)
        return;
    if (users.length === 0) {
        searchResults.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum utilizador encontrado.</p>';
        return;
    }
    searchResults.innerHTML = users.map(user => `
        <div class="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <img src="${user.avatar || '/img/default-avatar.jpg'}" 
                     alt="${user.username}" 
                     class="w-12 h-12 rounded-full object-cover">
                <div>
                    <h3 class="font-semibold text-gray-900">${user.username}</h3>
                    <p class="text-sm text-gray-600">${user.email}</p>
                    <p class="text-xs text-gray-500">Vitórias: ${user.wins} | Derrotas: ${user.losses}</p>
                </div>
            </div>
            ${user.is_friend ?
        '<span class="text-green-600 text-sm font-medium">Já é amigo</span>' :
        `<button onclick="handleAddFriend(${user.id})" 
                         class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    Adicionar
                 </button>`}
        </div>
    `).join('');
}
function clearSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.innerHTML = '';
    }
}
// Funções globais para os event handlers
window.handleAddFriend = addFriend;
window.handleRemoveFriend = removeFriend;
