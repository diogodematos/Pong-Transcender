import { Profile, UpdateProfileData, GameHistoryResponse, FriendsResponse, GameHistoryItem, Friend } from './types.js';
import { clearInputs } from './pages.js';
import { router } from './router.js';
import { getTranslation } from './translations.js';

export async function getDashboard() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate('/login');
    return;
  }

  try {
    const res = await fetch('/users/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const userData: Profile = await res.json();

    if (res.ok) {
      const usernameDash = document.getElementById('dashboardUsername') as HTMLElement;
      const avatarDash = document.getElementById('dashboardAvatar') as HTMLImageElement;
      
      if (usernameDash) usernameDash.textContent = userData.username;
      if (avatarDash) avatarDash.src = userData.avatar || '/img/default-avatar.jpg';
    } else {
      alert(getTranslation('dashboard_error'));
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
    }
  } catch {
    alert(getTranslation('dashboard_error'));
  }
}

export async function getProfile(): Promise<void> {
  hideSearchResults();
  clearInputs('searchFriendsInput');

  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate('/login');
    return;
  }

  try {
    const res = await fetch('/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data: Profile = await res.json();

    if (res.ok) {
      updateProfileUI(data);
      getGameHistory();
      getFriendsForProfile();
    } else {
      alert(getTranslation('edit_error'));
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
    }
  } catch {
    alert(getTranslation('edit_error'));
  }
}

export async function getProfileByID(id: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    router.navigate('/login');
    return;
  }

  try {
    const res = await fetch(`/users/profile/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data: Profile = await res.json();

    if (res.ok) {
      updateProfileByIDUI(data);
      getGameHistoryByID(id);
      getFriendsForProfile();
    } else {
      alert(getTranslation('edit_error'));
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
    }
  } catch {
    alert(getTranslation('edit_error'));
  }
}

export async function getGameHistory(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch('/users/games/history', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data: GameHistoryResponse = await res.json();
      updateGameHistoryUI(data.games);
    }
  } catch (error) {
    console.error('Error loading game history:', error);
  }
}

export async function getGameHistoryByID(id: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch(`/users/games/history/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data: GameHistoryResponse = await res.json();
      updateGameHistoryUI(data.games);
    }
  } catch (error) {
    console.error('Error loading game history for ID:', error);
  }
}

export function updateProfileUI(profile: Profile): void {
  const usernameEl = document.getElementById('profileUsername') as HTMLElement;
  const emailEl = document.getElementById('profileEmail') as HTMLElement;
  const avatarEl = document.getElementById('profileAvatar') as HTMLImageElement;
  const winsEl = document.getElementById('profileWins') as HTMLElement;
  const lossesEl = document.getElementById('profileLosses') as HTMLElement;

  if (usernameEl) usernameEl.textContent = profile.username;
  if (emailEl) emailEl.textContent = profile.email;
  if (avatarEl) avatarEl.src = profile.avatar || '/img/default-avatar.jpg';
  if (winsEl) winsEl.textContent = profile.wins.toString();
  if (lossesEl) lossesEl.textContent = profile.losses.toString();

  prefillEditForm(profile);
}

function updateProfileByIDUI(profile: Profile): void {
  const usernameEl = document.getElementById('profileUsernameByID') as HTMLElement;
  const emailEl = document.getElementById('profileEmailByID') as HTMLElement;
  const avatarEl = document.getElementById('profileAvatarByID') as HTMLImageElement;
  const winsEl = document.getElementById('profileWinsByID') as HTMLElement;
  const lossesEl = document.getElementById('profileLossesByID') as HTMLElement;

  if (usernameEl) usernameEl.textContent = profile.username;
  if (emailEl) emailEl.textContent = profile.email;
  if (avatarEl) avatarEl.src = profile.avatar || '/img/default-avatar.jpg';
  if (winsEl) winsEl.textContent = profile.wins.toString();
  if (lossesEl) lossesEl.textContent = profile.losses.toString();
}

function prefillEditForm(profile: Profile): void {
  const newUsernameInput = document.getElementById('newUsername') as HTMLInputElement;
  const newEmailInput = document.getElementById('newEmail') as HTMLInputElement;
  const avatarPreview = document.getElementById('avatarImageUpdate') as HTMLImageElement;

  if (newUsernameInput) newUsernameInput.placeholder = profile.username;
  if (newEmailInput) newEmailInput.placeholder = profile.email;
  if (avatarPreview) avatarPreview.src = profile.avatar || '/img/default-avatar.jpg';
}

function updateGameHistoryUI(games: GameHistoryItem[]): void {
  const gameHistory = document.getElementById('gameHistory');
  if (!gameHistory) return;

  if (games.length === 0) {
    gameHistory.innerHTML = `<p class="text-gray-500 text-center py-4" data-i18n="game_history_none">${getTranslation('game_history_none')}</p>`;
    return;
  }

  gameHistory.innerHTML = games.map(game => {
    const isWin = game.result === 'win';
    const bgColor = isWin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = isWin ? 'text-green-700' : 'text-red-700';
    const resultText = getTranslation(isWin ? 'game_history_win' : 'game_history_loss');
    const score = `${game.player_score} - ${game.opponent_score}`;
    const date = formatGameDate(game.played_at);

    return `
      <div class="${bgColor} border p-3 rounded-lg">
        <div class="flex justify-between items-center">
          <div>
            <p class="font-semibold ${textColor}" data-i18n="${isWin ? 'game_history_win' : 'game_history_loss'}">${resultText}</p>
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

export async function getFriendsForProfile(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch('/users/friends', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data: FriendsResponse = await res.json();
      updateFriendsUI(data.friends);
    }
  } catch (error) {
    console.error('Error loading friends:', error);
  }
}

export async function searchUsers(username: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  if (username.length < 2) {
    hideSearchResults();
    return;
  }

  try {
    const res = await fetch(`/users/friends/search/${encodeURIComponent(username)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      showSearchResults(data.users);
    }
  } catch (error) {
    console.error('Error searching users:', error);
  }
}

function showSearchResults(users: any[]): void {
  const searchResults = document.getElementById('searchResults');
  const searchResultsList = document.getElementById('searchResultsList');
  
  if (!searchResults || !searchResultsList) return;

  if (users.length === 0) {
    searchResultsList.innerHTML = `<p class="text-gray-500 text-sm" data-i18n="profile_no_users_found">${getTranslation('profile_no_users_found')}</p>`;
  } else {
    searchResultsList.innerHTML = users.map(user => `
      <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center">
          <img src="${user.avatar || '/img/default-avatar.jpg'}" 
               alt="Avatar" 
               class="w-8 h-8 rounded-full mr-2">
          <div>
            <a href="#/profile/${user.id}" class="text-sm font-medium text-blue-600 hover:underline">
              ${user.username}
            </a>
          </div>
        </div>
        ${user.is_friend ? 
          `<span class="text-green-600 text-xs font-medium" data-i18n="profile_already_friend">${getTranslation('profile_already_friend')}</span>` :
          `<button onclick="addFriend(${user.id})" 
                   class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs" data-i18n="profile_add_friend">${getTranslation('profile_add_friend')}</button>`
        }
      </div>
    `).join('');
  }

  searchResults.classList.remove('hidden');
}

function hideSearchResults(): void {
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.classList.add('hidden');
  }
}

export async function addFriend(friendId: number): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch('/users/friends/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friendId }),
    });

    if (res.ok) {
      alert(getTranslation('profile_add_friend_success'));
      getFriendsForProfile();
      clearInputs('searchFriendsInput');
    } else {
      const data = await res.json();
      alert(data.error || getTranslation('profile_add_friend_error'));
    }
  } catch (error) {
    console.error('Error adding friend:', error);
    alert(getTranslation('profile_add_friend_error'));
  }
}

(window as any).addFriend = addFriend;

function updateFriendsUI(friends: Friend[]): void {
  const onlineFriends = friends.filter(f => f.is_online);
  const offlineFriends = friends.filter(f => !f.is_online);

  const onlineCount = document.querySelector('.text-green-600');
  if (onlineCount) {
    onlineCount.textContent = `${getTranslation('profile_online')} (${onlineFriends.length})`;
  }

  const offlineCount = document.querySelector('.text-gray-500');
  if (offlineCount) {
    offlineCount.textContent = `${getTranslation('profile_offline')} (${offlineFriends.length})`;
  }

  updateOnlineFriends(onlineFriends);
  updateOfflineFriends(offlineFriends);
}

function updateOnlineFriends(friends: Friend[]): void {
  const container = document.getElementById('onlineFriendsList');
  const title = document.getElementById('onlineFriendsTitle');
  if (!container || !title) return;

  title.textContent = `${getTranslation('profile_online')} (${friends.length})`;

  container.innerHTML = friends.length === 0
    ? `<p class="text-sm text-gray-500" data-i18n="profile_no_friends_online">${getTranslation('profile_no_friends_online')}</p>`
    : friends.map(friend => `
      <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-center">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <img src="${friend.avatar || '/img/default-avatar.jpg'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
          <span class="text-sm font-medium">${friend.username}</span>
        </div>
        <button onclick="challengeFriend(${friend.id})" class="bg-[#2f9b20] text-white px-2 py-1 rounded text-xs hover:bg-[#247a1a] transition-colors" data-i18n="profile_challenge">${getTranslation('profile_challenge')}</button>
      </div>
    `).join('');
}

function updateOfflineFriends(friends: Friend[]): void {
  const container = document.getElementById('offlineFriendsList');
  const title = document.getElementById('offlineFriendsTitle');
  if (!container || !title) return;

  title.textContent = `${getTranslation('profile_offline')} (${friends.length})`;

  container.innerHTML = friends.length === 0
    ? `<p class="text-sm text-gray-500" data-i18n="profile_no_friends_offline">${getTranslation('profile_no_friends_offline')}</p>`
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

function formatGameDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return `Hoje, ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 2) return `Ontem, ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  return `${date.toLocaleDateString('pt-PT')} ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatLastSeen(lastSeen?: string): string {
  if (!lastSeen) return getTranslation('last_seen_long_time');
  
  const date = new Date(lastSeen);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `Há ${diffMinutes}min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return getTranslation('last_seen_long_time');
}

(window as any).challengeFriend = (friendId: number) => {
  alert(`${getTranslation('challenge_friend')} Amigo ID: ${friendId}`);
};

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
    const res = await fetch('/users/updateProfile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (res.ok) {
      alert(getTranslation('edit_success'));
      clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
      router.navigate('/profile');
      return true;
    } else {
      const data = await res.json();
      alert(data.error || getTranslation('edit_error'));
      clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
      
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        router.navigate('/login');
      }
      return false;
    }
  } catch {
    alert(getTranslation('edit_error'));
    clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
    return false;
  }
}