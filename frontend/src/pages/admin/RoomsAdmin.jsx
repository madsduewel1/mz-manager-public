import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiMoreVertical, FiBox, FiMapPin } from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import BulkImportModal from '../../components/BulkImportModal';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';

const RoomsAdmin = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [roomForm, setRoomForm] = useState({
        name: '', building: '', floor: '', capacity: ''
    });

    const { success, error } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => {
        loadRooms();
        const handleClickOutside = () => setActiveActionMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getRooms();
            setRooms(response.data);
        } catch (err) {
            error('Fehler beim Laden der Räume');
        } finally {
            setLoading(false);
        }
    };

    const toggleActionMenu = (e, roomId) => {
        if (e) e.stopPropagation();
        setActiveActionMenu(activeActionMenu === roomId ? null : roomId);
    };

    const handleRoomSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            await adminAPI.createRoom(roomForm);
            success('Raum erstellt');
            setShowModal(false);
            setRoomForm({ name: '', building: '', floor: '', capacity: '' });
            loadRooms();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteRoom = async (id) => {
        const confirmed = await confirm({
            title: 'Raum löschen',
            message: 'Möchten Sie diesen Raum wirklich löschen?',
            confirmLabel: 'Löschen',
            confirmColor: 'var(--color-error)'
        });
        if (!confirmed) return;
        try {
            await adminAPI.deleteRoom(id);
            success('Raum gelöscht');
            loadRooms();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    const exportQR = (roomId) => {
        const url = `/api/admin/export/qr-pdf/${roomId}?token=${localStorage.getItem('token')}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">Raumverwaltung</h2>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">Import</button>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <FiPlus /> Neuer Raum
                    </button>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Gebäude</th>
                            <th>Etage</th>
                            <th>Kapazität</th>
                            <th style={{ textAlign: 'right' }}>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...rooms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(room => (
                            <tr key={room.id}>
                                <td style={{ fontWeight: 600 }}>{room.name}</td>
                                <td>{room.building || '-'}</td>
                                <td>{room.floor || '-'}</td>
                                <td>{room.capacity ? `${room.capacity} Personen` : '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-sm btn-secondary" onClick={() => exportQR(room.id)} title="QR-Code PDF"><FiBox /> PDF</button>
                                        <div className="action-menu-container">
                                            <button className="action-menu-btn" onClick={(e) => toggleActionMenu(e, room.id)}><FiMoreVertical /></button>
                                            {activeActionMenu === room.id && (
                                                <div className="action-menu-dropdown">
                                                    <button onClick={() => deleteRoom(room.id)} className="dropdown-item text-danger"><FiTrash2 /> Löschen</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rooms.length === 0 && (
                            <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Räume vorhanden</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Neuer Raum"
                    footer={<><button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                    <button onClick={handleRoomSubmit} className="btn btn-primary" disabled={submitting}>Erstellen</button></>}>
                    <form onSubmit={handleRoomSubmit}>
                        <div className="form-group"><label className="form-label">Raumname *</label><input type="text" className="form-input" value={roomForm.name} onChange={(e) => setRoomForm({...roomForm, name: e.target.value})} required /></div>
                        <div className="form-group"><label className="form-label">Gebäude</label><input type="text" className="form-input" value={roomForm.building} onChange={(e) => setRoomForm({...roomForm, building: e.target.value})} /></div>
                        <div className="form-group"><label className="form-label">Etage</label><input type="text" className="form-input" value={roomForm.floor} onChange={(e) => setRoomForm({...roomForm, floor: e.target.value})} /></div>
                        <div className="form-group"><label className="form-label">Kapazität</label><input type="number" className="form-input" value={roomForm.capacity} onChange={(e) => setRoomForm({...roomForm, capacity: e.target.value})} /></div>
                    </form>
                </Modal>
            )}

            <BulkImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} type="rooms" onImportSuccess={loadRooms} />
        </div>
    );
};

export default RoomsAdmin;
