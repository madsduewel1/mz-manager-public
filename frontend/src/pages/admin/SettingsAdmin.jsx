import { useState, useEffect } from 'react';
import { FiImage } from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useSettings } from '../../contexts/SettingsContext';

const SettingsAdmin = () => {
    const { settings, updateSettingsState, refreshSettings } = useSettings();
    const [settingsForm, setSettingsForm] = useState({
        org_name: '',
        base_url: '',
        module_network_enabled: 'false',
        module_accessories_enabled: 'false'
    });
    const [submitting, setSubmitting] = useState(false);
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => {
        if (settings) {
            setSettingsForm({
                org_name: settings.org_name || '',
                base_url: settings.base_url || '',
                module_network_enabled: settings.module_network_enabled || 'false',
                module_accessories_enabled: settings.module_accessories_enabled || 'false'
            });
        }
    }, [settings]);

    const handleSettingsSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            await adminAPI.updateSettings(settingsForm);
            updateSettingsState(settingsForm);
            success('Einstellungen gespeichert');
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('logo', file);
        try {
            await adminAPI.uploadLogo(formData);
            await refreshSettings();
            success('Logo hochgeladen');
        } catch (err) {
            error('Fehler beim Logo-Upload');
        }
    };

    const handleDeleteLogo = async () => {
        const confirmed = await confirm({
            title: 'Logo löschen',
            message: 'Möchten Sie das Logo wirklich entfernen?',
            confirmLabel: 'Löschen',
            confirmColor: 'var(--color-error)'
        });
        if (!confirmed) return;
        try {
            await adminAPI.deleteLogo();
            await refreshSettings();
            success('Logo entfernt');
        } catch (err) {
            error('Fehler beim Löschen des Logos');
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">System-Einstellungen</h2>
            </div>
            <div className="card-body">
                <form onSubmit={handleSettingsSubmit} style={{ maxWidth: '600px' }}>
                    <div className="form-group">
                        <label className="form-label">Name der Organisation</label>
                        <input type="text" className="form-input" value={settingsForm.org_name} onChange={(e) => setSettingsForm({ ...settingsForm, org_name: e.target.value })} placeholder="z.B. Thomas-Mann-Schule" />
                        <p className="text-muted text-small mt-sm">Erscheint in der Seitenleiste und auf QR-Etiketten.</p>
                    </div>

                    <div className="form-group mt-xl">
                        <label className="form-label">Logo</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-sm)' }}>
                            {settings.logo_path ? (
                                <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                    <img src={`/uploads/${settings.logo_path}?t=${Date.now()}`} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                </div>
                            ) : (
                                <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>
                                    <FiImage size={32} />
                                </div>
                            )}
                            <div>
                                <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                                <label htmlFor="logo-upload" className="btn btn-secondary btn-sm">Upload</label>
                                {settings.logo_path && <button type="button" className="btn btn-outline btn-sm text-danger" style={{ marginLeft: '8px' }} onClick={handleDeleteLogo}>Entfernen</button>}
                            </div>
                        </div>
                    </div>

                    <div className="form-group mt-xl">
                        <label className="form-label">System-URL (Domain)</label>
                        <input type="url" className="form-input" value={settingsForm.base_url} onChange={(e) => setSettingsForm({ ...settingsForm, base_url: e.target.value })} placeholder="https://example.com" />
                        <p className="text-muted text-small mt-sm">Wichtig für QR-Codes und Links.</p>
                    </div>

                    <div className="form-group mt-xl">
                        <h4 className="mb-md">Module</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="checkbox-card">
                                <input type="checkbox" checked={settingsForm.module_network_enabled === 'true'} onChange={(e) => setSettingsForm({ ...settingsForm, module_network_enabled: e.target.checked ? 'true' : 'false' })} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Netzwerk-Modul</div>
                                    <div className="text-small text-muted">VLAN- und IP-Verwaltung</div>
                                </div>
                            </label>
                            <label className="checkbox-card">
                                <input type="checkbox" checked={settingsForm.module_accessories_enabled === 'true'} onChange={(e) => setSettingsForm({ ...settingsForm, module_accessories_enabled: e.target.checked ? 'true' : 'false' })} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Zubehör-Modul</div>
                                    <div className="text-small text-muted">Inventarisierung von Zubehör</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="mt-xl">
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Speichert...' : 'Einstellungen speichern'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                .checkbox-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    background: var(--color-bg-medium);
                    transition: all 0.2s;
                }
                .checkbox-card:hover {
                    background: var(--color-bg-light);
                    border-color: var(--color-primary);
                }
            `}</style>
        </div>
    );
};

export default SettingsAdmin;
