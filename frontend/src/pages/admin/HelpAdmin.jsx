import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiCheck } from 'react-icons/fi';
import { helpAPI } from '../../../services/api';
import Modal from '../../../components/Modal';

const HelpAdmin = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [formData, setFormData] = useState({
        module: '',
        permission_required: 'all',
        title: '',
        content: '',
        order_index: 0
    });
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadHelpModules();
    }, []);

    const loadHelpModules = async () => {
        setLoading(true);
        try {
            const res = await helpAPI.getAllModules();
            setModules(res.data || []);
        } catch (err) {
            console.error('Error loading help modules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (entry = null) => {
        if (entry) {
            setEditingEntry(entry);
            setFormData({
                module: entry.module || '',
                permission_required: entry.permission_required || 'all',
                title: entry.title || '',
                content: entry.content || '',
                order_index: entry.order_index || 0
            });
        } else {
            setEditingEntry(null);
            setFormData({
                module: '',
                permission_required: 'all',
                title: '',
                content: '',
                order_index: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEntry) {
                await helpAPI.updateEntry(editingEntry.id, formData);
                setSuccessMessage('Hilfe-Eintrag erfolgreich aktualisiert.');
            } else {
                await helpAPI.createEntry(formData);
                setSuccessMessage('Neuer Hilfe-Eintrag erstellt.');
            }
            handleCloseModal();
            loadHelpModules();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving help entry:', err);
            alert('Fehler beim Speichern.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Möchtest du diesen Hilfe-Eintrag wirklich löschen?')) {
            try {
                await helpAPI.deleteEntry(id);
                setSuccessMessage('Eintrag gelöscht.');
                loadHelpModules();
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (err) {
                console.error('Error deleting help entry:', err);
            }
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title">Hilfe-System verwalten</h2>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <FiPlus /> Neuer Eintrag
                </button>
            </div>

            {successMessage && (
                <div className="alert success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ebfbee', color: '#2b8a3e', padding: '1rem', borderRadius: '4px' }}>
                    <FiCheck /> {successMessage}
                </div>
            )}

            {loading ? (
                <div>Lade...</div>
            ) : (
                <div className="help-modules-list">
                    {modules.map(mod => (
                        <div key={mod.module} className="card mb-md">
                            <div className="card-header" style={{ background: 'var(--bg-secondary)' }}>
                                <h3 className="card-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span>{mod.module} <small className="text-muted" style={{ fontSize: '0.8em', marginLeft: '1rem' }}>Benötigtes Recht: {mod.permission_required}</small></span>
                                </h3>
                            </div>
                            <div className="card-body">
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Reihenfolge</th>
                                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Titel</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mod.entries.map(entry => (
                                            <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.5rem' }}>{entry.order_index}</td>
                                                <td style={{ padding: '0.5rem' }}>{entry.title}</td>
                                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                    <button className="btn btn-icon" onClick={() => handleOpenModal({ ...entry, module: mod.module, permission_required: mod.permission_required })} title="Bearbeiten">
                                                        <FiEdit2 />
                                                    </button>
                                                    <button className="btn btn-icon text-danger" onClick={() => handleDelete(entry.id)} title="Löschen" style={{ color: 'var(--color-error)' }}>
                                                        <FiTrash2 />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {modules.length === 0 && <p className="text-muted">Keine Hilfe-Einträge gefunden.</p>}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEntry ? 'Hilfe-Eintrag bearbeiten' : 'Neuer Hilfe-Eintrag'}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group mb-md">
                        <label className="form-label">Modul-Schlüssel (z.B. 'dashboard', 'assets')</label>
                        <input type="text" className="form-control" name="module" value={formData.module} onChange={handleChange} required />
                    </div>
                    <div className="form-group mb-md">
                        <label className="form-label">Benötigte Berechtigung (z.B. 'all', 'assets.view')</label>
                        <input type="text" className="form-control" name="permission_required" value={formData.permission_required} onChange={handleChange} required />
                    </div>
                    <div className="form-group mb-md">
                        <label className="form-label">Titel (Überschrift)</label>
                        <input type="text" className="form-control" name="title" value={formData.title} onChange={handleChange} required />
                    </div>
                    <div className="form-group mb-md">
                        <label className="form-label">Inhalt (HTML erlaubt)</label>
                        <textarea className="form-control" name="content" value={formData.content} onChange={handleChange} rows="5" required />
                        <small className="text-muted">Du kannst hier HTML-Tags wie &lt;p&gt;, &lt;b&gt;, &lt;ul&gt; etc. verwenden.</small>
                    </div>
                    <div className="form-group mb-md">
                        <label className="form-label">Reihenfolge (Sortierung)</label>
                        <input type="number" className="form-control" name="order_index" value={formData.order_index} onChange={handleChange} />
                    </div>
                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Abbrechen</button>
                        <button type="submit" className="btn btn-primary"><FiSave /> Speichern</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HelpAdmin;
