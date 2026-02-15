import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Modal from '../components/Modal';
import { useNotification } from '../contexts/NotificationContext';

function PasswordChangeModal({ isOpen, onClose, mandatory = false }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            error('Passwort muss mindestens 6 Zeichen lang sein');
            return;
        }

        if (newPassword !== confirmPassword) {
            error('Passwörter stimmen nicht überein');
            return;
        }

        try {
            await authAPI.changePassword({ new_password: newPassword });
            success('Passwort erfolgreich geändert');

            // Update user data in localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.must_change_password = false;
            localStorage.setItem('user', JSON.stringify(user));

            onClose();

            if (mandatory) {
                navigate('/dashboard');
                window.location.reload();
            }
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Ändern des Passworts');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={mandatory ? null : onClose}
            title={mandatory ? '⚠️ Passwort ändern erforderlich' : 'Passwort ändern'}
            footer={
                <>
                    {!mandatory && (
                        <button onClick={onClose} className="btn btn-secondary">Abbrechen</button>
                    )}
                    <button onClick={handleSubmit} className="btn btn-primary">Passwort ändern</button>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                {mandatory && (
                    <div style={{ background: 'var(--color-warning)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', color: 'var(--color-text)' }}>
                        <strong>Wichtig:</strong> Sie verwenden ein vorläufiges Passwort. Bitte ändern Sie es zu Ihrer Sicherheit.
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Neues Passwort *</label>
                    <input
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength="6"
                        required
                        autoFocus
                    />
                    <small className="text-muted">Mindestens 6 Zeichen</small>
                </div>

                <div className="form-group">
                    <label className="form-label">Passwort bestätigen *</label>
                    <input
                        type="password"
                        className="form-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength="6"
                        required
                    />
                </div>
            </form>
        </Modal>
    );
}

export default PasswordChangeModal;
