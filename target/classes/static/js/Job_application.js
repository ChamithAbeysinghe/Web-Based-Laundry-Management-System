document.addEventListener('DOMContentLoaded', function () {
    const jobsGrid = document.getElementById('jobsGrid');
    const loadingEl = document.getElementById('loading');
    const noJobsEl = document.getElementById('noJobs');

    // --- Get modal elements ---
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    const successOkButton = document.getElementById('successOkButton');
    const errorTryAgainButton = document.getElementById('errorTryAgainButton');
    const errorMessageParagraph = document.getElementById('errorMessage');

    // --- Application State ---
    let appliedJobIds = new Set();

    // Tabs
    const tabJobs = document.getElementById('tabJobs');
    const tabPayments = document.getElementById('tabPayments');
    const jobsTabContent = document.getElementById('jobsTabContent');
    const paymentsTabContent = document.getElementById('paymentsTabContent');
    let paymentsLoaded = false;

    function switchTo(tab) {
        const isJobs = tab === 'jobs';
        if (tabJobs) tabJobs.classList.toggle('active', isJobs);
        if (tabPayments) tabPayments.classList.toggle('active', !isJobs);
        if (jobsTabContent) jobsTabContent.style.display = isJobs ? '' : 'none';
        if (paymentsTabContent) paymentsTabContent.style.display = isJobs ? 'none' : '';
        if (!isJobs && !paymentsLoaded) {
            loadPayments();
            paymentsLoaded = true;
        }
    }

    if (tabJobs) tabJobs.addEventListener('click', () => switchTo('jobs'));
    if (tabPayments) tabPayments.addEventListener('click', () => switchTo('payments'));

    // --- Use shared Auth utility if available ---
    function getAuthenticatedUser() {
        // Use global Auth if available
        if (window.Auth && typeof window.Auth.getUser === 'function') {
            return window.Auth.getUser();
        }
        // Fallback to manual parsing
        try {
            const user = JSON.parse(localStorage.getItem('authUser') || localStorage.getItem('user') || 'null');
            if (!user) return null;
            const canonicalRole = (rawRole => {
                const v = (rawRole || '').toString().trim().toLowerCase().replace(/^role[_-]/, '');
                if (['customer', 'admin', 'staff'].includes(v)) return v;
                return 'customer';
            })(user.role || user.userRole);
            return { ...user, role: canonicalRole };
        } catch {
            return null;
        }
    }

    function requireCustomerAuth() {
        // Use global Auth if available
        if (window.Auth && typeof window.Auth.requireCustomer === 'function') {
            return window.Auth.requireCustomer();
        }
        // Fallback
        const user = getAuthenticatedUser();
        if (user && user.role === 'customer') {
            return user;
        }
        window.location.href = 'login.html?role=customer&redirect=' + encodeURIComponent(location.href);
        return null;
    }

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

    // --- Data Fetching ---
    async function fetchJobs() {
        try {
            const res = await fetch('/api/admin/jobs?page=0&size=100&sort=postedDate,DESC');
            if (!res.ok) {
                console.error('Failed to fetch jobs:', res.status);
                return [];
            }
            const data = await res.json();
            return (Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [])
                .map(j => ({
                    id: j.jobId ?? j.id,
                    title: j.title ?? 'Untitled Job',
                    department: j.department ?? 'General',
                    employmentType: j.employmentType ?? j.type ?? 'Full-Time',
                    location: j.location ?? 'Remote',
                    postedDate: j.postedDate ?? j.posted ?? null,
                    description: j.description ?? 'No description available.',
                    active: !!j.active
                }))
                .filter(j => j.active);
        } catch (e) {
            console.error('Failed to load jobs:', e);
            return [];
        }
    }

    async function fetchAppliedJobIds(customerId) {
        if (!customerId) return new Set();
        try {
            const res = await fetch(`/api/applied-jobs/customer/${customerId}`);
            if (!res.ok) {
                console.error('Failed to fetch applied jobs:', res.status);
                return new Set();
            }
            const data = await res.json();
            // Handle both Page response and array response
            const appliedJobs = Array.isArray(data) ? data : (data.content || []);
            const jobIds = appliedJobs.map(item => item.job?.jobId ?? item.job?.id ?? item.jobId ?? item.id).filter(Boolean);
            return new Set(jobIds);
        } catch (e) {
            console.error('Failed to load applied jobs:', e);
            return new Set();
        }
    }

    // --- Rendering ---
    function renderJobs(jobs, currentAppliedIds) {
        if (!jobsGrid) return;
        if (!jobs || jobs.length === 0) {
            if (noJobsEl) noJobsEl.style.display = 'block';
            jobsGrid.innerHTML = '';
            return;
        }
        if (noJobsEl) noJobsEl.style.display = 'none';

        jobsGrid.innerHTML = jobs.map(job => {
            const isApplied = currentAppliedIds.has(job.id);
            const postedTxt = job.postedDate ? `Posted ${new Date(job.postedDate).toLocaleDateString()}` : 'Recently posted';

            const buttonHtml = isApplied
                ? `<button class="btn-apply applied" disabled><i class="fas fa-check"></i> Applied</button>`
                : `<button class="btn-apply" data-job-id="${job.id}"><i class="fas fa-paper-plane"></i> Apply Now</button>`;

            return `
                <div class="job-card reveal">
                    <div class="job-icon"><i class="fas fa-briefcase"></i></div>
                    <h3 class="job-title">${job.title}</h3>
                    <span class="job-dept">${job.department}</span>
                    <p class="job-desc">${job.description}</p>
                    <div class="job-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                        <span><i class="fas fa-clock"></i> ${job.employmentType}</span>
                    </div>
                    <div class="job-posted">
                        <i class="fas fa-calendar-alt"></i> ${postedTxt}
                    </div>
                    ${buttonHtml}
                </div>
            `;
        }).join('');

        // Attach intersection observer for animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        jobsGrid.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        // Attach click handlers with delegation for better reliability
        attachApplyHandlers();
    }

    // Use event delegation for better reliability
    function attachApplyHandlers() {
        // Use simple event delegation on the existing grid
        // Remove any existing listeners first by replacing the onclick
        if (jobsGrid._applyHandlerAttached) return; // Already attached

        jobsGrid.addEventListener('click', async function(e) {
            const btn = e.target.closest('.btn-apply:not(.applied):not([disabled])');
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            await handleApplyClick(btn);
        });

        // Mark as attached to prevent duplicate listeners
        jobsGrid._applyHandlerAttached = true;
    }

    // --- Event Handlers & Initialization ---
    async function handleApplyClick(applyButton) {
        const user = requireCustomerAuth();
        if (!user) {
            console.error('User not authenticated');
            showErrorModal('Please log in as a customer to apply for jobs.');
            return;
        }

        const jobId = parseInt(applyButton.getAttribute('data-job-id'));
        if (!jobId || isNaN(jobId)) {
            console.error('Invalid job ID');
            showErrorModal('Invalid job. Please refresh the page and try again.');
            return;
        }

        if (!user?.id) {
            console.error('User ID not found');
            showErrorModal('User information is incomplete. Please log in again.');
            return;
        }

        console.log('Applying for job:', jobId, 'as customer:', user.id);

        // Disable button immediately
        applyButton.disabled = true;
        const originalHTML = applyButton.innerHTML;
        applyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';

        try {
            const resp = await fetch(`/api/applied-jobs/apply?customerId=${encodeURIComponent(user.id)}&jobId=${encodeURIComponent(jobId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                console.error('Application failed:', resp.status, errText);
                throw new Error(errText || `Server returned status: ${resp.status}`);
            }

            const result = await resp.json();
            console.log('Application successful:', result);

            // Update state
            appliedJobIds.add(jobId);

            showSuccessModal(() => {
                applyButton.innerHTML = '<i class="fas fa-check"></i> Applied';
                applyButton.classList.add('applied');
            });

        } catch (e) {
            console.error('Application error:', e);

            // Create user-friendly error messages
            let userFriendlyMessage = 'Unable to submit application. Please try again.';
            const technicalMessage = (e.message || '').toLowerCase();

            if (technicalMessage.includes('already applied')) {
                userFriendlyMessage = 'You have already applied for this job.';
                // Update UI to reflect already applied state
                appliedJobIds.add(jobId);
                applyButton.innerHTML = '<i class="fas fa-check"></i> Applied';
                applyButton.classList.add('applied');
            } else if (technicalMessage.includes('failed to fetch') || technicalMessage.includes('network')) {
                userFriendlyMessage = 'Network error. Please check your connection and try again.';
                // Revert button
                applyButton.disabled = false;
                applyButton.innerHTML = originalHTML;
            } else if (technicalMessage.includes('not found')) {
                userFriendlyMessage = 'Job or customer not found. Please refresh and try again.';
                // Revert button
                applyButton.disabled = false;
                applyButton.innerHTML = originalHTML;
            } else {
                // Generic error - revert button
                applyButton.disabled = false;
                applyButton.innerHTML = originalHTML;
            }

            showErrorModal(userFriendlyMessage);
        }
    }

    async function initializePage() {
        if (loadingEl) loadingEl.style.display = 'block';
        if (jobsGrid) jobsGrid.innerHTML = '';
        if (noJobsEl) noJobsEl.style.display = 'none';

        const user = getAuthenticatedUser();
        const customerId = (user && user.role === 'customer') ? user.id : null;

        console.log('Initializing page for user:', user);

        const [jobs, fetchedAppliedIds] = await Promise.all([
            fetchJobs(),
            fetchAppliedJobIds(customerId)
        ]);

        console.log('Loaded jobs:', jobs.length, 'Applied jobs:', fetchedAppliedIds.size);

        // Update the global state
        appliedJobIds = fetchedAppliedIds;

        if (loadingEl) loadingEl.style.display = 'none';
        renderJobs(jobs, appliedJobIds);
    }

    // Initialize
    switchTo('jobs');
    initializePage();
});