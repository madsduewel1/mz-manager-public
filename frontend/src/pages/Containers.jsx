import { useState, useEffect } from 'react';
import { FiBox, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { containersAPI } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../components/Modal';
import BulkImportModal from '../components/BulkImportModal';
import { hasRole, hasPermission } from '../utils/auth';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useNotification } from '../contexts/NotificationContext';

function Containers() {
    const [containers, setContainers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const { confirm } = useConfirmation();
    const { success, error } = useNotification();
    const navigate = useNavigate();

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
            console.error('Delete error:', err);
            error(err.response?.data?.error || 'Fehler beim Löschen des Containers');
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
    }).sort((a, b) => {
        // 1. Nach Raum sortieren (alphabetisch, ohne Raum ans Ende)
        const roomA = (a.parent_name || a.location || '').toLowerCase();
        const roomB = (b.parent_name || b.location || '').toLowerCase();
        if (!roomA && roomB) return 1;
        if (roomA && !roomB) return -1;
        const roomCmp = roomA.localeCompare(roomB, 'de', { numeric: true, sensitivity: 'base' });
        if (roomCmp !== 0) return roomCmp;
        // 2. Innerhalb des Raums nach Name (alphanumerisch)
        return a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' });
    });

    const renderContainersWithGroups = () => {
        const rows = [];
        let lastGroup = null;

        filteredContainers.forEach((container) => {
            const groupName = container.parent_name || container.location || 'Nicht zugewiesen';

            if (groupName !== lastGroup) {
                rows.push(
                    <tr key={`group-${groupName}`} className="group-header" style={{ background: '#cbd5e1', borderBottom: '2px solid var(--color-border)' }}>
                        <td colSpan="5" style={{ padding: '8px 16px', fontWeight: 700, color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <FiBox style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            Standort: {groupName}
                        </td>
                    </tr>
                );
                lastGroup = groupName;
            }

            rows.push(
                <tr key={container.id}>
                    <td data-label="Name">
                        <Link to={`/containers/${container.name}`} style={{ fontWeight: 600 }}>
                            {container.name}
                        </Link>
                    </td>
                    <td data-label="Typ">
                        <span className="badge badge-info">{container.type}</span>
                    </td>
                    <td data-label="Standort">
                        {container.parent_name ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>Raum</span>
                                {container.parent_name}
                            </span>
                        ) : (
                            container.location || <span className="text-muted">Nicht zugewiesen</span>
                        )}
                    </td>
                    <td data-label="Geräte">
                        <span className="badge badge-secondary">{container.asset_count || 0}</span>
                    </td>
                    <td data-label="Aktionen" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Link
                                to={`/containers/${container.name}`}
                                className="btn btn-sm btn-secondary"
                                title="Details"
                            >
                                Details
                            </Link>
                            {hasPermission('containers.edit', 'containers.delete') && (
                                <>
                                    {hasPermission('containers.edit') && (
                                        <button
                                            onClick={() => navigate(`/containers/${container.id}/edit`)}
                                            className="btn btn-sm btn-secondary"
                                            title="Bearbeiten"
                                        >
                                            <FiEdit />
                                        </button>
                                    )}
                                    {hasPermission('containers.delete') && (
                                        <button
                                            onClick={() => handleDelete(container.id)}
                                            className="btn btn-sm btn-danger"
                                            title="Löschen"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </td>
                </tr>
            );
        });

        return rows;
    };

    if (loading) {
        return <div className="container"><div className="loading">Lade Container...</div></div>;
    }

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-xl">
                <h1>Container</h1>
                <div className="flex gap-md">
                    {hasPermission('containers.create') && (
                        <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">
                            Vorschau Import
                        </button>
                    )}
                    {hasPermission('containers.create') && (
                        <button onClick={() => navigate('/containers/new')} className="btn btn-primary">
                            <FiPlus />
                            Neuer Container
                        </button>
                    )}
                </div>
            </div>

            <BulkImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                type="containers" 
                onImportSuccess={loadContainers} 
            />

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
                    {containers.length === 0 && hasPermission('containers.create') && (
                        <button onClick={() => navigate('/containers/new')} className="btn btn-primary mt-lg">
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
                            {renderContainersWithGroups()}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Containers;
