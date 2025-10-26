document.addEventListener('DOMContentLoaded', function() {
    // ---- Header Animation and Scroll Behavior ----
    const header = document.querySelector('header');
    if (header) {
        // Function to remove the loading class once animations complete
        const onAnimationEnd = () => {
            header.classList.remove('header-loading');
            header.removeEventListener('animationend', onAnimationEnd);
        };
        header.addEventListener('animationend', onAnimationEnd);

        // Auto-hide header on scroll logic
        let lastScrollTop = 0;
        const delta = 5;
        window.addEventListener('scroll', function() {
            const st = window.pageYOffset || document.documentElement.scrollTop;
            if (Math.abs(lastScrollTop - st) <= delta) return;

            // Do not hide if the animation is still playing
            if (!header.classList.contains('header-loading')) {
                if (st > lastScrollTop && st > header.offsetHeight) {
                    header.classList.add('header-hidden'); // Scroll Down
                } else {
                    header.classList.remove('header-hidden'); // Scroll Up
                }
            }
            lastScrollTop = st <= 0 ? 0 : st;
        }, false);
    }

    // Simple animation for the laundry visualization
    const bubbles = document.querySelectorAll('.bubble');
    bubbles.forEach((bubble, index) => {
        bubble.style.animationDelay = `${index * 0.5}s`;
    });

    // Robust user + role handling using shared Auth helper
    function getCustomerUser() {
        if (window.Auth && Auth.getUser) {
            return Auth.getUser('customer');
        }
        try {
            const raw = localStorage.getItem('authUser') || localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
    function isCustomer(user) {
        if (!user) return false;
        const role = (user.role || '').toString().trim().toLowerCase();
        if (role === 'customer') return true;
        // fallbacks
        const roleCandidates = [];
        if (user.userRole) roleCandidates.push(user.userRole);
        if (Array.isArray(user.roles)) roleCandidates.push(...user.roles);
        if (Array.isArray(user.authorities)) roleCandidates.push(...user.authorities.map(a => (a.authority || a).toString()));
        const norm = roleCandidates.map(r => (r || '').toString().trim().toLowerCase());
        if (norm.some(r => r.includes('customer'))) return true;
        if (user.customerId && !norm.some(r => r.includes('admin') || r.includes('staff'))) return true;
        return false;
    }
    const user = getCustomerUser();
    const userIsCustomer = isCustomer(user);

    // Toggle hero "My Dashboard" button
    const btn = document.getElementById('customerDashboardBtn');
    if (btn) {
        btn.style.display = userIsCustomer ? 'inline-flex' : 'none';
    }

    // Header: switch login/register to user chip + dropdown for logged-in customers
    const loginBtn = document.getElementById('navLoginBtn');
    const registerBtn = document.getElementById('navRegisterBtn');
    const userArea = document.getElementById('navUserArea');
    const userNameEl = document.getElementById('navUserName');
    const userInitialsEl = document.getElementById('navUserInitials');
    const userToggle = document.getElementById('navUserToggle');
    const userMenu = document.getElementById('navUserMenu');
    const logoutBtn = document.getElementById('navLogoutBtn');

    function initialsFrom(userObj) {
        const first = (userObj?.firstName || userObj?.firstname || '').trim();
        const last = (userObj?.lastName || userObj?.lastname || '').trim();
        const email = (userObj?.email || '').trim();
        if (first && last) return (first[0] + last[0]).toUpperCase();
        if (first) return first.substring(0, 2).toUpperCase();
        if (email) return email[0].toUpperCase();
        return 'U';
    }

    if (userIsCustomer) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userArea) userArea.style.display = 'inline-block';

        if (userNameEl) {
            const first = (user?.firstName || user?.firstname || '').trim();
            const last = (user?.lastName || user?.lastname || '').trim();
            const fallback = (user?.email || '').trim();
            const display = [first, last].filter(Boolean).join(' ').trim() || fallback || 'Customer';
            userNameEl.textContent = display;
        }
        if (userInitialsEl) userInitialsEl.textContent = initialsFrom(user);

        // Dropdown toggle with smooth animation
        if (userToggle && userMenu) {
            const closeMenu = () => {
                userMenu.classList.remove('open');
                userToggle.setAttribute('aria-expanded', 'false');
            };
            const openMenu = () => {
                userMenu.classList.add('open');
                userToggle.setAttribute('aria-expanded', 'true');
            };
            userToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const open = userMenu.classList.contains('open');
                open ? closeMenu() : openMenu();
            });
            document.addEventListener('click', (e) => {
                if (!userArea.contains(e.target)) closeMenu();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeMenu();
            });
        }

        // Sign out (customer only; keep staff/admin sessions)
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.Auth && Auth.logoutRole) {
                    Auth.logoutRole('customer');
                } else {
                    localStorage.removeItem('user');
                    localStorage.removeItem('authUser');
                }
                window.location.href = 'index.html';
            });
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (userArea) userArea.style.display = 'none';
    }

    // ---- Button ripple effect ----
    document.querySelectorAll('.btn').forEach(btnEl => {
        btnEl.addEventListener('click', (e) => {
            // Prevent ripple on nav links
            if (btnEl.closest('.nav-links')) return;

            const rect = btnEl.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

            // Ensure only one ripple is active at a time
            const existingRipple = btnEl.querySelector('.ripple');
            if (existingRipple) {
                existingRipple.remove();
            }

            btnEl.appendChild(ripple);
            setTimeout(() => ripple.remove(), 650);
        });
    });

    // ---- Scroll to Top (show/hide + smooth scroll) ----
    const topBtn = document.getElementById('scrollTopBtn');
    if (topBtn) {
        const toggleTopBtn = () => {
            const show = window.scrollY > 300;
            topBtn.classList.toggle('show', show);
        };
        window.addEventListener('scroll', toggleTopBtn);
        toggleTopBtn(); // Initial check

        topBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});