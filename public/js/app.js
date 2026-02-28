/* ================================================================
   Muscle Up Tracker - SPA Client
   Hash-based routing, API integration, timer, progress logging
   ================================================================ */

const $ = (s) => document.querySelector(s);
const app = $('#app');
const nav = $('#nav');
let LEVELS = [];
let currentUser = null;

// Apply theme to document
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// ===== API HELPER =====
async function api(path, opts = {}) {
  const res = await fetch(`${window.API_URL}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && !path.includes('/auth/')) {
    currentUser = null;
    navigate('/login');
    return null;
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// ===== ROUTING =====
function navigate(path) { window.location.hash = '#' + path; }

function getSetPasswordTokenFromUrl() {
  if (window.location.pathname !== '/set-password') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || params.get('set_password_token') || null;
}

async function handleSetPasswordFlow() {
  const token = getSetPasswordTokenFromUrl();
  if (!token) {
    navigate('/login');
    return;
  }
  nav.style.display = 'none';
  app.innerHTML = '<div class="auth-page"><div class="auth-card"><p class="auth-sub">Checking link…</p></div></div>';
  try {
    const data = await api(`/auth/validate-set-password-token?token=${encodeURIComponent(token)}`);
    if (!data || !data.user) {
      app.innerHTML = `<div class="auth-page"><div class="auth-card"><div class="alert alert-error">This link is invalid or has expired.</div><p class="auth-footer auth-footer-links"><a href="#/login">Back to log in</a> · <a href="#/forgot-password">Forgot password?</a></p></div></div>`;
      return;
    }
    currentUser = data.user;
    showSetPasswordModal(token);
  } catch (err) {
    app.innerHTML = `<div class="auth-page"><div class="auth-card"><div class="alert alert-error">${esc(err.message)}</div><p class="auth-footer auth-footer-links"><a href="#/login">Back to log in</a> · <a href="#/forgot-password">Forgot password?</a></p></div></div>`;
  }
}

function showSetPasswordModal(token) {
  const modal = $('#setPasswordModal');
  const errEl = $('#setPasswordError');
  const form = $('#setPasswordForm');
  if (!modal || !form) return;
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  form.newPassword.value = '';
  form.confirmNewPassword.value = '';
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('modal-overlay--visible');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const newPassword = form.newPassword.value;
    const confirmNewPassword = form.confirmNewPassword.value;
    if (newPassword !== confirmNewPassword) {
      if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = ''; }
      return;
    }
    if (newPassword.length < 6) {
      if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = ''; }
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    if (errEl) errEl.style.display = 'none';
    try {
      await api('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      closeSetPasswordModal();
      window.history.replaceState(null, '', window.location.origin + '/');
      navigate('/dashboard');
      toast('Password set. Welcome!', true);
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || 'Failed to set password.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Set password & continue'; }
    }
  };
}

function closeSetPasswordModal() {
  const modal = $('#setPasswordModal');
  if (modal) {
    modal.classList.remove('modal-overlay--visible');
    modal.setAttribute('aria-hidden', 'true');
  }
}

async function router() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');

  if (!currentUser && !['/login', '/register', '/forgot-password'].includes(path)) {
    try {
      const me = await api('/auth/me');
      if (me?.authenticated) {
        currentUser = me.user;
        applyTheme(currentUser.theme);
      } else {
        navigate('/login');
        return;
      }
    } catch {
      navigate('/login');
      return;
    }
  }

  if (!['/login', '/register', '/forgot-password'].includes(path) && !LEVELS.length) {
    try {
      const data = await api('/levels');
      if (Array.isArray(data)) LEVELS = data;
    } catch {
      LEVELS = [];
    }
  }

  nav.style.display = currentUser ? '' : 'none';
  if (currentUser) $('#navUser').textContent = currentUser.display_name;

  if (path === '/login') return renderLogin();
  if (path === '/register') return renderRegister();
  if (path === '/forgot-password') return renderForgotPassword();
  if (path === '/dashboard') return renderDashboard();
  if (path === '/progress') return renderProgress();
  if (path === '/ebook') return renderEbook();
  if (path === '/settings') return renderSettings();
  if (path.startsWith('/level/')) return renderLevel(parseInt(path.split('/')[2]));

  navigate(currentUser ? '/dashboard' : '/login');
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async () => {
  if (getSetPasswordTokenFromUrl()) {
    await handleSetPasswordFlow();
    return;
  }
  router();
});

// Logout
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    currentUser = null;
    const t = document.getElementById('toast');
    if (t) t.classList.remove('toast--visible');
    navigate('/login');
  }
});

// ===== PAGE RENDERERS =====

function renderLogin() {
  nav.style.display = 'none';
  app.innerHTML = `
    <div class="auth-page">
      ${heroHtml('hero--auth')}
      <div class="auth-card">
        <div class="auth-brand"><img src="/assets/images/bwgymdarklogo.jpg" alt="The Bodyweight Gym" class="auth-brand-img auth-brand-img--dark"><img src="/assets/images/bwlogo.png" alt="The Bodyweight Gym" class="auth-brand-img auth-brand-img--light"></div>
        <h1>Welcome back</h1>
        <p class="auth-sub">Log in to track your muscle up progress.</p>
        <div class="alert alert-error" id="authError" style="display:none"></div>
        <form class="auth-form" id="loginForm">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••">
          <button type="submit" class="btn btn-primary btn-full">Log In</button>
        </form>
        <p class="auth-footer auth-footer-links">
          <a href="#/forgot-password">Forgot password?</a><br>
          Don't have an account? <a href="#/register">Sign up</a>
        </p>
      </div>
    </div>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Logging in...';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: f.email.value, password: f.password.value }),
      });
      currentUser = data.user;
      applyTheme(currentUser.theme);
      navigate('/dashboard');
    } catch (err) {
      const el = $('#authError');
      el.textContent = err.message;
      el.style.display = '';
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };
}

function renderRegister() {
  nav.style.display = 'none';
  app.innerHTML = `
    <div class="auth-page">
      ${heroHtml('hero--auth')}
      <div class="auth-card">
        <div class="auth-brand"><img src="/assets/images/bwgymdarklogo.jpg" alt="The Bodyweight Gym" class="auth-brand-img auth-brand-img--dark"><img src="/assets/images/bwlogo.png" alt="The Bodyweight Gym" class="auth-brand-img auth-brand-img--light"></div>
        <h1>Create your account</h1>
        <p class="auth-sub">Start tracking your muscle up journey.</p>
        <div class="alert alert-error" id="authError" style="display:none"></div>
        <form class="auth-form" id="registerForm">
          <label for="display_name">Your name</label>
          <input type="text" id="display_name" name="display_name" required autocomplete="name" placeholder="First name">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" placeholder="At least 6 characters">
          <label for="confirm_password">Confirm password</label>
          <input type="password" id="confirm_password" name="confirm_password" required minlength="6" autocomplete="new-password" placeholder="••••••••">
          <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login">Log in</a></p>
      </div>
    </div>`;
  $('#registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account...';
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          display_name: f.display_name.value,
          email: f.email.value,
          password: f.password.value,
          confirm_password: f.confirm_password.value,
        }),
      });
      currentUser = data.user;
      applyTheme(currentUser.theme);
      navigate('/dashboard');
    } catch (err) {
      const el = $('#authError');
      el.textContent = err.message;
      el.style.display = '';
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };
}

function renderForgotPassword() {
  nav.style.display = 'none';
  app.innerHTML = `
    <div class="auth-page">
      ${heroHtml('hero--auth')}
      <div class="auth-card">
        <div class="auth-brand"><img src="/assets/images/bwgymdarklogo.jpg" alt="The Bodyweight Gym" class="auth-brand-img auth-brand-img--dark"><img src="/assets/images/bwlogo.png" alt="The Bodyweight Gym" class="auth-brand-img auth-brand-img--light"></div>
        <h1>Reset password</h1>
        <p class="auth-sub">Enter your email and we'll send you a link to set a new password.</p>
        <div class="alert alert-error" id="authError" style="display:none"></div>
        <div class="alert alert-success" id="authSuccess" style="display:none"></div>
        <div class="auth-dev-reset" id="authDevReset" style="display:none"></div>
        <form class="auth-form" id="forgotPasswordForm">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com">
          <button type="submit" class="btn btn-primary btn-full">Send reset link</button>
        </form>
        <p class="auth-footer"><a href="#/login">Back to log in</a></p>
      </div>
    </div>`;
  $('#forgotPasswordForm').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const errEl = $('#authError');
    const successEl = $('#authSuccess');
    const devResetEl = $('#authDevReset');
    if (errEl) errEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
    if (devResetEl) { devResetEl.style.display = 'none'; devResetEl.innerHTML = ''; }
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: f.email.value.trim() }),
      });
      if (successEl) {
        successEl.textContent = "If an account exists for that email, we've sent you a link to set a new password. Check your inbox and spam folder.";
        successEl.style.display = '';
      }
      if (data && data.devResetToken && devResetEl) {
        const origin = window.location.origin;
        const resetUrl = `${origin}/set-password?token=${encodeURIComponent(data.devResetToken)}`;
        devResetEl.innerHTML = `<strong>Development:</strong> No email sent. Use this link to set your password: <a href="${esc(resetUrl)}">Set password</a>`;
        devResetEl.style.display = '';
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Send reset link'; }
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || 'Something went wrong.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Send reset link'; }
    }
  };
}

async function renderDashboard() {
  app.innerHTML = '<div class="container"><p class="auth-sub">Loading…</p></div>';
  try {
    const d = await api('/dashboard');
    if (!d) return;
    const { user, graduations, recentLogs, totalSessions, streak } = d;
    currentUser = user;

    const levelMeta = [
      { num:1, title:'Foundation', sub:'Ring hangs · Rows · Push-ups · Support' },
      { num:2, title:'Pull & Push', sub:'Pull-ups · Dips · False grip hangs' },
      { num:3, title:'False Grip Integration', sub:'False grip pulls · Ring dips · Bent arm holds' },
      { num:4, title:'Eccentric Control', sub:'Negative muscle ups · Deep dips' },
      { num:5, title:'First Muscle Up', sub:'Attempts · Transition catch · High pulls' },
      { num:6, title:'Conditioning', sub:'Volume · EMOM · Complexes' },
    ];

    const gradSet = new Set(graduations.map(g => g.level));

    app.innerHTML = `
      <div class="container">
        ${heroHtml()}
        <section class="stats-bar">
          <div class="stat"><div class="stat-num">${user.current_level}</div><div class="stat-label">Current Level</div></div>
          <div class="stat"><div class="stat-num">${totalSessions}</div><div class="stat-label">Sessions</div></div>
          <div class="stat"><div class="stat-num">${streak}</div><div class="stat-label">Day Streak</div></div>
          <div class="stat"><div class="stat-num">${graduations.length}</div><div class="stat-label">Graduated</div></div>
        </section>
        <h2 class="section-heading">Your Programme</h2>
        <div class="level-grid">
          ${levelMeta.map(lv => {
            const done = gradSet.has(lv.num);
            const current = lv.num === user.current_level;
            const locked = lv.num > user.current_level && !done;
            const cls = ['level-card', current && 'level-card--current', done && 'level-card--done', locked && 'level-card--locked'].filter(Boolean).join(' ');
            return `
              <a href="#/level/${lv.num}" class="${cls}">
                <div class="level-card-num">${done ? '✓' : lv.num}</div>
                <div class="level-card-body">
                  <div class="level-card-title">${lv.title}</div>
                  <div class="level-card-sub">${lv.sub}</div>
                  ${current ? '<span class="badge badge-accent">Current</span>' : ''}
                  ${done ? '<span class="badge badge-success">Graduated</span>' : ''}
                </div>
                <div class="level-card-arrow">›</div>
              </a>`;
          }).join('')}
        </div>
        <section class="ebook-dash-section">
          <h2 class="section-heading">Your Progress</h2>
          <a href="#/progress" class="ebook-dash-card">
            <div class="ebook-dash-icon">📊</div>
            <div class="ebook-dash-body">
              <div class="ebook-dash-title">Progress Dashboard</div>
              <div class="ebook-dash-sub">Streaks, heatmap, personal bests &amp; more</div>
            </div>
            <div class="ebook-dash-arrow">›</div>
          </a>
        </section>
        <section class="ebook-dash-section">
          <h2 class="section-heading">Your Ebook</h2>
          <a href="#/ebook" class="ebook-dash-card">
            <div class="ebook-dash-icon">📖</div>
            <div class="ebook-dash-body">
              <div class="ebook-dash-title">The Muscle Up - The Complete Training Guide</div>
              <div class="ebook-dash-sub">View or download your guide anytime.</div>
            </div>
            <div class="ebook-dash-arrow">›</div>
          </a>
        </section>
        ${recentLogs.length ? `
          <h2 class="section-heading">Recent Activity</h2>
          <div class="activity-list">
            ${recentLogs.map(log => `
              <div class="activity-row">
                <div class="activity-level">L${log.level}</div>
                <div class="activity-body">
                  <div class="activity-name">${log.exercise_key.replace(/_/g, ' ').replace(/\d+$/, '')}</div>
                  <div class="activity-detail">${log.sets_completed} sets${log.hold_time_seconds ? ' · ' + log.hold_time_seconds + 's hold' : ''}${log.notes ? ' · ' + esc(log.notes) : ''}</div>
                </div>
                <div class="activity-date">${fmtDate(log.session_date)}</div>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  } catch (err) {
    app.innerHTML = `<div class="container"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

// ===== EBOOK =====
function renderEbook() {
  app.innerHTML = `
    <div class="container">
      ${heroHtml()}
      <div class="page-header">
        <a href="#/dashboard" class="back-link">← Dashboard</a>
        <h1>Training Guide</h1>
        <p class="auth-sub">The Muscle Up — The Complete Training Guide</p>
      </div>
      <div class="ebook-hero">
        <div class="ebook-hero-cover">
          <img src="${ASSETS_BASE}/coverpage.png" alt="The Muscle Up — The Complete Training Guide" class="ebook-cover-img">
        </div>
        <div class="ebook-hero-body">
          <h2 class="ebook-title">From Zero to Muscle Up</h2>
          <p class="ebook-desc">Your complete programme lives in the guide: levels 1–6, exercises, progressions, and graduation tests. Read it online anytime or download for offline use.</p>
          <div class="ebook-actions">
            <button type="button" class="btn btn-primary btn-full ebook-btn-primary" id="ebookViewBtn">
              <span class="ebook-btn-icon">📖</span> View &amp; read online
            </button>
            <p class="ebook-download-hint">PDF and ePub downloads are available inside the reader (tap the download icon in the toolbar).</p>
          </div>
        </div>
      </div>
      <div class="ebook-features">
        <div class="ebook-feature">
          <span class="ebook-feature-icon">📑</span>
          <div>
            <strong>Table of contents</strong>
            <span>Jump to any chapter from the sidebar.</span>
          </div>
        </div>
        <div class="ebook-feature">
          <span class="ebook-feature-icon">🌙</span>
          <div>
            <strong>Light, sepia &amp; dark</strong>
            <span>Choose a theme that suits you.</span>
          </div>
        </div>
        <div class="ebook-feature">
          <span class="ebook-feature-icon">⬇️</span>
          <div>
            <strong>Download anytime</strong>
            <span>Export as PDF (print) or ePub for Apple Books, Kindle, Kobo.</span>
          </div>
        </div>
      </div>
    </div>`;
  $('#ebookViewBtn').addEventListener('click', openEbook);
}

function openEbook() {
  const url = window.location.origin + '/assets/ebook.html';
  window.open(url, '_blank', 'noopener,noreferrer');
  toast('Opening your training guide…', true);
}

// ===== SETTINGS =====
async function renderSettings() {
  if (!currentUser) return navigate('/login');

  const theme = currentUser.theme || 'dark';

  app.innerHTML = `
    <div class="container">
      ${heroHtml()}
      <div class="page-header">
        <a href="#/dashboard" class="back-link">← Dashboard</a>
        <h1>Settings</h1>
      </div>

      <div class="settings-section">
        <h2>Account</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Display Name</span>
              <span class="setting-value">${esc(currentUser.display_name)}</span>
            </div>
            <button class="btn btn--secondary" id="editNameBtn">Edit</button>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Email</span>
              <span class="setting-value">${esc(currentUser.email)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Appearance</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Theme</span>
              <span class="setting-sub">Switch between light and dark mode</span>
            </div>
            <div class="theme-toggle">
              <button class="theme-btn ${theme === 'dark' ? 'active' : ''}" data-theme="dark" title="Dark">🌙</button>
              <button class="theme-btn ${theme === 'light' ? 'active' : ''}" data-theme="light" title="Light">☀️</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>Password</h2>
        <div class="settings-card">
          <button class="btn btn--secondary" id="changePasswordBtn">Change Password</button>
        </div>
      </div>

      <div class="settings-section">
        <h2>Progress</h2>
        <div class="settings-card">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Unlock All Levels</span>
              <span class="setting-sub">Skip to Level 6 and mark all levels as complete</span>
            </div>
            <button class="btn btn--secondary" id="unlockAllBtn">Unlock All</button>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Reset Progress</span>
              <span class="setting-sub danger-text">Delete all workout logs and start over from Level 1</span>
            </div>
            <button class="btn btn--danger" id="resetProgressBtn">Reset All</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2>About</h2>
        <div class="settings-card">
          <p class="about-text">Muscle Up Tracker v1.0<br>Built for ring muscle up dreams</p>
        </div>
      </div>
    </div>
  `;

  // Theme toggle
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newTheme = btn.dataset.theme;
      try {
        const data = await api('/auth/settings', {
          method: 'PUT',
          body: JSON.stringify({ theme: newTheme })
        });
        if (data && data.user) {
          currentUser = data.user;
          document.documentElement.setAttribute('data-theme', newTheme);
          document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          toast('Theme updated!', true);
        }
      } catch (err) {
        toast(err.message, false);
      }
    });
  });

  document.documentElement.setAttribute('data-theme', theme);

  $('#changePasswordBtn')?.addEventListener('click', () => showChangePasswordModal());
  $('#editNameBtn')?.addEventListener('click', () => showEditNameModal());

  $('#unlockAllBtn')?.addEventListener('click', async () => {
    if (!confirm('This will unlock all 6 levels and mark them as complete. Continue?')) return;
    try {
      await api('/auth/unlock-all', { method: 'POST' });
      currentUser.current_level = 6;
      toast('All levels unlocked!', true);
    } catch (err) {
      toast(err.message, false);
    }
  });

  $('#resetProgressBtn')?.addEventListener('click', async () => {
    if (!confirm('This will DELETE all your workout logs and reset you to Level 1. This cannot be undone! Are you sure?')) return;
    if (!confirm('Really? All progress will be lost forever.')) return;
    try {
      await api('/auth/reset-progress', { method: 'POST' });
      currentUser.current_level = 1;
      toast('Progress reset. Good luck!', true);
      navigate('/dashboard');
    } catch (err) {
      toast(err.message, false);
    }
  });
}

function showChangePasswordModal() {
  const modal = $('#changePasswordModal');
  if (!modal) {
    const modalHtml = `
      <div class="modal-overlay" id="changePasswordModal" aria-hidden="true">
        <div class="modal">
          <h3>Change Password</h3>
          <form id="changePasswordForm">
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input type="password" id="currentPassword" name="current_password" required>
            </div>
            <div class="form-group">
              <label for="newPasswordChg">New Password</label>
              <input type="password" id="newPasswordChg" name="new_password" required minlength="6">
            </div>
            <div class="form-group">
              <label for="confirmNewPasswordChg">Confirm New Password</label>
              <input type="password" id="confirmNewPasswordChg" name="confirm_password" required>
            </div>
            <div class="alert alert-error" id="changePasswordError" style="display:none"></div>
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" id="cancelChangePassword">Cancel</button>
              <button type="submit" class="btn btn--primary">Change Password</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  const modalEl = $('#changePasswordModal');
  const form = $('#changePasswordForm');
  const errEl = $('#changePasswordError');
  const cancelBtn = $('#cancelChangePassword');

  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  form.reset();
  modalEl.classList.add('modal-overlay--visible');
  modalEl.setAttribute('aria-hidden', 'false');

  cancelBtn?.addEventListener('click', () => {
    modalEl.classList.remove('modal-overlay--visible');
    modalEl.setAttribute('aria-hidden', 'true');
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const current_password = form.current_password.value;
    const new_password = form.new_password.value;
    const confirm_password = form.confirm_password.value;

    if (new_password !== confirm_password) {
      if (errEl) { errEl.textContent = 'New passwords do not match.'; errEl.style.display = ''; }
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    if (errEl) errEl.style.display = 'none';

    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password, new_password, confirm_password })
      });
      modalEl.classList.remove('modal-overlay--visible');
      modalEl.setAttribute('aria-hidden', 'true');
      toast('Password changed successfully!', true);
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || 'Failed to change password.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Change Password'; }
    }
  };
}

function showEditNameModal() {
  const modal = $('#editNameModal');
  if (!modal) {
    const modalHtml = `
      <div class="modal-overlay" id="editNameModal" aria-hidden="true">
        <div class="modal">
          <h3>Edit Display Name</h3>
          <form id="editNameForm">
            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input type="text" id="displayName" name="display_name" required minlength="1" maxlength="100">
            </div>
            <div class="alert alert-error" id="editNameError" style="display:none"></div>
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" id="cancelEditName">Cancel</button>
              <button type="submit" class="btn btn--primary">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  const modalEl = $('#editNameModal');
  const form = $('#editNameForm');
  const errEl = $('#editNameError');
  const cancelBtn = $('#cancelEditName');

  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  form.display_name.value = currentUser.display_name || '';
  modalEl.classList.add('modal-overlay--visible');
  modalEl.setAttribute('aria-hidden', 'false');

  cancelBtn?.addEventListener('click', () => {
    modalEl.classList.remove('modal-overlay--visible');
    modalEl.setAttribute('aria-hidden', 'true');
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const display_name = form.display_name.value.trim();
    if (!display_name) {
      if (errEl) { errEl.textContent = 'Display name cannot be empty.'; errEl.style.display = ''; }
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    if (errEl) errEl.style.display = 'none';

    try {
      const data = await api('/auth/settings', {
        method: 'PUT',
        body: JSON.stringify({ display_name })
      });
      if (data && data.user) {
        currentUser = data.user;
        $('#navUser').textContent = currentUser.display_name;
        modalEl.classList.remove('modal-overlay--visible');
        modalEl.setAttribute('aria-hidden', 'true');
        toast('Name updated!', true);
        renderSettings();
      }
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || 'Failed to update name.'; errEl.style.display = ''; }
      if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
    }
  };
}

async function renderLevel(num) {
  num = parseInt(num, 10);
  if (!Number.isInteger(num) || num < 1 || num > 6 || !LEVELS.length) return navigate('/dashboard');
  const levelData = LEVELS[num - 1];
  if (!levelData) return navigate('/dashboard');
  app.innerHTML = '<div class="container"><p class="auth-sub">Loading…</p></div>';

  try {
    const d = await api(`/levels/${num}/logs`);
    if (!d) return;
    const { logs, graduated } = d;

    app.innerHTML = `
      <div class="container">
        ${heroHtml()}
        <div class="level-header">
          <a href="#/dashboard" class="back-link">← Dashboard</a>
          <div class="level-header-num">Level ${num}</div>
          <h1>${esc(levelData.title)}</h1>
          <p class="level-header-sub">${esc(levelData.subtitle)}</p>
          ${graduated ? `<span class="badge badge-success">Graduated ${fmtDate(graduated.graduated_at)}</span>` : ''}
        </div>

        <!-- Timer -->
        <div class="timer-widget" id="timer">
          <div class="timer-display" id="timerDisplay">0:00</div>
          <div class="timer-controls">
            <button class="btn btn-sm btn-ghost" data-time="30">0:30</button>
            <button class="btn btn-sm btn-ghost" data-time="60">1:00</button>
            <button class="btn btn-sm btn-ghost" data-time="120">2:00</button>
            <button class="btn btn-sm btn-ghost" data-time="600">10:00</button>
            <button class="btn btn-sm btn-ghost" data-time="900">15:00</button>
          </div>
          <div class="timer-actions">
            <button class="btn btn-primary btn-sm" id="timerStart">Start</button>
            <button class="btn btn-ghost btn-sm" id="timerReset">Reset</button>
          </div>
          <div class="timer-elapsed" id="timerElapsed"></div>
        </div>

        <!-- Exercises -->
        ${levelData.exercises.map((ex, i) => {
          const vid = extractVideoId(ex.video);
          const vidStart = extractStartTime(ex.video);
          const embedUrl = vid ? `https://www.youtube.com/embed/${vid}${vidStart ? '?start=' + vidStart : ''}` : '';
          const images = getImagesForExercise(ex);
          const imgHtml = images.length === 0 ? '' : images.length === 1
            ? `<div class="exercise-img-wrap"><img src="${ASSETS_BASE}/${images[0]}" alt="${esc(ex.name)}" class="exercise-img" loading="lazy"></div>`
            : `<div class="exercise-progression">${images.map((file, j) => `<img src="${ASSETS_BASE}/${file}" alt="${esc(ex.name)} (${j + 1}/${images.length})" class="exercise-img" loading="lazy">`).join('')}</div>`;
          return `
            <div class="exercise-card" id="ex-${ex.key}">
              <div class="exercise-card-header">
                <h3>${esc(ex.name)}</h3>
                <div class="exercise-rx">${esc(ex.rx)}</div>
              </div>
              ${imgHtml}
              ${vid ? `<div class="video-wrap"><iframe src="${embedUrl}" title="${esc(ex.name)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : ''}
              <form class="log-form" data-level="${num}" data-key="${ex.key}">
                <div class="log-form-row">
                  <div class="form-group"><label>Sets</label><input type="number" name="sets_completed" min="0" max="20" value="3" inputmode="numeric"></div>
                  <div class="form-group"><label>Reps / Duration</label><input type="text" name="reps_or_duration" placeholder="e.g. 10 reps"></div>
                  ${ex.hasTimer ? '<div class="form-group"><label>Hold (sec)</label><input type="number" name="hold_time_seconds" min="0" max="999" inputmode="numeric" placeholder="60"></div>' : ''}
                </div>
                <div class="form-group"><label>Notes <span class="optional">(optional)</span></label><input type="text" name="notes" placeholder="How did it feel?"></div>
                <button type="submit" class="btn btn-primary btn-sm btn-full">Log Exercise</button>
              </form>
            </div>`;
        }).join('')}

        <!-- Graduation -->
        <div class="grad-section">
          <div class="grad-box">
            <div class="grad-check">${graduated ? '✓' : '○'}</div>
            <div>
              <div class="grad-title">Graduation Test</div>
              <div class="grad-desc">${esc(levelData.graduation)}</div>
            </div>
          </div>
          ${!graduated ? `<button class="btn btn-accent btn-full" id="graduateBtn">I've passed - Graduate Level ${num}</button>` : ''}
        </div>

        <!-- History -->
        ${logs.length ? `
          <h2 class="section-heading">Level ${num} History</h2>
          <div class="activity-list" id="historyList">
            ${logs.map(log => `
              <div class="activity-row" data-log-id="${log.id}">
                <div class="activity-body">
                  <div class="activity-name">${log.exercise_key.replace(/_/g, ' ').replace(/\d+$/, '')}</div>
                  <div class="activity-detail">${log.sets_completed} sets${log.reps_or_duration ? ' · ' + esc(log.reps_or_duration) : ''}${log.hold_time_seconds ? ' · ' + log.hold_time_seconds + 's' : ''}${log.notes ? ' · <em>' + esc(log.notes) + '</em>' : ''}</div>
                </div>
                <div class="activity-date">${fmtDate(log.session_date)}</div>
                <button class="btn-icon delete-log-btn" title="Delete">&times;</button>
              </div>`).join('')}
          </div>` : ''}
      </div>`;

    bindTimer();
    bindLogForms(num);
    bindGraduate(num);
    bindDeleteLogs();

  } catch (err) {
    app.innerHTML = `<div class="container"><div class="alert alert-error">${esc(err.message)}</div></div>`;
  }
}

// ===== EVENT BINDERS =====

function bindLogForms() {
  document.querySelectorAll('.log-form').forEach(form => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = {
        level: parseInt(f.dataset.level),
        exercise_key: f.dataset.key,
        sets_completed: parseInt(f.sets_completed.value) || 0,
        reps_or_duration: f.reps_or_duration?.value || '',
        hold_time_seconds: f.hold_time_seconds ? parseInt(f.hold_time_seconds.value) || null : null,
        notes: f.notes?.value || '',
      };
      try {
        await api('/log', { method: 'POST', body: JSON.stringify(body) });
        toast('Logged ✓', true);
        if (f.notes) f.notes.value = '';
      } catch (err) {
        toast(err.message || 'Failed to save', false);
      }
    };
  });
}

function bindGraduate(level) {
  const btn = $('#graduateBtn');
  if (!btn) return;
  btn.onclick = async () => {
    if (!confirm(`Are you sure you've passed the Level ${level} graduation test?`)) return;
    try {
      await api('/graduate', { method: 'POST', body: JSON.stringify({ level }) });
      toast('Congratulations!', true);
      setTimeout(() => router(), 1200);
    } catch (err) {
      toast(err.message || 'Failed', false);
    }
  };
}

function bindDeleteLogs() {
  document.querySelectorAll('.delete-log-btn').forEach(btn => {
    btn.onclick = async () => {
      const row = btn.closest('.activity-row');
      const id = row?.dataset.logId;
      if (!id || !confirm('Delete this entry?')) return;
      try {
        await api(`/log/${id}`, { method: 'DELETE' });
        row.remove();
        toast('Deleted', true);
      } catch {
        toast('Failed', false);
      }
    };
  });
}

// ===== TIMER =====
let timerInterval = null;
let timerTarget = 0;
let timerElapsed = 0;
let timerRunning = false;

function bindTimer() {
  document.querySelectorAll('[data-time]').forEach(btn => {
    btn.onclick = () => {
      resetTimer();
      timerTarget = parseInt(btn.dataset.time);
      updateTimerDisplay(timerTarget);
    };
  });
  const startBtn = $('#timerStart');
  const resetBtn = $('#timerReset');
  if (startBtn) startBtn.onclick = toggleTimer;
  if (resetBtn) resetBtn.onclick = resetTimer;
}

function toggleTimer() {
  if (timerRunning) return pauseTimer();
  timerRunning = true;
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) { widget.classList.add('timer--running'); widget.classList.remove('timer--done'); }
  if (btn) btn.textContent = 'Pause';
  const startTime = Date.now() - (timerElapsed * 1000);
  timerInterval = setInterval(() => {
    timerElapsed = Math.floor((Date.now() - startTime) / 1000);
    if (timerTarget > 0) {
      const rem = Math.max(0, timerTarget - timerElapsed);
      updateTimerDisplay(rem);
      updateElapsed(timerElapsed);
      if (rem <= 0) timerDone();
    } else {
      updateTimerDisplay(timerElapsed);
    }
  }, 100);
}

function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) widget.classList.remove('timer--running');
  if (btn) btn.textContent = 'Resume';
}

function resetTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerElapsed = 0;
  timerTarget = 0;
  updateTimerDisplay(0);
  updateElapsed('');
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) widget.classList.remove('timer--running', 'timer--done');
  if (btn) btn.textContent = 'Start';
}

function timerDone() {
  clearInterval(timerInterval);
  timerRunning = false;
  const widget = $('#timer');
  const btn = $('#timerStart');
  if (widget) { widget.classList.remove('timer--running'); widget.classList.add('timer--done'); }
  if (btn) btn.textContent = 'Start';
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2, 0.4].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {}
  toast('Time!', true);
}

function updateTimerDisplay(s) {
  const el = $('#timerDisplay');
  if (el) el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function updateElapsed(v) {
  const el = $('#timerElapsed');
  if (!el) return;
  el.textContent = typeof v === 'number' ? 'Elapsed: ' + Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') : v;
}

// ===== TOAST =====
let toastTimeout;
function toast(msg, success) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('toast--success', !!success);
  t.classList.remove('toast--visible');
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('toast--visible')));
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('toast--visible'), 2500);
}

// ===== EXERCISE IMAGES (aligned to Ring Muscle Up Program PDF) =====
// Single-image map (exercise key → one filename).
const EXERCISE_IMAGES = {
  false_grip_stretch: 'fgringstretch.png',
  arm_extension_stretch: 'armExtensionStretch.png',
  ring_hang: 'ringhang.png',
  false_grip: 'ringfalsegrip.png',
  false_grip_ring_rows: 'fgringrowtop.png',
  ring_push_ups: 'ringpushuptop.png',
  ring_push_ups_turn_out: 'ringpushuptop.png',
  false_grip_hang: 'fgringhang.png',
  transition_ring_rows: 'ringrowtransitionmiddle.png',
  pull_up: 'ringpulluptop.png',
  bar_dip: 'bardipbottom.png',
  false_grip_pull_ups: 'fgpulluptop.png',
  ring_dips_turn_out: 'rgmuscledownbottomdip.png',
  ring_dips: 'rgmuscledownbottomdip.png',
  bent_arm_false_grip_hang: 'fgpulluptop.png',
  tempo_eccentric_ring_muscle_up: 'rgmuscledowntop.png',
  ring_muscle_up: 'ringmu3.png',
  muscle_up_conditioning: 'ringmu5.png',
};
// Progression sets (exercise key → array of filenames in order). Use these when present instead of single image.
const EXERCISE_PROGRESSION_IMAGES = {
  ring_muscle_up: ['ringmu1.png', 'ringmu2.png', 'ringmu3.png', 'ringmu4.png', 'ringmu5.png'],
  muscle_up_conditioning: ['ringmu1.png', 'ringmu2.png', 'ringmu3.png', 'ringmu4.png', 'ringmu5.png'],
  tempo_eccentric_ring_muscle_up: ['rgmuscledowntop.png', 'rgmuscledowndiptransition.png', 'rgmuscledownbottomdip.png', 'rgmuscledownbottom.png'],
  false_grip_ring_rows: ['fgringrowbottom.png', 'fgringrowtop.png'],
  ring_push_ups: ['ringpushupbottom.png', 'ringpushuptop.png'],
  ring_push_ups_turn_out: ['ringpushupbottom.png', 'ringpushuptop.png'],
  transition_ring_rows: ['ringrowtransitiontop.png', 'ringrowtransitionmiddle.png', 'ringrowtransistionbottom.png'],
  pull_up: ['ringpullupbottom.png', 'ringpullupscapdownmiddle.png', 'ringpulluptop.png'],
  bar_dip: ['bardiptop.png', 'bardipbottom.png'],
  false_grip_stretch: ['wrist01.png', 'wrist02.png', 'wrist03.png'],
};
const ASSETS_BASE = '/assets/images';
const HERO_IMAGE = ASSETS_BASE + '/coverpage.png';

function heroHtml(className = '') {
  return `<div class="hero ${className}"><img src="${HERO_IMAGE}" alt="The Ring Muscle Up" class="hero-img" loading="lazy"></div>`;
}

function getImagesForExercise(ex) {
  if (!ex) return [];
  const keyFrom = (s) => String(s || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const key = keyFrom(ex.key);
  const nameKey = keyFrom(ex.name);
  if (EXERCISE_PROGRESSION_IMAGES[key]) return EXERCISE_PROGRESSION_IMAGES[key];
  if (EXERCISE_PROGRESSION_IMAGES[nameKey]) return EXERCISE_PROGRESSION_IMAGES[nameKey];
  const single = EXERCISE_IMAGES[key] || EXERCISE_IMAGES[nameKey];
  return single ? [single] : [];
}

// ===== HELPERS =====
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); }
  catch { return d; }
}

function extractVideoId(url) {
  if (!url) return '';
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
  if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
  return '';
}

function extractStartTime(url) {
  if (!url) return '';
  const match = url.match(/[?&]t=(\d+)/);
  return match ? match[1] : '';
}
