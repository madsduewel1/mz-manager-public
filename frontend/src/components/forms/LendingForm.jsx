import { useState, useEffect } from 'react';
import { lendingsAPI, assetsAPI, containersAPI, accessoriesAPI } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';

const LendingForm = ({ onSave, onCancel, generatePDF }) => {
    const { settings } = useSettings();
    const [assets, setAssets] = useState([]);
    const [containers, setContainers] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [activeLendings, setActiveLendings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        asset_id: '',
        container_id: '',
        accessory_id: '',
        borrower_name: '',
        borrower_type: 'klasse',
        start_date: new Date().toISOString().split('T')[0],
        planned_end_date: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [settings.module_accessories_enabled]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [lendingRes, assetRes, containerRes] = await Promise.all([
                lendingsAPI.getAll(),
                assetsAPI.getAll(),
                containersAPI.getAll()
            ]);

            setActiveLendings(lendingRes.data.filter(l => !l.returned));
            setAssets(assetRes.data.filter(a => a.status === 'ok' && a.is_lendable !== 0 && a.is_lendable !== false));
            setContainers(containerRes.data);

            if (settings.module_accessories_enabled === 'true') {
                const accRes = await accessoriesAPI.getAccessories();
                setAccessories(accRes.data.filter(a => a.status === 'ok'));
            }
        } catch (err) {
            console.error('Error loading lending form data:', err);
            setError('Fehler beim Laden der Daten');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        try {
            const response = await lendingsAPI.create(formData);
            if (generatePDF) {
                // Return data for PDF generation if needed
                if (onSave) onSave({ ...formData, id: response.data.lending_id });
            } else {
                if (onSave) onSave();
            }
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
                <label className="form-label">Was wird ausgeliehen? *</label>
                <select
                    className="form-select"
                    value={formData.asset_id ? 'asset' : formData.container_id ? 'container' : formData.accessory_id ? 'accessory' : ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                            ...formData,
                            asset_id: val === 'asset' ? (assets[0]?.id || '') : '',
                            container_id: val === 'container' ? (containers[0]?.id || '') : '',
                            accessory_id: val === 'accessory' ? (accessories[0]?.id || '') : ''
                        });
                    }}
                    required
                >
                    <option value="">Bitte wählen...</option>
                    <option value="asset">Einzelnes Gerät</option>
                    <option value="container">Container (Wagen)</option>
                    {settings.module_accessories_enabled === 'true' && (
                        <option value="accessory">Zubehör</option>
                    )}
                </select>
            </div>

            {formData.asset_id !== '' && (
                <div className="form-group">
                    <label className="form-label">Gerät *</label>
                    <select
                        className="form-select"
                        value={formData.asset_id}
                        onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                        required
                    >
                        <option value="">Gerät wählen...</option>
                        {assets
                            .filter(asset => !activeLendings.some(l => l.asset_id === asset.id))
                            .map(asset => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.inventory_number} - {asset.model}
                                </option>
                            ))}
                    </select>
                </div>
            )}

            {formData.container_id !== '' && (
                <div className="form-group">
                    <label className="form-label">Container *</label>
                    <select
                        className="form-select"
                        value={formData.container_id}
                        onChange={(e) => setFormData({ ...formData, container_id: e.target.value })}
                        required
                    >
                        <option value="">Container wählen...</option>
                        {containers
                            .filter(c => !activeLendings.some(l => l.container_id === c.id))
                            .map(container => (
                                <option key={container.id} value={container.id}>
                                    {container.name} - {container.location}
                                </option>
                            ))}
                    </select>
                </div>
            )}

            {formData.accessory_id !== '' && (
                <div className="form-group">
                    <label className="form-label">Zubehör *</label>
                    <select
                        className="form-select"
                        value={formData.accessory_id}
                        onChange={(e) => setFormData({ ...formData, accessory_id: e.target.value })}
                        required
                    >
                        <option value="">Zubehör wählen...</option>
                        {accessories
                            .filter(acc => !activeLendings.some(l => l.accessory_id === acc.id))
                            .map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.category})
                                </option>
                            ))}
                    </select>
                </div>
            )}

            <div className="grid grid-2 grid-mobile-1">
                <div className="form-group">
                    <label className="form-label">Entleiher *</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.borrower_name}
                        onChange={(e) => setFormData({ ...formData, borrower_name: e.target.value })}
                        placeholder="z.B. Klasse 10b, Max Mustermann"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Entleiher-Typ *</label>
                    <select
                        className="form-select"
                        value={formData.borrower_type}
                        onChange={(e) => setFormData({ ...formData, borrower_type: e.target.value })}
                        required
                    >
                        <option value="klasse">Klasse</option>
                        <option value="Lehrer">Lehrer</option>
                        <option value="Schüler">Schüler</option>
                        <option value="extern">Extern</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-2 grid-mobile-1">
                <div className="form-group">
                    <label className="form-label">Startdatum *</label>
                    <input
                        type="date"
                        className="form-input"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Geplantes Rückgabedatum *</label>
                    <input
                        type="date"
                        className="form-input"
                        value={formData.planned_end_date}
                        onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Notizen (optional)</label>
                <textarea
                    className="form-input"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Wird auf dem Leihvertrag angedruckt..."
                />
            </div>
            
            <button type="submit" style={{ display: 'none' }} />
        </form>
    );
};

export default LendingForm;
