import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const LogsAdmin = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const { error } = useNotification();

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getLogs();
            setLogs(response.data);
        } catch (err) {
            error('Fehler beim Laden der Logs');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">System-Logs</h2>
                <button onClick={loadLogs} className="btn btn-secondary" disabled={loading}>
                    {loading ? 'Lädt...' : 'Aktualisieren'}
                </button>
            </div>
            <div className="table-responsive">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Zeitstempel</th>
                            <th>Aktion</th>
                            <th>Benutzer</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className="text-muted text-small">
                                    {new Date(log.created_at).toLocaleString('de-DE')}
                                </td>
                                <td><span className="badge badge-secondary">{log.action}</span></td>
                                <td><strong>{log.user}</strong></td>
                                <td>{log.details}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan="4" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Logs vorhanden</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LogsAdmin;
