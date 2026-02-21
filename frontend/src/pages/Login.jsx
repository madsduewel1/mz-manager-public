import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiUser, FiLock, FiAlertCircle, FiMonitor, FiSun, FiMoon } from 'react-icons/fi';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        const theme = newMode ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.login({ username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Sync theme to backend on login
            const currentTheme = localStorage.getItem('theme') || 'light';
            try {
                // We use a temporary instance or just the same config as its already set in localStorage
                await authAPI.updateTheme(currentTheme);
            } catch (e) { console.error('Theme sync failed', e); }

            if (onLogin) onLogin(response.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Anmeldung fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <button onClick={toggleTheme} style={styles.themeToggle} title="Farbschema ändern">
                {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>

            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.logoWrapper}>
                        <FiMonitor size={32} color="var(--color-text-on-primary)" />
                    </div>
                    <h1 style={styles.headerTitle}>MZ-Manager</h1>
                    <p style={styles.subtitle}>Medienzentrum Management System</p>
                </div>

                {error && (
                    <div style={styles.error}>
                        <FiAlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputBox}>
                        <label style={styles.label}>Benutzername</label>
                        <div style={styles.inputWrapper}>
                            <div style={styles.inputIcon}>
                                <FiUser size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Benutzername"
                                required
                                autoFocus
                                style={styles.input}
                                className="login-input"
                            />
                        </div>
                    </div>

                    <div style={styles.inputBox}>
                        <label style={styles.label}>Passwort</label>
                        <div style={styles.inputWrapper}>
                            <div style={styles.inputIcon}>
                                <FiLock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Passwort"
                                required
                                style={styles.input}
                                className="login-input"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={styles.submitBtn}
                        className="login-submit-btn"
                    >
                        {loading ? 'Identität wird geprüft...' : 'Anmelden'}
                    </button>
                </form>

                <div style={styles.footer}>
                    <button
                        onClick={() => navigate('/report')}
                        style={styles.reportBtn}
                        className="login-report-btn"
                    >
                        <FiAlertCircle size={16} />
                        Problem ohne Login melden
                    </button>
                    <div style={{ marginTop: '20px' }}>MZ-Manager • v2.0</div>
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .login-input:focus {
                    background: var(--color-bg-medium) !important;
                    border-color: var(--color-primary) !important;
                    box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.1);
                }
                .login-input::placeholder {
                    color: var(--color-text-tertiary);
                    opacity: 0.6;
                }
                .login-submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px rgba(225, 29, 72, 0.4);
                    filter: brightness(1.1);
                }
                .login-submit-btn:active:not(:disabled) {
                    transform: translateY(0);
                }
                .login-submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    filter: grayscale(1);
                }
                .login-report-btn:hover {
                    color: var(--color-primary) !important;
                    background: var(--color-bg-light) !important;
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'var(--color-bg-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-family)'
    },
    bgGradient: {
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, hsla(220, 100%, 50%, 0.15) 0%, transparent 70%)',
        zIndex: 0
    },
    bgGradientBottom: {
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, hsla(340, 100%, 50%, 0.1) 0%, transparent 70%)',
        zIndex: 0
    },
    themeToggle: {
        position: 'fixed',
        top: '30px',
        right: '30px',
        background: 'var(--color-bg-medium)',
        border: '1px solid var(--color-border)',
        borderRadius: '50%',
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--color-text-primary)',
        transition: 'all var(--transition-base)',
        zIndex: 10,
        boxShadow: 'var(--shadow-sm)'
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        background: 'var(--color-bg-medium)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        padding: 'var(--space-2xl) var(--space-xl)',
        position: 'relative',
        zIndex: 1
    },
    header: {
        textAlign: 'center',
        marginBottom: 'var(--space-2xl)'
    },
    logoWrapper: {
        width: '64px',
        height: '64px',
        background: 'var(--color-primary)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto var(--space-lg)',
        boxShadow: '0 8px 16px rgba(225, 29, 72, 0.2)'
    },
    headerTitle: {
        fontSize: '28px',
        fontWeight: 800,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em',
        margin: 0
    },
    subtitle: {
        fontSize: '14px',
        color: 'var(--color-text-tertiary)',
        marginTop: '8px'
    },
    error: {
        background: 'var(--color-error-light)',
        border: '1px solid var(--color-error)',
        color: 'var(--color-error)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        animation: 'shake 0.4s ease'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    },
    inputBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginLeft: '4px'
    },
    inputWrapper: {
        position: 'relative'
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--color-text-tertiary)',
        display: 'flex'
    },
    input: {
        width: '100%',
        background: 'var(--color-bg-light)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px 14px 48px',
        color: 'var(--color-text-primary)',
        fontSize: '15px',
        outline: 'none',
        transition: 'all var(--transition-base)',
        boxSizing: 'border-box'
    },
    submitBtn: {
        background: 'var(--color-primary)',
        color: 'var(--color-text-on-primary)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: 'none',
        fontSize: '16px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all var(--transition-base)',
        marginTop: '12px',
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)'
    },
    footer: {
        marginTop: '30px',
        fontSize: '12px',
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    reportBtn: {
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        padding: '10px 20px',
        borderRadius: 'var(--radius-lg)',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all var(--transition-base)'
    }
};

export default Login;
