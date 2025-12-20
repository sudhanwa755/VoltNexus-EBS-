import { Auth } from './auth.js';
import { API } from './api.js';
import { supabase } from './supabase.js';
import { toggleTheme } from './utils.js';

// Auth Check
if (!Auth.checkAuth('ADMIN')) {
    // Redirect handled in checkAuth
}

const user = Auth.getUser();

// UI Elements
const userInitials = document.getElementById('userInitials');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const billsTableBody = document.getElementById('billsTableBody');
const searchInput = document.getElementById('searchInput');

// Stats elements
const totalBillsEl = document.getElementById('totalBills');
const paidBillsEl = document.getElementById('paidBills');
const pendingBillsEl = document.getElementById('pendingBills');
const totalRevenueEl = document.getElementById('totalRevenue');

// Initialize User Info
if (user) {
    userInitials.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';
    userName.textContent = user.name || 'Admin';
    userEmail.textContent = user.email;
}

// Logout
logoutBtn.addEventListener('click', () => {
    Auth.logout();
});



// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Store all bills for filtering
let allBills = [];

// Load Bills
const loadBills = async () => {
    try {
        // Fetch bills with user profiles
        const { data: bills, error } = await supabase
            .from('bills')
            .select(`
                *,
                profiles:user_id (
                    name,
                    email
                )
            `)
            .order('due_date', { ascending: false });

        if (error) throw error;

        allBills = bills || [];
        renderBills(allBills);
        updateStats(allBills);

    } catch (error) {
        console.error('Error loading bills:', error);
        billsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-red-500">Error loading bills: ${error.message}</td></tr>`;
    }
};

// Render Bills Table
const renderBills = (bills) => {
    if (bills.length === 0) {
        billsTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-500">No bills found</td></tr>`;
        return;
    }

    billsTableBody.innerHTML = bills.map(bill => {
        const customerName = bill.profiles?.name || 'Unknown';
        const customerEmail = bill.profiles?.email || 'N/A';
        const statusClass = bill.status === 'Paid'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="px-6 py-4 font-medium">${customerName}</td>
                <td class="px-6 py-4 text-slate-600 dark:text-slate-400 hidden md:table-cell">${customerEmail}</td>
                <td class="px-6 py-4 hidden md:table-cell">${bill.month || '-'}</td>
                <td class="px-6 py-4 hidden md:table-cell">${bill.units || 0} kWh</td>
                <td class="px-6 py-4 font-medium">₹${parseFloat(bill.amount || 0).toFixed(2)}</td>
                <td class="px-6 py-4 hidden md:table-cell">${bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${bill.status || 'Pending'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <button onclick="updateBillStatus('${bill.id}', '${bill.status === 'Paid' ? 'Pending' : 'Paid'}')"
                        class="px-3 py-1 rounded-full text-xs font-medium ${bill.status === 'Paid' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} transition-colors">
                        ${bill.status === 'Paid' ? 'Mark Pending' : 'Mark Paid'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

// Update Stats
const updateStats = (bills) => {
    const total = bills.length;
    const paid = bills.filter(b => b.status === 'Paid').length;
    const pending = bills.filter(b => b.status !== 'Paid').length;
    const revenue = bills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

    totalBillsEl.textContent = total;
    paidBillsEl.textContent = paid;
    pendingBillsEl.textContent = pending;
    totalRevenueEl.textContent = `₹${revenue.toFixed(2)}`;
};

// Search Functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    if (!searchTerm) {
        renderBills(allBills);
        updateStats(allBills);
        return;
    }

    const filtered = allBills.filter(bill => {
        const name = (bill.profiles?.name || '').toLowerCase();
        const email = (bill.profiles?.email || '').toLowerCase();
        const month = (bill.month || '').toLowerCase();

        return name.includes(searchTerm) ||
            email.includes(searchTerm) ||
            month.includes(searchTerm);
    });

    renderBills(filtered);
    updateStats(filtered);
});

// Update Bill Status
window.updateBillStatus = async (billId, newStatus) => {
    try {
        const { error } = await supabase
            .from('bills')
            .update({ status: newStatus })
            .eq('id', billId);

        if (error) throw error;

        // Reload bills
        await loadBills();

        // Show success message
        alert(`Bill status updated to ${newStatus}`);

    } catch (error) {
        console.error('Error updating bill status:', error);
        alert('Error updating bill status: ' + error.message);
    }
};

// Initialize
loadBills();

