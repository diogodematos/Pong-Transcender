declare namespace google {
  namespace accounts {
    namespace id {
      interface CredentialResponse {
        credential: string;
        select_by: string;
      }
      function initialize(config: any): void;
      function renderButton(element: HTMLElement | null, options: any): void;
      function prompt(): void;
      function revoke(args: any, callback: any): void;
    }
  }
}

import { login, register } from './auth.js';
import { getProfile, updateProfile } from './profile.js';
import { clearInputs, showLoginPage, showRegisterPage, showEditProfilePage, showProfilePage } from './pages.js';


// Adiciona ouvintes de eventos
window.onload = () => {
  checkAuth();
  // Inicializa o Google Sign-In
  initGoogleSignIn(); 

  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    login({
      username: (document.getElementById('username') as HTMLInputElement).value,
      password: (document.getElementById('password') as HTMLInputElement).value
    });
  });

  document.getElementById('GoToRegisterPage')?.addEventListener('click', () => {
    showRegisterPage();
    clearInputs('username', 'password');
  });

  document.getElementById('registerAvatar')?.addEventListener('change', function(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    const preview = document.getElementById('avatarImage') as HTMLImageElement;

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
            preview.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = '/img/default-avatar.jpg';
    }
  });

    document.getElementById('newAvatar')?.addEventListener('change', function(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    const preview = document.getElementById('avatarImageUpdate') as HTMLImageElement;

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e: ProgressEvent<FileReader>) {
            preview.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    } else {
        preview.src = ''; // Limpa a pré-visualização se o ficheiro não for uma imagem
    }
  });

  document.getElementById('goToLoginButton')?.addEventListener('click', () => {
    showLoginPage();
    document.getElementById('registerSuccessModal')?.classList.add('hidden'); // Oculta o modal
  });

  document.getElementById('GoToLoginPage')?.addEventListener('click', () => {
    showLoginPage();
    clearInputs('registerUsername', 'registerPassword', 'registerEmail', 'registerAvatar');
  });

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

};

function checkAuth() {
  const token = localStorage.getItem('authToken');
  token ? showProfilePage() : showLoginPage();
}

// Google login
function initGoogleSignIn() {
  google.accounts.id.initialize({
    client_id: "801178976948-j91b6t32p0i97628g02vnhvrsa9103b4.apps.googleusercontent.com", 
    callback: handleGoogleLogin,
    auto_select: false, // Define para false para desativar o "One-Tap" automático
  });

  // Renderiza o botão de login do Google
  google.accounts.id.renderButton(
    document.getElementById("googleSignInButton"),
    { theme: "outline", size: "large" }
  );

  // **NÃO** chame google.accounts.id.prompt() aqui se quiser evitar o pop-up automático
  // Se quiser que o pop-up apareça em algum momento, chame-o dentro de um listener de evento, por exemplo.
}

function handleGoogleLogin(response: google.accounts.id.CredentialResponse) {
  fetch('api/users/google-login', { // Certifique-se que o endpoint do backend está correto
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: response.credential }),
  })
    .then(res => {
        // Verifica se a resposta é OK (2xx) e se o conteúdo é JSON
        if (!res.ok) {
            // Se a resposta não for OK, tenta ler como texto ou JSON para depuração
            return res.text().then(text => {
                try {
                    // Tenta fazer parse como JSON se parecer JSON
                    const errorJson = JSON.parse(text);
                    throw new Error(errorJson.message || 'Erro desconhecido do servidor.');
                } catch {
                    // Caso contrário, retorna o texto bruto
                    throw new Error(`Erro do servidor: ${res.status} ${res.statusText} - ${text}`);
                }
            });
        }
        return res.json();
    })
    .then(data => {
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        getProfile(); // Carrega os dados do perfil após o login bem-sucedido
        showProfilePage(); // Navega para a página de perfil após o login
      } else {
        alert('Erro com login do Google: ' + (data.error || 'Detalhes desconhecidos'));
      }
    })
    .catch(error => {
        console.error('Erro ao autenticar com Google:', error);
        alert('Erro ao autenticar com Google. Verifique a consola para mais detalhes: ' + error.message);
    });
}