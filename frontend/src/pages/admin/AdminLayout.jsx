import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    FiSettings, FiUsers, FiShield, FiCpu, FiMapPin, FiBox,
    FiLock, FiGrid, FiList, FiArrowLeft
} from 'react-icons/fi';
import { hasRole, hasPermission } from '../utils/auth';

const adminMenuItems = [
    { id: 'overview', path: '/admin', label: 'Übersicht', icon: FiGrid },
    { id: 'users', path: '/admin/users', label: 'Benutzer', icon: FiUsers, permission: 'users.view' },
    { id: 'roles', path: '/admin/roles', label: 'Rollen', icon: FiShield, permission: 'roles.view' },
    { id: 'permissions', path: '/admin/permissions', label: 'Rechte', icon: FiLock, role: 'Administrator' },
    { id: 'models', path: '/admin/models', label: 'Gerätemodelle', icon: FiCpu, permission: 'models.view' },
    { id: 'rooms', path: '/admin/rooms', label: 'Räume', icon: FiMapPin, permission: 'rooms.view' },
    { id: 'qr-codes', path: '/admin/qr-codes', label: 'QR-Codes', icon: FiBox, permission: 'qr.print' },
    { id: 'logs', path: '/admin/logs', label: 'System-Logs', icon: FiList, permission: 'logs.view' },
    { id: 'settings', path: '/admin/settings', label: 'Einstellungen', icon: FiSettings, role: 'Administrator' }
];

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="admin-v2-layout">
            <aside className="admin-v2-sidebar">
                <div className="admin-v2-sidebar-header">
                    <Link to="/dashboard" className="admin-v2-back-link">
                        <FiArrowLeft size={16} />
                        <span>Dashboard</span>
                    </Link>
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '15px -20px 15px -20px', opacity: 0.5 }}></div>
                    <h3>Verwaltung</h3>
                </div>
                <nav className="admin-v2-nav">
                    {adminMenuItems.map(item => {
                        if (item.permission && !hasPermission(item.permission)) return null;
                        if (item.role && !hasRole(item.role)) return null;

                        const Icon = item.icon;
                        // Determine if active: active if path matches exactly, or if we are at root /admin
                        const active = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

                        return (
                            <button
                                key={item.id}
                                className={`admin-v2-nav-item ${active ? 'active' : ''}`}
                                onClick={() => navigate(item.path)}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main className="admin-v2-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
