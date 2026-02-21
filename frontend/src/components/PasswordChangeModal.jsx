import { useState } from 'react';
import { authAPI } from '../services/api';
import { FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

function PasswordChangeModal({ user, onPasswordChanged }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Das Passwort muss mindestens 6 Zeichen lang sein');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein');
            return;
        }

        setLoading(true);
        try {
            await authAPI.changePassword({ newPassword });
            setSuccess(true);
            onPasswordChanged();
        } catch (err) {
            setError(err.response?.data?.error || 'Passwortänderung fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <FiLock size={24} color="#0056b3" />
                    <h2 style={styles.title}>Passwort ändern</h2>
                </div>

                <p style={styles.description}>
                    Ihr Administrator erfordert eine Passwortänderung bei der ersten Anmeldung.
                    Bitte wählen Sie ein neues, sicheres Passwort.
                </p>

                {error && (
                    <div style={styles.error}>
                        <FiAlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {success ? (
                    <div style={styles.success}>
                        <FiCheckCircle size={18} />
                        <span>Passwort erfolgreich geändert!</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Neues Passwort</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={styles.input}
                                autoFocus
                                className="modal-input"
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Passwort bestätigen</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={styles.input}
                                className="modal-input"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={styles.button}
                            className="modal-button"
                        >
                            {loading ? 'Speichern...' : 'Passwort speichern'}
                        </button>
                    </form>
                )}

                <style>{`
                    .modal-input:focus {
                        border-color: #0056b3 !important;
                    }
                    .modal-button:hover:not(:disabled) {
                        background-color: #004494 !important;
                    }
                `}</style>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
    },
    modal: {
        backgroundColor: 'var(--color-bg-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        width: '100%',
        maxWidth: '400px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-border)'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)'
    },
    title: {
        fontSize: 'var(--font-size-xl)',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        margin: 0
    },
    description: {
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        marginBottom: 'var(--space-xl)',
        lineHeight: '1.5'
    },
    error: {
        backgroundColor: 'hsla(0, 100%, 96%, 0.1)',
        color: 'var(--color-error)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        fontSize: 'var(--font-size-sm)',
        border: '1px solid var(--color-error)'
    },
    success: {
        backgroundColor: 'hsla(142, 71%, 45%, 0.1)',
        color: 'var(--color-success)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        fontSize: 'var(--font-size-sm)',
        border: '1px solid var(--color-success)'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)'
    },
    label: {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 500,
        color: 'var(--color-text-secondary)'
    },
    input: {
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-light)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--font-size-base)',
        outline: 'none',
        transition: 'all var(--transition-fast)'
    },
    button: {
        backgroundColor: 'var(--color-primary)',
        color: 'white',
        border: 'none',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-base)',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: 'var(--space-sm)',
        transition: 'all var(--transition-fast)'
    }
};

export default PasswordChangeModal;
