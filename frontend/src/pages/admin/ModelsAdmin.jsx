import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiMoreVertical, FiCpu } from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import BulkImportModal from '../../components/BulkImportModal';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';

const ModelsAdmin = () => {
    const [deviceModels, setDeviceModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [modelForm, setModelForm] = useState({
        type: 'laptop', manufacturer: '', model_name: '', description: ''
    });

    const { success, error } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => {
        loadDeviceModels();
        const handleClickOutside = () => setActiveActionMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadDeviceModels = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getDeviceModels();
            setDeviceModels(response.data);
        } catch (err) {
            error('Fehler beim Laden der Modelle');
        } finally {
            setLoading(false);
        }
    };

    const toggleActionMenu = (e, modelId) => {
        if (e) e.stopPropagation();
        setActiveActionMenu(activeActionMenu === modelId ? null : modelId);
    };

    const handleModelSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            await adminAPI.createDeviceModel(modelForm);
            success('Modell erstellt');
            setShowModal(false);
            setModelForm({ type: 'laptop', manufacturer: '', model_name: '', description: '' });
            loadDeviceModels();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteModel = async (id) => {
        const confirmed = await confirm({
            title: 'Modell löschen',
            message: 'Möchten Sie dieses Modell wirklich löschen?',
            confirmLabel: 'Löschen',
            confirmColor: 'var(--color-error)'
        });
        if (!confirmed) return;
        try {
            await adminAPI.deleteDeviceModel(id);
            success('Modell gelöscht');
            loadDeviceModels();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">Gerätemodelle</h2>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">Import</button>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <FiPlus /> Neues Modell
                    </button>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Modellname</th>
                            <th>Typ</th>
                            <th>Hersteller</th>
                            <th>Beschreibung</th>
                            <th style={{ textAlign: 'right' }}>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...deviceModels].sort((a, b) => a.model_name.localeCompare(b.model_name, undefined, { numeric: true })).map(model => (
                            <tr key={model.id}>
                                <td style={{ fontWeight: 600 }}>{model.model_name}</td>
                                <td><span className="badge badge-info">{model.type}</span></td>
                                <td>{model.manufacturer}</td>
                                <td className="text-muted text-small">{model.description || '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="action-menu-container">
                                        <button className="action-menu-btn" onClick={(e) => toggleActionMenu(e, model.id)}><FiMoreVertical /></button>
                                        {activeActionMenu === model.id && (
                                            <div className="action-menu-dropdown">
                                                <button onClick={() => deleteModel(model.id)} className="dropdown-item text-danger"><FiTrash2 /> Löschen</button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {deviceModels.length === 0 && (
                            <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Modelle vorhanden</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Neues Gerätemodell"
                    footer={<><button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                    <button onClick={handleModelSubmit} className="btn btn-primary" disabled={submitting}>Erstellen</button></>}>
                    <form onSubmit={handleModelSubmit}>
                        <div className="form-group"><label className="form-label">Typ *</label>
                            <select className="form-select" value={modelForm.type} onChange={(e) => setModelForm({ ...modelForm, type: e.target.value })} required>
                                <option value="laptop">Laptop</option>
                                <option value="ipad">iPad/Tablet</option>
                                <option value="pc">PC / Workstation</option>
                                <option value="apple_tv">Apple TV</option>
                                <option value="beamer">Beamer</option>
                                <option value="monitor">Monitor</option>
                                <option value="sonstiges">Sonstiges</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Hersteller *</label><input type="text" className="form-input" value={modelForm.manufacturer} onChange={(e) => setModelForm({ ...modelForm, manufacturer: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Modellbezeichnung *</label><input type="text" className="form-input" value={modelForm.model_name} onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Beschreibung</label><textarea className="form-textarea" value={modelForm.description} onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })} rows="3"></textarea></div>
                    </form>
                </Modal>
            )}

            <BulkImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} type="models" onImportSuccess={loadDeviceModels} />
        </div>
    );
};

export default ModelsAdmin;
