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
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const response = await dashboardAPI.getStats();
            setStats(response.data);
            setError('');
        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError('Fehler beim Laden der Dashboard-Daten.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <div className="loading">Daten werden geladen...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="card border-none bg-light p-xl text-center">
                    <FiAlertCircle size={48} className="text-muted mb-md" />
                    <h2>Hoppla!</h2>
                    <p className="text-muted">{error}</p>
                    <button className="btn btn-primary mt-lg" onClick={loadDashboard}>Erneut versuchen</button>
                </div>
            </div>
        );
    }

    return (
        <div className="container fade-in">
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h1 className="mb-0">Willkommen zurück, {user?.username}</h1>
                    <p className="text-muted">Hier ist die Übersicht für heute.</p>
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary" onClick={loadDashboard}>
                        <FiActivity size={16} /> Aktualisieren
                    </button>
                </div>
            </div>

            <WidgetGrid>
                {/* Row 1: Key Stats & Device Health */}
                <DashboardWidget 
                    title="Systemübersicht" 
                    span={6} 
                    icon={FiGrid}
                >
                    <SystemOverviewWidget stats={stats} />
                </DashboardWidget>

                <DashboardWidget 
                    title="Geräte-Status" 
                    span={6} 
                    icon={FiPieChart}
                >
                    <DeviceStatusWidget stats={stats} />
                </DashboardWidget>

                {/* Row 2: Active Issues & Returns */}
                <DashboardWidget 
                    title="Aktuelle Fehlermeldungen" 
                    span={6} 
                    icon={FiAlertCircle}
                    permission="errors.view"
                >
                    <RecentErrorsWidget errors={stats?.recent_errors} />
                </DashboardWidget>

                <DashboardWidget 
                    title="Anstehende Rückgaben" 
                    span={6} 
                    icon={FiClock}
                    permission="lendings.view"
                >
                    <UpcomingReturnsWidget returns={stats?.upcoming_returns} />
                </DashboardWidget>

                {/* Row 3: Activity Feed */}
                <DashboardWidget 
                    title="Letzte Aktivitäten" 
                    span={12} 
                    icon={FiActivity}
                    permission="admin.view"
                >
                    <ActivityWidget />
                </DashboardWidget>
            </WidgetGrid>

            {/* Footer / System Info */}
            <div className="mt-2xl py-lg border-top flex justify-between items-center text-xs text-muted">
                <div>MZ-Manager v2.0 • {settings?.schoolName || 'Schul-Inventarverwaltung'}</div>
                <div className="flex gap-md">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 radius-full bg-success" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }}></span>
                        System Online
                    </span>
                    {hasAnyPermissions(['admin.settings']) && (
                        <Link to="/admin/settings" className="hover:text-primary no-underline flex items-center gap-1">
                            <FiSettings size={12} /> Einstellungen
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
