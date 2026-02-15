import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { containersAPI } from '../services/api';

function ContainerDetail() {
    const { id } = useParams();
    const [container, setContainer] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContainer();
        loadQRCode();
    }, [id]);

    const loadContainer = async () => {
        try {
            const response = await containersAPI.getOne(id);
            setContainer(response.data);
        } catch (err) {
            console.error('Error loading container:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadQRCode = async () => {
        try {
            const response = await containersAPI.getQR(id);
            setQrCode(response.data.qr_code);
        } catch (err) {
            console.error('Error loading QR code:', err);
        }
    };

    if (loading) {
        return <div className="container"><div className="loading">Lade Container...</div></div>;
    }

    if (!container) {
        return <div className="container"><p>Container nicht gefunden</p></div>;
    }

    return (
        <div className="container">
            <Link to="/containers" className="btn btn-secondary mb-lg">
                <FiArrowLeft />
                Zurück
            </Link>

            <div className="card">
                <div className="card-header">
                    <h1 className="card-title">{container.name}</h1>
                    <span className="badge badge-info">{container.type}</span>
                </div>

                <div className="card-body">
                    <div className="grid grid-2">
                        <div>
                            {container.description && <p>{container.description}</p>}
                            {container.location && <p><strong>Standort:</strong> {container.location}</p>}

                            <h3 className="mt-lg">Enthaltene Geräte ({container.assets?.length || 0})</h3>
                            {container.assets && container.assets.length > 0 ? (
                                <div className="grid-compact mt-md">
                                    {container.assets.map((asset) => (
                                        <Link to={`/assets/${asset.id}`} key={asset.id} className="card p-md" style={{ textDecoration: 'none' }}>
                                            <p className="mb-0"><strong>{asset.inventory_number}</strong></p>
                                            <p className="text-small text-muted mb-0">{asset.type}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted">Keine Geräte in diesem Container</p>
                            )}
                        </div>

                        {qrCode && (
                            <div style={{ textAlign: 'center' }}>
                                <h3>QR-Code</h3>
                                <img src={qrCode} alt="QR Code" style={{ maxWidth: '300px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', background: 'white' }} />
                                <p className="text-small text-muted mt-md">Zum Drucken & Aufkleben</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContainerDetail;
