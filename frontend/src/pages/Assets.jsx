import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiPackage, FiEdit, FiTrash2, FiCamera } from 'react-icons/fi';
import { assetsAPI, containersAPI } from '../services/api';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import QRScanner from '../components/QRScanner';
import BulkImportModal from '../components/BulkImportModal';
import { hasRole, hasPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';

function Assets() {
    const [assets, setAssets] = useState([]);
    const [containers, setContainers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const { success, error } = useNotification();

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
    }).sort((a, b) => {
        // 1. Nach Raum sortieren
        const roomA = (a?.parent_container_name || '').toLowerCase();
        const roomB = (b?.parent_container_name || '').toLowerCase();
        if (!roomA && roomB) return 1;
        if (roomA && !roomB) return -1;
        const roomCmp = roomA.localeCompare(roomB, 'de', { numeric: true, sensitivity: 'base' });
        if (roomCmp !== 0) return roomCmp;

        // 2. Nach Container sortieren
        const containerA = (a?.container_name || '').toLowerCase();
        const containerB = (b?.container_name || '').toLowerCase();
        if (!containerA && containerB) return 1;
        if (containerA && !containerB) return -1;
        const containerCmp = containerA.localeCompare(containerB, 'de', { numeric: true, sensitivity: 'base' });
        if (containerCmp !== 0) return containerCmp;

        // 3. Nach Inventarnummer
        return (a?.inventory_number || '').localeCompare(b?.inventory_number || '', 'de', { numeric: true, sensitivity: 'base' });
    });

    // Hilfsfunktion zum Rendern der Gruppen-Header
    const renderAssetsWithGroups = () => {
        const rows = [];
        let lastGroup = null;

        filteredAssets.forEach((asset) => {
            // Gruppierung nur nach Container-Name
            const groupName = asset.container_name || 'Nicht zugewiesen';

            if (groupName !== lastGroup) {
                rows.push(
                    <tr key={`group-${groupName}`} className="group-header" style={{ background: '#cbd5e1', borderBottom: '2px solid var(--color-border)' }}>
                        <td colSpan="6" style={{ padding: '8px 16px', fontWeight: 700, color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <FiPackage style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            {groupName}
                        </td>
                    </tr>
                );
                lastGroup = groupName;
            }

            rows.push(
                <tr key={asset.id}>
                    <td data-label="Inventarnummer">
                        <Link to={`/assets/${asset.inventory_number}`} style={{ fontWeight: 600 }}>
                            {asset.inventory_number}
                        </Link>
                    </td>
                    <td data-label="Typ">
                        <span className="badge badge-info">{asset.type}</span>
                    </td>
                    <td data-label="Modell / Hersteller">
                        <div className="text-small">
                            {asset.model || 'N/A'}<br />
                            <span className="text-muted">{asset.manufacturer || ''}</span>
                        </div>
                    </td>
                    <td data-label="Status">
                        <StatusBadge status={asset.status} />
                    </td>
                    <td data-label="Standort">
                        <div className="text-xs">
                            {asset.parent_container_name && <div className="text-muted">{asset.parent_container_name}</div>}
                            {asset.container_name || <span className="text-muted">Nicht zugewiesen</span>}
                        </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Link
                                to={`/assets/${asset.inventory_number}`}
                                className="btn btn-sm btn-secondary"
                                title="Details"
                            >
                                Details
                            </Link>
                            {hasPermission('assets.edit', 'assets.delete') && (
                                <>
                                    {hasPermission('assets.edit') && (
                                        <button
                                            onClick={() => navigate(`/assets/${asset.id}/edit`)}
                                            className="btn btn-sm btn-secondary"
                                            title="Bearbeiten"
                                        >
                                            <FiEdit />
                                        </button>
                                    )}
                                    {hasPermission('assets.delete') && (
                                        <button
                                            onClick={() => handleDelete(asset.id)}
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
            console.error('Delete error:', err);
            error(err.response?.data?.error || 'Fehler beim Löschen des Geräts');
        }
    };

    const handleQRScan = async (qrCode) => {
        try {
            const response = await assetsAPI.lookupByQR(qrCode);
            const data = response.data;

            if (data && data.id) {
                if (data.entityType === 'asset') {
                    success(`Gerät gefunden: ${data.inventory_number}`);
                    navigate(`/assets/${data.inventory_number}`);
                } else if (data.entityType === 'container') {
                    const typeLabel = data.type === 'raum' ? 'Raum' : 'Container';
                    success(`${typeLabel} gefunden: ${data.name}`);
                    navigate(`/containers/${data.name}`);
                }
            }
        } catch (err) {
            if (err.response?.status === 404) {
                error('QR-Code gehört zu keinem bekannten Objekt (Gerät, Raum oder Container)');
            } else {
                error('Fehler beim Suchen des QR-Codes');
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
                    {hasPermission('assets.create') && (
                        <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">
                            Vorschau Import
                        </button>
                    )}
                    {hasPermission('assets.create') && (
                        <button onClick={() => navigate('/assets/new')} className="btn btn-primary">
                            <FiPlus />
                            Neues Gerät
                        </button>
                    )}
                </div>
            </div>

            <BulkImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                type="assets" 
                onImportSuccess={loadAssets} 
            />

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
                    {assets.length === 0 && hasPermission('assets.create') && (
                        <button onClick={() => navigate('/assets/new')} className="btn btn-primary mt-lg">
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
                            {renderAssetsWithGroups()}
                        </tbody>
                    </table>
                </div>
            )}


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
