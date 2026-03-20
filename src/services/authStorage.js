const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const ROLE_KEY = 'user_type';

const ROLE_ID_MAP = {
  1: 'super_admin',
  2: 'lgu_admin',
  3: 'lgu_staff',
  5: 'lgu_technician',
  4: 'kiosk_user',
};

const ROLE_ALIAS_MAP = {
  admin: 'super_admin',
  superadmin: 'super_admin',
  lgu: 'lgu_staff',
  lgu_user: 'lgu_staff',
  technician: 'lgu_technician',
  lgu_technician: 'lgu_technician',
  lgutechnician: 'lgu_technician',
  patron: 'kiosk_user',
  kiosk: 'kiosk_user',
};

const MANAGEMENT_ROLES = ['super_admin', 'lgu_admin', 'lgu_staff', 'lgu_technician'];

const normalizeRole = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && ROLE_ID_MAP[value]) {
    return ROLE_ID_MAP[value];
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (!normalized) {
    return null;
  }

  return ROLE_ALIAS_MAP[normalized] || normalized;
};

const extractRoleFromUser = (user) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const candidates = [
    user.role_slug,
    user.user_type,
    user.role?.slug,
    user.role,
    user.role_id,
    user.roleId,
  ];

  for (const candidate of candidates) {
    const role = normalizeRole(candidate);
    if (role) {
      return role;
    }
  }

  return null;
};

const setStoredRole = (roleLike) => {
  const normalizedRole = normalizeRole(roleLike);
  if (!normalizedRole) {
    localStorage.removeItem(ROLE_KEY);
    return null;
  }

  localStorage.setItem(ROLE_KEY, normalizedRole);
  return normalizedRole;
};

const getStoredRole = () => {
  const directRole = normalizeRole(localStorage.getItem(ROLE_KEY));
  if (directRole) {
    return directRole;
  }

  try {
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);
    const roleFromUser = extractRoleFromUser(parsedUser);
    if (roleFromUser) {
      localStorage.setItem(ROLE_KEY, roleFromUser);
      return roleFromUser;
    }
  } catch {
    return null;
  }

  return null;
};

const hasAnyRole = (allowedRoles = []) => {
  const normalizedAllowed = allowedRoles
    .map((role) => normalizeRole(role))
    .filter(Boolean);

  if (normalizedAllowed.length === 0) {
    return false;
  }

  const userRole = getStoredRole();
  if (!userRole) {
    return false;
  }

  return normalizedAllowed.includes(userRole);
};

const getDefaultRouteForRole = (roleLike) => {
  const role = normalizeRole(roleLike);

  if (role === 'kiosk_user') {
    return '/login';
  }

  if (role === 'lgu_staff') {
    return '/main/recycling-analytics';
  }

  if (role === 'lgu_technician') {
    return '/main/recycling-analytics';
  }

  if (role === 'lgu_admin') {
    return '/main/users';
  }

  return '/main/dashboard';
};

const persistAuthSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}));

  const role = extractRoleFromUser(user);
  setStoredRole(role);

  return role;
};

const clearAuthSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
};

const isAuthenticated = () => Boolean(localStorage.getItem(TOKEN_KEY));

const isManagementRole = (roleLike) => MANAGEMENT_ROLES.includes(normalizeRole(roleLike));
const isSuperAdminRole = (roleLike) => normalizeRole(roleLike) === 'super_admin';
const isKioskRole = (roleLike) => normalizeRole(roleLike) === 'kiosk_user';

export {
  TOKEN_KEY,
  USER_KEY,
  ROLE_KEY,
  MANAGEMENT_ROLES,
  normalizeRole,
  extractRoleFromUser,
  setStoredRole,
  getStoredRole,
  hasAnyRole,
  getDefaultRouteForRole,
  persistAuthSession,
  clearAuthSession,
  isAuthenticated,
  isManagementRole,
  isSuperAdminRole,
  isKioskRole,
};