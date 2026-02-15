import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiCamera } from 'react-icons/fi';
import { errorsAPI } from '../services/api';

function PublicErrorReport() {
    const { qrCode } = useParams();
    const [itemInfo, setItemInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Form state
    const [description, setDescription] = useState('');
    const [reporterName, setReporterName] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [photo, setPhoto] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadItemInfo();
    }, [qrCode]);

    const loadItemInfo = async () => {
        try {
            const response = await errorsAPI.getPublicInfo(qrCode);
            setItemInfo(response.data);

            // Pre-select asset if it's a single asset
            if (response.data.type === 'asset') {
                setSelectedAssetId(response.data.data.id);
            }
        } catch (err) {
            setError('QR-Code ungültig oder nicht gefunden');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setPhoto(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('qr_code', qrCode);
            formData.append('description', description);
            formData.append('reporter_name', reporterName);
            formData.append('reporter_email', reporterEmail);
            if (selectedAssetId) {
                formData.append('selected_asset_id', selectedAssetId);
            }
            if (photo) {
                formData.append('photo', photo);
            }

            await errorsAPI.submitPublic(formData);
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Einreichen der Meldung');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div className="loading">Lade Informationen...</div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.success}>
                        <FiCheckCircle size={64} color="var(--color-success)" />
                        <h2>Fehler erfolgreich gemeldet!</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-md)' }}>
                            Vielen Dank für deine Meldung. Das IT-Team wurde benachrichtigt und wird sich um das Problem kümmern.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !itemInfo) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.error}>
                        <FiAlertCircle size={64} color="var(--color-error)" />
                        <h2>Fehler</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-md)' }}>
                            {error}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <FiAlertCircle size={48} color="var(--color-warning)" />
                    <h1>Fehler melden</h1>
                    <p style={styles.subtitle}>Kein Login erforderlich</p>
                </div>

                {/* Item Info */}
                <div style={styles.itemInfo}>
                    {itemInfo.type === 'asset' ? (
                        <>
                            <h3>Gerät</h3>
                            <p><strong>Inventarnummer:</strong> {itemInfo.data.inventory_number}</p>
                            <p><strong>Typ:</strong> {itemInfo.data.type}</p>
                            {itemInfo.data.model && <p><strong>Modell:</strong> {itemInfo.data.model}</p>}
                            {itemInfo.data.container_name && <p><strong>Standort:</strong> {itemInfo.data.container_name}</p>}
                        </>
                    ) : (
                        <>
                            <h3>Container</h3>
                            <p><strong>Name:</strong> {itemInfo.data.name}</p>
                            <p><strong>Typ:</strong> {itemInfo.data.type}</p>
                            {itemInfo.data.location && <p><strong>Standort:</strong> {itemInfo.data.location}</p>}
                            <p><strong>Enthaltene Geräte:</strong> {itemInfo.data.assets.length}</p>
                        </>
                    )}
                </div>

                {/* Error Report Form */}
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={styles.errorBox}>
                            <FiAlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Select Asset if Container */}
                    {itemInfo.type === 'container' && itemInfo.data.assets.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Welches Gerät ist betroffen? (optional)</label>
                            <select
                                className="form-select"
                                value={selectedAssetId}
                                onChange={(e) => setSelectedAssetId(e.target.value)}
                            >
                                <option value="">-- Gesamter Container --</option>
                                {itemInfo.data.assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.inventory_number} - {asset.type} {asset.model && `(${asset.model})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Was ist das Problem? *</label>
                        <textarea
                            className="form-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Beschreibe den Fehler so genau wie möglich..."
                            required
                            rows="4"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Dein Name (optional)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            placeholder="z.B. Max Mustermann"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Deine E-Mail (optional)</label>
                        <input
                            type="email"
                            className="form-input"
                            value={reporterEmail}
                            onChange={(e) => setReporterEmail(e.target.value)}
                            placeholder="z.B. max@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <FiCamera size={18} style={{ verticalAlign: 'middle', marginRight: 'var(--space-xs)' }} />
                            Foto hochladen (optional)
                        </label>
                        <input
                            type="file"
                            className="form-input"
                            onChange={handlePhotoChange}
                            accept="image/*"
                        />
                        {photo && (
                            <p className="text-small text-muted" style={{ marginTop: 'var(--space-sm)' }}>
                                Ausgewählt: {photo.name}
                            </p>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                        {submitting ? 'Wird gesendet...' : 'Fehler melden'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-lg)',
        background: 'linear-gradient(135deg, var(--color-bg-dark), var(--color-bg-medium))'
    },
    card: {
        width: '100%',
        maxWidth: '600px',
        background: 'var(--color-bg-medium)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        boxShadow: 'var(--shadow-xl)'
    },
    header: {
        textAlign: 'center',
        marginBottom: 'var(--space-xl)'
    },
    subtitle: {
        color: 'var(--color-text-secondary)',
        marginTop: 'var(--space-sm)'
    },
    itemInfo: {
        background: 'var(--color-bg-light)',
        padding: 'var(--space-lg)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-xl)',
        border: '1px solid var(--color-border)'
    },
    errorBox: {
        background: 'hsla(0, 84%, 60%, 0.15)',
        color: 'var(--color-error)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)'
    },
    success: {
        textAlign: 'center',
        padding: 'var(--space-2xl) 0'
    },
    error: {
        textAlign: 'center',
        padding: 'var(--space-2xl) 0'
    }
};

export default PublicErrorReport;
