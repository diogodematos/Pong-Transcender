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
export function getDashboard() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.navigate('/login');
            return;
        }
        try {
            const res = yield fetch('/users/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const userData = yield res.json();
            if (res.ok) {
                const usernameDash = document.getElementById('dashboardUsername');
                const avatarDash = document.getElementById('dashboardAvatar');
                if (usernameDash)
                    usernameDash.textContent = userData.username;
                if (avatarDash)
                    avatarDash.src = userData.avatar || '/img/default-avatar.jpg';
            }
            else {
                alert('Erro ao aceder ao Dashboard.');
                if (res.status === 401) {
                    // Token invalid, redirect to login
                    localStorage.removeItem('authToken');
                    router.navigate('/login');
                }
            }
        }
        catch (_a) {
            alert('Erro de conexão ao Dashboard.');
        }
    });
}
//// TESTE INICIO
// Adicionar estas funções ao profile.ts existente
export function getGameHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token)
            return;
        try {
            const res = yield fetch('/users/games/history', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = yield res.json();
                updateGameHistoryUI(data.games);
            }
        }
        catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    });
}
function updateGameHistoryUI(games) {
    const gameHistory = document.getElementById('gameHistory');
    if (!gameHistory)
        return;
    if (games.length === 0) {
        gameHistory.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum jogo jogado ainda.</p>';
        return;
    }
    gameHistory.innerHTML = games.map(game => {
        const isWin = game.result === 'win';
        const bgColor = isWin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
        const textColor = isWin ? 'text-green-700' : 'text-red-700';
        const resultText = isWin ? 'Vitória' : 'Derrota';
        const score = `${game.player_score} - ${game.opponent_score}`;
        const date = formatGameDate(game.played_at);
        return `
          <div class="${bgColor} border p-3 rounded-lg">
              <div class="flex justify-between items-center">
                  <div>
                      <p class="font-semibold ${textColor}">${resultText}</p>
                      <p class="text-sm text-gray-600">vs ${game.opponent_name}</p>
                  </div>
                  <div class="text-right">
                      <p class="font-bold ${textColor}">${score}</p>
                      <p class="text-xs text-gray-500">${date}</p>
                  </div>
              </div>
          </div>
      `;
    }).join('');
}
export function getFriendsForProfile() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token)
            return;
        try {
            const res = yield fetch('/users/friends', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = yield res.json();
                updateFriendsUI(data.friends);
            }
        }
        catch (error) {
            console.error('Erro ao carregar amigos:', error);
        }
    });
}
// Função para pesquisar utilizadores
export function searchUsers(username) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token)
            return;
        if (username.length < 2) {
            hideSearchResults();
            return;
        }
        try {
            const res = yield fetch(`/users/friends/search/${encodeURIComponent(username)}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = yield res.json();
                showSearchResults(data.users);
            }
        }
        catch (error) {
            console.error('Erro ao pesquisar utilizadores:', error);
        }
    });
}
// Função para mostrar resultados da pesquisa
function showSearchResults(users) {
    const searchResults = document.getElementById('searchResults');
    const searchResultsList = document.getElementById('searchResultsList');
    if (!searchResults || !searchResultsList)
        return;
    if (users.length === 0) {
        searchResultsList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum utilizador encontrado.</p>';
    }
    else {
        searchResultsList.innerHTML = users.map(user => `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex items-center">
                  <img src="${user.avatar || '/img/default-avatar.jpg'}" 
                       alt="Avatar" 
                       class="w-8 h-8 rounded-full mr-2">
                  <div>
                      <span class="text-sm font-medium">${user.username}</span>
                      <p class="text-xs text-gray-500">${user.email}</p>
                  </div>
              </div>
              ${user.is_friend ?
            '<span class="text-green-600 text-xs font-medium">Já é amigo</span>' :
            `<button onclick="addFriend(${user.id})" 
                           class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      Adicionar
                   </button>`}
          </div>
      `).join('');
    }
    searchResults.classList.remove('hidden');
}
// Função para esconder resultados da pesquisa
function hideSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.classList.add('hidden');
    }
}
// Função para adicionar amigo
export function addFriend(friendId) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = localStorage.getItem('authToken');
        if (!token)
            return;
        try {
            const res = yield fetch('/users/friends/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ friendId }),
            });
            if (res.ok) {
                alert('Amigo adicionado com sucesso!');
                // Refresh da lista de amigos
                getFriendsForProfile();
                // Limpar pesquisa
                const searchInput = document.getElementById('searchFriendsInput');
                if (searchInput) {
                    searchInput.value = '';
                    hideSearchResults();
                }
            }
            else {
                const data = yield res.json();
                alert(data.error || 'Erro ao adicionar amigo.');
            }
        }
        catch (error) {
            console.error('Erro ao adicionar amigo:', error);
            alert('Erro ao adicionar amigo.');
        }
    });
}
// Tornar a função global para os onclick
window.addFriend = addFriend;
function updateFriendsUI(friends) {
    const onlineFriends = friends.filter(f => f.is_online);
    const offlineFriends = friends.filter(f => !f.is_online);
    // Atualizar contadores
    const onlineCount = document.querySelector('.text-green-600');
    if (onlineCount) {
        onlineCount.textContent = `Online (${onlineFriends.length})`;
    }
    const offlineCount = document.querySelector('.text-gray-500');
    if (offlineCount) {
        offlineCount.textContent = `Offline (${offlineFriends.length})`;
    }
    // Atualizar lista de amigos online
    updateOnlineFriends(onlineFriends);
    updateOfflineFriends(offlineFriends);
}
function updateOnlineFriends(friends) {
    const container = document.getElementById('onlineFriendsList');
    const title = document.getElementById('onlineFriendsTitle');
    if (!container || !title)
        return;
    title.textContent = `Online (${friends.length})`;
    container.innerHTML = friends.length === 0
        ? '<p class="text-sm text-gray-500">Nenhum amigo online</p>'
        : friends.map(friend => `
      <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-center">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <img src="${friend.avatar || '/img/default-avatar.jpg'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
          <span class="text-sm font-medium">${friend.username}</span>
        </div>
        <button onclick="challengeFriend(${friend.id})" class="bg-[#2f9b20] text-white px-2 py-1 rounded text-xs hover:bg-[#247a1a] transition-colors">
          Desafiar
        </button>
      </div>
    `).join('');
}
function updateOfflineFriends(friends) {
    const container = document.getElementById('offlineFriendsList');
    const title = document.getElementById('offlineFriendsTitle');
    if (!container || !title)
        return;
    title.textContent = `Offline (${friends.length})`;
    container.innerHTML = friends.length === 0
        ? '<p class="text-sm text-gray-500">Nenhum amigo offline</p>'
        : friends.map(friend => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <img src="${friend.avatar || '/img/default-avatar.jpg'}" 
                 alt="Avatar" 
                 class="w-8 h-8 rounded-full mr-2 grayscale">
            <span class="text-sm text-gray-600">${friend.username}</span>
          </div>
          <span class="text-xs text-gray-400">${formatLastSeen(friend.last_seen)}</span>
        </div>
      `).join('');
}
function formatGameDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1)
        return 'Hoje, ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 2)
        return 'Ontem, ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-PT') + ', ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}
function formatLastSeen(lastSeen) {
    if (!lastSeen)
        return 'Há muito tempo';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffMinutes < 60)
        return `Há ${diffMinutes}min`;
    if (diffHours < 24)
        return `Há ${diffHours}h`;
    if (diffDays === 1)
        return 'Ontem';
    if (diffDays < 7)
        return `Há ${diffDays} dias`;
    return 'Há muito tempo';
}
// Função global para desafiar amigos
window.challengeFriend = (friendId) => {
    alert(`Funcionalidade de desafio será implementada! Amigo ID: ${friendId}`);
};
//////  TESTE FIM
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
                getGameHistory(); // Fetch game history after profile is loaded
                getFriendsForProfile(); // Fetch friends after profile is loaded
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
    const winsEl = document.getElementById('profileWins');
    const lossesEl = document.getElementById('profileLosses');
    if (usernameEl)
        usernameEl.textContent = profile.username;
    if (emailEl)
        emailEl.textContent = profile.email;
    if (avatarEl)
        avatarEl.src = profile.avatar || '/img/default-avatar.jpg';
    if (winsEl)
        winsEl.textContent = profile.wins.toString();
    if (lossesEl)
        lossesEl.textContent = profile.losses.toString();
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
