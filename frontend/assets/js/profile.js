import { Auth } from './auth.js';
import { API } from './api.js';
import { toggleTheme, showAlert } from './utils.js';
import { CONFIG } from './config.js';
import { supabase } from './supabase.js';
import { Sidebar } from './components/sidebar.js';

// Initialize Sidebar
Sidebar.init();

// Auth Check — allow any authenticated role (user or admin) to access profile
if (!Auth.checkAuth()) {
    // Redirect handled in checkAuth
}

const user = Auth.getUser();

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile script: DOMContentLoaded fired');

    // UI Elements
    const userInitials = document.getElementById('userInitials');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    // Profile Specific Elements
    const profileInitials = document.getElementById('profileInitials');
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    const inputName = document.getElementById('inputName');
    const inputEmail = document.getElementById('inputEmail');
    const profileForm = document.getElementById('profileForm');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    // Customer Info Input Fields
    const inputMobile = document.getElementById('inputMobile');
    const inputPhone = document.getElementById('inputPhone');
    const inputStreet = document.getElementById('inputStreet');
    const inputCity = document.getElementById('inputCity');
    const inputState = document.getElementById('inputState');
    const inputPostal = document.getElementById('inputPostal');
    const inputCountry = document.getElementById('inputCountry');
    const inputMeter = document.getElementById('inputMeter');

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
        const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        if (userInitials) userInitials.textContent = initials;
        if (userName) userName.textContent = user.name || 'User';
        if (userEmail) userEmail.textContent = user.email;

        if (profileInitials) profileInitials.textContent = initials;
        if (profileName) profileName.textContent = user.name || 'User';
        if (profileRole) profileRole.textContent = user.role;
        if (inputName) inputName.value = user.name || '';
        if (inputEmail) inputEmail.value = user.email || '';

        // Load profile and consumption data
        loadProfileData();
        loadConsumptionLimit();
    }

    // Load Profile Data
    async function loadProfileData() {
        try {
            // Try to load extended customer_info record first
            const info = await API.user.getCustomerInfo(user.id);
            if (info) {
                console.log('Loaded customer_info:', info);
                if (inputMobile) inputMobile.value = info.mobile_number || '';
                if (inputPhone) inputPhone.value = info.phone_number || '';
                if (inputStreet) inputStreet.value = info.street_address || '';
                if (inputCity) inputCity.value = info.city || '';
                if (inputState) inputState.value = info.state_province || '';
                if (inputPostal) inputPostal.value = info.postal_code || '';
                if (inputCountry) inputCountry.value = info.country || 'India';
                if (inputMeter) inputMeter.value = info.meter_number || '';
            } else {
                // Fallback to basic profile data if customer_info is missing
                if (inputMobile) inputMobile.value = user.phone || '';
                if (inputPhone) inputPhone.value = user.phone || '';
                if (inputStreet) inputStreet.value = '';
                if (inputCity) inputCity.value = '';
                if (inputState) inputState.value = '';
                if (inputPostal) inputPostal.value = '';
                if (inputCountry) inputCountry.value = 'India';
                if (inputMeter) inputMeter.value = '';
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
            // If error originates from missing/expired auth session, prompt re-login
            if (error && error.message && error.message.toLowerCase().includes('auth')) {
                showAlert('Session expired — please sign in again', 'error');
                setTimeout(() => Auth.logout(), 1200);
                return;
            }
        }
    }

    // Save Profile Data
    if (saveProfileBtn) {
        console.log('Save Profile button found, attaching event listener');
        saveProfileBtn.addEventListener('click', async () => {
            console.log('Save Profile button clicked!');
            try {
                const profileData = {
                    name: inputName ? inputName.value.trim() : '',
                    mobile_number: inputMobile ? inputMobile.value.trim() : '',
                    phone_number: inputPhone ? inputPhone.value.trim() : '',
                    street_address: inputStreet ? inputStreet.value.trim() : '',
                    city: inputCity ? inputCity.value.trim() : '',
                    state_province: inputState ? inputState.value.trim() : '',
                    postal_code: inputPostal ? inputPostal.value.trim() : '',
                    country: inputCountry ? (inputCountry.value.trim() || 'India') : 'India',
                    meter_number: inputMeter ? inputMeter.value.trim() : '',
                };

                // Validate required fields
                if (!profileData.name) {
                    showAlert('Name is required', 'error');
                    return;
                }

                // Disable button during save
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = 'Saving...';

                // Update name in profiles table
                try {
                    const { data: profileUpdate, error: profileError } = await supabase
                        .from('profiles')
                        .update({ name: profileData.name })
                        .eq('id', user.id)
                        .select()
                        .single();

                    if (profileError) throw profileError;
                    console.log('Profile name updated:', profileUpdate);
                } catch (profileErr) {
                    console.error('Error updating profile name:', profileErr);
                    throw new Error('Failed to update profile name: ' + profileErr.message);
                }

                // Save contact and address info to customer_info table via API
                const saved = await API.user.updateCustomerInfo(user.id, profileData);
                console.log('Customer info saved:', saved);

                // Update displayed profile name and initials if name was changed
                if (profileData.name) {
                    if (profileName) profileName.textContent = profileData.name;
                    if (profileInitials) profileInitials.textContent = profileData.name.charAt(0).toUpperCase();
                    if (userName) userName.textContent = profileData.name;
                    if (userInitials) userInitials.textContent = profileData.name.charAt(0).toUpperCase();

                    // Also update session user
                    const sessionUser = Auth.getUser();
                    if (sessionUser) {
                        sessionUser.name = profileData.name;
                        sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(sessionUser));
                    }
                }

                showAlert('Profile information saved successfully!', 'success');
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Save Profile';

            } catch (error) {
                console.error('Error saving profile:', error);
                if (error && error.message && error.message.toLowerCase().includes('auth')) {
                    showAlert('Session expired — please sign in again', 'error');
                    setTimeout(() => Auth.logout(), 1200);
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = 'Save Profile';
                    return;
                }
                showAlert('Error saving profile: ' + error.message, 'error');
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = 'Save Profile';
            }
        });
    } else {
        console.error('Save Profile button not found! Check if element with id="saveProfileBtn" exists');
    }

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

    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());



}); // End DOMContentLoaded
