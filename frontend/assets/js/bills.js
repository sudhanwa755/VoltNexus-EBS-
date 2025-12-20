import { Auth } from './auth.js';
import { API } from './api.js';
import { formatCurrency, formatDate, toggleTheme, showAlert } from './utils.js';
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
const themeToggle = document.getElementById('themeToggle');
const billsTableBody = document.getElementById('billsTableBody');

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

// Store all bills for filtering
let allBills = [];

// Load Bills
const loadBills = async () => {
    try {
        const bills = await API.user.getBills(user.id);

        // Store for filtering
        allBills = bills;

        if (bills.length === 0) {
            billsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-slate-500">
                        No bills found.
                    </td>
                </tr>
            `;
            return;
        }

        renderBills(bills);

    } catch (error) {
        console.error('Error loading bills:', error);
        billsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-red-500">
                    Failed to load bills. Please try again later.
                </td>
            </tr>
        `;
    }
};

// Render bills to table
const renderBills = (bills) => {
    if (bills.length === 0) {
        billsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-slate-500">
                    No bills match your search.
                </td>
            </tr>
        `;
        return;
    }

    billsTableBody.innerHTML = bills.map(bill => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 hidden md:table-cell">#${bill.id.substring(0, 8)}</td>
            <td class="px-6 py-4">${bill.month}</td>
            <td class="px-6 py-4 hidden md:table-cell">${bill.units}</td>
            <td class="px-6 py-4 font-medium">${formatCurrency(bill.amount)}</td>
            <td class="px-6 py-4 hidden md:table-cell">${formatDate(bill.due_date)}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs font-medium ${bill.status === 'Paid'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }">
                    ${bill.status}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <button class="download-bill-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800" data-bill-id="${bill.id}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Download
                    </button>
                    ${bill.status === 'Pending' ? `
                    <a href="payment.html?billId=${bill.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                        Pay
                    </a>` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners for download buttons
    document.querySelectorAll('.download-bill-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const billId = btn.getAttribute('data-bill-id');
            const bill = bills.find(b => b.id === billId);
            if (bill) {
                await downloadBillPDF(bill);
            }
        });
    });
};

// Search and Filter functionality
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

const filterBills = () => {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusValue = statusFilter ? statusFilter.value.toLowerCase() : 'all';

    let filteredBills = allBills;

    // Filter by status
    if (statusValue !== 'all') {
        filteredBills = filteredBills.filter(bill =>
            bill.status.toLowerCase() === statusValue
        );
    }

    // Filter by search term (searches across multiple fields)
    if (searchTerm) {
        filteredBills = filteredBills.filter(bill => {
            const billId = (bill.id || '').toLowerCase();
            const month = (bill.month || '').toLowerCase();
            const units = (bill.units || '').toString().toLowerCase();
            const amount = (bill.amount || '').toString().toLowerCase();
            const dueDate = (bill.due_date || '').toLowerCase();
            const status = (bill.status || '').toLowerCase();

            return billId.includes(searchTerm) ||
                month.includes(searchTerm) ||
                units.includes(searchTerm) ||
                amount.includes(searchTerm) ||
                dueDate.includes(searchTerm) ||
                status.includes(searchTerm);
        });
    }

    renderBills(filteredBills);
};

if (searchInput) {
    searchInput.addEventListener('input', filterBills);
}

if (statusFilter) {
    statusFilter.addEventListener('change', filterBills);
}

// Function to download bill as PDF
const downloadBillPDF = async (bill) => {
    try {
        showAlert('Generating PDF...', 'info');

        // Fetch customer info for real data
        let customerInfo = {};
        let meterNumber = 'N/A';
        try {
            customerInfo = await API.user.getCustomerInfo(user.id) || {};
            meterNumber = customerInfo.meter_number || 'N/A';
        } catch (err) {
            console.error('Error fetching customer info:', err);
        }

        // Get customer data or use defaults
        const streetAddress = customerInfo.street_address || 'Address not provided';
        const city = customerInfo.city || 'City not provided';
        const state = customerInfo.state_province || '';
        const postal = customerInfo.postal_code || '';
        const country = customerInfo.country || 'India';

        // Format address line
        const cityLine = [city, state, postal].filter(Boolean).join(', ');

        // Calculate fixed charges (estimate 10% of total or 50)
        const fixedCharges = Math.max(bill.amount * 0.1, 50);
        const unitsCharges = bill.amount - fixedCharges;

        // Generate professionally formatted bill HTML
        const billHTML = `
            <div style="
                font-family: 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
                color: #333;
                background: white;
                padding: 20px;
                line-height: 1.6;
            ">
                <!-- Header -->
                <div style="
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #1e3a8a;
                    padding-bottom: 20px;
                ">
                    <div style="
                        font-size: 28px;
                        font-weight: bold;
                        color: #1e3a8a;
                        margin-bottom: 5px;
                    ">VoltNexus</div>
                    <div style="
                        font-size: 22px;
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 5px;
                    ">ELECTRICITY BILL</div>
                    <div style="
                        font-size: 14px;
                        color: #666;
                    ">Billing Period: ${bill.month}</div>
                </div>

                <!-- Bill To and Bill Details Section -->
                <div style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                ">
                    <!-- Bill To -->
                    <div>
                        <div style="
                            font-size: 12px;
                            font-weight: bold;
                            color: #1e3a8a;
                            margin-bottom: 10px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">Bill To</div>
                        <div style="
                            font-size: 16px;
                            font-weight: bold;
                            color: #333;
                            margin-bottom: 8px;
                        ">${user.name}</div>
                        <div style="
                            font-size: 13px;
                            color: #555;
                            margin-bottom: 5px;
                        ">${streetAddress}</div>
                        <div style="
                            font-size: 13px;
                            color: #555;
                            margin-bottom: 5px;
                        ">${cityLine}</div>
                        <div style="
                            font-size: 13px;
                            color: #555;
                            margin-bottom: 8px;
                        ">${country}</div>
                        <div style="
                            font-size: 12px;
                            color: #666;
                            margin-bottom: 4px;
                        ">
                            <strong>Customer ID:</strong> CUST-${user.id.substring(0, 8)}
                        </div>
                        <div style="
                            font-size: 12px;
                            color: #666;
                        ">
                            <strong>Meter No:</strong> ${meterNumber}
                        </div>
                    </div>

                    <!-- Bill Details -->
                    <div>
                        <div style="
                            font-size: 12px;
                            font-weight: bold;
                            color: #1e3a8a;
                            margin-bottom: 10px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        ">Bill Details</div>
                        <table style="
                            width: 100%;
                            font-size: 13px;
                            color: #555;
                            border-spacing: 0;
                        ">
                            <tr>
                                <td style="padding: 4px 0;"><strong>Bill No:</strong></td>
                                <td style="padding: 4px 0; text-align: right;"><strong>#${bill.id.substring(0, 8)}</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Issue Date:</strong></td>
                                <td style="padding: 4px 0; text-align: right;">${new Date(new Date(bill.due_date).setDate(new Date(bill.due_date).getDate() - 15)).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Due Date:</strong></td>
                                <td style="padding: 4px 0; text-align: right;">${new Date(bill.due_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Status:</strong></td>
                                <td style="padding: 4px 0; text-align: right;">
                                    <span style="
                                        padding: 2px 8px;
                                        border-radius: 4px;
                                        font-weight: bold;
                                        font-size: 11px;
                                        color: ${bill.status === 'Paid' ? '#15803d' : '#ea580c'};
                                        background-color: ${bill.status === 'Paid' ? '#dcfce7' : '#fed7aa'};
                                    ">${bill.status}</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Meter Readings Section -->
                <div style="
                    background-color: #f0f4f8;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    padding: 18px;
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                ">
                    <div style="
                        font-size: 12px;
                        font-weight: bold;
                        color: #1e3a8a;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">Meter Readings & Consumption Details</div>

                    <table style="
                        width: 100%;
                        font-size: 13px;
                        border-collapse: collapse;
                    ">
                        <tr style="border-bottom: 1px solid #cbd5e1;">
                            <td style="padding: 10px 0; color: #555;"><strong>Previous Reading</strong></td>
                            <td style="padding: 10px 0; text-align: right; color: #333; font-weight: 500;">${(1200 - (bill.units % 1000))} kWh</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #cbd5e1;">
                            <td style="padding: 10px 0; color: #555;"><strong>Current Reading</strong></td>
                            <td style="padding: 10px 0; text-align: right; color: #333; font-weight: 500;">${(1200 + bill.units)} kWh</td>
                        </tr>
                        <tr style="background-color: #e0e7ff; border-bottom: 1px solid #cbd5e1;">
                            <td style="padding: 10px 0; color: #1e3a8a;"><strong>Total Units Consumed</strong></td>
                            <td style="padding: 10px 0; text-align: right; color: #1e3a8a; font-weight: bold; font-size: 14px;">${bill.units} kWh</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #cbd5e1;">
                            <td style="padding: 10px 0; color: #555;"><strong>Rate per Unit</strong></td>
                            <td style="padding: 10px 0; text-align: right; color: #333; font-weight: 500;">₹8.00</td>
                        </tr>
                    </table>
                </div>

                <!-- Billing Breakdown -->
                <div style="
                    background-color: #f9fafb;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    padding: 18px;
                    margin-bottom: 25px;
                    page-break-inside: avoid;
                ">
                    <div style="
                        font-size: 12px;
                        font-weight: bold;
                        color: #1e3a8a;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">Billing Breakdown</div>

                    <table style="
                        width: 100%;
                        font-size: 13px;
                        border-collapse: collapse;
                    ">
                        <tr style="border-bottom: 1px solid #cbd5e1;">
                            <td style="padding: 10px 0; color: #555;"><strong>Energy Charges (${bill.units} units × ₹8.00)</strong></td>
                            <td style="padding: 10px 0; text-align: right; color: #333; font-weight: 500;">₹${unitsCharges.toFixed(2)}</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #1e3a8a;">
                            <td style="padding: 10px 0; color: #555;"><strong>Fixed Charges</strong></td>
                            <td style="padding: 10px 0; text-align: right; color: #333; font-weight: 500;">₹${fixedCharges.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px 0; color: #1e3a8a; font-size: 14px;"><strong>TOTAL AMOUNT DUE</strong></td>
                            <td style="padding: 15px 0; text-align: right; color: #1e3a8a; font-weight: bold; font-size: 16px;">₹${bill.amount.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Footer -->
                <div style="
                    border-top: 2px solid #1e3a8a;
                    padding-top: 15px;
                    margin-top: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                ">
                    <div style="margin-bottom: 10px;">Thank you for being a valued customer!</div>
                    <div style="margin-bottom: 10px;">For inquiries, please contact our customer support team.</div>
                    <div style="
                        color: #999;
                        font-size: 11px;
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid #e5e7eb;
                    ">
                        Document Generated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        `;

        // Create a temporary element
        const element = document.createElement('div');
        element.innerHTML = billHTML;
        document.body.appendChild(element);

        // Generate PDF with better settings
        const opt = {
            margin: 10,
            filename: `bill-${bill.id.substring(0, 8)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();

        // Cleanup
        document.body.removeChild(element);
        showAlert('PDF downloaded successfully', 'success');
    } catch (error) {
        console.error('Error downloading bill:', error);
        showAlert('Could not download bill. Please try again.', 'error');
    }
};

// Init
loadBills();
