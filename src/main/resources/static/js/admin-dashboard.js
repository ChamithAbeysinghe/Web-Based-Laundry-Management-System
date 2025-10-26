// Initialize sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', function() {
    document.body.classList.toggle('sidebar-collapsed');
});

// Configure your API base URL (Spring Boot default port)
const API_BASE = 'http://localhost:8080';
const TAX_PUBLIC_ENDPOINT = API_BASE + '/api/config/tax-rate';
const TAX_ADMIN_ENDPOINT = API_BASE + '/api/admin/config/tax-rate';

// Ensure dashboard sections open fully (override any collapsed defaults)
function showDashboardSections() {
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        dashboardSection.classList.add('active');
        dashboardSection.style.display = 'block';
        dashboardSection.style.visibility = 'visible';
        dashboardSection.style.height = 'auto';
    }
    const quickStats = document.querySelector('.quick-stats');
    if (quickStats) {
        quickStats.style.display = 'grid';      // or 'block' if your CSS prefers
        quickStats.style.maxHeight = 'none';
        quickStats.style.overflow = 'visible';
    }
    const dashboardContent = document.querySelector('.dashboard-content');
    if (dashboardContent) {
        // your CSS may use grid or flex; both are fine to "open fully"
        dashboardContent.style.display = 'grid'; // try 'flex' if your layout uses flexbox
        dashboardContent.style.gridTemplateColumns = '1fr 1fr';
        dashboardContent.style.maxHeight = 'none';
        dashboardContent.style.overflow = 'visible';
    }
    const leftCol = document.querySelector('.left-column');
    const rightCol = document.querySelector('.right-column');
    [leftCol, rightCol].forEach(col => {
        if (col) {
            col.style.display = 'block';
            col.style.maxHeight = 'none';
        }
    });
    // Make inner cards fully expanded
    document.querySelectorAll('.card, .card-body, .overview-chart').forEach(el => {
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
    });
}

// Helpers
async function apiGet(path, params = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.append(k, v));
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function apiJson(method, path, body, query = {}) {
    const url = new URL(API_BASE + path);
    Object.entries(query).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.append(k, v));
    const res = await fetch(url.toString(), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
}

function showOnlySection(targetId) {
    const sections = document.querySelectorAll('.main-content > section');
    sections.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
        // Ensure customer table is rendered with Delete button
        if (targetId === 'customer-management') {
            fetchCustomers();
        }
    }
}

async function loadTaxSettings() {
    try {
        const panel = document.getElementById('taxSettingsPanel');
        if (!panel) return; // panel not present in this layout
        const res = await fetch(TAX_PUBLIC_ENDPOINT, { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const rateDec = Number(data?.rate ?? 0.08);
        const ratePct = (isFinite(rateDec) ? rateDec : 0) * 100;
        const disp = document.getElementById('taxRateDisplay');
        const inp = document.getElementById('taxRateInput');
        if (disp) disp.textContent = ratePct.toFixed(2) + '%';
        if (inp && (inp.value === '' || !inp.dataset.touched)) {
            inp.value = ratePct.toFixed(2);
        }
    } catch (e) {
        console.warn('Failed to load tax settings:', e);
        const disp = document.getElementById('taxRateDisplay');
        if (disp) disp.textContent = '—';
    }
}

function setupTaxSettingsHandlers() {
    const inp = document.getElementById('taxRateInput');
    const btn = document.getElementById('saveTaxRateBtn');
    if (inp) {
        inp.addEventListener('input', () => { inp.dataset.touched = '1'; });
    }
    if (btn) {
        btn.addEventListener('click', async () => {
            try {
                const raw = (inp?.value ?? '').toString().trim();
                let pct = Number(raw);
                if (!isFinite(pct)) { alert('Please enter a valid percentage'); return; }
                if (pct < 0) pct = 0; if (pct > 100) pct = 100;
                const rate = pct / 100;
                const res = await fetch(TAX_ADMIN_ENDPOINT, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rate })
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                const updated = Number(data?.rate ?? rate);
                const disp = document.getElementById('taxRateDisplay');
                if (disp) disp.textContent = (updated * 100).toFixed(2) + '%';
                alert('Tax rate updated successfully.');
            } catch (e) {
                console.error('Failed to save tax rate:', e);
                alert('Failed to save tax rate: ' + e.message);
            }
        });
    }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    const user = (window.Auth && Auth.getUser) ? Auth.getUser('admin') : getSessionUser();
    if (!user) {
        alert('Access denied');
        window.location.href = 'login.html?role=admin';
        return;
    }
    if (window.Auth && Auth.setActiveRole) Auth.setActiveRole('admin');

    initCharts();
    setupNavigation();
    setupFormSubmissions();
    setupSearch();
    setupTaxSettingsHandlers();

    // Show only the dashboard section on load
    showOnlySection('dashboard');

    // Load ONLY dashboard data on initial page load - other sections load when navigated to
    loadOverview();

    // Reduced auto-refresh frequency: refresh every 60 seconds instead of 15 seconds
    // This reduces server load while still keeping data relatively fresh
    if (!window.overviewRefreshTimer) {
        window.overviewRefreshTimer = setInterval(() => {
            const dash = document.getElementById('dashboard');
            if (dash && dash.classList.contains('active')) {
                loadOverview().catch(() => {});
            }
        }, 60000); // Changed from 15000ms (15s) to 60000ms (60s)
        window.addEventListener('beforeunload', () => {
            clearInterval(window.overviewRefreshTimer);
            window.overviewRefreshTimer = null;
        });
    }

    const customerForm = document.getElementById('createCustomerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('customerName').value;
            const email = document.getElementById('customerEmail').value;
            const phone = document.getElementById('customerPhone').value;
            const messageDiv = document.getElementById('customerFormMessage');
            messageDiv.textContent = '';
            try {
                const response = await fetch('/api/customers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        firstName: name,
                        email: email,
                        phone: phone,
                        role: 'customer',
                        password: 'changeme' // Add default password
                    })
                });
                if (response.ok) {
                    messageDiv.textContent = 'Customer created successfully!';
                    customerForm.reset();
                } else {
                    const error = await response.text();
                    messageDiv.textContent = 'Error: ' + error;
                }
            } catch (err) {
                messageDiv.textContent = 'Network error: ' + err.message;
            }
        });
    }

    const staffForm = document.getElementById('addStaffForm');
    if (staffForm) {
        staffForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const firstName = document.getElementById('staffFirstName').value;
            const lastName = document.getElementById('staffLastName').value;
            const email = document.getElementById('staffEmail').value;
            const phone = document.getElementById('staffPhone').value;
            const position = document.getElementById('staffPosition').value;
            const status = document.getElementById('staffStatus').value;
            const messageDiv = document.getElementById('staffFormMessage');
            if (messageDiv) messageDiv.textContent = '';
            try {
                const response = await fetch('/api/staff', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        phone,
                        position,
                        status,
                        role: 'staff',
                        password: 'changeme' // Default password
                    })
                });
                if (!response.ok) throw new Error(await response.text());
                if (messageDiv) messageDiv.textContent = 'Staff created successfully!';
                staffForm.reset();
            } catch (err) {
                if (messageDiv) messageDiv.textContent = 'Error creating staff: ' + err.message;
            }
        });
    }
});

function normalizeUser(user) {
    if (!user) return user;
    const firstName = user.firstName ?? user.firstname ?? '';
    const lastName  = user.lastName  ?? user.lastname  ?? '';
    const role      = (user.role ?? '').toString().toLowerCase(); // normalize casing
    const id        = user.id ?? user.staffId ?? user.userId ?? user.customerId;
    return {
        ...user,
        id,
        role,
        firstName, lastName,
        firstname: firstName, lastname: lastName
    };
}

function saveUserToStorage(user) {
    const normalized = normalizeUser(user);
    if (window.Auth && Auth.saveUserForRole) {
        Auth.saveUserForRole(normalized, 'admin');
    } else {
        localStorage.setItem('user', JSON.stringify(normalized));
        localStorage.setItem('authUser', JSON.stringify(normalized));
    }
    return normalized;
}
function getSessionUser() {
    if (window.Auth && Auth.getUser) return Auth.getUser('admin');
    const raw = localStorage.getItem('user') || localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return saveUserToStorage(parsed);
    } catch {
        return null;
    }
}
function requireRoles(allowedRoles) {
    const user = (window.Auth && Auth.getUser) ? Auth.getUser('admin') : getSessionUser();
    const role = (user?.role || '').toLowerCase();
    if (!user || !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
        alert('Access denied');
        window.location.href = 'login.html?role=admin';
        return null;
    }
    return user;
}

function logoutUser() {
    if (window.Auth && Auth.logoutRole) {
        Auth.logoutRole('admin');
    } else {
        localStorage.removeItem('user');
        localStorage.removeItem('authUser');
    }
    window.location.href = 'login.html';
}





// Navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const sections = document.querySelectorAll('.main-content > section');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || '';
            // Treat link to page (admin-dashboard.html) as dashboard section
            const isDashboardLink = href.endsWith('admin-dashboard.html');
            if (href.startsWith('#') || isDashboardLink) {
                e.preventDefault();

                // Toggle active class on nav items
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                this.parentElement.classList.add('active');

                // Determine target section id
                const targetId = isDashboardLink ? 'dashboard' : href.substring(1);

                // Show only the selected section
                showOnlySection(targetId);

                // Refresh data for that section
                if (targetId === 'dashboard') loadOverview();
                if (targetId === 'customer-management') loadCustomers();
                if (targetId === 'staff-management') loadStaff();
                if (targetId === 'order-management') loadOrders();
                if (targetId === 'payments') { loadPayments(); loadTaxSettings(); }
                if (targetId === 'reviews') loadReviews();
                if (targetId === 'analytics') {
                    const timeRangeSelect = document.getElementById('analyticsTimeRange');
                    const timeRange = timeRangeSelect ? timeRangeSelect.value : 'month';
                    loadAnalytics(timeRange);
                }
            }
        });
    });

    // Also ensure only the active section is shown if one is pre-marked active in HTML
    const active = document.querySelector('.main-content > section.active');
    if (active) {
        showOnlySection(active.id);
    }

    // Setup analytics time range selector
    const analyticsTimeRange = document.getElementById('analyticsTimeRange');
    if (analyticsTimeRange) {
        analyticsTimeRange.addEventListener('change', function() {
            loadAnalytics(this.value);
        });
    }

    // Setup save report button
    const saveReportBtn = document.getElementById('saveReportBtn');
    if (saveReportBtn) {
        saveReportBtn.addEventListener('click', saveCurrentReport);
    }

    // Setup view saved reports button
    const viewSavedReportsBtn = document.getElementById('viewSavedReportsBtn');
    if (viewSavedReportsBtn) {
        viewSavedReportsBtn.addEventListener('click', viewSavedReports);
    }

    // Setup export report button
    const exportButtons = document.querySelectorAll('.report-actions .btn-outline');
    exportButtons.forEach(btn => {
        if (btn.textContent.includes('Export')) {
            btn.addEventListener('click', exportReport);
        }
    });
}


// Overview
async function loadOverview() {
    try {
        const stats = await apiGet('/api/admin/stats/overview');

        // Update quick stats by card title to support variable cards
        const cards = document.querySelectorAll('.quick-stats .stat-card');
        cards.forEach(card => {
            const title = (card.querySelector('.stat-info h3')?.textContent || '').toLowerCase();
            const valueEl = card.querySelector('.stat-info .stat-value');
            if (!valueEl) return;

            if (title.includes('customer')) {
                valueEl.textContent = Number(stats.totalCustomers || 0).toLocaleString();
            } else if (title.includes('staff')) {
                valueEl.textContent = Number(stats.totalStaff || 0).toLocaleString();
            } else if (title.includes('order')) {
                valueEl.textContent = Number(stats.ordersToday || 0).toLocaleString();
            } else if (title.includes('revenue')) {
                // Kept for compatibility if a revenue card exists in other layouts
                valueEl.textContent = `$${Number(stats.revenueToday || 0).toLocaleString()}`;
            }
        });

        // Update revenue chart with last 7 days
        if (window.revenueChartRef && stats.last7DaysLabels && stats.last7DaysRevenue) {
            window.revenueChartRef.data.labels = stats.last7DaysLabels;
            window.revenueChartRef.data.datasets[0].data = stats.last7DaysRevenue.map(v => Number(v));
            window.revenueChartRef.update();
        }
    } catch (e) {
        console.error('Failed to load overview', e);
    }
}


// Customers
async function loadCustomers() {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const response = await fetch('/api/customers');
        const data = await response.json();
        const customers = Array.isArray(data) ? data : (Array.isArray(data.content) ? data.content : []);
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No customers found.</td></tr>';
            return;
        }
        tbody.innerHTML = customers.map(c => `
            <tr>
                <td>${c.id || c.customerId || ''}</td>
                <td>${c.firstName || c.name || ''}</td>
                <td>${c.email || ''}</td>
                <td>${c.phone || ''}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4">Error loading customers: ${err.message}</td></tr>`;
    }
}

async function deleteCustomer(id) {
    try {
        await apiJson('DELETE', `/api/admin/customers/${id}`);
        loadCustomers();
    } catch (e) {
        alert('Failed to delete customer: ' + e.message);
    }
}

function editCustomer(id) {
    console.log('Edit customer', id);
}

// --- Customer Management Logic ---
const customerTableBody = document.getElementById('customerTableBody');

async function fetchCustomers() {
    try {
        const res = await fetch(API_BASE + '/api/customers?page=0&size=50');
        const data = await res.json();
        renderCustomerTable(data.content || []);
    } catch (err) {
        customerTableBody.innerHTML = '<tr><td colspan="5">Error loading customers</td></tr>';
    }
}

function renderCustomerTable(customers) {
    if (!customers.length) {
        customerTableBody.innerHTML = '<tr><td colspan="5">No customers found</td></tr>';
        return;
    }
    customerTableBody.innerHTML = customers.map(c => `
        <tr>
            <td>${c.customerId || c.id || ''}</td>
            <td>${c.firstName || ''} ${c.lastName || ''}</td>
            <td>${c.email || ''}</td>
            <td>${c.phone || ''}</td>
            <td><button class="btn btn-danger" onclick="deleteCustomer(${c.customerId || c.id}, this)">Delete</button></td>
        </tr>
    `).join('');
}

async function deleteCustomer(id, btn) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    btn.disabled = true;
    try {
        const res = await fetch(API_BASE + '/api/customers/' + id, { method: 'DELETE' });
        if (res.ok) {
            fetchCustomers();
        } else {
            alert('Failed to delete customer');
            btn.disabled = false;
        }
    } catch (err) {
        alert('Error deleting customer');
        btn.disabled = false;
    }
}

// Initial load
if (customerTableBody) fetchCustomers();

// Staff
async function loadStaff() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    try {
        const page = await apiGet('/api/admin/staff', { page: 0, size: 50, sort: 'staffId,DESC' });
        const rows = (page.content || []).map(s => {
            const statusIsInactive = (s.role || '').toLowerCase() === 'inactive';
            return `
                <tr data-id="${s.staffId}">
                    <td>#STAFF-${String(s.staffId).padStart(3,'0')}</td>
                    <td>${(s.firstName || '')} ${(s.lastName || '')}</td>
                    <td>${s.email || ''}</td>
                    <td>${s.phone || ''}</td>
                    <td>${s.role || ''}</td>
                    <td><span class="status-badge ${statusIsInactive ? 'inactive' : 'active'}">${statusIsInactive ? 'Inactive' : 'Active'}</span></td>
                    <td></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon edit-btn" title="Edit" onclick="editStaff(${s.staffId})"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon delete-btn" title="Delete" onclick="deleteStaff(${s.staffId})"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.innerHTML = rows || '<tr><td colspan="8">No staff found.</td></tr>';
    } catch (e) {
        console.error('Failed to load staff', e);
        tbody.innerHTML = '<tr><td colspan="8">Failed to load staff</td></tr>';
    }
}

async function deleteStaff(id) {
    try {
        await apiJson('DELETE', `/api/admin/staff/${id}`);
        loadStaff();
    } catch (e) {
        alert('Failed to delete staff: ' + e.message);
    }
}

function editStaff(id) {
    console.log('Edit staff', id);
}

// Orders
async function loadOrders() {
    const orderGrid = document.getElementById('orderGrid');
    if (!orderGrid) return;
    orderGrid.innerHTML = '<p>Loading...</p>';
    try {
        const page = await apiGet('/api/admin/orders', { page: 0, size: 50, sort: 'date,DESC' });
        const cards = (page.content || []).map(o => `
            <div class="order-card" data-id="${o.orderId}">
                <div class="order-card-header">
                    <h3>#ORD-${String(o.orderId).padStart(4,'0')}</h3>
                    <span class="status-badge ${statusClass(o.status)}">${o.status || ''}</span>
                </div>
                <div class="order-card-body">
                    <div class="order-card-item">
                        <span class="label">Customer:</span>
                        <span class="value">${o.customerName || ''}</span>
                    </div>
                    <div class="order-card-item">
                        <span class="label">Service:</span>
                        <span class="value">${o.serviceType || ''}</span>
                    </div>
                    <div class="order-card-item">
                        <span class="label">Date:</span>
                        <span class="value">${o.date ? new Date(o.date).toLocaleDateString() : ''}</span>
                    </div>
                </div>
                <div class="order-card-footer">
                    <span class="total-amount">$${Number((o.total || 0)).toFixed(2)}</span>
                    <div class="action-buttons">
                        <button class="btn-icon view-btn" title="View Details" onclick="viewOrder(${o.orderId})"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon delete-btn" title="Delete" onclick="deleteOrder(${o.orderId})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
        orderGrid.innerHTML = cards || '<p>No orders found.</p>';
    } catch (e) {
        console.error('Failed to load orders', e);
        orderGrid.innerHTML = '<p>Failed to load orders.</p>';
    }
}

// Payments
async function loadPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    try {
        const page = await apiGet('/api/payments', { page: 0, size: 100, sort: 'paymentId,DESC' });
        const list = Array.isArray(page) ? page : (page.content || []);

        const rows = list.map(p => {
            const pid = p.paymentId ?? p.id;
            const oid = p.orderId ?? p.order?.orderId;
            const amount = Number(p.amount ?? 0).toFixed(2);
            const method = p.method ?? p.paymentMethod ?? '—';
            const customerId = p.customerId ?? p.customer?.customerId ?? p.customer?.id;

            return `
                <tr data-id="${pid}">
                    <td>#PAY-${String(pid).padStart(4,'0')}</td>
                    <td>${oid ? `#ORD-${String(oid).padStart(4,'0')}` : 'N/A'}</td>
                    <td>${customerId ? `#CUST-${String(customerId).padStart(3,'0')}` : 'N/A'}</td>
                    <td>$${amount}</td>
                    <td>${method}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon view-btn" title="View Details" onclick="viewPayment(${pid})"><i class="fas fa-eye"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows || '<tr><td colspan="6">No payments found.</td></tr>';
    } catch (e) {
        console.error('Failed to load payments', e);
        tbody.innerHTML = '<tr><td colspan="6">Failed to load payments</td></tr>';
    }
}

async function viewPayment(id) {
    try {
        const payment = await apiGet(`/api/payments/${id}`);

        const setTxt = (elId, value) => {
            const el = document.getElementById(elId);
            if (el) el.textContent = value || '—';
        };

        const pid = payment.paymentId ?? payment.id;
        const oid = payment.orderId ?? payment.order?.id;

        let customerName = 'N/A';
        if (oid) {
            try {
                const order = await apiGet(`/api/admin/orders/${oid}`);
                customerName = order.customerName || 'N/A';
            } catch (orderError) {
                console.error(`Failed to fetch order ${oid} for payment ${pid}`, orderError);
            }
        }

        setTxt('viewPaymentId', `#PAY-${String(pid).padStart(4, '0')}`);
        setTxt('viewPaymentOrderId', oid ? `#ORD-${String(oid).padStart(4, '0')}` : 'N/A');
        setTxt('viewPaymentCustomerName', customerName);
        setTxt('viewPaymentDate', payment.date ? new Date(payment.date).toLocaleString() : 'N/A');
        setTxt('viewPaymentMethod', payment.method || payment.paymentMethod || 'N/A');
        setTxt('viewPaymentAmount', `$${Number(payment.amount || 0).toFixed(2)}`);

        openModal('viewPaymentModal');
    } catch (e) {
        alert('Failed to fetch payment details: ' + e.message);
    }
}


// Reviews
async function loadReviews() {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
    try {
        // Fetch reviews from correct endpoint
        const page = await apiGet('/api/reviews', { page: 0, size: 50, sort: 'reviewId,DESC' });
        const list = Array.isArray(page) ? page : (page.content || []);
        const rows = list.map(r => {
            return `
                <tr data-id="${r.reviewId}">
                    <td>#REV-${String(r.reviewId).padStart(3,'0')}</td>
                    <td>${r.customerId ?? ''}</td>
                    <td>${r.rating ?? ''}</td>
                    <td>${r.serviceRating ?? ''}</td>
                    <td>${r.platformRating ?? ''}</td>
                    <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</td>
                    <td>${r.description ?? ''}</td>
                    <td>
                        <select class="review-status-dropdown">
                            <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${r.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${r.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-primary update-status-btn" onclick="updateReviewStatus(${r.reviewId}, this)">Update Status</button>
                        <button class="btn btn-danger delete-review-btn" onclick="deleteReview(${r.reviewId}, this)">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.innerHTML = rows || '<tr><td colspan="9">No reviews found.</td></tr>';
    } catch (e) {
        console.error('Failed to load reviews', e);
        tbody.innerHTML = '<tr><td colspan="9">Failed to load reviews</td></tr>';
    }
}

// Accept/Reject review handlers
async function acceptReview(id) {
    try {
        await apiJson('PUT', `/api/admin/reviews/${id}/accept`);
        loadReviews();
    } catch (e) {
        alert('Failed to accept review: ' + e.message);
    }
}

async function rejectReview(id) {
    try {
        await apiJson('PUT', `/api/admin/reviews/${id}/reject`);
        loadReviews();
    } catch (e) {
        alert('Failed to reject review: ' + e.message);
    }
}

// Update review status
async function updateReviewStatus(reviewId, btn) {
    const row = btn.closest('tr');
    const statusDropdown = row.querySelector('.review-status-dropdown');
    const newStatus = statusDropdown.value;
    btn.disabled = true;
    btn.textContent = 'Updating...';
    try {
        const res = await fetch(`${API_BASE}/api/admin/reviews/${reviewId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error(await res.text());
        btn.textContent = 'Updated!';
        setTimeout(() => { btn.textContent = 'Update Status'; btn.disabled = false; }, 1200);
    } catch (err) {
        btn.textContent = 'Error';
        setTimeout(() => { btn.textContent = 'Update Status'; btn.disabled = false; }, 2000);
        alert('Failed to update status: ' + err.message);
    }
}

// Review Status Update Demo Handler
async function updateReviewStatusDemo() {
  const reviewId = document.getElementById('reviewIdInput').value;
  const status = document.getElementById('reviewStatusInput').value;
  const resultSpan = document.getElementById('reviewStatusResult');
  if (!reviewId || !status) {
    resultSpan.textContent = 'Please enter both Review ID and Status.';
    resultSpan.style.color = 'red';
    return;
  }
  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      const errorText = await response.text();
      resultSpan.textContent = 'Error: ' + errorText;
      resultSpan.style.color = 'red';
    } else {
      resultSpan.textContent = 'Status updated successfully!';
      resultSpan.style.color = 'green';
    }
  } catch (e) {
    resultSpan.textContent = 'Request failed: ' + e.message;
    resultSpan.style.color = 'red';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // ...existing code...
  const updateBtn = document.getElementById('updateReviewStatusBtn');
  if (updateBtn) {
    updateBtn.addEventListener('click', updateReviewStatusDemo);
  }
  // ...existing code...
});

// Status badge class helper
function statusClass(s) {
    if (!s) return 'processing';
    const v = s.toLowerCase();
    if (v.includes('complete') || v === 'delivered') return 'completed';
    if (v.includes('cancel')) return 'cancelled';
    if (v.includes('process') || v.includes('wash')) return 'processing';
    return 'active';
}

async function deleteOrder(id) {
    try {
        await apiJson('DELETE', `/api/admin/orders/${id}`);
        loadOrders();
    } catch (e) {
        alert('Failed to delete order: ' + e.message);
    }
}

async function viewOrder(id) {
    try {
        const order = await apiGet(`/api/admin/orders/${id}`);

        const setTxt = (elId, value) => {
            const el = document.getElementById(elId);
            if (el) el.textContent = value || '—';
        };

        const setBadge = (elId, status) => {
            const badge = document.getElementById(elId);
            if (badge) {
                badge.textContent = status || '—';
                badge.className = `status-badge ${statusClass(status)}`;
            }
        };

        setTxt('viewOrderId', `#ORD-${String(order.orderId).padStart(4, '0')}`);
        setTxt('viewOrderCustomerName', order.customerName);
        setTxt('viewOrderServiceType', order.serviceType);
        setTxt('viewOrderItems', order.items);
        setTxt('viewOrderDate', new Date(order.date).toLocaleDateString());
        setBadge('viewOrderStatusBadge', order.status);
        setTxt('viewOrderSubtotal', `$${Number(order.subTotal || 0).toFixed(2)}`);
        setTxt('viewOrderTax', `$${Number(order.tax || 0).toFixed(2)}`);
        setTxt('viewOrderTotal', `$${Number(order.total || 0).toFixed(2)}`);

        openModal('viewOrderModal');
    } catch (e) {
        alert('Failed to fetch order details: ' + e.message);
    }
}


// Charts
let revenueAnalyticsChartRef = null;
let orderVolumeChartRef = null;
let serviceDistributionChartRef = null;
let retentionChartRef = null;

function initCharts() {
    const revenueCanvas = document.getElementById('revenueChart');
    if (revenueCanvas) {
        const revenueCtx = revenueCanvas.getContext('2d');
        window.revenueChartRef = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#0369a1',
                    backgroundColor: 'rgba(3, 105, 161, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#0369a1',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { callback: value => '$' + value }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    } else {
        window.revenueChartRef = null;
    }

    // Initialize analytics charts
    const revenueAnalyticsCanvas = document.getElementById('revenueAnalyticsChart');
    if (revenueAnalyticsCanvas) {
        const revenueAnalyticsCtx = revenueAnalyticsCanvas.getContext('2d');
        revenueAnalyticsChartRef = new Chart(revenueAnalyticsCtx, {
            type: 'line', // Changed to line chart for a modern look
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue',
                    data: [],
                    backgroundColor: 'rgba(3, 105, 161, 0.2)', // Area fill color
                    borderColor: '#0369a1',
                    borderWidth: 2,
                    pointBackgroundColor: '#0369a1',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 7,
                    pointHoverBorderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { callback: v => '$' + v } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const orderVolumeCanvas = document.getElementById('orderVolumeChart');
    if (orderVolumeCanvas) {
        const orderVolumeCtx = orderVolumeCanvas.getContext('2d');
        orderVolumeChartRef = new Chart(orderVolumeCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Orders',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const serviceDistributionCanvas = document.getElementById('serviceDistributionChart');
    if (serviceDistributionCanvas) {
        const serviceDistributionCtx = serviceDistributionCanvas.getContext('2d');
        serviceDistributionChartRef = new Chart(serviceDistributionCtx, {
            type: 'pie', // Changed to pie for clearer part-to-whole visualization
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    const retentionCanvas = document.getElementById('retentionChart');
    if (retentionCanvas) {
        const retentionCtx = retentionCanvas.getContext('2d');
        retentionChartRef = new Chart(retentionCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'New Customers',
                    data: [],
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1
                }, {
                    label: 'Returning Customers',
                    data: [],
                    backgroundColor: '#06b6d4',
                    borderColor: '#0891b2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, stacked: true }, // Stacked Y-axis
                    x: { grid: { display: false }, stacked: true } // Stacked X-axis
                }
            }
        });
    }

    // DON'T load analytics data here - only load when user navigates to analytics section
    // Analytics data will be loaded by navigation handler when user clicks on "Analytics & Reports"
}

// Load analytics data from backend
async function loadAnalytics(timeRange = 'month') {
    try {
        const analytics = await apiGet('/api/admin/stats/analytics', { timeRange });

        // Update revenue chart
        if (revenueAnalyticsChartRef && analytics.revenueData) {
            revenueAnalyticsChartRef.data.labels = analytics.revenueData.labels;
            revenueAnalyticsChartRef.data.datasets[0].data = analytics.revenueData.data;
            revenueAnalyticsChartRef.update();
        }

        // Update order volume chart
        if (orderVolumeChartRef && analytics.orderVolumeData) {
            orderVolumeChartRef.data.labels = analytics.orderVolumeData.labels;
            orderVolumeChartRef.data.datasets[0].data = analytics.orderVolumeData.data;
            orderVolumeChartRef.update();
        }

        // Update service distribution chart
        if (serviceDistributionChartRef && analytics.serviceDistribution) {
            serviceDistributionChartRef.data.labels = analytics.serviceDistribution.labels;
            serviceDistributionChartRef.data.datasets[0].data = analytics.serviceDistribution.data;
            serviceDistributionChartRef.update();
        }

        // Update customer retention chart
        if (retentionChartRef && analytics.customerRetention) {
            retentionChartRef.data.labels = analytics.customerRetention.labels;
            retentionChartRef.data.datasets[0].data = analytics.customerRetention.newCustomers;
            retentionChartRef.data.datasets[1].data = analytics.customerRetention.returningCustomers;
            retentionChartRef.update();
        }

        // Update summary stats
        if (analytics.summaryStats) {
            updateSummaryStats(analytics.summaryStats);
        }
    } catch (e) {
        console.error('Failed to load analytics', e);
    }
}

// Update summary stats in the analytics section
function updateSummaryStats(stats) {
    const summarySection = document.querySelector('.summary-stats');
    if (!summarySection) return;

    const statItems = summarySection.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        const title = item.querySelector('h4')?.textContent.toLowerCase() || '';
        const valueEl = item.querySelector('.stat-value');
        const changeEl = item.querySelector('.stat-change');

        if (!valueEl || !changeEl) return;

        if (title.includes('revenue')) {
            valueEl.textContent = '$' + Number(stats.totalRevenue || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            const change = stats.revenueChange || 0;
            changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '% from last period';
            changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
        } else if (title.includes('orders')) {
            valueEl.textContent = Number(stats.ordersProcessed || 0).toLocaleString();
            const change = stats.ordersChange || 0;
            changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '% from last period';
            changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
        } else if (title.includes('customers')) {
            valueEl.textContent = Number(stats.newCustomers || 0).toLocaleString();
            const change = stats.customersChange || 0;
            changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '% from last period';
            changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
        } else if (title.includes('rating')) {
            valueEl.textContent = (stats.averageRating || 0).toFixed(1) + '/5.0';
            const change = stats.ratingChange || 0;
            changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + ' from last period';
            changeEl.style.color = change >= 0 ? '#10b981' : '#ef4444';
        }
    });
}

// Export Report Functionality
async function exportReport() {
    try {
        const timeRangeSelect = document.getElementById('analyticsTimeRange');
        const timeRange = timeRangeSelect ? timeRangeSelect.value : 'month';

        // Fetch analytics data
        const analytics = await apiGet('/api/admin/stats/analytics', { timeRange });

        // Create CSV content
        let csvContent = "LaundryPro Analytics Report\n";
        csvContent += `Time Range: ${timeRange}\n`;
        csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

        // Summary Stats
        csvContent += "=== SUMMARY STATISTICS ===\n";
        if (analytics.summaryStats) {
            csvContent += `Total Revenue,$${analytics.summaryStats.totalRevenue || 0}\n`;
            csvContent += `Revenue Change,${(analytics.summaryStats.revenueChange || 0).toFixed(1)}%\n`;
            csvContent += `Orders Processed,${analytics.summaryStats.ordersProcessed || 0}\n`;
            csvContent += `Orders Change,${(analytics.summaryStats.ordersChange || 0).toFixed(1)}%\n`;
            csvContent += `New Customers,${analytics.summaryStats.newCustomers || 0}\n`;
            csvContent += `Customers Change,${(analytics.summaryStats.customersChange || 0).toFixed(1)}%\n`;
            csvContent += `Average Rating,${(analytics.summaryStats.averageRating || 0).toFixed(1)}/5.0\n`;
            csvContent += `Rating Change,${(analytics.summaryStats.ratingChange || 0).toFixed(1)}\n`;
        }

        // Revenue Data
        csvContent += "\n=== REVENUE BREAKDOWN ===\n";
        csvContent += "Period,Revenue\n";
        if (analytics.revenueData && analytics.revenueData.labels) {
            analytics.revenueData.labels.forEach((label, index) => {
                const value = analytics.revenueData.data[index] || 0;
                csvContent += `${label},$${value}\n`;
            });
        }

        // Order Volume Data
        csvContent += "\n=== ORDER VOLUME ===\n";
        csvContent += "Period,Orders\n";
        if (analytics.orderVolumeData && analytics.orderVolumeData.labels) {
            analytics.orderVolumeData.labels.forEach((label, index) => {
                const value = analytics.orderVolumeData.data[index] || 0;
                csvContent += `${label},${value}\n`;
            });
        }

        // Service Distribution
        csvContent += "\n=== SERVICE DISTRIBUTION ===\n";
        csvContent += "Service Type,Order Count,Revenue\n";
        if (analytics.serviceDistribution && analytics.serviceDistribution.labels) {
            analytics.serviceDistribution.labels.forEach((label, index) => {
                const count = analytics.serviceDistribution.data[index] || 0;
                const revenue = analytics.serviceDistribution.revenueByService?.[label] || 0;
                csvContent += `${label},${count},$${revenue}\n`;
            });
        }

        // Customer Retention
        csvContent += "\n=== CUSTOMER RETENTION ===\n";
        csvContent += "Period,New Customers,Returning Customers\n";
        if (analytics.customerRetention && analytics.customerRetention.labels) {
            analytics.customerRetention.labels.forEach((label, index) => {
                const newCust = analytics.customerRetention.newCustomers[index] || 0;
                const returning = analytics.customerRetention.returningCustomers[index] || 0;
                csvContent += `${label},${newCust},${returning}\n`;
            });
        }

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const filename = `LaundryPro_Analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert('Report exported successfully!');
    } catch (e) {
        console.error('Failed to export report', e);
        alert('Failed to export report: ' + e.message);
    }
}

// Save Current Report to Database
async function saveCurrentReport() {
    try {
        const timeRangeSelect = document.getElementById('analyticsTimeRange');
        const timeRange = timeRangeSelect ? timeRangeSelect.value : 'month';

        // Get current user
        const user = getSessionUser();
        const generatedBy = user ? `${user.firstName} ${user.lastName}` : 'Admin';

        // Confirm save
        if (!confirm(`Save current ${timeRange} report to database?`)) {
            return;
        }

        // Create form data for the API call
        const formData = new URLSearchParams();
        formData.append('timeRange', timeRange);
        formData.append('generatedBy', generatedBy);

        // Call the save API endpoint
        const response = await fetch(`${API_BASE}/api/admin/reports/save?${formData.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to save report');
        }

        const savedReport = await response.json();

        alert(`Report saved successfully!\nReport ID: ${savedReport.reportId}\nCompleted Orders: ${savedReport.completedOrderCount}\nTotal Customers: ${savedReport.totalCustomers}\nTotal Income: $${savedReport.totalIncome}`);

    } catch (e) {
        console.error('Failed to save report', e);
        alert('Failed to save report: ' + e.message);
    }
}

// View Saved Reports
async function viewSavedReports() {
    try {
        // Fetch all saved reports
        const reports = await apiGet('/api/admin/reports');

        if (!reports || reports.length === 0) {
            alert('No saved reports found.');
            return;
        }

        // Create modal for displaying reports
        showReportsModal(reports);

    } catch (e) {
        console.error('Failed to load saved reports', e);
        alert('Failed to load saved reports: ' + e.message);
    }
}

// Show Reports Modal
function showReportsModal(reports) {
    // Check if modal already exists, if not create it
    let modal = document.getElementById('savedReportsModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'savedReportsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 1000px;">
                <div class="modal-header">
                    <h2>Saved Reports</h2>
                    <span class="close" onclick="closeModal('savedReportsModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Report ID</th>
                                    <th>Date Generated</th>
                                    <th>Time Range</th>
                                    <th>Completed Orders</th>
                                    <th>Total Customers</th>
                                    <th>Total Income</th>
                                    <th>Generated By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="savedReportsTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Populate table with reports
    const tbody = document.getElementById('savedReportsTableBody');
    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>#RPT-${String(report.reportId).padStart(4, '0')}</td>
            <td>${report.reportDate ? new Date(report.reportDate).toLocaleString() : 'N/A'}</td>
            <td><span class="status-badge active">${report.timeRange || 'N/A'}</span></td>
            <td>${Number(report.completedOrderCount || 0).toLocaleString()}</td>
            <td>${Number(report.totalCustomers || 0).toLocaleString()}</td>
            <td>$${Number(report.totalIncome || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>${report.generatedBy || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon view-btn" title="View Details" onclick="viewReportDetails(${report.reportId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon delete-btn" title="Delete" onclick="deleteReport(${report.reportId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Open modal
    openModal('savedReportsModal');
}

// View Report Details
async function viewReportDetails(reportId) {
    try {
        const report = await apiGet(`/api/admin/reports/${reportId}`);

        alert(`Report Details:\n\n` +
            `Report ID: #RPT-${String(report.reportId).padStart(4, '0')}\n` +
            `Date Generated: ${report.reportDate ? new Date(report.reportDate).toLocaleString() : 'N/A'}\n` +
            `Time Range: ${report.timeRange || 'N/A'}\n` +
            `Completed Orders: ${Number(report.completedOrderCount || 0).toLocaleString()}\n` +
            `Total Customers: ${Number(report.totalCustomers || 0).toLocaleString()}\n` +
            `Total Income: $${Number(report.totalIncome || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n` +
            `Generated By: ${report.generatedBy || 'N/A'}`
        );

    } catch (e) {
        console.error('Failed to load report details', e);
        alert('Failed to load report details: ' + e.message);
    }
}

// Delete Report
async function deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        return;
    }

    try {
        await apiJson('DELETE', `/api/admin/reports/${reportId}`);
        alert('Report deleted successfully!');

        // Refresh the reports list
        viewSavedReports();

    } catch (e) {
        console.error('Failed to delete report', e);
        alert('Failed to delete report: ' + e.message);
    }
}

// Modal Helper Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Form Submissions
function setupFormSubmissions() {
    // Add any form submission handlers here if needed
}

// Search Functionality
function setupSearch() {
    // Add any search handlers here if needed
}

// Click outside modal to close
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Delete review
async function deleteReview(reviewId, btn) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    btn.disabled = true;
    btn.textContent = 'Deleting...';
    try {
        const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error(await res.text());
        // Remove row from table or reload reviews
        const row = btn.closest('tr');
        if (row) {
            row.remove();
        } else {
            loadReviews();
        }
    } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Delete';
        alert('Failed to delete review: ' + e.message);
    }
}
