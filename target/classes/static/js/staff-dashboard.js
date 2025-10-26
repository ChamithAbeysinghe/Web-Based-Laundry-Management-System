document.addEventListener("DOMContentLoaded", () => {
    // Use the Auth object instead of local requireRoles function
    const sessionUser = Auth.getUser('staff') || Auth.getUser('admin');
    if (!sessionUser) {
        window.location.href = "login.html?role=staff&redirect=" + encodeURIComponent(location.href);
        return; // redirected if unauthorized
    }

    let currentStaffId = 1;
    // Reveal observer must be declared before any setup calls to avoid TDZ errors
    let revealObserver = null;

    // Initialize the global currentStaffId for notifications
    window.currentStaffId = currentStaffId;

    const statusCycle = [
        "Order Placed", "Pickup Scheduled", "Pickup Completed",
        "Washing", "Drying", "Ironing",
        "Quality Check", "Ready for Delivery", "Delivered"
    ];

    // Read logged-in staff for header + id (normalized)
    try {
        const user = saveUserToStorage(sessionUser); // ensure normalized + persisted to both keys
        const firstName = user.firstName ?? "";
        const lastName  = user.lastName  ?? "";
        const displayName = `${firstName} ${lastName}`.trim() || (user.email || "Staff");
        if (typeof user.id === "number") {
            currentStaffId = user.id;
            window.currentStaffId = currentStaffId; // Update global variable
        }

        const nameEl = document.getElementById("staff-name");
        const welcomeEl = document.getElementById("welcome-message");
        if (nameEl) nameEl.textContent = displayName;
        if (welcomeEl) welcomeEl.textContent = `Welcome back, ${firstName || "Staff"}! Here are your orders to process.`;
    } catch (e) {
        console.warn("Could not read user from localStorage for staff header:", e);
    }

    // Initialize notifications
    if (typeof initNotifications === 'function') {
        initNotifications();
    } else {
        console.warn("Notification system not loaded. Make sure notifications.js is included.");
    }

    async function initializePage() {
        try {
            const res = await fetch("http://localhost:8080/api/staff/orders");
            const orders = await res.json();

            updateQuickStats(orders);
            loadProcessingData(orders);
            loadOrderTrackingData(orders);
            loadDispatchData(orders);
            loadWorkHistoryData(orders);

            // Apply reveal effect to newly rendered content
            refreshReveals();
        } catch (err) {
            console.error("Failed to load staff orders", err);
        }
    }

    setupEventListeners();
    setupSidebarToggle();
    setupNavLinks();
    setupOrderSearch();
    setupSettings();
    setupRevealObserver();
    initializePage();

    // ---------------- UI Wiring ----------------
    function setupEventListeners() {
        const unassigned = document.getElementById('unassigned-orders-container');
        const processing = document.getElementById('processing-orders-container');
        const result = document.getElementById('orderSearchResult');
        const dispatch = document.getElementById('dispatch-container');

        if (unassigned) unassigned.addEventListener('click', handleClaimOrder);
        if (processing) processing.addEventListener('click', handleProcessingUpdate);
        if (result) result.addEventListener('click', handleMilestoneUpdate);
        if (dispatch) dispatch.addEventListener('click', handleDispatchAction);
    }



    function normalizeUser(user) {
        if (!user) return user;
        const firstName = user.firstName ?? user.firstname ?? "";
        const lastName  = user.lastName  ?? user.lastname  ?? "";
        const role      = (user.role ?? "").toString().toLowerCase();
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
        localStorage.setItem("user", JSON.stringify(normalized));
        localStorage.setItem("authUser", JSON.stringify(normalized));
        return normalized;
    }

    function getSessionUser() {
        const raw = localStorage.getItem("user") || localStorage.getItem("authUser");
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            return saveUserToStorage(parsed); // re-save normalized into both keys
        } catch {
            return null;
        }
    }

    function requireRoles(allowedRoles) {
        // First try to use Auth object if available (preferred method)
        if (window.Auth) {
            for (const role of allowedRoles) {
                const user = Auth.getUser(role);
                if (user) return user;
            }
            // No valid user found, redirect to login
            window.location.href = "login.html?role=" +
                encodeURIComponent(allowedRoles[0] || 'staff') +
                "&redirect=" + encodeURIComponent(location.href);
            return null;
        }

        // Fallback to old method if Auth is not available
        const u = getSessionUser();
        const role = (u?.role || "").toLowerCase();
        if (!u || !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
            alert("Access denied");
            window.location.href = "login.html";
            return null;
        }
        return u;
    }

    function logoutUser() {
        localStorage.removeItem("user");
        localStorage.removeItem("authUser");
        window.location.href = "login.html";
    }





    function setupSidebarToggle() {
        const menuToggle = document.getElementById("menuToggle");
        const sidebar = document.getElementById("sidebar");
        if (!menuToggle || !sidebar) return;
        menuToggle.addEventListener("click", () => sidebar.classList.toggle("mobile-open"));
        document.addEventListener("click", (e) => {
            if (window.innerWidth < 992 &&
                sidebar.classList.contains("mobile-open") &&
                !sidebar.contains(e.target) &&
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove("mobile-open");
            }
        });
    }

    function setupNavLinks() {
        const navItems = document.querySelectorAll(".nav-item[data-section]");
        const sections = document.querySelectorAll(".dashboard-section");
        const pageTitle = document.getElementById("page-title");
        const welcomeMessage = document.getElementById("welcome-message");
        if (!pageTitle || !welcomeMessage) return;
        navItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const sectionId = item.getAttribute("data-section") + "-section";
                navItems.forEach((n) => n.classList.remove("active"));
                item.classList.add("active");
                sections.forEach((s) => s.classList.remove("active"));
                document.getElementById(sectionId)?.classList.add("active");
                pageTitle.textContent = item.textContent.trim();
                const msgs = {
                    "Processing Queue": `Welcome back, ${document.getElementById("staff-name")?.textContent || "Staff"}! Here are your orders to process.`,
                    "Order Tracking": `Use this section to find, claim, and update order milestones.`,
                    "Dispatch Queue": `Accept and manage deliveries from this queue.`,
                    "Work History": `A record of your completed and delivered orders.`,
                    "Settings": `Update your personal information and preferences.`
                };
                welcomeMessage.textContent = msgs[item.textContent.trim()] || `Manage your ${item.textContent.trim().toLowerCase()}.`;
            });
        });
    }

    async function setupOrderSearch() {
        const searchBtn = document.getElementById("searchOrderBtn");
        const input = document.getElementById("orderSearchInput");
        if (!searchBtn || !input) return;
        searchBtn.addEventListener("click", async () => {
            const orderId = parseInt(input.value.trim());
            if (isNaN(orderId)) return;
            const res = await fetch(`http://localhost:8080/api/staff/orders/${orderId}`);
            const order = res.ok ? await res.json() : null;
            renderSearchResult(order, orderId);
        });
    }

    // Settings initialization
    function setupSettings() {
        const u = getSessionUser();

        // Prefill names
        const firstNameInput = document.getElementById('settings-first-name');
        const lastNameInput = document.getElementById('settings-last-name');
        if (firstNameInput) firstNameInput.value = u?.firstName ?? '';
        if (lastNameInput)  lastNameInput.value  = u?.lastName  ?? '';

        // Personal info form handler
        const profileForm = document.getElementById('profile-form');
        const profileMsg = document.getElementById('profile-save-msg');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const firstNameVal = (firstNameInput?.value || '').trim();
                const lastNameVal  = (lastNameInput?.value || '').trim();

                if (!firstNameVal || !lastNameVal) {
                    showFormMessage(profileMsg, 'First and last name are required.', false);
                    return;
                }
                try {
                    // Get the current server-side entity so we don't null-out fields like role
                    const existingRes = await fetch(`http://localhost:8080/api/staff/${currentStaffId}`);
                    const base = existingRes.ok ? await existingRes.json() : {};

                    // Merge changed fields
                    const payload = { ...base, firstName: firstNameVal, lastName: lastNameVal };

                    const res = await fetch(`http://localhost:8080/api/staff/${currentStaffId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) {
                        let msg = 'Could not save changes. Please try again.';
                        try { const data = await res.json(); if (data?.message) msg = data.message; } catch {}
                        throw new Error(msg);
                    }
                    const updatedUser = { ...(u || {}), firstName: firstNameVal, lastName: lastNameVal };
                    const saved = saveUserToStorage(updatedUser);

                    // Update header and welcome
                    const displayName = `${saved.firstName ?? ''} ${saved.lastName ?? ''}`.trim() || (saved.email || 'Staff');
                    const nameEl = document.getElementById("staff-name");
                    const welcomeEl = document.getElementById("welcome-message");
                    if (nameEl) nameEl.textContent = displayName;
                    if (welcomeEl) welcomeEl.textContent = `Welcome back, ${saved.firstName || "Staff"}! Here are your orders to process.`;

                    showFormMessage(profileMsg, 'Saved successfully.', true);
                } catch (err) {
                    console.error('Profile update failed:', err);
                    showFormMessage(profileMsg, err.message || 'Could not save changes. Please try again.', false);
                }
            });
        }

        // Password form handler
        const passwordForm = document.getElementById('password-form');
        const currentPw = document.getElementById('current-password');
        const newPw = document.getElementById('new-password');
        const confirmPw = document.getElementById('confirm-password');
        const passwordMsg = document.getElementById('password-save-msg');

        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const currentPassword = currentPw.value.trim();
                const newPassword = newPw.value.trim();
                const confirmPassword = confirmPw.value.trim();
                if (!currentPassword) {
                    showFormMessage(passwordMsg, 'Current password is required.', false);
                    return;
                }
                if (newPassword.length < 8) {
                    showFormMessage(passwordMsg, 'New password must be at least 8 characters.', false);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showFormMessage(passwordMsg, 'Passwords do not match.', false);
                    return;
                }
                try {
                    const res = await fetch(`http://localhost:8080/api/staff/${currentStaffId}/password`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPassword, newPassword })
                    });
                    if (res.ok) {
                        showFormMessage(passwordMsg, 'Password updated successfully.', true);
                        passwordForm.reset();
                    } else {
                        let msg = await res.text();
                        showFormMessage(passwordMsg, msg || 'Failed to update password.', false);
                    }
                } catch (err) {
                    showFormMessage(passwordMsg, err.message || 'Password update failed.', false);
                }
            });
        }
    }

    // ---- Reveal effects (smooth scroll-in) ----
    function setupRevealObserver() {
        if (revealObserver) return;
        // Fallback for older browsers: just reveal all immediately
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
            return;
        }
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    }

    function refreshReveals() {
        // Targets include hero, stat cards, generic cards and modern subcards
        const targets = [
            '.dashboard-hero',
            '.quick-stats .stat-card',
            '.card',
            '.processing-card-modern',
            '.dispatch-card-modern',
            '.unassigned-order-card',
            '.history-card-modern'
        ];
        if (!revealObserver) setupRevealObserver();
        const nodes = document.querySelectorAll(targets.join(','));
        nodes.forEach(n => {
            if (!n.classList.contains('reveal') && !n.classList.contains('visible')) {
                n.classList.add('reveal');
            }
            if (revealObserver) {
                revealObserver.observe(n);
            } else {
                // Fallback already applied: ensure visible
                n.classList.add('visible');
            }
        });
    }

    function showFormMessage(el, text, ok) {
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
        el.style.color = ok ? '#0a7d2f' : '#b10e0e';
        setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
    }

    // --------------- Order Tracking (subsections) ---------------
    function ensureOrderTrackingSubsections() {
        const section = document.getElementById('order-tracking-section');
        if (!section) return;

        const insertBeforeEl = document.getElementById('unassigned-orders-container')?.closest('.card') || null;

        if (!document.getElementById('pickup-completed-card')) {
            const pickupCard = document.createElement('div');
            pickupCard.className = 'card';
            pickupCard.id = 'pickup-completed-card';
            pickupCard.innerHTML = `
                <div class="card-header"><h2>Pickup Completed</h2></div>
                <div class="card-body">
                    <div id="pickup-completed-container" class="sublist"></div>
                </div>
            `;
            if (insertBeforeEl) section.insertBefore(pickupCard, insertBeforeEl);
            else section.appendChild(pickupCard);
        }

        if (!document.getElementById('processing-completed-card')) {
            const processingCard = document.createElement('div');
            processingCard.className = 'card';
            processingCard.id = 'processing-completed-card';
            processingCard.innerHTML = `
                <div class="card-header"><h2>Processing Completed</h2></div>
                <div class="card-body">
                    <div id="processing-completed-container" class="sublist"></div>
                </div>
            `;
            if (insertBeforeEl) section.insertBefore(processingCard, insertBeforeEl);
            else section.appendChild(processingCard);
        }
    }

    function loadOrderTrackingData(allOrders) {
        const norm = s => (s || '').toString().trim().toLowerCase();

        // Unassigned claimable: Order Placed or Processing
        const claimableStatuses = new Set(['order placed', 'processing']);
        const unassignedOrders = allOrders.filter(o => o.staff_id === null && claimableStatuses.has(norm(o.status)));
        renderUnassignedOrders(unassignedOrders);

        ensureOrderTrackingSubsections();

        // Pickup Completed list
        const pickupCompletedOrders = allOrders.filter(o => norm(o.status) === 'pickup completed');
        renderSimpleOrdersList(
            pickupCompletedOrders,
            document.getElementById('pickup-completed-container'),
            'No pickup-completed orders found.'
        );

        // Processing Completed list (final in-plant states)
        const processingCompletedStatuses = new Set(['ironing', 'quality check']);
        const processingCompletedOrders = allOrders.filter(o => processingCompletedStatuses.has(norm(o.status)));
        renderSimpleOrdersList(
            processingCompletedOrders,
            document.getElementById('processing-completed-container'),
            'No processing-completed orders found.'
        );

        attachPickupCompletedActions();
        attachProcessingCompletedActions();
    }

    function renderSimpleOrdersList(orders, container, emptyMessage) {
        if (!container) return;
        if (!orders || orders.length === 0) {
            container.innerHTML = `<p class="text-muted">${emptyMessage}</p>`;
            return;
        }
        container.innerHTML = orders.map(o => {
            const dateTxt = o.order_date ? new Date(o.order_date).toLocaleDateString() : '';
            const stLower = (o.status || '').toString().trim().toLowerCase();

            let actions = '';
            if (stLower === 'pickup completed') {
                actions = `
                    <button class="btn btn-primary btn-sm start-processing-btn" data-order-id="${o.order_id}">
                        Start Processing
                    </button>
                `;
            } else if (stLower === 'ironing') {
                actions = `
                    <button class="btn btn-primary btn-sm set-ready-btn" data-order-id="${o.order_id}">
                        Set Ready for Delivery
                    </button>
                `;
            } else if (stLower === 'ready for delivery') {
                actions = `
                    <button class="btn btn-outline btn-sm accept-delivery-btn" data-order-id="${o.order_id}">
                        Accept Delivery
                    </button>
                    <button class="btn btn-success btn-sm mark-delivered-btn" data-order-id="${o.order_id}">
                        Mark as Delivered
                    </button>
                `;
            } else {
                actions = `
                    <button class="btn btn-sm" onclick="document.getElementById('orderSearchInput').value='${o.order_id}'; document.getElementById('searchOrderBtn').click();">
                        Manage
                    </button>
                `;
            }

            return `
                <div class="unassigned-order-card">
                    <div class="order-info">
                        <span>Order #${o.order_id} - ${o.customer_name || ''}</span>
                        <small style="display:block;color:#666;">${o.status}${dateTxt ? ' • ' + dateTxt : ''}</small>
                    </div>
                    <div class="order-actions">
                        ${actions}
                    </div>
                </div>
            `;
        }).join('');
    }

    function attachPickupCompletedActions() {
        const pickupContainer = document.getElementById('pickup-completed-container');
        if (!pickupContainer || pickupContainer.dataset.bound === '1') return;

        pickupContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const orderId = parseInt(btn.dataset.orderId);
            if (!orderId) return;

            try {
                if (btn.classList.contains('start-processing-btn')) {
                    // Claim order for processing -> backend sets status to "Washing"
                    await fetch(`http://localhost:8080/api/staff/orders/${orderId}/claim?staffId=${currentStaffId}`, {
                        method: 'PUT'
                    });
                }
                await initializePage();
            } catch (err) {
                console.error('Action failed:', err);
                alert('Failed to update order. Please try again.');
            }
        });

        pickupContainer.dataset.bound = '1';
    }

    function attachProcessingCompletedActions() {
        const processingContainer = document.getElementById('processing-completed-container');
        if (!processingContainer || processingContainer.dataset.bound === '1') return;

        processingContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const orderId = parseInt(btn.dataset.orderId);
            if (!orderId) return;

            try {
                if (btn.classList.contains('set-ready-btn')) {
                    // Ironing -> Ready for Delivery (unassigns for dispatch in backend)
                    await fetch(`http://localhost:8080/api/staff/orders/${orderId}/status?status=${encodeURIComponent('Ready for Delivery')}`, {
                        method: 'PUT'
                    });
                } else if (btn.classList.contains('accept-delivery-btn')) {
                    // Claim for delivery
                    await fetch(`http://localhost:8080/api/staff/orders/${orderId}/claim?staffId=${currentStaffId}`, {
                        method: 'PUT'
                    });
                } else if (btn.classList.contains('mark-delivered-btn')) {
                    // Deliver
                    await fetch(`http://localhost:8080/api/staff/orders/${orderId}/delivered`, {
                        method: 'PUT'
                    });
                }
                await initializePage();
            } catch (err) {
                console.error('Action failed:', err);
                alert('Failed to update order. Please try again.');
            }
        });

        processingContainer.dataset.bound = '1';
    }

    // --------------- Dispatch Queue ---------------
    function loadDispatchData(allOrders) {
        const myDispatchOrders = allOrders.filter(o => {
            const st = (o.status || '').toLowerCase();
            const inDispatchWindow = st === 'pickup scheduled' || st === 'ready for delivery';
            if (!inDispatchWindow) return false;
            // Show only orders I can accept (unassigned) or those already assigned to me
            return o.staff_id == null || o.staff_id === currentStaffId;
        });
        renderDispatchOrders(myDispatchOrders);
    }

    function renderDispatchOrders(orders) {
        const container = document.getElementById("dispatch-container");
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = `<p class="text-muted">No orders are currently scheduled in dispatch.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="dispatch-grid">
                ${orders.map(order => {
            const stLower = (order.status || '').toLowerCase();
            const unassigned = order.staff_id == null;
            const assignedToMe = order.staff_id === currentStaffId;
            const stateClass = assignedToMe ? 'assigned' : (unassigned ? 'unassigned' : 'assigned-other');

            // Status pill color
            const statusClass =
                stLower === 'pickup scheduled' ? 'status-pickup' :
                    stLower === 'ready for delivery' ? 'status-ready' :
                        stLower === 'delivered' ? 'status-delivered' :
                            'status-other';

            let actionButton = '';
            if (unassigned) {
                if (stLower === 'pickup scheduled') {
                    actionButton = `<button class="btn btn-primary btn-sm accept-pickup-btn" data-order-id="${order.order_id}"><i class="fas fa-handshake"></i> Accept Pickup</button>`;
                } else if (stLower === 'ready for delivery') {
                    actionButton = `<button class="btn btn-primary btn-sm accept-delivery-btn" data-order-id="${order.order_id}"><i class="fas fa-truck"></i> Accept Delivery</button>`;
                } else {
                    actionButton = `<button class="btn btn-primary btn-sm accept-pickup-btn" data-order-id="${order.order_id}"><i class="fas fa-plus"></i> Accept</button>`;
                }
            } else if (assignedToMe) {
                if (stLower === 'pickup scheduled') {
                    actionButton = `<button class="btn btn-success btn-sm mark-pickup-completed-btn" data-order-id="${order.order_id}"><i class="fas fa-check"></i> Mark Pickup Completed</button>`;
                } else if (stLower === 'ready for delivery') {
                    actionButton = `<button class="btn btn-success btn-sm mark-delivered-btn" data-order-id="${order.order_id}"><i class="fas fa-check-double"></i> Mark as Delivered</button>`;
                } else {
                    actionButton = `<p class="text-muted" style="margin:0;">Assigned to you</p>`;
                }
            } else {
                actionButton = `<p class="text-muted" style="margin:0;">Assigned to Staff #${order.staff_id}</p>`;
            }

            return `
                        <div class="dispatch-card-modern ${stateClass}">
                            <div class="card-top">
                                <div class="order-chip"><i class="fas fa-box-open" aria-hidden="true"></i> <span>Order #${order.order_id}</span></div>
                                <span class="status-pill ${statusClass}">${order.status}</span>
                            </div>
                            <div class="meta">
                                <div class="customer"><i class="fas fa-user" aria-hidden="true"></i> ${order.customer_name || ''}</div>
                                <div class="address"><i class="fas fa-location-dot" aria-hidden="true"></i> ${order.customer_address || ''}</div>
                            </div>
                            <div class="actions">
                                ${actionButton}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    async function handleDispatchAction(e) {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.matches('.accept-pickup-btn') || button.matches('.accept-delivery-btn')) {
            const orderId = parseInt(button.dataset.orderId);
            await fetch(`http://localhost:8080/api/staff/orders/${orderId}/claim?staffId=${currentStaffId}`, { method: "PUT" });
            initializePage();
        }

        if (button.matches('.mark-pickup-completed-btn')) {
            const orderId = parseInt(button.dataset.orderId);
            await fetch(`http://localhost:8080/api/staff/orders/${orderId}/status?status=${encodeURIComponent('Pickup Completed')}`, {
                method: "PUT"
            });
            initializePage();
        }

        if (button.matches('.mark-delivered-btn')) {
            const orderId = parseInt(button.dataset.orderId);
            await fetch(`http://localhost:8080/api/staff/orders/${orderId}/delivered`, { method: "PUT" });
            initializePage();
        }
    }

    // --------------- Processing Queue ---------------
    function loadProcessingData(allOrders) {
        const myProcessingOrders = allOrders.filter(o => o.staff_id === currentStaffId && ['Washing', 'Drying', 'Ironing'].includes(o.status));
        renderProcessingOrders(myProcessingOrders);
    }

    function renderProcessingOrders(orders) {
        const container = document.getElementById("processing-orders-container");
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = `<p class="text-muted">You have no orders in the processing queue.</p>`;
            return;
        }

        const phase = ['Washing', 'Drying', 'Ironing'];
        const progressFor = (status) => {
            const idx = phase.indexOf(status);
            if (idx < 0) return 0;
            return Math.round(((idx + 1) / phase.length) * 100);
        };

        container.innerHTML = `
            <div class="processing-grid">
                ${orders.map(order => {
            const currentStatusIndex = statusCycle.indexOf(order.status);
            const nextStatus = currentStatusIndex >= 0 ? statusCycle[currentStatusIndex + 1] : null;

            let actionButton = '';
            if (['Washing', 'Drying'].includes(order.status) && nextStatus) {
                actionButton = `<button class="btn btn-primary btn-sm update-processing-btn"
                                            data-order-id="${order.order_id}"
                                            data-next-status="${nextStatus}">
                                            <i class="fas fa-play"></i> Start ${nextStatus}
                                         </button>`;
            } else {
                actionButton = `<button class="btn btn-sm" disabled><i class="fas fa-check"></i> Finish via Tracking</button>`;
            }

            const st = (order.status || '').toString().toLowerCase().replace(/ /g, '-');
            const pct = progressFor(order.status);
            const service = order.service_type || '';
            const items = order.items || '';
            const customer = order.customer_name || '';

            return `
                        <div class="processing-card-modern">
                            <div class="card-top">
                                <div class="order-chip">
                                    <i class="fas fa-soap" aria-hidden="true"></i>
                                    <span>Order #${order.order_id}${service ? ` (${service})` : ''}</span>
                                </div>
                                <span class="status-pill status-${st}">${order.status}</span>
                            </div>
                            <div class="meta">
                                ${customer ? `<div class="customer"><i class="fas fa-user" aria-hidden="true"></i> ${customer}</div>` : ``}
                                ${items ? `<div class="items"><i class="fas fa-list" aria-hidden="true"></i> ${items}</div>` : ``}
                            </div>
                            <div class="progress-wrap" aria-label="Processing progress">
                                <div class="progress-bar"><span class="progress-fill" style="width:${pct}%"></span></div>
                                <span class="progress-label">${pct}%</span>
                            </div>
                            <div class="actions">
                                ${actionButton}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    async function handleProcessingUpdate(e) {
        if (!e.target.matches('.update-processing-btn')) return;
        const orderId = parseInt(e.target.dataset.orderId);
        const nextStatus = e.target.dataset.nextStatus;
        await fetch(`http://localhost:8080/api/staff/orders/${orderId}/status?status=${encodeURIComponent(nextStatus)}`, {
            method: "PUT"
        });
        await initializePage();
    }

    // --------------- Order Tracking search result ---------------
    function renderSearchResult(order, searchedId) {
        const resultContainer = document.getElementById("orderSearchResult");
        if (!resultContainer) return;

        if (!order) {
            resultContainer.innerHTML = `<p>No order found with ID #${searchedId}.</p>`;
            return;
        }

        const currentStatus = order.status;
        let actionButton = "";
        const idx = statusCycle.indexOf(currentStatus);

        if (idx !== -1 && idx < statusCycle.length - 1) {
            const nextStatus = statusCycle[idx + 1];
            if (currentStatus === "Ready for Delivery") {
                actionButton = `<p class="text-muted"><em>Manage in Dispatch Queue.</em></p>`;
            } else {
                actionButton = `<button 
                  class="btn-primary btn-sm update-milestone-btn" 
                  data-order-id="${order.order_id}" 
                  data-next-status="${nextStatus}">
                  Move to ${nextStatus}
                </button>`;
            }
        } else if (currentStatus === "Delivered") {
            actionButton = `<button class="btn btn-sm" disabled>Completed</button>`;
        } else {
            actionButton = `<p class="text-muted"><em>No milestone actions available.</em></p>`;
        }

        const statusClass = currentStatus.toLowerCase().replace(/ /g, '-');

        resultContainer.innerHTML = `
            <h4>Order Details for #${order.order_id}</h4>
            <p><strong>Customer:</strong> ${order.customer_name} (${order.customer_address})</p>
            <p><strong>Status:</strong> 
               <span class="status-badge status-${statusClass}">${currentStatus}</span>
            </p>
            ${order.delivery_staff_id ? `<p><strong>Delivery Staff:</strong> Staff #${order.delivery_staff_id}</p>` : ""}
            <div class="order-actions">${actionButton}</div>
        `;
    }

    async function handleMilestoneUpdate(e) {
        if (!e.target.matches('.update-milestone-btn')) return;
        const orderId = parseInt(e.target.dataset.orderId);
        const newStatus = e.target.dataset.nextStatus;
        await fetch(`http://localhost:8080/api/staff/orders/${orderId}/status?status=${encodeURIComponent(newStatus)}`, {
            method: "PUT"
        });
        const res = await fetch(`http://localhost:8080/api/staff/orders/${orderId}`);
        const updatedOrder = await res.json();
        renderSearchResult(updatedOrder, orderId);
        initializePage();
    }

    // --------------- Work History ---------------
    function loadWorkHistoryData(allOrders) {
        const myCompletedOrders = allOrders.filter(o => o.staff_id === currentStaffId && o.status === 'Delivered');
        renderWorkHistoryOrders(myCompletedOrders);
    }

    function renderWorkHistoryOrders(orders) {
        const container = document.getElementById("work-history-container");
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = `<p class="text-muted">You have no completed orders in your history.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="history-grid">
                ${orders.map(order => {
            const total = Number(order.total || 0).toFixed(2);
            const dateText = order.order_date ? new Date(order.order_date).toLocaleDateString() : '';
            const customer = order.customer_name || '';
            return `
                        <div class="history-card-modern">
                            <div class="card-top">
                                <div class="order-chip"><i class="fas fa-receipt" aria-hidden="true"></i> <span>Order #${order.order_id}</span></div>
                                <span class="status-pill status-delivered">Delivered</span>
                            </div>
                            <div class="meta">
                                ${customer ? `<div class="customer"><i class="fas fa-user" aria-hidden="true"></i> ${customer}</div>` : ``}
                                ${dateText ? `<div class="date"><i class="fas fa-calendar" aria-hidden="true"></i> ${dateText}</div>` : ``}
                            </div>
                            <div class="totals">
                                <span class="label">Total</span>
                                <span class="amount">$${total}</span>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    // --------------- Unassigned (Claim) ---------------
    async function handleClaimOrder(e) {
        if (!e.target.matches('.claim-order-btn')) return;
        const orderId = parseInt(e.target.dataset.orderId);
        await fetch(`http://localhost:8080/api/staff/orders/${orderId}/claim?staffId=${currentStaffId}`, {
            method: "PUT"
        });
        initializePage();
    }

    function renderUnassignedOrders(orders) {
        const container = document.getElementById("unassigned-orders-container");
        if (!container) return;
        container.innerHTML = orders.length === 0
            ? "<p>No available orders to claim.</p>"
            : orders.map(order => `
                <div class="unassigned-order-card">
                    <div class="order-info"><span>Order #${order.order_id} - ${order.customer_name}</span></div>
                    <button class="btn btn-success btn-sm claim-order-btn" data-order-id="${order.order_id}">
                        <i class="fas fa-plus"></i> Claim Order
                    </button>
                </div>
            `).join('');
    }

    // --------------- Quick Stats ---------------
    function updateQuickStats(allOrders) {
        const processingCount = allOrders.filter(o => o.staff_id === currentStaffId && ['Washing','Drying','Ironing'].includes(o.status)).length;
        const claimableStatuses = new Set(['Order Placed', 'Processing']);
        const availableCount = allOrders.filter(o => o.staff_id == null && claimableStatuses.has(o.status)).length;
        const dispatchCount = allOrders.filter(o => (o.status || '').toLowerCase() === 'ready for delivery' && o.staff_id == null).length;

        const processingEl = document.getElementById('processing-count');
        const availableEl = document.getElementById('available-count');
        const dispatchEl = document.getElementById('dispatch-count');

        if (processingEl) processingEl.textContent = processingCount;
        if (processingEl) processingEl.textContent = processingCount;
        if (availableEl) availableEl.textContent = availableCount;
        if (dispatchEl) dispatchEl.textContent = dispatchCount;
    }
});

