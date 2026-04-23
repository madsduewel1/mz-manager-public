import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { lendingsAPI, assetsAPI, containersAPI } from '../services/api';
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
    const [accessories, setAccessories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');

    const canCreate = hasPermission('lendings.create');
    const canReturn = hasPermission('lendings.return');
    const canDelete = hasPermission('lendings.delete');

    useEffect(() => {
        loadLendings();
        loadAssets();
        loadContainers();
        if (settings.module_accessories_enabled === 'true') {
            loadAccessories();
        }
    }, [settings.module_accessories_enabled]);

    const loadLendings = async () => {
        try {
            const response = await lendingsAPI.getAll();
            setLendings(response.data);
        } catch (err) {
            error('Fehler beim Laden der Ausleihen');
        } finally {
            setLoading(false);
        }
    };

    const loadAssets = async () => {
        try {
            const response = await assetsAPI.getAll();
            setAssets(response.data.filter(a => a.status === 'ok'));
        } catch (err) {
            error('Fehler beim Laden der Geräte.');
        }
    };

    const loadContainers = async () => {
        try {
            const response = await containersAPI.getAll();
            setContainers(response.data);
        } catch (err) {
            error('Fehler beim Laden der Container.');
        }
    };

    const loadAccessories = async () => {
        try {
            const { accessoriesAPI } = await import('../services/api');
            const response = await accessoriesAPI.getAccessories();
            setAccessories(response.data.filter(a => a.status === 'ok'));
        } catch (err) {
            console.error('Error loading accessories:', err);
        }
    };



    const handleReturn = async (id) => {
        try {
            await lendingsAPI.returnLending(id);
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
            await lendingsAPI.delete(id);
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

        if (lending.asset_id || (lending.asset_inventory && !lending.container_name && !lending.accessory_name)) {
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
        } else if (lending.accessory_id || lending.accessory_name) {
            // It's an accessory
            doc.text(`Zubehör: ${lending.accessory_name}`, 20, yPos);
            yPos += 10;
            const accData = accessories.find(a => a.id === lending.accessory_id) || {};
            if (accData.category) {
                doc.text(`Kategorie: ${accData.category}`, 20, yPos);
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
        if (lending.notes) {
            yPos += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Anmerkungen:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 10;
            const splitNotes = doc.splitTextToSize(lending.notes, 170);
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
            (l.accessory_name && l.accessory_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
                    <button onClick={() => navigate('/lendings/new')} className="btn btn-primary">
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
                                                {lending.asset_inventory || lending.container_name || lending.accessory_name}
                                            </div>
                                            <div className="text-small text-muted">
                                                {lending.asset_type || (lending.container_name ? 'Container' : 'Zubehör')}
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
                                                {canDelete && (
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
                                    <th style={{ textAlign: 'right' }}>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnedLendings.map(lending => (
                                    <tr key={lending.id}>
                                        <td data-label="Was">{lending.asset_inventory || lending.container_name || lending.accessory_name}</td>
                                        <td data-label="Entleiher">{lending.borrower_name}</td>
                                        <td data-label="Zeitraum" className="text-small">
                                            {new Date(lending.start_date).toLocaleDateString('de-DE')} - {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                                        </td>
                                        <td data-label="Zurückgegeben am" className="text-small">
                                            {lending.actual_end_date ? new Date(lending.actual_end_date).toLocaleDateString('de-DE') : '-'}
                                        </td>
                                        <td data-label="Aktionen" style={{ textAlign: 'right' }}>
                                            {canDelete && (
                                                <button 
                                                    onClick={() => handleDelete(lending.id)} 
                                                    className="btn btn-sm btn-danger" 
                                                    title="Löschen"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Lendings;
