import { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiTrash2 } from 'react-icons/fi';
import { authAPI } from '../services/api';
import Modal from '../components/Modal';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const { error } = useNotification();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'Lehrer',
        first_name: '',
        last_name: ''
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await axios.get('/api/users', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setUsers(response.data);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            role: 'Lehrer',
            first_name: '',
            last_name: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return; // Prevent double submit
        setSubmitting(true);
        try {
            await authAPI.register(formData);
            setShowModal(false);
            loadUsers();
            setFormData({
                username: '',
                email: '',
                password: '',
                role: 'Lehrer',
                first_name: '',
                last_name: ''
            });
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="container"><div className="loading">Lade Benutzer...</div></div>;
    }

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-xl">
                <h1>Benutzerverwaltung</h1>
                <button onClick={openCreateModal} className="btn btn-primary">
                    <FiPlus />
                    Neuer Benutzer
                </button>
            </div>

            {users.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><FiUsers /></div>
                    <p>Keine Benutzer vorhanden</p>
                </div>
            ) : (
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Benutzername</th>
                                <th>E-Mail</th>
                                <th>Name</th>
                                <th>Rolle</th>
                                <th>Erstellt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td><strong>{user.username}</strong></td>
                                    <td>{user.email}</td>
                                    <td>{user.first_name} {user.last_name}</td>
                                    <td>
                                        {user.roles && user.roles.map((r, idx) => (
                                            <span key={idx} className="badge badge-info mr-xs">{r}</span>
                                        ))}
                                        {(!user.roles && user.role) && <span className="badge badge-info">{user.role}</span>}
                                    </td>
                                    <td className="text-small text-muted">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Neuer Benutzer"
                footer={
                    <>
                        <button onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={submitting}>Abbrechen</button>
                        <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Wird erstellt...' : 'Benutzer erstellen'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Benutzername *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">E-Mail *</label>
                        <input
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Passwort *</label>
                        <input
                            type="password"
                            className="form-input"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength="6"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Vorname</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Nachname</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.last_name}
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Rolle</label>
                        <select
                            className="form-input"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="Lehrer">Lehrer</option>
                            <option value="Mediencoach">Mediencoach</option>
                            <option value="Schüler">Schüler</option>
                            <option value="Administrator">Administrator</option>
                        </select>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Users;
