import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiClock, FiPackage, FiBox, FiRepeat, FiMapPin, FiCheck } from 'react-icons/fi';
import { dashboardAPI } from '../services/api';
import { getUser, hasPermission, hasRole, hasAnyPermissions, hasAdminPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = getUser();
    const { info } = useNotification();

    useEffect(() => {
        loadDashboard();

        // Auto-refresh every 30 seconds for live sync
        const intervalId = setInterval(loadDashboard, 30000);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    const loadDashboard = async () => {
        try {
            const response = await dashboardAPI.getStats();
            setStats(response.data);
        } catch (err) {
            setError('Fehler beim Laden des Dashboards');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading">Lade Dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <FiAlertCircle size={48} color="var(--color-error)" />
                    <p style={{ marginTop: 'var(--space-md)' }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <h1>Dashboard</h1>

            {/* Warning for users with no permissions */}
            {!hasAnyPermissions() && (
                <div style={{
                    background: 'hsla(38, 92%, 50%, 0.1)',
                    border: '1px solid hsla(38, 92%, 50%, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-xl)',
                    marginBottom: 'var(--space-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-lg)'
                }}>
                    <FiAlertCircle size={32} color="hsl(38, 92%, 50%)" style={{ flexShrink: 0 }} />
                    <div>
                        <h3 style={{ margin: '0 0 4px', color: 'hsl(38, 92%, 50%)' }}>Kein Zugriff konfiguriert</h3>
                        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                            Der MZ-Manager muss von einem Administrator konfiguriert werden damit du ihn nutzen kannst.
                        </p>
                    </div>
                </div>
            )}

            {/* Statistics Grid - Only for Admins */}
            {hasRole('Administrator') && (
                <div className="grid grid-4 grid-mobile-1 mb-xl">
                    <div className="stat-card" style={{ borderTop: '4px solid var(--color-error)' }}>
                        <div className="stat-label">Defekte Geräte</div>
                        <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                            {stats.statistics.defective_assets}
                        </div>
                    </div>

                    <div className="stat-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
                        <div className="stat-label">Überfällige Ausleihen</div>
                        <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                            {stats.statistics.overdue_lendings}
                        </div>
                    </div>

                    <div className="stat-card" style={{ borderTop: '4px solid var(--color-success)' }}>
                        <div className="stat-label">Container</div>
                        <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                            {stats.statistics.total_containers}
                        </div>
                    </div>

                    <div className="stat-card" style={{ borderTop: '4px solid var(--color-info)' }}>
                        <div className="stat-label">Gesamt Geräte</div>
                        <div className="stat-value" style={{ color: 'var(--color-info)' }}>
                            {stats.statistics.total_assets}
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Content Grid */}
            <div className="grid grid-2 grid-mobile-1">
                {/* Recent Errors - Show if Admin OR if has permission */}
                {(hasRole('Administrator') || hasPermission('errors.manage')) && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <FiAlertCircle size={20} />
                                Aktuelle Fehlermeldungen
                            </h3>
                            <Link to="/error-reports" className="btn btn-sm btn-secondary">
                                Alle anzeigen
                            </Link>
                        </div>
                        <div className="card-body">
                            {stats.recent_errors.length === 0 ? (
                                <p className="text-muted text-center py-xl">Keine offenen Fehlermeldungen</p>
                            ) : (
                                <div className="flex flex-col gap-sm">
                                    {stats.recent_errors.map((error) => (
                                        <div key={error.id} className="flex items-center justify-between p-md bg-light border radius-md">
                                            <div>
                                                <strong>{error.inventory_number || 'Container'}</strong>
                                                <p className="text-small text-muted">{error.description.substring(0, 60)}...</p>
                                            </div>
                                            <span className="badge badge-defekt">Offen</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Upcoming Returns - Show if Admin OR if has permission */}
                {(hasRole('Administrator') || hasPermission('lendings.manage')) && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <FiClock size={20} />
                                Anstehende Rückgaben
                            </h3>
                            <Link to="/lendings" className="btn btn-sm btn-secondary">
                                Alle anzeigen
                            </Link>
                        </div>
                        <div className="card-body">
                            {stats.upcoming_returns.length === 0 ? (
                                <p className="text-muted text-center py-xl">Keine anstehenden Rückgaben</p>
                            ) : (
                                <div className="flex flex-col gap-sm">
                                    {stats.upcoming_returns.map((lending) => (
                                        <div key={lending.id} className="p-md bg-light border radius-md">
                                            <div>
                                                <strong>{lending.inventory_number || lending.container_name}</strong>
                                                <p className="text-small text-muted">
                                                    {lending.borrower_name} • {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Assets by Location - Admin Only or Manager */}
            {(hasRole('Administrator') || hasPermission('assets.manage') || hasPermission('containers.manage')) && (
                <div className="card mt-lg">
                    <div className="card-header">
                        <h3 className="card-title">
                            <FiPackage size={20} />
                            Geräte nach Standort
                        </h3>
                    </div>
                    <div className="card-body">
                        {stats.assets_by_location.length === 0 ? (
                            <p className="text-muted text-center">Keine Daten verfügbar</p>
                        ) : (
                            <div className="grid grid-3 grid-mobile-1">
                                {stats.assets_by_location.map((location, index) => (
                                    <div key={index} className="stat-card">
                                        <div className="stat-value">{location.count}</div>
                                        <div className="stat-label">{location.location || 'Ohne Standort'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

const styles = {};

export default Dashboard;
