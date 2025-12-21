import { Auth } from './auth.js';
import { API } from './api.js';
import { toggleTheme, showAlert } from './utils.js';
import { Sidebar } from './components/sidebar.js';

// Initialize Sidebar
Sidebar.init();

// Auth Check
if (!Auth.checkAuth()) {
    // Redirect handled in checkAuth
}

const user = Auth.getUser();

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const userInitials = document.getElementById('userInitials');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeToggle = document.getElementById('themeToggle');

    // Consumption Limit Elements
    const consumptionLimit = document.getElementById('consumptionLimit');
    const alertThreshold = document.getElementById('alertThreshold');
    const emailAlert = document.getElementById('emailAlert');
    const saveLimitBtn = document.getElementById('saveLimitBtn');
    const clearLimitBtn = document.getElementById('clearLimitBtn');
    const currentLimitDisplay = document.getElementById('currentLimitDisplay');
    const currentLimitValue = document.getElementById('currentLimitValue');
    const currentThresholdValue = document.getElementById('currentThresholdValue');

    // Initialize User Info
    if (user) {
        if (userInitials) userInitials.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        if (userName) userName.textContent = user.name || 'User';
        if (userEmail) userEmail.textContent = user.email;

        // Load consumption data
        loadConsumptionLimit();
    }

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

    // Load Consumption Limit
    async function loadConsumptionLimit() {
        try {
            const limit = await API.user.getConsumptionLimit(user.id);
            if (limit) {
                if (consumptionLimit) consumptionLimit.value = limit.monthly_limit || '';
                if (alertThreshold) alertThreshold.value = limit.alert_threshold || 80;
                if (emailAlert) emailAlert.checked = limit.email_alert !== false;

                // Show current limit
                if (currentLimitValue) currentLimitValue.textContent = limit.monthly_limit;
                if (currentThresholdValue) currentThresholdValue.textContent = limit.alert_threshold;
                if (currentLimitDisplay) currentLimitDisplay.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error loading consumption limit:', error);
            if (error && error.message && error.message.toLowerCase().includes('auth')) {
                showAlert('Session expired — please sign in again', 'error');
                setTimeout(() => Auth.logout(), 1200);
                return;
            }
        }
    }

    // Save Consumption Limit
    if (saveLimitBtn) {
        saveLimitBtn.addEventListener('click', async () => {
            try {
                const limit = parseInt(consumptionLimit.value) || null;
                const threshold = parseInt(alertThreshold.value) || 80;

                if (limit && limit <= 0) {
                    showAlert('Consumption limit must be greater than 0', 'error');
                    return;
                }

                if (threshold < 50 || threshold > 100) {
                    showAlert('Alert threshold must be between 50% and 100%', 'error');
                    return;
                }

                await API.user.setConsumptionLimit(user.id, limit, threshold, emailAlert.checked);
                showAlert('Consumption limit saved successfully!', 'success');
                loadConsumptionLimit();
            } catch (error) {
                console.error('Error saving consumption limit:', error);
                if (error && error.message && error.message.toLowerCase().includes('auth')) {
                    showAlert('Session expired — please sign in again', 'error');
                    setTimeout(() => Auth.logout(), 1200);
                    return;
                }
                showAlert('Error saving consumption limit: ' + error.message, 'error');
            }
        });
    }

    // Clear Consumption Limit
    if (clearLimitBtn) {
        clearLimitBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to remove your consumption limit?')) return;

            try {
                await API.user.deleteConsumptionLimit(user.id);
                consumptionLimit.value = '';
                alertThreshold.value = 80;
                emailAlert.checked = true;
                currentLimitDisplay.classList.add('hidden');
                showAlert('Consumption limit cleared successfully!', 'success');
            } catch (error) {
                console.error('Error clearing consumption limit:', error);
                if (error && error.message && error.message.toLowerCase().includes('auth')) {
                    showAlert('Session expired — please sign in again', 'error');
                    setTimeout(() => Auth.logout(), 1200);
                    return;
                }
                showAlert('Error clearing consumption limit: ' + error.message, 'error');
            }
        });
    }

});
