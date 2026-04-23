import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
    FiArrowLeft, FiEdit, FiTrash2, FiClock, FiBox, FiAlertCircle, 
    FiRotateCcw, FiPackage, FiInfo, FiActivity, FiTool 
} from 'react-icons/fi';
import { assetsAPI } from '../services/api';
import { hasPermission } from '../utils/auth';
import StatusBadge from '../components/StatusBadge';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useNotification } from '../contexts/NotificationContext';

function AssetDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { confirm } = useConfirmation();
    const { success, error: notifyError } = useNotification();
    
    const [asset, setAsset] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [assetRes, qrRes, historyRes] = await Promise.all([
                assetsAPI.getOne(id),
                assetsAPI.getQR(id),
                assetsAPI.getHistory(id)
            ]);
            setAsset(assetRes.data);
            setQrCode(qrRes.data.qr_code);
            setHistory(historyRes.data);
        } catch (err) {
            console.error('Error loading asset data:', err);
            notifyError('Fehler beim Laden der Gerätedaten');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: 'Gerät löschen?',
            message: `Möchtest du das Gerät ${asset.inventory_number} wirklich permanent löschen?`,
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (confirmed) {
            try {
                await assetsAPI.delete(id);
                success('Gerät erfolgreich gelöscht');
                navigate('/assets');
            } catch (err) {
                notifyError('Fehler beim Löschen des Geräts');
            }
        }
    };

    if (loading) return <div className="container"><div className="loading">Wird geladen...</div></div>;
    if (!asset) return <div className="container"><p>Gerät nicht gefunden</p></div>;

    const tabs = [
        { id: 'details', label: 'Stammdaten', icon: FiInfo },
        { id: 'history', label: 'Verlauf', icon: FiRotateCcw },
        { id: 'accessories', label: 'Zubehör', icon: FiPackage },
    ];

    return (
        <div className="container">
            {/* Header / Actions */}
            <div className="flex justify-between items-start mb-lg">
                <div className="flex flex-col gap-sm">
                    <Link to="/assets" className="text-muted flex items-center gap-2 hover:text-primary transition-base">
                        <FiArrowLeft size={14} /> Zurück zur Liste
                    </Link>
                    <div className="flex items-center gap-md mt-sm">
                        <h1 className="mb-0">{asset.inventory_number}</h1>
                        <StatusBadge status={asset.status} />
                    </div>
                </div>

                <div className="flex gap-sm">
                    {hasPermission('assets.edit') && (
                        <Link to={`/assets/${asset.id}/edit`} className="btn btn-secondary">
                            <FiEdit size={16} /> Bearbeiten
                        </Link>
                    )}
                    {hasPermission('lendings.create') && asset.status === 'ok' && !asset.current_lending && (
                        <Link to={`/lendings/new?asset_id=${asset.id}`} className="btn btn-primary">
                            <FiClock size={16} /> Ausleihen
                        </Link>
                    )}
                    {hasPermission('assets.delete') && (
                        <button onClick={handleDelete} className="btn btn-danger">
                            <FiTrash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-4 grid-mobile-1 mb-xl">
                <div className="card p-md border-none" style={{ background: 'var(--color-bg-medium)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-muted text-xs uppercase font-bold mb-xs">Standort</div>
                    <div className="font-bold flex items-center gap-2">
                        <FiBox size={14} /> {asset.container_name || 'Nicht zugewiesen'}
                    </div>
                </div>
                <div className="card p-md border-none" style={{ background: 'var(--color-bg-medium)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-muted text-xs uppercase font-bold mb-xs">Aktueller Nutzer</div>
                    <div className="font-bold">
                        {asset.borrower_name || 'Verfügbar'}
                    </div>
                </div>
                <div className="card p-md border-none" style={{ background: 'var(--color-bg-medium)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-muted text-xs uppercase font-bold mb-xs">Gerätetyp</div>
                    <div className="font-bold">{asset.type}</div>
                </div>
                <div className="card p-md border-none" style={{ background: 'var(--color-bg-medium)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="text-muted text-xs uppercase font-bold mb-xs">Garantie bis</div>
                    <div className="font-bold">{asset.warranty_until ? new Date(asset.warranty_until).toLocaleDateString('de-DE') : 'Keine Angabe'}</div>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 'var(--space-xl)' }}>
                {/* Left Side: Content Tabs */}
                <div className="flex flex-col gap-lg">
                    {/* Tabs Navigation */}
                    <div className="flex gap-md border-bottom" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-md flex items-center gap-2 font-bold transition-base ${activeTab === tab.id ? 'text-primary' : 'text-muted'}`}
                                style={{ 
                                    borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : 'none',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'details' && (
                            <div className="card">
                                <h3 className="mb-lg">Technische Daten</h3>
                                <div className="grid grid-2 gap-xl">
                                    <div className="flex flex-col gap-md">
                                        <DetailItem label="Name" value={asset.name} />
                                        <DetailItem label="Hersteller" value={asset.manufacturer} />
                                        <DetailItem label="Modell" value={asset.model} />
                                        <DetailItem label="Seriennummer" value={asset.serial_number} />
                                    </div>
                                    <div className="flex flex-col gap-md">
                                        <DetailItem label="Inventarnummer" value={asset.inventory_number} />
                                        <DetailItem label="MAC-Adresse" value={asset.mac_address} />
                                        <DetailItem label="Kaufdatum" value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('de-DE') : null} />
                                        <DetailItem label="Notizen" value={asset.notes} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="card">
                                <h3 className="mb-lg">Aktivitätsverlauf</h3>
                                {history.length === 0 ? (
                                    <p className="text-muted text-center py-xl">Keine Historie vorhanden</p>
                                ) : (
                                    <div className="flex flex-col gap-lg">
                                        {history.map((item, idx) => (
                                            <div key={item.id} className="flex gap-md relative">
                                                {idx < history.length - 1 && (
                                                    <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '-24px', width: '1px', background: 'var(--color-border)' }} />
                                                )}
                                                <div className="w-4 h-4 radius-full bg-light border flex items-center justify-center z-1" style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--color-bg-light)', border: '1px solid var(--color-border)', zIndex: 1 }}>
                                                    <div className="w-1.5 h-1.5 radius-full bg-primary" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div className="font-bold text-small">{item.details}</div>
                                                        <div className="text-xs text-muted">{new Date(item.created_at).toLocaleString('de-DE')}</div>
                                                    </div>
                                                    <div className="text-xs text-muted">Aktion: {item.action} • Von: {item.username || 'System'}</div>
                                                    {item.old_value && (
                                                        <div className="text-xs mt-1">
                                                            <span className="text-muted">{item.old_value}</span> → <span className="font-bold">{item.new_value}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'accessories' && (
                            <div className="card">
                                <h3 className="mb-lg">Zugeordnetes Zubehör</h3>
                                {!asset.accessories || asset.accessories.length === 0 ? (
                                    <p className="text-muted text-center py-xl">Kein Zubehör zugeordnet</p>
                                ) : (
                                    <div className="grid grid-2 gap-md">
                                        {asset.accessories.map(acc => (
                                            <div key={acc.id} className="p-md bg-light border radius-md">
                                                <div className="font-bold">{acc.quantity}x {acc.name}</div>
                                                <div className="text-small text-muted">{acc.category} {acc.inventory_number ? `· Inv: ${acc.inventory_number}` : ''}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: QR Code & Quick Actions */}
                <div className="flex flex-col gap-lg">
                    <div className="card text-center p-lg">
                        <div className="text-muted text-xs uppercase font-bold mb-md">QR-Code Label</div>
                        {qrCode ? (
                            <div className="flex flex-col items-center gap-md">
                                <div style={{ background: 'white', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                                    <img src={qrCode} alt="QR Code" style={{ width: '150px', display: 'block' }} />
                                    <div className="mt-2 font-bold text-xs" style={{ color: '#000' }}>{asset.inventory_number}</div>
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm w-full"
                                    onClick={() => {
                                        const url = `/api/admin/export/qr-pdf/${asset.id}?token=${localStorage.getItem('token')}&type=asset`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    <FiPackage /> PDF Export
                                </button>
                            </div>
                        ) : (
                            <div className="text-muted text-small">QR-Code wird geladen...</div>
                        )}
                    </div>

                    <div className="card p-lg bg-light border-none">
                        <h4 className="mb-md">Schnellzugriff</h4>
                        <div className="flex flex-col gap-sm">
                            <button className="btn btn-secondary btn-sm w-full justify-start text-left" onClick={() => navigate(`/report/${asset.qr_code}`)}>
                                <FiAlertCircle size={14} className="mr-2" /> Problem melden
                            </button>
                            {asset.is_network_integrated && (
                                <button className="btn btn-secondary btn-sm w-full justify-start text-left" onClick={() => navigate(`/network`)}>
                                    <FiActivity size={14} className="mr-2" /> Netzwerk-Status
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper component for detail items
const DetailItem = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-xs text-muted uppercase font-bold" style={{ letterSpacing: '0.05em' }}>{label}</span>
        <span className="font-medium">{value || '—'}</span>
    </div>
);

export default AssetDetail;
