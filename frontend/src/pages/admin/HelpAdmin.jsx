import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiCheck, FiArrowLeft } from 'react-icons/fi';
import { helpAPI } from '../../services/api';

const HelpAdmin = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
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

    const handleOpenEditor = (entry = null) => {
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
        setIsEditing(true);
        window.scrollTo(0, 0);
    };

    const handleCloseEditor = () => {
        setIsEditing(false);
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
            handleCloseEditor();
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

    // Editor View
    if (isEditing) {
        return (
            <div className="fade-in editor-mode" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                    <button className="btn btn-icon" onClick={handleCloseEditor} title="Zurück">
                        <FiArrowLeft size={24} />
                    </button>
                    <h2 className="card-title" style={{ margin: 0 }}>
                        {editingEntry ? 'Hilfe-Eintrag bearbeiten' : 'Neuer Hilfe-Eintrag'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="card p-xl" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    
                    <div className="grid grid-2 grid-mobile-1" style={{ gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem' }}>Modul-Schlüssel</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                name="module" 
                                value={formData.module} 
                                onChange={handleChange} 
                                placeholder="z.B. dashboard, assets, containers"
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                                required 
                            />
                            <small className="text-muted" style={{ marginTop: '0.5rem', display: 'block' }}>Bestimmt, auf welcher Seite die Hilfe erscheint.</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem' }}>Benötigte Berechtigung</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                name="permission_required" 
                                value={formData.permission_required} 
                                onChange={handleChange} 
                                placeholder="z.B. all, assets.view"
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                                required 
                            />
                            <small className="text-muted" style={{ marginTop: '0.5rem', display: 'block' }}>Welches Recht braucht der Nutzer, um dies zu sehen?</small>
                        </div>
                    </div>

                    <div className="grid grid-2 grid-mobile-1" style={{ gap: '1.5rem', alignItems: 'start' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem' }}>Titel (Überschrift)</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                name="title" 
                                value={formData.title} 
                                onChange={handleChange} 
                                placeholder="Titel des Hilfe-Artikels"
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem' }}>Reihenfolge</label>
                            <input 
                                type="number" 
                                className="form-control" 
                                name="order_index" 
                                value={formData.order_index} 
                                onChange={handleChange} 
                                style={{ padding: '0.75rem', fontSize: '1rem' }}
                            />
                            <small className="text-muted" style={{ marginTop: '0.5rem', display: 'block' }}>Niedrigere Zahlen erscheinen weiter oben.</small>
                        </div>
                    </div>

                    <div className="form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Inhalt (HTML erlaubt)</span>
                        </label>
                        <textarea 
                            className="form-control" 
                            name="content" 
                            value={formData.content} 
                            onChange={handleChange} 
                            rows="20" 
                            style={{ padding: '1rem', fontSize: '1rem', fontFamily: 'monospace', lineHeight: '1.5', minHeight: '400px', resize: 'vertical' }}
                            placeholder="<p>Hier kommt der Text hin...</p>"
                            required 
                        />
                        <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--color-primary)', borderRadius: '4px' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <strong>Tipp:</strong> Du kannst HTML-Tags verwenden, um den Text schöner zu machen. 
                                <code style={{ margin: '0 5px' }}>&lt;p&gt;Absatz&lt;/p&gt;</code>
                                <code style={{ margin: '0 5px' }}>&lt;b&gt;Fett&lt;/b&gt;</code>
                                <code style={{ margin: '0 5px' }}>&lt;ul&gt;&lt;li&gt;Liste&lt;/li&gt;&lt;/ul&gt;</code>
                                <code style={{ margin: '0 5px' }}>&lt;h3&gt;Überschrift&lt;/h3&gt;</code>
                            </p>
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" className="btn btn-outline" onClick={handleCloseEditor} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>Abbrechen</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FiSave size={18} /> Speichern
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // List View
    return (
        <div className="fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="card-title">Hilfe-System verwalten</h2>
                <button className="btn btn-primary" onClick={() => handleOpenEditor()} style={{ padding: '0.75rem 1.5rem' }}>
                    <FiPlus /> Neuer Eintrag
                </button>
            </div>

            {successMessage && (
                <div className="alert success" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ebfbee', color: '#2b8a3e', padding: '1rem', borderRadius: '8px' }}>
                    <FiCheck size={20} /> <span style={{ fontWeight: 500 }}>{successMessage}</span>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Lade Hilfe-Texte...</div>
            ) : (
                <div className="help-modules-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {modules.map(mod => (
                        <div key={mod.module} className="card" style={{ overflow: 'hidden' }}>
                            <div className="card-header" style={{ background: 'var(--bg-secondary)', padding: '1rem 1.5rem' }}>
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                                    <span style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{mod.module}</span>
                                    <span className="badge" style={{ background: 'var(--bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                                        Recht: {mod.permission_required}
                                    </span>
                                </h3>
                            </div>
                            <div className="card-body" style={{ padding: 0 }}>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem', width: '80px' }}>Pos.</th>
                                            <th style={{ textAlign: 'left', padding: '0.75rem 1.5rem' }}>Titel</th>
                                            <th style={{ textAlign: 'right', padding: '0.75rem 1.5rem', width: '120px' }}>Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mod.entries.map((entry, idx) => (
                                            <tr key={entry.id} style={{ borderBottom: idx < mod.entries.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.2s' }} className="table-row-hover">
                                                <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{entry.order_index}</td>
                                                <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{entry.title}</td>
                                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button 
                                                            className="btn btn-icon" 
                                                            onClick={() => handleOpenEditor({ ...entry, module: mod.module, permission_required: mod.permission_required })} 
                                                            title="Bearbeiten"
                                                            style={{ background: 'var(--bg-secondary)' }}
                                                        >
                                                            <FiEdit2 />
                                                        </button>
                                                        <button 
                                                            className="btn btn-icon" 
                                                            onClick={() => handleDelete(entry.id)} 
                                                            title="Löschen" 
                                                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                    {modules.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                            Noch keine Hilfe-Einträge vorhanden. Klicke oben auf "Neuer Eintrag".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HelpAdmin;
