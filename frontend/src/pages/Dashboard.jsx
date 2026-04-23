import { useState, useEffect } from 'react';
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

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const user = getUser();
    const { settings } = useSettings();

    useEffect(() => {
        loadDashboard();
        const intervalId = setInterval(loadDashboard, 60000); // Auto-refresh every minute
        return () => clearInterval(intervalId);
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

    if (loading) return <div className="container"><div className="loading">Wird geladen...</div></div>;

    if (error) {
        return (
            <div className="container">
                <div className="card text-center p-xl">
                    <FiAlertCircle size={48} color="var(--color-error)" className="mb-md" />
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
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
                    </div>
                </div>
            )}

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
        </div>
    );
}

export default Dashboard;
