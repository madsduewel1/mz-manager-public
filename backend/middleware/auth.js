const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header or query param
        const authHeader = req.headers.authorization;
        let token = '';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Keine Authentifizierung. Zugriff verweigert.' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user info to request
        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: decoded.role,
            roles: decoded.roles || [decoded.role],
            permissions: decoded.permissions || []
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Ungültiges Token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token abgelaufen' });
        }
        return res.status(500).json({ error: 'Serverfehler bei Authentifizierung' });
    }
};

// Role-based access control (Legacy/Specific)
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }

        const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
        const userRole = (req.user.role || '').toLowerCase();

        const hasAccess = normalizedAllowed.some(role => {
            if (role === 'admin' && userRole === 'administrator') return true;
            if (role === 'administrator' && userRole === 'admin') return true;
            return role === userRole;
        });

        if (!hasAccess) {
            return res.status(403).json({ error: 'Zugriff verweigert. Unzureichende Rolle.' });
        }

        next();
    };
};

// Permission-based access control (New Standard)
const requirePermission = (...requiredPerms) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Nicht authentifiziert' });
        }

        const userRole = (req.user.role || '').toLowerCase();
        const userPermissions = req.user.permissions || [];

        // Administrator always has all permissions
        if (userRole === 'administrator' || userRole === 'admin') {
            return next();
        }

        // 'all' permission grants everything
        if (userPermissions.includes('all')) {
            return next();
        }

        // Check if user has at least one of the required permissions
        const hasAccess = requiredPerms.some(perm => userPermissions.includes(perm));

        if (!hasAccess) {
            return res.status(403).json({ error: 'Zugriff verweigert. Fehlende Berechtigungen.' });
        }

        next();
    };
};

module.exports = { authMiddleware, requireRole, requirePermission };
