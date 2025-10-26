// Shared authentication utility for all static pages
// Provides consistent user normalization and role detection.
(function(global){
  function parseStored(key){
    try { const raw = localStorage.getItem(key); return raw? JSON.parse(raw): null; } catch { return null; }
  }
  function parseStoredSession(key){
    try { const raw = sessionStorage.getItem(key); return raw? JSON.parse(raw): null; } catch { return null; }
  }
  function collectCandidates(u){
    const arr=[]; if(!u) return arr;
    if(u.role) arr.push(u.role); if(u.userRole) arr.push(u.userRole);
    if(Array.isArray(u.roles)) arr.push(...u.roles);
    if(Array.isArray(u.authorities)) arr.push(...u.authorities.map(a => (a.authority||a)+''));
    return arr;
  }
  function canonicalRole(u){
    const cands = collectCandidates(u).map(r=>r? r.toString().trim().toLowerCase(): '');
    for(const r of cands){
      const base = r.replace(/^role[_-]/,'');
      if(base.includes('customer')) return 'customer';
      if(base.includes('admin')) return 'admin';
      if(base.includes('staff')) return 'staff';
    }
    return (u && (u.role||'').toString().trim().toLowerCase()) || 'customer';
  }
  function normalize(u){
    if(!u) return u;
    const firstName = u.firstName ?? u.firstname ?? '';
    const lastName  = u.lastName ?? u.lastname ?? '';
    const role = canonicalRole(u);
    const id = u.id ?? u.userId ?? u.customerId ?? u.staffId ?? u.customer_id ?? u.CustomerId;
    return { ...u, id, role, firstName, lastName, firstname:firstName, lastname:lastName };
  }

  // --- New multi-session helpers ---
  function roleKey(role){
    const r = (role||'').toString().trim().toLowerCase();
    if(r === 'admin') return 'auth_admin';
    if(r === 'staff') return 'auth_staff';
    return 'auth_customer';
  }
  function saveForRole(u, role){
    const n = normalize(u); if(!n) return n;
    const r = canonicalRole({ ...(n||{}), role: role || n.role });
    // Persist per-role user globally across tabs (non-conflicting)
    localStorage.setItem(roleKey(r), JSON.stringify({ ...n, role: r }));
    // Track current active role for THIS TAB only and keep legacy pointers isolated to this tab
    try {
      sessionStorage.setItem('active_role', r);
      sessionStorage.setItem('user', JSON.stringify({ ...n, role: r }));
      sessionStorage.setItem('authUser', JSON.stringify({ ...n, role: r }));
    } catch {}
    return { ...n, role: r };
  }
  function getUser(role){
    // If role specified, read the role-specific slot (shared across tabs)
    if(role){
      const r = (role||'').toString().trim().toLowerCase();
      return normalize(parseStored(roleKey(r)));
    }
    // Otherwise, prefer active role for THIS TAB, then any legacy session (this tab), then legacy (global)
    const activeTab = (sessionStorage.getItem('active_role')||'').toString().trim().toLowerCase();
    if(activeTab){
      const u = parseStored(roleKey(activeTab));
      if(u) return normalize(u);
    }
    const legacyTab = parseStoredSession('authUser') || parseStoredSession('user');
    if(legacyTab) return normalize(legacyTab);
    const legacyGlobal = parseStored('authUser') || parseStored('user');
    return normalize(legacyGlobal);
  }
  function getAnyUser(roles){
    const list = Array.isArray(roles) && roles.length? roles: ['customer','staff','admin'];
    for(const r of list){
      const u = getUser(r);
      if(u) return u;
    }
    return null;
  }
  function setActiveRole(role){
    const r = (role||'').toString().trim().toLowerCase();
    if(!r) return;
    // Set per-tab active role and sync legacy pointers ONLY within this tab
    const u = parseStored(roleKey(r));
    if(u){
      try {
        sessionStorage.setItem('active_role', r);
        sessionStorage.setItem('user', JSON.stringify(u));
        sessionStorage.setItem('authUser', JSON.stringify(u));
      } catch {}
    }
  }
  function logoutRole(role){
    const r = (role||'').toString().trim().toLowerCase();
    localStorage.removeItem(roleKey(r));
    const activeTab = (sessionStorage.getItem('active_role')||'').toString().trim().toLowerCase();
    if(activeTab === r){
      // Clear legacy pointers for this tab only; keep other role sessions intact
      try {
        sessionStorage.removeItem('active_role');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('authUser');
      } catch {}
    }
  }

  // Legacy helpers updated to use role-specific storage
  function save(u){
    // Default to using the user's own role
    return saveForRole(u, canonicalRole(u||{}));
  }
  function getLegacyUser(){
    return getUser();
  }
  function isCustomer(u){
    u = u || getUser('customer');
    if(!u) return false;
    const role = (u.role||'').toString().trim().toLowerCase();
    if(role === 'customer') return true;
    if(role.includes('customer')) return true;
    if(u.customerId && !role.includes('admin') && !role.includes('staff')) return true;
    return false;
  }
  function requireCustomer(){
    const u = getUser('customer');
    if(!u){
      window.location.href = 'login.html?role=customer&redirect=' + encodeURIComponent(location.href);
      return null;
    }
    return u;
  }
  function requireRole(role){
    const u = getUser(role);
    if(!u){
      window.location.href = 'login.html?role=' + encodeURIComponent(role) + '&redirect=' + encodeURIComponent(location.href);
      return null;
    }
    return u;
  }

  global.Auth = {
    // Normalization
    normalizeUser: normalize,
    // Multi-session API
    saveUserForRole: saveForRole,
    getUser,
    getAnyUser,
    setActiveRole,
    logoutRole,
    // Legacy-compatible helpers
    saveUser: save,
    getUserLegacy: getLegacyUser,
    isCustomer,
    requireCustomer,
    requireRole
  };
})(window);
