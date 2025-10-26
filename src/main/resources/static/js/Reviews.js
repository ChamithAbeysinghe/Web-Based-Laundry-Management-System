document.addEventListener('DOMContentLoaded', function () {
    const reviewForm = document.getElementById('reviewForm');
    const successScreen = document.getElementById('successScreen');
    const submitBtn = document.getElementById('submitReview');
    const loginRequired = document.getElementById('loginRequired');

    // Character counters
    const serviceReview = document.getElementById('serviceReview');
    const platformReview = document.getElementById('platformReview');
    const serviceCounter = document.getElementById('serviceCounter');
    const platformCounter = document.getElementById('platformCounter');

    function getStoredUser() {
        // Prefer role-specific customer session
        if (window.Auth && Auth.getUser) {
            return Auth.getUser('customer');
        }
        try {
            const raw = localStorage.getItem('user') || localStorage.getItem('authUser');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
    const user = getStoredUser();
    const role = (user?.role || '').toString().trim().toLowerCase();
    const isCustomer = !!user && role === 'customer';

    // If not logged in as a customer, disable form and show notice
    if (!isCustomer) {
        if (loginRequired) loginRequired.style.display = 'block';
        // Dim and disable the form
        if (reviewForm) {
            reviewForm.style.opacity = '0.6';
            // Disable inputs and clicks
            reviewForm.querySelectorAll('textarea, input, button').forEach(el => el.disabled = true);
        }
        if (submitBtn) submitBtn.style.display = 'none';
        // Stop further setup for interactions
        return;
    }

    // Enable counters only when logged-in customer
    serviceReview.addEventListener('input', () => {
        serviceCounter.textContent = serviceReview.value.length;
    });
    platformReview.addEventListener('input', () => {
        platformCounter.textContent = platformReview.value.length;
    });

    // Star rating logic
    function initStarRating(containerId, hiddenInputId) {
        const container = document.getElementById(containerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        let currentRating = parseInt(hiddenInput.value);

        // Set initial stars
        updateStars(container, currentRating);

        // Click to set rating
        container.querySelectorAll('span').forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.getAttribute('data-value'));
                hiddenInput.value = value;
                currentRating = value;
                updateStars(container, value);
            });
        });

        // Hover effect
        container.querySelectorAll('span').forEach(star => {
            star.addEventListener('mouseenter', () => {
                const value = parseInt(star.getAttribute('data-value'));
                highlightStars(container, value);
            });

            star.addEventListener('mouseleave', () => {
                updateStars(container, currentRating);
            });
        });
    }

    function highlightStars(container, upTo) {
        container.querySelectorAll('span').forEach((star, i) => {
            if (i < upTo) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    function updateStars(container, rating) {
        container.querySelectorAll('span').forEach((star, i) => {
            if (i < rating) {
                star.classList.add('filled');
                star.classList.remove('active');
            } else {
                star.classList.remove('filled', 'active');
            }
        });
    }

    // Initialize both rating groups
    initStarRating('serviceRating', 'serviceRatingValue');
    initStarRating('platformRating', 'platformRatingValue');

    // Submit handler
    submitBtn.addEventListener('click', async function () {
        const serviceRating = parseInt(document.getElementById('serviceRatingValue').value, 10) || 5;
        const platformRating = parseInt(document.getElementById('platformRatingValue').value, 10) || 5;
        const serviceText = (document.getElementById('serviceReview').value || '').trim();
        const platformText = (document.getElementById('platformReview').value || '').trim();

        // Get logged-in customer (double-check)
        let user = (window.Auth && Auth.getUser) ? Auth.getUser('customer') : null;
        if (!user) {
            try { user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('authUser')); } catch {}
        }
        const customerId = user?.id || user?.customerId || null;
        const role = (user?.role || '').toString().toLowerCase();

        if (!customerId || role !== 'customer') {
            // If someone managed to click, block and show login prompt
            if (loginRequired) loginRequired.style.display = 'block';
            alert('Please log in as a customer to submit a review.');
            return;
        }

        const payload = {
            customerId: customerId,
            serviceRating: serviceRating,
            platformRating: platformRating,
            serviceDescription: serviceText,
            platformDescription: platformText,
            // Optional legacy compatibility
            rating: serviceRating,
            description: serviceText
        };

        try {
            const res = await fetch('http://localhost:8080/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to submit review');
            }

            // Show compact success UI and auto-redirect
            reviewForm.style.display = 'none';
            if (successScreen) {
                successScreen.style.display = 'block';
                successScreen.innerHTML = `
                  <div class="review-card" style="text-align:center;">
                    <div class="success-icon"><i class="fas fa-check-circle"></i></div>
                    <h2>Review submitted!</h2>
                    <p>Thanks for your feedback. Redirecting to the home page...</p>
                  </div>
                `;
            }
            // Smooth scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Redirect to homepage shortly; if inside iframe on index, navigate top window
            setTimeout(() => {
                try {
                    if (window.top && window.top !== window) {
                        window.top.location.href = 'index.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } catch {
                    window.location.href = 'index.html';
                }
            }, 1600);
        } catch (e) {
            console.error('Review submit failed:', e);
            alert('Could not submit review: ' + (e.message || 'Unknown error'));
        }
    });

    function renderStars(containerId, rating) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('i');
            star.className = 'fas fa-star';
            if (i >= rating) {
                star.style.color = '#ddd';
            }
            container.appendChild(star);
        }
    }
});