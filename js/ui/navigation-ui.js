import { state } from '../state.js';

export class NavigationUI {
  static init() {
    // Sidebar nav items
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const moduleKey = e.currentTarget.dataset.module;
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.setModule(moduleKey);
      });
    });

    // Sign out button
    document.getElementById('logout-btn').addEventListener('click', () => {
      document.getElementById('auth-portal').classList.remove('hidden');
    });

    // Auth portal tabs
    document.querySelectorAll('.auth-tab-btn').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.auth-tab-btn').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        const mode = e.target.dataset.tab;
        document.getElementById('signin-form').classList.toggle('hidden', mode !== 'signin');
        document.getElementById('signup-form').classList.toggle('hidden', mode !== 'signup');
        document.getElementById('demo-pass-section').classList.toggle('hidden', mode !== 'demo');
      });
    });

    // Demo pass login button
    document.getElementById('quick-demo-login-btn').addEventListener('click', () => {
      document.getElementById('auth-portal').classList.add('hidden');
    });
  }

  static updateHeader(title, desc) {
    document.getElementById('current-module-title').textContent = title;
    document.getElementById('current-module-desc').textContent = desc;
  }
}
