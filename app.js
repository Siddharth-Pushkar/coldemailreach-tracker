import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const colRef = collection(db, 'applications');

// DOM
const authForm = document.getElementById('authForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginNav = document.getElementById('loginNav');
const startNowNav = document.getElementById('startNowNav');
const googleBtn = document.getElementById('googleBtn');
const logoutNav = document.getElementById('logoutNav');
const authMessage = document.getElementById('authMessage');
const authTitle = document.getElementById('authTitle');
const confirmRow = document.querySelector('.confirm-row');
const authSection = document.getElementById('authSection');
const appContent = document.getElementById('appContent');

let currentUser = null;
let unsubscribeListener = null;
let allItems = [];
let currentSearch = '';
let currentStatusFilter = 'all';
let currentDateFilter = '';

function showAuthMessage(message, type = 'error') {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', type === 'error');
  authMessage.classList.toggle('success', type === 'success');
}

function updateTopNav(isSignedIn) {
  if (loginNav) loginNav.classList.toggle('hidden', isSignedIn);
  if (startNowNav) startNowNav.classList.toggle('hidden', isSignedIn);
  if (logoutNav) logoutNav.classList.toggle('hidden', !isSignedIn);
}

function setAuthMode(mode) {
  if (mode === 'register') {
    authTitle.textContent = 'Create a ColdReach account';
    confirmRow.classList.remove('hidden');
    loginBtn.classList.add('hidden');
    registerBtn.classList.remove('hidden');
  } else {
    authTitle.textContent = 'Login to ColdReach';
    confirmRow.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    registerBtn.classList.add('hidden');
  }
  authSection.classList.remove('hidden');
  if (appContent) appContent.classList.add('hidden');
  showAuthMessage('');
}

function setSignedOutState() {
  currentUser = null;
  authSection.classList.remove('hidden');
  if (appContent) appContent.classList.add('hidden');
  // stop realtime listener when signed out
  if (typeof unsubscribeListener === 'function') { unsubscribeListener(); unsubscribeListener = null; }
  updateTopNav(false);
  setAuthMode('login');
}

function setSignedInState(user) {
  currentUser = user;
  authSection.classList.add('hidden');
  if (appContent) appContent.classList.remove('hidden');
  showAuthMessage('');
  updateTopNav(true);
  // show account email
  const emailEl = document.getElementById('dashboardEmail');
  if (emailEl) emailEl.textContent = user.email || user.displayName || 'Account';
  // start listening for user's applications
  if (user && user.uid) startRealtimeListener(user.uid);
}

// realtime listener removed (main/dashboard UI removed)

onAuthStateChanged(auth, user => {
  if (user) setSignedInState(user);
  else setSignedOutState();
});

loginNav.addEventListener('click', (e) => {
  e.preventDefault();
  setAuthMode('login');
});

startNowNav.addEventListener('click', (e) => {
  e.preventDefault();
  setAuthMode('register');
});

setAuthMode('login');

// Dashboard UI event bindings
// Dashboard bindings removed (main removed)

loginBtn.addEventListener('click', async () => {
  const email = authForm.authEmail.value.trim();
  const password = authForm.authPassword.value;
  if (!email || !password) { showAuthMessage('Email and password are required.'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    showAuthMessage(err.message || 'Login failed.');
  }
});

registerBtn.addEventListener('click', async () => {
  const email = authForm.authEmail.value.trim();
  const password = authForm.authPassword.value;
  const passwordConfirm = authForm.authPasswordConfirm.value;
  if (!email || !password) { showAuthMessage('Email and password are required.'); return; }
  if (password !== passwordConfirm) { showAuthMessage('Passwords do not match.'); return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showAuthMessage('Account created successfully. You are now signed in.', 'success');
    authForm.reset();
  } catch (err) {
    showAuthMessage(err.message || 'Registration failed.');
  }
});

if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      showAuthMessage(err.message || 'Google sign-in failed.');
    }
  });
}

// logout button removed from DOM

function formatDate(d) {
  if (!d) return '';
  // Firestore Timestamp has toDate()
  if (typeof d === 'object' && d !== null && typeof d.toDate === 'function') {
    return d.toDate().toLocaleDateString();
  }
  // If already a Date
  if (d instanceof Date) return d.toLocaleDateString();
  // If ISO string
  try { const dt = new Date(d); if (!isNaN(dt)) return dt.toLocaleDateString(); } catch (e) { }
  return String(d);
}

function statusClass(status) {
  if (!status) return 'sent';
  const s = status.toLowerCase();
  if (s.includes('sent')) return 'sent';
  if (s.includes('follow')) return 'follow';
  if (s.includes('under') || s.includes('process')) return 'processing';
  if (s.includes('reject')) return 'rejected';
  if (s.includes('accept')) return 'accepted';
  return 'sent';
}

// renderList removed — dashboard UI removed

// openModal removed — Info Card modal removed along with main content

// modal handlers removed (modal removed from HTML)

// appForm submission removed (form removed from main)

// applyFilter removed (dashboard removed)

// search input removed; filtering UI not present

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Dashboard UI logic (render cards, search, filters, status updates) ---

function startRealtimeListener(userId) {
  // stop previous listener
  if (typeof unsubscribeListener === 'function') { unsubscribeListener(); unsubscribeListener = null; }
  try {
    const q = query(colRef, where('userId', '==', userId));
    unsubscribeListener = onSnapshot(q, snapshot => {
      const items = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // sort by createdAt or emailDate if available
      items.sort((a, b) => {
        const ta = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate().getTime() : (a.emailDate ? new Date(a.emailDate).getTime() : 0);
        const tb = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate().getTime() : (b.emailDate ? new Date(b.emailDate).getTime() : 0);
        return tb - ta;
      });
      allItems = items;
      applyFiltersAndRender();
    }, err => { console.error('Listener error', err); });
  } catch (e) { console.error('startRealtimeListener error', e); }
}

function applyFiltersAndRender() {
  const term = (currentSearch || '').trim().toLowerCase();
  const status = currentStatusFilter || 'all';
  const date = currentDateFilter || '';
  const filtered = allItems.filter(it => {
    if (term) {
      const company = (it.company || '').toLowerCase();
      const position = (it.position || '').toLowerCase();
      if (!(company.includes(term) || position.includes(term))) return false;
    }
    if (status !== 'all') {
      const s = (it.status || '').toLowerCase();
      if (!s.includes(status)) return false;
    }
    if (date) {
      let itemDate = '';
      if (it.emailDate && typeof it.emailDate.toDate === 'function') itemDate = it.emailDate.toDate().toISOString().slice(0, 10);
      else if (it.emailDate instanceof Date) itemDate = it.emailDate.toISOString().slice(0, 10);
      else if (typeof it.emailDate === 'string') { const dt = new Date(it.emailDate); if (!isNaN(dt)) itemDate = dt.toISOString().slice(0, 10); }
      if (itemDate !== date) return false;
    }
    return true;
  });
  renderGrid(filtered);
}

function renderGrid(items) {
  const container = document.getElementById('cards');
  const empty = document.getElementById('emptyState');
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  container.classList.remove('hidden');
  items.forEach(it => {
    const card = document.createElement('article');
    card.className = 'app-card';
    card.tabIndex = 0;
    card.setAttribute('data-id', it.id);
    const dateText = formatDate(it.emailDate || it.createdAt || '');
    card.innerHTML = `
      <div class="card-top"><div class="card-date">${escapeHtml(dateText)}</div></div>
      <div class="card-company">${escapeHtml(it.company || '')}</div>
      <div class="card-position">${escapeHtml(it.position || '')}</div>
      <div class="card-footer">
        <span class="status-label">Status:</span>
        <select class="quick-status" aria-label="Status for ${escapeHtml(it.company || '')}">
          <option value="sent" ${(it.status || '').toLowerCase().includes('sent') ? 'selected' : ''}>Sent</option>
          <option value="follow up" ${(it.status || '').toLowerCase().includes('follow') ? 'selected' : ''}>Follow Up</option>
          <option value="accepted" ${(it.status || '').toLowerCase().includes('accept') ? 'selected' : ''}>Accepted</option>
          <option value="rejected" ${(it.status || '').toLowerCase().includes('reject') ? 'selected' : ''}>Rejected</option>
        </select>
      </div>`;

    // card click opens modal (dispatch event for existing handlers or use local modal)
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const evt = new CustomEvent('openApplication', { detail: { id } });
      window.dispatchEvent(evt);
      // also open local modal fallback
      openModal(it);
    });

    // keyboard access
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });

    const select = card.querySelector('.quick-status');
    if (select) {
      // prevent status clicks from opening modal
      select.addEventListener('click', (e) => { e.stopPropagation(); });
      select.addEventListener('change', async (e) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        try {
          const docRef = doc(db, 'applications', it.id);
          await updateDoc(docRef, { status: newStatus });
        } catch (err) { console.error('Status update failed', err); }
      });
    }

    container.appendChild(card);
  });
}

function openNewApplicationModal() {
  const modal = document.getElementById('modal');
  const header = document.getElementById('modalHeader');
  const body = document.getElementById('modalBody');
  const deleteBtn = document.getElementById('modalDelete');
  if (!modal || !header || !body) return;

  if (deleteBtn) deleteBtn.style.display = 'none';
  header.innerHTML = '<h2>New application</h2>';
  body.innerHTML = `
    <form id="newApplicationForm" class="modal-form">
      <div class="form-field">
        <label for="newCompanyName">Company Name</label>
        <input id="newCompanyName" name="company" type="text" placeholder="Acme Inc." required />
      </div>

      <div class="form-field">
        <label for="newCompanyPosition">Company Position</label>
        <input id="newCompanyPosition" name="position" type="text" placeholder="Product Designer" required />
      </div>

      <div class="form-field">
        <label for="newApproach">Approach</label>
        <select id="newApproach" name="approach">
          <option value="Cold Email">Cold Email</option>
          <option value="Referral">Referral</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div class="field-row">
        <div class="form-field">
          <label for="newDate">Date</label>
          <input id="newDate" name="emailDate" type="date" required />
        </div>

        <div class="form-field">
          <label for="newStatus">Status</label>
          <select id="newStatus" name="status">
            <option value="Sent">Sent</option>
            <option value="Follow Up">Follow Up</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div class="form-field">
        <label for="newResumeSent">Resume Sent</label>
        <input id="newResumeSent" name="resumeVersion" type="text" placeholder="v3 / final" />
      </div>

      <div class="form-field">
        <label for="newNote">Note</label>
        <textarea id="newNote" name="notes" placeholder="Add a short note about the outreach..."></textarea>
      </div>

      <button type="submit" class="submit-btn">Add Application</button>
    </form>
  `;

  const form = document.getElementById('newApplicationForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentUser || !currentUser.uid) return;

      const formData = new FormData(form);
      const payload = {
        userId: currentUser.uid,
        company: (formData.get('company') || '').toString().trim(),
        position: (formData.get('position') || '').toString().trim(),
        approach: (formData.get('approach') || '').toString().trim(),
        emailDate: formData.get('emailDate') || '',
        status: (formData.get('status') || 'Sent').toString(),
        resumeVersion: (formData.get('resumeVersion') || '').toString().trim(),
        notes: (formData.get('notes') || '').toString().trim(),
        createdAt: serverTimestamp()
      };

      if (!payload.company || !payload.position || !payload.emailDate) return;

      try {
        await addDoc(colRef, payload);
        closeModal();
        form.reset();
      } catch (err) {
        console.error('Add application failed', err);
      }
    });
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

// Simple modal implementation to show details (non-intrusive, can be replaced later)
function openModal(item) {
  if (!item) return;
  const modal = document.getElementById('modal');
  const body = document.getElementById('modalBody');
  if (!modal || !body) return;
  body.innerHTML = '';
  const fields = ['company', 'position', 'status', 'emailAddress', 'emailDate', 'resumeVersion', 'notes'];
  fields.forEach(f => {
    if (item[f] || item[f] === 0) {
      const el = document.createElement('div');
      el.className = 'modal-field';
      const title = document.createElement('strong'); title.textContent = f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const span = document.createElement('span'); span.textContent = (f === 'emailDate' ? formatDate(item[f]) : (item[f] || ''));
      el.appendChild(title); el.appendChild(span); body.appendChild(el);
    }
  });
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true');
}

// wire dashboard UI controls if present
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  const dashboard = document.getElementById('appContent');
  const listSection = dashboard ? dashboard.querySelector('.list-section') : null;
  const cards = document.getElementById('cards');

  if (container) {
    container.style.display = 'block';
    container.style.gridTemplateColumns = 'none';
    container.style.width = 'min(1200px, calc(100% - 48px))';
    container.style.maxWidth = '1200px';
    container.style.margin = '20px auto';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
  }

  if (dashboard) {
    dashboard.style.display = 'block';
    dashboard.style.width = '100%';
    dashboard.style.maxWidth = '1200px';
    dashboard.style.margin = '0 auto';
    dashboard.style.boxSizing = 'border-box';
  }

  if (listSection) {
    listSection.style.width = '100%';
    listSection.style.maxWidth = 'none';
    listSection.style.boxSizing = 'border-box';
  }

  if (cards) {
    cards.style.width = '100%';
    cards.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    cards.style.gap = '22px';
  }

  const search = document.getElementById('dashboardSearch');
  const newBtn = document.getElementById('newBtn');
  const emptyNew = document.getElementById('emptyNewBtn');
  const closeBtn = document.getElementById('closeModal');
  const modalDelete = document.getElementById('modalDelete');
  const logoutBtn = document.getElementById('dashboardLogoutBtn');

  if (search) {
    let t;
    search.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => { currentSearch = e.target.value || ''; applyFiltersAndRender(); }, 180);
    });
  }

  if (newBtn) newBtn.addEventListener('click', () => { openNewApplicationModal(); });
  if (emptyNew) emptyNew.addEventListener('click', () => { openNewApplicationModal(); });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modalDelete) modalDelete.addEventListener('click', async () => { /* deletion intentionally left to existing modal logic */ closeModal(); });
  if (logoutBtn) logoutBtn.addEventListener('click', () => { const ln = document.getElementById('logoutNav'); if (ln) ln.click(); });

  // filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentStatusFilter = btn.getAttribute('data-status') || 'all';
      applyFiltersAndRender();
    });
  });

  const dateEl = document.getElementById('dateFilter');
  if (dateEl) dateEl.addEventListener('change', (e) => { currentDateFilter = e.target.value || ''; applyFiltersAndRender(); });
});
