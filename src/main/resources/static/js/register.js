document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".auth-form");
    const peekBtns = document.querySelectorAll(".peek");
    const roleHidden = document.getElementById("reg-role"); // hidden field for custom dropdown
    const phoneRow = document.getElementById("phone-row");
    const addressRow = document.getElementById("address-row");

    // --- Get modal elements ---
    const successModal = document.getElementById('successModal');
    const modalOkButton = document.getElementById('modalOkButton');
    const errorModal = document.getElementById('errorModal');
    const errorTryAgainButton = document.getElementById('errorTryAgainButton');
    const errorMessageParagraph = document.getElementById('errorMessage');

    // Toggle password visibility
    peekBtns.forEach((btn) => {
        const input = btn.parentElement.querySelector("input");
        btn.addEventListener("click", () => {
            const type = input.type === "password" ? "text" : "password";
            input.type = type;
            const icon = btn.querySelector("i");
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
        });
    });

    // Custom role dropdown
    (function setupRegRoleDropdown() {
        const toggle = document.getElementById('regRoleDropdownToggle');
        const menu = document.getElementById('regRoleDropdownMenu');
        const label = document.getElementById('regRoleLabel');
        if (!toggle || !menu || !label || !roleHidden) return;

        function openMenu() { menu.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); }
        function closeMenu() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
        function applyRole(value, text) {
            roleHidden.value = value;
            label.textContent = text || 'Select role';
            updateRoleDependentFields(value);
            document.dispatchEvent(new CustomEvent('role-change', { detail: { role: value }}));
        }

        toggle.addEventListener('click', (e) => { e.preventDefault(); menu.classList.contains('open') ? closeMenu() : openMenu(); });
        menu.querySelectorAll('.role-option').forEach(opt => {
            opt.addEventListener('click', () => {
                applyRole((opt.getAttribute('data-value') || '').trim(), opt.textContent.trim());
                closeMenu();
            });
        });

        document.addEventListener('click', (e) => { if (!toggle.closest('.select-row')?.contains(e.target)) closeMenu(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

        const initVal = (roleHidden.value || '').trim();
        if (initVal) {
            const item = menu.querySelector(`.role-option[data-value="${initVal}"]`);
            if (item) label.textContent = item.textContent.trim();
            updateRoleDependentFields(initVal);
        } else {
            applyRole('', 'Select role');
        }
    })();

    function updateRoleDependentFields(role) {
        const isStaff = (role || '').toLowerCase() === 'staff';
        [phoneRow, addressRow].forEach(row => {
            if(row) {
                row.style.display = isStaff ? 'none' : 'grid';
                const input = row.querySelector('input');
                if (isStaff) {
                    input.removeAttribute('required');
                } else {
                    input.setAttribute('required', 'true');
                }
            }
        });
    }

    (function initVisibilityOnce() {
        updateRoleDependentFields((roleHidden?.value || '').trim());
    })();

    // --- Modal Logic ---
    function showSuccessModal(onConfirm) {
        if (!successModal) return;
        successModal.style.display = 'grid';
        setTimeout(() => successModal.classList.add('visible'), 10);
        modalOkButton.onclick = () => {
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

        const firstname = document.getElementById("reg-firstname").value.trim();
        const lastname = document.getElementById("reg-lastname").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const phone = document.getElementById("reg-phone").value.trim();
        const address = document.getElementById("reg-address").value.trim();
        const password = document.getElementById("reg-password").value.trim();
        const role = document.getElementById("reg-role").value;

        // Basic validation
        if (!firstname || !lastname || !email || !password || !role) {
            showErrorModal("Please fill in all required fields.");
            return;
        }

        if (role === "customer" && (!phone || !address)) {
            showErrorModal("Please fill in your phone and address to continue.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showErrorModal("Please enter a valid email address.");
            return;
        }

        if (password.length < 6) {
            showErrorModal("Password must be at least 6 characters.");
            return;
        }

        const userData = { firstName: firstname, lastName: lastname, email, password, role };
        if (role === "customer") {
            userData.phone = phone;
            userData.address = address;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const message = await response.text();
            if (response.ok) {
                showSuccessModal(() => {
                    window.location.href = "login.html";
                });
            } else {
                showErrorModal(message || "Registration failed. Please try again.");
            }
        } catch (error) {
            showErrorModal("Network error. Could not connect to the server.");
        }
    });

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