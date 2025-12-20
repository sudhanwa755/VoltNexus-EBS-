
import { Auth } from './auth.js';
import { API } from './api.js';
import { formatCurrency, toggleTheme } from './utils.js';
import { Sidebar } from './components/sidebar.js';

// Initialize Sidebar
Sidebar.init();

// Auth Check - ADMIN role only
console.log('Admin.js: Checking auth for ADMIN role');
console.log('Admin.js: session user before auth check ->', Auth.getUser());
if (!Auth.checkAuth('ADMIN')) {
    // Redirect handled in checkAuth
    console.log('Admin.js: Auth check failed, redirecting. Session user:', Auth.getUser());
}

const user = Auth.getUser();

// UI Elements (may be missing on some pages)
const userInitials = document.getElementById('userInitials');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');

// Initialize User Info safely
if (user) {
    if (userInitials) userInitials.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';
    if (userName) userName.textContent = user.name || 'Admin';
    if (userEmail) userEmail.textContent = user.email || '';
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        Auth.logout();
    });
}

// Theme Toggle
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Load Admin Dashboard Data
const loadDashboardData = async () => {
    try {
        const users = await API.admin.getUsers();
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = users.length;

        // Fetch all bills from backend
        let bills = [];
        try {
            bills = await API.admin.getAllBills();
        } catch (err) {
            console.warn('Could not fetch bills from backend, falling back to local mock', err);
            bills = JSON.parse(localStorage.getItem('ebs_db_bills') || '[]');
        }

        const totalRevenue = bills.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const totalRevenueEl = document.getElementById('totalRevenue');
        if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);

        const overdueCount = bills.filter(b => ((b.status || '').toLowerCase() !== 'paid')).length;
        const overdueEl = document.getElementById('overdueCount');
        if (overdueEl) overdueEl.textContent = overdueCount;

        // Render Revenue Chart using computed monthly aggregation
        renderChart(bills);

    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
};

const renderChart = (bills = []) => {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Build aggregation by month-year and ensure months with zero values appear.
    const agg = new Map();
    const dates = [];
    bills.forEach(b => {
        const dt = new Date(b.due_date || b.created_at || b.date || null);
        if (dt instanceof Date && !isNaN(dt)) {
            const key = dt.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
            agg.set(key, (agg.get(key) || 0) + (parseFloat(b.amount) || 0));
            dates.push(new Date(dt.getFullYear(), dt.getMonth(), 1));
        }
    });

    // Determine chart range: from earliest to latest date among bills; if no bills, show last 6 months
    let startDate, endDate;
    if (dates.length > 0) {
        dates.sort((a, b) => a - b);
        startDate = dates[0];
        endDate = dates[dates.length - 1];
    } else {
        endDate = new Date();
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1); // last 6 months
    }

    // Normalize start/end to first of month
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    const labels = [];
    const data = [];
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
        labels.push(label);
        data.push(Number(agg.get(label) || 0));
    }

    // Destroy existing chart if present (simple guard in case of re-render)
    if (window._adminRevenueChart) {
        try { window._adminRevenueChart.destroy(); } catch (e) { }
    }

    window._adminRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)', drawBorder: false }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
};

// Init
loadDashboardData();

// Expose some helpers for other modules (analytics UI)
window.admin = {
    reloadDashboard: loadDashboardData,
    updateChart: renderChart
};
