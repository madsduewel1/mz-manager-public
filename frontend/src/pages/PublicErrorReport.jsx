import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiCamera, FiChevronRight, FiMapPin, FiBox, FiSmartphone, FiArrowLeft, FiImage } from 'react-icons/fi';
import { errorsAPI } from '../services/api';

function PublicErrorReport() {
    const { qrCode } = useParams();
    const navigate = useNavigate();

    // UI State
    const [step, setStep] = useState(qrCode ? 'details' : 'room'); // room, container, asset, details
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Data Lists
    const [rooms, setRooms] = useState([]);
    const [containers, setContainers] = useState([]);
    const [assets, setAssets] = useState([]);

    // Selection State
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [scannedInfo, setScannedInfo] = useState(null);

    // Form state
    const [description, setDescription] = useState('');
    const [reporterName, setReporterName] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (qrCode) {
            loadScannedInfo();
        } else {
            loadRooms();
        }
    }, [qrCode]);

    const loadScannedInfo = async () => {
        setLoading(true);
        try {
            const response = await errorsAPI.getPublicInfo(qrCode);
            setScannedInfo(response.data);
            setStep('details');
        } catch (err) {
            setError('QR-Code ungültig oder nicht gefunden. Du kannst das Gerät aber manuell suchen.');
            loadRooms();
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async () => {
        setLoading(true);
        try {
            const response = await errorsAPI.getPublicRooms();
            setRooms(response.data);
            setStep('room');
        } catch (err) {
            setError('Fehler beim Laden der Räume');
        } finally {
            setLoading(false);
        }
    };

    const handleRoomSelect = async (room) => {
        setSelectedRoom(room);
        setLoading(true);
        try {
            const response = await errorsAPI.getPublicContainersInRoom(room.id);
            setContainers(response.data);
            if (response.data.length === 0) {
                // If no containers, maybe there are assets directly in the room (not supported yet but safe check)
                setStep('details');
            } else {
                setStep('container');
            }
        } catch (err) {
            setError('Fehler beim Laden der Einheiten');
        } finally {
            setLoading(false);
        }
    };

    const handleContainerSelect = async (container) => {
        setSelectedContainer(container);
        setLoading(true);
        try {
            const response = await errorsAPI.getPublicAssetsInContainer(container.id);
            setAssets(response.data);
            setStep('asset');
        } catch (err) {
            setError('Fehler beim Laden der Geräte');
        } finally {
            setLoading(false);
        }
    };

    const handleAssetSelect = (asset) => {
        setSelectedAsset(asset);
        setStep('details');
    };

    const handlePhotoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const formData = new FormData();

            // Determine IDs and QR Code
            const currentQrCode = qrCode || scannedInfo?.data?.qr_code || selectedAsset?.qr_code || selectedContainer?.qr_code || selectedRoom?.qr_code;
            if (currentQrCode) formData.append('qr_code', currentQrCode);

            // Asset ID
            const aid = selectedAsset?.id || (scannedInfo?.type === 'asset' ? scannedInfo.data.id : null);
            if (aid) formData.append('selected_asset_id', aid);

            // Container ID (Room or Wagon)
            const cid = selectedContainer?.id || selectedRoom?.id || (scannedInfo?.type === 'container' ? scannedInfo.data.id : null);
            if (cid) formData.append('container_id', cid);

            formData.append('description', description);
            formData.append('reporter_name', reporterName);
            formData.append('reporter_email', reporterEmail);
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

    const StepHeader = ({ title, onBack }) => (
        <div style={styles.stepHeader}>
            {onBack && (
                <button onClick={onBack} style={styles.backBtn}>
                    <FiArrowLeft size={20} />
                </button>
            )}
            <h1 style={styles.title}>{title}</h1>
        </div>
    );

    if (submitted) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.success}>
                        <FiCheckCircle size={64} color="var(--color-success)" />
                        <h2>Meldung erhalten</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginTop: '20px' }}>
                            Danke! Das IT-Team wurde benachrichtigt und kümmert sich bald darum.
                        </p>
                        <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ marginTop: '30px' }}>
                            Zurück zum Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {step === 'room' && (
                    <>
                        <StepHeader title="Wo ist das Problem?" />
                        <p style={styles.subtitle}>Wähle zuerst den Raum aus</p>
                        {loading ? <div className="loading">Lade Räume...</div> : (
                            <div style={styles.grid}>
                                {rooms.map(room => (
                                    <button key={room.id} style={styles.navItem} onClick={() => handleRoomSelect(room)}>
                                        <div style={styles.navIcon}><FiMapPin /></div>
                                        <div style={styles.navText}>
                                            <span style={styles.navName}>{room.name}</span>
                                            <span style={styles.navMeta}>{room.building} {room.floor && `• ${room.floor}`}</span>
                                        </div>
                                        <FiChevronRight style={styles.navArrow} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {step === 'container' && (
                    <>
                        <StepHeader title={selectedRoom.name} onBack={() => setStep('room')} />
                        <p style={styles.subtitle}>Wähle den Schrank oder Wagen</p>
                        {loading ? <div className="loading">Lade Einheiten...</div> : (
                            <div style={styles.grid}>
                                {containers.map(c => (
                                    <button key={c.id} style={styles.navItem} onClick={() => handleContainerSelect(c)}>
                                        <div style={styles.navIcon}><FiBox /></div>
                                        <div style={styles.navText}>
                                            <span style={styles.navName}>{c.name}</span>
                                            <span style={styles.navMeta}>{c.type}</span>
                                        </div>
                                        <FiChevronRight style={styles.navArrow} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {step === 'asset' && (
                    <>
                        <StepHeader title={selectedContainer.name} onBack={() => setStep('container')} />
                        <p style={styles.subtitle}>Welches Gerät ist defekt?</p>
                        {loading ? <div className="loading">Lade Geräte...</div> : (
                            <div style={styles.grid}>
                                <button style={{ ...styles.navItem, background: 'rgba(225, 29, 72, 0.05)' }} onClick={() => setStep('details')}>
                                    <div style={{ ...styles.navIcon, background: 'var(--color-primary)' }}><FiAlertCircle color="white" /></div>
                                    <div style={styles.navText}>
                                        <span style={styles.navName}>Anderes Problem</span>
                                        <span style={styles.navMeta}>Gilt für den gesamten Container</span>
                                    </div>
                                    <FiChevronRight style={styles.navArrow} />
                                </button>
                                {assets.map(a => (
                                    <button key={a.id} style={styles.navItem} onClick={() => handleAssetSelect(a)}>
                                        <div style={styles.navIcon}><FiSmartphone /></div>
                                        <div style={styles.navText}>
                                            <span style={styles.navName}>{a.inventory_number}</span>
                                            <span style={styles.navMeta}>{a.model || a.type}</span>
                                        </div>
                                        <FiChevronRight style={styles.navArrow} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {step === 'details' && (
                    <>
                        <StepHeader
                            title="Fehler beschreiben"
                            onBack={qrCode ? null : (selectedAsset ? () => setStep('asset') : () => setStep('container'))}
                        />

                        <div style={styles.selectionSummary}>
                            {scannedInfo ? (
                                <span>{scannedInfo.type === 'asset' ? `Gerät: ${scannedInfo.data.inventory_number}` : `Container: ${scannedInfo.data.name}`}</span>
                            ) : (
                                <span>
                                    {selectedRoom?.name}
                                    {selectedContainer && ` > ${selectedContainer.name}`}
                                    {selectedAsset && ` > ${selectedAsset.inventory_number}`}
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div className="form-group">
                                <label className="form-label">Was funktioniert nicht? *</label>
                                <textarea
                                    className="form-input"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="z.B. Display flackert, Akku lädt nicht..."
                                    required
                                    rows="4"
                                    style={styles.textarea}
                                />
                            </div>

                            <div style={styles.photoSection}>
                                <label style={styles.photoUpload}>
                                    <input type="file" onChange={handlePhotoChange} accept="image/*" style={{ display: 'none' }} />
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" style={styles.previewImage} />
                                    ) : (
                                        <div style={styles.photoPlaceholder}>
                                            <FiCamera size={24} />
                                            <span>Foto hinzufügen (optional)</span>
                                        </div>
                                    )}
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dein Name (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                    placeholder="Max Mustermann"
                                    style={styles.input}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={submitting}>
                                {submitting ? 'Wird gesendet...' : 'Fehler jetzt melden'}
                            </button>
                        </form>
                    </>
                )}

                {error && <div style={styles.errorBox}><FiAlertCircle /> {error}</div>}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        background: 'var(--color-bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        fontFamily: 'var(--font-family)'
    },
    card: {
        width: '100%',
        maxWidth: '500px',
        background: 'var(--color-bg-medium)',
        borderRadius: '24px',
        padding: '30px 20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        marginTop: '20px'
    },
    stepHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '10px'
    },
    backBtn: {
        background: 'var(--color-bg-light)',
        border: 'none',
        color: 'var(--color-text-primary)',
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
    },
    title: {
        fontSize: '22px',
        fontWeight: 800,
        margin: 0,
        color: 'var(--color-text-primary)'
    },
    subtitle: {
        color: 'var(--color-text-tertiary)',
        fontSize: '14px',
        marginBottom: '25px'
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        background: 'var(--color-bg-light)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease',
        width: '100%',
        gap: '15px'
    },
    navIcon: {
        width: '44px',
        height: '44px',
        background: 'var(--color-bg-medium)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary-light)',
        fontSize: '20px'
    },
    navText: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    navName: {
        fontWeight: 700,
        fontSize: '16px',
        color: 'var(--color-text-primary)'
    },
    navMeta: {
        fontSize: '12px',
        color: 'var(--color-text-tertiary)'
    },
    navArrow: {
        color: 'var(--color-text-tertiary)',
        opacity: 0.5
    },
    selectionSummary: {
        background: 'rgba(225, 29, 72, 0.1)',
        padding: '12px 16px',
        borderRadius: '12px',
        marginBottom: '25px',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--color-primary-light)',
        border: '1px dashed var(--color-primary)'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    textarea: {
        borderRadius: '16px',
        padding: '15px',
        resize: 'none',
        background: 'var(--color-bg-light)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        width: '100%',
        boxSizing: 'border-box'
    },
    input: {
        borderRadius: '12px',
        background: 'var(--color-bg-light)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        padding: '12px'
    },
    photoSection: {
        marginBottom: '10px'
    },
    photoUpload: {
        display: 'block',
        cursor: 'pointer'
    },
    photoPlaceholder: {
        border: '2px dashed var(--color-border)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        color: 'var(--color-text-tertiary)',
        transition: 'all 0.2s ease'
    },
    previewImage: {
        width: '100%',
        borderRadius: '16px',
        maxHeight: '200px',
        objectFit: 'cover'
    },
    submitBtn: {
        padding: '18px',
        borderRadius: '16px',
        fontWeight: 800,
        fontSize: '16px',
        boxShadow: '0 10px 20px rgba(225, 29, 72, 0.3)',
        marginTop: '10px'
    },
    errorBox: {
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(225, 29, 72, 0.1)',
        color: 'var(--color-error)',
        borderRadius: '10px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    success: {
        textAlign: 'center',
        padding: '20px 0'
    }
};

export default PublicErrorReport;
