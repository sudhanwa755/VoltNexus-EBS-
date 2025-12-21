import { Auth } from './auth.js';
import { API } from './api.js';
import { toggleTheme } from './utils.js';

// Auth Check
if (!Auth.checkAuth('ADMIN')) {
    // Redirect handled in checkAuth
}

const user = Auth.getUser();

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// UI Elements
const userInitials = document.getElementById('userInitials');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const tariffForm = document.getElementById('tariffForm');

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





// Load existing tariff data
const loadTariffs = async () => {
    try {
        const plans = await API.admin.getTariffPlans();

        if (plans && plans.length > 0) {
            // Use the first active plan
            const activePlan = plans.find(p => p.is_active) || plans[0];

            // Load tier rates
            if (activePlan.tier1_rate) {
                document.getElementById('slab1').value = activePlan.tier1_rate;
            }
            if (activePlan.tier2_rate) {
                document.getElementById('slab2').value = activePlan.tier2_rate;
            }
            if (activePlan.tier3_rate) {
                document.getElementById('slab3').value = activePlan.tier3_rate;
            }

            // Set base fee as fixed charge
            if (activePlan.base_fee) {
                document.getElementById('fixedCharge').value = activePlan.base_fee;
            }

            // Set effective from date
            if (activePlan.effective_from) {
                document.getElementById('effectiveFrom').value = activePlan.effective_from;
            }
        } else {
            // Set default date to today if no plans exist
            document.getElementById('effectiveFrom').value = new Date().toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Error loading tariffs:', error);
        // Set default date to today on error
        document.getElementById('effectiveFrom').value = new Date().toISOString().split('T')[0];
    }
};

// Handle form submission
tariffForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const slab1 = parseFloat(document.getElementById('slab1').value);
    const slab2 = parseFloat(document.getElementById('slab2').value);
    const slab3 = parseFloat(document.getElementById('slab3').value);
    const fixedCharge = parseFloat(document.getElementById('fixedCharge').value);
    const effectiveFrom = document.getElementById('effectiveFrom').value;

    // Validate effective date
    if (!effectiveFrom) {
        alert('Please select an effective date');
        return;
    }

    const tariffData = {
        name: 'Standard Residential Tariff',
        description: 'Default residential electricity tariff',
        category: 'residential',
        base_fee: fixedCharge,
        tier1_units_up_to: 100,
        tier1_rate: slab1,
        tier2_units_up_to: 300,
        tier2_rate: slab2,
        tier3_units_up_to: null,
        tier3_rate: slab3,
        tax_percentage: 0,
        effective_from: effectiveFrom,
        is_active: true
    };

    try {
        // Check if a tariff plan already exists
        const existingPlans = await API.admin.getTariffPlans();
        const existingPlan = existingPlans.find(p => p.name === tariffData.name);

        if (existingPlan) {
            // Update existing plan
            await API.admin.updateTariffPlan(existingPlan.id, tariffData);
            alert('Tariff rates updated successfully!');
        } else {
            // Create new plan
            await API.admin.createTariffPlan(tariffData);
            alert('Tariff plan created successfully!');
        }

        loadTariffs();
    } catch (error) {
        console.error('Error saving tariffs:', error);
        alert('Error saving tariff rates: ' + error.message);
    }
});

// Load tariffs on page load
loadTariffs();
