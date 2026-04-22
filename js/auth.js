/**
 * AI Stock Photos - Supabase Auth Integration
 * Handles authentication: sign up, sign in, sign out, session management
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://placeholder.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_JjPB-j1A2pV2q8a8oYxapQ_686fREIH';

  let supabase = null;

  // Initialize Supabase client
  function initSupabase() {
    if (typeof window.supabase === 'undefined') {
      console.warn('Supabase library not loaded. Auth features will use fallback.');
      return false;
    }
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return true;
    } catch (e) {
      console.error('Supabase init failed:', e);
      return false;
    }
  }

  // Fallback local auth (when Supabase is unavailable)
  function getFallbackSession() {
    try {
      const data = localStorage.getItem('aisp_auth_session');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  function setFallbackSession(user) {
    try {
      localStorage.setItem('aisp_auth_session', JSON.stringify({
        user, access_token: 'fallback_token_' + Date.now(),
        expires_at: Date.now() + 86400000
      }));
    } catch {}
  }

  function clearFallbackSession() {
    localStorage.removeItem('aisp_auth_session');
  }

  // Auth state
  let currentUser = null;

  async function getSession() {
    if (supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) return data.session;
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) return { user: userData.user };
    }
    return getFallbackSession();
  }

  async function refreshUser() {
    const session = await getSession();
    currentUser = session?.user || null;
    updateAuthUI();
    return currentUser;
  }

  function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userMenu = document.getElementById('user-menu');
    if (!authBtn && !userMenu) return;

    if (currentUser) {
      const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
      const avatar = currentUser.user_metadata?.avatar_url;
      const initial = name.charAt(0).toUpperCase();

      if (authBtn) authBtn.classList.add('hidden');
      if (userMenu) {
        userMenu.classList.remove('hidden');
        const nameEl = userMenu.querySelector('.user-name');
        const avatarEl = userMenu.querySelector('.avatar-img');
        const placeholderEl = userMenu.querySelector('.avatar-placeholder');
        if (nameEl) nameEl.textContent = name;
        if (avatar && avatarEl) { avatarEl.src = avatar; avatarEl.classList.remove('hidden'); if (placeholderEl) placeholderEl.classList.add('hidden'); }
        else if (placeholderEl) { placeholderEl.textContent = initial; placeholderEl.classList.remove('hidden'); if (avatarEl) avatarEl.classList.add('hidden'); }
      }
    } else {
      if (authBtn) authBtn.classList.remove('hidden');
      if (userMenu) userMenu.classList.add('hidden');
    }
  }

  // Auth actions
  async function signUp(email, password, name) {
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        setFallbackSession(data.user);
        await refreshUser();
        return { success: true, user: data.user };
      }
      // Fallback
      const user = { id: 'fb_' + Date.now(), email, user_metadata: { full_name: name } };
      setFallbackSession(user);
      await refreshUser();
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function signIn(email, password) {
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setFallbackSession(data.user);
        await refreshUser();
        return { success: true, user: data.user };
      }
      const user = { id: 'fb_' + Date.now(), email, user_metadata: { full_name: email.split('@')[0] } };
      setFallbackSession(user);
      await refreshUser();
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function signInWithGoogle() {
    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + '/profile.html' }
        });
        if (error) throw error;
        return { success: true };
      }
      const user = { id: 'fb_google_' + Date.now(), email: 'google@example.com', user_metadata: { full_name: 'Google User', avatar_url: '' } };
      setFallbackSession(user);
      await refreshUser();
      window.location.href = 'profile.html';
      return { success: true, user };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async function signOut() {
    try {
      if (supabase) await supabase.auth.signOut();
      clearFallbackSession();
      currentUser = null;
      updateAuthUI();
      window.location.href = 'index.html';
    } catch (e) {
      console.error('Sign out error:', e);
      clearFallbackSession();
      currentUser = null;
      window.location.href = 'index.html';
    }
  }

  async function resetPassword(email) {
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth.html'
        });
        if (error) throw error;
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Expose to global
  window.Auth = {
    init: initSupabase,
    refreshUser,
    getSession,
    getUser: () => currentUser,
    signUp, signIn, signInWithGoogle, signOut, resetPassword
  };

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    refreshUser();

    // Bind logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', signOut);
    });

    // Bind user menu navigation
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.addEventListener('click', () => {
        window.location.href = 'profile.html';
      });
    }
  });
})();
