import { useState, useEffect } from 'react';
import { FiBox } from 'react-icons/fi';
import { adminAPI, containersAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const QRCodesAdmin = () => {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(false);
    const { error } = useNotification();

    useEffect(() => {
        loadContainers();
    }, []);

    const loadContainers = async () => {
        setLoading(true);
        try {
            const response = await containersAPI.getContainers();
            setContainers(response.data);
        } catch (err) {
            error('Fehler beim Laden der Container');
        } finally {
            setLoading(false);
        }
    };

    const exportQR = (containerId) => {
        const url = `/api/admin/export/qr-pdf/${containerId}?token=${localStorage.getItem('token')}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">QR-Codes Exportieren</h2>
                <p className="text-muted text-small">Laden Sie QR-Codepakete für Ihre Container und Räume als PDF herunter.</p>
            </div>
            <div className="table-responsive">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Typ</th>
                            <th>Standort</th>
                            <th>QR-ID</th>
                            <th>Geräte</th>
                            <th style={{ textAlign: 'right' }}>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {containers.map(container => (
                            <tr key={container.id}>
                                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{container.name}</td>
                                <td><span className="badge badge-secondary">{container.type}</span></td>
                                <td className="text-muted">{container.location || '-'}</td>
                                <td><code style={{ fontSize: '10px' }}>{container.qr_code}</code></td>
                                <td>{container.asset_count || 0}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn btn-sm btn-primary" onClick={() => exportQR(container.id)}>
                                        <FiBox /> PDF Export
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {containers.length === 0 && !loading && (
                            <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Container gefunden</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QRCodesAdmin;
