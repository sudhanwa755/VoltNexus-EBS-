// Index page - Landing page functionality
import { Sidebar } from './components/sidebar.js';
import { supabase } from './supabase.js';
import { CONFIG } from './config.js';

// Initialize sidebar
Sidebar.init();

// Theme toggle logic
const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(CONFIG.THEME_KEY, isDark ? 'dark' : 'light');
};

const themeToggle = document.getElementById('themeToggle');
const mobileThemeToggle = document.getElementById('mobileThemeToggle');

// Set initial theme if not already set by head script
if (localStorage.getItem(CONFIG.THEME_KEY) === 'dark') {
    document.documentElement.classList.add('dark');
}

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', toggleTheme);
}

// Login/Register button handlers
const loginBtn = document.querySelector('a[href="login.html"]');
const registerBtn = document.querySelector('a[href="register.html"]');

// Check if user is already logged in
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // User is logged in, show "Go to Dashboard" instead
        if (loginBtn && registerBtn) {
            const user = session.user;
            const isAdmin = user.user_metadata?.role === 'ADMIN';

            const dashboardUrl = isAdmin ? 'admin/dashboard.html' : 'dashboard.html';

            // Replace login button with dashboard button
            loginBtn.textContent = 'Go to Dashboard';
            loginBtn.href = dashboardUrl;

            // Hide register button when logged in
            registerBtn.style.display = 'none';
        }
    }
}

checkAuth();
