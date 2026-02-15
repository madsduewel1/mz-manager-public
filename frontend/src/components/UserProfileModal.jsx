import { useState } from 'react';
import { FiUser, FiLock, FiCheck, FiX, FiShield } from 'react-icons/fi';
import Modal from './Modal';
import { authAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

function UserProfileModal({ isOpen, onClose, user }) {
    const [view, setView] = useState('overview'); // overview, password
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const { success, error } = useNotification();

    if (!user) return null;

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword.length < 6) {
            error('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            error('Die Passwörter stimmen nicht überein.');
            return;
        }

        try {
            await authAPI.changePassword({ new_password: passwordData.newPassword });
            success('Passwort erfolgreich geändert.');
            setView('overview');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Ändern des Passworts.');
        }
    };

    const getRoleBadgeColor = (role) => {
        const lower = (role || '').toLowerCase();
        if (lower === 'administrator' || lower === 'admin') return 'badge-danger';
        if (lower === 'mediencoach') return 'badge-warning';
        if (lower === 'lehrer') return 'badge-info';
        if (lower === 'schüler' || lower === 'schueler') return 'badge-success';
        return 'badge-secondary';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={view === 'password' ? 'Passwort ändern' : 'Benutzerprofil'}
            footer={
                view === 'password' ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setView('overview');
                                setPasswordData({ newPassword: '', confirmPassword: '' });
                            }}
                            className="btn btn-secondary"
                        >
                            Abbrechen
                        </button>
                        <button type="submit" form="password-form" className="btn btn-primary">
                            Speichern
                        </button>
                    </>
                ) : (
                    <button onClick={onClose} className="btn btn-primary">
                        Schließen
                    </button>
                )
            }
        >
            {view === 'overview' ? (
                <div style={{ padding: '0 1rem' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginBottom: '2rem',
                        marginTop: '1rem'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'var(--color-bg-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem',
                            border: '2px solid var(--color-border)'
                        }}>
                            <FiUser size={40} color="var(--color-text-secondary)" />
                        </div>
                        <h2 style={{ margin: '0 0 0.5rem 0', textAlign: 'center', fontSize: '1.5rem' }}>{user.first_name || user.username} {user.last_name || ''}</h2>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {user.roles ? (
                                user.roles.map((r, idx) => (
                                    <span key={idx} className={`badge ${getRoleBadgeColor(r)}`}>{r}</span>
                                ))
                            ) : (
                                <span className={`badge ${getRoleBadgeColor(user.role)}`}>{user.role}</span>
                            )}
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'var(--color-bg-light)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div className="flex justify-between" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Benutzername:</span>
                            <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{user.username}</span>
                        </div>
                        {user.email && (
                            <div className="flex justify-between" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>E-Mail:</span>
                                <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{user.email}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Passwort:</span>
                            <button
                                onClick={() => setView('password')}
                                className="btn btn-sm btn-outline-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <FiLock size={14} /> Ändern
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <form id="password-form" onSubmit={handlePasswordChange}>
                    <div className="form-group">
                        <label className="form-label">Neues Passwort</label>
                        <input
                            type="password"
                            className="form-input"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="Mindestens 6 Zeichen"
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Passwort bestätigen</label>
                        <input
                            type="password"
                            className="form-input"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="Passwort wiederholen"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="alert alert-info mt-md">
                        <FiShield className="icon" />
                        <span>Nach dem Ändern bleiben Sie eingeloggt.</span>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default UserProfileModal;
