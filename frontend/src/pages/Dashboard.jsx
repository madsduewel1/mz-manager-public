import { useState, useEffect } from 'react';
<<<<<<< HEAD
import { FiAlertCircle, FiActivity, FiPieChart, FiGrid, FiClock, FiSettings } from 'react-icons/fi';
import { dashboardAPI } from '../services/api';
import { getUser, hasAnyPermissions } from '../utils/auth';
import { useSettings } from '../contexts/SettingsContext';

// Components
import WidgetGrid from '../components/WidgetGrid';
import DashboardWidget from '../components/DashboardWidget';
import SystemOverviewWidget from '../components/dashboard/SystemOverviewWidget';
import RecentErrorsWidget from '../components/dashboard/RecentErrorsWidget';
import DeviceStatusWidget from '../components/dashboard/DeviceStatusWidget';
import ActivityWidget from '../components/dashboard/ActivityWidget';
import UpcomingReturnsWidget from '../components/dashboard/UpcomingReturnsWidget';

=======
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiClock, FiPackage, FiBox, FiRepeat, FiMapPin, FiCheck } from 'react-icons/fi';
import { dashboardAPI } from '../services/api';
import { getUser, hasPermission, hasRole, hasAnyPermissions, hasAdminPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useSettings } from '../contexts/SettingsContext';

>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = getUser();
<<<<<<< HEAD
=======
    const { info } = useNotification();
>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
    const { settings } = useSettings();

    useEffect(() => {
        loadDashboard();
<<<<<<< HEAD
        const intervalId = setInterval(loadDashboard, 60000); // Auto-refresh every minute
        return () => clearInterval(intervalId);
=======

        // Auto-refresh every 30 seconds for live sync
        const intervalId = setInterval(loadDashboard, 30000);

        return () => clearInterval(intervalId); // Cleanup on unmount
>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
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

<<<<<<< HEAD
    if (loading) return <div className="container"><div className="loading">Wird geladen...</div></div>;
=======
    if (loading) {
        return (
            <div className="container">
                <div className="loading">Lade Dashboard...</div>
            </div>
        );
    }
>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e

    if (error) {
        return (
            <div className="container">
<<<<<<< HEAD
                <div className="card text-center p-xl">
                    <FiAlertCircle size={48} color="var(--color-error)" className="mb-md" />
                    <p>{error}</p>
=======
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <FiAlertCircle size={48} color="var(--color-error)" />
                    <p style={{ marginTop: 'var(--space-md)' }}>{error}</p>
>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
                </div>
            </div>
        );
    }

    return (
        <div className="container">
<<<<<<< HEAD
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <h1 className="mb-0">Dashboard</h1>
                    <p className="text-muted text-small">Willkommen zurück, {user?.username}</p>
                </div>
            </div>

            {/* Warning for users with no permissions */}
            {!hasAnyPermissions() && (
                <div className="card border-warning mb-xl p-lg flex items-center gap-lg" style={{ background: 'var(--color-warning-light)', borderColor: 'var(--color-warning)' }}>
                    <FiAlertCircle size={32} color="var(--color-warning)" />
                    <div>
                        <h3 className="mb-0">Keine Berechtigungen</h3>
                        <p className="mb-0 text-muted">Dein Account hat aktuell keine aktiven Berechtigungen. Bitte kontaktiere einen Administrator.</p>
=======
            <h1>Dashboard</h1>

            {/* Warning for users with no permissions */}
            {!hasAnyPermissions() && (
                <div style={{
                    background: 'var(--color-bg-light)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-xl)',
                    marginBottom: 'var(--space-xl)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-lg)'
                }}>
                    <FiAlertCircle size={32} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
                    <div>
                        <h3 style={{ margin: '0 0 4px', color: 'var(--color-text-primary)' }}>Kein Zugriff konfiguriert</h3>
                        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                            {settings.org_name || 'MZ-Manager'} muss von einem Administrator konfiguriert werden damit du ihn nutzen kannst.
                        </p>
>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
                    </div>
                </div>
            )}

<<<<<<< HEAD
            <WidgetGrid>
                {/* 1. Systemübersicht (Small widgets equivalent) */}
                <DashboardWidget 
                    title="Systemübersicht" 
                    icon={FiGrid} 
                    size="medium"
                >
                    <SystemOverviewWidget stats={stats.statistics} />
                </DashboardWidget>

                {/* 2. Geräte-Status (Chart) */}
                <DashboardWidget 
                    title="Geräte-Status" 
                    icon={FiPieChart} 
                    size="small"
                >
                    <DeviceStatusWidget stats={stats.statistics} />
                </DashboardWidget>

                {/* 3. Probleme (Tickets) */}
                <DashboardWidget 
                    title="Aktuelle Fehlermeldungen" 
                    icon={FiAlertCircle} 
                    size="medium"
                    permission="errors.manage"
                >
                    <RecentErrorsWidget errors={stats.recent_errors} />
                </DashboardWidget>

                {/* 4. Ausleihen heute */}
                <DashboardWidget 
                    title="Anstehende Rückgaben" 
                    icon={FiClock} 
                    size="small"
                    permission="lendings.manage"
                >
                    <UpcomingReturnsWidget lendings={stats.upcoming_returns} />
                </DashboardWidget>

                {/* 5. Aktivitäten */}
                <DashboardWidget 
                    title="Aktivitäten" 
                    icon={FiActivity} 
                    size="medium"
                    permission="logs.view"
                >
                    <ActivityWidget />
                </DashboardWidget>
                
                {/* Information for Users without management permissions */}
                {(!user.permissions || !user.permissions.includes('assets.manage')) && (
                    <DashboardWidget title="Hilfe & Support" icon={FiSettings} size="small">
                        <p className="text-small text-muted">
                            Du hast Zugriff auf die Basisfunktionen des {settings.org_name || 'MZ-Managers'}. 
                            Bei Fragen wende dich bitte an das Team des Medienzentrums.
                        </p>
                    </DashboardWidget>
                )}
            </WidgetGrid>
=======
            {/* Statistics Grid - Only for Admins */}
            {hasRole('Administrator') && (
                <div className="grid grid-4 grid-mobile-1 mb-xl">
                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                        <div className="stat-label">Defekte Geräte</div>
                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>
                            {stats.statistics.defective_assets}
                        </div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                        <div className="stat-label">Überfällige Ausleihen</div>
                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>
                            {stats.statistics.overdue_lendings}
                        </div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                        <div className="stat-label">Container</div>
                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>
                            {stats.statistics.total_containers}
                        </div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                        <div className="stat-label">Gesamt Geräte</div>
                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>
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
                                            <span className="badge badge-info">Offen</span>
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

>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
        </div>
    );
}

<<<<<<< HEAD
=======
const styles = {};

>>>>>>> 088952ba2272932c7dd01f7235986c1dc098db1e
export default Dashboard;
