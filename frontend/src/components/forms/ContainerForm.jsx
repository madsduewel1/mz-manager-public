import { useState, useEffect } from 'react';
import axios from 'axios';
import { containersAPI } from '../../services/api';

const ContainerForm = ({ containerId, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'wagen',
        description: '',
        location: '',
        parent_container_id: null
    });

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRooms();
        if (containerId) {
            loadContainer(containerId);
        }
    }, [containerId]);

    const loadContainer = async (id) => {
        setLoading(true);
        try {
            const response = await containersAPI.getOne(id);
            const container = response.data;
            setFormData({
                name: container.name,
                type: container.type,
                description: container.description || '',
                location: container.location || '',
                parent_container_id: container.parent_container_id
            });
        } catch (err) {
            console.error('Error loading container:', err);
            setError('Fehler beim Laden des Containers');
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

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        try {
            if (containerId) {
                await containersAPI.update(containerId, formData);
            } else {
                await containersAPI.create(formData);
            }
            if (onSave) onSave();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    if (loading) return <div className="loading">Wird geladen...</div>;

    return (
        <form id="entity-form" onSubmit={handleSubmit}>
            {error && (
                <div className="alert alert-danger mb-lg">
                    {error}
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Typ</label>
                <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="wagen">Wagen</option>
                    <option value="koffer">Koffer</option>
                    <option value="fach">Fach</option>
                    <option value="sonstiges">Sonstiges</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Raum / Standort (optional)</label>
                <select
                    className="form-select"
                    value={formData.parent_container_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_container_id: e.target.value || null })}
                >
                    <option value="">-- Kein Raum zugewiesen --</option>
                    {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Zusätzliche Standort-Info (z.B. Schranknummer)</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Optional"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Beschreibung</label>
                <textarea
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                />
            </div>
            
            <button type="submit" style={{ display: 'none' }} />
        </form>
    );
};

export default ContainerForm;
