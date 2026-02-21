import { useState, useEffect } from 'react';
import {
    FiSettings, FiUsers, FiShield, FiPlus, FiTrash2, FiEdit2, FiKey,
    FiUserCheck, FiUserX, FiGrid, FiList, FiCpu, FiMapPin, FiBox,
    FiLock, FiActivity, FiMoreVertical, FiChevronDown, FiCheck
} from 'react-icons/fi';
import { authAPI, dashboardAPI, adminAPI } from '../services/api';
import Modal from '../components/Modal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { getUser, hasRole, hasPermission } from '../utils/auth';

function Admin() {
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [logs, setLogs] = useState([]);
    const [roles, setRoles] = useState([]);
    const [containers, setContainers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [stats, setStats] = useState(null);
    const [settings, setSettings] = useState({ org_name: 'Thomas-Mann-Schule' });
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editingRole, setEditingRole] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();
    const user = getUser();

    const getAvailableTabs = () => {
        const tabs = [];
        tabs.push('overview');
        if (hasPermission('users.manage', 'users.create')) tabs.push('users');
        if (hasPermission('roles.manage')) tabs.push('roles');
        if (hasRole('Administrator')) tabs.push('permissions');
        if (hasPermission('models.manage')) tabs.push('models');
        if (hasPermission('rooms.manage')) tabs.push('rooms');
        if (hasPermission('qr.print')) tabs.push('qr-codes');
        if (hasPermission('logs.view') || hasRole('Administrator')) tabs.push('logs');
        return tabs;
    };

    const availableTabs = getAvailableTabs();

    useEffect(() => {
        const handleClickOutside = () => {
            setOpenDropdown(null);
            setActiveActionMenu(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleDropdown = (e, name) => {
        if (e) e.stopPropagation();
        setOpenDropdown(openDropdown === name ? null : name);
        setActiveActionMenu(null);
    };

    const toggleActionMenu = (e, userId) => {
        if (e) e.stopPropagation();
        setActiveActionMenu(activeActionMenu === userId ? null : userId);
        setOpenDropdown(null);
    };

    const [userForm, setUserForm] = useState({
        username: '', email: '', password: '', roles: [], first_name: '', last_name: ''
    });

    const [modelForm, setModelForm] = useState({
        type: 'laptop', manufacturer: '', model_name: '', description: ''
    });

    const [roomForm, setRoomForm] = useState({
        name: '', building: '', floor: '', capacity: ''
    });

    const [roleForm, setRoleForm] = useState({
        name: '', permissions: []
    });

    useEffect(() => {
        if (!activeTab) return;
        if (hasRole('Administrator') || hasPermission('users.manage', 'roles.manage')) {
            loadRoles();
        }
        if (activeTab === 'users' && hasPermission('users.manage', 'users.create')) loadUsers();
        if (activeTab === 'models' && hasPermission('models.manage')) loadDeviceModels();
        if (activeTab === 'rooms' && hasPermission('rooms.manage')) loadRooms();
        if (activeTab === 'logs' && (hasPermission('logs.view') || hasRole('Administrator'))) loadLogs();
        if (activeTab === 'qr-codes' && hasPermission('qr.print')) loadContainers();

        if (activeTab === 'overview') {
            if (hasPermission('users.manage')) loadUsers();
            if (hasPermission('models.manage')) loadDeviceModels();
            if (hasPermission('rooms.manage')) loadRooms();
            if (hasPermission('roles.manage')) loadRoles();
            loadSettings();
            loadDashboardStats();
        }

        if (activeTab === 'settings') {
            loadSettings();
        }
    }, [activeTab]);

    const loadLogs = async () => {
        try {
            const response = await adminAPI.getLogs();
            setLogs(response.data);
        } catch (err) {
            console.error('Error loading logs:', err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getUsers();
            setUsers(response.data);
        } catch (err) {
            console.error('Error loading users:', err);
            error('Fehler beim Laden der Benutzer');
        } finally {
            setLoading(false);
        }
    };

    const loadDashboardStats = async () => {
        try {
            const response = await dashboardAPI.getStats();
            setStats(response.data);
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        }
    };

    const loadRoles = async () => {
        try {
            const response = await adminAPI.getRoles();
            setRoles(response.data);
        } catch (err) {
            console.error('Error loading roles:', err);
        }
    };

    const loadSettings = async () => {
        try {
            const response = await adminAPI.getSettings();
            setSettings(response.data);
        } catch (err) {
            console.error('Error loading settings:', err);
        }
    };

    const handleSettingsSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            await adminAPI.updateSettings(settings);
            success('Einstellungen gespeichert');
        } catch (err) {
            error('Fehler beim Speichern');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('logo', file);

        try {
            const response = await adminAPI.uploadLogo(formData);
            setSettings({ ...settings, logo_path: response.data.logo_path });
            success('Logo hochgeladen');
        } catch (err) {
            error('Fehler beim Logo-Upload');
        }
    };

    const loadDeviceModels = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getDeviceModels();
            setDeviceModels(response.data);
        } catch (err) {
            console.error('Error loading models:', err);
            setDeviceModels([]);
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getRooms();
            setRooms(response.data);
        } catch (err) {
            console.error('Error loading rooms:', err);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    const loadContainers = async () => {
        setLoading(true);
        try {
            const response = await containersAPI.getAll();
            setContainers(response.data);
        } catch (err) {
            console.error('Error loading containers:', err);
        } finally {
            setLoading(false);
        }
    };

    // User Management
    const openUserModal = () => {
        setModalType('user');
        setEditingUser(null);
        setUserForm({ username: '', email: '', password: '', roles: [], first_name: '', last_name: '' });
        setShowModal(true);
    };

    const openEditUserModal = (user) => {
        setModalType('user-edit');
        setEditingUser(user);
        setUserForm({
            username: user.username,
            email: user.email,
            roles: user.roles || (user.role ? [user.role] : []), // Handle legacy data or new array
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            password: '' // Password not edited here
        });
        setShowModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            if (modalType === 'user-edit') {
                await adminAPI.updateUser(editingUser.id, userForm);
                success('Benutzer erfolgreich aktualisiert');
            } else {
                await adminAPI.createUser(userForm);
                success('Benutzer erfolgreich erstellt');
            }
            setShowModal(false);
            loadUsers();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern');
        } finally {
            setSubmitting(false);
        }
    };

    const openResetModal = (id) => {
        setResetUserId(id);
        setNewPassword('');
        setModalType('reset-password');
        setShowModal(true);
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            error('Passwort muss mindestens 6 Zeichen lang sein');
            return;
        }

        try {
            await adminAPI.resetPassword(resetUserId, newPassword);
            success('Passwort erfolgreich zurückgesetzt');
            setShowModal(false);
            setResetUserId(null);
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Zurücksetzen');
        }
    };

    const generateRandomPassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let password = "";
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleGeneratePassword = (field) => {
        const pwd = generateRandomPassword();
        if (field === 'userForm') {
            setUserForm({ ...userForm, password: pwd });
        } else {
            setNewPassword(pwd);
        }
        navigator.clipboard.writeText(pwd);
        success('Passwort generiert und in Zwischenablage kopiert!');
    };

    // User Permissions Management
    const [showUserPermModal, setShowUserPermModal] = useState(false);
    const [permUser, setPermUser] = useState(null);

    const openUserPermissionsModal = (user) => {
        setPermUser(user);
        setShowUserPermModal(true);
    };

    const toggleUserDirectPermission = async (perm) => {
        if (!permUser) return;
        const hasDirect = permUser.permissions && permUser.permissions.includes(perm);

        try {
            if (hasDirect) {
                await axios.delete(`/api/users/${permUser.id}/permissions/${perm}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                success('Berechtigung entfernt');
            } else {
                await axios.post(`/api/users/${permUser.id}/permissions`, { permission: perm }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                success('Berechtigung hinzugefügt');
            }
            // Update local state by reloading users
            loadUsers();
            // Optimistically update current modal user
            const newPerms = hasDirect
                ? (permUser.permissions || []).filter(p => p !== perm)
                : [...(permUser.permissions || []), perm];
            setPermUser({ ...permUser, permissions: newPerms });

        } catch (err) {
            error('Fehler beim Ändern der Berechtigung');
        }
    };

    // Role Management
    const openRoleModal = () => {
        setModalType('role');
        setEditingRole(null);
        setRoleForm({ name: '', permissions: [] });
        setShowModal(true);
    };

    const openEditRoleModal = (role) => {
        setModalType('role-edit');
        setEditingRole(role);
        setRoleForm({
            name: role.name,
            permissions: role.permissions || []
        });
        setShowModal(true);
    };

    const togglePermission = (perm) => {
        const currentPerms = roleForm.permissions;
        if (currentPerms.includes(perm)) {
            setRoleForm({ ...roleForm, permissions: currentPerms.filter(p => p !== perm) });
        } else {
            setRoleForm({ ...roleForm, permissions: [...currentPerms, perm] });
        }
    };

    const handleRoleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'role-edit') {
                await adminAPI.updateRole(editingRole.id, roleForm);
                success('Rolle erfolgreich aktualisiert');
            } else {
                await adminAPI.createRole(roleForm);
                success('Rolle erfolgreich erstellt');
            }
            setShowModal(false);
            loadRoles();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    const deleteUser = async (user) => {
        const isConfirmed = await confirm({
            title: 'Benutzer löschen',
            message: `Möchten Sie den Benutzer "${user.username}" wirklich löschen?`,
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await adminAPI.deleteUser(user.id);
            success('Benutzer gelöscht');
            loadUsers();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    const toggleUserActive = async (user) => {
        try {
            await adminAPI.updateUser(user.id, { is_active: !user.is_active });
            success('Benutzerstatus geändert');
            loadUsers();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Ändern des Status');
        }
    };

    const handleBulkToggleActive = async () => {
        const isConfirmed = await confirm({
            title: 'Status ändern',
            message: `${selectedUsers.length} Benutzer aktivieren/deaktivieren?`,
            confirmText: 'Ändern'
        });
        if (!isConfirmed) return;

        try {
            await Promise.all(selectedUsers.map(id => {
                const user = users.find(u => u.id === id);
                return adminAPI.updateUser(id, { is_active: !user.is_active });
            }));
            success('Status für ausgewählte Benutzer geändert');
            setSelectedUsers([]);
            loadUsers();
        } catch (err) {
            error('Fehler bei Massenbearbeitung');
        }
    };

    const handleBulkDelete = async () => {
        const isConfirmed = await confirm({
            title: 'Benutzer löschen',
            message: `${selectedUsers.length} Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
            confirmText: 'Löschen',
            type: 'danger'
        });
        if (!isConfirmed) return;

        try {
            await Promise.all(selectedUsers.map(id => adminAPI.deleteUser(id)));
            success('Ausgewählte Benutzer gelöscht');
            setSelectedUsers([]);
            loadUsers();
        } catch (err) {
            error('Fehler beim Löschen der Benutzer');
        }
    };

    const deleteRole = async (id) => {
        const isConfirmed = await confirm({
            title: 'Rolle löschen',
            message: 'Möchten Sie diese Rolle wirklich löschen?',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await adminAPI.deleteRole(id);
            success('Rolle gelöscht');
            loadRoles();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    // Device Model Management
    const openModelModal = () => {
        setModalType('model');
        setModelForm({ type: 'laptop', manufacturer: '', model_name: '', description: '' });
        setShowModal(true);
    };

    const handleModelSubmit = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.createDeviceModel(modelForm);
            setShowModal(false);
            loadDeviceModels();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
        }
    };

    const deleteModel = async (id) => {
        const isConfirmed = await confirm({
            title: 'Gerätemodell löschen',
            message: 'Möchten Sie dieses Modell wirklich löschen?',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await adminAPI.deleteDeviceModel(id);
            loadDeviceModels();
        } catch (err) {
            error('Fehler beim Löschen');
        }
    };

    // Room Management
    const openRoomModal = () => {
        setModalType('room');
        setRoomForm({ name: '', building: '', floor: '', capacity: '' });
        setShowModal(true);
    };

    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.createRoom(roomForm);
            setShowModal(false);
            loadRooms();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Erstellen');
        }
    };

    const deleteRoom = async (id) => {
        const isConfirmed = await confirm({
            title: 'Raum löschen',
            message: 'Möchten Sie diesen Raum wirklich löschen?',
            confirmText: 'Löschen',
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await adminAPI.deleteRoom(id);
            loadRooms();
        } catch (err) {
            error('Fehler beim Löschen');
        }
    };

    // Available permissions for role creation and user assignment
    const availablePermissions = [
        'assets.manage', 'containers.manage', 'errors.manage', 'errors.create',
        'lendings.manage', 'lendings.create', 'users.manage', 'roles.manage',
        'models.manage', 'rooms.manage', 'qr.print', 'logs.view'
    ];

    const permissionLabels = {
        'assets.manage': 'Geräte verwalten',
        'containers.manage': 'Container verwalten',
        'errors.manage': 'Fehler verwalten',
        'errors.create': 'Fehler melden',
        'lendings.manage': 'Ausleihen verwalten',
        'lendings.create': 'Ausleihen erstellen',
        'users.manage': 'Benutzer verwalten',
        'roles.manage': 'Rollen verwalten',
        'models.manage': 'Modelle verwalten',
        'rooms.manage': 'Räume verwalten',
        'qr.print': 'QR-Codes drucken',
        'logs.view': 'Logs einsehen'
    };

    const getRoleBadgeClass = (roleName) => {
        const lower = (roleName || '').toLowerCase();
        if (lower === 'administrator' || lower === 'admin') return 'badge-danger';
        if (lower === 'mediencoach') return 'badge-warning';
        if (lower === 'lehrer') return 'badge-info';
        if (lower === 'schüler' || lower === 'schueler') return 'badge-success';
        return 'badge-info';
    };

    return (
        <div className="container">
            <div className="admin-layout">
                {/* Left Sub-Sidebar */}
                <aside className="admin-sidebar">
                    <div className="admin-sidebar-header">
                        <FiSettings /> Verwaltung
                    </div>

                    {/* System Group */}
                    <div className="admin-sidebar-group">
                        <div className="admin-sidebar-label">System</div>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`admin-sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
                        >
                            <FiGrid /> Übersicht
                        </button>
                        {availableTabs.includes('logs') && (
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`admin-sidebar-item ${activeTab === 'logs' ? 'active' : ''}`}
                            >
                                <FiList /> Aktivitäten-Logs
                            </button>
                        )}
                        {hasRole('Administrator') && (
                            <button onClick={() => setActiveTab('settings')} className={`admin-sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}>
                                <FiSettings /> Einstellungen
                            </button>
                        )}
                    </div>

                    {/* Users Group */}
                    {(hasPermission('users.manage', 'roles.manage') || hasRole('Administrator')) && (
                        <div className="admin-sidebar-group">
                            <div className="admin-sidebar-label">Benutzerverwaltung</div>
                            {availableTabs.includes('users') && (
                                <button onClick={() => setActiveTab('users')} className={`admin-sidebar-item ${activeTab === 'users' ? 'active' : ''}`}>
                                    <FiUsers /> Benutzerliste
                                </button>
                            )}
                            {availableTabs.includes('roles') && (
                                <button onClick={() => setActiveTab('roles')} className={`admin-sidebar-item ${activeTab === 'roles' ? 'active' : ''}`}>
                                    <FiShield /> Rollen
                                </button>
                            )}
                            {availableTabs.includes('permissions') && (
                                <button onClick={() => setActiveTab('permissions')} className={`admin-sidebar-item ${activeTab === 'permissions' ? 'active' : ''}`}>
                                    <FiLock /> Rechte-Matrix
                                </button>
                            )}
                        </div>
                    )}

                    {/* Devices Group */}
                    {(hasPermission('models.manage', 'rooms.manage', 'qr.print')) && (
                        <div className="admin-sidebar-group">
                            <div className="admin-sidebar-label">Ressourcen</div>
                            {availableTabs.includes('models') && (
                                <button onClick={() => setActiveTab('models')} className={`admin-sidebar-item ${activeTab === 'models' ? 'active' : ''}`}>
                                    <FiCpu /> Modelle
                                </button>
                            )}
                            {availableTabs.includes('rooms') && (
                                <button onClick={() => setActiveTab('rooms')} className={`admin-sidebar-item ${activeTab === 'rooms' ? 'active' : ''}`}>
                                    <FiMapPin /> Räume
                                </button>
                            )}
                            {availableTabs.includes('qr-codes') && (
                                <button onClick={() => setActiveTab('qr-codes')} className={`admin-sidebar-item ${activeTab === 'qr-codes' ? 'active' : ''}`}>
                                    <FiBox /> QR-Codes
                                </button>
                            )}
                        </div>
                    )}
                </aside>

                {/* Right Content Area */}
                <main className="admin-content">
                    <div className="card" style={activeTab === 'overview' ? { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 } : {}}>
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="fade-in">
                                {/* Professional Status Section */}
                                {stats && (
                                    <div className="mb-xl">
                                        {(stats.recent_errors.length > 0 || stats.upcoming_returns.length > 0) ? (
                                            <div style={{
                                                background: 'var(--color-warning-light)',
                                                border: '1px solid var(--color-warning)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 'var(--space-md) var(--space-lg)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-md)',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}>
                                                <div style={{ background: 'var(--color-warning)', padding: '8px', borderRadius: 'var(--radius-sm)', display: 'flex' }}>
                                                    <FiActivity color="white" size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px' }}>Handlungsbedarf</div>
                                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                                                        {stats.recent_errors.length} offene Fehlermeldungen • {stats.upcoming_returns.length} anstehende Rückgaben
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{
                                                background: 'var(--color-bg-medium)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)',
                                                padding: 'var(--space-xl)',
                                                textAlign: 'center',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}>
                                                <div style={{ background: 'var(--color-success)', padding: '12px', borderRadius: '50%', display: 'flex', color: 'white' }}>
                                                    <FiCheck size={24} />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Alles im Griff</h3>
                                                    <p className="text-muted" style={{ margin: 0, fontSize: '14px' }}>Momentan gibt es keine offenen Aufgaben für Sie.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-4 grid-mobile-2 mb-xl">
                                    {hasPermission('users.manage') && (
                                        <div className="stat-card">
                                            <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{users.length}</div>
                                            <div className="stat-label">Benutzer</div>
                                        </div>
                                    )}
                                    {hasPermission('models.manage', 'assets.view') && (
                                        <div className="stat-card">
                                            <div className="stat-value" style={{ color: 'var(--color-info)' }}>{deviceModels.length}</div>
                                            <div className="stat-label">Modelle</div>
                                        </div>
                                    )}
                                    {hasPermission('rooms.manage', 'containers.manage') && (
                                        <div className="stat-card">
                                            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{rooms.length}</div>
                                            <div className="stat-label">Räume</div>
                                        </div>
                                    )}
                                    {hasRole('Administrator') && (
                                        <div className="stat-card">
                                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{roles.length}</div>
                                            <div className="stat-label">Rollen</div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-2 grid-mobile-1">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title"><FiActivity /> Schnelle Aktionen</h3>
                                        </div>
                                        <div className="card-body">
                                            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                                                {hasPermission('users.manage') && (
                                                    <button onClick={openUserModal} className="btn btn-secondary" style={{ justifyContent: 'start' }}>
                                                        <FiPlus /> Neuen Benutzer anlegen
                                                    </button>
                                                )}
                                                {hasPermission('models.manage') && (
                                                    <button onClick={openModelModal} className="btn btn-secondary" style={{ justifyContent: 'start' }}>
                                                        <FiPlus /> Neues Gerätemodell
                                                    </button>
                                                )}
                                                {hasPermission('rooms.manage') && (
                                                    <button onClick={openRoomModal} className="btn btn-secondary" style={{ justifyContent: 'start' }}>
                                                        <FiPlus /> Neuen Raum erstellen
                                                    </button>
                                                )}
                                                {hasRole('Administrator') && (
                                                    <button onClick={openRoleModal} className="btn btn-secondary" style={{ justifyContent: 'start' }}>
                                                        <FiPlus /> Neue Rolle definieren
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {hasRole('Administrator') && (
                                        <div className="card">
                                            <div className="card-header">
                                                <h3 className="card-title"><FiUsers /> Rollenverteilung</h3>
                                            </div>
                                            <div className="card-body">
                                                {roles.map(role => {
                                                    const count = users.filter(u => {
                                                        const uRoles = u.roles || (u.role ? [u.role] : []);
                                                        if (role.name === 'Administrator') {
                                                            return uRoles.some(r => r === 'Administrator' || r === 'admin');
                                                        }
                                                        return uRoles.includes(role.name);
                                                    }).length;
                                                    const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                                                    return (
                                                        <div key={role.id} style={{ marginBottom: 'var(--space-md)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span className="text-small">{role.name}</span>
                                                                <span className="text-small text-muted">{count} User</span>
                                                            </div>
                                                            <div style={{
                                                                height: '6px',
                                                                width: '100%',
                                                                background: 'var(--color-bg-dark)',
                                                                borderRadius: '3px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    height: '100%',
                                                                    width: `${percentage}%`,
                                                                    background: 'var(--color-primary)',
                                                                    borderRadius: '3px'
                                                                }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* USERS TAB */}
                        {activeTab === 'users' && (
                            <div>
                                <div className="card-header">
                                    <h2 className="card-title">Benutzerverwaltung</h2>
                                    <button onClick={openUserModal} className="btn btn-primary">
                                        <FiPlus /> Neuer Benutzer
                                    </button>
                                </div>

                                {/* Bulk Action Bar */}
                                {selectedUsers.length > 0 && (
                                    <div className="bulk-actions-bar">
                                        <div className="bulk-actions-group">
                                            <span style={{ fontWeight: 600 }}>{selectedUsers.length} ausgewählt</span>
                                            <button onClick={handleBulkToggleActive} className="btn btn-sm btn-secondary">
                                                <FiUserCheck /> Status ändern
                                            </button>
                                            <button onClick={handleBulkDelete} className="btn btn-sm btn-danger">
                                                <FiTrash2 /> Löschen
                                            </button>
                                        </div>
                                        <button onClick={() => setSelectedUsers([])} className="btn btn-sm btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>
                                            Auswahl aufheben
                                        </button>
                                    </div>
                                )}

                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.length === users.length && users.length > 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedUsers(users.map(u => u.id));
                                                            } else {
                                                                setSelectedUsers([]);
                                                            }
                                                        }}
                                                    />
                                                </th>
                                                <th>Benutzername</th>
                                                <th>Name</th>
                                                <th>E-Mail</th>
                                                <th>Rollen</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'right' }}>Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(user => (
                                                <tr key={user.id} className={`${activeActionMenu === user.id ? 'row-active-menu' : ''}${selectedUsers.includes(user.id) ? ' selected' : ''}`}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.includes(user.id)}
                                                            onChange={() => {
                                                                if (selectedUsers.includes(user.id)) {
                                                                    setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                                                } else {
                                                                    setSelectedUsers([...selectedUsers, user.id]);
                                                                }
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{user.username}</td>
                                                    <td>{user.first_name} {user.last_name || '-'}</td>
                                                    <td className="text-muted">{user.email}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {(user.roles || []).map(role => (
                                                                <span key={role} className={`badge ${getRoleBadgeClass(role)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                    {role}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {user.is_active
                                                            ? <span className="badge badge-success">Aktiv</span>
                                                            : <span className="badge badge-danger">Inaktiv</span>
                                                        }
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div className="action-menu-container">
                                                            <button
                                                                className="action-menu-btn"
                                                                onClick={(e) => toggleActionMenu(e, user.id)}
                                                                title="Aktionen"
                                                            >
                                                                <FiMoreVertical />
                                                            </button>

                                                            {activeActionMenu === user.id && (
                                                                <div className="action-menu-dropdown">
                                                                    <button
                                                                        onClick={() => toggleUserActive(user)}
                                                                        className="dropdown-item"
                                                                    >
                                                                        {user.is_active ? <FiUserX /> : <FiUserCheck />}
                                                                        {user.is_active ? 'Deaktivieren' : 'Aktivieren'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openResetModal(user.id)}
                                                                        className="dropdown-item"
                                                                    >
                                                                        <FiKey /> Passwort zurücksetzen
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openEditUserModal(user)}
                                                                        className="dropdown-item"
                                                                    >
                                                                        <FiEdit2 /> Bearbeiten
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openUserPermissionsModal(user)}
                                                                        className="dropdown-item"
                                                                    >
                                                                        <FiShield /> Rechte verwalten
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteUser(user)}
                                                                        className="dropdown-item"
                                                                        style={{ color: 'var(--color-error)' }}
                                                                    >
                                                                        <FiTrash2 /> Löschen
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr><td colSpan="7" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Benutzer vorhanden</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* DEVICE MODELS TAB */}
                        {
                            activeTab === 'models' && (
                                <div>
                                    <div className="card-header">
                                        <h2 className="card-title">Gerätemodelle</h2>
                                        <button onClick={openModelModal} className="btn btn-primary">
                                            <FiPlus /> Neues Modell
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Modellname</th>
                                                    <th>Typ</th>
                                                    <th>Hersteller</th>
                                                    <th>Beschreibung</th>
                                                    <th style={{ textAlign: 'right' }}>Aktionen</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deviceModels.map(model => (
                                                    <tr key={model.id} className={activeActionMenu === model.id ? 'row-active-menu' : ''}>
                                                        <td style={{ fontWeight: 600 }}>{model.model_name}</td>
                                                        <td><span className="badge badge-info">{model.type}</span></td>
                                                        <td>{model.manufacturer}</td>
                                                        <td className="text-muted text-small">{model.description || '-'}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div className="action-menu-container">
                                                                <button
                                                                    className="action-menu-btn"
                                                                    onClick={(e) => toggleActionMenu(e, model.id)}
                                                                    title="Aktionen"
                                                                >
                                                                    <FiMoreVertical size={18} />
                                                                </button>

                                                                {activeActionMenu === model.id && (
                                                                    <div className="action-menu-dropdown">
                                                                        <button
                                                                            onClick={() => deleteModel(model.id)}
                                                                            className="dropdown-item"
                                                                            style={{ color: 'var(--color-error)' }}
                                                                        >
                                                                            <FiTrash2 /> Löschen
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {deviceModels.length === 0 && (
                                                    <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Noch keine Gerätemodelle definiert</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }

                        {/* ROOMS TAB */}
                        {
                            activeTab === 'rooms' && (
                                <div>
                                    <div className="card-header">
                                        <h2 className="card-title">Raumverwaltung</h2>
                                        <button onClick={openRoomModal} className="btn btn-primary">
                                            <FiPlus /> Neuer Raum
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Gebäude</th>
                                                    <th>Etage</th>
                                                    <th>Kapazität</th>
                                                    <th>QR-Code</th>
                                                    <th style={{ textAlign: 'right' }}>Aktionen</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rooms.map(room => (
                                                    <tr key={room.id} className={activeActionMenu === room.id ? 'row-active-menu' : ''}>
                                                        <td style={{ fontWeight: 600 }}>{room.name}</td>
                                                        <td>{room.building || '-'}</td>
                                                        <td>{room.floor || '-'}</td>
                                                        <td>{room.capacity ? `${room.capacity} Personen` : '-'}</td>
                                                        <td>
                                                            <code style={{ fontSize: '11px', background: 'var(--color-bg-dark)', padding: '2px 4px', borderRadius: '4px' }}>
                                                                {room.qr_code}
                                                            </code>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    className="btn btn-sm btn-secondary"
                                                                    title="PDF Export"
                                                                    onClick={() => {
                                                                        const url = `/api/admin/export/qr-pdf/${room.id}?token=${localStorage.getItem('token')}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                >
                                                                    <FiBox size={14} /> PDF
                                                                </button>
                                                                <div className="action-menu-container">
                                                                    <button
                                                                        className="action-menu-btn"
                                                                        onClick={(e) => toggleActionMenu(e, room.id)}
                                                                        title="Aktionen"
                                                                    >
                                                                        <FiMoreVertical size={18} />
                                                                    </button>

                                                                    {activeActionMenu === room.id && (
                                                                        <div className="action-menu-dropdown">
                                                                            <button
                                                                                onClick={() => deleteRoom(room.id)}
                                                                                className="dropdown-item"
                                                                                style={{ color: 'var(--color-error)' }}
                                                                            >
                                                                                <FiTrash2 /> Löschen
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {rooms.length === 0 && (
                                                    <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Noch keine Räume angelegt</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }

                        {/* ROLES TAB */}
                        {activeTab === 'roles' && (
                            <div>
                                <div className="card-header">
                                    <h2 className="card-title">Rollen & Berechtigungen</h2>
                                    <button onClick={openRoleModal} className="btn btn-primary">
                                        <FiPlus /> Neue Rolle
                                    </button>
                                </div>
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Typ</th>
                                                <th>Berechtigungen</th>
                                                <th style={{ textAlign: 'right' }}>Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roles.map(role => (
                                                <tr key={role.id} className={activeActionMenu === role.id ? 'row-active-menu' : ''}>
                                                    <td style={{ fontWeight: 600 }}>{role.name}</td>
                                                    <td>
                                                        {role.is_system
                                                            ? <span className="badge badge-info">System</span>
                                                            : <span className="badge badge-secondary" style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-secondary)' }}>Custom</span>
                                                        }
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            {role.permissions && role.permissions.includes('all') ? (
                                                                <span className="badge badge-success">Alle Rechte</span>
                                                            ) : (
                                                                role.permissions && role.permissions.map((perm, idx) => (
                                                                    <span key={idx} className="badge badge-outline" style={{ fontSize: '10px' }}>
                                                                        {permissionLabels[perm] || perm}
                                                                    </span>
                                                                ))
                                                            )}
                                                            {(!role.permissions || role.permissions.length === 0) && <span className="text-muted text-small">-</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div className="action-menu-container">
                                                            <button
                                                                className="action-menu-btn"
                                                                onClick={(e) => toggleActionMenu(e, role.id)}
                                                                title="Aktionen"
                                                            >
                                                                <FiMoreVertical />
                                                            </button>

                                                            {activeActionMenu === role.id && (
                                                                <div className="action-menu-dropdown">
                                                                    <button
                                                                        onClick={() => openEditRoleModal(role)}
                                                                        className="dropdown-item"
                                                                    >
                                                                        <FiEdit2 /> Bearbeiten
                                                                    </button>
                                                                    {!role.is_system ? (
                                                                        <button
                                                                            onClick={() => deleteRole(role.id)}
                                                                            className="dropdown-item"
                                                                            style={{ color: 'var(--color-error)' }}
                                                                        >
                                                                            <FiTrash2 /> Löschen
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            disabled
                                                                            className="dropdown-item"
                                                                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                                                            title="System-Rollen können nicht gelöscht werden"
                                                                        >
                                                                            <FiLock /> Löschen
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {roles.length === 0 && (
                                                <tr><td colSpan="4" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Rollen vorhanden</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}


                        {/* LOGS TAB */}
                        {
                            activeTab === 'logs' && (
                                <div>
                                    <div className="card-header">
                                        <h2 className="card-title">System-Logs</h2>
                                        <button onClick={loadLogs} className="btn btn-secondary">
                                            Aktualisieren
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
                                                            {new Date(log.timestamp).toLocaleString('de-DE')}
                                                        </td>
                                                        <td><span className="badge badge-secondary">{log.action}</span></td>
                                                        <td><strong>{log.user}</strong></td>
                                                        <td>{log.details}</td>
                                                    </tr>
                                                ))}
                                                {logs.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="text-center text-muted p-md">Keine Logs vorhanden</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }

                        {/* QR-CODES TAB */}
                        {activeTab === 'qr-codes' && (
                            <div>
                                <div className="card-header">
                                    <h2 className="card-title">QR-Codes Exportieren</h2>
                                    <p className="text-muted text-small" style={{ marginTop: '4px' }}>Laden Sie QR-Codepakete für Ihre Container als PDF herunter.</p>
                                </div>
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Container / Raum</th>
                                                <th>Typ</th>
                                                <th>Standort</th>
                                                <th>QR-ID</th>
                                                <th>Geräteanzahl</th>
                                                <th style={{ textAlign: 'right' }}>Aktionen</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && containers.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center text-muted">Lade Daten...</td></tr>
                                            ) : containers.map(container => (
                                                <tr key={container.id}>
                                                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{container.name}</td>
                                                    <td>
                                                        <span className="badge badge-secondary">
                                                            {container.type === 'raum' ? 'Raum' : container.type}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted">{container.location || '-'}</td>
                                                    <td>
                                                        <code style={{ fontSize: '10px' }}>{container.qr_code}</code>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: 600 }}>{container.asset_count || 0}</span> Geräte
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            style={{ gap: '6px' }}
                                                            onClick={() => {
                                                                const url = `/api/admin/export/qr-pdf/${container.id}?token=${localStorage.getItem('token')}`;
                                                                window.open(url, '_blank');
                                                            }}
                                                        >
                                                            <FiBox size={14} /> PDF Export
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {!loading && containers.length === 0 && (
                                                <tr><td colSpan="6" className="text-center text-muted">Keine Container gefunden</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {/* PERMISSIONS TAB (New) */}
                        {
                            activeTab === 'permissions' && (
                                <div>
                                    <div className="card-header">
                                        <h2 className="card-title">Verfügbare Berechtigungen</h2>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Berechtigungskürzel</th>
                                                    <th>Beschreibung</th>
                                                    <th>Zugewiesene Rollen</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(permissionLabels).map(([permKey, label]) => {
                                                    // Find roles that have this permission OR 'all'
                                                    const rolesWithPerm = roles.filter(r =>
                                                        (r.permissions && r.permissions.includes(permKey)) ||
                                                        (r.permissions && r.permissions.includes('all'))
                                                    );

                                                    return (
                                                        <tr key={permKey}>
                                                            <td><code>{permKey}</code></td>
                                                            <td>{label}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                                    {rolesWithPerm.map(r => (
                                                                        <span key={r.id} className={getRoleBadgeClass(r.name)}>
                                                                            {r.name}
                                                                        </span>
                                                                    ))}
                                                                    {rolesWithPerm.length === 0 && <span className="text-muted">-</span>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        }
                        {/* SETTINGS TAB */}
                        {activeTab === 'settings' && (
                            <div>
                                <div className="card-header">
                                    <h2 className="card-title">System-Einstellungen</h2>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={handleSettingsSubmit} style={{ maxWidth: '600px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Name der Organisation</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={settings.org_name || ''}
                                                onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
                                                placeholder="z.B. Thomas-Mann-Schule"
                                            />
                                            <p className="text-muted text-small mt-sm">
                                                Dieser Name erscheint in der Seitenleiste und auf den generierten QR-Etiketten.
                                            </p>
                                        </div>

                                        <div className="form-group mt-xl">
                                            <label className="form-label">Logo der Organisation</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-sm)' }}>
                                                {settings.logo_path ? (
                                                    <div style={{
                                                        width: '64px',
                                                        height: '64px',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--color-bg-medium)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        border: '1px solid var(--color-border)'
                                                    }}>
                                                        <img
                                                            src={`/uploads/${settings.logo_path}?t=${Date.now()}`}
                                                            alt="Logo Preiew"
                                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        width: '64px',
                                                        height: '64px',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--color-bg-medium)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px dashed var(--color-border)',
                                                        color: 'var(--color-text-secondary)',
                                                        fontSize: '24px'
                                                    }}>
                                                        <FiImage size={24} />
                                                    </div>
                                                )}
                                                <div>
                                                    <input
                                                        type="file"
                                                        id="logo-upload"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <label htmlFor="logo-upload" className="btn btn-secondary btn-sm">
                                                        Logo hochladen
                                                    </label>
                                                    <p className="text-muted text-small mt-xs">Empfohlen: Quadratisch, PNG oder SVG.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 'var(--space-lg)' }}>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={submitting}
                                            >
                                                {submitting ? 'Speichert...' : 'Änderungen speichern'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </main >
            </div >

            {/* MODALS */}
            {
                showModal && (modalType === 'user' || modalType === 'user-edit') && (
                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title={modalType === 'user-edit' ? "Benutzer bearbeiten" : "Neuer Benutzer"}
                        footer={
                            <>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                                <button onClick={handleUserSubmit} className="btn btn-primary" disabled={submitting}>
                                    {submitting ? "Speichert..." : (modalType === 'user-edit' ? "Speichern" : "Erstellen")}
                                </button>
                            </>
                        }
                    >
                        <form onSubmit={handleUserSubmit}>
                            <div className="form-group">
                                <label className="form-label">Benutzername *</label>
                                <input type="text" className="form-input" value={userForm.username}
                                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">E-Mail</label>
                                <input type="email" className="form-input" value={userForm.email}
                                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                            </div>
                            {modalType === 'user' && (
                                <div className="form-group">
                                    <label className="form-label">Passwort *</label>
                                    <input type="password" className="form-input" value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength="6" />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Vorname</label>
                                <input type="text" className="form-input" value={userForm.first_name}
                                    onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nachname</label>
                                <input type="text" className="form-input" value={userForm.last_name}
                                    onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rollen *</label>
                                <MultiSelectDropdown
                                    options={roles.map(role => ({ value: role.name, label: role.name }))}
                                    selected={userForm.roles}
                                    onChange={(newRoles) => setUserForm({ ...userForm, roles: newRoles })}
                                    label="-- Rollen wählen --"
                                />
                            </div>
                        </form>
                    </Modal>
                )
            }

            {
                showModal && (modalType === 'role' || modalType === 'role-edit') && (
                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title={modalType === 'role-edit' ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
                        footer={
                            <>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                                <button onClick={handleRoleSubmit} className="btn btn-primary">
                                    {modalType === 'role-edit' ? 'Aktualisieren' : 'Erstellen'}
                                </button>
                            </>
                        }
                    >
                        <form onSubmit={handleRoleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Rollenbezeichnung *</label>
                                <input type="text" className="form-input" value={roleForm.name}
                                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                    placeholder="z.B. super-schueler" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Berechtigungen</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {availablePermissions.map(perm => (
                                        <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                id={`perm-${perm}`}
                                                checked={roleForm.permissions.includes(perm)}
                                                onChange={() => togglePermission(perm)}
                                            />
                                            <label htmlFor={`perm-${perm}`} style={{ fontSize: '14px', cursor: 'pointer' }}>
                                                {permissionLabels[perm] || perm}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {/* ... other modals ... */}

            {
                showModal && modalType === 'model' && (
                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title="Neues Gerätemodell"
                        footer={
                            <>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                                <button onClick={handleModelSubmit} className="btn btn-primary">Erstellen</button>
                            </>
                        }
                    >
                        <form onSubmit={handleModelSubmit}>
                            <div className="form-group">
                                <label className="form-label">Gerätetyp *</label>
                                <select className="form-select" value={modelForm.type}
                                    onChange={(e) => setModelForm({ ...modelForm, type: e.target.value })} required>
                                    <option value="laptop">Laptop</option>
                                    <option value="ipad">iPad/Tablet</option>
                                    <option value="pc">PC / Workstation</option>
                                    <option value="apple_tv">Apple TV / Streaming</option>
                                    <option value="beamer">Beamer / Projektor</option>
                                    <option value="monitor">Monitor / Display</option>
                                    <option value="dokumentenkamera">Dokumentenkamera</option>
                                    <option value="drucker">Drucker</option>
                                    <option value="lautsprecher">Lautsprecher</option>
                                    <option value="mikrofon">Mikrofon</option>
                                    <option value="kamera">Kamera</option>
                                    <option value="sonstiges">Sonstiges</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hersteller *</label>
                                <input type="text" className="form-input" value={modelForm.manufacturer}
                                    onChange={(e) => setModelForm({ ...modelForm, manufacturer: e.target.value })}
                                    placeholder="z.B. Lenovo, Apple, Epson" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Modellbezeichnung *</label>
                                <input type="text" className="form-input" value={modelForm.model_name}
                                    onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
                                    placeholder="z.B. ThinkPad T14, iPad Pro 11" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Beschreibung</label>
                                <textarea className="form-textarea" value={modelForm.description}
                                    onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                                    placeholder="Optionale Beschreibung..." rows="3"></textarea>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {
                showModal && modalType === 'room' && (
                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title="Neuer Raum"
                        footer={
                            <>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                                <button onClick={handleRoomSubmit} className="btn btn-primary">Erstellen</button>
                            </>
                        }
                    >
                        <form onSubmit={handleRoomSubmit}>
                            <div className="form-group">
                                <label className="form-label">Raumbezeichnung *</label>
                                <input type="text" className="form-input" value={roomForm.name}
                                    onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                                    placeholder="z.B. B204, Aula, Computerraum 1" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gebäude</label>
                                <input type="text" className="form-input" value={roomForm.building}
                                    onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                                    placeholder="z.B. Hauptgebäude, Neubau" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Etage</label>
                                <input type="text" className="form-input" value={roomForm.floor}
                                    onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                                    placeholder="z.B. EG, 1. OG, 2. OG" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kapazität (Personen)</label>
                                <input type="number" className="form-input" value={roomForm.capacity}
                                    onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                                    placeholder="z.B. 30" />
                            </div>
                        </form>
                    </Modal>
                )
            }

            {
                showModal && modalType === 'reset-password' && (
                    <Modal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        title="Passwort zurücksetzen"
                        footer={
                            <>
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                                <button onClick={handlePasswordReset} className="btn btn-primary">Zurücksetzen</button>
                            </>
                        }
                    >
                        <form onSubmit={handlePasswordReset}>
                            <p className="text-muted mb-md">
                                Setzen Sie ein neues vorläufiges Passwort für diesen Benutzer.
                                Der Benutzer wird bei der nächsten Anmeldung aufgefordert, es zu ändern.
                            </p>
                            <div className="form-group">
                                <label className="form-label">Neues Passwort *</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mindestens 6 Zeichen"
                                        required
                                        minLength="6"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => handleGeneratePassword('newPassword')}
                                        title="Passwort generieren & kopieren"
                                    >
                                        <FiKey />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {
                showUserPermModal && permUser && (
                    <Modal
                        isOpen={showUserPermModal}
                        onClose={() => setShowUserPermModal(false)}
                        title={`Berechtigungen für ${permUser.username}`}
                        footer={
                            <button onClick={() => setShowUserPermModal(false)} className="btn btn-primary">Schließen</button>
                        }
                    >
                        <div className="mb-md">
                            <p className="text-small text-muted mb-sm">
                                Hier können Sie dem Benutzer <strong>über die Rollen hinaus</strong> spezifische Berechtigungen zuweisen.
                                Berechtigungen, die bereits durch eine Rolle gewährt werden, sind ausgegraut.
                            </p>
                        </div>
                        <div className="form-group">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {availablePermissions.map(perm => {
                                    // Check if user has permission via role: handles array of strings (names)
                                    const userRoles = roles.filter(r => (permUser.roles || []).includes(r.name));
                                    // Check via role permissions or Administrator role
                                    const hasViaRole = userRoles.some(r => r.permissions && (r.permissions.includes(perm) || r.permissions.includes('all'))) || (permUser.roles || []).includes('Administrator');

                                    // Check if user has direct permission
                                    const hasDirect = permUser.permissions && permUser.permissions.includes(perm);

                                    return (
                                        <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hasViaRole ? 0.7 : 1 }}>
                                            <input
                                                type="checkbox"
                                                id={`user-perm-${perm}`}
                                                checked={hasViaRole || hasDirect}
                                                disabled={hasViaRole}
                                                onChange={() => !hasViaRole && toggleUserDirectPermission(perm)}
                                            />
                                            <label htmlFor={`user-perm-${perm}`} style={{ fontSize: '14px', cursor: hasViaRole ? 'default' : 'pointer' }}>
                                                {permissionLabels[perm] || perm}
                                                {hasViaRole && <span className="text-muted text-xs ml-xs">(Rolle)</span>}
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
}

const styles = {};

export default Admin;
