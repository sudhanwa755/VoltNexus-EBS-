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



    // Customize UI for Admin users
    if (user && user.role === 'ADMIN') {
        console.log('User is ADMIN, adjusting profile UI references');

        // Update sidebar links (profile.html uses the shared sidebar structure which defaults to user links)
        const navContainer = document.querySelector('aside nav');
        if (navContainer) {
            navContainer.innerHTML = `
                <a href="admin/dashboard.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                    </svg>
                    Dashboard
                </a>
                <a href="admin/manage-users.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z">
                        </path>
                    </svg>
                    Manage Users
                </a>
                <a href="admin/bills.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                        </path>
                    </svg>
                    Manage Bills
                </a>
                <a href="admin/tariffs.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                        </path>
                    </svg>
                    Tariffs
                </a>
                <a href="admin/add-reading.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Add Reading
                </a>
                 <a href="admin/reports.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                        </path>
                    </svg>
                    Reports
                </a>
                <a href="profile.html"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium ring-1 ring-violet-200 dark:ring-violet-700/50">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Profile
                </a>
            `;
        }

        // Hide Meter Number input for admins (not relevant)
        const meterContainer = document.getElementById('inputMeter')?.closest('.md\\:col-span-2');
        if (meterContainer) {
            meterContainer.style.display = 'none';
        }
    }

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

        // Member Since Year
        if (document.getElementById('memberSince')) {
            try {
                // Use created_at from user object, fallback to current year if missing
                const dateString = user.created_at || new Date().toISOString();
                const joinYear = new Date(dateString).getFullYear();
                const memberSinceEl = document.getElementById('memberSince');

                const iconHtml = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`;

                memberSinceEl.innerHTML = `${iconHtml} Member since ${joinYear}`;
            } catch (e) {
                console.error('Error parsing member since date:', e);
            }
        }

        // Load profile and consumption data
        loadProfileData();

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



    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());



}); // End DOMContentLoaded
