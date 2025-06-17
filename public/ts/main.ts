import { login, register } from './auth.js';
import { getProfile, updateProfile } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage } from './pages.js';
import i18next, { updatePageTranslations } from './trltr.js';

// Adiciona ouvintes de eventos
window.onload = () => {
  checkAuth();
  setupEventListeners();
  setupLanguageSelector();
  
  // Atualizar traduções na inicialização
  updatePageTranslations();
};

function setupEventListeners() {
  // Login form
  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    login({
      username: (document.getElementById('username') as HTMLInputElement).value,
      password: (document.getElementById('password') as HTMLInputElement).value
    });
  });

  // Navigation buttons
  document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
    showRegisterPage();
    clearInputs('username', 'password');
  });

  document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
    showLoginPage();
    clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
  });

  document.getElementById('goToLoginButton')?.addEventListener('click', () => {
    showLoginPage();
    document.getElementById('registerSuccessModal')?.classList.add('hidden');
  });

  // Avatar preview handlers
  document.getElementById('registerAvatar')?.addEventListener('change', function(event: Event) {
    handleAvatarPreview(event, 'avatarImage');
  });

  document.getElementById('newAvatar')?.addEventListener('change', function(event: Event) {
    handleAvatarPreview(event, 'avatarImageUpdate');
  });

  // Register form
  document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('registerAvatar') as HTMLInputElement;
    register({
      username: (document.getElementById('registerUsername') as HTMLInputElement).value,
      password: (document.getElementById('registerPassword') as HTMLInputElement).value,
      email: (document.getElementById('registerEmail') as HTMLInputElement).value,
      avatar: fileInput?.files?.[0],
    });
  });

  // Profile management
  document.getElementById('logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    showLoginPage();
  });

  document.getElementById('editProfileButton')?.addEventListener('click', showEditProfilePage);

  document.getElementById('saveProfileChangesButton')?.addEventListener('click', () => {
    const fileInput = document.getElementById('newAvatar') as HTMLInputElement;
    updateProfile({
      newUsername: (document.getElementById('newUsername') as HTMLInputElement).value,
      newPassword: (document.getElementById('newPassword') as HTMLInputElement).value,
      newEmail: (document.getElementById('newEmail') as HTMLInputElement).value,
      newAvatar: fileInput?.files?.[0],
    });
  });

  document.getElementById('cancelProfileChangesButton')?.addEventListener('click', () => {
    showProfilePage();
    clearInputs('newUsername', 'newPassword', 'newEmail', 'newAvatar');
  });
}

function setupLanguageSelector() {
  // Configurar seletor de idioma atualizado
  const languageItems = document.querySelectorAll('.dropdown-item');
  const languageButton = document.getElementById('languageButton');
  
  languageItems.forEach(item => {
    item.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const selectedLang = target.getAttribute('data-lang');
      if (selectedLang) {
        // Mudar idioma
        i18next.changeLanguage(selectedLang);
        localStorage.setItem('lang', selectedLang);
        
        // Atualizar texto do botão
        const langNames = {
          'en': 'English',
          'pt': 'Português', 
          'fr': 'Français'
        };
        
        if (languageButton) {
          languageButton.textContent = langNames[selectedLang as keyof typeof langNames] + ' ▾';
        }
        
        // Atualizar todas as traduções
        updatePageTranslations();
      }
    });
  });

  // Definir idioma inicial no botão
  const currentLang = i18next.language || 'pt';
  const langNames = {
    'en': 'English',
    'pt': 'Português', 
    'fr': 'Français'
  };
  
  if (languageButton) {
    languageButton.textContent = langNames[currentLang as keyof typeof langNames] + ' ▾';
  }
}

function handleAvatarPreview(event: Event, previewId: string) {
  const target = event.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  const preview = document.getElementById(previewId) as HTMLImageElement;

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = function(e: ProgressEvent<FileReader>) {
      preview.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = previewId === 'avatarImage' ? '/img/default-avatar.jpg' : '';
  }
}

function checkAuth() {
  const token = localStorage.getItem('authToken');
  token ? showProfilePage() : showLoginPage();
}

// Google login
// function initGoogleSignIn() {
//   google.accounts.id.initialize({
//     client_id: "188335469204-dff0bjf48ubspckenk92t6730ade1o0i.apps.googleusercontent.com",
//     callback: handleGoogleLogin,
//   });

//   google.accounts.id.renderButton(
//     document.getElementById("googleSignInButton"),
//     { theme: "outline", size: "large" }
//   );
// }

// function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
//   fetch('/users/google-login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ idToken: response.credential }),
//   })
//     .then(res => res.json())
//     .then(data => {
//       if (data.token) {
//         localStorage.setItem('authToken', data.token);
//         getProfile();
//       } else {
//         alert('Erro com login do Google');
//       }
//     })
//     .catch(() => alert('Erro ao autenticar com Google.'));
// }
