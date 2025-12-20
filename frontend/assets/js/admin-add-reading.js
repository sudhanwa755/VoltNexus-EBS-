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
const usersTableBody = document.getElementById('usersTableBody');
const themeToggle = document.getElementById('themeToggle');

// Modal Elements
const readingModal = document.getElementById('readingModal');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const readingForm = document.getElementById('readingForm');
const modalUserName = document.getElementById('modalUserName');
const modalUserId = document.getElementById('modalUserId');

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
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}



// Store all users for filtering
let allUsers = [];

// Load Users
const loadUsers = async () => {
    try {
        console.log('Fetching users for Add Reading...');
        const users = await API.admin.getUsers();
        const regularUsers = users.filter(u => u.role === 'USER');

        // Store for search filtering
        allUsers = regularUsers;

        if (regularUsers.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-500">No users found.</td></tr>`;
            return;
        }

        renderUsers(regularUsers);

    } catch (error) {
        console.error('Error loading users:', error);
        usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Error loading users. Check console.</td></tr>`;
    }
};

// Render users to table
const renderUsers = (users) => {
    if (users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-500">No users match your search.</td></tr>`;
        return;
    }

    usersTableBody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="px-4 py-3 font-medium text-xs font-mono hidden md:table-cell" title="${u.id}">
                ${u.id.substring(0, 8)}...
            </td>
            <td class="px-4 py-3">${u.name || '-'}</td>
            <td class="px-4 py-3 hidden md:table-cell">${u.email}</td>
            <td class="px-4 py-3 text-right">
                <button onclick="window.openReadingModal('${u.id}', '${u.name || u.email}')" 
                    class="px-4 py-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 font-medium text-sm transition-colors">
                    Add Reading
                </button>
            </td>
        </tr>
    `).join('');
};

// Search functionality
const userSearchInput = document.getElementById('userSearch');
if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (!searchTerm) {
            renderUsers(allUsers);
            return;
        }

        const filteredUsers = allUsers.filter(user => {
            const name = (user.name || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const id = (user.id || '').toLowerCase();

            return name.includes(searchTerm) ||
                email.includes(searchTerm) ||
                id.includes(searchTerm);
        });

        renderUsers(filteredUsers);
    });
}

// Modal Logic
const openModal = (userId, userName) => {
    modalUserId.value = userId;
    modalUserName.textContent = userName;
    readingModal.classList.remove('hidden');
    // Set default months to current month
    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
    document.getElementById('readingMonth').value = monthStr;
    document.getElementById('billingMonth').value = monthStr;
};

const closeModal = () => {
    readingModal.classList.add('hidden');
    readingForm.reset();
};

// Expose to window for onclick
window.openReadingModal = openModal;

closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Auto-calculate units consumed
const prevReadingInput = document.getElementById('prevReading');
const currReadingInput = document.getElementById('currReading');
const unitsConsumedInput = document.getElementById('unitsConsumed');

const calculateUnits = () => {
    const prev = parseFloat(prevReadingInput.value) || 0;
    const curr = parseFloat(currReadingInput.value) || 0;
    const consumed = curr - prev;
    unitsConsumedInput.value = consumed >= 0 ? consumed.toFixed(2) : '0.00';
};

prevReadingInput.addEventListener('input', calculateUnits);
currReadingInput.addEventListener('input', calculateUnits);

// Form Submit
readingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = modalUserId.value;
    const readingMonth = document.getElementById('readingMonth').value;
    const billingMonth = document.getElementById('billingMonth').value;
    const prevReading = parseFloat(document.getElementById('prevReading').value);
    const currReading = parseFloat(document.getElementById('currReading').value);

    if (!userId || !readingMonth || !billingMonth || isNaN(currReading)) {
        alert('Please fill all fields correctly.');
        return;
    }

    const unitsConsumed = currReading - prevReading;
    if (unitsConsumed < 0) {
        alert('Current reading cannot be less than previous reading.');
        return;
    }

    try {
        // Check if reading already exists for this user and month
        const { data: existingReading, error: checkError } = await supabase
            .from('consumption')
            .select('*')
            .eq('user_id', userId)
            .eq('month', readingMonth)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            throw checkError;
        }

        if (existingReading) {
            const overwrite = confirm(`A reading already exists for this user in ${readingMonth}.\n\nDo you want to update it?`);
            if (!overwrite) {
                return;
            }
        }

        // 1. Fetch active tariff plan to calculate bill amount
        const { data: tariffPlans, error: tariffError } = await supabase
            .from('tariff_plans')
            .select('*')
            .eq('is_active', true)
            .order('effective_from', { ascending: false })
            .limit(1);

        if (tariffError) throw tariffError;

        let billAmount = 0;
        let baseFee = 50; // Default base fee

        if (tariffPlans && tariffPlans.length > 0) {
            const tariff = tariffPlans[0];
            baseFee = tariff.base_fee || 50;

            // Calculate tiered billing
            let remainingUnits = unitsConsumed;
            let cost = baseFee;

            // Tier 1 (0-100 units)
            if (remainingUnits > 0) {
                const tier1Units = Math.min(remainingUnits, tariff.tier1_units_up_to || 100);
                cost += tier1Units * (tariff.tier1_rate || 5);
                remainingUnits -= tier1Units;
            }

            // Tier 2 (101-300 units)
            if (remainingUnits > 0) {
                const tier2Limit = (tariff.tier2_units_up_to || 300) - (tariff.tier1_units_up_to || 100);
                const tier2Units = Math.min(remainingUnits, tier2Limit);
                cost += tier2Units * (tariff.tier2_rate || 7.5);
                remainingUnits -= tier2Units;
            }

            // Tier 3 (300+ units)
            if (remainingUnits > 0) {
                cost += remainingUnits * (tariff.tier3_rate || 9);
            }

            billAmount = cost;
        } else {
            // Fallback: simple calculation if no tariff found
            billAmount = baseFee + (unitsConsumed * 7);
        }

        const consumptionData = {
            user_id: userId,
            month: readingMonth,
            billing_month: billingMonth,
            units: currReading,
            units_consumed: unitsConsumed
        };

        // 2. Insert or Update Consumption
        if (existingReading) {
            // Update existing record
            const { error: consumptionError } = await supabase
                .from('consumption')
                .update(consumptionData)
                .eq('user_id', userId)
                .eq('month', readingMonth);

            if (consumptionError) throw consumptionError;
        } else {
            // Insert new record
            const { error: consumptionError } = await supabase
                .from('consumption')
                .insert([consumptionData]);

            if (consumptionError) throw consumptionError;
        }

        // 3. Check if bill exists for this month
        const { data: existingBill, error: billCheckError } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', userId)
            .eq('month', billingMonth)
            .single();

        if (billCheckError && billCheckError.code !== 'PGRST116') {
            throw billCheckError;
        }

        const dueDate = new Date(billingMonth);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(15); // Due on 15th of next month

        const billData = {
            user_id: userId,
            month: billingMonth,
            units: unitsConsumed,
            amount: billAmount,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'Pending'
        };

        // 4. Insert or Update Bill
        if (existingBill) {
            const { error: billError } = await supabase
                .from('bills')
                .update(billData)
                .eq('user_id', userId)
                .eq('month', billingMonth);

            if (billError) throw billError;
        } else {
            const { error: billError } = await supabase
                .from('bills')
                .insert([billData]);

            if (billError) throw billError;
        }

        alert(`Reading saved and bill ${existingReading ? 'updated' : 'generated'} successfully!\n\nUnits Consumed: ${unitsConsumed.toFixed(2)} kWh\nBill Amount: ₹${billAmount.toFixed(2)}\nDue Date: ${dueDate.toLocaleDateString()}`);
        closeModal();
        loadUsers();

    } catch (error) {
        console.error('Error saving reading:', error);
        alert('Error: ' + error.message);
    }
});

// Init
loadUsers();
