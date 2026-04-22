import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FiMenu, FiX, FiBox } from 'react-icons/fi';
import { isAuthenticated } from './utils/auth';
import { NotificationProvider } from './contexts/NotificationContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { useEffect as useBrandingEffect } from 'react';

// Lazy Loaded Pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assets = lazy(() => import('./pages/Assets'));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const Containers = lazy(() => import('./pages/Containers'));
const ContainerDetail = lazy(() => import('./pages/ContainerDetail'));
const Lendings = lazy(() => import('./pages/Lendings'));
const ErrorReports = lazy(() => import('./pages/ErrorReports'));
const PublicErrorReport = lazy(() => import('./pages/PublicErrorReport'));
const Admin = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const UsersAdmin = lazy(() => import('./pages/admin/UsersAdmin'));
const RolesAdmin = lazy(() => import('./pages/admin/RolesAdmin'));
const ModelsAdmin = lazy(() => import('./pages/admin/ModelsAdmin'));
const RoomsAdmin = lazy(() => import('./pages/admin/RoomsAdmin'));
const LogsAdmin = lazy(() => import('./pages/admin/LogsAdmin'));
const QRCodesAdmin = lazy(() => import('./pages/admin/QRCodesAdmin'));
const PermissionsAdmin = lazy(() => import('./pages/admin/PermissionsAdmin'));
const SettingsAdmin = lazy(() => import('./pages/admin/SettingsAdmin'));
const HelpAdmin = lazy(() => import('./pages/admin/HelpAdmin'));
const Network = lazy(() => import('./pages/Network'));
const Accessories = lazy(() => import('./pages/Accessories'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AssetFormPage = lazy(() => import('./pages/AssetFormPage'));
const ContainerFormPage = lazy(() => import('./pages/ContainerFormPage'));
const NetworkFormPage = lazy(() => import('./pages/NetworkFormPage'));
const AccessoryFormPage = lazy(() => import('./pages/AccessoryFormPage'));
const LendingFormPage = lazy(() => import('./pages/LendingFormPage'));
const Forbidden = lazy(() => import('./pages/Forbidden'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));

import Sidebar from './components/Sidebar';
import Breadcrumbs from './components/Breadcrumbs';
import UserProfileModal from './components/UserProfileModal';
import Onboarding from './components/Onboarding';
import { getUser, setUser as setStoredUser } from './utils/auth';
import { authAPI } from './services/api';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const isAuth = isAuthenticated();
    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(getUser());
    const [isLoading, setIsLoading] = useState(false);

    // Session Timeout Logic (30 minutes)
    useEffect(() => {
        if (!currentUser) return;

        let logoutTimer;
        const TIMEOUT_MS = 30 * 60 * 1000;

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

        // Always enforce dark mode
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
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
                        <BrandingManager />
                        {isLoading && <div className="top-loader"></div>}
                        <Suspense fallback={<div className="loading">Wird geladen...</div>}>
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
                                                <Sidebar
                                                    isOpen={sidebarOpen}
                                                    onClose={() => setSidebarOpen(false)}
                                                    onProfileClick={() => setShowProfileModal(true)}
                                                />

                                                <div className="main-content">
                                                    {/* Universal Header */}
                                                    <header className="mobile-header">
                                                        <MobileHeaderBrand />
                                                        <button
                                                            className="mobile-nav-toggle"
                                                            onClick={() => setSidebarOpen(!sidebarOpen)}
                                                        >
                                                            <FiMenu />
                                                        </button>
                                                    </header>

                                                    {/* Global Breadcrumbs – überall von .page */}
                                                    <Breadcrumbs />

                                                    <div className="page">
                                                        <Routes>
                                                            <Route path="/" element={<Dashboard />} />
                                                            <Route path="/403" element={<Forbidden />} />
                                                            <Route path="/dashboard" element={<Dashboard />} />
                                                            <Route path="/assets" element={<Assets />} />
                                                            <Route path="/assets/new" element={<AssetFormPage />} />
                                                            <Route path="/assets/:id/edit" element={<AssetFormPage />} />
                                                            <Route path="/assets/:id" element={<AssetDetail />} />
                                                            <Route path="/containers" element={<Containers />} />
                                                            <Route path="/containers/new" element={<ContainerFormPage />} />
                                                            <Route path="/containers/:id/edit" element={<ContainerFormPage />} />
                                                            <Route path="/containers/:id" element={<ContainerDetail />} />
                                                            <Route path="/lendings" element={<Lendings />} />
                                                            <Route path="/lendings/new" element={<LendingFormPage />} />
                                                            <Route path="/error-reports" element={<ErrorReports />} />
                                                            <Route path="/network" element={<Network />} />
                                                            <Route path="/network/vlans/new" element={<NetworkFormPage type="vlan" />} />
                                                            <Route path="/network/vlans/:id/edit" element={<NetworkFormPage type="vlan" />} />
                                                            <Route path="/network/devices/:id/assign" element={<NetworkFormPage type="device" />} />
                                                            <Route path="/accessories" element={<Accessories />} />
                                                            <Route path="/accessories/new" element={<AccessoryFormPage />} />
                                                            <Route path="/accessories/:id/edit" element={<AccessoryFormPage />} />
                                                            <Route path="/help" element={<HelpCenter />} />
                                                            <Route path="/admin" element={<Admin />}>
                                                                <Route index element={<AdminOverview />} />
                                                                <Route path="users" element={<UsersAdmin />} />
                                                                <Route path="roles" element={<RolesAdmin />} />
                                                                <Route path="permissions" element={<PermissionsAdmin />} />
                                                                <Route path="models" element={<ModelsAdmin />} />
                                                                <Route path="rooms" element={<RoomsAdmin />} />
                                                                <Route path="qr-codes" element={<QRCodesAdmin />} />
                                                                <Route path="logs" element={<LogsAdmin />} />
                                                                <Route path="settings" element={<SettingsAdmin />} />
                                                                <Route path="help" element={<HelpAdmin />} />
                                                            </Route>
                                                            <Route path="*" element={<NotFound />} />
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
                        </Suspense>
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
                    src={`/uploads/${settings.logo_path}?t=${Date.now()}`}
                    alt="Logo"
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                />
            ) : (
                <FiBox size={32} />
            )}
            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                {settings.org_name || 'MZ-Manager'}
            </span>
        </div>
    );
};

// Manager component for Tab Title and Favicon
const BrandingManager = () => {
    const { settings } = useSettings();

    useBrandingEffect(() => {
        // Dynamic Title
        const orgName = settings.org_name || 'MZ-Manager';
        if (document.title !== orgName) {
            document.title = orgName;
        }

        // Dynamic Favicon
        const updateFavicon = (href) => {
            let link = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = href;
        };

        if (settings.logo_path) {
            updateFavicon(`/uploads/${settings.logo_path}?t=${Date.now()}`);
        } else {
            updateFavicon('/vite.svg');
        }
    }, [settings.org_name, settings.logo_path]);

    return null;
};

export default App;
