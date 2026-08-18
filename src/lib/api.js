const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';



function sha256Fallback(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiLength = ascii[lengthProperty] * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII only
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength);
  
  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0, 8);
    
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ (~e & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }
    
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  
  for (i = 0; i < 8; i++) {
    const s = hash[i] >>> 0;
    result += ((s >> 24) & 0xff).toString(16).padStart(2, '0')
      + ((s >> 16) & 0xff).toString(16).padStart(2, '0')
      + ((s >> 8) & 0xff).toString(16).padStart(2, '0')
      + (s & 0xff).toString(16).padStart(2, '0');
  }
  return result;
}

async function hashPasswordIfNeeded(password) {
  if (!password) return password;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(password);
}

/**
 * M-01 Fix: All requests now use `credentials: 'include'` so the httpOnly
 * session cookie is sent automatically with every request. The Authorization
 * header is intentionally removed — cookie-based auth is more secure because
 * the token is not accessible to JavaScript (httpOnly).
 */
export async function apiRequest(endpoint, options = {}) {
  const config = {
    method: options.method || 'POST',
    credentials: 'include',          // Send httpOnly cookie with every request
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  // Safely parse: if the server returns an HTML error page (e.g. 404/502 from
  // a missing route or a downed ngrok tunnel) res.json() would throw a
  // SyntaxError before we can handle the HTTP status. Check Content-Type first.
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    // If non-OK, wrap the raw text into an error object
    data = res.ok ? {} : { error: `Server returned non-JSON response (${res.status}): ${text.slice(0, 200)}` };
  }

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
  updateFcmToken: (fcmToken) => apiRequest('/users/update-fcm-token', { body: { fcm_token: fcmToken } }),
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
  triggerTest: () => apiRequest('/licenses/test-notification', {}),
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
  listSchedules: () => apiRequest('/reports/schedules/list', { method: 'POST', body: {} }),
  createSchedule: (body) => apiRequest('/reports/schedules', { body }),
  updateSchedule: (id, body) => apiRequest(`/reports/schedules/${id}`, { method: 'PUT', body }),
  deleteSchedule: (id) => apiRequest(`/reports/schedules/${id}`, { method: 'DELETE' }),
  runSchedule: (id) => apiRequest(`/reports/schedules/${id}/run`, { method: 'POST', body: {} }),
};
