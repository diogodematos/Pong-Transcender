import { Profile, ProfileId, UpdateProfileData, GameHistoryResponse, FriendsResponse, GameHistoryItem, Friend } from './types.ts';
import { clearInputs } from './pages.ts';
import { router } from './router.ts';

export async function getDashboard() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate('/login');
    return;
  }

  try {
    const res = await fetch('api/users/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const userData: Profile = await res.json();

    if (res.ok) {
      const usernameDash = document.getElementById('dashboardUsername') as HTMLElement;
      const avatarDash = document.getElementById('dashboardAvatar') as HTMLImageElement;
      
      if (usernameDash) usernameDash.textContent = userData.username;
      if (avatarDash) avatarDash.src = userData.avatar || 'assets/img/default-avatar.jpg';
    } else {
      alert('Erro ao aceder ao Dashboard.');
      if (res.status === 401) {
        // Token invalid, redirect to login
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
    }
  } catch {
    alert('Erro de conexão ao Dashboard.');
  }
}

//// TESTE INICIO

// Adicionar estas funções ao profile.ts existente

export async function getGameHistory(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
      const res = await fetch('api/users/games/history', {
          headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
          const data: GameHistoryResponse = await res.json();
          updateGameHistoryUI(data.games);
      }
  } catch (error) {
      console.error('Erro ao carregar histórico:', error);
  }
}

function updateGameHistoryUI(games: GameHistoryItem[]): void {
  const gameHistory = document.getElementById('gameHistory');
  if (!gameHistory) return;

  if (games.length === 0) {
      gameHistory.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum jogo jogado ainda.</p>';
      return;
  }

  gameHistory.innerHTML = games.map(game => {
      console.log('Opponent ID:', game.opponent_id);

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
                      <a href="#/profile/${game.opponent_id}" class="text-sm font-medium text-blue-600 hover:underline">
                        ${game.opponent_name}
                        </a>      
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

export async function getUserGameHistory(userID: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
      const res = await fetch(`api/users/games/history/${userID}`, {
          headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
          const data: GameHistoryResponse = await res.json();
          updateUserGameHistoryUI(data.games);
      }
  } catch (error) {
      console.error('Erro ao carregar histórico:', error);
  }
}

function updateUserGameHistoryUI(games: GameHistoryItem[]): void {
  const gameHistory = document.getElementById('gameUserHistory');
  if (!gameHistory) return;

  if (games.length === 0) {
      gameHistory.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum jogo jogado ainda.</p>';
      return;
  }

  gameHistory.innerHTML = games.map(game => {
      console.log('Opponent ID:', game.opponent_id);

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
                      <a href="#/profile/${game.opponent_id}" class="text-sm font-medium text-blue-600 hover:underline">
                        ${game.opponent_name}
                        </a>      
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

export async function getFriendsForProfile(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
      const res = await fetch('api/users/friends', {
          headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
          const data: FriendsResponse = await res.json();
          updateFriendsUI(data.friends);
      }
  } catch (error) {
      console.error('Erro ao carregar amigos:', error);
  }
}

// Função para pesquisar utilizadores
export async function searchUsers(username: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  if (username.length < 2) {
      hideSearchResults();
      return;
  }

  try {
      const res = await fetch(`api/users/friends/search/${encodeURIComponent(username)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
          const data = await res.json();
          showSearchResults(data.users);
      }
  } catch (error) {
      console.error('Erro ao pesquisar utilizadores:', error);
  }
}

// Função para mostrar resultados da pesquisa
function showSearchResults(users: any[]): void {
  const searchResults = document.getElementById('searchResults');
  const searchResultsList = document.getElementById('searchResultsList');
  
  if (!searchResults || !searchResultsList) return;

  if (users.length === 0) {
      searchResultsList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum utilizador encontrado.</p>';
  } else {
      searchResultsList.innerHTML = users.map(user => `
          <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex items-center">
                  <img src="${user.avatar || 'assets/img/default-avatar.jpg'}" 
                       alt="Avatar" 
                       class="w-8 h-8 rounded-full mr-2">
                  <div>
                        <a href="#/profile/${user.id}" class="text-sm font-medium text-blue-600 hover:underline">
                        ${user.username}
                        </a>                  
                  </div>
              </div>
              ${user.is_friend ? 
                  '<span class="text-green-600 text-xs font-medium">Já é amigo</span>' :
                  `<button onclick="addFriend(${user.id})" 
                           class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      Adicionar
                   </button>`
              }
          </div>
      `).join('');
  }

  searchResults.classList.remove('hidden');
}

// Função para esconder resultados da pesquisa
function hideSearchResults(): void {
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
      searchResults.classList.add('hidden');
  }
}

// Função para adicionar amigo
export async function addFriend(friendId: number): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
      const res = await fetch('api/users/friends/add', {
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
          clearInputs('searchFriendsInput');
      } else {
          const data = await res.json();
          alert(data.error || 'Erro ao adicionar amigo.');
      }
  } catch (error) {
      console.error('Erro ao adicionar amigo:', error);
      alert('Erro ao adicionar amigo.');
  }
}

(window as any).addFriend = addFriend;

function updateFriendsUI(friends: Friend[]): void {
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

function updateOnlineFriends(friends: Friend[]): void {
  const container = document.getElementById('onlineFriendsList');
  const title = document.getElementById('onlineFriendsTitle');
  if (!container || !title) return;

  title.textContent = `Online (${friends.length})`;

  container.innerHTML = friends.length === 0
    ? '<p class="text-sm text-gray-500">Nenhum amigo online</p>'
    : friends.map(friend => `
      <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-center">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <img src="${friend.avatar || 'assets/img/default-avatar.jpg'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
          <a href="#/profile/${friend.id}" class="text-sm font-medium text-blue-600 hover:underline">
                        ${friend.username}
          </a>  
        </div>
      </div>
    `).join('');
}


function updateOfflineFriends(friends: Friend[]): void {
  const container = document.getElementById('offlineFriendsList');
  const title = document.getElementById('offlineFriendsTitle');
  if (!container || !title) return;

  title.textContent = `Offline (${friends.length})`;

  container.innerHTML = friends.length === 0
      ? '<p class="text-sm text-gray-500">Nenhum amigo offline</p>'
      : friends.map(friend => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex items-center">
            <div class="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <img src="${friend.avatar || 'assets/img/default-avatar.jpg'}" 
                 alt="Avatar" 
                 class="w-8 h-8 rounded-full mr-2 grayscale">
            <a href="#/profile/${friend.id}" class="text-sm font-medium text-blue-600 hover:underline">
                        ${friend.username}
            </a>  
          </div>
        </div>
      `).join('');
}


function formatGameDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Hoje, ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 2) return 'Ontem, ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('pt-PT') + ', ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

// Função global para desafiar amigos
(window as any).challengeFriend = (friendId: number) => {
  alert(`Funcionalidade de desafio será implementada! Amigo ID: ${friendId}`);
};

//////  TESTE FIM

export async function getProfile(): Promise<void> {
  hideSearchResults(); // Esconder resultados de pesquisa ao carregar perfil
  clearInputs('searchFriendsInput'); // Limpar campo de pesquisa
  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate('/login');
    return;
  }

  try {
    const res = await fetch('api/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data: Profile = await res.json();

    if (res.ok) {
      updateProfileUI(data);
      getGameHistory(); // Fetch game history after profile is loaded
      getFriendsForProfile(); // Fetch friends after profile is loaded
    } else {
      alert('Erro ao obter perfil.');
      if (res.status === 401) {
        // Token invalid, redirect to login
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
    }
  } catch {
    alert('Erro de conexão ao buscar perfil.');
  }
}

export async function updateProfile(newData: UpdateProfileData): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate('/login');
    return false;
  }

  const formData = new FormData();

  if (newData.newUsername) formData.append('newUsername', newData.newUsername);
  if (newData.newEmail) formData.append('newEmail', newData.newEmail);
  if (newData.newPassword) formData.append('newPassword', newData.newPassword);
  if (newData.newAvatar) formData.append('newAvatar', newData.newAvatar);
  
  try {
    const res = await fetch('api/users/updateProfile', {
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
    } else {
      const data = await res.json();
      alert(data.error);
      clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
      
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
      return false;
    }
  } catch {
    alert('Erro ao atualizar o perfil.');
    clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
    return false;
  }
}

function updateProfileUI(profile: Profile): void {
  const usernameEl = document.getElementById('profileUsername') as HTMLElement;
  const emailEl = document.getElementById('profileEmail') as HTMLElement;
  const avatarEl = document.getElementById('profileAvatar') as HTMLImageElement;
  const winsEl = document.getElementById('profileWins') as HTMLElement;
  const lossesEl = document.getElementById('profileLosses') as HTMLElement;

  if (usernameEl) usernameEl.textContent = profile.username;
  if (emailEl) emailEl.textContent = profile.email;
  if (avatarEl) avatarEl.src = profile.avatar || 'assets/img/default-avatar.jpg';
  if (winsEl) winsEl.textContent = profile.wins.toString();
  if (lossesEl) lossesEl.textContent = profile.losses.toString();

  // Also update edit form with current values
  prefillEditForm(profile);
}

function prefillEditForm(profile: Profile): void {
  const newUsernameInput = document.getElementById('newUsername') as HTMLInputElement;
  const newEmailInput = document.getElementById('newEmail') as HTMLInputElement;
  const avatarPreview = document.getElementById('avatarImageUpdate') as HTMLImageElement;

  if (newUsernameInput) newUsernameInput.placeholder = profile.username;
  if (newEmailInput) newEmailInput.placeholder = profile.email;
  if (avatarPreview) avatarPreview.src = profile.avatar || 'aseets/img/default-avatar.jpg';
}

export async function getUserProfile(userId: string): Promise<void> {

  const token = localStorage.getItem('authToken');
  console.log('Token:', userId);
  if (!token) {
    router.navigate('/login');
    return;
  }

  try {
    const res = await fetch(`api/users/profile/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data: Profile = await res.json();

    if (res.ok) {
      updateUserProfileUI(data);
      getUserGameHistory(userId); // Fetch game history after profile is loaded
    } else {
        alert('Erro ao obter perfil.');
        if (res.status === 401) {
        // Token invalid, redirect to login
        localStorage.removeItem('authToken');
        router.navigate('/login');
       }
        else {
        router.navigate('/dashboard');
        }
    }
  } catch {
    alert('Erro de conexão ao buscar perfil.');
  }
}

function updateUserProfileUI(profile: ProfileId): void {
  const usernameEl = document.getElementById('profileUsernameId') as HTMLElement;
  const avatarEl = document.getElementById('profileAvatarId') as HTMLImageElement;
  const winsEl = document.getElementById('profileWinsId') as HTMLElement;
  const lossesEl = document.getElementById('profileLossesId') as HTMLElement;

  if (usernameEl) usernameEl.textContent = profile.username;
  if (avatarEl) avatarEl.src = profile.avatar || 'assets/img/default-avatar.jpg';
  if (winsEl) winsEl.textContent = profile.wins.toString();
  if (lossesEl) lossesEl.textContent = profile.losses.toString();
}