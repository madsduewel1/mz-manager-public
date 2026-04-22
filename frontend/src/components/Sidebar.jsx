import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    FiHome, FiMonitor, FiBox, FiRepeat, FiAlertCircle,
    FiLogOut, FiSettings, FiUser, FiChevronDown,
    FiMenu, FiGrid, FiGlobe, FiCpu, FiX, FiHelpCircle
} from 'react-icons/fi';
import { getUser, logout, hasRole, hasPermission, hasAdminPermission, hasAnyPermissions } from '../utils/auth';
import { authAPI } from '../services/api';
import { useSettings } from '../contexts/SettingsContext';
import useMediaQuery from '../utils/useMediaQuery';

const DEFAULT_MENU_ORDER = [
    'dashboard',
    'assets',
    'containers',
    'lendings',
    'error-reports',
    'help',
    'admin'
    // 'network' and 'accessories' will be added dynamically if enabled
];

const MENU_ITEMS_DATA = {
    'dashboard': { path: '/dashboard', label: 'Dashboard', icon: FiHome, color: '#3b82f6' },
    'assets': { path: '/assets', label: 'Geräte', icon: FiMonitor, color: '#eab308' },
    'containers': { path: '/containers', label: 'Container', icon: FiBox, color: '#f97316' },
    'lendings': { path: '/lendings', label: 'Ausleihen', icon: FiRepeat, color: '#8b5cf6' },
    'error-reports': { path: '/error-reports', label: 'Fehlermeldungen', icon: FiAlertCircle, color: '#ef4444', permission: 'errors.manage' },
    'network': { path: '/network', label: 'Netzwerk', icon: FiGlobe, color: '#10b981', permission: 'network.view', moduleKey: 'module_network_enabled' },
    'accessories': { path: '/accessories', label: 'Zubehör', icon: FiCpu, color: '#0ea5e9', permission: 'accessories.manage', moduleKey: 'module_accessories_enabled' },
    'help': { path: '/help', label: 'Hilfe', icon: FiHelpCircle, color: '#14b8a6' },
    'admin': { path: '/admin', label: 'Verwaltung', icon: FiSettings, color: '#6b7280', adminOnly: true }
};

function Sidebar({ isOpen, onClose, onProfileClick }) {
    const user = getUser();
    const location = useLocation();
    const { isMobile, isTablet } = useMediaQuery();
    const isSmallScreen = isMobile || isTablet;
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const { settings } = useSettings();
    const { org_name: orgName, logo_path: logoPath } = settings;

    // Load sidebar order: prefer backend-stored value from user object, fall back to localStorage
    const [menuOrder, setMenuOrder] = useState(() => {
        const savedUser = getUser();
        if (savedUser?.sidebar_order) {
            try { return JSON.parse(savedUser.sidebar_order); } catch (e) {}
        }
        const saved = localStorage.getItem('sidebar_order');
        return saved ? JSON.parse(saved) : DEFAULT_MENU_ORDER;
    });
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        setMenuOrder(prevOrder => {
            // 1. Identify which additional modules are enabled
            const enabledModules = Object.keys(MENU_ITEMS_DATA).filter(id => {
                const item = MENU_ITEMS_DATA[id];
                return item.moduleKey && settings[item.moduleKey] === 'true';
            });

            // 2. Remove anything that has a moduleKey but is NOT enabled
            let newOrder = prevOrder.filter(id => {
                const item = MENU_ITEMS_DATA[id];
                if (!item.moduleKey) return true; // Keep core items
                return settings[item.moduleKey] === 'true'; // Keep only enabled modules
            });

            // 3. Ensure all enabled modules are in the order
            enabledModules.forEach(id => {
                if (!newOrder.includes(id)) {
                    // Find logical placement (after containers or before admin)
                    const adminIndex = newOrder.indexOf('admin');
                    if (adminIndex !== -1) {
                        newOrder.splice(adminIndex, 0, id);
                    } else {
                        newOrder.push(id);
                    }
                }
            });

            // 4. Ensure all core items (no moduleKey) from DEFAULT_MENU_ORDER are present
            DEFAULT_MENU_ORDER.forEach(id => {
                if (!newOrder.includes(id) && MENU_ITEMS_DATA[id] && !MENU_ITEMS_DATA[id].moduleKey) {
                    const defIndex = DEFAULT_MENU_ORDER.indexOf(id);
                    if (defIndex === 0) {
                        newOrder.unshift(id);
                    } else {
                        const prevId = DEFAULT_MENU_ORDER[defIndex - 1];
                        const prevIndexInNew = newOrder.indexOf(prevId);
                        if (prevIndexInNew !== -1) {
                            newOrder.splice(prevIndexInNew + 1, 0, id);
                        } else {
                            newOrder.push(id);
                        }
                    }
                }
            });

            // 5. Clean up any invalid IDs
            newOrder = newOrder.filter(id => MENU_ITEMS_DATA[id]);

            // Save if changed
            if (JSON.stringify(newOrder) !== JSON.stringify(prevOrder)) {
                localStorage.setItem('sidebar_order', JSON.stringify(newOrder));
                return newOrder;
            }
            return prevOrder;
        });
    }, [settings]);

    // Always force dark mode
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }, []);

    const isActive = (path) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
    };

    const handleLinkClick = () => {
        if (isSmallScreen && onClose) {
            onClose();
        }
    };



    const handleDragStart = (e, id) => {
        // Prevent dragging for additional modules
        if (MENU_ITEMS_DATA[id]?.moduleKey) {
            e.preventDefault();
            return;
        }
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedItem === null) return;

        const currentIndex = menuOrder.indexOf(draggedItem);
        if (currentIndex === index) return;

        const newOrder = [...menuOrder];
        newOrder.splice(currentIndex, 1);
        newOrder.splice(index, 0, draggedItem);
        setMenuOrder(newOrder);
    };

    const handleDragEnd = async () => {
        setDraggedItem(null);
        // Also store locally for immediate reload fallback
        localStorage.setItem('sidebar_order', JSON.stringify(menuOrder));
        // Persist to backend so it survives cache clears
        try {
            await authAPI.updatePreferences({ sidebar_order: menuOrder });
            // Update stored user object
            const currentUser = getUser();
            if (currentUser) {
                const updated = { ...currentUser, sidebar_order: JSON.stringify(menuOrder) };
                localStorage.setItem('user', JSON.stringify(updated));
            }
        } catch (err) {
            console.error('Failed to save sidebar order to backend', err);
        }
    };

    const renderMenuItem = (id, index, skipModuleCheck = false) => {
        const item = MENU_ITEMS_DATA[id];
        if (!item) return null;

        // Check permissions
        if (item.adminOnly && !(hasRole('Administrator') || hasAdminPermission())) return null;
        if (item.permission && !hasPermission(item.permission)) return null;
        if (id !== 'dashboard' && !hasAnyPermissions()) return null;

        // Check if module is enabled (unless we are in the modules section)
        if (!skipModuleCheck && item.moduleKey && settings[item.moduleKey] !== 'true') return null;

        const Icon = item.icon;
        const active = isActive(item.path);
        return (
            <div
                key={id}
                draggable={!item.moduleKey}
                onDragStart={(e) => handleDragStart(e, id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                    ...styles.linkWrapper,
                    opacity: draggedItem === id ? 0.5 : 1,
                    cursor: 'grab'
                }}
            >
                <Link
                    to={item.path}
                    className={`sidebar-link${active ? ' sidebar-link--active' : ''}`}
                    style={active ? { ...styles.link, ...styles.activeLink } : styles.link}
                    onClick={handleLinkClick}
                >
                    <Icon size={20} style={{ color: item.color }} />
                    <span>{item.label}</span>
                </Link>
            </div>
        );
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isSmallScreen && isOpen && <div style={styles.backdrop} onClick={onClose} />}

            <aside className={`main-sidebar${isOpen ? ' is-open' : ''}`} style={styles.sidebar}>
                {/* Brand & Close Button for Mobile */}
                <div style={styles.brand}>
                    {isSmallScreen && (
                        <button onClick={onClose} style={styles.closeBtn}>
                            <FiX size={24} />
                        </button>
                    )}
                    {logoPath ? (
                        <div style={{ width: '60px', height: '60px', marginRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img
                                src={`/uploads/${logoPath}?t=${Date.now()}`}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                alt="Logo"
                            />
                        </div>
                    ) : (
                        <FiBox size={48} style={styles.brandIcon} />
                    )}
                    <div style={styles.brandText}>
                        <h2 style={styles.brandTitle}>MZ-MANAGER</h2>
                        <p style={styles.brandSubtitle}>{orgName}</p>
                    </div>
                </div>

                {/* User Dropdown Section */}
                <div style={styles.userDropdownContainer}>
                    <button
                        style={styles.userDropdownBtn}
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                    >
                        <div style={styles.userAvatar}>
                            <FiUser size={18} />
                        </div>
                        <div style={styles.userBriefInfo}>
                            <span style={styles.userBriefName}>
                                {user?.first_name || user?.last_name
                                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                    : user?.username}
                            </span>
                        </div>
                        <FiChevronDown
                            size={16}
                            style={{
                                transition: 'transform 0.2s',
                                transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                                opacity: 0.7
                            }}
                        />
                    </button>

                    {userMenuOpen && (
                        <div style={styles.dropdownMenu}>
                            <button
                                style={styles.dropdownItem}
                                onClick={() => {
                                    onProfileClick();
                                    setUserMenuOpen(false);
                                }}
                            >
                                <FiUser size={16} />
                                <span>Konto</span>
                            </button>
                            <div style={styles.dropdownDivider} />
                            <button
                                style={{ ...styles.dropdownItem, color: 'var(--color-error)' }}
                                onClick={logout}
                            >
                                <FiLogOut size={16} />
                                <span>Abmelden</span>
                            </button>
                        </div>
                    )}
                </div>


                {/* Navigation */}
                <nav style={styles.nav}>
                    <div style={styles.sectionHeader}>
                        <span>Schnellzugriff</span>
                        <FiMenu size={14} style={{ opacity: 0.5 }} />
                    </div>

                    {menuOrder
                        .filter(id => !MENU_ITEMS_DATA[id]?.moduleKey)
                        .map((id, index) => renderMenuItem(id, index))
                    }

                    {Object.keys(MENU_ITEMS_DATA).some(id => MENU_ITEMS_DATA[id].moduleKey && settings[MENU_ITEMS_DATA[id].moduleKey] === 'true') && (
                        <>
                            <div style={{ ...styles.sectionHeader, marginTop: '20px' }}>
                                <span>Zusätzliche Module</span>
                                <FiGrid size={14} style={{ opacity: 0.5 }} />
                            </div>
                            {Object.keys(MENU_ITEMS_DATA)
                                .filter(id => MENU_ITEMS_DATA[id].moduleKey && settings[MENU_ITEMS_DATA[id].moduleKey] === 'true')
                                .map((id, index) => renderMenuItem(id, index, true))
                            }
                        </>
                    )}
                </nav>
            </aside>
        </>
    );
}

const styles = {
    sidebar: {
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'transform var(--transition-base)'
    },
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        /* backdropFilter: 'blur(4px)', */ /* Removed glassy effect */
        zIndex: 999
    },
    brand: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '30px 20px',
        color: 'var(--sidebar-text)',
        position: 'relative'
    },
    closeBtn: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'transparent',
        border: 'none',
        color: 'var(--sidebar-text)',
        cursor: 'pointer',
        padding: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.7
    },
    brandIcon: {
        color: 'var(--color-primary)'
    },
    brandText: {
        marginTop: '15px'
    },
    brandTitle: {
        fontSize: '24px',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '1px',
        color: 'var(--sidebar-text)'
    },
    brandSubtitle: {
        fontSize: '12px',
        color: 'var(--sidebar-text-muted)',
        margin: 0,
        marginTop: '5px'
    },
    userDropdownContainer: {
        padding: '0 15px',
        marginBottom: '20px',
        position: 'relative'
    },
    userDropdownBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: 'var(--sidebar-hover)',
        border: '1px solid var(--sidebar-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--sidebar-text)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)'
    },
    userAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        background: '#e11d48',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    userBriefInfo: {
        flex: 1,
        textAlign: 'left',
        overflow: 'hidden'
    },
    userBriefName: {
        fontSize: '14px',
        fontWeight: 600,
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: 'var(--sidebar-text)'
    },
    nav: {
        flex: 1,
        padding: '0 10px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 10px 5px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--sidebar-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '5px'
    },
    linkWrapper: {
        marginBottom: '2px',
        transition: 'transform 0.1s ease'
    },
    link: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        padding: '10px 12px',
        color: 'var(--sidebar-text)',
        textDecoration: 'none',
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        fontSize: '15px',
        fontWeight: 400,
        userSelect: 'none'
    },
    activeLink: {
        background: 'var(--sidebar-active)',
        color: 'var(--sidebar-text)',
        fontWeight: 600
    },
    activeSubLink: {
        background: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--color-primary)',
        fontWeight: 600
    },
    subItemsContainer: {
        paddingLeft: '15px',
        marginTop: '2px',
        marginBottom: '5px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    subLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 15px',
        color: 'var(--sidebar-text-muted)',
        textDecoration: 'none',
        borderRadius: 'var(--radius-sm)',
        fontSize: '13px',
        transition: 'all var(--transition-fast)'
    },
    dropdownMenu: {
        position: 'absolute',
        top: 'calc(100% + 5px)',
        left: '15px',
        right: '15px',
        background: 'var(--sidebar-dropdown-bg)',
        border: '1px solid var(--sidebar-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 100,
        padding: '5px'
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--sidebar-text)',
        fontSize: '14px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all var(--transition-fast)'
    },
    dropdownDivider: {
        height: '1px',
        background: 'var(--sidebar-border)',
        margin: '5px 0'
    },
    divider: {
        height: '1px',
        background: 'var(--sidebar-border)',
        margin: '15px 10px'
    }
};

export default Sidebar;
