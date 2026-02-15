import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import { assetsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

function AssetDetail() {
    const { id } = useParams();
    const [asset, setAsset] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAsset();
        loadQRCode();
    }, [id]);

    const loadAsset = async () => {
        try {
            const response = await assetsAPI.getOne(id);
            setAsset(response.data);
        } catch (err) {
            console.error('Error loading asset:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadQRCode = async () => {
        try {
            const response = await assetsAPI.getQR(id);
            setQrCode(response.data.qr_code);
        } catch (err) {
            console.error('Error loading QR code:', err);
        }
    };

    if (loading) {
        return <div className="container"><div className="loading">Lade Gerät...</div></div>;
    }

    if (!asset) {
        return <div className="container"><p>Gerät nicht gefunden</p></div>;
    }

    return (
        <div className="container">
            <Link to="/assets" className="btn btn-secondary mb-lg">
                <FiArrowLeft />
                Zurück
            </Link>

            <div className="card">
                <div className="card-header">
                    <h1 className="card-title">{asset.inventory_number}</h1>
                    <StatusBadge status={asset.status} />
                </div>

                <div className="card-body">
                    <div className="grid grid-2">
                        <div>
                            <h3>Details</h3>
                            <p><strong>Typ:</strong> {asset.type}</p>
                            {asset.model && <p><strong>Modell:</strong> {asset.model}</p>}
                            {asset.manufacturer && <p><strong>Hersteller:</strong> {asset.manufacturer}</p>}
                            {asset.serial_number && <p><strong>Seriennummer:</strong> {asset.serial_number}</p>}
                            {asset.container_name && <p><strong>Standort:</strong> {asset.container_name}</p>}
                            {asset.notes && <p><strong>Notizen:</strong> {asset.notes}</p>}
                        </div>

                        {qrCode && (
                            <div style={{ textAlign: 'center' }}>
                                <h3>QR-Code</h3>
                                <img src={qrCode} alt="QR Code" style={{ maxWidth: '300px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }} />
                                <p className="text-small text-muted mt-md">Zum Drucken & Aufkleben</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AssetDetail;
