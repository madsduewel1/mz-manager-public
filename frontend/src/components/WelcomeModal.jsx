import { useState } from 'react';
import { FiCheckCircle, FiShield, FiInfo, FiArrowRight } from 'react-icons/fi';
import axios from 'axios';
import Modal from './Modal';
import { useNotification } from '../contexts/NotificationContext';

function WelcomeModal({ user, onComplete }) {
    const [step, setStep] = useState(1);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { success, error } = useNotification();

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return error('Passwörter stimmen nicht überein');
        }
        if (newPassword.length < 6) {
            return error('Das Passwort muss mindestens 6 Zeichen lang sein');
        }

        setLoading(true);
        try {
            await axios.post('/api/auth/change-password',
                { newPassword },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            success('Passwort erfolgreich gesetzt!');
            onComplete();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Ändern des Passworts');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="text-center p-lg">
                        <div style={{ fontSize: '4rem', color: 'var(--color-primary)', marginBottom: 'var(--space-lg)' }}>
                            <FiInfo />
                        </div>
                        <h2 className="mb-md">Willkommen beim MZ-Manager, {user.first_name || user.username}!</h2>
                        <p className="mb-lg">
                            Dies ist das neue System zur Verwaltung unserer iPads, Laptops und Medienausstattung.
                            Hier kannst du Geräte suchen, Ausleihen verwalten und Defekte melden.
                        </p>
                        <button onClick={() => setStep(2)} className="btn btn-primary" style={{ width: '100%', gap: '10px' }}>
                            Weiter <FiArrowRight />
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div className="p-lg">
                        <div className="text-center mb-lg">
                            <div style={{ fontSize: '3rem', color: 'var(--color-warning)', marginBottom: 'var(--space-md)' }}>
                                <FiShield />
                            </div>
                            <h3>Sicherheit zuerst</h3>
                            <p className="text-muted">
                                Da dies deine erste Anmeldung ist, musst du bitte ein eigenes, sicheres Passwort setzen.
                            </p>
                        </div>
                        <form onSubmit={handlePasswordChange}>
                            <div className="form-group">
                                <label className="form-label">Neues Passwort</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mindestens 6 Zeichen"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Passwort bestätigen</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Passwort wiederholen"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                disabled={loading}
                            >
                                {loading ? 'Speichere...' : 'Passwort setzen & Starten'}
                            </button>
                        </form>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={() => { }} // Disallow closing without completing
            title={step === 1 ? "Willkommen" : "Passwort setzen"}
            size="md"
            hideCloseButton={true}
        >
            {renderStep()}
        </Modal>
    );
}

export default WelcomeModal;
