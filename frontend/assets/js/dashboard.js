import { Auth } from './auth.js';
import { API } from './api.js';
import { formatCurrency, formatDate, toggleTheme } from './utils.js';
import { Sidebar } from './components/sidebar.js';

// Initialize Sidebar
Sidebar.init();

// Auth Check - USER role only
console.log('Dashboard.js: Checking auth for USER role');
console.log('Dashboard.js: session user before auth check ->', Auth.getUser());
if (!Auth.checkAuth('USER')) {
    // Redirect handled in checkAuth
    console.log('Dashboard.js: Auth check failed, redirecting. Session user:', Auth.getUser());
}

const user = Auth.getUser();

// UI Elements
const userInitials = document.getElementById('userInitials');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');

// Initialize User Info
if (user) {
    userInitials.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    userName.textContent = user.name || 'User';
    userEmail.textContent = user.email;
}

// Logout
logoutBtn.addEventListener('click', () => {
    Auth.logout();
});

// Theme Toggle
themeToggle.addEventListener('click', toggleTheme);

// Dashboard Data Loading
const loadDashboardData = async () => {
    try {
        // Parallel Fetching for Optimization
        // Use Promise.allSettled so one failure (auth/500) doesn't stop rendering other data
        const results = await Promise.allSettled([
            API.user.getConsumption(user.id, 12), // Limit to last 12 months
            API.user.getPendingBill(user.id),
            API.user.getRecentBills(user.id, 3),
            API.user.checkConsumptionExceeded(user.id)
        ]);

        // Map settled results to variables and log any errors for debugging
        const consumptionData = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
        if (results[0].status === 'rejected') console.warn('getConsumption failed:', results[0].reason);

        const pendingBill = results[1].status === 'fulfilled' ? results[1].value : null;
        if (results[1].status === 'rejected') console.warn('getPendingBill failed:', results[1].reason);

        const recentBills = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
        if (results[2].status === 'rejected') console.warn('getRecentBills failed:', results[2].reason);

        const consumptionAlert = results[3].status === 'fulfilled' ? results[3].value : null;
        if (results[3].status === 'rejected') console.warn('checkConsumptionExceeded failed:', results[3].reason);

        // 0. Check and display consumption alerts
        displayConsumptionAlert(consumptionAlert);

        // 1. Render Chart
        renderChart(consumptionData);

        // 2. Render Status Cards
        const currentBillAmount = document.getElementById('currentBillAmount');
        const currentBillStatus = document.getElementById('currentBillStatus');
        const dueDate = document.getElementById('dueDate');

        if (pendingBill) {
            currentBillAmount.textContent = formatCurrency(pendingBill.amount);
            currentBillStatus.textContent = 'Due on ' + formatDate(pendingBill.due_date); // Note: DB field is due_date
            currentBillStatus.classList.add('text-red-500');
            dueDate.textContent = formatDate(pendingBill.due_date);
        } else {
            currentBillAmount.textContent = formatCurrency(0);
            currentBillStatus.textContent = 'No pending bills';
            currentBillStatus.classList.remove('text-red-500');
            dueDate.textContent = '-';
        }

        // 3. Avg Consumption
        if (consumptionData.length > 0) {
            const totalUnits = consumptionData.reduce((acc, curr) => acc + curr.units, 0);
            const avg = Math.round(totalUnits / consumptionData.length);
            document.getElementById('avgConsumption').textContent = `${avg} kWh`;
        } else {
            document.getElementById('avgConsumption').textContent = `0 kWh`;
        }

        // 4. Recent Bills Table
        const recentBillsTable = document.getElementById('recentBillsTable');

        if (recentBills.length > 0) {
            recentBillsTable.innerHTML = recentBills.map(bill => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-6 py-4">${bill.month}</td>
                    <td class="px-6 py-4 hidden md:table-cell">${bill.units} kWh</td>
                    <td class="px-6 py-4 font-medium">${formatCurrency(bill.amount)}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${bill.status === 'Paid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                }">
                            ${bill.status}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <a href="my-bills.html" class="text-blue-600 hover:text-blue-700 font-medium text-sm">View</a>
                    </td>
                </tr>
            `).join('');
        } else {
            recentBillsTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-500">No recent bills found</td></tr>`;
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
};

const renderChart = (data) => {
    const ctx = document.getElementById('consumptionChart').getContext('2d');

    // Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.month),
            datasets: [{
                label: 'Consumption (kWh)',
                data: data.map(d => d.units),
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
};

// Display Consumption Alert
const displayConsumptionAlert = (alert) => {
    const alertBox = document.getElementById('consumptionAlertBox');
    const alertContent = document.getElementById('consumptionAlertContent');

    if (!alert) {
        alertBox.classList.add('hidden');
        return;
    }

    let alertHTML = '';

    if (alert.exceeded) {
        alertHTML = `
            <div class="flex items-start gap-4">
                <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <div class="flex-1">
                    <h4 class="font-bold text-red-600 mb-1">⚠️ Consumption Limit Exceeded!</h4>
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                        You have exceeded your monthly consumption limit of <strong>${alert.limit} kWh</strong>.
                        Current usage: <strong>${alert.currentUsage} kWh (${alert.percentage}%)</strong>
                    </p>
                    <p class="text-xs text-slate-500 mt-2">An email notification has been sent to your registered email address.</p>
                </div>
            </div>
        `;
        alertContent.className = 'flex items-start gap-4 border-l-4 border-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg';
    } else if (alert.warning) {
        alertHTML = `
            <div class="flex items-start gap-4">
                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div class="flex-1">
                    <h4 class="font-bold text-yellow-600 mb-1">📊 Approaching Consumption Limit</h4>
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                        Your consumption has reached <strong>${alert.percentage}%</strong> of your monthly limit 
                        (<strong>${alert.currentUsage} / ${alert.limit} kWh</strong>).
                    </p>
                    <p class="text-xs text-slate-500 mt-2">Manage your usage to stay within limits. <a href="profile.html" class="text-blue-600 hover:underline">Update your limit</a></p>
                </div>
            </div>
        `;
        alertContent.className = 'flex items-start gap-4 border-l-4 border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg';
    }

    if (alertHTML) {
        alertContent.innerHTML = alertHTML;
        alertBox.classList.remove('hidden');
    } else {
        alertBox.classList.add('hidden');
    }
};

// Init
loadDashboardData();
