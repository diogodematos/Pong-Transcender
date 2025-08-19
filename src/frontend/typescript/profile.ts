import { Profile, ProfileId, UpdateProfileData, GameHistoryResponse, FriendsResponse, GameHistoryItem, Friend } from './types.ts';
import { clearInputs } from './pages.ts';
import { router } from './router.ts';
import { setup2FA } from './auth.ts';

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

  // Clear existing content
  gameHistory.innerHTML = '';

  if (games.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-gray-500 text-center py-4';
    emptyMessage.textContent = 'Nenhum jogo jogado ainda.';
    gameHistory.appendChild(emptyMessage);
    return;
  }

  // Create each game history item safely
  games.forEach(game => {
    console.log('Opponent ID:', game.opponent_id);

    const isWin = game.result === 'win';
    const bgColor = isWin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = isWin ? 'text-green-700' : 'text-red-700';
    const resultText = isWin ? 'Vitória' : 'Derrota';
    const score = `${game.player_score} - ${game.opponent_score}`;
    const date = formatGameDate(game.played_at);

    // Create main container
    const gameContainer = document.createElement('div');
    gameContainer.className = `${bgColor} border p-3 rounded-lg`;

    // Create flex container
    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex justify-between items-center';

    // Create left side (result and opponent)
    const leftDiv = document.createElement('div');

    // Create result paragraph
    const resultP = document.createElement('p');
    resultP.className = `font-semibold ${textColor}`;
    resultP.textContent = resultText; // Safe with textContent

    // Create opponent link
    const opponentLink = document.createElement('a');
    opponentLink.href = `#/profile/${game.opponent_id}`;
    opponentLink.className = 'text-sm font-medium text-blue-600 hover:underline';
    opponentLink.textContent = game.opponent_name; // Safe with textContent - XSS protected!

    // Append to left div
    leftDiv.appendChild(resultP);
    leftDiv.appendChild(opponentLink);

    // Create right side (score and date)
    const rightDiv = document.createElement('div');
    rightDiv.className = 'text-right';

    // Create score paragraph
    const scoreP = document.createElement('p');
    scoreP.className = `font-bold ${textColor}`;
    scoreP.textContent = score; // Safe with textContent

    // Create date paragraph
    const dateP = document.createElement('p');
    dateP.className = 'text-xs text-gray-500';
    dateP.textContent = date; // Safe with textContent

    // Append to right div
    rightDiv.appendChild(scoreP);
    rightDiv.appendChild(dateP);

    // Assemble the complete structure
    flexContainer.appendChild(leftDiv);
    flexContainer.appendChild(rightDiv);
    gameContainer.appendChild(flexContainer);

    // Add to main container
    gameHistory.appendChild(gameContainer);
  });
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

  // Clear existing content
  gameHistory.innerHTML = '';

  if (games.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-gray-500 text-center py-4';
    emptyMessage.textContent = 'Nenhum jogo jogado ainda.';
    gameHistory.appendChild(emptyMessage);
    return;
  }

  // Create each game history item safely
  games.forEach(game => {
    console.log('Opponent ID:', game.opponent_id);

    const isWin = game.result === 'win';
    const bgColor = isWin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = isWin ? 'text-green-700' : 'text-red-700';
    const resultText = isWin ? 'Vitória' : 'Derrota';
    const score = `${game.player_score} - ${game.opponent_score}`;
    const date = formatGameDate(game.played_at);

    // Create main container
    const gameContainer = document.createElement('div');
    gameContainer.className = `${bgColor} border p-3 rounded-lg`;

    // Create flex container
    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex justify-between items-center';

    // Create left side (result and opponent)
    const leftDiv = document.createElement('div');

    // Create result paragraph
    const resultP = document.createElement('p');
    resultP.className = `font-semibold ${textColor}`;
    resultP.textContent = resultText; // Safe with textContent

    // Create opponent link
    const opponentLink = document.createElement('a');
    opponentLink.href = `#/profile/${game.opponent_id}`;
    opponentLink.className = 'text-sm font-medium text-blue-600 hover:underline';
    opponentLink.textContent = game.opponent_name; // Safe with textContent - XSS protected!

    // Append to left div
    leftDiv.appendChild(resultP);
    leftDiv.appendChild(opponentLink);

    // Create right side (score and date)
    const rightDiv = document.createElement('div');
    rightDiv.className = 'text-right';

    // Create score paragraph
    const scoreP = document.createElement('p');
    scoreP.className = `font-bold ${textColor}`;
    scoreP.textContent = score; // Safe with textContent

    // Create date paragraph
    const dateP = document.createElement('p');
    dateP.className = 'text-xs text-gray-500';
    dateP.textContent = date; // Safe with textContent

    // Append to right div
    rightDiv.appendChild(scoreP);
    rightDiv.appendChild(dateP);

    // Assemble the complete structure
    flexContainer.appendChild(leftDiv);
    flexContainer.appendChild(rightDiv);
    gameContainer.appendChild(flexContainer);

    // Add to main container
    gameHistory.appendChild(gameContainer);
  });
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

  // Clear existing content
  searchResultsList.innerHTML = '';

  if (users.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-gray-500 text-sm';
    emptyMessage.textContent = 'Nenhum utilizador encontrado.';
    searchResultsList.appendChild(emptyMessage);
  } else {
    // Create each user result safely
    users.forEach(user => {
      // Create main container
      const userContainer = document.createElement('div');
      userContainer.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200';

      // Create left side (avatar and username)
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center';

      // Create avatar image
      const avatarImg = document.createElement('img');
      avatarImg.src = user.avatar || 'assets/img/default-avatar.jpg'; // Note: Consider validating URLs too
      avatarImg.alt = 'Avatar';
      avatarImg.className = 'w-8 h-8 rounded-full mr-2';

      // Create username container
      const usernameDiv = document.createElement('div');

      // Create username link
      const usernameLink = document.createElement('a');
      usernameLink.href = `#/profile/${user.id}`;
      usernameLink.className = 'text-sm font-medium text-blue-600 hover:underline';
      usernameLink.textContent = user.username; // Safe with textContent - XSS protected!

      // Assemble left side
      usernameDiv.appendChild(usernameLink);
      leftDiv.appendChild(avatarImg);
      leftDiv.appendChild(usernameDiv);

      // Create right side (friend status or add button)
      let rightElement: HTMLElement;

      if (user.is_friend) {
        // Create "already friend" span
        rightElement = document.createElement('span');
        rightElement.className = 'text-green-600 text-xs font-medium';
        rightElement.textContent = 'Já é amigo';
      } else {
        // Create add friend button
        rightElement = document.createElement('button');
        rightElement.className = 'bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs';
        rightElement.textContent = 'Adicionar';
        
        // Add click event listener instead of onclick attribute (safer approach)
        rightElement.addEventListener('click', () => {
          addFriend(user.id);
        });
      }

      // Assemble the complete structure
      userContainer.appendChild(leftDiv);
      userContainer.appendChild(rightElement);

      // Add to results list
      searchResultsList.appendChild(userContainer);
    });
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

  // Update title (already safe with textContent)
  title.textContent = `Online (${friends.length})`;

  // Clear existing content
  container.innerHTML = '';

  if (friends.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-sm text-gray-500';
    emptyMessage.textContent = 'Nenhum amigo online';
    container.appendChild(emptyMessage);
  } else {
    // Create each friend item safely
    friends.forEach(friend => {
      // Create main container
      const friendContainer = document.createElement('div');
      friendContainer.className = 'flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200';

      // Create left side (status indicator, avatar, username)
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center';

      // Create online status indicator
      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full mr-2';

      // Create avatar image
      const avatarImg = document.createElement('img');
      avatarImg.src = friend.avatar || 'assets/img/default-avatar.jpg';
      avatarImg.alt = 'Avatar';
      avatarImg.className = 'w-8 h-8 rounded-full mr-2';

      // Create username link
      const usernameLink = document.createElement('a');
      usernameLink.href = `#/profile/${friend.id}`;
      usernameLink.className = 'text-sm font-medium text-blue-600 hover:underline';
      usernameLink.textContent = friend.username; // Safe with textContent - XSS protected!

      // Assemble left side
      leftDiv.appendChild(statusIndicator);
      leftDiv.appendChild(avatarImg);
      leftDiv.appendChild(usernameLink);

      // Assemble the complete structure
      friendContainer.appendChild(leftDiv);

      // Add to container
      container.appendChild(friendContainer);
    });
  }
}

function updateOfflineFriends(friends: Friend[]): void {
  const container = document.getElementById('offlineFriendsList');
  const title = document.getElementById('offlineFriendsTitle');
  if (!container || !title) return;

  // Update title (already safe with textContent)
  title.textContent = `Offline (${friends.length})`;

  // Clear existing content
  container.innerHTML = '';

  if (friends.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'text-sm text-gray-500';
    emptyMessage.textContent = 'Nenhum amigo offline';
    container.appendChild(emptyMessage);
  } else {
    // Create each friend item safely
    friends.forEach(friend => {
      // Create main container
      const friendContainer = document.createElement('div');
      friendContainer.className = 'flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200';

      // Create left side (status indicator, avatar, username)
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center';

      // Create offline status indicator
      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'w-3 h-3 bg-gray-400 rounded-full mr-2';

      // Create avatar image (note the grayscale class for offline friends)
      const avatarImg = document.createElement('img');
      avatarImg.src = friend.avatar || 'assets/img/default-avatar.jpg';
      avatarImg.alt = 'Avatar';
      avatarImg.className = 'w-8 h-8 rounded-full mr-2 grayscale';

      // Create username link
      const usernameLink = document.createElement('a');
      usernameLink.href = `#/profile/${friend.id}`;
      usernameLink.className = 'text-sm font-medium text-blue-600 hover:underline';
      usernameLink.textContent = friend.username; // Safe with textContent - XSS protected!

      // Assemble left side
      leftDiv.appendChild(statusIndicator);
      leftDiv.appendChild(avatarImg);
      leftDiv.appendChild(usernameLink);

      // Assemble the complete structure
      friendContainer.appendChild(leftDiv);

      // Add to container
      container.appendChild(friendContainer);
    });
  }
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

document.getElementById('enable2faButton')?.addEventListener('click', async () => {
  await setup2FA();
});