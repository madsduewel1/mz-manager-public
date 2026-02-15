import { useState, useEffect } from 'react';
import { FiBox, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { containersAPI } from '../services/api';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Modal from '../components/Modal';
import { hasRole, hasPermission } from '../utils/auth';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useNotification } from '../contexts/NotificationContext';

function Containers() {
    const [containers, setContainers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingContainer, setEditingContainer] = useState(null);

    const { confirm } = useConfirmation();
    const { success, error } = useNotification();

    const [formData, setFormData] = useState({
        name: '',
        type: 'wagen',
        description: '',
        location: '',
        parent_container_id: null
    });

    useEffect(() => {
        loadContainers();
        loadRooms();
    }, []);

    const loadContainers = async () => {
        try {
            const response = await containersAPI.getAll();
            setContainers(response.data);
        } catch (err) {
            console.error('Error loading containers:', err);
            error('Fehler beim Laden der Container');
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async () => {
        try {
            const response = await axios.get('/api/admin/rooms', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setRooms(response.data);
        } catch (err) {
            console.error('Error loading rooms:', err);
        }
    };

    const openCreateModal = () => {
        setEditingContainer(null);
        setFormData({ name: '', type: 'wagen', description: '', location: '', parent_container_id: null });
        setShowModal(true);
    };

    const openEditModal = (container) => {
        setEditingContainer(container);
        setFormData({
            name: container.name,
            type: container.type,
            description: container.description || '',
            location: container.location || '',
            parent_container_id: container.parent_container_id
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingContainer) {
                await containersAPI.update(editingContainer.id, formData);
                success('Container aktualisiert');
            } else {
                await containersAPI.create(formData);
                success('Container erstellt');
            }
            setShowModal(false);
            loadContainers();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm({
            title: 'Container löschen',
            message: 'Möchten Sie diesen Container wirklich löschen?',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await containersAPI.delete(id);
            loadContainers();
            success('Container gelöscht');
        } catch (err) {
            error('Fehler beim Löschen');
        }
    };

    const [filterType, setFilterType] = useState('');
    const [filterRoom, setFilterRoom] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredContainers = containers.filter(container => {
        const matchesType = !filterType || container.type === filterType;
        const matchesRoom = !filterRoom || container.location === filterRoom;
        const matchesSearch = !searchQuery ||
            container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (container.description && container.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesType && matchesRoom && matchesSearch;
    });

    if (loading) {
        return <div className="container"><div className="loading">Lade Container...</div></div>;
    }

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-xl">
                <h1>Container</h1>
                {hasPermission('containers.manage') && (
                    <button onClick={openCreateModal} className="btn btn-primary">
                        <FiPlus />
                        Neuer Container
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="card mb-lg" style={{ padding: 'var(--space-md)' }}>
                <div className="grid grid-4 grid-mobile-1 items-center">
                    <div className="form-group mb-0">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Suchen (Name, Beschreibung)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <select
                            className="form-select"
                            value={filterRoom}
                            onChange={(e) => setFilterRoom(e.target.value)}
                        >
                            <option value="">Alle Räume</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.name}>{room.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <select
                            className="form-select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="">Alle Typen</option>
                            <option value="wagen">Wagen</option>
                            <option value="koffer">Koffer</option>
                            <option value="fach">Fach</option>
                            <option value="sonstiges">Sonstiges</option>
                        </select>
                    </div>
                    <div className="text-right text-muted text-small">
                        {filteredContainers.length} Container gefunden
                    </div>
                </div>
            </div>

            {filteredContainers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><FiBox /></div>
                    <p>Keine Container gefunden, die den Filtern entsprechen</p>
                    {containers.length === 0 && hasPermission('containers.manage') && (
                        <button onClick={openCreateModal} className="btn btn-primary mt-lg">
                            <FiPlus />
                            Ersten Container erstellen
                        </button>
                    )}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Typ</th>
                                <th>Standort</th>
                                <th>Geräte</th>
                                <th style={{ textAlign: 'right' }}>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContainers.map((container) => (
                                <tr key={container.id}>
                                    <td>
                                        <Link to={`/containers/${container.id}`} style={{ fontWeight: 600 }}>
                                            {container.name}
                                        </Link>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{container.type}</span>
                                    </td>
                                    <td>
                                        {container.parent_name ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>Raum</span>
                                                {container.parent_name}
                                            </span>
                                        ) : (
                                            container.location || <span className="text-muted">Nicht zugewiesen</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge badge-secondary">{container.asset_count || 0}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <Link
                                                to={`/containers/${container.id}`}
                                                className="btn btn-sm btn-secondary"
                                                title="Details"
                                            >
                                                Details
                                            </Link>
                                            {hasPermission('containers.manage') && (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(container)}
                                                        className="btn btn-sm btn-secondary"
                                                        title="Bearbeiten"
                                                    >
                                                        <FiEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(container.id)}
                                                        className="btn btn-sm btn-danger"
                                                        title="Löschen"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingContainer ? 'Container bearbeiten' : 'Neuer Container'}
                footer={
                    <>
                        <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                        <button onClick={handleSubmit} className="btn btn-primary">Speichern</button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="z.B. iPad-Wagen 7a"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Typ *</label>
                        <select
                            className="form-select"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            required
                        >
                            <option value="wagen">Wagen</option>
                            <option value="koffer">Koffer</option>
                            <option value="fach">Fach</option>
                            <option value="sonstiges">Sonstiges</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Standort (Raum)</label>
                        <select
                            className="form-select"
                            value={formData.parent_container_id || ''}
                            onChange={(e) => setFormData({ ...formData, parent_container_id: e.target.value || null })}
                        >
                            <option value="">-- Raum wählen (Optional) --</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.name} {room.building ? `(${room.building})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Beschreibung</label>
                        <textarea
                            className="form-textarea"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optionale Beschreibung..."
                            rows="3"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Containers;
