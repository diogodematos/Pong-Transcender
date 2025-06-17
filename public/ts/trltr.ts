import i18next from 'i18next';
import en from './translation/en.json';
import fr from './translation/fr.json';

i18next.init({
  resources: {
    en: { translation: en },
    fr: { translation: fr }
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

// Definindo as traduções inline (você pode mover para arquivos JSON separados depois)
const resources = {
  en: {
    translation: {
      // Login Page
      "login": "Login",
      "usuario": "User",
      "senha": "Password",
      "nao_tem_conta": "Don't have an account? Register",
      
      // Register Page
      "new_user": "New User",
      "utilizador": "User",
      "password": "Password",
      "email": "Email",
      "avatar": "Avatar",
      "registar": "Register",
      "ja_tem_conta": "Already have an account? Login",
      
      // Profile Page
      "perfil": "Profile",
      "editar_perfil": "Edit Profile",
      "sair": "Logout",
      
      // Edit Profile Page
      "editar_perfil_titulo": "Edit Profile",
      "novo_nome_utilizador": "New Username",
      "novo_email": "New Email",
      "nova_password": "New Password",
      "novo_avatar": "New Avatar",
      "guardar_alteracoes": "Save Changes",
      "cancelar": "Cancel",
      
      // Modal
      "registo_concluido": "Registration Complete!",
      "registado_sucesso": "Successfully registered! You can now login.",
      
      // Language
      "languages": "Languages"
    }
  },
  pt: {
    translation: {
      // Login Page
      "login": "Login",
      "usuario": "Usuário",
      "senha": "Senha",
      "nao_tem_conta": "Não tem uma conta? Registe-se",
      
      // Register Page
      "new_user": "Novo Utilizador",
      "utilizador": "Utilizador",
      "password": "Password",
      "email": "Email",
      "avatar": "Avatar",
      "registar": "Registar",
      "ja_tem_conta": "Já tem uma conta? Faça login",
      
      // Profile Page
      "perfil": "Perfil",
      "editar_perfil": "Editar Perfil",
      "sair": "Sair",
      
      // Edit Profile Page
      "editar_perfil_titulo": "Editar Perfil",
      "novo_nome_utilizador": "Novo Nome de Utilizador",
      "novo_email": "Novo Email",
      "nova_password": "Nova Password",
      "novo_avatar": "Novo Avatar",
      "guardar_alteracoes": "Guardar Alterações",
      "cancelar": "Cancelar",
      
      // Modal
      "registo_concluido": "Registo Concluído!",
      "registado_sucesso": "Registado com sucesso! Ja pode fazer login.",
      
      // Language
      "languages": "Idiomas"
    }
  },
  fr: {
    translation: {
      // Login Page
      "login": "Connexion",
      "usuario": "Utilisateur",
      "senha": "Mot de passe",
      "nao_tem_conta": "Vous n'avez pas de compte? S'inscrire",
      
      // Register Page
      "new_user": "Nouvel Utilisateur",
      "utilizador": "Utilisateur",
      "password": "Mot de passe",
      "email": "Email",
      "avatar": "Avatar",
      "registar": "S'inscrire",
      "ja_tem_conta": "Vous avez déjà un compte? Se connecter",
      
      // Profile Page
      "perfil": "Profil",
      "editar_perfil": "Modifier le profil",
      "sair": "Déconnexion",
      
      // Edit Profile Page
      "editar_perfil_titulo": "Modifier le profil",
      "novo_nome_utilizador": "Nouveau nom d'utilisateur",
      "novo_email": "Nouvel email",
      "nova_password": "Nouveau mot de passe",
      "novo_avatar": "Nouvel avatar",
      "guardar_alteracoes": "Sauvegarder les modifications",
      "cancelar": "Annuler",
      
      // Modal
      "registo_concluido": "Inscription terminée!",
      "registado_sucesso": "Inscription réussie! Vous pouvez maintenant vous connecter.",
      
      // Language
      "languages": "Langues"
    }
  }
};

// Inicializar i18next
i18next.init({
  resources,
  lng: localStorage.getItem('lang') || 'pt', // Idioma padrão português
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

// Função para atualizar todos os textos da página
export function updatePageTranslations() {
  // Função helper para atualizar elemento se existir
  const updateElement = (id: string, translationKey: string, attribute: string = 'textContent') => {
    const element = document.getElementById(id);
    if (element) {
      if (attribute === 'textContent') {
        element.textContent = i18next.t(translationKey);
      } else if (attribute === 'placeholder') {
        (element as HTMLInputElement).placeholder = i18next.t(translationKey);
      }
    }
  };

  // Atualizar labels
  const updateLabel = (selector: string, translationKey: string) => {
    const label = document.querySelector(selector);
    if (label) {
      label.textContent = i18next.t(translationKey);
    }
  };

  // Login Page
  updateLabel('label[for="username"]', 'usuario');
  updateLabel('label[for="password"]', 'senha');
  updateElement('GoToRegisterPage', 'nao_tem_conta');

  // Register Page
  updateLabel('label[for="registerUsername"]', 'utilizador');
  updateLabel('label[for="registerPassword"]', 'password');
  updateLabel('label[for="registerEmail"]', 'email');
  updateLabel('label[for="registerAvatar"]', 'avatar');
  updateElement('GoToLoginPage', 'ja_tem_conta');

  // Profile Page
  updateElement('editProfileButton', 'editar_perfil');
  updateElement('logoutButton', 'sair');

  // Edit Profile Page
  updateLabel('label[for="newUsername"]', 'novo_nome_utilizador');
  updateLabel('label[for="newEmail"]', 'novo_email');
  updateLabel('label[for="newPassword"]', 'nova_password');
  updateLabel('label[for="newAvatar"]', 'novo_avatar');
  updateElement('saveProfileChangesButton', 'guardar_alteracoes');
  updateElement('cancelProfileChangesButton', 'cancelar');

  // Buttons
  const loginButton = document.querySelector('#loginForm button[type="submit"]');
  const registerButton = document.querySelector('#registerForm button[type="submit"]');
  const goToLoginButton = document.getElementById('goToLoginButton');

  if (loginButton) loginButton.textContent = i18next.t('login');
  if (registerButton) registerButton.textContent = i18next.t('registar');
  if (goToLoginButton) goToLoginButton.textContent = i18next.t('login');

  // Modal
  const modalTitle = document.querySelector('#registerSuccessModal h3');
  const modalText = document.querySelector('#registerSuccessModal p');
  if (modalTitle) modalTitle.textContent = i18next.t('registo_concluido');
  if (modalText) modalText.textContent = i18next.t('registado_sucesso');

  // Page titles
  const loginTitle = document.querySelector('#loginPage h2');
  const registerTitle = document.querySelector('#registerPage h2');
  const profileTitle = document.querySelector('#profilePage h2');
  const editProfileTitle = document.querySelector('#editProfilePage h2');

  if (loginTitle) {
    const img = loginTitle.querySelector('img');
    loginTitle.innerHTML = '';
    if (img) loginTitle.appendChild(img);
    loginTitle.appendChild(document.createTextNode(i18next.t('login')));
  }
  
  if (registerTitle) {
    const img = registerTitle.querySelector('img');
    registerTitle.innerHTML = '';
    if (img) registerTitle.appendChild(img);
    registerTitle.appendChild(document.createTextNode(i18next.t('new_user')));
  }
  
  if (profileTitle) profileTitle.textContent = i18next.t('perfil');
  if (editProfileTitle) editProfileTitle.textContent = i18next.t('editar_perfil_titulo');

  // Language button
  const languageButton = document.getElementById('languageButton');
  if (languageButton) {
    languageButton.textContent = i18next.t('languages') + ' ▾';
  }
}

// Listener para mudanças de idioma
i18next.on('languageChanged', () => {
  updatePageTranslations();
});

export default i18next;