// Configure your API base URL (Spring Boot default port)
const API_BASE = 'http://localhost:8080';

// Authentication helpers (matching admin-dashboard.js)
function normalizeUser(user) {
    if (!user) return user;
    const firstName = user.firstName ?? user.firstname ?? '';
    const lastName  = user.lastName  ?? user.lastname  ?? '';
    const role      = (user.role ?? '').toString().toLowerCase();
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
    if (window.Auth && Auth.saveUserForRole) {
        Auth.saveUserForRole(normalized, 'admin');
    } else {
        // Legacy fallback
        localStorage.setItem('user', JSON.stringify(normalized));
        localStorage.setItem('authUser', JSON.stringify(normalized));
    }
    return normalized;
}

function getSessionUser() {
    if (window.Auth && Auth.getUser) {
        return Auth.getUser('admin');
    }
    const raw = localStorage.getItem('user') || localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return saveUserToStorage(parsed);
    } catch {
        return null;
    }
}

function requireRoles(allowedRoles) {
    const user = (window.Auth && Auth.getUser) ? Auth.getUser('admin') : getSessionUser();
    const role = (user?.role || '').toLowerCase();
    if (!user || !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
        alert('Access denied');
        window.location.href = 'login.html?role=admin';
        return null;
    }
    // Keep active role pinned to admin on this page
    if (window.Auth && Auth.setActiveRole) Auth.setActiveRole('admin');
    return user;
}

function logoutUser() {
    if (window.Auth && Auth.logoutRole) {
        Auth.logoutRole('admin');
    } else {
        localStorage.removeItem('user');
        localStorage.removeItem('authUser');
    }
    window.location.href = 'login.html?role=admin';
}

// Simple modal helpers
function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

// API helpers
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.append(k, v));
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiJson(method, path, body, query = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(query).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.append(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

// State
let jobs = [];
let applications = [];

// Rendering helpers
function statusBadge(active) {
  return `<span class="status-badge ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Inactive'}</span>`;
}
function appStatusBadge(status) {
  const map = { new: 'active', reviewed: 'processing', accepted: 'completed', rejected: 'cancelled' };
  const cls = map[status] || 'active';
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  return `<span class="status-badge ${cls}">${label}</span>`;
}

// Load data (with graceful fallback to mock data)
async function loadJobs() {
  const tbody = document.getElementById('jobsTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
  try {
    // Expected backend page response. Adjust if you return a plain array.
    const page = await apiGet('/api/admin/jobs', { page: 0, size: 100, sort: 'postedDate,DESC' });
    jobs = Array.isArray(page?.content) ? page.content : (Array.isArray(page) ? page : []);
  } catch {
    // Fallback mocks
    jobs = [
      { jobId: 4, title: 'Quality Inspector', department: 'QA', employmentType: 'Part-Time', location: 'Eastside Facility', postedDate: '2025-09-12T00:00:00Z', active: true },
      { jobId: 3, title: 'Customer Support Agent', department: 'CX', employmentType: 'Full-Time', location: 'Remote', postedDate: '2025-09-10T00:00:00Z', active: true },
      { jobId: 2, title: 'Wash & Fold Specialist', department: 'Operations', employmentType: 'Full-Time', location: 'Downtown', postedDate: '2025-09-05T00:00:00Z', active: false },
      { jobId: 1, title: 'Pickup Driver', department: 'Logistics', employmentType: 'Part-Time', location: 'Citywide', postedDate: '2025-09-01T00:00:00Z', active: true }
    ];
  }
  renderJobs();
}

async function loadApplications() {
  const tbody = document.getElementById('applicationsTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
  try {
    const page = await apiGet('/api/admin/applied-jobs', { page: 0, size: 100, sort: 'appliedDate,DESC' });
    applications = Array.isArray(page?.content) ? page.content : (Array.isArray(page) ? page : []);
  } catch {
    applications = [
      { applicationId: 101, jobId: 3, jobTitle: 'Customer Support Agent', customerName: 'Emily Lee', email: 'emily@example.com', appliedDate: '2025-09-13T00:00:00Z', status: 'new' },
      { applicationId: 100, jobId: 1, jobTitle: 'Pickup Driver', customerName: 'Michael Davis', email: 'mike@example.com', appliedDate: '2025-09-11T00:00:00Z', status: 'reviewed' }
    ];
  }
  renderApplications();
}

// Filters and renderers
function renderJobs() {
  const tbody = document.getElementById('jobsTableBody');
  if (!tbody) return;
  const term = (document.getElementById('jobSearch')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('jobTypeFilter')?.value || 'all';
  const statusFilter = document.getElementById('jobStatusFilter')?.value || 'all';
  const filtered = jobs.filter(j => {
    const type = j.employmentType || j.type || '';
    const text = `${j.jobId} ${j.title || ''} ${j.department || ''} ${type} ${j.location || ''}`.toLowerCase();
    const matchesTerm = text.includes(term);
    const matchesType = typeFilter === 'all' || type === typeFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? !!j.active : !j.active);
    return matchesTerm && matchesType && matchesStatus;
  });
  tbody.innerHTML = filtered.map(j => `
    <tr data-id="${j.jobId}">
      <td>#JOB-${String(j.jobId).padStart(3,'0')}</td>
      <td>${j.title || ''}</td>
      <td>${j.department || ''}</td>
      <td>${j.employmentType || j.type || ''}</td>
      <td>${j.location || ''}</td>
      <td>${j.postedDate ? new Date(j.postedDate).toLocaleDateString() : ''}</td>
      <td>${statusBadge(!!j.active)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon edit-btn" title="Edit" onclick="editJob(${j.jobId})"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete-btn" title="Delete" onclick="confirmDeleteJob(${j.jobId}, '${(j.title || '').replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
          <button class="btn-icon" title="${j.active ? 'Deactivate' : 'Activate'}" onclick="toggleJobActive(${j.jobId})"><i class="fas ${j.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8">No jobs found.</td></tr>';
}

function renderApplications() {
  const tbody = document.getElementById('applicationsTableBody');
  if (!tbody) return;
  const term = (document.getElementById('applicationSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('applicationStatusFilter')?.value || 'all';
  const filtered = applications.filter(a => {
    const text = `${a.applicationId || a.appliedJobId} ${a.jobTitle || ''} ${a.customerName || ''} ${a.email || ''}`.toLowerCase();
    const matchesTerm = text.includes(term);
    const matchesStatus = statusFilter === 'all' || (a.status || '').toLowerCase() === statusFilter;
    return matchesTerm && matchesStatus;
  });
  tbody.innerHTML = filtered.map(a => `
    <tr data-id="${a.applicationId || a.appliedJobId}">
      <td>#APP-${String(a.applicationId || a.appliedJobId).padStart(3,'0')}</td>
      <td>${a.jobTitle || ''}</td>
      <td>${a.customerName || ''}</td>
      <td>${a.email || ''}</td>
      <td>${a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : ''}</td>
      <td>${appStatusBadge((a.status || 'new').toLowerCase())}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon view-btn" title="Review" onclick="reviewApplication(${a.applicationId || a.appliedJobId})"><i class="fas fa-eye"></i></button>
          <button class="btn-icon" title="Accept" onclick="setApplicationStatus(${a.applicationId || a.appliedJobId}, 'accepted')"><i class="fas fa-check"></i></button>
          <button class="btn-icon" title="Reject" onclick="setApplicationStatus(${a.applicationId || a.appliedJobId}, 'rejected')"><i class="fas fa-times"></i></button>
          <button class="btn-icon delete-btn" title="Delete" onclick="confirmDeleteApplication(${a.applicationId || a.appliedJobId})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7">No applications found.</td></tr>';
}

// Jobs: actions
function openJobModal(title) {
  document.getElementById('jobModalTitle').textContent = title;
  openModal('addJobModal');
}
function editJob(id) {
  const j = jobs.find(x => x.jobId === id);
  if (!j) return;
  document.getElementById('jobId').value = j.jobId;
  document.getElementById('jobTitle').value = j.title || '';
  document.getElementById('jobDepartment').value = j.department || '';
  document.getElementById('jobType').value = j.employmentType || j.type || '';
  document.getElementById('jobLocation').value = j.location || '';
  document.getElementById('jobDescription').value = j.description || j.jobDescription || '';
  document.getElementById('jobActive').value = j.active ? '1' : '0';
  document.getElementById('jobExpiry').value = j.expiresAt ? String(j.expiresAt).slice(0,10) : '';
  openJobModal('Edit Job');
}
function confirmDeleteJob(id, title) {
  document.getElementById('deleteItemName').textContent = `job "${title}"`;
  openModal('deleteModal');
  document.getElementById('confirmDeleteBtn').onclick = async function () {
    try {
      console.log('Attempting to delete job with ID:', id);
      const response = await apiJson('DELETE', `/api/admin/jobs/${id}`);
      console.log('Delete successful:', response);
      closeModal('deleteModal');
      await loadJobs();
      alert('Job deleted successfully!');
    } catch (error) {
      console.error('Delete failed - Full error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      closeModal('deleteModal');

      // Show detailed error message
      let errorMsg = 'Failed to delete job.\n\n';
      errorMsg += 'Error: ' + error.message + '\n\n';
      errorMsg += 'Please check:\n';
      errorMsg += '1. Is the server running?\n';
      errorMsg += '2. Check browser console (F12) for details\n';
      errorMsg += '3. Check if the job ID exists\n';

      alert(errorMsg);

      // Try to reload anyway to refresh the list
      await loadJobs();
    }
  };
}
async function toggleJobActive(id) {
  const j = jobs.find(x => x.jobId === id);
  if (!j) return;
  const next = !j.active;
  try {
    await apiJson('PATCH', `/api/admin/jobs/${id}/status`, null, { active: String(next) });
    j.active = next;
  } catch {
    j.active = next; // local fallback
  }
  renderJobs();
}

// Applications: actions
function reviewApplication(appId) {
  const a = applications.find(x => (x.applicationId || x.appliedJobId) === appId);
  if (!a) return;
  document.getElementById('applicantName').textContent = a.customerName || '';
  document.getElementById('applicantEmail').textContent = a.email || '';
  document.getElementById('applicationJob').textContent = a.jobTitle || '';
  document.getElementById('applicationDate').textContent = a.appliedDate ? new Date(a.appliedDate).toLocaleString() : '';
  document.getElementById('applicationStatusSelect').value = (a.status || 'new').toLowerCase();
  document.getElementById('saveApplicationStatusBtn').onclick = async function () {
    const newStatus = document.getElementById('applicationStatusSelect').value;
    await setApplicationStatus(appId, newStatus, true);
    closeModal('reviewApplicationModal');
  };
  openModal('reviewApplicationModal');
}

async function setApplicationStatus(appId, status, silent = false) {
  try {
    await apiJson('PATCH', `/api/admin/applied-jobs/${appId}/status`, { status });
  } catch {
    // Local fallback
    const a = applications.find(x => (x.applicationId || x.appliedJobId) === appId);
    if (a) a.status = status;
  }
  if (!silent) renderApplications();
}

function confirmDeleteApplication(appId) {
  document.getElementById('deleteItemName').textContent = `application #APP-${String(appId).padStart(3,'0')}`;
  openModal('deleteModal');
  document.getElementById('confirmDeleteBtn').onclick = async function () {
    try {
      await apiJson('DELETE', `/api/admin/applied-jobs/${appId}`);
    } catch {
      const idx = applications.findIndex(a => (a.applicationId || a.appliedJobId) === appId);
      if (idx >= 0) applications.splice(idx, 1);
    }
    closeModal('deleteModal');
    renderApplications();
  };
}

// DOM Ready - Initialize everything here
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication first
  const user = requireRoles(['admin']);
  if (!user) return;

  // Initialize sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      document.body.classList.toggle('sidebar-collapsed');
    });
  }

  // Modal click outside to close
  window.addEventListener('click', e => {
    document.querySelectorAll('.modal').forEach(m => {
      if (e.target === m) m.style.display = 'none';
    });
  });

  // Job form submit
  const form = document.getElementById('jobForm');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('jobTitle').value.trim(),
        department: document.getElementById('jobDepartment').value.trim() || null,
        employmentType: document.getElementById('jobType').value,
        location: document.getElementById('jobLocation').value.trim() || null,
        jobDescription: document.getElementById('jobDescription').value.trim() || null,
        active: document.getElementById('jobActive').value === '1',
        expiresAt: document.getElementById('jobExpiry').value || null
      };
      const id = Number(document.getElementById('jobId').value) || null;
      try {
        if (id) {
          await apiJson('PUT', `/api/admin/jobs/${id}`, payload);
        } else {
          await apiJson('POST', '/api/admin/jobs', payload);
        }
        closeModal('addJobModal');
        form.reset();
        document.getElementById('jobId').value = '';
        document.getElementById('jobModalTitle').textContent = 'Add New Job';
        await loadJobs();
      } catch (err) {
        alert('Failed to save job: ' + err.message);
      }
    });
  }

  // Setup filters and search
  const jobSearch = document.getElementById('jobSearch');
  const jobTypeFilter = document.getElementById('jobTypeFilter');
  const jobStatusFilter = document.getElementById('jobStatusFilter');
  const appSearch = document.getElementById('applicationSearch');
  const appStatusFilter = document.getElementById('applicationStatusFilter');

  if (jobSearch) jobSearch.addEventListener('input', renderJobs);
  if (jobTypeFilter) {
    jobTypeFilter.addEventListener('input', renderJobs);
    jobTypeFilter.addEventListener('change', renderJobs);
  }
  if (jobStatusFilter) {
    jobStatusFilter.addEventListener('input', renderJobs);
    jobStatusFilter.addEventListener('change', renderJobs);
  }
  if (appSearch) appSearch.addEventListener('input', renderApplications);
  if (appStatusFilter) {
    appStatusFilter.addEventListener('input', renderApplications);
    appStatusFilter.addEventListener('change', renderApplications);
  }

  // Tab navigation
  function showSectionByHash() {
    const hash = (location.hash || '#jobs-management').replace('#','');
    document.querySelectorAll('.management-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(hash) || document.getElementById('jobs-management');
    if (target) target.classList.add('active');

    // Toggle tab button styles
    const tabJobs = document.getElementById('tabJobs');
    const tabApplications = document.getElementById('tabApplications');
    if (tabJobs) {
      tabJobs.classList.toggle('btn-primary', hash === 'jobs-management');
      tabJobs.classList.toggle('btn-outline', hash !== 'jobs-management');
    }
    if (tabApplications) {
      tabApplications.classList.toggle('btn-primary', hash === 'applications-management');
      tabApplications.classList.toggle('btn-outline', hash !== 'applications-management');
    }
  }

  window.addEventListener('hashchange', showSectionByHash);
  showSectionByHash();

  // Initial data load
  loadJobs();
  loadApplications();
});
