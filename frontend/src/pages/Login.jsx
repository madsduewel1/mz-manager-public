import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { FiUser, FiLock, FiAlertCircle, FiMonitor } from 'react-icons/fi';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.login({ username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Anmeldung fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Animated background shapes */}
            <div style={styles.bgShape1}></div>
            <div style={styles.bgShape2}></div>
            <div style={styles.bgShape3}></div>

            <div style={styles.card}>
                {/* Gradient border effect via pseudo-element */}
                <div style={styles.cardInner}>
                    {/* Logo Area */}
                    <div style={styles.logoArea}>
                        <div style={styles.logoIcon}>
                            <FiMonitor size={32} />
                        </div>
                        <h1 style={styles.title}>MZ-Manager</h1>
                        <p style={styles.subtitle}>Medienzentrum Verwaltung</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={styles.error}>
                            <FiAlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <div style={styles.inputIcon}>
                                <FiUser size={18} />
                            </div>
                            <input
                                type="text"
                                placeholder="Benutzername"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                style={styles.input}
                                className="login-input"
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <div style={styles.inputIcon}>
                                <FiLock size={18} />
                            </div>
                            <input
                                type="password"
                                placeholder="Passwort"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={styles.input}
                                className="login-input"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                ...styles.button,
                                ...(loading ? styles.buttonLoading : {})
                            }}
                            className="login-btn"
                        >
                            {loading ? (
                                <span style={styles.spinner}></span>
                            ) : (
                                'Anmelden'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div style={styles.footer}>
                        <span>MZ-Manager v1.0</span>
                    </div>
                </div>
            </div>

            {/* CSS Keyframes injected via style tag */}
            <style>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(80px, -60px) rotate(90deg); }
                    50% { transform: translate(-40px, -120px) rotate(180deg); }
                    75% { transform: translate(-80px, -30px) rotate(270deg); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(-60px, 80px) rotate(-90deg); }
                    50% { transform: translate(50px, 40px) rotate(-180deg); }
                    75% { transform: translate(30px, -60px) rotate(-270deg); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0); }
                    33% { transform: translate(40px, -80px); }
                    66% { transform: translate(-60px, 40px); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(114, 137, 218, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(114, 137, 218, 0.6); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .login-input:focus {
                    border-color: hsl(227, 58%, 65%) !important;
                    box-shadow: 0 0 0 3px hsla(227, 58%, 65%, 0.15) !important;
                    outline: none;
                }
                .login-input::placeholder {
                    color: var(--color-text-muted, hsl(222, 10%, 50%));
                }
                .login-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(114, 137, 218, 0.4) !important;
                }
                .login-btn:active:not(:disabled) {
                    transform: translateY(0);
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, hsl(222, 26%, 6%) 0%, hsl(222, 22%, 12%) 50%, hsl(230, 20%, 10%) 100%)',
        position: 'relative',
        overflow: 'hidden'
    },
    bgShape1: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(227, 58%, 65%, 0.08) 0%, transparent 70%)',
        top: '-100px',
        right: '-100px',
        animation: 'float1 20s ease-in-out infinite'
    },
    bgShape2: {
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(270, 50%, 60%, 0.06) 0%, transparent 70%)',
        bottom: '-80px',
        left: '-80px',
        animation: 'float2 25s ease-in-out infinite'
    },
    bgShape3: {
        position: 'absolute',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(190, 60%, 50%, 0.05) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        animation: 'float3 18s ease-in-out infinite'
    },
    card: {
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        padding: '2px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, hsla(227, 58%, 65%, 0.3), hsla(270, 50%, 60%, 0.1), hsla(222, 20%, 25%, 0.3))',
        animation: 'fadeInUp 0.6s ease-out'
    },
    cardInner: {
        background: 'hsla(222, 22%, 12%, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '18px',
        padding: '40px 36px',
        border: '1px solid hsla(222, 20%, 30%, 0.3)'
    },
    logoArea: {
        textAlign: 'center',
        marginBottom: '32px'
    },
    logoIcon: {
        width: '68px',
        height: '68px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, hsl(227, 58%, 55%), hsl(227, 58%, 65%))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        color: 'white',
        animation: 'pulse 3s ease-in-out infinite',
        boxShadow: '0 0 20px rgba(114, 137, 218, 0.3)'
    },
    title: {
        fontSize: '26px',
        fontWeight: 700,
        color: 'hsl(0, 0%, 95%)',
        margin: '0 0 6px',
        letterSpacing: '-0.5px'
    },
    subtitle: {
        fontSize: '14px',
        color: 'hsl(222, 10%, 55%)',
        margin: 0,
        fontWeight: 400,
        letterSpacing: '0.5px'
    },
    error: {
        background: 'hsla(0, 70%, 50%, 0.12)',
        color: 'hsl(0, 84%, 68%)',
        padding: '12px 16px',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        border: '1px solid hsla(0, 70%, 50%, 0.2)'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    inputGroup: {
        position: 'relative'
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'hsl(222, 10%, 45%)',
        zIndex: 1,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center'
    },
    input: {
        width: '100%',
        padding: '14px 16px 14px 48px',
        background: 'hsla(222, 20%, 18%, 0.6)',
        border: '1px solid hsla(222, 20%, 30%, 0.4)',
        borderRadius: '12px',
        color: 'hsl(0, 0%, 90%)',
        fontSize: '15px',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, hsl(227, 58%, 55%), hsl(227, 58%, 65%))',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50px',
        boxShadow: '0 4px 15px rgba(114, 137, 218, 0.25)'
    },
    buttonLoading: {
        opacity: 0.8,
        cursor: 'wait'
    },
    spinner: {
        width: '20px',
        height: '20px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        display: 'inline-block',
        animation: 'spin 0.6s linear infinite'
    },
    footer: {
        textAlign: 'center',
        marginTop: '28px',
        fontSize: '12px',
        color: 'hsl(222, 10%, 40%)',
        letterSpacing: '0.3px'
    }
};

export default Login;
