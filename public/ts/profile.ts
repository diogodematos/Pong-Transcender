import { Profile, UpdateProfileData } from './types.js';
import { clearInputs } from './pages.js';
import { router } from './router.js';

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

export async function getProfile(): Promise<void> {
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
    const res = await fetch('/users/updateProfile', {
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
  if (avatarEl) avatarEl.src = profile.avatar || '/img/default-avatar.jpg';
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
  if (avatarPreview) avatarPreview.src = profile.avatar || '/img/default-avatar.jpg';
}