import { useState, useEffect } from 'react';
import { FiSettings, FiUsers, FiShield, FiPlus, FiTrash2, FiEdit2, FiKey, FiUserCheck, FiUserX, FiGrid, FiList, FiCpu, FiMapPin, FiBox, FiLock, FiActivity, FiCheck } from 'react-icons/fi';
import { authAPI, dashboardAPI } from '../services/api';
import Modal from '../components/Modal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { getUser, hasRole, hasPermission } from '../utils/auth';
import axios from 'axios';

function Admin() {
    const [activeTab, setActiveTab] = useState('');
    const [openDropdown, setOpenDropdown] = useState(null); // 'users' | 'devices' | null
    const [users, setUsers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [logs, setLogs] = useState([]);
    const [roles, setRoles] = useState([]);
    const [containers, setContainers] = useState([]);
    const [rooms, setRooms] = useState([]); // Explicitly initialize rooms state
    const [stats, setStats] = useState(null); // Add stats state for banner
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editingRole, setEditingRole] = useState(null);
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();
    const user = getUser(); // Get current user for permission checks

    // Determine available tabs based on permissions
    const getAvailableTabs = () => {
        const tabs = [];

        // Overview is always available if you have access to admin panel
        tabs.push('overview');

        // User Group
        if (hasPermission('users.manage', 'users.create')) tabs.push('users');
        if (hasPermission('roles.manage')) tabs.push('roles');
        if (hasRole('Administrator')) tabs.push('permissions'); // New Permissions tab

        // Device Group
        if (hasPermission('models.manage')) tabs.push('models');
        if (hasPermission('rooms.manage')) tabs.push('rooms');
        if (hasPermission('qr.print')) tabs.push('qr-codes');

        // System Group
        if (hasPermission('logs.view') || hasRole('Administrator')) tabs.push('logs');

        return tabs;
    };

    const availableTabs = getAvailableTabs();

    const toggleDropdown = (name) => {
        if (openDropdown === name) {
            setOpenDropdown(null);
        } else {
            setOpenDropdown(name);
        }
    };

    // Set initial active tab
    useEffect(() => {
        if (!activeTab && availableTabs.length > 0) {
            setActiveTab(availableTabs[0]);
        }
    }, [availableTabs, activeTab]);

    // Form states
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

        // Always load roles as they are needed for user forms and general info
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
            loadDashboardStats(); // Load stats for banner
        }
    }, [activeTab]);

    const loadLogs = async () => {
        try {
            const response = await axios.get('/api/logs', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')} ` }
            });
            setLogs(response.data);
        } catch (err) {
            console.error('Error loading logs:', err);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/users', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')} ` }
            });
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

    const loadDeviceModels = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/device-models', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')} ` }
            });
            setDeviceModels(response.data);
        } catch (err) {
            console.error('Error:', err);
            setDeviceModels([]);
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/rooms', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setRooms(response.data);
        } catch (err) {
            console.error('Error:', err);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    };

    const loadContainers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/containers', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setContainers(response.data);
        } catch (err) {
            console.error('Error loading containers:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRoles = async () => {
        try {
            const response = await axios.get('/api/admin/roles', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setRoles(response.data);
        } catch (err) {
            console.error('Error:', err);
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
                await axios.put(`/api/users/${editingUser.id}`, userForm, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                success('Benutzer erfolgreich aktualisiert');
            } else {
                await authAPI.register(userForm);
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
            await axios.post(`/api/users/${resetUserId}/reset-password`,
                { new_password: newPassword },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            success('Passwort erfolgreich zurückgesetzt');
            setShowModal(false);
            setResetUserId(null);
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Zurücksetzen');
        }
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
                await axios.put(`/api/admin/roles/${editingRole.id}`, roleForm, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                success('Rolle erfolgreich aktualisiert');
            } else {
                await axios.post('/api/admin/roles', roleForm, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
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
            await axios.delete(`/api/users/${user.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            success('Benutzer gelöscht');
            loadUsers();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    const toggleUserActive = async (user) => {
        try {
            const response = await axios.post(`/api/users/${user.id}/toggle-active`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            success(response.data.message);
            loadUsers();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Ändern des Status');
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
            await axios.delete(`/api/admin/roles/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
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
            await axios.post('/api/admin/device-models', modelForm, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
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
            await axios.delete(`/api/admin/device-models/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
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
            await axios.post('/api/admin/rooms', roomForm, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
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
            await axios.delete(`/api/admin/rooms/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
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
            <div className="flex justify-between items-center mb-xl">
                <h1><FiSettings style={{ display: 'inline', marginRight: '10px' }} />Verwaltung</h1>
            </div>

            {/* Navigation Bar with Dropdowns */}
            <div style={styles.adminNav}>
                {/* Overview - Direct Link */}
                <button
                    onClick={() => { setActiveTab('overview'); setOpenDropdown(null); }}
                    style={activeTab === 'overview' ? { ...styles.navButton, ...styles.navButtonActive } : styles.navButton}
                >
                    <FiGrid /> Übersicht
                </button>

                {/* Benutzer Group Dropdown */}
                {(hasPermission('users.manage', 'roles.manage') || hasRole('Administrator')) && (
                    <div style={styles.navGroup}>
                        <button
                            onClick={() => toggleDropdown('users')}
                            style={{ ...styles.navButton, ...(activeTab === 'users' || activeTab === 'roles' || activeTab === 'permissions' ? styles.navButtonActive : {}) }}
                        >
                            <FiUsers /> Benutzer <span style={{ fontSize: '10px' }}>▼</span>
                        </button>

                        {openDropdown === 'users' && (
                            <div style={styles.dropdownMenu} onMouseLeave={() => setOpenDropdown(null)}>
                                {availableTabs.includes('users') && (
                                    <button
                                        onClick={() => { setActiveTab('users'); setOpenDropdown(null); }}
                                        style={activeTab === 'users' ? { ...styles.dropdownItem, ...styles.dropdownItemActive } : styles.dropdownItem}
                                    >
                                        <FiUsers /> Benutzer
                                    </button>
                                )}
                                {availableTabs.includes('roles') && (
                                    <button
                                        onClick={() => { setActiveTab('roles'); setOpenDropdown(null); }}
                                        style={activeTab === 'roles' ? { ...styles.dropdownItem, ...styles.dropdownItemActive } : styles.dropdownItem}
                                    >
                                        <FiShield /> Rollen
                                    </button>
                                )}
                                {availableTabs.includes('permissions') && (
                                    <button
                                        onClick={() => { setActiveTab('permissions'); setOpenDropdown(null); }}
                                        style={activeTab === 'permissions' ? { ...styles.dropdownItem, ...styles.dropdownItemActive } : styles.dropdownItem}
                                    >
                                        <FiShield /> Rechte
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Geräte Group Dropdown */}
                {(hasPermission('models.manage', 'rooms.manage', 'qr.print')) && (
                    <div style={styles.navGroup}>
                        <button
                            onClick={() => toggleDropdown('devices')}
                            style={{ ...styles.navButton, ...(activeTab === 'models' || activeTab === 'rooms' || activeTab === 'qr-codes' ? styles.navButtonActive : {}) }}
                        >
                            <FiBox /> Geräte <span style={{ fontSize: '10px' }}>▼</span>
                        </button>

                        {openDropdown === 'devices' && (
                            <div style={styles.dropdownMenu} onMouseLeave={() => setOpenDropdown(null)}>
                                {availableTabs.includes('models') && (
                                    <button
                                        onClick={() => { setActiveTab('models'); setOpenDropdown(null); }}
                                        style={activeTab === 'models' ? { ...styles.dropdownItem, ...styles.dropdownItemActive } : styles.dropdownItem}
                                    >
                                        <FiCpu /> Gerätemodelle
                                    </button>
                                )}
                                {availableTabs.includes('rooms') && (
                                    <button
                                        onClick={() => { setActiveTab('rooms'); setOpenDropdown(null); }}
                                        style={activeTab === 'rooms' ? { ...styles.dropdownItem, ...styles.dropdownItemActive } : styles.dropdownItem}
                                    >
                                        <FiMapPin /> Räume
                                    </button>
                                )}
                                {availableTabs.includes('qr-codes') && (
                                    <button
                                        onClick={() => { setActiveTab('qr-codes'); setOpenDropdown(null); }}
                                        style={activeTab === 'qr-codes' ? { ...styles.dropdownItem, ...styles.dropdownItemActive } : styles.dropdownItem}
                                    >
                                        <FiBox /> QR-Codes
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* System Group - Direct Link or Dropdown if more items added later */}
                {(availableTabs.includes('logs')) && (
                    <button
                        onClick={() => { setActiveTab('logs'); setOpenDropdown(null); }}
                        style={activeTab === 'logs' ? { ...styles.navButton, ...styles.navButtonActive } : styles.navButton}
                    >
                        <FiList /> System Logs
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="card mt-lg" style={activeTab === 'overview' ? { background: 'transparent', boxShadow: 'none', border: 'none' } : {}}>
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div>
                        {/* Status Banner - "Gut gemacht!" logic relocated here */}
                        {stats && (
                            <div className="mb-xl">
                                {(stats.recent_errors.length > 0 || stats.upcoming_returns.length > 0) ? (
                                    <div style={{
                                        background: 'hsla(38, 92%, 50%, 0.1)',
                                        border: '1px solid hsla(38, 92%, 50%, 0.3)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: 'var(--space-lg)',
                                        marginBottom: 'var(--space-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-md)'
                                    }}>
                                        <FiActivity color="hsl(38, 92%, 50%)" />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                            Es gibt {stats.recent_errors.length} offene Fehlermeldungen und {stats.upcoming_returns.length} anstehende Rückgaben.
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '30px',
                                        background: 'var(--color-bg-light)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px dashed var(--color-success)',
                                        marginBottom: 'var(--space-xl)'
                                    }}>
                                        <FiCheck size={32} color="var(--color-success)" style={{ marginBottom: '8px' }} />
                                        <h3 style={{ color: 'var(--color-success)', margin: 0 }}>Gut gemacht!</h3>
                                        <p className="text-muted text-small" style={{ margin: 0 }}>Du hast keine offenen Angelegenheiten.</p>
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
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
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
                                        <tr key={user.id}>
                                            <td style={{ fontWeight: 600 }}>{user.username}</td>
                                            <td>{user.first_name} {user.last_name || '-'}</td>
                                            <td className="text-muted">{user.email}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {(user.roles || []).map(role => (
                                                        <span key={role} className={getRoleBadgeClass(role)} style={{ fontSize: '10px', padding: '2px 6px' }}>
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
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    <button onClick={() => openEditUserModal(user)} className="btn btn-sm btn-secondary" title="Bearbeiten">
                                                        <FiEdit2 />
                                                    </button>
                                                    <button onClick={() => openUserPermissionsModal(user)} className="btn btn-sm btn-secondary" title="Rechte verwalten">
                                                        <FiShield />
                                                    </button>
                                                    <button onClick={() => openResetModal(user.id)} className="btn btn-sm btn-secondary" title="Passwort zurücksetzen">
                                                        <FiKey />
                                                    </button>
                                                    <button onClick={() => toggleUserActive(user)} className={`btn btn-sm ${user.is_active ? 'btn-warning' : 'btn-success'}`} title={user.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                                                        {user.is_active ? <FiUserX /> : <FiUserCheck />}
                                                    </button>
                                                    <button onClick={() => deleteUser(user)} className="btn btn-sm btn-danger" title="Löschen">
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan="6" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Keine Benutzer vorhanden</td></tr>
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
                            <div style={{ overflowX: 'auto' }}>
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
                                            <tr key={model.id}>
                                                <td style={{ fontWeight: 600 }}>{model.model_name}</td>
                                                <td><span className="badge badge-info">{model.type}</span></td>
                                                <td>{model.manufacturer}</td>
                                                <td className="text-muted text-small">{model.description || '-'}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button onClick={() => deleteModel(model.id)} className="btn btn-sm btn-danger" title="Löschen">
                                                        <FiTrash2 />
                                                    </button>
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
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Gebäude</th>
                                            <th>Etage</th>
                                            <th>Kapazität</th>
                                            <th style={{ textAlign: 'right' }}>Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map(room => (
                                            <tr key={room.id}>
                                                <td style={{ fontWeight: 600 }}>{room.name}</td>
                                                <td>{room.building || '-'}</td>
                                                <td>{room.floor || '-'}</td>
                                                <td>{room.capacity ? `${room.capacity} Personen` : '-'}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button onClick={() => deleteRoom(room.id)} className="btn btn-sm btn-danger" title="Löschen">
                                                        <FiTrash2 />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {rooms.length === 0 && (
                                            <tr><td colSpan="5" className="text-center text-muted" style={{ padding: 'var(--space-xl)' }}>Noch keine Räume angelegt</td></tr>
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
                        <div style={{ overflowX: 'auto' }}>
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
                                        <tr key={role.id}>
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
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => openEditRoleModal(role)} className="btn btn-sm btn-secondary" title="Bearbeiten">
                                                        <FiEdit2 />
                                                    </button>
                                                    {!role.is_system ? (
                                                        <button onClick={() => deleteRole(role.id)} className="btn btn-sm btn-danger" title="Löschen">
                                                            <FiTrash2 />
                                                        </button>
                                                    ) : (
                                                        <button disabled className="btn btn-sm btn-secondary" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="System-Rollen können nicht gelöscht werden">
                                                            <FiLock />
                                                        </button>
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
                            <div className="card-body" style={{ overflowX: 'auto' }}>
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
                {
                    activeTab === 'qr-codes' && (
                        <div>
                            <div className="card-header">
                                <h2 className="card-title">QR-Codes Exportieren</h2>
                            </div>
                            <div className="card-body">
                                <p className="mb-lg">Lade hier alle QR-Codes für einen kompletten Container (inkl. aller Geräte darin) als PDF herunter. Die PDF ist so formatiert, dass du sie einfach ausdrucken und die Codes ausschneiden kannst.</p>

                                {loading && containers.length === 0 ? (
                                    <div className="loading">Lade Container...</div>
                                ) : (
                                    <div className="grid grid-3 grid-mobile-1">
                                        {containers.map(container => (
                                            <div key={container.id} className="card p-lg" style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                border: '1px solid var(--color-border)',
                                                transition: 'transform 0.2s, box-shadow 0.2s'
                                            }}>
                                                <div>
                                                    <h3 className="mb-xs" style={{ color: 'var(--color-primary-light)' }}>{container.name}</h3>
                                                    <div className="flex items-center gap-xs mb-md">
                                                        <span className="badge badge-secondary">{container.type}</span>
                                                        <span className="text-small text-muted">{container.asset_count || 0} Geräte</span>
                                                    </div>
                                                    <p className="text-small text-muted mb-lg">
                                                        {container.location || 'Kein Standort angegeben'}
                                                    </p>
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', gap: '8px' }}
                                                    onClick={() => {
                                                        const url = `/api/admin/export/qr-pdf/${container.id}?token=${localStorage.getItem('token')}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    <FiActivity size={18} /> PDF Herunterladen
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!loading && containers.length === 0 && (
                                    <div className="text-center p-2xl">
                                        <FiBox size={48} className="text-muted mb-md" style={{ display: 'block', margin: '0 auto' }} />
                                        <p className="text-muted">Keine Container zur Auswahl gefunden.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                {/* PERMISSIONS TAB (New) */}
                {
                    activeTab === 'permissions' && (
                        <div>
                            <div className="card-header">
                                <h2 className="card-title">Verfügbare Berechtigungen</h2>
                            </div>
                            <div className="card-body">
                                <p className="mb-lg">Dies ist eine Übersicht aller im System verfügbaren Berechtigungen und welche Rollen diese aktuell besitzen.</p>
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
                                <label className="form-label">E-Mail *</label>
                                <input type="email" className="form-input" value={userForm.email}
                                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
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
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    autoFocus
                                />
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

const styles = {
    tabs: {
        display: 'none', // Hide old tabs
    },
    adminNav: {
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '10px',
        flexWrap: 'wrap',
        position: 'relative' // For dropdown positioning if needed context
    },
    navGroup: {
        position: 'relative',
        display: 'inline-block'
    },
    navButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        transition: 'background var(--transition-fast)'
    },
    navButtonActive: {
        color: 'var(--color-primary)',
        background: 'var(--color-bg-light)'
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        minWidth: '200px',
        background: 'var(--color-bg-medium)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '6px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    dropdownItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--color-text-primary)',
        transition: 'all var(--transition-fast)',
        width: '100%',
        fontSize: '14px',
        borderRadius: 'var(--radius-sm)'
    },
    dropdownItemActive: {
        background: 'var(--color-bg-light)',
        color: 'var(--color-primary)'
    }
};

export default Admin;
