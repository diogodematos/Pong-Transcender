import { get } from "http";
import { getProfile } from "./profile.js";

export function showLoginPage() {
    togglePages('loginPage');
  }
  
  export function showRegisterPage() {
    togglePages('registerPage');
  }
  
  export function showProfilePage() {
    getProfile();
    togglePages('profilePage');
  }
  
  export function showEditProfilePage() {
    togglePages('editProfilePage');
  }
  
  export function clearInputs(...ids: string[]) {
    ids.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = '';
    });
  }
  
  function togglePages(visiblePageId: string) {
    const pages = ['loginPage', 'registerPage', 'profilePage', 'editProfilePage'];
    pages.forEach(page => {
      const el = document.getElementById(page);
      if (el) el.classList.toggle('hidden', page !== visiblePageId);
    });
  }
  