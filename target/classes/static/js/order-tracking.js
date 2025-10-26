// js/order-tracking.js
document.addEventListener("DOMContentLoaded", function() {
    const API_BASE = 'http://localhost:8080/api';

    // Normalize various status strings to canonical step keys used by the UI
    const normalizeStatus = (raw) => {
        if (!raw && raw !== 0) return '';
        const s0 = String(raw).toLowerCase().trim();
        const s = s0.replace(/[\-_]+/g, ' ').replace(/\s+/g, ' ').trim();

        const direct = {
            'placed': 'placed',
            'order placed': 'placed',
            'pickup scheduled': 'pickup-scheduled',
            'pickup completed': 'pickup-completed',
            // legacy -> new
            'processing': 'washing',
            'in progress': 'washing',
            'quality check': 'ironing',
            'quality assurance': 'ironing',
            'qa': 'ironing',
            // new explicit
            'washing': 'washing',
            'drying': 'drying',
            'ironing': 'ironing',
            'delivery': 'delivery',
            'out for delivery': 'delivery',
            'ready for delivery': 'delivery',
            'on the way': 'delivery',
            'delivered': 'delivered',
            'completed': 'completed',
            'upcoming': 'upcoming'
        };
        if (direct[s]) return direct[s];

        if (s.includes('pickup') && s.includes('schedule')) return 'pickup-scheduled';
        if (s.includes('picked') || (s.includes('pickup') && (s.includes('done') || s.includes('complete')))) return 'pickup-completed';
        if (s.includes('wash') || s.includes('clean') || s.includes('laundry')) return 'washing';
        if (s.includes('dry')) return 'drying';
        if (s.includes('iron') || s.includes('press')) return 'ironing';
        if (s.includes('quality') || s === 'qa') return 'ironing';
        if (s.includes('deliver')) {
            if (s.includes('out') || s.includes('ready') || s.includes('way')) return 'delivery';
            return 'delivered';
        }
        if (s.includes('progress')) return 'washing';
        if (s.includes('complete')) return 'completed';

        return s.replace(/\s+/g, '-');
    };

    const trackOrderBtn = document.getElementById('trackOrderBtn');
    const orderNumberInput = document.getElementById('orderNumber');
    const loading = document.getElementById('loading');
    const orderDetails = document.getElementById('orderDetails');
    const trackingTimeline = document.getElementById('trackingTimeline');
    const estimatedTimeline = document.getElementById('estimatedTimeline');
    const orderItems = document.getElementById('orderItems');
    const itemsGrid = document.getElementById('itemsGrid');
    const deleteOrderBtn = document.getElementById('deleteOrderBtn');

    // --- Modal Elements ---
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    const successOkButton = document.getElementById('successOkButton');
    const errorTryAgainButton = document.getElementById('errorTryAgainButton');
    const successModalTitle = document.getElementById('successModalTitle');
    const successModalMessage = document.getElementById('successModalMessage');
    const errorModalTitle = document.getElementById('errorModalTitle');
    const errorModalMessage = document.getElementById('errorModalMessage');

    let progressInterval = null;

    // --- Modal Logic ---
    function showSuccessModal(title, message, onConfirm) {
        if (!successModal) return;
        successModalTitle.textContent = title;
        successModalMessage.textContent = message;
        successModal.style.display = 'grid';
        setTimeout(() => successModal.classList.add('visible'), 10);

        successOkButton.onclick = () => {
            successModal.classList.remove('visible');
            setTimeout(() => {
                successModal.style.display = 'none';
                if (onConfirm) onConfirm();
            }, 300);
        };
    }

    function showErrorModal(title, message, onConfirm) {
        if (!errorModal || !errorModalMessage) {
            alert(title + "\n" + message); // Fallback
            return;
        }
        errorModalTitle.textContent = title;
        errorModalMessage.textContent = message || "An unknown error occurred.";
        errorModal.style.display = 'grid';
        setTimeout(() => {
            errorModal.classList.add('visible');
            errorModal.querySelector('.modal-box').classList.add('shake');
        }, 10);

        errorTryAgainButton.onclick = () => {
            errorModal.classList.remove('visible');
            setTimeout(() => {
                errorModal.style.display = 'none';
                errorModal.querySelector('.modal-box').classList.remove('shake');
                if (onConfirm) onConfirm();
            }, 300);
        };
    }

    // Animate initial elements
    const initialRevealItems = document.querySelectorAll('.tracking-header, .search-section, .support-section');
    initialRevealItems.forEach((el, index) => {
        setTimeout(() => {
            el.classList.add('visible');
        }, 150 * (index + 1));
    });

    // Require logged-in customer (role-specific session)
    let user = (window.Auth && Auth.getUser) ? Auth.getUser('customer') : null;
    if (!user) {
        try { user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('authUser')); } catch {}
    }
    if (!user || (user.role || '').toString().toLowerCase() !== 'customer') {
        showErrorModal('Access Denied', 'Please log in as a customer to track orders.', () => window.location.href = 'login.html?role=customer&redirect=' + encodeURIComponent(location.href));
        return;
    }
    const customerId = user.id || user.customerId;

    // Delete endpoint preference (pick the one your backend supports)
    // Options:
    // 'delete-id-query' -> DELETE /api/orders/{id}?customerId={cid}
    // 'post-delete-body' -> POST /api/orders/delete  {orderId, customerId}
    // 'post-id-delete-path' -> POST /api/orders/{id}/delete  {customerId}
    let DELETE_STRATEGY = 'post-delete-body';

    const parseErrorText = async (resp) => {
        const text = await resp.text().catch(() => '');
        try {
            const json = JSON.parse(text);
            return json.message || json.error || text || `HTTP ${resp.status}`;
        } catch {
            return text || `HTTP ${resp.status}`;
        }
    };

    // ---- Order date helpers ----
    const toDate = (val) => {
        if (!val && val !== 0) return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
        if (typeof val === 'number') {
            const ms = val < 1e12 ? val * 1000 : val;
            const d = new Date(ms);
            return isNaN(d.getTime()) ? null : d;
        }
        if (typeof val === 'string') {
            const s = val.trim();
            if (!s) return null;
            if (/^\d{10,13}$/.test(s)) {
                const n = Number(s);
                const ms = n < 1e12 ? n * 1000 : n;
                const d = new Date(ms);
                return isNaN(d.getTime()) ? null : d;
            }
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    };

    const formatOrderDate = (dateObj) => {
        if (!dateObj) return 'Unknown';
        try {
            const opts = { year: 'numeric', month: 'short', day: '2-digit' };
            return dateObj.toLocaleDateString(undefined, opts);
        } catch {
            return 'Unknown';
        }
    };

    const getDisplayOrderDate = (order) => {
        const candidates = [
            order?.orderDate,
            order?.date,
            order?.createdAt,
            order?.created_at,
            order?.order_date,
            order?.placedAt,
            order?.placed_at,
            order?.createdDate,
            order?.timestamp
        ];
        for (const v of candidates) {
            const d = toDate(v);
            if (d) return formatOrderDate(d);
        }
        return 'Unknown';
    };

    const resetSections = () => {
        const sections = [orderDetails, trackingTimeline, estimatedTimeline, orderItems];
        sections.forEach(el => {
            el.style.display = 'none';
            el.classList.remove('visible');
        });
    };
    const resetProgress = () => {
        const progressBar = document.getElementById('progressBar');
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        if (progressBar) progressBar.style.width = '0%';
    };
    const startLoading = () => {
        loading.style.display = 'block';
        resetSections();
        resetProgress();
        if (deleteOrderBtn) {
            deleteOrderBtn.disabled = true;
            deleteOrderBtn.removeAttribute('data-order-id');
        }
    };
    const stopLoading = () => {
        loading.style.display = 'none';
    };

    const setStatusBadge = (statusRaw) => {
        const statusBadge = document.getElementById('statusBadge');
        const sNorm = normalizeStatus(statusRaw);

        const completedSet = new Set(['delivered', 'completed']);
        const inProgressSet = new Set([
            'placed', 'pickup-scheduled', 'pickup-completed', 'washing', 'drying', 'ironing', 'delivery', 'in-progress'
        ]);

        const phase = completedSet.has(sNorm) ? 'completed'
            : inProgressSet.has(sNorm) ? 'in-progress'
                : 'upcoming';

        const displayText = statusRaw ? (String(statusRaw).trim() || 'Unknown') : 'Unknown';
        statusBadge.textContent = displayText.replace(/[\-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        statusBadge.className = `status-badge ${phase}`;
    };

    const enableDeleteForStatus = (statusRaw) => {
        if (!deleteOrderBtn) return;
        const s = normalizeStatus(statusRaw);
        // Allow delete only before completion/delivery (tweak as needed)
        const canDelete = s === 'upcoming' || s === 'in-progress' || s === 'placed' || s === 'pickup-scheduled';
        deleteOrderBtn.disabled = !canDelete;
    };

    // Track on Enter
    orderNumberInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            trackOrderBtn.click();
        }
    });

    // Main track handler
    trackOrderBtn.addEventListener('click', function() {
        const orderNumber = orderNumberInput.value.trim().replace('#ORD-', '');
        if (!orderNumber || isNaN(orderNumber)) {
            showErrorModal('Invalid Input', 'Please enter a valid order number (numeric ID)');
            return;
        }

        startLoading();

        fetch(`${API_BASE}/orders/${orderNumber}?customerId=${customerId}`)
            .then(async response => {
                if (!response.ok) {
                    const errorMsg = await parseErrorText(response);
                    throw new Error(errorMsg || 'Order not found or access denied');
                }
                return response.json();
            })
            .then(order => {
                stopLoading();

                // Access control: ensure this order belongs to the logged-in customer
                const idCandidatesRaw = [
                    order?.customerId,
                    order?.customerID,
                    order?.customer_id,
                    order?.userId,
                    order?.userID,
                    order?.ownerId,
                    order?.customer?.id
                ].filter(v => v !== undefined && v !== null);
                const toNumber = v => {
                    if (typeof v === 'string' && v.trim() !== '') return Number(v);
                    if (typeof v === 'number') return v;
                    return NaN;
                };
                const isOwned = idCandidatesRaw.some(v => Number(toNumber(v)) === Number(customerId));

                if (!isOwned) {
                    showErrorModal('Access Denied', 'This order does not belong to your account.');
                    resetSections();
                    itemsGrid.innerHTML = '';
                    if (deleteOrderBtn) {
                        deleteOrderBtn.disabled = true;
                        deleteOrderBtn.removeAttribute('data-order-id');
                    }
                    return;
                }

                // Show and animate sections with a stagger
                const sectionsToShow = [orderDetails, trackingTimeline, estimatedTimeline, orderItems];
                sectionsToShow.forEach((el, index) => {
                    el.style.display = el.classList.contains('card') ? 'block' : 'flex';
                    setTimeout(() => {
                        el.classList.add('visible');
                    }, 100 * index);
                });

                // Order details
                const displayOrderId = order?.id ?? order?.orderId ?? order?.orderID ?? order?.number ?? order?.orderNo ?? order?.order_no ?? orderNumber;
                const displayOrderDate = getDisplayOrderDate(order);
                document.getElementById('orderId').textContent = `#ORD-${displayOrderId}`;
                document.getElementById('serviceType').textContent = order.serviceType || 'Unknown';
                document.getElementById('weight').textContent = 'N/A';
                document.getElementById('total').textContent = `$${Number(order.total || 0).toFixed(2)}`;
                document.getElementById('orderDate').textContent = displayOrderDate;

                setStatusBadge(order.status);

                // Timeline
                updateTimeline(order.status, order, displayOrderId);

                // Estimated completion
                updateEstimatedTimeline(order.status);

                // Items
                itemsGrid.innerHTML = '';
                let items = [];
                if (Array.isArray(order.items)) {
                    items = order.items;
                } else if (typeof order.items === 'string') {
                    try {
                        items = JSON.parse(order.items) || [];
                    } catch {
                        items = [{ name: 'Items', quantity: order.items || 'N/A' }];
                    }
                }
                items.forEach(item => {
                    const qtyText = typeof item.quantity !== 'undefined' ? `${item.quantity} item${item.quantity === 1 ? '' : 's'}` : '';
                    const card = document.createElement('div');
                    card.className = 'item-card';
                    card.innerHTML = `
                        <div class="item-icon"><i class="fas fa-tshirt"></i></div>
                        <div class="item-info">
                        <h3>${item.name || 'Item'}</h3>
                        ${qtyText ? `<p>${qtyText}</p>` : ''}
                        </div>
                    `;
                    itemsGrid.appendChild(card);
                });

                // Delete button
                if (deleteOrderBtn) {
                    deleteOrderBtn.dataset.orderId = order.id;
                    enableDeleteForStatus(order.status);
                }
            })
            .catch(error => {
                stopLoading();
                showErrorModal('Error', `Error: ${error.message}`);
            });
    });

    // Delete flow with limited, predictable endpoints
    if (deleteOrderBtn) {
        deleteOrderBtn.addEventListener('click', async function() {
            if (deleteOrderBtn.disabled) return;

            const orderId = deleteOrderBtn.dataset.orderId;
            if (!orderId) return;

            const ok = confirm('Are you sure you want to delete this order? This cannot be undone.');
            if (!ok) return;

            const prevHTML = deleteOrderBtn.innerHTML;
            deleteOrderBtn.disabled = true;
            deleteOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';

            try {
                const result = await deleteOrder(orderId, customerId);
                if (!result.ok) {
                    showErrorModal('Deletion Failed', `Error deleting order: ${result.message}`);
                    deleteOrderBtn.disabled = false;
                    deleteOrderBtn.innerHTML = prevHTML;
                    return;
                }

                showSuccessModal('Success', 'Order deleted successfully.', () => {
                    // Clear UI after delete
                    resetSections();
                    itemsGrid.innerHTML = '';
                    orderNumberInput.value = '';
                    deleteOrderBtn.removeAttribute('data-order-id');
                });

            } catch (err) {
                showErrorModal('Deletion Failed', `Error deleting order: ${err.message}`);
                deleteOrderBtn.disabled = false;
                deleteOrderBtn.innerHTML = prevHTML;
                return;
            }

            // Restore button text after success
            deleteOrderBtn.innerHTML = prevHTML;
        });
    }

    // Performs deletion using your preferred server contract
    async function deleteOrder(orderId, cid) {
        // Build request based on strategy
        const build = (strategy) => {
            switch (strategy) {
                case 'delete-id-query':
                    return { method: 'DELETE', url: `${API_BASE}/orders/${orderId}?customerId=${cid}` };

                case 'post-delete-body':
                    return {
                        method: 'POST',
                        url: `${API_BASE}/orders/delete`,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: Number(orderId), customerId: Number(cid) })
                    };

                case 'post-id-delete-path':
                    return {
                        method: 'POST',
                        url: `${API_BASE}/orders/${orderId}/delete`,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ customerId: Number(cid) })
                    };

                default:
                    return null;
            }
        };

        // Try the selected strategy first, then fall back to the other two
        const order = ['delete-id-query', 'post-delete-body', 'post-id-delete-path'];
        // Put preferred strategy at the front
        const attempts = [DELETE_STRATEGY, ...order.filter(s => s !== DELETE_STRATEGY)];

        let lastMsg = 'No supported delete endpoint found. Set DELETE_STRATEGY to match your backend.';
        for (const s of attempts) {
            const opts = build(s);
            if (!opts) continue;
            try {
                const resp = await fetch(opts.url, { method: opts.method, headers: opts.headers, body: opts.body });
                if (resp.ok) return { ok: true };
                const msg = await parseErrorText(resp);
                // 404/405 => try next; other errors return immediately
                if (resp.status === 404 || resp.status === 405) {
                    console.warn(`[delete] ${s} not supported: ${msg}`);
                    lastMsg = `Endpoint not found/allowed for strategy "${s}": ${msg}`;
                    // continue to next strategy
                } else {
                    return { ok: false, message: msg || `HTTP ${resp.status}` };
                }
            } catch (e) {
                console.warn(`[delete] ${s} failed: ${e.message}`);
                lastMsg = e.message || lastMsg;
                // continue to next strategy
            }
        }
        return { ok: false, message: lastMsg + '\nTry switching DELETE_STRATEGY in js/order-tracking.js.' };
    }

    function updateTimeline(statusRaw, order, displayId) {
        const timelineItems = document.querySelectorAll('.timeline-item');
        const steps = ['placed', 'pickup-scheduled', 'pickup-completed', 'washing', 'drying', 'ironing', 'delivery'];
        const s = normalizeStatus(statusRaw);

        let completedSteps = 0;
        const stepIdx = steps.indexOf(s);
        if (stepIdx >= 0) {
            completedSteps = stepIdx;
        } else {
            switch (s) {
                case 'upcoming':     completedSteps = 0; break;
                case 'in-progress':  completedSteps = 3; break; // default to washing
                case 'completed':    completedSteps = steps.length; break; // fully completed
                case 'delivered':    completedSteps = steps.length; break;
                default:             completedSteps = 0;
            }
        }

        timelineItems.forEach((item, index) => {
            item.className = 'timeline-item';
            if (index < completedSteps) item.classList.add('completed');
            else if (index === completedSteps) item.classList.add('in-progress');
            else item.classList.add('upcoming');
        });

        const placedDetails = document.getElementById('placedDetails');
        const placedTime = document.getElementById('placedTime');
        const idForText = displayId ?? (order?.id ?? order?.orderId ?? order?.orderID ?? order?.number ?? order?.orderNo ?? order?.order_no ?? 'N/A');
        if (placedDetails) placedDetails.textContent = `Order #ORD-${idForText} was successfully placed`;
        const dateText = getDisplayOrderDate(order);
        if (placedTime) placedTime.textContent = dateText !== 'Unknown' ? `${dateText} • Time TBD` : 'Unknown';
    }

    function updateEstimatedTimeline(statusRaw) {
        const progressBar = document.getElementById('progressBar');
        const currentStatusElem = document.getElementById('currentStatus');
        const estimatedDeliveryElem = document.getElementById('estimatedDelivery');

        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        const s = normalizeStatus(statusRaw);
        let progressPercent; // initialized by switch
        let estimatedText;   // initialized by switch

        switch (s) {
            case 'upcoming':
                progressPercent = 0; estimatedText = 'Awaiting placement'; break;
            case 'placed':
                progressPercent = 10; estimatedText = 'Pickup soon'; break;
            case 'pickup-scheduled':
                progressPercent = 20; estimatedText = 'Pickup scheduled'; break;
            case 'pickup-completed':
                progressPercent = 30; estimatedText = 'Picked up'; break;
            case 'washing':
                progressPercent = 50; estimatedText = 'Washing'; break;
            case 'drying':
                progressPercent = 70; estimatedText = 'Drying'; break;
            case 'ironing':
                progressPercent = 85; estimatedText = 'Ironing'; break;
            case 'delivery':
                progressPercent = 95; estimatedText = 'Out for delivery'; break;
            case 'completed':
            case 'delivered':
                progressPercent = 100; estimatedText = 'Delivered'; break;
            default:
                progressPercent = 0; estimatedText = 'Unknown';
        }

        const displayRaw = statusRaw ? (String(statusRaw).trim() || 'Unknown') : 'Unknown';
        currentStatusElem.textContent = `Current: ${displayRaw.replace(/[\-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
        estimatedDeliveryElem.textContent = `Estimated Delivery: ${estimatedText}`;

        if (progressBar) {
            const prev = parseFloat(progressBar.style.width || '0');
            if (!isFinite(prev) || progressPercent < prev) {
                progressBar.style.transition = 'none';
                progressBar.style.width = `${progressPercent}%`;
                progressBar.offsetHeight;
                progressBar.style.transition = '';
            } else {
                progressBar.style.width = `${progressPercent}%`;
            }
        }
    }
});


// ==== Order Tracking for Staff ====
// Only enable if staff UI is present and a logged-in staff user is detected.
(function(){
    const API_BASE = 'http://localhost:8080/api';
    const searchBtn = document.getElementById("searchOrderBtn");
    const staffInput = document.getElementById("staffOrderInput");
    const container = document.getElementById("staffTrackingResults");

    // If this page doesn't include staff UI, do nothing.
    if (!searchBtn || !staffInput || !container) return;

    // Verify logged-in staff/admin user via role-specific session.
    let staffUser = (window.Auth && Auth.getAnyUser) ? Auth.getAnyUser(['staff','admin']) : null;
    if (!staffUser) {
        try { staffUser = JSON.parse(localStorage.getItem('auth_staff') || localStorage.getItem('auth_admin') || 'null'); } catch {}
    }
    if (!staffUser) return;

    searchBtn.addEventListener("click", function () {
        const orderId = staffInput.value.trim();
        if (!orderId || isNaN(orderId)) {
            // Using the global showErrorModal if available, otherwise alert
            if (typeof showErrorModal === 'function') {
                showErrorModal("Invalid Input", "Please enter a valid numeric order ID.");
            } else {
                alert("Please enter a valid numeric order ID.");
            }
            return;
        }
        fetchOrderForStaff(orderId);
    });

    async function fetchOrderForStaff(orderId) {
        container.innerHTML = `<p>🔄 Searching for order...</p>`;

        try {
            const res = await fetch(`${API_BASE}/orders/${orderId}?customerId=0`); // bypass customerId check for staff tool
            if (!res.ok) {
                container.innerHTML = `<p class="error-message">❌ Order not found or access denied</p>`;
                return;
            }

            const order = await res.json();

            const statusBadge = getStatusBadgeUI(order.status);
            const date = order.orderDate || "N/A";
            const service = order.serviceType || "Unknown";
            const total = `$${Number(order.total || 0).toFixed(2)}`;
            const customer = order.customerName || "N/A";
            const address = order.customerAddress || "N/A";

            container.innerHTML = `
                <div class="card tracking-card">
                    <h3>Order #${order.id} - ${statusBadge}</h3>
                    <p><strong>Customer:</strong> ${customer}</p>
                    <p><strong>Address:</strong> ${address}</p>
                    <p><strong>Service:</strong> ${service}</p>
                    <p><strong>Total:</strong> ${total}</p>
                    <p><strong>Date:</strong> ${date}</p>

                    <button class="btn btn-outline" onclick="viewStaffTimeline(${order.id})">
                        <i class="fas fa-eye"></i> View Timeline
                    </button>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<p class="error-message">❌ Unable to fetch order: ${err.message}</p>`;
        }
    }

    function getStatusBadgeUI(status) {
        const map = {
            'placed': '🌀 Placed',
            'pickup-scheduled': '📦 Pickup Scheduled',
            'pickup-completed': '✅ Pickup Done',
            'processing': '🧼 Processing',
            'quality-check': '✔️ QA Check',
            'delivery': '🚚 Out for Delivery',
            'delivered': '✅ Delivered',
            'completed': '✅ Completed',
            'in-progress': '🔄 In Progress',
            'upcoming': '⬆️ Upcoming'
        };
        return map[status?.toLowerCase()] || status;
    }
})();
