import { useState, useEffect } from 'react';
import axios from 'axios';
import { assetsAPI, containersAPI } from '../../services/api';
import { FiCpu, FiMapPin, FiActivity, FiGlobe, FiShield, FiAlertCircle } from 'react-icons/fi';

const AssetForm = ({ assetId, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
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

    const validateMAC = (mac) => {
        if (!mac) return true;
        const regex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return regex.test(mac);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (formData.mac_address && !validateMAC(formData.mac_address)) {
            setError('Ungültige MAC-Adresse (Format: XX:XX:XX:XX:XX:XX)');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading">Wird geladen...</div>;

    const Section = ({ title, icon: Icon, children }) => (
        <div className="card mb-lg" style={{ overflow: 'visible' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ padding: '8px', background: 'rgba(55, 48, 163, 0.1)', color: 'var(--color-primary)', borderRadius: '10px' }}>
                    <Icon size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
            </div>
            <div className="card-body" style={{ padding: 'var(--space-lg)' }}>
                {children}
            </div>
        </div>
    );

    const Toggle = ({ label, description, checked, onChange }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border-light)' }}>
            <div>
                <div style={{ fontWeight: 600 }}>{label}</div>
                {description && <div className="text-muted text-xs">{description}</div>}
            </div>
            <label className="switch">
                <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
                <span className="slider round"></span>
            </label>
        </div>
    );

    return (
        <form id="entity-form" onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto' }}>
            {error && (
                <div className="alert alert-danger mb-lg" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiAlertCircle />
                    {error}
                </div>
            )}
            
            <Section title="Basisdaten" icon={FiCpu}>
                <div className="grid grid-2 grid-mobile-1">
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
                        <label className="form-label">Seriennummer</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.serial_number}
                            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-2 grid-mobile-1">
                    <div className="form-group">
                        <label className="form-label">Modell (aus Verwaltung)</label>
                        <select className="form-select" value={formData.model} onChange={handleModelChange}>
                            <option value="">-- Modell wählen --</option>
                            {deviceModels.map(m => (
                                <option key={m.id} value={m.model_name}>{m.manufacturer} {m.model_name}</option>
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
                </div>

                <div className="grid grid-2 grid-mobile-1">
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
                        <label className="form-label">MAC-Adresse</label>
                        <input
                            type="text"
                            className="form-input font-mono"
                            value={formData.mac_address}
                            onChange={(e) => setFormData({ ...formData, mac_address: e.target.value.toUpperCase() })}
                            placeholder="XX:XX:XX:XX:XX:XX"
                        />
                    </div>
                </div>
            </Section>

            <Section title="Standort & Status" icon={FiMapPin}>
                <div className="grid grid-2 grid-mobile-1">
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
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                            className="form-select"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="ok">🆗 OK</option>
                            <option value="defekt">❌ Defekt</option>
                            <option value="in_reparatur">🔧 In Reparatur</option>
                            <option value="ausgemustert">🗑️ Ausgemustert</option>
                        </select>
                    </div>
                </div>
            </Section>

            <Section title="Eigenschaften & Sichtbarkeit" icon={FiShield}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Toggle 
                        label="Defektmeldungen erlauben" 
                        description="Ermöglicht es Nutzern, dieses Gerät als defekt zu melden."
                        checked={formData.is_reportable}
                        onChange={val => setFormData({ ...formData, is_reportable: val })}
                    />
                    <Toggle 
                        label="Gerät ist ausleihbar" 
                        description="Zeigt dieses Gerät im Ausleih-Modul als verfügbar an."
                        checked={formData.is_lendable}
                        onChange={val => setFormData({ ...formData, is_lendable: val })}
                    />
                    <Toggle 
                        label="Im Netzwerk-Tool anzeigen" 
                        description="Integrierte das Gerät in die Netzwerk-Überwachung."
                        checked={formData.is_network_integrated}
                        onChange={val => setFormData({ ...formData, is_network_integrated: val })}
                    />
                </div>
            </Section>

            <button type="submit" style={{ display: 'none' }} />

            <style>{`
                .card {
                    background: var(--color-bg-light);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    transition: transform 0.2s;
                }
                .form-input:focus, .form-select:focus {
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 4px rgba(55, 48, 163, 0.1);
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 24px;
                }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #cbd5e1;
                    transition: .4s;
                    border-radius: 34px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px; width: 18px;
                    left: 3px; bottom: 3px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .slider { background-color: var(--color-primary); }
                input:checked + .slider:before { transform: translateX(24px); }
            `}</style>
        </form>
    );
};

export default AssetForm;
