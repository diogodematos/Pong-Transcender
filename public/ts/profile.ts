import { Profile, UpdateProfileData } from './types.js';
import { clearInputs, showProfilePage } from './pages.js';

export async function getProfile(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch('/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data: Profile = await res.json();

    if (res.ok) {
      (document.getElementById('profileUsername') as HTMLElement).textContent = data.username;
      (document.getElementById('profileEmail') as HTMLElement).textContent = data.email;
      (document.getElementById('profileAvatar') as HTMLImageElement).src = data.avatar;
    } else {
      alert('Erro ao obter perfil.');
    }
  } catch {
    alert('Erro de conexão ao buscar perfil.');
  }
}

export async function updateProfile(newData: UpdateProfileData): Promise<void> {
  const token = localStorage.getItem('authToken');

  try {
    const res = await fetch('/users/updateProfile', {
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
      clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
    } else {
      const data = await res.json();
      alert(data.error);
    }
  } catch {
    alert('Erro ao atualizar o perfil.');
    clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
  }
}
