// Index page - Landing page functionality
import { Sidebar } from './components/sidebar.js';
import { supabase } from './supabase.js';

// Initialize sidebar
Sidebar.init();

// Theme toggle
const themeToggle = document.getElementById('themeToggle');

if (themeToggle) {
    // Set initial theme
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
    }

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
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
