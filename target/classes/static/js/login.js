document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".auth-form");
    const peekBtn = document.querySelector(".peek");

    // --- Get modal elements ---
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    const successOkButton = document.getElementById('successOkButton');
    const errorTryAgainButton = document.getElementById('errorTryAgainButton');
    const errorMessageParagraph = document.getElementById('errorMessage');

    // Toggle password visibility
    if (peekBtn) {
        const input = peekBtn.parentElement.querySelector("input");
        peekBtn.addEventListener("click", () => {
            const type = input.type === "password" ? "text" : "password";
            input.type = type;
            const icon = peekBtn.querySelector("i");
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
        });
    }

    // Custom role dropdown
    (function setupRoleDropdown() {
        const hidden = document.getElementById('login-role'); // required by submit
        const toggle = document.getElementById('roleDropdownToggle');
        const menu = document.getElementById('roleDropdownMenu');
        const label = document.getElementById('roleLabel');
        if (!hidden || !toggle || !menu || !label) return;

        function openMenu() {
            menu.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
        }
        function closeMenu() {
            menu.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = menu.classList.contains('open');
            isOpen ? closeMenu() : openMenu();
        });

        menu.querySelectorAll('.role-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const value = (opt.getAttribute('data-value') || '').trim();
                const text = opt.textContent.trim();
                hidden.value = value;
                label.textContent = text;
                closeMenu();
            });
        });

        // Close on outside click and Escape
        document.addEventListener('click', (e) => {
            if (!toggle.closest('.select-row')?.contains(e.target)) {
                closeMenu();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    })();

    // --- Modal Logic ---
    function showSuccessModal(onConfirm) {
        if (!successModal) return;
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

    function showErrorModal(message) {
        if (!errorModal) return;
        errorMessageParagraph.textContent = message || "An unknown error occurred. Please try again.";
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
            }, 300);
        };
    }

    // Handle form submit
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();
        const role = document.getElementById("login-role").value;

        // Basic validation
        if (!email || !password || !role) {
            showErrorModal("Please fill in all required fields.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showErrorModal("Please enter a valid email address.");
            return;
        }

        const loginData = { email, password, role };

        // Helper: derive canonical role (customer|staff|admin) from backend user object
        function deriveCanonicalRole(u) {
            const candidates = [];
            if (u.role) candidates.push(u.role);
            if (u.userRole) candidates.push(u.userRole);
            if (Array.isArray(u.roles)) candidates.push(...u.roles);
            if (Array.isArray(u.authorities)) candidates.push(...u.authorities.map(a => (a.authority || a).toString()));
            for (const raw of candidates) {
                const v = (raw || '').toString().trim().toLowerCase().replace(/^role[_-]/, '');
                if (v.includes('customer')) return 'customer';
                if (v.includes('admin')) return 'admin';
                if (v.includes('staff')) return 'staff';
            }
            const formRole = (role || '').toString().trim().toLowerCase();
            if (['customer','admin','staff'].includes(formRole)) return formRole;
            return 'customer';
        }

        // Normalize + persist user using multi-session API
        function storeNormalizedUser(u) {
            if (!u) return u;
            const canonicalRole = deriveCanonicalRole(u);
            const firstName = u.firstName ?? u.firstname ?? '';
            const lastName  = u.lastName ?? u.lastname ?? '';
            const normalized = { ...u, role: canonicalRole, firstName, lastName, firstname: firstName, lastname: lastName };
            if (window.Auth && Auth.saveUserForRole) {
                Auth.saveUserForRole(normalized, canonicalRole); // saves into role-specific slot and updates active_role (per-tab)
            } else {
                // Fallback for safety: keep legacy pointers per-tab only
                try {
                    sessionStorage.setItem('user', JSON.stringify(normalized));
                    sessionStorage.setItem('authUser', JSON.stringify(normalized));
                    sessionStorage.setItem('active_role', canonicalRole);
                } catch {}
            }
            return normalized;
        }

        try {
            const response = await fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                const user = await response.json();
                const normalized = storeNormalizedUser(user);

                showSuccessModal(() => {
                    // This code runs after the "OK" button is clicked and modal closes
                    const params = new URLSearchParams(window.location.search);
                    const redirectParam = params.get('redirect') || params.get('returnTo');
                    const r = normalized.role;
                    if (r === "staff") {
                        window.location.href = "staff-dashboard.html";
                    } else if (r === "admin") {
                        window.location.href = "admin-dashboard.html";
                    } else {
                        window.location.href = redirectParam || "index.html";
                    }
                });

            } else {
                const errorText = await response.text();
                showErrorModal(errorText || "Invalid credentials or server error.");
            }
        } catch (error) {
            showErrorModal("Network error. Could not connect to the server.");
        }
    });

    // Reveal animations for panels
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
        revealEls.forEach(el => io.observe(el));
    }

    // Button ripple effect
    document.querySelectorAll('.btn').forEach(btnEl => {
        btnEl.addEventListener('click', (e) => {
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
});