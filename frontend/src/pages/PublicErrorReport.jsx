import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FiAlertCircle, FiCheckCircle, FiCamera, FiChevronRight, 
    FiMapPin, FiBox, FiSmartphone, FiArrowLeft, FiImage, 
    FiMonitor, FiVideo, FiWifi, FiPrinter, FiHelpCircle, FiSearch, FiInfo, FiX
} from 'react-icons/fi';
import { errorsAPI } from '../services/api';

function PublicErrorReport() {
    const { qrCode } = useParams();
    const navigate = useNavigate();

    // UI State
    const [step, setStep] = useState(qrCode ? 'category' : 'room'); // room, category, assets, details, summary
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [roomSearch, setRoomSearch] = useState('');

    // Data Lists
    const [rooms, setRooms] = useState([]);
    const [roomAssets, setRoomAssets] = useState([]);

    // Selection State
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [scannedInfo, setScannedInfo] = useState(null);

    // Form state
    const [description, setDescription] = useState('');
    const [reporterName, setReporterName] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef();

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
            setStep('category');
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
        } catch (err) {
            setError('Fehler beim Laden der Räume');
        } finally {
            setLoading(false);
        }
    };

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
        setStep('category');
    };

    const handleCategorySelect = async (category) => {
        setSelectedCategory(category);
        setSelectedAsset(null); // Reset asset selection when category changes

        // If category is Network or Other, skip asset selection
        if (category.id === 'network' || category.id === 'other') {
            setStep('details');
            return;
        }

        // If we have a scanned info, we already have the asset or container
        if (scannedInfo) {
            setStep('details');
            return;
        }

        // Otherwise, fetch assets for the room and filter by category
        setLoading(true);
        try {
            const response = await errorsAPI.getPublicAssetsInRoom(selectedRoom.id);
            
            // Filter assets by type mapping
            const typeMap = {
                'computer': ['laptop', 'ipad', 'tablet'],
                'beamer': ['beamer', 'monitor'],
                'printer': ['printer'] // Add if exists in mapping
            };

            const allowedTypes = typeMap[category.id] || [category.id];
            const filtered = response.data.filter(a => allowedTypes.includes(a.type.toLowerCase()));

            if (filtered.length > 0) {
                setRoomAssets(filtered);
                setStep('assets');
            } else {
                setStep('details');
            }
        } catch (err) {
            console.error('Error fetching assets:', err);
            setStep('details');
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

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const formData = new FormData();

            // Asset ID
            const aid = selectedAsset?.id || (scannedInfo?.type === 'asset' ? scannedInfo.data.id : null);
            if (aid) formData.append('selected_asset_id', aid);

            // Container ID (Room)
            const cid = selectedRoom?.id || (scannedInfo?.type === 'container' ? scannedInfo.data.id : null);
            if (cid) formData.append('container_id', cid);

            // QR Code (optional if IDs exist, but good for tracking)
            const currentQrCode = qrCode || scannedInfo?.data?.qr_code || selectedAsset?.qr_code;
            if (currentQrCode) formData.append('qr_code', currentQrCode);

            formData.append('category', selectedCategory.id);
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

    const categories = [
        { id: 'computer', label: 'Computer / Laptop', icon: <FiMonitor />, color: '#3b82f6' },
        { id: 'beamer', label: 'Beamer / Display', icon: <FiVideo />, color: '#8b5cf6' },
        { id: 'network', label: 'Internet / WLAN', icon: <FiWifi />, color: '#10b981' },
        { id: 'printer', label: 'Drucker', icon: <FiPrinter />, color: '#f59e0b' },
        { id: 'other', label: 'Sonstiges', icon: <FiHelpCircle />, color: '#6b7280' }
    ];

    const filteredRooms = rooms.filter(r => 
        r.name.toLowerCase().includes(roomSearch.toLowerCase()) || 
        r.building.toLowerCase().includes(roomSearch.toLowerCase())
    );

    const stepInfo = {
        room: { nr: 1, total: 5, title: 'Raum auswählen', help: 'Bitte wähle den Raum aus, in dem das Problem auftritt.' },
        category: { nr: 2, total: 5, title: 'Kategorie wählen', help: 'Was für ein Gerät ist betroffen?' },
        assets: { nr: 3, total: 5, title: 'Gerät auswählen', help: 'Wähle das spezifische Gerät aus der Liste aus.' },
        details: { nr: 4, total: 5, title: 'Problem beschreiben', help: 'Beschreibe kurz, was genau nicht funktioniert.' },
        summary: { nr: 5, total: 5, title: 'Überprüfen & Senden', help: 'Bitte kontrolliere deine Angaben noch einmal.' }
    };

    const currentStep = stepInfo[step] || { nr: 0, total: 5, title: '', help: '' };

    if (submitted) {
        return (
            <div className="public-report-container">
                <div className="report-card text-center py-2xl">
                    <FiCheckCircle size={80} color="var(--color-success)" className="mb-xl fade-in" />
                    <h1 className="mb-md">Meldung erfolgreich!</h1>
                    <p className="text-muted mb-2xl">Vielen Dank für deine Hilfe. Das IT-Team wurde benachrichtigt und wird sich so schnell wie möglich darum kümmern.</p>
                    <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg w-full">Zurück zum Start</button>
                </div>
            </div>
        );
    }

    return (
        <div className="public-report-container">
            {/* Progress Bar */}
            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${(currentStep.nr / currentStep.total) * 100}%` }}></div>
                <div className="progress-text">Schritt {currentStep.nr} von {currentStep.total}</div>
            </div>

            <div className="report-card">
                <div className="report-header">
                    {(step !== 'room' && !qrCode) && (
                        <button className="back-btn" onClick={() => {
                            if (step === 'category') setStep('room');
                            if (step === 'assets') setStep('category');
                            if (step === 'details') {
                                if (roomAssets.length > 0 && (selectedCategory?.id === 'computer' || selectedCategory?.id === 'beamer')) {
                                    setStep('assets');
                                } else {
                                    setStep('category');
                                }
                            }
                            if (step === 'summary') setStep('details');
                        }}>
                            <FiArrowLeft size={20} />
                        </button>
                    )}
                    <h2 className="mb-0">{currentStep.title}</h2>
                </div>

                {/* Help Box */}
                <div className="help-box mb-xl">
                    <FiInfo size={18} />
                    <p>{currentStep.help}</p>
                </div>

                {/* STEP 1: ROOM */}
                {step === 'room' && (
                    <div className="fade-in">
                        <div className="search-box mb-lg">
                            <FiSearch />
                            <input 
                                type="text" 
                                placeholder="Raum suchen (z.B. A101)..." 
                                value={roomSearch}
                                onChange={(e) => setRoomSearch(e.target.value)}
                            />
                        </div>

                        {loading ? <div className="loading-spinner"></div> : (
                            <div className="tile-grid">
                                {filteredRooms.map(room => (
                                    <button key={room.id} className="room-tile" onClick={() => handleRoomSelect(room)}>
                                        <div className="tile-icon"><FiMapPin /></div>
                                        <div className="tile-content">
                                            <span className="tile-title">{room.name}</span>
                                            <span className="tile-subtitle">{room.building}</span>
                                        </div>
                                        <FiChevronRight className="tile-arrow" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: CATEGORY */}
                {step === 'category' && (
                    <div className="fade-in">
                        {scannedInfo && (
                            <div className="scanned-info mb-lg">
                                <FiSmartphone />
                                <div>
                                    <small>Gescandtes Gerät:</small>
                                    <strong>{scannedInfo.data.inventory_number || scannedInfo.data.name}</strong>
                                </div>
                            </div>
                        )}
                        {!qrCode && selectedRoom && (
                            <div className="scanned-info mb-lg">
                                <FiMapPin />
                                <div>
                                    <small>Ausgewählter Raum:</small>
                                    <strong>{selectedRoom.name}</strong>
                                </div>
                            </div>
                        )}

                        <div className="category-grid">
                            {categories.map(cat => (
                                <button 
                                    key={cat.id} 
                                    className="category-card" 
                                    style={{ borderColor: selectedCategory?.id === cat.id ? cat.color : 'transparent' }}
                                    onClick={() => handleCategorySelect(cat)}
                                >
                                    <div className="cat-icon" style={{ background: `${cat.color}20`, color: cat.color }}>
                                        {cat.icon}
                                    </div>
                                    <span className="cat-label">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: ASSET SELECTION */}
                {step === 'assets' && (
                    <div className="fade-in">
                        <div className="tile-grid">
                            {roomAssets.map(asset => (
                                <button key={asset.id} className="room-tile" onClick={() => handleAssetSelect(asset)}>
                                    <div className="tile-icon">
                                        {asset.type.toLowerCase().includes('laptop') ? <FiMonitor /> : <FiBox />}
                                    </div>
                                    <div className="tile-content">
                                        <span className="tile-title">{asset.inventory_number}</span>
                                        <span className="tile-subtitle">{asset.model || asset.type}</span>
                                    </div>
                                    <FiChevronRight className="tile-arrow" />
                                </button>
                            ))}
                            <button className="room-tile other-btn mt-md" onClick={() => setStep('details')}>
                                <div className="tile-icon"><FiHelpCircle /></div>
                                <div className="tile-content">
                                    <span className="tile-title">Anderes Problem / Gerät nicht in Liste</span>
                                </div>
                                <FiChevronRight className="tile-arrow" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: DETAILS */}
                {step === 'details' && (
                    <div className="fade-in">
                        <div className="form-group mb-lg">
                            <label className="form-label">Beschreibung *</label>
                            <textarea 
                                className="form-textarea"
                                rows="5"
                                placeholder="Beschreibe kurz, was genau nicht funktioniert..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            ></textarea>
                        </div>

                        <div className="photo-upload-container mb-xl">
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoChange} />
                            {photoPreview ? (
                                <div className="photo-preview-wrap">
                                    <img src={photoPreview} alt="Vorschau" />
                                    <button className="remove-photo" onClick={() => {setPhoto(null); setPhotoPreview(null);}}>
                                        <FiX />
                                    </button>
                                </div>
                            ) : (
                                <button className="photo-btn" onClick={() => fileInputRef.current?.click()}>
                                    <FiCamera size={24} />
                                    <span>Bild hinzufügen (optional)</span>
                                </button>
                            )}
                        </div>

                        <button 
                            className="btn btn-primary btn-lg w-full" 
                            disabled={!description.trim()}
                            onClick={() => setStep('summary')}
                        >
                            Weiter zur Zusammenfassung
                        </button>
                    </div>
                )}

                {/* STEP 5: SUMMARY */}
                {step === 'summary' && (
                    <div className="fade-in">
                        <div className="summary-list mb-2xl">
                            <div className="summary-item">
                                <label>Ort / Gerät:</label>
                                <span>
                                    {selectedAsset ? selectedAsset.inventory_number : (
                                        qrCode ? (scannedInfo?.data.inventory_number || scannedInfo?.data.name) : selectedRoom?.name
                                    )}
                                </span>
                            </div>
                            <div className="summary-item">
                                <label>Kategorie:</label>
                                <span>{selectedCategory?.label}</span>
                            </div>
                            <div className="summary-item">
                                <label>Beschreibung:</label>
                                <p>{description}</p>
                            </div>
                            {photo && (
                                <div className="summary-item">
                                    <label>Foto:</label>
                                    <div className="summary-photo">
                                        <FiImage size={18} /> Bild angehängt
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-group mb-xl">
                            <label className="form-label">Dein Name (optional)</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Max Mustermann"
                                value={reporterName}
                                onChange={(e) => setReporterName(e.target.value)}
                            />
                        </div>

                        <button 
                            className="btn btn-primary btn-lg w-full mb-md" 
                            disabled={submitting}
                            onClick={handleSubmit}
                        >
                            {submitting ? 'Wird gesendet...' : 'Fehler jetzt melden'}
                        </button>
                        <button className="btn btn-secondary w-full" onClick={() => setStep('details')}>
                            Zurück zur Bearbeitung
                        </button>
                    </div>
                )}

                {error && (
                    <div className="error-toast">
                        <FiAlertCircle />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            <style jsx>{`
                .public-report-container {
                    min-height: 100vh;
                    background: var(--color-bg-dark);
                    padding: var(--space-md);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    font-family: var(--font-family);
                }

                .progress-container {
                    width: 100%;
                    max-width: 500px;
                    background: var(--color-bg-medium);
                    height: 60px;
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-lg);
                    position: relative;
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                }

                .progress-bar {
                    height: 100%;
                    background: var(--color-primary);
                    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0.15;
                }

                .progress-text {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: var(--color-text-primary);
                    font-size: 14px;
                }

                .report-card {
                    width: 100%;
                    max-width: 500px;
                    background: var(--color-bg-medium);
                    border-radius: 24px;
                    padding: var(--space-xl);
                    box-shadow: var(--shadow-xl);
                    border: 1px solid var(--color-border);
                }

                .report-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    margin-bottom: var(--space-lg);
                }

                .back-btn {
                    background: var(--color-bg-light);
                    border: none;
                    color: var(--color-text-primary);
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .help-box {
                    background: hsla(210, 100%, 50%, 0.1);
                    border: 1px solid hsla(210, 100%, 50%, 0.2);
                    padding: var(--space-md);
                    border-radius: 16px;
                    display: flex;
                    gap: var(--space-md);
                    align-items: flex-start;
                    color: var(--color-text-primary);
                }

                .help-box p {
                    font-size: 13.5px;
                    line-height: 1.5;
                    margin: 0;
                    opacity: 0.9;
                }

                .search-box {
                    background: var(--color-bg-light);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    padding: 0 var(--space-md);
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    color: var(--color-text-tertiary);
                }

                .search-box input {
                    background: transparent;
                    border: none;
                    padding: 14px 0;
                    color: var(--color-text-primary);
                    width: 100%;
                    outline: none;
                }

                .tile-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: 400px;
                    overflow-y: auto;
                    padding-right: 4px;
                }

                .room-tile {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    background: var(--color-bg-light);
                    border: 1px solid var(--color-border);
                    border-radius: 18px;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    gap: 16px;
                    width: 100%;
                }

                .room-tile:hover {
                    border-color: var(--color-primary);
                    transform: translateX(4px);
                    background: var(--color-bg-lighter);
                }

                .tile-icon {
                    width: 44px;
                    height: 44px;
                    background: var(--color-bg-medium);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: var(--color-primary);
                }

                .tile-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .tile-title {
                    font-weight: 700;
                    font-size: 16px;
                    color: var(--color-text-primary);
                }

                .tile-subtitle {
                    font-size: 12px;
                    color: var(--color-text-tertiary);
                }

                .category-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }

                .category-card {
                    background: var(--color-bg-light);
                    border: 2px solid transparent;
                    border-radius: 20px;
                    padding: 24px 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .category-card:hover {
                    transform: translateY(-4px);
                    background: var(--color-bg-lighter);
                }

                .cat-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                }

                .cat-label {
                    font-weight: 700;
                    font-size: 14px;
                    color: var(--color-text-primary);
                    text-align: center;
                }

                .other-btn {
                    border-style: dashed;
                    opacity: 0.8;
                }

                .form-textarea {
                    width: 100%;
                    background: var(--color-bg-light);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    padding: 16px;
                    color: var(--color-text-primary);
                    font-size: 16px;
                    resize: none;
                    outline: none;
                }

                .photo-btn {
                    width: 100%;
                    border: 2px dashed var(--color-border);
                    border-radius: 16px;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    background: transparent;
                    color: var(--color-text-tertiary);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .photo-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                    background: hsla(210, 100%, 50%, 0.05);
                }

                .photo-preview-wrap {
                    position: relative;
                    width: 100%;
                    border-radius: 16px;
                    overflow: hidden;
                }

                .photo-preview-wrap img {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                }

                .remove-photo {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(0,0,0,0.6);
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .summary-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .summary-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--color-border);
                }

                .summary-item:last-child {
                    border-bottom: none;
                }

                .summary-item label {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: var(--color-text-tertiary);
                    letter-spacing: 0.5px;
                }

                .summary-item span, .summary-item p {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--color-text-primary);
                    margin: 0;
                }

                .scanned-info {
                    background: var(--color-bg-dark);
                    padding: 14px 18px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    border-left: 4px solid var(--color-primary);
                }

                .scanned-info small {
                    display: block;
                    font-size: 11px;
                    color: var(--color-text-tertiary);
                    margin-bottom: 2px;
                }

                .error-toast {
                    margin-top: var(--space-lg);
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--color-error);
                    padding: 12px 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13.5px;
                    animation: shake 0.5s ease-in-out;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--color-border);
                    border-top: 4px solid var(--color-primary);
                    border-radius: 50%;
                    margin: var(--space-xl) auto;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Desktop Adaptions */
                @media (min-width: 1200px) {
                    .report-card {
                        max-width: 800px;
                    }
                    .tile-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        max-height: none;
                    }
                    .category-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
            `}</style>
        </div>
    );
}

export default PublicErrorReport;
