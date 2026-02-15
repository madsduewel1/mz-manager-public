// Authentication utilities

export const setToken = (token) => {
    localStorage.setItem('token', token);
};

export const getToken = () => {
    return localStorage.getItem('token');
};

export const removeToken = () => {
    localStorage.removeItem('token');
};

export const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
    localStorage.removeItem('user');
};

export const isAuthenticated = () => {
    return !!getToken();
};

export const hasRole = (...roles) => {
    const user = getUser();
    if (!user) return false;

    // Check plural roles array (new format)
    if (user.roles && Array.isArray(user.roles)) {
        return user.roles.some(userRole => roles.includes(userRole));
    }

    // Check singular role string (old format / backup)
    if (user.role) {
        return roles.includes(user.role);
    }

    return false;
};

export const logout = () => {
    removeToken();
    removeUser();
    window.location.href = '/login';
};

// Check if user has a specific permission
export const hasPermission = (...perms) => {
    const user = getUser();
    if (!user) return false;

    const userPermissions = user.permissions || [];

    // 'all' permission grants everything
    if (userPermissions.includes('all')) return true;

    return perms.some(p => userPermissions.includes(p));
};

// Permissions that require Verwaltung access
const ADMIN_PERMISSIONS = [
    'all', 'users.manage', 'roles.manage', 'models.manage',
    'rooms.manage', 'qr.print', 'logs.view'
];

// Check if user has any permission that grants Verwaltung access
export const hasAdminPermission = () => {
    const user = getUser();
    if (!user) return false;

    const userPermissions = user.permissions || [];
    return ADMIN_PERMISSIONS.some(p => userPermissions.includes(p));
};

// Check if user has ANY functional permissions at all
export const hasAnyPermissions = () => {
    const user = getUser();
    if (!user) return false;

    // Administrator always counts as having permissions
    if (hasRole('Administrator')) return true;

    // Check if user has any functional permissions (roles are flattened into this array by backend)
    if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) return true;

    return false;
};
