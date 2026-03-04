import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FiMenu, FiX, FiBox } from 'react-icons/fi';
import { isAuthenticated } from './utils/auth';
import { NotificationProvider } from './contexts/NotificationContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import Containers from './pages/Containers';
import ContainerDetail from './pages/ContainerDetail';
import Lendings from './pages/Lendings';
import ErrorReports from './pages/ErrorReports';
import PublicErrorReport from './pages/PublicErrorReport';
import Admin from './pages/Admin';

import Sidebar from './components/Sidebar';
import Breadcrumbs from './components/Breadcrumbs';
import UserProfileModal from './components/UserProfileModal';
import Onboarding from './components/Onboarding';
import { getUser, setUser as setStoredUser } from './utils/auth';
import { authAPI } from './services/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(getUser());
    const [isLoading, setIsLoading] = useState(false);

    // Session Timeout Logic (10 minutes)
    useEffect(() => {
        if (!currentUser) return;

        let logoutTimer;
        const TIMEOUT_MS = 10 * 60 * 1000;

        const resetTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            logoutTimer = setTimeout(handleLogout, TIMEOUT_MS);
            localStorage.setItem('lastActivity', Date.now());
        };

        const handleLogout = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('lastActivity');
            window.location.href = '/login';
        };

        // Check if last activity in previous session was too long ago
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity && Date.now() - parseInt(lastActivity) > TIMEOUT_MS) {
            handleLogout();
            return;
        }

        // Mouse/Keyboard activity listeners
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => document.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [currentUser]);

    useEffect(() => {
        // Initial load simulation for the premium loading bar
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 800);

        if (currentUser?.theme) {
            document.documentElement.setAttribute('data-theme', currentUser.theme);
        } else {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        return () => clearTimeout(timer);
    }, [currentUser]);

    const handlePasswordChanged = () => {
        setCurrentUser(prev => {
            const updated = { ...prev, requires_password_change: false };
            setStoredUser(updated);
            return updated;
        });
    };

    const handleOnboardingComplete = async () => {
        // Optimistic update: hide modal immediately
        setCurrentUser(prev => {
            const updated = { ...prev, has_seen_onboarding: true };
            setStoredUser(updated);
            return updated;
        });

        try {
            await authAPI.onboardingComplete();
        } catch (error) {
            console.error('Failed to mark onboarding as complete in backend', error);
            // We keep the local state as complete to not annoy the user in the current session
        }
    };

    const handleLogin = (user) => {
        setCurrentUser(user);
    };

    return (
        <NotificationProvider>
            <SettingsProvider>
                <ConfirmationProvider>
                    <Router>
                        {isLoading && <div className="top-loader"></div>}
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<Login onLogin={handleLogin} />} />
                            <Route path="/report" element={<PublicErrorReport />} />
                            <Route path="/report/:qrCode" element={<PublicErrorReport />} />

                            {/* Protected Routes */}
                            <Route
                                path="/*"
                                element={
                                    <ProtectedRoute>
                                        <div className="layout-wrapper">
                                            {!location.pathname.startsWith('/admin') && (
                                                <Sidebar
                                                    isOpen={sidebarOpen}
                                                    onClose={() => setSidebarOpen(false)}
                                                    onProfileClick={() => setShowProfileModal(true)}
                                                />
                                            )}

                                            <div className="main-content">
                                                {/* Mobile Header */}
                                                <header className="mobile-header">
                                                    <MobileHeaderBrand />
                                                    {!location.pathname.startsWith('/admin') && (
                                                        <button
                                                            className="mobile-nav-toggle"
                                                            onClick={() => setSidebarOpen(!sidebarOpen)}
                                                        >
                                                            {sidebarOpen ? <FiX /> : <FiMenu />}
                                                        </button>
                                                    )}
                                                </header>

                                                {/* Global Breadcrumbs – außerhalb von .page, nur wenn nicht admin */}
                                                {!location.pathname.startsWith('/admin') && <Breadcrumbs />}

                                                <div className="page">
                                                    <Routes>
                                                        <Route path="/" element={<Dashboard />} />
                                                        <Route path="/dashboard" element={<Dashboard />} />
                                                        <Route path="/assets" element={<Assets />} />
                                                        <Route path="/assets/:id" element={<AssetDetail />} />
                                                        <Route path="/containers" element={<Containers />} />
                                                        <Route path="/containers/:id" element={<ContainerDetail />} />
                                                        <Route path="/lendings" element={<Lendings />} />
                                                        <Route path="/error-reports" element={<ErrorReports />} />
                                                        <Route path="/admin" element={<Admin />} />
                                                        <Route path="/admin/users" element={<Admin defaultTab="users" />} />
                                                        <Route path="/admin/roles" element={<Admin defaultTab="roles" />} />
                                                        <Route path="/admin/permissions" element={<Admin defaultTab="permissions" />} />
                                                        <Route path="/admin/models" element={<Admin defaultTab="models" />} />
                                                        <Route path="/admin/rooms" element={<Admin defaultTab="rooms" />} />
                                                        <Route path="/admin/qr-codes" element={<Admin defaultTab="qr-codes" />} />
                                                        <Route path="/admin/logs" element={<Admin defaultTab="logs" />} />
                                                        <Route path="/admin/settings" element={<Admin defaultTab="settings" />} />
                                                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                                    </Routes>
                                                </div>
                                            </div>
                                            <UserProfileModal
                                                isOpen={showProfileModal}
                                                onClose={() => setShowProfileModal(false)}
                                                user={currentUser}
                                            />

                                            {currentUser &&
                                                !currentUser.has_seen_onboarding &&
                                                !currentUser.requires_password_change && (
                                                    <Onboarding
                                                        user={currentUser}
                                                        onComplete={handleOnboardingComplete}
                                                    />
                                                )}
                                        </div>
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </Router>
                </ConfirmationProvider>
            </SettingsProvider>
        </NotificationProvider>
    );
}

// Helper Component for Mobile Header to use useSettings hook
const MobileHeaderBrand = () => {
    const { settings } = useSettings();
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-primary-light)', overflow: 'hidden' }}>
            {settings.logo_path ? (
                <img
                    src={`/uploads/${settings.logo_path}`}
                    alt="Logo"
                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                />
            ) : (
                <FiBox size={24} />
            )}
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                {settings.org_name || 'MZ-Manager'}
            </span>
        </div>
    );
};

export default App;
