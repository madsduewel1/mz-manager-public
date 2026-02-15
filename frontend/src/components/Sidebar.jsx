import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    FiHome, FiMonitor, FiBox, FiRepeat, FiAlertCircle,
    FiLogOut, FiSettings, FiUser, FiMoon, FiSun, FiChevronDown
} from 'react-icons/fi';
import { getUser, logout, hasRole, hasPermission, hasAdminPermission, hasAnyPermissions } from '../utils/auth';

function Sidebar({ isOpen, onClose, onProfileClick }) {
    const user = getUser();
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleLinkClick = () => {
        if (window.innerWidth <= 1024 && onClose) {
            onClose();
        }
    };

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        if (newMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    };

    // Apply theme on mount
    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && <div style={styles.backdrop} onClick={onClose} />}

            <aside style={{
                ...styles.sidebar,
                transform: isOpen || window.innerWidth > 1024 ? 'translateX(0)' : 'translateX(-100%)',
                boxShadow: isOpen ? 'var(--shadow-xl)' : styles.sidebar.boxShadow
            }}>
                {/* Brand */}
                <div style={styles.brand}>
                    <FiBox size={32} />
                    <div style={styles.brandText}>
                        <h2 style={styles.brandTitle}>MZ-Manager</h2>
                        <p style={styles.brandSubtitle}>Medienzentrum</p>
                    </div>
                </div>

                {/* User Dropdown Section (New Position) */}
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
                            <span style={styles.userUsername}>@{user?.username}</span>
                        </div>
                        <FiChevronDown
                            size={16}
                            style={{
                                transition: 'transform 0.2s',
                                transform: userMenuOpen ? 'rotate(180deg)' : 'none'
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
                            <button
                                style={styles.dropdownItem}
                                onClick={toggleDarkMode}
                            >
                                {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
                                <span>{darkMode ? 'Lightmode' : 'Darkmode'}</span>
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
                    <Link
                        to="/dashboard"
                        style={isActive('/dashboard') ? { ...styles.link, ...styles.activeLink } : styles.link}
                        onClick={handleLinkClick}
                    >
                        <FiHome size={20} />
                        <span>Dashboard</span>
                    </Link>

                    {hasAnyPermissions() && (
                        <>
                            <Link
                                to="/assets"
                                style={isActive('/assets') ? { ...styles.link, ...styles.activeLink } : styles.link}
                                onClick={handleLinkClick}
                            >
                                <FiMonitor size={20} />
                                <span>Geräte</span>
                            </Link>

                            <Link
                                to="/containers"
                                style={isActive('/containers') ? { ...styles.link, ...styles.activeLink } : styles.link}
                                onClick={handleLinkClick}
                            >
                                <FiBox size={20} />
                                <span>Container</span>
                            </Link>

                            <Link
                                to="/lendings"
                                style={isActive('/lendings') ? { ...styles.link, ...styles.activeLink } : styles.link}
                                onClick={handleLinkClick}
                            >
                                <FiRepeat size={20} />
                                <span>Ausleihen</span>
                            </Link>

                            {hasPermission('errors.manage') && (
                                <Link
                                    to="/error-reports"
                                    style={isActive('/error-reports') ? { ...styles.link, ...styles.activeLink } : styles.link}
                                    onClick={handleLinkClick}
                                >
                                    <FiAlertCircle size={20} />
                                    <span>Fehlermeldungen</span>
                                </Link>
                            )}

                            {(hasRole('Administrator') || hasAdminPermission()) && (
                                <Link
                                    to="/admin"
                                    style={isActive('/admin') ? { ...styles.link, ...styles.activeLink } : styles.link}
                                    onClick={handleLinkClick}
                                >
                                    <FiSettings size={20} />
                                    <span>Verwaltung</span>
                                </Link>
                            )}
                        </>
                    )}
                </nav>
            </aside>
        </>
    );
}

const styles = {
    sidebar: {
        width: '260px',
        height: '100vh',
        background: 'var(--color-bg-medium)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
        transition: 'transform var(--transition-base)'
    },
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 999
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-xl)',
        borderBottom: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)'
    },
    brandText: {
        flex: 1
    },
    brandTitle: {
        fontSize: 'var(--font-size-lg)',
        fontWeight: 700,
        margin: 0,
        color: 'var(--color-text-primary)'
    },
    brandSubtitle: {
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-secondary)',
        margin: 0,
        marginTop: '4px'
    },
    nav: {
        flex: 1,
        padding: 'var(--space-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        overflowY: 'auto'
    },
    link: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md)',
        color: 'var(--color-text-secondary)',
        textDecoration: 'none',
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        fontSize: 'var(--font-size-base)',
        fontWeight: 500
    },
    activeLink: {
        background: 'var(--color-primary)',
        color: 'var(--color-bg-dark)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    },
    userDropdownContainer: {
        padding: '0 var(--space-md)',
        marginTop: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
        position: 'relative'
    },
    userDropdownBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-sm)',
        background: 'var(--color-bg-light)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)'
    },
    userAvatar: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'var(--color-primary)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    userBriefInfo: {
        flex: 1,
        textAlign: 'left',
        overflow: 'hidden'
    },
    userBriefName: {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 600,
        display: 'block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: 'var(--color-text-primary)'
    },
    userUsername: {
        fontSize: '10px',
        color: 'var(--color-text-secondary)',
        display: 'block'
    },
    dropdownMenu: {
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 'var(--space-md)',
        right: 'var(--space-md)',
        background: 'var(--color-bg-medium)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 100,
        padding: 'var(--space-xs)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--transition-fast)'
    },
    dropdownDivider: {
        height: '1px',
        background: 'var(--color-border)',
        margin: 'var(--space-xs) 0'
    }
};

export default Sidebar;
