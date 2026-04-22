import { useState, useEffect } from 'react';
import { accessoriesAPI, assetsAPI } from '../../services/api';

const AccessoryForm = ({ accessoryId, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        inventory_number: '',
        serial_number: '',
        quantity: 1,
        status: 'ok',
        location: '',
        assigned_device_id: '',
        notes: ''
    });

    const [categories, setCategories] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, [accessoryId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [catRes, devRes] = await Promise.all([
                accessoriesAPI.getCategories(),
                assetsAPI.getAll()
            ]);
            setCategories(catRes.data);
            setDevices(devRes.data || []);

            if (accessoryId) {
                const accessories = await accessoriesAPI.getAccessories();
                const item = accessories.data.find(a => a.id === parseInt(accessoryId));
                if (item) {
                    setFormData({
                        name: item.name || '',
                        category: item.category || '',
                        inventory_number: item.inventory_number || '',
                        serial_number: item.serial_number || '',
                        quantity: item.quantity,
                        status: item.status || 'ok',
                        location: item.location || '',
                        assigned_device_id: item.assigned_device_id || '',
                        notes: item.notes || ''
                    });
                }
            }
        } catch (err) {
            console.error('Error loading accessory data:', err);
            setError('Fehler beim Laden der Daten');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        try {
            if (accessoryId) {
                await accessoriesAPI.updateAccessory(accessoryId, formData);
            } else {
                await accessoriesAPI.createAccessory(formData);
            }
            if (onSave) onSave();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    if (loading) return <div className="loading">Wird geladen...</div>;

    return (
        <form id="entity-form" onSubmit={handleSubmit} style={{ width: '100%' }}>
            {error && (
                <div className="alert alert-danger mb-lg">
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Bezeichnung *</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="grid grid-2 grid-mobile-1" style={{ gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Kategorie *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            placeholder="z.B. Kabel, Adapter..."
                            list="category-options"
                            required
                        />
                        <datalist id="category-options">
                            {categories.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Menge *</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                            min="0"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-2 grid-mobile-1" style={{ gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Inventarnummer</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.inventory_number}
                            onChange={e => setFormData({ ...formData, inventory_number: e.target.value })}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Seriennummer</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.serial_number}
                            onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                            placeholder="Optional"
                        />
                    </div>
                </div>

                <div className="grid grid-2 grid-mobile-1" style={{ gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Standort</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Zustand</label>
                        <select
                            className="form-select"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="ok">Ok</option>
                            <option value="defekt">Defekt</option>
                            <option value="in_reparatur">In Reparatur</option>
                            <option value="fehlt">Fehlt</option>
                        </select>
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Zugeordnetes Gerät (optional)</label>
                    <select
                        className="form-select"
                        value={formData.assigned_device_id || ''}
                        onChange={e => setFormData({ ...formData, assigned_device_id: e.target.value })}
                    >
                        <option value="">-- Kein Gerät zugewiesen --</option>
                        {devices.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.model || d.type} {d.inventory_number ? `(${d.inventory_number})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Notizen</label>
                    <textarea
                        className="form-input"
                        rows="3"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>
            </div>
            
            <button type="submit" style={{ display: 'none' }} />
        </form>
    );
};

export default AccessoryForm;
