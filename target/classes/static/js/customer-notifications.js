// Customer Notifications - ES5-compatible implementation mirroring staff notifications UI/behavior
// Uses customer notification endpoints and avoids template literals/optional chaining to satisfy older parsers.

var custCurrentId = null;
var custLastUnread = 0;
var custDropdown = null;
var custOverlay = null;
var __custNotifInit = false;

function initCustomerNotifications() {
    if (__custNotifInit) return;
    __custNotifInit = true;

    custCurrentId = getCurrentCustomerId();
    if (!custCurrentId) {
        return; // no customer session available
    }

    createCustDropdownIfNeeded();
    setupCustNotificationHandlers();
    fetchCustomerNotifications();
    setInterval(fetchCustomerNotifications, 60000);
}

function fetchCustomerNotifications() {
    if (!custCurrentId) return;

    fetch('/api/notifications/customer/' + custCurrentId + '/count')
        .then(function(r){ return r.json(); })
        .then(function(d){ updateCustBadges(Number(d.count || 0)); })
        .catch(function(err){ console.error('Error fetching customer notification count:', err); });

    fetch('/api/notifications/customer/' + custCurrentId)
        .then(function(r){ return r.json(); })
        .then(function(list){ renderCustomerNotifications(Array.isArray(list) ? list : []); })
        .catch(function(err){ console.error('Error fetching customer notifications:', err); });
}

function createCustDropdownIfNeeded() {
    custOverlay = document.getElementById('notification-overlay');
    if (!custOverlay) {
        custOverlay = document.createElement('div');
        custOverlay.id = 'notification-overlay';
        document.body.appendChild(custOverlay);
    }

    custDropdown = document.getElementById('notification-dropdown');
    if (!custDropdown) {
        custDropdown = document.createElement('div');
        custDropdown.id = 'notification-dropdown';
        custDropdown.className = 'notification-dropdown';
        custDropdown.innerHTML = (
            '<div class="notification-header">' +
                '<h3>Notifications</h3>' +
                '<div class="actions">' +
                    '<button class="btn-inline" id="cust-mark-all">Mark all read</button>' +
                '</div>' +
            '</div>' +
            '<div class="notification-scroll" id="cust-notification-scroll"></div>'
        );
        document.body.appendChild(custDropdown);
        var markAll = document.getElementById('cust-mark-all');
        if (markAll) markAll.addEventListener('click', markAllCustomerNotificationsAsRead);
    }
}

function renderCustomerNotifications(notifications) {
    var container = document.getElementById('cust-notification-scroll');
    if (!container) return;

    if (!notifications.length) {
        container.innerHTML = '<div class="empty-notifications" style="padding:18px;text-align:center;color:#6b7280;">No notifications</div>';
        return;
    }

    container.innerHTML = notifications.map(function(n){
        var stateClass = n.isRead ? 'read' : 'unread';
        var iconInfo = getIconForType(n.type);
        var timeTxt = safeFormatTime(n.createdAt);
        var newBadge = n.isRead ? '' : '<span class="badge-new">New</span>';
        var entityMeta = n.entityType ? ('<span>' + escapeHtml(n.entityType) + '</span><span class="meta-dot"></span>') : '';
        return (
            '<div class="notification-item ' + stateClass + '" data-id="' + n.id + '" data-type="' + (n.type || '') + '" data-entity-id="' + (n.entityId || '') + '">' +
                '<div class="notification-icon" style="background:' + iconInfo.iconBg + ';color:' + iconInfo.iconColor + '">' +
                    '<i class="' + iconInfo.icon + '"></i>' +
                '</div>' +
                '<div class="notification-content">' +
                    '<div class="notification-message">' + escapeHtml(n.message || '') + '</div>' +
                    '<div class="notification-meta">' +
                        newBadge +
                        entityMeta +
                        '<span>' + timeTxt + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="notification-actions">' +
                    (n.isRead ? '' : '<button class="icon-btn cust-mark-read" title="Mark as read"><i class="fas fa-check"></i></button>') +
                    '<button class="icon-btn cust-del" title="Delete"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>'
        );
    }).join('');

    addCustNotificationActionListeners();
}

function addCustNotificationActionListeners() {
    Array.prototype.forEach.call(document.querySelectorAll('.cust-mark-read'), function(btn){
        btn.addEventListener('click', onCustMarkReadClick);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.cust-del'), function(btn){
        btn.addEventListener('click', onCustDeleteClick);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#cust-notification-scroll .notification-item'), function(item){
        item.addEventListener('click', onCustItemClick);
    });
}

function onCustItemClick(e) {
    if (e.target.closest && e.target.closest('.icon-btn')) return; // ignore action clicks
    var item = e.currentTarget;
    var id = item.getAttribute('data-id');
    var type = item.getAttribute('data-type');
    var entityId = item.getAttribute('data-entity-id');

    if (item.classList.contains('unread')) {
        custMarkRead(id, item);
    }

    if (type === 'ORDER_STATUS' || type === 'ORDER') {
        window.location.href = 'order-tracking.html?orderId=' + encodeURIComponent(entityId || '');
    }
}

function onCustMarkReadClick(e) {
    e.stopPropagation();
    var item = e.currentTarget.closest('.notification-item');
    if (!item) return;
    custMarkRead(item.getAttribute('data-id'), item);
}

function onCustDeleteClick(e) {
    e.stopPropagation();
    var item = e.currentTarget.closest('.notification-item');
    if (!item) return;
    item.classList.add('collapsing');
    setTimeout(function(){ custDelete(item.getAttribute('data-id'), item); }, 200);
}

function custMarkRead(notificationId, element) {
    fetch('/api/notifications/' + notificationId + '/read', { method: 'PUT' })
        .then(function(res){
            if (!res.ok) throw new Error('Failed to mark as read');
            element.classList.remove('unread');
            element.classList.add('read');
            var btn = element.querySelector('.cust-mark-read');
            if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
            fetchCustomerNotifications();
        })
        .catch(function(err){ console.error(err); });
}

function custDelete(notificationId, element) {
    fetch('/api/notifications/' + notificationId, { method: 'DELETE' })
        .then(function(res){
            if (!res.ok) throw new Error('Failed to delete');
            if (element && element.parentNode) element.parentNode.removeChild(element);
            fetchCustomerNotifications();
        })
        .catch(function(err){ console.error(err); });
}

function markAllCustomerNotificationsAsRead() {
    Array.prototype.forEach.call(document.querySelectorAll('#cust-notification-scroll .notification-item.unread'), function(el){
        custMarkRead(el.getAttribute('data-id'), el);
    });
}

function updateCustBadges(count) {
    Array.prototype.forEach.call(document.querySelectorAll('.notification-badge'), function(b){
        b.textContent = String(count);
        b.style.display = count > 0 ? 'inline-block' : 'none';
        if (count > custLastUnread) {
            b.classList.add('show-bounce');
            setTimeout(function(){ b.classList.remove('show-bounce'); }, 500);
        }
    });
    custLastUnread = count;
}

function getIconForType(type) {
    var t = (type || '').toUpperCase();
    if (t === 'NEW_ORDER' || t === 'ORDER') {
        return { icon: 'fas fa-receipt', iconBg: '#e0f2fe', iconColor: '#0369a1' };
    }
    return { icon: 'fas fa-bell', iconBg: '#e0e7ff', iconColor: '#1d4ed8' };
}

function safeFormatTime(ts) {
    try {
        var d = parseDateFlexible(ts);
        var now = new Date();
        var diff = now - d;
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return mins + ' ' + (mins === 1 ? 'minute' : 'minutes') + ' ago';
        var h = Math.floor(mins / 60);
        if (h < 24) return h + ' ' + (h === 1 ? 'hour' : 'hours') + ' ago';
        var days = Math.floor(h / 24);
        if (days < 7) return days + ' ' + (days === 1 ? 'day' : 'days') + ' ago';
        return d.toLocaleDateString();
    } catch (e) { return ''; }
}

function parseDateFlexible(ts) {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'string') {
        if (ts.length >= 19 && ts.charAt(10) === ' ') ts = ts.replace(' ', 'T');
    }
    var d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getCurrentCustomerId() {
    try {
        if (window.Auth && Auth.getUser) {
            var u = Auth.getUser('customer');
            if (u && (u.id || u.customerId)) return u.id || u.customerId;
        }
    } catch (e) {}
    try {
        var raw = localStorage.getItem('user') || localStorage.getItem('authUser');
        if (raw) {
            var u2 = JSON.parse(raw);
            return u2.id || u2.customerId || null;
        }
    } catch (e2) {}
    return null;
}

function setupCustNotificationHandlers() {
    var btn = document.getElementById('notificationBtn');
    var btnMobile = document.getElementById('notificationBtnMobile');
    var toggleFrom = function(anchor){
        if (!custDropdown) return;
        var willShow = !custDropdown.classList.contains('show');
        if (willShow) {
            positionCustDropdown(anchor);
            custDropdown.classList.add('show');
            if (custOverlay) custOverlay.classList.add('show');
        } else {
            custDropdown.classList.remove('show');
            if (custOverlay) custOverlay.classList.remove('show');
        }
    };

    if (btn) btn.addEventListener('click', function(e){ e.stopPropagation(); toggleFrom(btn); });
    if (btnMobile) btnMobile.addEventListener('click', function(e){ e.stopPropagation(); toggleFrom(btnMobile); });
    if (custOverlay) custOverlay.addEventListener('click', function(){ custDropdown.classList.remove('show'); custOverlay.classList.remove('show'); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { custDropdown.classList.remove('show'); if (custOverlay) custOverlay.classList.remove('show'); } });
}

function positionCustDropdown(anchor) {
    if (!anchor || !custDropdown) return;
    var rect = anchor.getBoundingClientRect();
    var width = 380;
    var left = Math.min(window.innerWidth - width - 10, Math.max(10, rect.right - width));
    var top = rect.bottom + 8;
    custDropdown.style.position = 'fixed';
    custDropdown.style.left = left + 'px';
    custDropdown.style.top = top + 'px';
}

// Auto-init on DOMContentLoaded if a user is present
document.addEventListener('DOMContentLoaded', function(){
    var has = !!(localStorage.getItem('user') || localStorage.getItem('authUser')) || (window.Auth && Auth.getUser && Auth.getUser('customer'));
    if (has) initCustomerNotifications();
});
