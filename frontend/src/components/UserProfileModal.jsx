import { useState } from 'react';
import { FiUser, FiLock, FiCheck, FiX, FiShield, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Modal from './Modal';
import { authAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

function UserProfileModal({ isOpen, onClose, user }) {
    const [view, setView] = useState('overview'); // overview, password
    const [showPermissions, setShowPermissions] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
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
            await authAPI.changePassword({
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            success('Passwort erfolgreich geändert.');
            setView('overview');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Ändern des Passworts.');
        }
    };

    const permissionLabels = {
        'all': 'Vollzugriff (Administrator)',
        'assets.manage': 'Geräte verwalten',
        'assets.view': 'Geräte ansehen',
        'containers.manage': 'Container verwalten',
        'errors.manage': 'Fehler verwalten',
        'errors.create': 'Fehler melden',
        'lendings.manage': 'Ausleihen verwalten',
        'lendings.create': 'Ausleihen erstellen',
        'users.manage': 'Benutzer verwalten',
        'roles.manage': 'Rollen verwalten',
        'models.manage': 'Modelle verwalten',
        'rooms.manage': 'Räume verwalten',
        'qr.print': 'QR-Codes drucken',
        'logs.view': 'Logs einsehen'
    };

    const styles = {
        container: {
            padding: '0 var(--space-md)'
        },
        profileHeader: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 'var(--space-xl)',
            marginTop: 'var(--space-md)'
        },
        avatar: {
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-bg-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-md)',
            border: '1px solid var(--color-border)'
        },
        displayName: {
            margin: '0 0 var(--space-xs) 0',
            textAlign: 'center',
            fontSize: 'var(--font-size-xl)',
            fontWeight: 700,
            color: 'var(--color-text-primary)'
        },
        badgeList: {
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            justifyContent: 'center'
        },
        infoBox: {
            display: 'grid',
            gap: 'var(--space-md)',
            padding: 'var(--space-lg)',
            background: 'var(--color-bg-light)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            marginBottom: 'var(--space-md)'
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            flexWrap: 'wrap'
        },
        infoLabel: {
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)'
        },
        infoValue: {
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            wordBreak: 'break-all'
        },
        permissionsBox: {
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--color-bg-light)'
        },
        permissionsHeader: {
            width: '100%',
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
        },
        permissionsList: {
            padding: '0 var(--space-lg) var(--space-md) var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        permItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)'
        },
        actions: {
            marginTop: 'var(--space-xl)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)'
        }
    };

    const getRoleBadgeColor = (role) => {
        const lower = (role || '').toLowerCase();
        if (lower === 'administrator' || lower === 'admin') return 'badge-danger';
        return 'badge-info';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={view === 'password' ? 'Sicherheitseinstellungen' : 'Profil & Konto'}
            footer={
                view === 'password' ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setView('overview');
                                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                            className="btn btn-secondary"
                        >
                            Abbrechen
                        </button>
                        <button type="submit" form="password-form" className="btn btn-primary">
                            Bestätigen
                        </button>
                    </>
                ) : (
                    <button onClick={onClose} className="btn btn-primary">
                        Fertig
                    </button>
                )
            }
        >
            {view === 'overview' ? (
                <div style={styles.container}>
                    <div style={styles.profileHeader}>
                        <div style={styles.avatar}>
                            <FiUser size={40} color="var(--color-primary)" />
                        </div>
                        <h2 style={styles.displayName}>{user.first_name || user.username} {user.last_name || ''}</h2>
                        <div style={styles.badgeList}>
                            {user.roles ? (
                                user.roles.map((r, idx) => (
                                    <span key={idx} className={`badge ${getRoleBadgeColor(r)} `}>{r}</span>
                                ))
                            ) : (
                                <span className={`badge ${getRoleBadgeColor(user.role)} `}>{user.role}</span>
                            )}
                        </div>
                    </div>

                    <div style={styles.infoBox}>
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>Benutzerkennung:</span>
                            <span style={styles.infoValue}>{user.username}</span>
                        </div>
                        {user.email && (
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>E-Mail-Adresse:</span>
                                <span style={styles.infoValue}>{user.email}</span>
                            </div>
                        )}
                        <div style={styles.infoRow}>
                            <span style={styles.infoLabel}>ID:</span>
                            <span style={styles.infoValue}>#{user.id}</span>
                        </div>
                    </div>

                    <div style={styles.permissionsBox}>
                        <button
                            style={styles.permissionsHeader}
                            onClick={() => setShowPermissions(!showPermissions)}
                            className="perm-header-btn"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiShield size={16} color="var(--color-success)" />
                                Meine Berechtigungen
                            </div>
                            <div style={{ transition: 'transform 0.2s', transform: showPermissions ? 'rotate(180deg)' : 'rotate(0)' }}>
                                <FiChevronDown />
                            </div>
                        </button>

                        {showPermissions && (
                            <div style={styles.permissionsList}>
                                {user.permissions && user.permissions.length > 0 ? (
                                    user.permissions.map((p, idx) => (
                                        <div key={idx} style={styles.permItem}>
                                            <FiCheck size={14} color="var(--color-success)" />
                                            {permissionLabels[p] || p}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ ...styles.permItem, fontStyle: 'italic' }}>Keine spezifischen Berechtigungen zugewiesen</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={styles.actions}>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={() => setView('password')}
                        >
                            <FiLock className="icon" /> Passwort ändern
                        </button>
                    </div>
                </div>
            ) : (
                <form id="password-form" onSubmit={handlePasswordChange} style={{ padding: '0 var(--space-md)' }}>
                    <div className="form-group">
                        <label className="form-label">Aktuelles Passwort</label>
                        <input
                            type="password"
                            className="form-input"
                            value={passwordData.oldPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                            placeholder="Ihr derzeitiges Passwort"
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
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
                    <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label className="form-label">Neues Passwort bestätigen</label>
                        <input
                            type="password"
                            className="form-input"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="Wiederholen Sie das neue Passwort"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="alert alert-info mt-xl">
                        <FiShield className="icon" />
                        <span>Für Ihre Sicherheit ist die Eingabe des alten Passworts erforderlich.</span>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default UserProfileModal;
