import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FiMenu, FiX, FiBox } from 'react-icons/fi';
import { isAuthenticated } from './utils/auth';
import { NotificationProvider } from './contexts/NotificationContext';
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

// Components
import Sidebar from './components/Sidebar';
import UserProfileModal from './components/UserProfileModal';
import WelcomeModal from './components/WelcomeModal';
import { getUser, setUser as setStoredUser } from './utils/auth';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(getUser());

    const handleOnboardingComplete = () => {
        const updatedUser = { ...currentUser, requires_password_change: false };
        setStoredUser(updatedUser);
        setCurrentUser(updatedUser);
    };

    return (
        <NotificationProvider>
            <ConfirmationProvider>
                <Router>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
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
                                            {/* Mobile Header */}
                                            <header className="mobile-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--color-primary-light)' }}>
                                                    <FiBox size={24} />
                                                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>MZ-Manager</span>
                                                </div>
                                                <button
                                                    className="mobile-nav-toggle"
                                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                                >
                                                    {sidebarOpen ? <FiX /> : <FiMenu />}
                                                </button>
                                            </header>

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
                                                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                                                </Routes>
                                            </div>
                                        </div>
                                        <UserProfileModal
                                            isOpen={showProfileModal}
                                            onClose={() => setShowProfileModal(false)}
                                            user={currentUser}
                                        />

                                        {currentUser?.requires_password_change && (
                                            <WelcomeModal
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
        </NotificationProvider>
    );
}

export default App;
