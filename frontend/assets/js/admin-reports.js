import { Auth } from './auth.js';
import { toggleTheme, showAlert } from './utils.js';
import { API } from './api.js';
import { supabase } from './supabase.js';

// Local cache for report data
let REPORT_DATA = {
    bills: [],
    users: [],
    readings: []
};

// Auth Check (safe guard)
if (!Auth.checkAuth || !Auth.checkAuth('ADMIN')) {
    // If Auth.checkAuth exists it will redirect; otherwise continue (for local dev)
}

// Utility: CSV escaping and download
const csvEscape = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

const download = (filename, content, mime = 'text/csv') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

const buildCSV = (headers, rows) => {
    const lines = [headers.map(csvEscape).join(',')];
    rows.forEach(r => {
        const row = headers.map(h => csvEscape(r[h] ?? ''));
        lines.push(row.join(','));
    });
    return lines.join('\n');
};

// Prepare data once on load
const prepareData = async () => {
    try {
        if (API && API.admin && API.admin.getAllBills) {
            REPORT_DATA.bills = await API.admin.getAllBills();
        }
    } catch (err) {
        console.error('Error fetching bills for reports:', err);
    }

    try {
        if (API && API.admin && API.admin.getUsers) {
            REPORT_DATA.users = await API.admin.getUsers();
        }
    } catch (err) {
        console.error('Error fetching users for reports:', err);
    }

    try {
        if (supabase && supabase.from) {
            const { data, error } = await supabase.from('readings').select('*, profiles(id, name, email)');
            if (error) throw error;
            REPORT_DATA.readings = data || [];
        }
    } catch (err) {
        console.error('Error fetching readings for reports:', err);
    }
};

// Helper: normalize bill fields across possible schemas
const normalizeBill = (b) => {
    if (!b) return {};
    const customer = (b.profiles && (b.profiles.name || b.profiles.email)) || b.user_name || b.userName || b.customer_name || b.customer || null;
    const customerEmail = (b.profiles && (b.profiles.email)) || b.email || null;
    const meter_no = b.meter_no || b.meterNumber || b.meterId || b.meter_id || b.meter || b.meterNo || null;
    const period = b.period || b.month || b.billing_month || b.month_name || null;
    const units = b.units || b.units_consumed || b.total_units || b.unitsConsumed || 0;
    const fixed_charges = b.fixed_charges || b.fixedCharge || b.fixed || b.fixed_chg || 0;
    const amount = b.amount || b.total_amount || b.amt || 0;
    const due_date = b.due_date || b.dueDate || b.due || b.due_on || b.created_at || null;
    const status = b.status || b.payment_status || null;
    return {
        id: b.id || b.bill_id || b._id || null,
        customer,
        customerEmail,
        meter_no,
        period,
        units_consumed: units,
        fixed_charges,
        amount,
        due_date,
        status,
        raw: b
    };
};

const downloadReport = (reportType, format) => {
    // Ensure data available
    if (!REPORT_DATA) REPORT_DATA = { bills: [], users: [], readings: [] };

    if (reportType === 'revenue') {
        const map = new Map();
        (REPORT_DATA.bills || []).forEach(b => {
            const nb = normalizeBill(b);
            const dt = new Date(nb.due_date || nb.raw?.created_at || nb.period || b.created_at || b.date || null);
            const key = dt instanceof Date && !isNaN(dt) ? dt.toLocaleString('en-IN', { month: 'short', year: 'numeric' }) : (nb.period || 'Unknown');
            const amt = parseFloat(nb.amount || 0) || 0;
            const units = parseFloat(nb.units_consumed || 0) || 0;
            const fixed = parseFloat(nb.fixed_charges || 0) || 0;
            const agg = map.get(key) || { revenue: 0, units: 0, fixed: 0, count: 0 };
            agg.revenue += amt;
            agg.units += units;
            agg.fixed += fixed;
            agg.count += 1;
            map.set(key, agg);
        });

        const rows = Array.from(map.entries()).map(([month, agg]) => ({ Month: month, Revenue: Number(agg.revenue).toFixed(2), TotalUnits: agg.units, FixedCharges: Number(agg.fixed).toFixed(2) }));

        if (format === 'csv') {
            const csv = buildCSV(['Month', 'Revenue', 'TotalUnits', 'FixedCharges'], rows);
            download('revenue-report.csv', csv);
        } else {
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.color = '#0b1220';
            container.style.fontFamily = 'Inter, Arial, sans-serif';
            container.style.fontSize = '12px';
            container.innerHTML = `<h2 style="margin-bottom:8px;color:#0b1220">Revenue Report</h2>`;
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                table { width:100%; border-collapse:collapse; color:#0b1220; font-size:12px }
                th { font-weight:700; color:#091224; padding:8px; text-align:left; border-bottom:1px solid #ddd }
                td { padding:8px; border-bottom:1px solid #f0f0f0 }
            `;
            container.appendChild(styleEl);
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `<thead><tr><th>Month</th><th style="text-align:right">Revenue</th><th style="text-align:right">Total Units</th><th style="text-align:right">Fixed Charges</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            rows.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.Month}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.Revenue}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.TotalUnits}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.FixedCharges}</td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
            document.body.appendChild(container);
            try {
                if (typeof html2pdf === 'undefined') throw new Error('html2pdf not loaded');
                html2pdf().from(container).set({ filename: 'revenue-report.pdf', html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save();
                showAlert('Revenue PDF download started', 'success');
            } catch (err) {
                console.error('PDF generation error:', err);
                showAlert('PDF generation failed, downloading JSON', 'error');
                download('revenue-report.json', JSON.stringify(rows, null, 2), 'application/json');
            } finally {
                container.remove();
            }
        }
        return;
    }

    if (reportType === 'outstanding-bills') {
        const rows = (REPORT_DATA.bills || []).filter(b => (((b.status || b.payment_status || '') + '').toLowerCase() !== 'paid')).map(b => {
            const nb = normalizeBill(b);
            return {
                id: nb.id || b.id,
                customer: nb.customer || nb.customerEmail || (b.profiles && b.profiles.name) || (b.user_id || b.userId) || '',
                meter_no: nb.meter_no || (b.meter_no || b.meterId || ''),
                period: nb.period || b.month || '',
                units: nb.units_consumed || b.units || 0,
                fixed_charges: nb.fixed_charges || 0,
                amount: nb.amount || b.amount || 0,
                due_date: nb.due_date || b.due_date || b.dueDate || b.due || '',
                status: nb.status || b.status || b.payment_status || ''
            };
        });

        if (format === 'csv') {
            const csv = buildCSV(['id', 'customer', 'meter_no', 'period', 'units', 'fixed_charges', 'amount', 'due_date', 'status'], rows);
            download('outstanding-bills.csv', csv);
        } else {
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.color = '#0b1220';
            container.style.fontFamily = 'Inter, Arial, sans-serif';
            container.style.fontSize = '12px';
            container.innerHTML = `<h2 style="margin-bottom:8px;color:#0b1220">Outstanding Bills</h2>`;
            const styleEl2 = document.createElement('style');
            styleEl2.textContent = `
                table { width:100%; border-collapse:collapse; color:#0b1220; font-size:12px }
                th { font-weight:700; color:#091224; padding:8px; text-align:left; border-bottom:1px solid #ddd }
                td { padding:8px; border-bottom:1px solid #f0f0f0 }
            `;
            container.appendChild(styleEl2);
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `<thead><tr><th>ID</th><th>Customer</th><th>Meter No</th><th>Period</th><th style="text-align:right">Units</th><th style="text-align:right">Fixed Charges</th><th style="text-align:right">Amount</th><th>Due Date</th><th>Status</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            rows.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.id}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.customer}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.meter_no}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.period}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.units}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.fixed_charges}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.amount}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.due_date}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.status}</td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
            document.body.appendChild(container);
            try {
                if (typeof html2pdf === 'undefined') throw new Error('html2pdf not loaded');
                html2pdf().from(container).set({ filename: 'outstanding-bills.pdf', html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save();
                showAlert('Outstanding bills PDF download started', 'success');
            } catch (err) {
                console.error('PDF generation error:', err);
                showAlert('PDF generation failed, downloading JSON', 'error');
                download('outstanding-bills.json', JSON.stringify(rows, null, 2), 'application/json');
            } finally {
                container.remove();
            }
        }
        return;
    }

    if (reportType === 'user-activity') {
        const rows = (REPORT_DATA.users || []).map(u => ({ id: u.id, name: u.name || '', email: u.email || '', status: u.status || 'inactive' }));

        if (format === 'csv') {
            const csv = buildCSV(['id', 'name', 'email', 'active'], rows);
            download('user-activity.csv', csv);
        } else {
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.color = '#0b1220';
            container.style.fontFamily = 'Inter, Arial, sans-serif';
            container.style.fontSize = '12px';
            container.innerHTML = `<h2 style="margin-bottom:8px;color:#0b1220">User Activity</h2>`;
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                table { width:100%; border-collapse:collapse; color:#0b1220; font-size:12px }
                th { font-weight:700; color:#091224; padding:8px; text-align:left; border-bottom:1px solid #ddd }
                td { padding:8px; border-bottom:1px solid #f0f0f0 }
            `;
            container.appendChild(styleEl);
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `<thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Active</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            rows.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.id}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.name}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.email}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.active}</td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
            document.body.appendChild(container);
            try {
                if (typeof html2pdf === 'undefined') throw new Error('html2pdf not loaded');
                html2pdf().from(container).set({ filename: 'user-activity.pdf' }).save();
                showAlert('User activity PDF download started', 'success');
            } catch (err) {
                console.error('PDF generation error:', err);
                showAlert('PDF generation failed, downloading JSON', 'error');
                download('user-activity.json', JSON.stringify(rows, null, 2), 'application/json');
            } finally {
                container.remove();
            }
        }
        return;
    }

    if (reportType === 'all-readings') {
        const rows = (REPORT_DATA.readings || []).map(r => ({ id: r.id, customer: r.profiles ? r.profiles.name : (r.user_id || r.userId || ''), month: r.billing_month || r.month || r.period || '', curr_reading: r.curr_reading || r.current || '', prev_reading: r.prev_reading || r.previous || '', units: r.units_consumed || r.units || 0 }));

        if (format === 'csv') {
            const csv = buildCSV(['id', 'customer', 'month', 'curr_reading', 'prev_reading', 'units'], rows);
            download('all-readings.csv', csv);
        } else {
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.color = '#0b1220';
            container.style.fontFamily = 'Inter, Arial, sans-serif';
            container.style.fontSize = '12px';
            container.innerHTML = `<h2 style="margin-bottom:8px;color:#0b1220">All Readings</h2>`;
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                table { width:100%; border-collapse:collapse; color:#0b1220; font-size:12px }
                th { font-weight:700; color:#091224; padding:8px; text-align:left; border-bottom:1px solid #ddd }
                td { padding:8px; border-bottom:1px solid #f0f0f0 }
            `;
            container.appendChild(styleEl);
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.innerHTML = `<thead><tr><th>ID</th><th>Customer</th><th>Month</th><th style="text-align:right">Curr</th><th style="text-align:right">Prev</th><th style="text-align:right">Units</th></tr></thead>`;
            const tbody = document.createElement('tbody');
            rows.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.id}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.customer}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0">${r.month}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.curr_reading}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.prev_reading}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">${r.units}</td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.appendChild(table);
            document.body.appendChild(container);
            try {
                if (typeof html2pdf === 'undefined') throw new Error('html2pdf not loaded');
                html2pdf().from(container).set({ filename: 'all-readings.pdf' }).save();
                showAlert('All readings PDF download started', 'success');
            } catch (err) {
                console.error('PDF generation error:', err);
                showAlert('PDF generation failed, downloading JSON', 'error');
                download('all-readings.json', JSON.stringify(rows, null, 2), 'application/json');
            } finally {
                container.remove();
            }
        }
        return;
    }
};

// Kick off data loading and attach handlers when DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    await prepareData();

    document.querySelectorAll('button[data-report]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const report = btn.getAttribute('data-report');
            const format = btn.getAttribute('data-format') || 'pdf';
            try {
                downloadReport(report, format);
            } catch (err) {
                console.error('Download report failed:', err);
                showAlert('Report generation failed', 'error');
            }
        });
    });

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
