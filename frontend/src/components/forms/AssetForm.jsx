import { useState, useEffect } from 'react';
import axios from 'axios';
import { assetsAPI, containersAPI } from '../../services/api';
import { FiAlertCircle } from 'react-icons/fi';

const AssetForm = ({ assetId, onSave, onCancel, setSubmitting: setParentSubmitting }) => {
    const [formData, setFormData] = useState({
        name: '',
        inventory_number: '',
        serial_number: '',
        type: 'laptop',
        model: '',
        manufacturer: '',
        status: 'ok',
        container_id: '',
        mac_address: '',
        is_reportable: true,
        is_lendable: true,
        is_network_integrated: false
    });

    const [containers, setContainers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadContainers();
        loadModels();
        if (assetId) loadAsset(assetId);
    }, [assetId]);

    const loadAsset = async (id) => {
        setLoading(true);
        try {
            const response = await assetsAPI.getOne(id);
            const asset = response.data;
            setFormData({
                name: asset.name || '',
                inventory_number: asset.inventory_number || '',
                serial_number: asset.serial_number || '',
                type: asset.type || 'laptop',
                model: asset.model || '',
                manufacturer: asset.manufacturer || '',
                status: asset.status || 'ok',
                container_id: asset.container_id || '',
                mac_address: asset.mac_address || '',
                is_reportable: asset.is_reportable !== undefined ? !!asset.is_reportable : true,
                is_lendable: asset.is_lendable !== undefined ? !!asset.is_lendable : true,
                is_network_integrated: asset.is_network_integrated !== undefined ? !!asset.is_network_integrated : false
            });
        } catch (err) {
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
            setFormData({ ...formData, model: modelData.model_name, manufacturer: modelData.manufacturer, type: modelData.type });
        } else {
            setFormData({ ...formData, model: selectedModelName });
        }
    };

    const validateMAC = (mac) => {
        if (!mac) return true;
        return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (formData.mac_address && !validateMAC(formData.mac_address)) {
            setError('Ungültige MAC-Adresse (Format: XX:XX:XX:XX:XX:XX)');
            return;
        }
        setSubmitting(true);
        if (setParentSubmitting) setParentSubmitting(true);
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
            setSubmitting(false);
            if (setParentSubmitting) setParentSubmitting(false);
        }
    };

    if (loading) return <div className="loading">Wird geladen...</div>;

    return (
        <form id="entity-form" onSubmit={handleSubmit} style={{ width: '100%' }}>
            {error && (
                <div className="alert alert-danger mb-lg" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiAlertCircle />{error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

                <SectionTitle>Basisdaten</SectionTitle>

                <Row label="Bezeichnung / Name">
                    <input
                        type="text"
                        className="form-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="z.B. Klassen-iPad 01, Lehrer-Laptop..."
                    />
                </Row>

                <Row label="Inventarnummer" required>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.inventory_number}
                        onChange={e => setFormData({ ...formData, inventory_number: e.target.value })}
                        required
                    />
                </Row>

                <Row label="Seriennummer">
                    <input
                        type="text"
                        className="form-input"
                        value={formData.serial_number}
                        onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                </Row>

                <Row label="Modell (Verwaltung)">
                    <select className="form-select" value={formData.model} onChange={handleModelChange}>
                        <option value="">— Modell wählen —</option>
                        {deviceModels.map(m => (
                            <option key={m.id} value={m.model_name}>{m.manufacturer} {m.model_name}</option>
                        ))}
                    </select>
                </Row>

                <Row label="Hersteller">
                    <input
                        type="text"
                        className="form-input"
                        value={formData.manufacturer}
                        readOnly
                        placeholder="Wird automatisch ausgefüllt"
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                </Row>

                <Row label="Gerätetyp" required>
                    <select
                        className="form-select"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                        disabled={!!formData.model}
                    >
                        <option value="laptop">Laptop</option>
                        <option value="ipad">iPad / Tablet</option>
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
                </Row>

                <Row label="MAC-Adresse">
                    <input
                        type="text"
                        className="form-input"
                        value={formData.mac_address}
                        onChange={e => setFormData({ ...formData, mac_address: e.target.value.toUpperCase() })}
                        placeholder="XX:XX:XX:XX:XX:XX"
                        style={{ fontFamily: 'monospace' }}
                    />
                </Row>

                <SectionTitle>Standort & Status</SectionTitle>

                <Row label="Container / Standort">
                    <select
                        className="form-select"
                        value={formData.container_id}
                        onChange={e => setFormData({ ...formData, container_id: e.target.value })}
                    >
                        <option value="">— Kein Container / Standort —</option>
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
                </Row>

                <Row label="Status" required>
                    <select
                        className="form-select"
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                        <option value="ok">OK</option>
                        <option value="defekt">Defekt</option>
                        <option value="in_reparatur">In Reparatur</option>
                        <option value="ausgemustert">Ausgemustert</option>
                    </select>
                </Row>

                <SectionTitle>Eigenschaften</SectionTitle>

                <Toggle
                    label="Defektmeldungen"
                    description="Nutzer können dieses Gerät melden"
                    checked={formData.is_reportable}
                    onChange={val => setFormData({ ...formData, is_reportable: val })}
                />
                <Toggle
                    label="Ausleihbar"
                    description="Im Ausleih-Modul sichtbar"
                    checked={formData.is_lendable}
                    onChange={val => setFormData({ ...formData, is_lendable: val })}
                />
                <Toggle
                    label="Netzwerk-Tool"
                    description="In Netzwerk-Überwachung integrieren"
                    checked={formData.is_network_integrated}
                    onChange={val => setFormData({ ...formData, is_network_integrated: val })}
                />

                {/* Spacer at bottom */}
                <div style={{ height: '8px' }} />
            </div>

            <button type="submit" style={{ display: 'none' }} />

            <style>{`
                .af-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 22px;
                }
                .af-switch input { opacity: 0; width: 0; height: 0; }
                .af-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: var(--color-border);
                    border-radius: 22px;
                    transition: 0.3s;
                }
                .af-slider::before {
                    content: '';
                    position: absolute;
                    width: 16px; height: 16px;
                    left: 3px; bottom: 3px;
                    background: white;
                    border-radius: 50%;
                    transition: 0.3s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .af-switch input:checked + .af-slider { background: var(--color-primary); }
                .af-switch input:checked + .af-slider::before { transform: translateX(22px); }

                @media (max-width: 600px) {
                    [style*="gridTemplateColumns: 180px"] {
                        grid-template-columns: 1fr !important;
                    }
                    [style*="textAlign: right"] {
                        text-align: left !important;
                    }
                }
            `}</style>
        </form>
    );
};

// Reusable row: label left, input right
const Row = ({ label, required, children }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px 0'
    }}>
        <label style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
            {label}{required && <span style={{ color: 'var(--color-error)', marginLeft: 4 }}>*</span>}
        </label>
        <div style={{ width: '100%' }}>{children}</div>
    </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '14px 0',
        borderBottom: '1px solid var(--color-border)'
    }}>
        <div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{label}</div>
            {description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</div>}
        </div>
        <label className="af-switch">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className="af-slider"></span>
        </label>
    </div>
);

const SectionTitle = ({ children }) => (
    <div style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--color-text-secondary)',
        padding: '32px 0 8px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '16px'
    }}>
        {children}
    </div>
);

export default AssetForm;
