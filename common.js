import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginNav = document.getElementById('loginNav');
const startNowNav = document.getElementById('startNowNav');
const logoutNav = document.getElementById('logoutNav');

function updateTopNav(isSignedIn) {
  if (loginNav) loginNav.classList.toggle('hidden', isSignedIn);
  if (startNowNav) startNowNav.classList.toggle('hidden', isSignedIn);
  if (logoutNav) logoutNav.classList.toggle('hidden', !isSignedIn);
}

onAuthStateChanged(auth, (user) => {
  updateTopNav(!!user);
});

if (logoutNav) {
  logoutNav.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error', err);
    }
  });
}
