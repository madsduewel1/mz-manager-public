import { useState, useEffect } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { errorsAPI } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

function ErrorReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const { error } = useNotification();

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const response = await errorsAPI.getAll();
            setReports(response.data);
        } catch (err) {
            console.error('Error loading reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await errorsAPI.update(id, { status });
            loadReports();
        } catch (err) {
            error('Fehler beim Aktualisieren');
        }
    };

    if (loading) {
        return <div className="container"><div className="loading">Lade Fehlermeldungen...</div></div>;
    }

    return (
        <div className="container">
            <h1>Fehlermeldungen</h1>

            {reports.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><FiAlertCircle /></div>
                    <p>Keine Fehlermeldungen</p>
                </div>
            ) : (
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Gerät</th>
                                <th>Beschreibung</th>
                                <th>Gemeldet von</th>
                                <th>Status</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.id}>
                                    <td>{report.asset_inventory || report.container_name || 'Unbekannt'}</td>
                                    <td className="text-small">{report.description.substring(0, 50)}...</td>
                                    <td className="text-small">{report.reporter_name || 'Anonym'}</td>
                                    <td>
                                        <select
                                            value={report.status}
                                            onChange={(e) => updateStatus(report.id, e.target.value)}
                                            className="form-select"
                                            style={{ width: 'auto', padding: 'var(--space-xs) var(--space-sm)', fontSize: 'var(--font-size-sm)' }}
                                        >
                                            <option value="offen">Offen</option>
                                            <option value="in_bearbeitung">In Bearbeitung</option>
                                            <option value="erledigt">Erledigt</option>
                                            <option value="abgelehnt">Abgelehnt</option>
                                        </select>
                                    </td>
                                    <td>
                                        {report.photo_path && (
                                            <a href={`/uploads/${report.photo_path}`} target="_blank" className="btn btn-sm btn-secondary">
                                                Foto
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ErrorReports;
