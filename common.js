import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginNav = document.getElementById('loginNav');
const startNowNav = document.getElementById('startNowNav');
const logoutNav = document.getElementById('logoutNav');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navGroup = document.querySelector('.nav-group');

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
        if (navGroup) {
            navGroup.classList.remove('open');
        }
        if (mobileMenuToggle) {
            mobileMenuToggle.classList.remove('open');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
    });
}

if (mobileMenuToggle && navGroup) {
    mobileMenuToggle.addEventListener('click', () => {
        const open = !mobileMenuToggle.classList.contains('open');
        mobileMenuToggle.classList.toggle('open', open);
        navGroup.classList.toggle('open', open);
        mobileMenuToggle.setAttribute('aria-expanded', String(open));
    });

    document.querySelectorAll('.topnav-links a, .topnav-actions a, .topnav-actions button').forEach(item => {
        item.addEventListener('click', () => {
            if (navGroup.classList.contains('open')) {
                navGroup.classList.remove('open');
                mobileMenuToggle.classList.remove('open');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}
