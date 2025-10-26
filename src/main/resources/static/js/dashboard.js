// js/dashboard.js

// Service items catalog
const serviceItems = {
    'wash-fold': [
        { id: 1, name: 'T-Shirt', price: 2.50 },
        { id: 2, name: 'Dress Shirt', price: 3.50 },
        { id: 3, name: 'Jeans', price: 4.00 },
        { id: 4, name: 'Sweater', price: 4.50 },
        { id: 5, name: 'Underwear', price: 1.50 },
        { id: 6, name: 'Socks (pair)', price: 1.00 }
    ],
    'dry-clean': [
        { id: 7, name: 'Suit', price: 12.00 },
        { id: 8, name: 'Dress', price: 15.00 },
        { id: 9, name: 'Coat', price: 20.00 }
    ],
    'linens': [
        { id: 10, name: 'Bed Sheets', price: 8.00 },
        { id: 11, name: 'Towel', price: 3.00 },
        { id: 12, name: 'Curtains', price: 10.00 }
    ]
};

let currentOrderItems = [];
let cachedOrders = null;
let serviceChart = null; // Global reference for chart instance
let dashboardPollingInterval = null; // For real-time polling

// --- Tax Rate (fetched from backend) ---
// Default to 8% if backend not reachable; updated on page load
window.__taxRate = window.__taxRate ?? 0.08;
function getTaxRate() {
    const v = Number(window.__taxRate);
    return Number.isFinite(v) && v >= 0 ? v : 0.08;
}
function setTaxLabelFromRate() {
    const el = document.getElementById('taxLabel');
    if (el) {
        const pct = (getTaxRate() * 100);
        el.textContent = `Tax (${pct.toFixed(2)}%)`;
    }
}
async function fetchTaxRate() {
    try {
        const res = await fetch('http://localhost:8080/api/config/tax-rate', { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const rate = Number(data?.rate);
        if (Number.isFinite(rate) && rate >= 0) {
            window.__taxRate = rate;
            setTaxLabelFromRate();
            // Recompute any visible order summary with the new rate
            try { updateOrderSummary(); } catch {}
        }
    } catch (e) {
        console.warn('Using default tax rate; failed to fetch config:', e);
        // keep default
    }
}

// Helper: normalize user props for consistent UI binding
function normalizeUser(user) {
    if (!user) return user;
    const firstName = user.firstName ?? user.firstname ?? '';
    const lastName  = user.lastName  ?? user.lastname  ?? '';
    const address   = user.address   ?? '';
    const phone     = user.phone     ?? '';
    const role      = user.role;
    const id        = user.id;
    // Keep both camelCase and lowercase for compatibility with any existing code
    const normalized = {
        id, role,
        firstName, lastName, address, phone,
        firstname: firstName, lastname: lastName
    };
    // Preserve other fields if any
    return { ...user, ...normalized };
}

// Persist normalized user back to storage to keep UI consistent everywhere
function saveUserToStorage(user) {
    const normalized = normalizeUser(user);
    // Save into role-specific slot and legacy keys via Auth if available
    if (window.Auth && Auth.saveUserForRole) {
        Auth.saveUserForRole(normalized, 'customer');
    } else {
        localStorage.setItem('user', JSON.stringify(normalized));
        localStorage.setItem('authUser', JSON.stringify(normalized));
        localStorage.setItem('active_role', 'customer');
    }
    return normalized;
}
function getSessionUser() {
    // Always read the customer slot to allow multi-session
    if (window.Auth && Auth.getUser) {
        return Auth.getUser('customer');
    }
    const raw = localStorage.getItem('user') || localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return saveUserToStorage(parsed); // re-save normalized to both keys
    } catch {
        return null;
    }
}



// DOMContentLoaded event
document.addEventListener("DOMContentLoaded", () => {
    // Require a customer session; do not disturb other roles
    let user = (window.Auth && Auth.requireRole) ? Auth.requireRole('customer') : getSessionUser();
    if (!user) return; // redirected if not present

    // Kick off tax-rate fetch early
    fetchTaxRate();
    setTaxLabelFromRate();

    // Ensure this page sets the active role to customer for any legacy code
    if (window.Auth && Auth.setActiveRole) Auth.setActiveRole('customer');

    user = saveUserToStorage(user);

    // Respect query parameter to open Settings in this dashboard instance
    const openSettingsOnLoad = new URLSearchParams(window.location.search).get('view') === 'settings';
    if (!openSettingsOnLoad) {
        // Initialize dashboard
        initDashboard(user);
    }

    // Mobile menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('mobile-open');
        if (overlay) overlay.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('show');
    }

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            const isOpen = sidebar.classList.contains('mobile-open');
            isOpen ? closeSidebar() : openSidebar();
        });

        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }

        document.addEventListener('click', function(event) {
            if (window.innerWidth < 992 &&
                sidebar.classList.contains('mobile-open') &&
                !sidebar.contains(event.target) &&
                !menuToggle.contains(event.target)) {
                closeSidebar();
            }
        });
    }


    // Initialize order placement
    initOrderPlacement();

    // Initialize navigation handlers
    initNavigation(user);

    // If requested, open Settings view right away in this dashboard
    if (openSettingsOnLoad) {
        showSettingsForm(user);
    }

    // Button ripple effect for visual consistency with index
    document.querySelectorAll('.btn').forEach(btnEl => {
        btnEl.addEventListener('click', (e) => {
            if (btnEl.classList.contains('btn-water')) return; // Skip for water effect buttons
            const rect = btnEl.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
            btnEl.appendChild(ripple);
            setTimeout(() => ripple.remove(), 650);
        });
    });

    // ---- Modern animations ----

    // IntersectionObserver for reveal-on-scroll
    const revealSelectors = [
        '.welcome-banner',
        '.stats-grid .stat-card',
        '.dashboard-grid .card',
        '.order-item',
        '.orders-section',
        '.settings-section',
        '.applications-section',
        '.payments-section'
    ];
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    // Add reveal class and observe targets for smooth fade-in
    function markAndObserve(nodes) {
        nodes.forEach((el, idx) => {
            if (!el.classList.contains('reveal')) {
                el.classList.add('reveal');
                el.style.setProperty('--delay', `${Math.min(idx * 70, 350)}ms`);
            }
            io.observe(el);
        });
    }

    // Initial mark + observe
    markAndObserve(Array.from(document.querySelectorAll(revealSelectors.join(','))));

    // Animated counters for stats
    function animateCounters() {
        const cards = document.querySelectorAll('.stats-grid .stat-card .stat-info p');
        cards.forEach(p => {
            if (p.dataset.animated === 'true') return;

            const text = p.textContent.trim();
            const match = text.match(/^\$?\d+(\.\d+)?/);
            if (!match) return;

            const numberPart = match[0];
            const isMoney = numberPart.startsWith('$');
            const target = parseFloat(numberPart.replace('$','')) || 0;
            const suffix = text.slice(numberPart.length);

            let current = 0;
            const duration = 800;
            const start = performance.now();

            function step(now) {
                const progress = Math.min((now - start) / duration, 1);
                const value = Math.floor(target * (progress < 1 ? progress : 1));
                const display = isMoney ? `$${(progress < 1 ? value : target).toFixed(0)}` : `${value}`;
                p.textContent = display + suffix;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    p.textContent = (isMoney ? `$${target.toFixed(2)}` : `${target}${suffix.includes('In Progress') || suffix.includes('Orders') ? '' : ''}`) + suffix;
                    p.dataset.animated = 'true';
                }
            }
            requestAnimationFrame(step);
        });
    }

    // Chart pop-in trigger
    function triggerChartPop() {
        const wrap = document.querySelector('.chart-wrapper');
        if (!wrap) return;
        wrap.classList.remove('pop-in-run');
        // Force reflow to allow re-adding the class
        void wrap.offsetWidth;
        wrap.classList.add('pop-in-run');
    }

    // Observe DOM changes to animate new content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        const mo = new MutationObserver((mutations) => {
            let needsRevealScan = false;
            let needsCounters = false;
            let sawChart = false;

            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (!(node instanceof Element)) return;
                    // Apply reveal to matching elements within the added subtree
                    const matches = node.matches && revealSelectors.some(sel => node.matches(sel));
                    const inner = node.querySelectorAll ? Array.from(node.querySelectorAll(revealSelectors.join(','))) : [];
                    const nodes = [];
                    if (matches) nodes.push(node);
                    nodes.push(...inner);
                    if (nodes.length) {
                        needsRevealScan = true;
                        markAndObserve(nodes);
                    }
                    if (node.closest && (node.closest('.stats-grid') || node.matches('.stats-grid') || node.querySelector('.stats-grid'))) {
                        needsCounters = true;
                    }
                    if (node.matches('.chart-wrapper') || (node.querySelector && node.querySelector('.chart-wrapper'))) {
                        sawChart = true;
                    }
                });
            });

            if (needsCounters) {
                // delay a tick to ensure numbers are set
                setTimeout(animateCounters, 30);
            }
            if (sawChart) {
                setTimeout(triggerChartPop, 50);
            }
            if (needsRevealScan) {
                // no-op; already handled via markAndObserve
            }
        });
        mo.observe(mainContent, { childList: true, subtree: true });
    }

    // Kick off initial counters and chart pop
    setTimeout(animateCounters, 100);
    setTimeout(triggerChartPop, 150);
});



async function initDashboard(user) {
    // Always update user info first, even if fetches fail
    updateUserInfo(user);

    // Remove transient/dynamic sections if present
    removeSettingsForm();
    removeOrdersSection();
    removeApplicationsSection();
    removePaymentsSection();

    // Show dashboard sections
    showDashboardSections();

    let ordersData;

    try {
        // Fetch or use cached data
        ordersData = cachedOrders || await fetchOrdersData(user.id);
        cachedOrders = ordersData; // Cache it

        console.log('Dashboard data loaded (cached or fetched)'); // Debug log
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Fallback to empty/default data on error
        ordersData = [];
        showErrorState(); // Show errors in sections
    }

    // Show recent orders first for quicker perceived load
    showRecentOrders(ordersData);

    // Compute stats and chart data from ordersData
    const statsData = computeStatsFromOrders(ordersData);
    const chartData = computeChartData(ordersData);

    // Update remaining sections
    updateStats(statsData);
    initChart(chartData);

    // Start real-time polling for updates (every 60 seconds)
    if (dashboardPollingInterval) clearInterval(dashboardPollingInterval);
    dashboardPollingInterval = setInterval(() => refreshDashboard(user), 60000); // Poll every 60 seconds
}

function initNavigation(user) {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            const href = link.getAttribute("href") || "";
            const linkText = link.textContent.trim();
            const linkId = link.id || '';

            // Intercept Payments link even if it points to Payment.html
            if (linkText === 'Payments' || href.toLowerCase().includes('payment.html')) {
                e.preventDefault();
                await showPayments(user.id);
                return;
            }

            // Handle internal links (Dashboard, My Orders, etc.)
            if (href === "#" || href === "" || href === "login.html") {
                e.preventDefault();

                if (linkText === 'Dashboard') {
                    await initDashboard(user);
                } else if (linkText === 'My Orders') {
                    await showMyOrders(user.id);
                } else if (linkId === 'myApplicationsLink' || linkText === 'My Applications') {
                    await showMyApplications(user.id);
                } else if (linkText === 'Order History') {
                    await showOrderHistory(user.id);
                } else if (linkText === 'Settings') {
                    // Open Settings inline in the same dashboard window
                    showSettingsForm(user);
                } else if (linkText === 'Logout') {
                    logoutUser();
                }
                return;
            }

            // Allow external links (like order-tracking.html) to navigate normally
        });
    });

    // Also bind by explicit id to ensure it works regardless of text/spacing
    const appsLink = document.getElementById('myApplicationsLink');
    if (appsLink) {
        appsLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await showMyApplications(user.id);
        });
    }
}




function removeApplicationsSection() {
    document.querySelectorAll('.applications-section').forEach(el => el.remove());
}

async function fetchApplicationsData(customerId) {
    try {
        const res = await fetch(`http://localhost:8080/api/applied-jobs/customer/${customerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        // Support Spring Page<AppliedJobResponse> or plain array
        const items = Array.isArray(data) ? data
            : Array.isArray(data?.content) ? data.content
                : [];

        return items.map(a => ({
            id: a.applicationId ?? a.appliedJobId ?? a.id,
            jobTitle: a.jobTitle ?? a.title ?? '',
            department: a.department ?? '',
            type: a.employmentType ?? a.type ?? '',
            appliedDate: a.appliedDate ?? a.date ?? a.createdAt ?? null,
            status: (a.status ?? 'new').toString().toLowerCase()
        }));
    } catch (e) {
        console.error('Failed to fetch applications:', e);
        return [];
    }
}


function renderApplications(applications, container) {
    if (!container) return;
    if (!applications.length) {
        container.innerHTML = '<p class="loading-text">No applications yet.</p>';
        return;
    }
    container.innerHTML = applications.map(a => `
        <div class="order-item">
            <div class="order-id">Application #${String(a.id).padStart(3,'0')}</div>
            <div class="order-details">
                <p>
                    <strong>${a.jobTitle}</strong>
                    ${a.department ? ` — <em>${a.department}</em>` : ''} 
                    ${a.type ? ` — ${a.type}` : ''}
                </p>
                <p>Applied: ${a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : '-'}</p>
                <span class="status ${applicationStatusClass(a.status)}">${applicationStatusLabel(a.status)}</span>
            </div>
            <div class="order-total">
                <i class="fas fa-briefcase"></i>
            </div>
        </div>
    `).join('');
}

function applicationStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'accepted') return 'completed';
    if (s === 'rejected') return 'cancelled';
    if (s === 'reviewed') return 'processing';
    return 'active'; // 'new' or unknown
}
function applicationStatusLabel(status) {
    const s = (status || '').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1) || 'New';
}

async function showMyApplications(userId) {
    hideDashboardSections();
    removeSettingsForm();
    removeOrdersSection();
    removeApplicationsSection();
    removePaymentsSection();

    const mainContent = document.querySelector('.main-content');
    const section = document.createElement('section');
    section.className = 'applications-section card';
    section.innerHTML = `
        <h1>My Applications</h1>
        <div class="search-filter modern" style="margin: 0 0 1rem 0;">
            <div class="search-box modern" id="applicationsSearchBox">
                <i class="fas fa-search icon" aria-hidden="true"></i>
                <input type="text" id="applicationSearchInput" placeholder="Search jobs or departments..." aria-label="Search applications">
                <button type="button" id="clearApplicationsSearch" class="clear-btn" aria-label="Clear search">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="status-pills" id="appStatusPills" role="tablist" aria-label="Filter by status">
                <button class="pill active" data-value="all" role="tab" aria-selected="true">All</button>
                <button class="pill" data-value="new" role="tab" aria-selected="false">New</button>
                <button class="pill" data-value="reviewed" role="tab" aria-selected="false">Reviewed</button>
                <button class="pill" data-value="accepted" role="tab" aria-selected="false">Accepted</button>
                <button class="pill" data-value="rejected" role="tab" aria-selected="false">Rejected</button>
            </div>
        </div>
        <div id="my-applications-container"></div>
    `;
    mainContent.appendChild(section);

    let apps = await fetchApplicationsData(userId);

    const container = document.getElementById('my-applications-container');
    const searchInput = document.getElementById('applicationSearchInput');
    const clearBtn = document.getElementById('clearApplicationsSearch');
    const searchBox = document.getElementById('applicationsSearchBox');
    const pills = document.getElementById('appStatusPills');

    function updateSearchUI() {
        const hasVal = !!(searchInput.value || '').trim();
        searchBox.classList.toggle('has-value', hasVal);
    }

    function getActiveStatus() {
        const active = pills.querySelector('.pill.active');
        return (active?.dataset.value || 'all').toLowerCase();
    }

    function applyFilters() {
        const term = (searchInput.value || '').toLowerCase();
        const status = getActiveStatus();
        const filtered = apps.filter(a => {
            const text = `${a.jobTitle} ${a.department} ${a.type}`.toLowerCase();
            const matchesTerm = !term || text.includes(term);
            const matchesStatus = status === 'all' || a.status === status;
            return matchesTerm && matchesStatus;
        });
        renderApplications(filtered, container);
    }

    // Search events
    searchInput.addEventListener('input', () => {
        updateSearchUI();
        applyFilters();
    });
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        updateSearchUI();
        applyFilters();
        searchInput.focus();
    });

    // Pill filter events (delegated)
    if (pills) {
        pills.addEventListener('click', (e) => {
            const btn = e.target.closest('.pill');
            if (!btn) return;
            pills.querySelectorAll('.pill').forEach(p => {
                p.classList.toggle('active', p === btn);
                p.setAttribute('aria-selected', p === btn ? 'true' : 'false');
            });
            applyFilters();
        });
        pills.addEventListener('keydown', (e) => {
            const items = Array.from(pills.querySelectorAll('.pill'));
            const current = document.activeElement;
            const idx = items.indexOf(current);
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                (items[idx + 1] || items[0])?.focus();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                (items[idx - 1] || items[items.length - 1])?.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                current?.click();
            }
        });
    }

    // Initialize UI state
    updateSearchUI();
    applyFilters();
}








function showDashboardSections() {
    const welcomeBanner = document.querySelector('.welcome-banner');
    const statsGrid = document.querySelector('.stats-grid');
    const dashboardGrid = document.querySelector('.dashboard-grid');

    if (welcomeBanner) welcomeBanner.style.display = 'block';
    if (statsGrid) statsGrid.style.display = 'grid';
    if (dashboardGrid) dashboardGrid.style.display = 'grid';
}

function hideDashboardSections() {
    const welcomeBanner = document.querySelector('.welcome-banner');
    const statsGrid = document.querySelector('.stats-grid');
    const dashboardGrid = document.querySelector('.dashboard-grid');

    if (welcomeBanner) welcomeBanner.style.display = 'none';
    if (statsGrid) statsGrid.style.display = 'none';
    if (dashboardGrid) dashboardGrid.style.display = 'none';

    // Stop polling when leaving the dashboard to prevent it from reappearing
    if (dashboardPollingInterval) {
        clearInterval(dashboardPollingInterval);
        dashboardPollingInterval = null;
    }
}

function removeSettingsForm() {
    const settingsSection = document.querySelector('.settings-section');
    if (settingsSection) settingsSection.remove();
}

function showSettingsForm(user) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Ensure normalized data for prefill
    const u = normalizeUser(user);

    hideDashboardSections();
    removeApplicationsSection();
    removeOrdersSection();
    removePaymentsSection();
    removeSettingsForm();

    const settingsSection = document.createElement('section');
    settingsSection.className = 'settings-section card';

    settingsSection.innerHTML = `
        <div class="settings-header">
            <h1><i class="fas fa-user-cog"></i> Account Settings</h1>
            <p class="subtitle">Update your personal information and password</p>
        </div>

        <form id="settingsForm" class="settings-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="firstName"><i class="fas fa-user"></i> First Name</label>
                    <input type="text" id="firstName" value="${u.firstName || ''}" required>
                </div>
                <div class="form-group">
                    <label for="lastName"><i class="fas fa-user"></i> Last Name</label>
                    <input type="text" id="lastName" value="${u.lastName || ''}" required>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="address"><i class="fas fa-map-marker-alt"></i> Address</label>
                    <input type="text" id="address" value="${u.address || ''}" required>
                </div>
                <div class="form-group">
                    <label for="contactNumber"><i class="fas fa-phone"></i> Contact Number</label>
                    <input type="tel" id="contactNumber" value="${u.phone || ''}" pattern="[0-9]{10,15}" required>
                </div>
            </div>

            <div class="divider"></div>
            <h2 class="section-title"><i class="fas fa-lock"></i> Change Password</h2>

            <div class="form-row">
                <div class="form-group">
                    <label for="oldPassword">Old Password</label>
                    <input type="password" id="oldPassword">
                </div>
                <div class="form-group">
                    <label for="newPassword">New Password</label>
                    <input type="password" id="newPassword">
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword">
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Save Changes
                </button>
                <button type="button" class="btn btn-secondary" id="cancelSettings">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </form>
    `;
    mainContent.appendChild(settingsSection);

    document.getElementById('settingsForm').addEventListener('submit', (e) => handleSettingsSubmit(e, u));
    document.getElementById('cancelSettings').addEventListener('click', () => {
        removeSettingsForm();
        initDashboard(user);
    });
}


async function handleSettingsSubmit(e, user) {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName  = document.getElementById('lastName').value.trim();
    const address   = document.getElementById('address').value.trim();
    const contactNumber = document.getElementById('contactNumber').value.trim();
    const oldPassword   = document.getElementById('oldPassword').value.trim();
    const newPassword   = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    if (!firstName || !lastName || !address || !contactNumber) {
        alert('Please fill in all required fields.');
        return;
    }
    if (newPassword || confirmPassword || oldPassword) {
        if (!oldPassword) { alert('Old password is required'); return;}
        if (newPassword !== confirmPassword) { alert('Passwords do not match'); return;}
        if (newPassword.length < 6) { alert('Must be at least 6 characters'); return; }
    }

    const updateData = {
        firstname: firstName,
        lastname: lastName,
        address: address,
        phone: contactNumber
    };
    if (oldPassword && newPassword) {
        updateData.oldPassword = oldPassword;
        updateData.newPassword = newPassword;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/customers/${user.id}`, {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const updatedUser = await response.json();

            // Save normalized user so subsequent UI reads prefilled values consistently
            const normalized = saveUserToStorage(updatedUser);

            alert('✅ Settings updated successfully!');
            removeSettingsForm();
            initDashboard(normalized);
        } else {
            // Try to parse JSON error; fallback to text
            let errMsg = 'Failed to update settings';
            try {
                const error = await response.json();
                errMsg = error.message || JSON.stringify(error);
            } catch {
                errMsg = await response.text();
            }
            alert(`Error: ${errMsg}`);
        }
    } catch (err) {
        console.error('Update error:', err);
        alert('Failed to update. Please try again.');
    }
}
function computeStatsFromOrders(orders) {
    const list = Array.isArray(orders) ? orders : [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1;

    const getTime = (o) => {
        if (typeof o?.orderTime === 'number') return o.orderTime;
        try { return o?.orderDate ? new Date(o.orderDate).getTime() : 0; } catch { return 0; }
    };
    const getTotal = (o) => {
        const n = Number(o?.total ?? o?.amount ?? 0);
        if (!isFinite(n) || isNaN(n)) {
            const sub = Number(o?.subTotal ?? o?.subtotal ?? 0);
            const tax = Number(o?.tax ?? 0);
            return (isFinite(sub) ? sub : 0) + (isFinite(tax) ? tax : 0);
        }
        return n;
    };

    // Active = not completed/delivered
    const activeCount = list.reduce((acc, o) => acc + (isOrderCompleted(o?.status) ? 0 : 1), 0);

    // Filter current month using timestamps (fallback to parsing if needed)
    const thisMonthOrders = list.filter(o => {
        const t = getTime(o);
        return t >= startOfMonth && t <= endOfMonth;
    });

    const thisMonthCount = thisMonthOrders.length;
    const thisMonthExpenses = thisMonthOrders.reduce((sum, o) => sum + getTotal(o), 0);

    return [
        {
            title: "Active Orders",
            value: `${activeCount} In Progress`,
            icon: "fas fa-box-open",
            color: "bg-green"
        },
        {
            title: "This Month",
            value: `${thisMonthCount} Orders`,
            icon: "fas fa-history",
            color: "bg-orange"
        },
        {
            title: "Total Expenses This Month",
            value: "$" + thisMonthExpenses.toFixed(2),
            icon: "fas fa-dollar-sign",
            color: "bg-purple"
        }
    ];
}

function computeChartData(orders) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });

    console.log('This month\'s service types:', thisMonthOrders.map(order => order.serviceType)); // Debug log for service types

    const washFoldCount = thisMonthOrders.filter(order => (order.serviceType || '').toLowerCase() === 'wash-fold').length;
    const dryCleanCount = thisMonthOrders.filter(order => (order.serviceType || '').toLowerCase() === 'dry-clean').length;
    const linensCount = thisMonthOrders.filter(order => (order.serviceType || '').toLowerCase() === 'linens').length;

    console.log('Chart data computation:', { washFoldCount, dryCleanCount, linensCount }); // Debug log for counts

    return [washFoldCount, dryCleanCount, linensCount];
}

// Treat both "delivered" and "completed" as finished orders
function isOrderCompleted(status) {
    const s = (status || '').toLowerCase();
    return s === 'delivered' || s === 'completed';
}

function showRecentOrders(orders) {
    const list = Array.isArray(orders)
        ? orders
        : (Array.isArray(orders?.content) ? orders.content : []);

    // Sort by date and take the top 3
    const recentOrders = list
        .sort((a, b) => b.orderTime - a.orderTime)
        .slice(0, 3);

    renderOrders(recentOrders, 'orders-container');
    toggleDashboardSections(true);
}


function showMyOrders(userId) {
    hideDashboardSections();
    removeSettingsForm();
    removeOrdersSection();
    removeApplicationsSection();
    removePaymentsSection();

    const mainContent = document.querySelector('.main-content');
    const ordersSection = document.createElement('section');
    ordersSection.className = 'orders-section card';
    ordersSection.innerHTML = `
        <h1>My Orders</h1>
        <div id="my-orders-container" class="order-list"></div>
    `;
    mainContent.appendChild(ordersSection);

    fetchOrdersData(userId).then(orders => {
        const activeOrders = orders.filter(order => !isOrderCompleted(order.status));
        renderOrders(activeOrders, 'my-orders-container');
    });
}

function showOrderHistory(userId) {
    hideDashboardSections();
    removeSettingsForm();
    removeOrdersSection();
    removeApplicationsSection();
    removePaymentsSection();

    const mainContent = document.querySelector('.main-content');
    const ordersSection = document.createElement('section');
    ordersSection.className = 'orders-section card';
    ordersSection.innerHTML = `
        <h1>Order History</h1>
        <div id="history-orders-container" class="order-list"></div>
    `;
    mainContent.appendChild(ordersSection);

    fetchOrdersData(userId).then(orders => {
        const completedOrders = orders.filter(order => isOrderCompleted(order.status));
        renderOrders(completedOrders, 'history-orders-container');
    });
}

// Inline Payments view inside dashboard
async function showPayments(userId) {
    hideDashboardSections();
    removeSettingsForm();
    removeOrdersSection();
    removeApplicationsSection();
    removePaymentsSection();

    const mainContent = document.querySelector('.main-content');
    const section = document.createElement('section');
    section.className = 'payments-section card';
    section.innerHTML = `
        <h1>My Payments</h1>
        <div id="payments-container" class="order-list">
            <p class="loading-text">Loading payments...</p>
        </div>
    `;
    mainContent.appendChild(section);

    const container = document.getElementById('payments-container');

    async function fetchJson(url) {
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    try {
        let data;
        // Prefer dedicated payments endpoint if available
        try {
            data = await fetchJson(`http://localhost:8080/api/payments/customer/${userId}`);
        } catch (e) {
            // Fallback: derive paid orders using full orders API (includes paymentId)
            const page = await fetchJson(`http://localhost:8080/api/orders?customerId=${userId}&size=1000&sort=date,DESC`);
            const orders = Array.isArray(page) ? page
                : Array.isArray(page?.content) ? page.content
                    : [];
            data = orders
                .filter(o => (o.paymentId != null) || (o.payment_id != null))
                .map(o => ({
                    paymentId: o.paymentId || o.payment_id || null,
                    orderId: o.orderId || o.id || o.order_id,
                    amount: o.total || 0,
                    method: o.paymentMethod || o.method || 'Unknown',
                    date: o.date || o.paymentDate || o.paidAt || null
                }));
        }

        const payments = (Array.isArray(data) ? data : []).map(p => ({
            id: p.paymentId ?? p.payment_id ?? p.id ?? null,
            orderId: p.orderId ?? p.order_id ?? p.order?.id ?? p.orderID ?? null,
            total: Number(p.amount ?? p.amountPaid ?? p.total ?? 0),
            method: p.paymentMethod ?? p.method ?? p.type ?? 'Unknown',
            orderDateStr: p.paymentDate ?? p.paidAt ?? p.createdAt ?? p.date ?? null ? new Date(p.paymentDate ?? p.paidAt ?? p.createdAt ?? p.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'
        }));

        if (!payments.length) {
            container.innerHTML = '<p class="loading-text" style="text-align: center; padding: 2rem 0;">No payments found.</p>';
            return;
        }

        container.innerHTML = payments.map(pm => `
        <div class="modern-order-item">
            <div class="order-icon-wrapper wash-fold">
                <i class="fas fa-receipt"></i>
            </div>
            <div class="order-details-main">
                <span class="order-id">Payment #${pm.id}</span>
                <span class="order-date">${pm.orderDateStr}</span>
            </div>
            <div class="order-details-secondary">
                <span class="order-total">$${pm.total.toFixed(2)}</span>
                <span class="badge completed">${pm.method}</span>
            </div>
            <a href="#" class="order-action-btn" aria-label="View Payment #${pm.id}">
                <i class="fas fa-chevron-right"></i>
            </a>
        </div>
      `).join('');

    } catch (err) {
        console.error('Failed to load payments:', err);
        container.innerHTML = '<p class="loading-text" style="text-align: center; padding: 2rem 0;">Failed to load payments. Please try again later.</p>';
    }
}


function removeOrdersSection() {
    document.querySelectorAll('.orders-section').forEach(el => el.remove());
}

function removePaymentsSection() {
    document.querySelectorAll('.payments-section').forEach(el => el.remove());
}

function toggleDashboardSections(show) {
    const dashboardGrid = document.querySelector('.dashboard-grid');
    if (dashboardGrid) {
        dashboardGrid.style.display = show ? 'grid' : 'none';
    }
}


function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id #${containerId} not found`);
        return;
    }
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="loading-text" style="text-align: center; padding: 2rem 0;">No orders to display.</p>';
        return;
    }

    const getServiceIcon = (serviceType) => {
        const s = (serviceType || '').toLowerCase();
        if (s.includes('wash')) return 'fa-tshirt';
        if (s.includes('dry')) return 'fa-soap';
        if (s.includes('linen')) return 'fa-bed';
        return 'fa-box';
    };

    const getIconWrapperClass = (serviceType) => {
        const s = (serviceType || '').toLowerCase();
        if (s.includes('wash')) return 'wash-fold';
        if (s.includes('dry')) return 'dry-clean';
        if (s.includes('linen')) return 'linens';
        return 'unknown';
    };

    container.innerHTML = orders.map(order => `
    <div class="modern-order-item">
        <div class="order-icon-wrapper ${getIconWrapperClass(order.serviceType)}">
            <i class="fas ${getServiceIcon(order.serviceType)}"></i>
        </div>
        <div class="order-details-main">
            <span class="order-id">Order #${order.id}</span>
            <span class="order-date">${order.orderDateStr}</span>
        </div>
        <div class="order-details-secondary">
            <span class="order-total">$${order.total.toFixed(2)}</span>
            <span class="badge ${order.status.toLowerCase().replace(/\s+/g, '-')}">${order.status}</span>
        </div>
        <a href="#" class="order-action-btn" aria-label="View Order #${order.id}">
            <i class="fas fa-chevron-right"></i>
        </a>
    </div>
  `).join('');
}

function updateUserInfo(user) {
    const u = normalizeUser(user);
    const userNameEl = document.getElementById('user-name');
    const membershipEl = document.getElementById('membership-status');
    const welcomeMessageEl = document.getElementById('welcome-message');
    const welcomeSubtitleEl = document.getElementById('welcome-subtitle');

    if (!userNameEl || !membershipEl || !welcomeMessageEl || !welcomeSubtitleEl) {
        console.error('User info elements not found in HTML');
        return;
    }

    const firstName = u.firstName || 'User';
    const lastName = u.lastName || '';
    const membership = u.membership || 'Standard Member';

    userNameEl.textContent = `${firstName} ${lastName}`.trim() || 'User';
    membershipEl.textContent = membership;
    welcomeMessageEl.textContent = `Welcome back, ${firstName}! 👋`;
    welcomeSubtitleEl.textContent = `Manage your laundry orders below.`;
}


async function fetchOrdersData(customerId) {
    try {
        const response = await fetch(`http://localhost:8080/api/orders/customer/${customerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const msg = await response.text().catch(() => 'Failed to fetch orders');
            throw new Error(msg || 'Failed to fetch orders');
        }
        const raw = await response.json();

        // Support both plain arrays and Spring Page responses
        const items = Array.isArray(raw)
            ? raw
            : (Array.isArray(raw?.content) ? raw.content : []);

        // Normalize fields for UI (compute numeric time and a preformatted date string once)
        const orders = items.map(o => {
            const id =
                o.orderId ?? o.id ?? o.order_id ?? o.orderID ?? null;

            const orderDate =
                o.orderDate ?? o.date ?? o.createdAt ?? o.placedAt ?? null;

            let orderTime = 0;
            let orderDateStr = '-';
            try {
                if (orderDate) {
                    const d = new Date(orderDate);
                    orderTime = d.getTime();
                    orderDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                }
            } catch { /* noop */ }

            const serviceType =
                (o.serviceType ?? o.service_type ?? o.type ?? '').toString();

            const status =
                (o.status ?? o.state ?? '').toString();

            const totalNum = Number(
                o.total ??
                o.amount ??
                o.amountPaid ??
                ((Number(o.subTotal ?? o.subtotal ?? 0) + Number(o.tax ?? 0)))
            ) || 0;

            return {
                id,
                orderDate,
                orderTime,
                orderDateStr,
                serviceType,
                status,
                total: totalNum
            };
        }).filter(o => o.id != null);

        return orders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

function updateStats(stats) {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;

    const list = Array.isArray(stats) ? stats : [];
    if (list.length === 0) {
        statsContainer.innerHTML = '<p class="loading-text">No stats available</p>';
        return;
    }

    statsContainer.innerHTML = list.map(stat => `
        <div class="stat-card">
            <div class="stat-icon ${stat.color}"><i class="${stat.icon}"></i></div>
            <div class="stat-content">
                <h3>${stat.title}</h3>
                <p>${stat.value}</p>
            </div>
        </div>
    `).join('');
}

function initChart(chartData) {
    const ctx = document.getElementById("serviceChart");
    if (!ctx) return;

    // Destroy existing chart if it exists to allow re-render
    if (serviceChart) {
        serviceChart.destroy();
        serviceChart = null;
    }

    const total = chartData.reduce((sum, val) => sum + val, 0);
    let data = chartData.map(count => count === 0 ? 0.001 : count); // Tiny value for zero to make visible
    let backgroundColor = ["#3b82f6", "#10b981", "#f59e0b"];
    let isNoData = total === 0;

    if (isNoData) {
        data = [1]; // Single segment for "No data"
        backgroundColor = ["#cccccc"]; // Gray for no data
    }

    serviceChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: isNoData ? ["No Data"] : ["Wash & Fold", "Dry Cleaning", "Home & Linens"],
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                cutout: "70%",
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom' // Show legend at bottom for clarity
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (isNoData) {
                                return "No service data available this month";
                            }
                            const label = context.label || '';
                            const value = chartData[context.dataIndex] || 0; // Actual count
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} orders (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function showErrorState() {
    // Do NOT overwrite user info or main welcome message – only subtitle and dynamic sections
    const welcomeSubtitleEl = document.getElementById('welcome-subtitle');
    if (welcomeSubtitleEl) welcomeSubtitleEl.textContent = "Unable to load some data. Please try again later.";

    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) statsContainer.innerHTML = '<p class="loading-text">Failed to load stats</p>';

    const ordersContainer = document.getElementById('orders-container');
    if (ordersContainer) ordersContainer.innerHTML = '<p class="loading-text">Failed to load orders</p>';
}

function showOrdersError() {
    const ordersContainer = document.getElementById('orders-container');
    if (ordersContainer) {
        ordersContainer.innerHTML = '<p class="loading-text">Error loading orders</p>';
    }
}

// Order Placement Initialization
function initOrderPlacement() {
    const placeOrderLink = document.getElementById('placeOrderLink');
    const orderModal = document.getElementById('orderModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    const serviceTypes = document.querySelectorAll('.service-type');
    const addItemBtn = document.getElementById('addItemBtn');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    const quantityInput = document.getElementById('itemQuantity');

    if (placeOrderLink) {
        placeOrderLink.addEventListener('click', (e) => {
            e.preventDefault();
            orderModal.classList.add('active');
            loadServiceItems('wash-fold');
            // Refresh tax rate on open to reflect any recent admin changes
            fetchTaxRate();
            setTaxLabelFromRate();
            updateOrderSummary();
            submitOrderBtn.disabled = true;
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeOrderModal);
    }

    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener('click', closeOrderModal);
    }

    if (serviceTypes) {
        serviceTypes.forEach(type => {
            type.addEventListener('click', () => {
                serviceTypes.forEach(t => t.classList.remove('active'));
                type.classList.add('active');
                loadServiceItems(type.dataset.type);
            });
        });
    }

    if (minusBtn && plusBtn && quantityInput) {
        minusBtn.addEventListener('click', () => {
            if (parseInt(quantityInput.value) > 1) {
                quantityInput.value = parseInt(quantityInput.value) - 1;
            }
        });
        plusBtn.addEventListener('click', () => {
            quantityInput.value = parseInt(quantityInput.value) + 1;
        });
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', debounce(addItemToOrder, 300));
    }

    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', debounce(proceedToPayment, 300));

    }

    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                closeOrderModal();
            }
        });
    }
}

function loadServiceItems(serviceType) {
    const itemSelect = document.getElementById('itemSelect');
    if (!itemSelect) return;

    itemSelect.innerHTML = '<option value="">Select an item</option>';
    const items = serviceItems[serviceType] || [];
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} - $${item.price.toFixed(2)}`;
        option.dataset.price = item.price;
        itemSelect.appendChild(option);
    });
}

function addItemToOrder() {
    const itemSelect = document.getElementById('itemSelect');
    const quantityInput = document.getElementById('itemQuantity');
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    const quantity = parseInt(quantityInput.value);

    if (!selectedOption.value || isNaN(quantity) || quantity < 1) {
        alert('Please select an item and valid quantity');
        return;
    }

    const item = {
        id: parseInt(selectedOption.value),
        name: selectedOption.text.split(' - ')[0],
        price: parseFloat(selectedOption.dataset.price),
        quantity: quantity
    };

    currentOrderItems.push(item);
    updateOrderSummary();
    itemSelect.value = '';
    quantityInput.value = 1;
}

function updateOrderSummary() {
    const orderItemsList = document.getElementById('orderItemsList');
    const subtotalAmount = document.getElementById('subtotalAmount');
    const taxAmount = document.getElementById('taxAmount');
    const totalAmount = document.getElementById('totalAmount');
    const submitOrderBtn = document.getElementById('submitOrderBtn');

    if (!orderItemsList) return; // Prevent errors if modal is closed

    setTaxLabelFromRate();

    orderItemsList.innerHTML = '';
    if (currentOrderItems.length === 0) {
        orderItemsList.innerHTML = '<tr class="empty-message"><td colspan="5">No items added yet</td></tr>';
        subtotalAmount.textContent = '$0.00';
        taxAmount.textContent = '$0.00';
        totalAmount.textContent = '$0.00';
        submitOrderBtn.disabled = true;
        return;
    }

    let subtotal = 0;
    currentOrderItems.forEach((item, index) => {
        const total = item.price * item.quantity;
        subtotal += total;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${total.toFixed(2)}</td>
            <td><button class="remove-item" onclick="removeItem(${index})">Remove</button></td>
        `;
        orderItemsList.appendChild(row);
    });

    const tax = subtotal * getTaxRate();
    const total = subtotal + tax;
    subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;
    taxAmount.textContent = `$${tax.toFixed(2)}`;
    totalAmount.textContent = `$${total.toFixed(2)}`;
    submitOrderBtn.disabled = false;
}

window.removeItem = function(index) {  // Make removeItem globally accessible for onclick
    currentOrderItems.splice(index, 1);
    updateOrderSummary();
};

async function submitOrder() {
    const user = (window.Auth && Auth.getUser) ? Auth.getUser('customer') : JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        alert("❌ Please login again – no customer info found.");
        window.location.href = "login.html";
        return;
    }

    const specialInstructions = document.getElementById('specialInstructions').value;
    const serviceTypeElement = document.querySelector('.service-type.active');
    const customer = (window.Auth && Auth.getUser) ? Auth.getUser('customer') : JSON.parse(localStorage.getItem('user'));

    if (!customer) {
        alert('Please log in first');
        window.location.href = 'login.html';
        return;
    }

    if (!serviceTypeElement) {
        alert('Please select a service type');
        return;
    }

    if (currentOrderItems.length === 0) {
        alert('Please add at least one item to your order');
        return;
    }

    const subtotal = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * getTaxRate();
    const total = subtotal + tax;

    const orderData = {
        customer: { id: user.id },
        serviceType: serviceTypeElement.dataset.type,
        items: JSON.stringify(currentOrderItems),
        specialInstructions,
        subTotal: subtotal,
        tax,
        total,
        orderDate: new Date().toISOString().split('T')[0]  // Current date in YYYY-MM-DD format for database
    };

    console.log('Submitting order with serviceType:', orderData.serviceType); // Debug log for serviceType

    try {
        const submitOrderBtn = document.getElementById('submitOrderBtn');
        submitOrderBtn.disabled = true;
        const response = await fetch("http://localhost:8080/api/orders/place", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();
        if (response.ok) {
            alert(`✅ ${result.message} (Order #${result.orderId})`);
            closeOrderModal();
            currentOrderItems = [];
            await refreshDashboard();
        } else {
            alert(`❌ ${result.message}`);
            submitOrderBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error placing order:', error);
        alert('❌ Failed to place order: ' + error.message);
        document.getElementById('submitOrderBtn').disabled = false;
    }
}

function proceedToPayment() {
    const user = (window.Auth && Auth.getUser) ? Auth.getUser('customer') : JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        alert("❌ Please login again – no customer info found.");
        window.location.href = "login.html";
        return;
    }

    const serviceTypeElement = document.querySelector('.service-type.active');
    if (!serviceTypeElement) {
        alert('Please select a service type');
        return;
    }

    if (currentOrderItems.length === 0) {
        alert('Please add at least one item to your order');
        return;
    }

    const specialInstructions = document.getElementById('specialInstructions').value;

    const subtotal = currentOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * getTaxRate();
    const total = subtotal + tax;

    const orderData = {
        customer: { id: user.id },
        serviceType: serviceTypeElement.dataset.type,
        items: JSON.stringify(currentOrderItems),
        specialInstructions,
        subTotal: subtotal,
        tax,
        total,
        orderDate: new Date().toISOString().split('T')[0]
    };

    // Persist the pending order for the payment page to finalize
    sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));

    // Redirect to payment page (enforce payment before placing the order)
    window.location.href = 'Payment.html';
}


function closeOrderModal() {
    const orderModal = document.getElementById('orderModal');
    const quantityInput = document.getElementById('itemQuantity');
    const specialInstructions = document.getElementById('specialInstructions');
    orderModal.classList.remove('active');
    currentOrderItems = [];
    updateOrderSummary();
    quantityInput.value = 1;
    specialInstructions.value = '';
}

async function refreshDashboard(user) {
    if (!user) user = (window.Auth && Auth.getUser) ? Auth.getUser('customer') : JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    // Re-update user info during refresh
    updateUserInfo(user);

    // Invalidate cache to force fresh data
    cachedOrders = null;

    let ordersData;
    try {
        ordersData = await fetchOrdersData(user.id);
        cachedOrders = ordersData;
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        ordersData = [];
    }

    // Compute stats and chart data from fresh orders
    const statsData = computeStatsFromOrders(ordersData);
    const chartData = computeChartData(ordersData);

    updateStats(statsData);
    showRecentOrders(ordersData);
    initChart(chartData);
    toggleDashboardSections(true);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function logoutUser() {
    if (window.Auth && Auth.logoutRole) {
        Auth.logoutRole('customer');
    } else {
        localStorage.removeItem('user');
        localStorage.removeItem('authUser');
    }
    window.location.href = 'login.html';
}