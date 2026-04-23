import { useState, useRef } from 'react';
import { 
    FiDownload, FiUpload, FiCheck, FiX, FiAlertCircle, 
    FiInfo, FiChevronRight, FiFileText
} from 'react-icons/fi';
import { parseCSV, downloadTemplate, internalToGerman } from '../utils/csvUtils';
import { useNotification } from '../contexts/NotificationContext';
import { assetsAPI, containersAPI, adminAPI } from '../services/api';

function BulkImportModal({ isOpen, onClose, type, onImportSuccess }) {
    const [step, setStep] = useState('upload'); // 'upload', 'preview', 'results'
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState(null);
    const fileInputRef = useRef();
    const { success, error, warning } = useNotification();

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const parsedData = parseCSV(text, type);
                setPreview(parsedData);
                setStep('preview');
            };
            reader.readAsText(selectedFile);
        }
    };

    const handleImport = async () => {
        if (preview.length === 0) return;

        setImporting(true);
        try {
            let response;
            switch (type) {
                case 'assets':
                    response = await assetsAPI.batchCreate(preview);
                    break;
                case 'containers':
                    response = await containersAPI.batchCreate(preview);
                    break;
                case 'models':
                    response = await adminAPI.batchCreateModels(preview);
                    break;
                case 'rooms':
                    response = await adminAPI.batchCreateRooms(preview);
                    break;
                default:
                    throw new Error('Unbekannter Import-Typ');
            }

            setResults(response.data);
            setStep('results');
            if (response.data.success > 0) {
                success(`${response.data.success} Datensätze erfolgreich importiert`);
                if (onImportSuccess) onImportSuccess();
            }
            if (response.data.failed > 0) {
                warning(`${response.data.failed} Datensätze konnten nicht importiert werden`);
            }
        } catch (err) {
            error('Import-Fehler: ' + (err.response?.data?.error || err.message));
        } finally {
            setImporting(false);
        }
    };

    const reset = () => {
        setStep('upload');
        setFile(null);
        setPreview([]);
        setResults(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const typeLabels = {
        assets: 'Geräte',
        containers: 'Container',
        models: 'Gerätemodelle',
        rooms: 'Räume'
    };

    const steps = [
        { id: 'upload', label: '1. Datei wählen' },
        { id: 'preview', label: '2. Daten prüfen' },
        { id: 'results', label: '3. Abschluss' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                <div className="modal-header">
                    <div className="flex items-center gap-md">
                        <FiUpload color="var(--color-primary)" />
                        <h2 className="mb-0">Import: {typeLabels[type]}</h2>
                    </div>
                    
                    {/* Stepper - Subtle and consistent */}
                    <div className="hide-mobile" style={{ display: 'flex', gap: 'var(--space-md)', marginLeft: 'auto', marginRight: 'var(--space-xl)' }}>
                        {steps.map((s, idx) => {
                            const isActive = step === s.id;
                            const isPast = steps.findIndex(x => x.id === step) > idx;
                            return (
                                <div key={s.id} style={{ 
                                    fontSize: '13px', 
                                    fontWeight: isActive ? 700 : 500,
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {isPast ? <FiCheck color="var(--color-success)" size={14} /> : <span>{idx + 1}.</span>}
                                    <span>{s.label.split('. ')[1]}</span>
                                    {idx < steps.length - 1 && <FiChevronRight size={12} opacity={0.5} />}
                                </div>
                            );
                        })}
                    </div>

                    <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>&times;</button>
                </div>
                
                <div className="modal-body" style={{ background: 'var(--color-bg-dark)' }}>
                    {/* STEP 1: UPLOAD */}
                    {step === 'upload' && (
                        <div className="fade-in">
                            <div className="card mb-lg">
                                <div className="flex gap-md items-center">
                                    <FiInfo size={20} color="var(--color-primary)" />
                                    <div className="flex-1">
                                        <p className="mb-xs"><strong>Format-Hinweis</strong></p>
                                        <p className="text-muted text-small mb-md">Bitte nutzen Sie unsere Vorlage für einen reibungslosen Import.</p>
                                        <button className="btn btn-secondary btn-sm" onClick={() => downloadTemplate(type)}>
                                            <FiDownload /> Vorlage herunterladen
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div 
                                className="upload-zone" 
                                onClick={() => fileInputRef.current?.click()}
                                style={{ 
                                    border: '2px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--space-2xl)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: 'var(--color-bg-medium)',
                                    transition: 'var(--transition-base)'
                                }}
                            >
                                <input type="file" hidden ref={fileInputRef} accept=".csv" onChange={handleFileChange} />
                                <FiUpload size={40} className="mb-md" color="var(--color-text-tertiary)" />
                                <h3 className="mb-sm">CSV-Datei auswählen</h3>
                                <p className="text-muted text-small">Klicken Sie hier oder ziehen Sie eine Datei hinein</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PREVIEW */}
                    {step === 'preview' && (
                        <div className="fade-in">
                            <div className="flex justify-between items-center mb-md">
                                <h3 className="mb-0">Datenvorschau ({preview.length} Zeilen)</h3>
                                <button className="btn btn-secondary btn-sm" onClick={reset}>Datei ändern</button>
                            </div>

                            <div className="table-responsive" style={{ maxHeight: '400px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <table className="table" style={{ width: 'max-content', minWidth: '100%', margin: 0 }}>
                                    <thead>
                                        <tr>
                                            {Object.keys(preview[0] || {}).map(h => (
                                                <th key={h} style={{ whiteSpace: 'nowrap' }}>
                                                    {internalToGerman[h] || h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.slice(0, 50).map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((v, j) => (
                                                    <td key={j} style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                                                        {v || <span className="text-muted">-</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {preview.length > 50 && (
                                    <div className="p-sm text-center text-muted bg-light text-small">
                                        ... und {preview.length - 50} weitere Zeilen
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: RESULTS */}
                    {step === 'results' && results && (
                        <div className="fade-in text-center py-xl">
                            <div className="mb-xl">
                                {results.failed === 0 ? (
                                    <FiCheck size={64} color="var(--color-success)" className="mb-md" />
                                ) : (
                                    <FiAlertCircle size={64} color="var(--color-warning)" className="mb-md" />
                                )}
                                <h2>Import abgeschlossen</h2>
                                <p className="text-muted">Ergebnisse der Batch-Operation:</p>
                            </div>

                            <div className="grid grid-2 gap-lg mb-xl" style={{ maxWidth: '400px', margin: '0 auto var(--space-xl)' }}>
                                <div className="card p-md">
                                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{results.success}</div>
                                    <div className="stat-label">Erfolgreich</div>
                                </div>
                                <div className="card p-md">
                                    <div className="stat-value" style={{ color: results.failed > 0 ? 'var(--color-error)' : 'var(--color-text-tertiary)' }}>{results.failed}</div>
                                    <div className="stat-label">Fehlgeschlagen</div>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="text-left mt-xl">
                                    <h3 className="mb-sm text-small uppercase text-muted">Fehlerdetails</h3>
                                    <div className="table-responsive" style={{ maxHeight: '200px' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Element</th>
                                                    <th>Fehler</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.errors.map((err, i) => (
                                                    <tr key={i}>
                                                        <td>{err.item || '-'}</td>
                                                        <td style={{ color: 'var(--color-error)' }}>{err.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {step === 'upload' && (
                        <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
                    )}

                    {step === 'preview' && (
                        <>
                            <button className="btn btn-secondary" onClick={reset}>Zurück</button>
                            <button 
                                className="btn btn-primary" 
                                disabled={preview.length === 0 || importing} 
                                onClick={handleImport}
                            >
                                {importing ? 'Importiere...' : 'Import starten'}
                            </button>
                        </>
                    )}

                    {step === 'results' && (
                        <>
                            <button className="btn btn-secondary" onClick={reset}>Weiterer Import</button>
                            <button className="btn btn-primary" onClick={onClose}>Fertigstellen</button>
                        </>
                    )}
                </div>
            </div>
            <style jsx>{`
                .upload-zone:hover {
                    border-color: var(--color-primary) !important;
                    background: var(--color-bg-light) !important;
                }
            `}</style>
        </div>
    );
}

export default BulkImportModal;
