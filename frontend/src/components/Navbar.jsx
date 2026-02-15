import { Link } from 'react-router-dom';
import { FiHome, FiMonitor, FiBox, FiRepeat, FiAlertCircle, FiLogOut, FiSettings } from 'react-icons/fi';
import { getUser, logout, hasRole } from '../utils/auth';

function Navbar() {
    const user = getUser();

    return (
        <nav style={styles.nav}>
            <div className="container" style={styles.container}>
                <Link to="/" style={styles.brand}>
                    <FiBox size={24} />
                    <span>MZ-Manager</span>
                </Link>

                <div style={styles.links}>
                    <Link to="/dashboard" style={styles.link}>
                        <FiHome size={18} />
                        Dashboard
                    </Link>
                    <Link to="/assets" style={styles.link}>
                        <FiMonitor size={18} />
                        Geräte
                    </Link>
                    <Link to="/containers" style={styles.link}>
                        <FiBox size={18} />
                        Container
                    </Link>
                    <Link to="/lendings" style={styles.link}>
                        <FiRepeat size={18} />
                        Ausleihen
                    </Link>
                    {hasRole('Administrator', 'Mediencoach') && (
                        <Link to="/error-reports" style={styles.link}>
                            <FiAlertCircle size={18} />
                            Fehlermeldungen
                        </Link>
                    )}
                    {hasRole('Administrator') && (
                        <Link to="/admin" style={styles.link}>
                            <FiSettings size={18} />
                            Verwaltung
                        </Link>
                    )}
                </div>

                <div style={styles.userSection}>
                    <span style={styles.username}>{user?.username}</span>
                    <span className="badge badge-info">{user?.roles ? user.roles.join(', ') : user?.role}</span>
                    <button onClick={logout} style={styles.logoutBtn} className="btn btn-sm btn-secondary">
                        <FiLogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

const styles = {
    nav: {
        background: 'var(--color-bg-medium)',
        borderBottom: '1px solid var(--color-border)',
        padding: 'var(--space-md) 0',
        position: 'sticky',
        top: 0,
        zIndex: 100
    },
    container: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-xl)'
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        fontSize: 'var(--font-size-xl)',
        fontWeight: 700,
        color: 'var(--color-primary-light)',
        textDecoration: 'none'
    },
    links: {
        display: 'flex',
        gap: 'var(--space-lg)',
        flex: 1
    },
    link: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        color: 'var(--color-text-secondary)',
        textDecoration: 'none',
        fontSize: 'var(--font-size-base)',
        transition: 'color var(--transition-fast)'
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)'
    },
    username: {
        color: 'var(--color-text-secondary)'
    },
    logoutBtn: {
        marginLeft: 'var(--space-sm)'
    }
};

export default Navbar;
