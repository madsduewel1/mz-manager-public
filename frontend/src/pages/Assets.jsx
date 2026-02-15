import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiPackage, FiEdit, FiTrash2, FiCamera } from 'react-icons/fi';
import { assetsAPI, containersAPI } from '../services/api';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import QRScanner from '../components/QRScanner';
import { hasRole, hasPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';

function Assets() {
    const [assets, setAssets] = useState([]);
    const [containers, setContainers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const { success, error } = useNotification();

    // Form state
    const [formData, setFormData] = useState({
        inventory_number: '',
        serial_number: '',
        type: 'laptop',
        model: '',
        manufacturer: '',
        status: 'ok',
        container_id: ''
    });

    const [filterContainer, setFilterContainer] = useState('');
    const [filterType, setFilterType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadAssets();
        loadContainers();
        loadModels();
    }, []);

    const filteredAssets = assets.filter(asset => {
        const matchesContainer = !filterContainer || asset.container_id === parseInt(filterContainer);
        const matchesType = !filterType || asset.type === filterType;
        const matchesSearch = !searchQuery ||
            asset.inventory_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.model && asset.model.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesContainer && matchesType && matchesSearch;
    });

    const loadAssets = async () => {
        try {
            const response = await assetsAPI.getAll();
            setAssets(response.data);
        } catch (err) {
            console.error('Error loading assets:', err);
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

    const openCreateModal = () => {
        setEditingAsset(null);
        setFormData({
            inventory_number: '',
            serial_number: '',
            type: 'laptop',
            model: '',
            manufacturer: '',
            status: 'ok',
            container_id: ''
        });
        setShowModal(true);
    };

    const openEditModal = (asset) => {
        setEditingAsset(asset);
        setFormData({
            inventory_number: asset.inventory_number,
            serial_number: asset.serial_number || '',
            type: asset.type,
            model: asset.model || '',
            manufacturer: asset.manufacturer || '',
            status: asset.status,
            container_id: asset.container_id || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAsset) {
                await assetsAPI.update(editingAsset.id, formData);
            } else {
                await assetsAPI.create(formData);
            }
            setShowModal(false);
            loadAssets();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm({
            title: 'Gerät löschen',
            message: 'Möchten Sie dieses Gerät wirklich löschen?',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await assetsAPI.delete(id);
            loadAssets();
            success('Gerät gelöscht');
        } catch (err) {
            error('Fehler beim Löschen');
        }
    };

    const handleQRScan = async (qrCode) => {
        try {
            const response = await assetsAPI.lookupByQR(qrCode);
            if (response.data && response.data.id) {
                success(`Gerät gefunden: ${response.data.inventory_number}`);
                navigate(`/assets/${response.data.id}`);
            }
        } catch (err) {
            if (err.response?.status === 404) {
                error('QR-Code gehört zu keinem bekannten Gerät');
            } else {
                error('Fehler beim Suchen des Geräts');
            }
            setShowScanner(false);
        }
    };

    if (loading) {
        return <div className="container"><div className="loading">Lade Geräte...</div></div>;
    }

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-xl">
                <h1>Geräte</h1>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button onClick={() => setShowScanner(true)} className="btn btn-secondary">
                        <FiCamera />
                        QR-Code scannen
                    </button>
                    {hasPermission('assets.manage') && (
                        <button onClick={openCreateModal} className="btn btn-primary">
                            <FiPlus />
                            Neues Gerät
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card mb-lg" style={{ padding: 'var(--space-md)' }}>
                <div className="grid grid-4 grid-mobile-1 items-center">
                    <div className="form-group mb-0">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Suchen (Inventarnummer, Modell)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <select
                            className="form-select"
                            value={filterContainer}
                            onChange={(e) => setFilterContainer(e.target.value)}
                        >
                            <option value="">Alle Standorte</option>
                            {containers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
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
                    <div className="text-right text-muted text-small">
                        {filteredAssets.length} Geräte gefunden
                    </div>
                </div>
            </div>

            {filteredAssets.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><FiPackage /></div>
                    <p>Keine Geräte gefunden, die den Filtern entsprechen</p>
                    {assets.length === 0 && hasPermission('assets.manage') && (
                        <button onClick={openCreateModal} className="btn btn-primary mt-lg">
                            <FiPlus />
                            Erstes Gerät erstellen
                        </button>
                    )}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Inventarnummer</th>
                                <th>Typ</th>
                                <th>Modell / Hersteller</th>
                                <th>Status</th>
                                <th>Standort</th>
                                <th style={{ textAlign: 'right' }}>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssets.map((asset) => (
                                <tr key={asset.id}>
                                    <td>
                                        <Link to={`/assets/${asset.id}`} style={{ fontWeight: 600 }}>
                                            {asset.inventory_number}
                                        </Link>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{asset.type}</span>
                                    </td>
                                    <td>
                                        <div className="text-small">
                                            {asset.model || 'N/A'}<br />
                                            <span className="text-muted">{asset.manufacturer}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <StatusBadge status={asset.status} />
                                    </td>
                                    <td>
                                        {asset.container_name ? (
                                            <span className="flex items-center gap-xs">
                                                <FiPackage size={14} className="text-muted" />
                                                {asset.container_name}
                                            </span>
                                        ) : (
                                            <span className="text-muted">Kein Standort</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <Link
                                                to={`/assets/${asset.id}`}
                                                className="btn btn-sm btn-secondary"
                                                title="Details"
                                            >
                                                Details
                                            </Link>
                                            {hasPermission('assets.manage') && (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(asset)}
                                                        className="btn btn-sm btn-secondary"
                                                        title="Bearbeiten"
                                                    >
                                                        <FiEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(asset.id)}
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
                title={editingAsset ? 'Gerät bearbeiten' : 'Neues Gerät erstellen'}
                footer={
                    <>
                        <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                        <button onClick={handleSubmit} className="btn btn-primary">Speichern</button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
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
                </form>
            </Modal>

            {/* QR Scanner Modal */}
            <QRScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScanSuccess={handleQRScan}
            />
        </div>
    );
}

export default Assets;
