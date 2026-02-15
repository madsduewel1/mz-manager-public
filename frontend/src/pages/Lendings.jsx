import { useState, useEffect } from 'react';
import { FiRepeat, FiPlus, FiEdit, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import { hasRole, hasPermission } from '../utils/auth';
import Modal from '../components/Modal';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';

function Lendings() {
    const [lendings, setLendings] = useState([]);
    const [assets, setAssets] = useState([]);
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create');
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();

    const [lendingForm, setLendingForm] = useState({
        asset_id: '',
        container_id: '',
        borrower_name: '',
        borrower_type: 'klasse',
        start_date: new Date().toISOString().split('T')[0],
        planned_end_date: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');

    const canEdit = hasPermission('lendings.manage') || hasRole('Administrator');
    const canCreate = hasPermission('lendings.create') || hasRole('Administrator');

    useEffect(() => {
        loadLendings();
        loadAssets();
        loadContainers();
    }, []);

    const loadLendings = async () => {
        try {
            const response = await axios.get('/api/lendings', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLendings(response.data);
        } catch (err) {
            error('Fehler beim Laden der Ausleihen');
        } finally {
            setLoading(false);
        }
    };

    const loadAssets = async () => {
        try {
            const response = await axios.get('/api/assets', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setAssets(response.data.filter(a => a.status === 'ok'));
        } catch (err) {
            console.error(err);
        }
    };

    const loadContainers = async () => {
        try {
            const response = await axios.get('/api/containers', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setContainers(response.data);
        } catch (err) {
            console.error(err);
        }
    };

    const openCreateModal = () => {
        setModalType('create');
        setLendingForm({
            asset_id: '',
            container_id: '',
            borrower_name: '',
            borrower_type: 'klasse',
            start_date: new Date().toISOString().split('T')[0],
            planned_end_date: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/lendings', lendingForm, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            success('Ausleihe erfolgreich erstellt');
            setShowModal(false);
            loadLendings();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
        }
    };

    const handleReturn = async (id) => {
        try {
            await axios.put(`/api/lendings/${id}/return`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            success('Als zurückgegeben markiert');
            loadLendings();
        } catch (err) {
            error('Fehler beim Zurückgeben');
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm({
            title: 'Ausleihe löschen',
            message: 'Möchten Sie diese Ausleihe wirklich löschen?',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;
        try {
            await axios.delete(`/api/lendings/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            success('Ausleihe gelöscht');
            loadLendings();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    const filteredLendings = lendings.filter(l => {
        const matchesSearch = !searchQuery ||
            (l.asset_inventory && l.asset_inventory.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (l.container_name && l.container_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (l.borrower_name && l.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = !filterType || l.borrower_type === filterType;

        return matchesSearch && matchesType;
    });

    const activeLendings = filteredLendings.filter(l => !l.returned);
    const returnedLendings = filteredLendings.filter(l => l.returned);

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-xl">
                <h1><FiRepeat style={{ display: 'inline', marginRight: '10px' }} />Ausleihen</h1>
                {canCreate && (
                    <button onClick={openCreateModal} className="btn btn-primary">
                        <FiPlus /> Neue Ausleihe
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="card mb-lg" style={{ padding: 'var(--space-md)' }}>
                <div className="grid grid-3 grid-mobile-1 items-center">
                    <div className="form-group mb-0">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Suchen (Inv-Nr, Name)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <select
                            className="form-select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="">Alle Entleiher-Typen</option>
                            <option value="klasse">Klasse</option>
                            <option value="Lehrer">Lehrer</option>
                            <option value="Schüler">Schüler</option>
                            <option value="extern">Extern</option>
                        </select>
                    </div>
                    <div className="text-right text-muted text-small">
                        {filteredLendings.length} Ausleihen gefunden
                    </div>
                </div>
            </div>

            {/* Active Lendings */}
            <div className="card mb-lg">
                <div className="card-header">
                    <h2 className="card-title">Aktive Ausleihen ({activeLendings.length})</h2>
                </div>
                {activeLendings.length === 0 ? (
                    <div className="card-body">
                        <p className="text-muted">Keine aktiven Ausleihen gefunden</p>
                    </div>
                ) : (
                    <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Was wird geliehen?</th>
                                    <th>Entleiher</th>
                                    <th>Zeitraum</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeLendings.map(lending => (
                                    <tr key={lending.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>
                                                {lending.asset_inventory || lending.container_name}
                                            </div>
                                            <div className="text-small text-muted">
                                                {lending.asset_type || 'Container'}
                                            </div>
                                        </td>
                                        <td>
                                            <div>{lending.borrower_name}</div>
                                            <div className="text-small text-muted">{lending.borrower_type}</div>
                                        </td>
                                        <td>
                                            <div className="text-small">
                                                {new Date(lending.start_date).toLocaleDateString('de-DE')} - {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${lending.days_remaining < 0 ? 'badge-danger' : (lending.days_remaining <= 1 ? 'badge-warning' : 'badge-success')}`}>
                                                {lending.days_remaining < 0 ? 'Überfällig' : (lending.days_remaining === 0 ? 'Heute fällig' : `Noch ${lending.days_remaining} Tage`)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handleReturn(lending.id)} className="btn btn-sm btn-success" title="Als zurückgegeben markieren">
                                                    <FiCheckCircle />
                                                </button>
                                                {canEdit && (
                                                    <button onClick={() => handleDelete(lending.id)} className="btn btn-sm btn-danger" title="Löschen">
                                                        <FiTrash2 />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Returned Lendings */}
            {returnedLendings.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Verlauf / Zurückgegeben ({returnedLendings.length})</h2>
                    </div>
                    <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Was</th>
                                    <th>Entleiher</th>
                                    <th>Zeitraum</th>
                                    <th>Zurückgegeben am</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnedLendings.map(lending => (
                                    <tr key={lending.id}>
                                        <td>{lending.asset_inventory || lending.container_name}</td>
                                        <td>{lending.borrower_name}</td>
                                        <td className="text-small">
                                            {new Date(lending.start_date).toLocaleDateString('de-DE')} - {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                                        </td>
                                        <td className="text-small">
                                            {lending.actual_end_date ? new Date(lending.actual_end_date).toLocaleDateString('de-DE') : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title="Neue Ausleihe erstellen"
                    footer={
                        <>
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                            <button onClick={handleSubmit} className="btn btn-primary">Erstellen</button>
                        </>
                    }
                >
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Was wird ausgeliehen? *</label>
                            <select
                                className="form-select"
                                value={lendingForm.asset_id ? 'asset' : lendingForm.container_id ? 'container' : ''}
                                onChange={(e) => {
                                    if (e.target.value === 'asset') {
                                        setLendingForm({ ...lendingForm, container_id: '', asset_id: assets[0]?.id || '' });
                                    } else {
                                        setLendingForm({ ...lendingForm, asset_id: '', container_id: containers[0]?.id || '' });
                                    }
                                }}
                                required
                            >
                                <option value="">Bitte wählen...</option>
                                <option value="asset">Einzelnes Gerät</option>
                                <option value="container">Container (Wagen)</option>
                            </select>
                        </div>

                        {lendingForm.asset_id !== '' && (
                            <div className="form-group">
                                <label className="form-label">Gerät *</label>
                                <select
                                    className="form-select"
                                    value={lendingForm.asset_id}
                                    onChange={(e) => setLendingForm({ ...lendingForm, asset_id: e.target.value })}
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

                        {lendingForm.container_id !== '' && (
                            <div className="form-group">
                                <label className="form-label">Container *</label>
                                <select
                                    className="form-select"
                                    value={lendingForm.container_id}
                                    onChange={(e) => setLendingForm({ ...lendingForm, container_id: e.target.value })}
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

                        <div className="form-group">
                            <label className="form-label">Entleiher *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={lendingForm.borrower_name}
                                onChange={(e) => setLendingForm({ ...lendingForm, borrower_name: e.target.value })}
                                placeholder="z.B. Klasse 10b, Max Mustermann"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Entleiher-Typ *</label>
                            <select
                                className="form-select"
                                value={lendingForm.borrower_type}
                                onChange={(e) => setLendingForm({ ...lendingForm, borrower_type: e.target.value })}
                                required
                            >
                                <option value="klasse">Klasse</option>
                                <option value="Lehrer">Lehrer</option>
                                <option value="Schüler">Schüler</option>
                                <option value="extern">Extern</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Startdatum *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={lendingForm.start_date}
                                onChange={(e) => setLendingForm({ ...lendingForm, start_date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Geplantes Rückgabedatum *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={lendingForm.planned_end_date}
                                onChange={(e) => setLendingForm({ ...lendingForm, planned_end_date: e.target.value })}
                                required
                            />
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

export default Lendings;
