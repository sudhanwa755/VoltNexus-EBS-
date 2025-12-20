import { Auth } from './auth.js';
import { API } from './api.js';
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
const userSearch = document.getElementById('userSearch');

// Initialize User Info
if (user) {
    userInitials.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'A';
    userName.textContent = user.name || 'Admin';
    userEmail.textContent = user.email;
}

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Logout
logoutBtn.addEventListener('click', () => {
    Auth.logout();
});



// Modal Functions
const editUserModal = document.getElementById('editUserModal');
const editUserForm = document.getElementById('editUserForm');
const modalTitle = document.getElementById('modalTitle');
const editUserId = document.getElementById('editUserId');
const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editRole = document.getElementById('editRole');
const editStatus = document.getElementById('editStatus');

window.openCreateUserModal = () => {
    alert("To create a new user, please use the Registration page. Admin creation of users requires backend integration not currently available in this demo.");
};

window.openEditModal = async (id) => {
    try {
        const users = await API.admin.getUsers();
        const user = users.find(u => u.id === id);

        if (!user) throw new Error("User not found");

        editUserId.value = user.id;
        editName.value = user.name || '';
        editEmail.value = user.email || '';
        editRole.value = user.role;
        editStatus.value = user.status;

        modalTitle.textContent = "Edit User";
        editUserModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error opening modal:', error);
        alert('Error loading user details');
    }
};

window.closeEditModal = () => {
    editUserModal.classList.add('hidden');
    editUserForm.reset();
};

// Handle Form Submit
editUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = editUserId.value;
    const updates = {
        name: editName.value,
        role: editRole.value,
        status: editStatus.value
    };

    try {
        await API.admin.updateUser(id, updates);
        window.closeEditModal();
        loadUsers(); // Reload list
        alert('User updated successfully');
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + error.message);
    }
});

// Helper Functions
const getInitials = (name) => {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const getAvatarColor = (name) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
        'bg-rose-500'
    ];
    if (!name) return colors[10]; // Default blue
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

// Load and Render Users
let allUsers = []; // Store users for searching

const renderUsersTable = (users) => {
    usersTableBody.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-slate-800 last:border-0">
            <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${getAvatarColor(u.name)} flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        ${getInitials(u.name)}
                    </div>
                    <div>
                        <div class="font-medium text-slate-900 dark:text-slate-100">${u.name || 'Unknown User'}</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">${u.email}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${u.role === 'ADMIN'
            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        }">
                    ${u.role}
                </span>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${u.status === 'active'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }">
                    <span class="w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}"></span>
                    ${u.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="window.openEditModal('${u.id}')" 
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Edit
                    </button>
                    ${u.role !== 'ADMIN' ? `
                        <button onclick="window.addBill('${u.id}')" 
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00 2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                            Add Reading
                        </button>
                        <button onclick="window.deleteUser('${u.id}')" 
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Delete
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
};

const loadUsers = async () => {
    try {
        console.log('Fetching users...');
        allUsers = await API.admin.getUsers();
        console.log('Users fetched:', allUsers);
        renderUsersTable(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
};

// Search Functionality
userSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(searchTerm)) ||
        (u.email && u.email.toLowerCase().includes(searchTerm))
    );
    renderUsersTable(filteredUsers);
});

// Global functions for button clicks
window.addBill = (userId) => {
    window.location.href = `add-reading.html?userId=${userId}`;
};

window.deleteUser = async (id) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        try {
            await API.admin.deleteUser(id);
            loadUsers();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
};

// Init
loadUsers();
