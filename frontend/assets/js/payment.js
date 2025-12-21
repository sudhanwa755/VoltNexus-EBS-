import { Auth } from './auth.js';
import { API } from './api.js';
import { supabase } from './supabase.js';
import { formatCurrency, toggleTheme } from './utils.js';
import { Sidebar } from './components/sidebar.js';

// Initialize Sidebar
Sidebar.init();

// Auth Check
if (!Auth.checkAuth('USER')) {
    // Redirect handled in checkAuth
}

const user = Auth.getUser();

// UI Elements
const userInitials = document.getElementById('userInitials');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const paymentForm = document.getElementById('paymentForm');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModalBtn');

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
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Load Bill Details
let currentBill = null;

const loadBillSummary = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('billId');

    if (!billId) {
        alert('No bill selected');
        window.location.href = 'my-bills.html';
        return;
    }

    try {
        const bill = await API.user.getBill(billId);

        if (!bill || bill.user_id !== user.id) {
            alert('Bill not found or access denied');
            window.location.href = 'my-bills.html';
            return;
        }

        if (bill.status === 'Paid') {
            alert('This bill is already paid');
            window.location.href = 'my-bills.html';
            return;
        }

        currentBill = bill;

        // Populate summary
        document.getElementById('summaryBillId').textContent = '#' + bill.id.substring(0, 8);
        document.getElementById('summaryMonth').textContent = bill.month;
        document.getElementById('summaryUnits').textContent = bill.units + ' kWh';
        document.getElementById('summaryAmount').textContent = formatCurrency(bill.amount);

    } catch (error) {
        console.error('Error loading bill:', error);
        alert('Error loading bill details');
        window.location.href = 'my-bills.html';
    }
};

// Payment Form Submit
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentBill) {
        alert('No bill loaded');
        return;
    }

    const transactionNumber = document.getElementById('transactionNumber').value.trim();

    if (!transactionNumber) {
        alert('Please enter a transaction number');
        return;
    }

    try {
        // Update bill status to Paid
        const { error } = await supabase
            .from('bills')
            .update({ status: 'Paid' })
            .eq('id', currentBill.id);

        if (error) throw error;

        // Show success modal with the transaction number
        document.getElementById('transactionId').textContent = transactionNumber;
        successModal.classList.remove('hidden');

    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
    }
});

// Close modal and redirect
closeModalBtn.addEventListener('click', () => {
    window.location.href = 'my-bills.html';
});

// Init
loadBillSummary();
