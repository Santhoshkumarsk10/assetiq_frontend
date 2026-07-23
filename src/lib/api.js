const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';



async function hashPasswordIfNeeded(password) {
  if (!password) return password;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return password;
}

export async function apiRequest(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('assetiq_token') : null;

  const config = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Auth
export const authApi = {
  login: async (body) => {
    if (body && body.password) {
      body.password = await hashPasswordIfNeeded(body.password);
    }
    return apiRequest('/auth/login', { body });
  },
  logout: () => apiRequest('/auth/logout'),
  me: () => apiRequest('/auth/me'),
  verifyMfa: (body) => apiRequest('/auth/mfa/verify', { body }),
  forgotPassword: (body) => apiRequest('/auth/forgot-password', { body }),
  resetPassword: async (body) => {
    if (body && body.newPassword) {
      body.newPassword = await hashPasswordIfNeeded(body.newPassword);
    }
    return apiRequest('/auth/reset-password', { body });
  },
  changePassword: async (body) => {
    if (body && body.currentPassword) {
      body.currentPassword = await hashPasswordIfNeeded(body.currentPassword);
    }
    if (body && body.newPassword) {
      body.newPassword = await hashPasswordIfNeeded(body.newPassword);
    }
    return apiRequest('/auth/change-password', { body });
  },
  updateProfile: (body) => apiRequest('/auth/update-profile', { body }),
};

// Dashboard
export const dashboardApi = {
  stats: () => apiRequest('/dashboard/stats'),
};

// Locations
export const locationApi = {
  list: (body) => apiRequest('/locations/list', { body }),
  add: (body) => apiRequest('/locations/add', { body }),
  edit: (body) => apiRequest('/locations/edit', { body }),
  delete: (id) => apiRequest('/locations/delete', { body: { id } }),
};

// Users
export const userApi = {
  list: (body) => apiRequest('/users/list', { body }),
  add: async (body) => {
    if (body && body.password) {
      body.password = await hashPasswordIfNeeded(body.password);
    }
    return apiRequest('/users/add', { body });
  },
  edit: async (body) => {
    if (body && body.password) {
      body.password = await hashPasswordIfNeeded(body.password);
    }
    return apiRequest('/users/edit', { body });
  },
  delete: (id) => apiRequest('/users/delete', { body: { id } }),
  resign: (id) => apiRequest('/users/resign', { body: { id } }),
  offboardList: (body) => apiRequest('/users/offboard-list', { body }),
  verifyReturn: (allocationId) => apiRequest('/users/offboard-verify', { body: { allocation_id: allocationId } }),
  toggleMfa: (body) => apiRequest('/users/mfa-toggle', { body }),
  managers: () => apiRequest('/users/managers'),
};

// Assets
export const assetApi = {
  list: (body) => apiRequest('/assets/list', { body }),
  add: (body) => apiRequest('/assets/add', { body }),
  edit: (body) => apiRequest('/assets/edit', { body }),
  delete: (id) => apiRequest('/assets/delete', { body: { id } }),
  allocate: (body) => apiRequest('/assets/allocate', { body }),
  returnAsset: (id) => apiRequest('/assets/return', { body: { id } }),
  importAssets: (body) => apiRequest('/assets/import', { body }),
  nextCode: (locationId) => apiRequest('/assets/next-code', { body: { location_id: locationId } }),
  requestAdd: (body) => apiRequest('/assets/requests/add', { body }),
  requestList: (body) => apiRequest('/assets/requests/list', { body }),
  requestPurchase: (id) => apiRequest('/assets/requests/purchase', { body: { id } }),
  requestComplete: (body) => apiRequest('/assets/requests/complete', { body }),
};

// Audit Logs
export const auditApi = {
  list: (body) => apiRequest('/audit-logs', { body }),
};

// Onboarding
export const onboardingApi = {
  list: (body) => apiRequest('/onboarding/list', { body }),
  details: (id) => apiRequest('/onboarding/details', { body: { id } }),
  step1: (body) => apiRequest('/onboarding/step1', { body }),
  nextCode: (locationId) => apiRequest('/onboarding/next-code', { body: { location_id: locationId } }),
  step2: (body) => apiRequest('/onboarding/step2', { body }),
  step3: (body) => apiRequest('/onboarding/step3', { body }),
  step4: (body) => apiRequest('/onboarding/step4', { body }),
  step5: (body) => apiRequest('/onboarding/step5', { body }),
  step6: (body) => apiRequest('/onboarding/step6', { body }),
};

// Email Requests
export const emailRequestApi = {
  list: (body) => apiRequest('/email-requests/list', { body }),
  process: (body) => apiRequest('/email-requests/process', { body }),
};

// Roles & Permissions
export const rolesApi = {
  list: (body) => apiRequest('/roles/list', { body }),
  updatePermissions: (roleId, permissionIds) => apiRequest('/roles/update-permissions', { body: { roleId, permissionIds } }),
  addRole: (body) => apiRequest('/roles/add', { body }),
  editRole: (body) => apiRequest('/roles/edit', { body }),
  deleteRole: (id) => apiRequest('/roles/delete', { body: { id } }),
  addPermission: (body) => apiRequest('/permissions/add', { body }),
  editPermission: (body) => apiRequest('/permissions/edit', { body }),
  deletePermission: (id) => apiRequest('/permissions/delete', { body: { id } }),
};

// Software Licenses
export const licenseApi = {
  list: (body) => apiRequest('/licenses/list', { body }),
  add: (body) => apiRequest('/licenses/add', { body }),
  edit: (body) => apiRequest('/licenses/edit', { body }),
  delete: (id) => apiRequest('/licenses/delete', { body: { id } }),
  // Renewal workflow
  submitRenewal: (body) => apiRequest('/licenses/renewal/submit', { body }),
  listRenewals: (body) => apiRequest('/licenses/renewal/list', { body }),
  decideRenewal: (body) => apiRequest('/licenses/renewal/decide', { body }),
  notifyUser: (license_id) => apiRequest('/licenses/renewal/notify-user', { body: { license_id } }),
};

// In-app Notifications
export const notificationApi = {
  list: () => apiRequest('/notifications/list', {}),
  markRead: (body) => apiRequest('/notifications/mark-read', { body }),
};

// Tickets
export const ticketApi = {
  list: (body) => apiRequest('/tickets/list', { body }),
  details: (id) => apiRequest('/tickets/details', { body: { id } }),
  raise: (body) => apiRequest('/tickets/raise', { body }),
  assign: (body) => apiRequest('/tickets/assign', { body }),
  resolve: (body) => apiRequest('/tickets/resolve', { body }),
  close: (id) => apiRequest('/tickets/close', { body: { id } }),
  cancel: (body) => apiRequest('/tickets/cancel', { body }),
  addComment: (body) => apiRequest('/tickets/comment/add', { body }),
  listComments: (ticketId) => apiRequest('/tickets/comment/list', { body: { ticket_id: ticketId } }),
  myAssets: () => apiRequest('/tickets/my-assets', {}),
};

// Reports
export const reportApi = {
  inventory: (body) => apiRequest('/reports/inventory', { body }),
  allocations: (body) => apiRequest('/reports/allocations', { body }),
  tickets: (body) => apiRequest('/reports/tickets', { body }),
  licenses: (body) => apiRequest('/reports/licenses', { body }),
  auditLogs: (body) => apiRequest('/reports/audit-logs', { body }),
};

