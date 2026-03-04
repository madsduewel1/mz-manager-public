import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { authAPI, adminAPI, dashboardAPI, containersAPI } from '../services/api';
import { getUser, hasRole, hasPermission } from '../utils/auth';
import Modal from '../components/Modal';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useSettings } from '../contexts/SettingsContext';
import { FiRepeat, FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiDownload, FiPrinter } from 'react-icons/fi';

function Lendings() {
    const [lendings, setLendings] = useState([]);
    const [assets, setAssets] = useState([]);
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create');
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();
    const { settings } = useSettings();

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
        if (e) e.preventDefault();
        try {
            const response = await axios.post('/api/lendings', lendingForm, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            success('Ausleihe erfolgreich erstellt');
            setShowModal(false);
            loadLendings();
            return response;
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
            return null;
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

    const generateLendingPDF = async (lending) => {
        const doc = new jsPDF();
        const orgName = settings.org_name || 'MZ-Manager';
        const user = getUser();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(orgName, 20, 30);

        doc.setFontSize(16);
        doc.setTextColor(100, 100, 100);
        doc.text('Ausleihprotokoll / Leihvertrag', 20, 40);

        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);

        // Lending Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Allgemeine Informationen:', 20, 60);

        doc.setFont('helvetica', 'normal');
        let yPos = 70;
        doc.text(`Ausleih-ID: #${lending.id || 'Neu'}`, 20, yPos);
        yPos += 10;
        doc.text(`Datum der Ausleihe: ${new Date(lending.start_date).toLocaleDateString('de-DE')}`, 20, yPos);
        yPos += 10;
        doc.text(`Geplante Rückgabe: ${new Date(lending.planned_end_date).toLocaleDateString('de-DE')}`, 20, yPos);
        yPos += 15;

        // Borrower Info
        doc.setFont('helvetica', 'bold');
        doc.text('Entleiher:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 10;
        doc.text(`Name: ${lending.borrower_name}`, 20, yPos);
        yPos += 10;
        doc.text(`Typ: ${lending.borrower_type.charAt(0).toUpperCase() + lending.borrower_type.slice(1)}`, 20, yPos);
        yPos += 15;

        // Device/Container Info
        doc.setFont('helvetica', 'bold');
        doc.text('Ausgeliehenes Objekt:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 10;

        if (lending.asset_id || (lending.asset_inventory && !lending.container_name)) {
            // It's an asset
            const assetData = assets.find(a => a.id === lending.asset_id) || {};
            doc.text(`Gerät: ${assetData.model_name || lending.asset_type || 'Unbekanntes Modell'}`, 20, yPos);
            yPos += 10;
            doc.text(`Inventarnummer: ${lending.asset_inventory || assetData.inventory_number || '-'}`, 20, yPos);
            yPos += 10;
            if (assetData.serial_number) {
                doc.text(`Seriennummer: ${assetData.serial_number}`, 20, yPos);
                yPos += 10;
            }
            if (assetData.manufacturer) {
                doc.text(`Hersteller: ${assetData.manufacturer}`, 20, yPos);
                yPos += 10;
            }
        } else {
            // It's a container
            doc.text(`Container: ${lending.container_name}`, 20, yPos);
            yPos += 10;
            const containerData = containers.find(c => c.id === lending.container_id) || {};
            if (containerData.location) {
                doc.text(`Standort: ${containerData.location}`, 20, yPos);
                yPos += 10;
            }
        }

        // Notes if any
        if (lending.notes || lendingForm.notes) {
            yPos += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Anmerkungen:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 10;
            const splitNotes = doc.splitTextToSize(lending.notes || lendingForm.notes, 170);
            doc.text(splitNotes, 20, yPos);
            yPos += (splitNotes.length * 7);
        }

        // Terms
        yPos = Math.max(yPos + 10, 190);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Haftung und Rückgabe:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 7;
        const terms = [
            'Der Entleiher verpflichtet sich, das Gerät pfleglich zu behandeln und zum genannten',
            'Termin unbeschädigt zurückzugeben. Bei Verlust oder Beschädigung durch unsachgemäße',
            'Behandlung haftet der Entleiher gemäß den geltenden Bestimmungen.'
        ];
        terms.forEach(line => {
            doc.text(line, 20, yPos);
            yPos += 6;
        });

        // Signatures
        yPos += 20;
        doc.setLineWidth(0.2);
        doc.line(20, yPos + 15, 90, yPos + 15);
        doc.line(110, yPos + 15, 180, yPos + 15);
        doc.text('Unterschrift Entleiher', 20, yPos + 22);
        doc.text('Unterschrift Ausleiher (Schule)', 110, yPos + 22);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generiert am ${new Date().toLocaleString('de-DE')} von ${user?.username || 'System'}`, 20, 285);

        doc.save(`Leihvertrag_${lending.borrower_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        success('PDF wurde generiert.');
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
                                        <td data-label="Was wird geliehen?">
                                            <div style={{ fontWeight: 600 }}>
                                                {lending.asset_inventory || lending.container_name}
                                            </div>
                                            <div className="text-small text-muted">
                                                {lending.asset_type || 'Container'}
                                            </div>
                                        </td>
                                        <td data-label="Entleiher">
                                            <div>{lending.borrower_name}</div>
                                            <div className="text-small text-muted">{lending.borrower_type}</div>
                                        </td>
                                        <td data-label="Zeitraum">
                                            <div className="text-small">
                                                {new Date(lending.start_date).toLocaleDateString('de-DE')} - {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                                            </div>
                                        </td>
                                        <td data-label="Status">
                                            <span className={`badge ${lending.days_remaining < 0 ? 'badge-danger' : (lending.days_remaining <= 1 ? 'badge-warning' : 'badge-success')}`}>
                                                {lending.days_remaining < 0 ? 'Überfällig' : (lending.days_remaining === 0 ? 'Heute fällig' : `Noch ${lending.days_remaining} Tage`)}
                                            </span>
                                        </td>
                                        <td data-label="Aktionen" style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => generateLendingPDF(lending)} className="btn btn-sm btn-secondary" title="Leihvertrag drucken (PDF)">
                                                    <FiPrinter />
                                                </button>
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
                                        <td data-label="Was">{lending.asset_inventory || lending.container_name}</td>
                                        <td data-label="Entleiher">{lending.borrower_name}</td>
                                        <td data-label="Zeitraum" className="text-small">
                                            {new Date(lending.start_date).toLocaleDateString('de-DE')} - {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                                        </td>
                                        <td data-label="Zurückgegeben am" className="text-small">
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={async (e) => {
                                        const response = await handleSubmit(e);
                                        if (response && response.data && response.data.lending_id) {
                                            generateLendingPDF({
                                                ...lendingForm,
                                                id: response.data.lending_id
                                            });
                                        }
                                    }}
                                    className="btn btn-secondary"
                                >
                                    <FiPrinter /> Speichern & PDF
                                </button>
                                <button onClick={handleSubmit} className="btn btn-primary">Erstellen</button>
                            </div>
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
