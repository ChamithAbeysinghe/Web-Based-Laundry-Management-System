/**
 * LaundryPro Notification System
 * Handles fetching, displaying, and managing notifications for staff members
 */

// Store the staff ID for the currently logged in staff member
let currentStaffId = null;
let lastUnreadCount = 0;
let dropdownEl = null;
let overlayEl = null;
let __notifInit = false;

// Initialize the notification system
function initNotifications() {
    if (__notifInit) return; // guard against double init
    __notifInit = true;

    // Get the staff ID from the window object or localStorage
    currentStaffId = getCurrentStaffId();

    if (!currentStaffId) {
        console.error('No staff ID found, notifications will not work');
        return;
    }

    // Ensure dropdown + overlay exist and wire handlers
    createDropdownIfNeeded();
    setupNotificationHandlers();

    // Initial fetch and schedule refresh
    fetchNotifications();
    setInterval(fetchNotifications, 60000);
}

// Fetch notifications from the server
function fetchNotifications() {
    if (!currentStaffId) return;

    // Get unread count for badges
    fetch(`/api/notifications/staff/${currentStaffId}/count`)
        .then(response => response.json())
        .then(data => {
            updateNotificationBadges(Number(data.count || 0));
        })
        .catch(error => console.error('Error fetching notification count:', error));

    // Get all notifications for the dropdown
    fetch(`/api/notifications/staff/${currentStaffId}`)
        .then(response => response.json())
        .then(notifications => {
            renderNotifications(Array.isArray(notifications) ? notifications : []);
        })
        .catch(error => console.error('Error fetching notifications:', error));
}

// Create dropdown container if missing (glassmorphic w/ header + scroll area)
function createDropdownIfNeeded() {
    overlayEl = document.getElementById('notification-overlay');
    if (!overlayEl) {
        overlayEl = document.createElement('div');
        overlayEl.id = 'notification-overlay';
        document.body.appendChild(overlayEl);
    }

    dropdownEl = document.getElementById('notification-dropdown');
    if (!dropdownEl) {
        dropdownEl = document.createElement('div');
        dropdownEl.id = 'notification-dropdown';
        dropdownEl.className = 'notification-dropdown';
        dropdownEl.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <div class="actions">
                    <button class="btn-inline" id="mark-all-read">Mark all read</button>
                </div>
            </div>
            <div class="notification-scroll" id="notification-scroll"></div>
        `;
        document.body.appendChild(dropdownEl);
    }

    const markAllBtn = document.getElementById('mark-all-read');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', markAllNotificationsAsRead);
    }
}

// Render notifications into the dropdown scroll area
function renderNotifications(notifications) {
    const container = document.getElementById('notification-scroll');
    if (!container) return;

    if (!notifications.length) {
        container.innerHTML = `<div class="empty-notifications" style="padding:18px;text-align:center;color:#6b7280;">No notifications</div>`;
        return;
    }

    container.innerHTML = notifications.map(n => {
        const stateClass = n.isRead ? 'read' : 'unread';
        const { icon, iconBg, iconColor } = getIconForType(n.type);
        const timeTxt = safeFormatTime(n.createdAt);
        const newBadge = n.isRead ? '' : '<span class="badge-new">New</span>';
        return `
            <div class="notification-item ${stateClass}" data-id="${n.id}" data-type="${n.type}" data-entity-id="${n.entityId}">
                <div class="notification-icon" style="background:${iconBg};color:${iconColor}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-message">${escapeHtml(n.message || '')}</div>
                    <div class="notification-meta">
                        ${newBadge}
                        ${n.entityType ? `<span>${n.entityType}</span><span class="meta-dot"></span>` : ''}
                        <span>${timeTxt}</span>
                    </div>
                </div>
                <div class="notification-actions">
                    ${n.isRead ? '' : '<button class="icon-btn mark-read-btn" title="Mark as read"><i class="fas fa-check"></i></button>'}
                    <button class="icon-btn delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');

    // Wire events
    addNotificationActionListeners();
}

// Update notification badges with bounce when increasing
function updateNotificationBadges(count) {
    const badges = document.querySelectorAll('.notification-badge');
    badges.forEach(badge => {
        badge.textContent = String(count);
        badge.style.display = count > 0 ? 'inline-block' : 'none';
        if (count > lastUnreadCount) {
            badge.classList.add('show-bounce');
            setTimeout(() => badge.classList.remove('show-bounce'), 500);
        }
    });
    lastUnreadCount = count;
}

// Add event listeners for item actions and open/close
function addNotificationActionListeners() {
    document.querySelectorAll('.notification-item .mark-read-btn')
        .forEach(btn => btn.addEventListener('click', onMarkReadClick));
    document.querySelectorAll('.notification-item .delete-btn')
        .forEach(btn => btn.addEventListener('click', onDeleteClick));

    // Item click to navigate
    document.querySelectorAll('.notification-item')
        .forEach(item => item.addEventListener('click', onItemClick));
}

function onItemClick(e) {
    // avoid triggering when clicking action buttons
    if (e.target.closest('.icon-btn')) return;
    const item = e.currentTarget;
    const notificationId = item.dataset.id;
    const type = item.dataset.type;
    const entityId = item.dataset.entityId;

    if (item.classList.contains('unread')) {
        markNotificationAsRead(notificationId, item);
    }
    if (type === 'NEW_ORDER') {
        window.location.href = `/staff-dashboard.html?view=order-details&id=${entityId}`;
    }
}

function onMarkReadClick(e) {
    e.stopPropagation();
    const item = e.currentTarget.closest('.notification-item');
    if (!item) return;
    markNotificationAsRead(item.dataset.id, item);
}

function onDeleteClick(e) {
    e.stopPropagation();
    const item = e.currentTarget.closest('.notification-item');
    if (!item) return;
    // collapse animation then remove
    item.classList.add('collapsing');
    setTimeout(() => {
        deleteNotification(item.dataset.id, item);
    }, 200);
}

// Mark a notification as read
function markNotificationAsRead(notificationId, notificationElement) {
    fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' })
        .then(res => {
            if (!res.ok) throw new Error('Failed to mark as read');
            notificationElement.classList.remove('unread');
            notificationElement.classList.add('read');
            const btn = notificationElement.querySelector('.mark-read-btn');
            if (btn) btn.remove();
            fetchNotifications();
        })
        .catch(err => console.error(err));
}

// Delete a notification
function deleteNotification(notificationId, notificationElement) {
    fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) throw new Error('Failed to delete');
            notificationElement.remove();
            fetchNotifications();
        })
        .catch(err => console.error(err));
}

// Get the current staff ID from window object, localStorage, or session
function getCurrentStaffId() {
    if (window.currentStaffId) return window.currentStaffId;
    try {
        const userStr = localStorage.getItem('user') || localStorage.getItem('authUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.id || user.staffId || null;
        }
    } catch (e) {
        console.error('Error parsing user from localStorage:', e);
    }
    return 1; // Fallback
}

// Overlay + toggle wiring and anchored positioning
function setupNotificationHandlers() {
    const btn = document.getElementById('notificationBtn');
    const btnMobile = document.getElementById('notificationBtnMobile');
    const navItem = document.getElementById('notificationNavItem');
    overlayEl = document.getElementById('notification-overlay');

    const toggleFrom = (anchor) => {
        if (!dropdownEl) return;
        const willShow = !dropdownEl.classList.contains('show');
        if (willShow) {
            positionDropdown(anchor);
            dropdownEl.classList.add('show');
            if (overlayEl) overlayEl.classList.add('show');
        } else {
            dropdownEl.classList.remove('show');
            if (overlayEl) overlayEl.classList.remove('show');
        }
    };

    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFrom(btn); });
    if (btnMobile) btnMobile.addEventListener('click', (e) => { e.stopPropagation(); toggleFrom(btnMobile); });
    if (navItem) navItem.addEventListener('click', (e) => { e.preventDefault(); toggleFrom(navItem); });

    // Close when clicking overlay or pressing ESC
    if (overlayEl) overlayEl.addEventListener('click', () => {
        dropdownEl?.classList.remove('show');
        overlayEl.classList.remove('show');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdownEl?.classList.remove('show');
            overlayEl?.classList.remove('show');
        }
    });
}

function positionDropdown(anchorEl) {
    if (!dropdownEl || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const width = 380; // matches CSS
    const padding = 8;
    let left = Math.min(window.innerWidth - width - 10, Math.max(10, rect.right - width));
    let top = rect.bottom + padding;

    // Use fixed positioning for accurate viewport anchoring
    dropdownEl.style.position = 'fixed';
    dropdownEl.style.left = `${left}px`;
    dropdownEl.style.right = 'auto';
    dropdownEl.style.top = `${top}px`;
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    const unread = document.querySelectorAll('.notification-item.unread');
    unread.forEach(item => {
        const id = item.dataset.id;
        markNotificationAsRead(id, item);
    });
}

// Utilities
function formatNotificationTime(timestamp) {
    // kept for compatibility
    return relativeTime(timestamp);
}

function relativeTime(timestamp) {
    try {
        const date = parseDateFlexible(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const min = Math.floor(diffMs / 60000);
        if (min < 1) return 'Just now';
        if (min < 60) return `${min} ${min === 1 ? 'minute' : 'minutes'} ago`;
        const h = Math.floor(min / 60);
        if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
        const d = Math.floor(h / 24);
        if (d < 7) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
        return date.toLocaleDateString();
    } catch { return ''; }
}

function parseDateFlexible(ts) {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'string') {
        // Handle "yyyy-MM-dd HH:mm:ss" from backend
        if (ts.length >= 19 && ts.charAt(10) === ' ') {
            ts = ts.replace(' ', 'T');
        }
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
}

function safeFormatTime(ts) {
    return relativeTime(ts);
}

function getIconForType(type) {
    const t = (type || '').toUpperCase();
    if (t === 'NEW_ORDER' || t === 'ORDER') {
        return { icon: 'fas fa-receipt', iconBg: '#e0f2fe', iconColor: '#0369a1' };
    }
    return { icon: 'fas fa-bell', iconBg: '#e0e7ff', iconColor: '#1d4ed8' };
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize when the page loads (kept for safety; staff-dashboard also calls init)
document.addEventListener('DOMContentLoaded', () => {
    const hasAuth = !!(localStorage.getItem('user') || localStorage.getItem('authUser'));
    if (hasAuth) initNotifications();
});
