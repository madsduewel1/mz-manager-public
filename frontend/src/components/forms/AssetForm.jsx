import { useState, useEffect } from 'react';
import axios from 'axios';
import { assetsAPI, containersAPI } from '../../services/api';

const AssetForm = ({ assetId, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        inventory_number: '',
        serial_number: '',
        type: 'laptop',
        model: '',
        manufacturer: '',
        status: 'ok',
        container_id: ''
    });

    const [containers, setContainers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadContainers();
        loadModels();
        if (assetId) {
            loadAsset(assetId);
        }
    }, [assetId]);

    const loadAsset = async (id) => {
        setLoading(true);
        try {
            const response = await assetsAPI.getOne(id);
            const asset = response.data;
            setFormData({
                inventory_number: asset.inventory_number,
                serial_number: asset.serial_number || '',
                type: asset.type,
                model: asset.model || '',
                manufacturer: asset.manufacturer || '',
                status: asset.status,
                container_id: asset.container_id || ''
            });
        } catch (err) {
            console.error('Error loading asset:', err);
            setError('Fehler beim Laden des Geräts');
        } finally {
            setLoading(false);
        }
    };

    const loadContainers = async () => {
        try {
            const response = await containersAPI.getAll();
            setContainers(response.data);
        } catch (err) {
            console.error('Error loading containers:', err);
        }
    };

    const loadModels = async () => {
        try {
            const response = await axios.get('/api/admin/device-models', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setDeviceModels(response.data);
        } catch (err) {
            console.error('Error loading models:', err);
        }
    };

    const handleModelChange = (e) => {
        const selectedModelName = e.target.value;
        const modelData = deviceModels.find(m => m.model_name === selectedModelName);

        if (modelData) {
            setFormData({
                ...formData,
                model: modelData.model_name,
                manufacturer: modelData.manufacturer,
                type: modelData.type
            });
        } else {
            setFormData({ ...formData, model: selectedModelName });
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            if (assetId) {
                await assetsAPI.update(assetId, formData);
            } else {
                await assetsAPI.create(formData);
            }
            if (onSave) onSave();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Speichern');
        } finally {
            setSubmitting(true); // Parent will handle redirect, but we set to true to disable buttons
        }
    };

    // Expose handleSubmit to parent via ref or similar? 
    // Actually, EntityFormLayout handles the button, so we can use a ref or just common state.
    // For now, I'll export a way to trigger save or let parent use handleSubmit.

    if (loading) return <div className="loading">Wird geladen...</div>;

    return (
        <form id="entity-form" onSubmit={handleSubmit}>
            {error && (
                <div className="alert alert-danger mb-lg">
                    {error}
                </div>
            )}
            
            <div className="form-group">
                <label className="form-label">Inventarnummer *</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.inventory_number}
                    onChange={(e) => setFormData({ ...formData, inventory_number: e.target.value })}
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Modell (aus Verwaltung)</label>
                <select
                    className="form-select"
                    value={formData.model}
                    onChange={handleModelChange}
                >
                    <option value="">-- Modell wählen --</option>
                    {deviceModels.map(m => (
                        <option key={m.id} value={m.model_name}>
                            {m.manufacturer} {m.model_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Hersteller</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.manufacturer}
                    disabled={true}
                    placeholder="Wird automatisch ausgefüllt"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Typ</label>
                <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disabled={!!formData.model}
                >
                    <option value="laptop">Laptop</option>
                    <option value="ipad">iPad/Tablet</option>
                    <option value="pc">PC / Workstation</option>
                    <option value="apple_tv">Apple TV / Streaming</option>
                    <option value="beamer">Beamer / Projektor</option>
                    <option value="monitor">Monitor / Display</option>
                    <option value="dokumentenkamera">Dokumentenkamera</option>
                    <option value="drucker">Drucker</option>
                    <option value="lautsprecher">Lautsprecher</option>
                    <option value="mikrofon">Mikrofon</option>
                    <option value="kamera">Kamera</option>
                    <option value="sonstiges">Sonstiges</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Seriennummer</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Status</label>
                <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                    <option value="ok">OK</option>
                    <option value="defekt">Defekt</option>
                    <option value="in_reparatur">In Reparatur</option>
                    <option value="ausgemustert">Ausgemustert</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Container / Standort</label>
                <select
                    className="form-select"
                    value={formData.container_id}
                    onChange={(e) => setFormData({ ...formData, container_id: e.target.value })}
                >
                    <option value="">-- Kein Container / Standort --</option>
                    <optgroup label="Räume">
                        {containers.filter(c => c.type === 'raum').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Mobile Container (Wagen, Koffer, etc.)">
                        {containers.filter(c => c.type !== 'raum').map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                        ))}
                    </optgroup>
                </select>
            </div>
            
            {/* Hidden submit for parent to trigger via form.submit() if needed */}
            <button type="submit" style={{ display: 'none' }} />
        </form>
    );
};

export default AssetForm;
