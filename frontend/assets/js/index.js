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


