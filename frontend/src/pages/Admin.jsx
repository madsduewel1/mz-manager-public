import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    FiSettings, FiUsers, FiShield, FiPlus, FiTrash2, FiEdit2, FiKey,
    FiUserCheck, FiUserX, FiGrid, FiList, FiCpu, FiMapPin, FiBox,
    FiLock, FiActivity, FiMoreVertical, FiChevronDown, FiCheck,
    FiDownload, FiCopy, FiRefreshCcw, FiImage, FiArrowLeft
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { authAPI, dashboardAPI, adminAPI, containersAPI } from '../services/api';
import Modal from '../components/Modal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import BulkImportModal from '../components/BulkImportModal';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useSettings } from '../contexts/SettingsContext';
import { getUser, hasRole, hasPermission } from '../utils/auth';

const Admin = ({ defaultTab }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(defaultTab || 'overview');

    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        } else {
            setActiveTab('overview');
        }
    }, [defaultTab]);
    const [users, setUsers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [logs, setLogs] = useState([]);
    const [roles, setRoles] = useState([]);
    const [containers, setContainers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [stats, setStats] = useState(null);
    const { settings, updateSettingsState, refreshSettings } = useSettings();
    const [settingsForm, setSettingsForm] = useState({ org_name: '', base_url: '', module_network_enabled: 'false', module_accessories_enabled: 'false' });
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
    const [showUserDetailModal, setShowUserDetailModal] = useState(false);
    const [selectedDetailUser, setSelectedDetailUser] = useState(null);
    const [newlyCreatedPasswords, setNewlyCreatedPasswords] = useState({}); // { username: password }
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importType, setImportType] = useState('assets');
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();
    const user = getUser();


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
            refreshSettings();
        }
    }, [activeTab]);

    // Sync form with settings context when tab changes or settings are loaded
    useEffect(() => {
        if (activeTab === 'settings') {
            setSettingsForm({
                org_name: settings.org_name || '',
                base_url: settings.base_url || '',
                module_network_enabled: settings.module_network_enabled || 'false',
                module_accessories_enabled: settings.module_accessories_enabled || 'false'
            });
        }
    }, [activeTab, settings]);

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
        await refreshSettings();
    };

    const handleSettingsSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            await adminAPI.updateSettings(settingsForm);
            updateSettingsState(settingsForm);
            success('Einstellungen gespeichert');
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern der Einstellungen');
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
            await refreshSettings();
            success('Logo hochgeladen');
        } catch (err) {
            error('Fehler beim Logo-Upload');
        }
    };

    const handleDeleteLogo = async () => {
        const confirmed = await confirm({
            title: 'Logo löschen',
            message: 'Möchten Sie das Logo der Organisation wirklich entfernen?',
            confirmLabel: 'Löschen',
            confirmColor: 'var(--color-error)'
        });

        if (!confirmed) return;

        try {
            await adminAPI.deleteLogo();
            await refreshSettings();
            success('Logo entfernt');
        } catch (err) {
            error('Fehler beim Löschen des Logos');
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
                setShowModal(false);
                loadUsers();
            } else {
                const tempPassword = userForm.password;
                const tempUserData = { ...userForm };
                await adminAPI.createUser(userForm);
                success('Benutzer erfolgreich erstellt');

                const isConfirmed = await confirm({
                    title: 'Benutzer erstellt',
                    message: `Der Benutzer "${tempUserData.username}" wurde angelegt. Möchten Sie jetzt das Info-Blatt (PDF) mit den Anmeldedaten herunterladen?`,
                    confirmText: 'PDF herunterladen',
                    cancelText: 'Später',
                    type: 'info'
                });

                if (isConfirmed) {
                    generateUserPDF(tempUserData, tempPassword);
                }

                // Store password for later PDF downloads in this session
                setNewlyCreatedPasswords(prev => ({ ...prev, [tempUserData.username]: tempPassword }));

                setShowModal(false);
                loadUsers();
            }
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

    const generateUserPDF = async (user, initialPassword = null) => {
        const doc = new jsPDF();
        const orgName = settings.org_name || 'MZ-Manager';
        const loginUrl = settings.base_url || window.location.origin;
        const pwd = initialPassword || newlyCreatedPasswords[user.username] || user.initial_password;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(orgName, 20, 30);

        doc.setFontSize(16);
        doc.setTextColor(100, 100, 100);
        doc.text('Ihre Zugangsdaten', 20, 40);

        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);

        // User Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Benutzerinformationen:', 20, 60);

        doc.setFont('helvetica', 'normal');
        let yPos = 70;
        doc.text(`Name: ${user.first_name || ''} ${user.last_name || ''}`, 20, yPos);
        yPos += 10;
        doc.text(`Benutzername: ${user.username}`, 20, yPos);
        yPos += 10;
        if (user.email) {
            doc.text(`E-Mail: ${user.email}`, 20, yPos);
            yPos += 10;
        }

        // Login Credentials
        doc.setFont('helvetica', 'bold');
        doc.text('Anmeldedaten:', 20, yPos + 10);
        doc.setFont('helvetica', 'normal');
        yPos += 20;

        doc.text(`URL: ${loginUrl}`, 20, yPos);
        yPos += 10;
        if (pwd) {
            doc.text(`Passwort: ${pwd}`, 20, yPos);
            yPos += 10;
            doc.setFontSize(10);
            doc.setTextColor(200, 0, 0);
            doc.text('(Bitte ändern Sie dieses Passwort nach der ersten Anmeldung!)', 20, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            yPos += 10;
        } else {
            doc.text('Passwort: (Wie mit Administrator vereinbart)', 20, yPos);
            yPos += 10;
        }

        // Instructions
        doc.setFont('helvetica', 'bold');
        doc.text('Anleitung:', 20, yPos + 10);
        doc.setFont('helvetica', 'normal');
        yPos += 20;
        doc.setFontSize(11);
        const instructions = [
            '1. Öffnen Sie den Browser und rufen Sie die oben genannte URL auf.',
            '2. Geben Sie Ihren Benutzernamen und das Passwort ein.',
            '3. Falls Sie dazu aufgefordert werden, ändern Sie Ihr Passwort.',
            '4. Scannen Sie den QR-Code unten, um direkt zur Login-Seite zu gelangen.'
        ];
        instructions.forEach(line => {
            doc.text(line, 20, yPos);
            yPos += 7;
        });

        // QR Code
        try {
            const qrDataUrl = await QRCode.toDataURL(loginUrl, { width: 100, margin: 2 });
            doc.addImage(qrDataUrl, 'PNG', 75, yPos + 10, 60, 60);
        } catch (err) {
            console.error('QR Code error:', err);
        }

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generiert am ${new Date().toLocaleString('de-DE')} von ${getUser()?.username}`, 20, 280);

        doc.save(`Zugangsdaten_${user.username}.pdf`);
        success('PDF wurde generiert.');
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
                await adminAPI.removeUserPermission(permUser.id, perm);
                success('Berechtigung entfernt');
            } else {
                await adminAPI.addUserPermission(permUser.id, perm);
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
        if (user.username === 'admin') {
            error('Der Hauptadministrator kann nicht deaktiviert werden');
            return;
        }
        try {
            await adminAPI.toggleUserActive(user.id);
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
                if (user.username === 'admin') return Promise.resolve();
                return adminAPI.toggleUserActive(id);
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
            console.error('Delete model error:', err);
            error(err.response?.data?.error || 'Fehler beim Löschen');
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
            console.error('Delete room error:', err);
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    // Available permissions for role creation and user assignment
    const availablePermissions = [
        // Geräte
        'assets.view', 'assets.create', 'assets.edit', 'assets.delete', 'assets.history',
        // Container
        'containers.view', 'containers.create', 'containers.edit', 'containers.delete',
        // Fehlermeldungen
        'errors.view', 'errors.create', 'errors.edit', 'errors.delete',
        // Ausleihe
        'lendings.view', 'lendings.create', 'lendings.return', 'lendings.delete',
        // Benutzer
        'users.view', 'users.create', 'users.edit', 'users.delete',
        // Rollen
        'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
        // Gerätemodelle
        'models.view', 'models.create', 'models.edit', 'models.delete',
        // Räume
        'rooms.view', 'rooms.create', 'rooms.edit', 'rooms.delete',
        // Sonstiges
        'qr.print', 'logs.view',
        // Netzwerk
        'network.view', 'network.edit', 'network.admin',
        // Zubehör (NEU)
        'accessories.manage'
    ];

    const permissionLabels = {
        // Geräte
        'assets.view': 'Geräte ansehen',
        'assets.create': 'Geräte hinzufügen',
        'assets.edit': 'Geräte bearbeiten',
        'assets.delete': 'Geräte löschen',
        'assets.history': 'Geräteverlauf einsehen',
        // Container
        'containers.view': 'Container ansehen',
        'containers.create': 'Container erstellen',
        'containers.edit': 'Container bearbeiten',
        'containers.delete': 'Container löschen',
        // Fehlermeldungen
        'errors.view': 'Fehlermeldungen ansehen',
        'errors.create': 'Fehlermeldungen melden',
        'errors.edit': 'Fehlermeldungen bearbeiten',
        'errors.delete': 'Fehlermeldungen löschen',
        // Ausleihe
        'lendings.view': 'Ausleihen ansehen',
        'lendings.create': 'Ausleihen erstellen',
        'lendings.return': 'Ausleihen zurücknehmen',
        'lendings.delete': 'Ausleihen löschen',
        // Benutzer
        'users.view': 'Benutzer ansehen',
        'users.create': 'Benutzer erstellen',
        'users.edit': 'Benutzer bearbeiten',
        'users.delete': 'Benutzer löschen',
        // Rollen
        'roles.view': 'Rollen ansehen',
        'roles.create': 'Rollen erstellen',
        'roles.edit': 'Rollen bearbeiten',
        'roles.delete': 'Rollen löschen',
        // Gerätemodelle
        'models.view': 'Gerätemodelle ansehen',
        'models.create': 'Gerätemodelle erstellen',
        'models.edit': 'Gerätemodelle bearbeiten',
        'models.delete': 'Gerätemodelle löschen',
        // Räume
        'rooms.view': 'Räume ansehen',
        'rooms.create': 'Räume erstellen',
        'rooms.edit': 'Räume bearbeiten',
        'rooms.delete': 'Räume löschen',
        // Sonstiges
        'qr.print': 'QR-Codes drucken',
        'logs.view': 'Systemlogs einsehen',
        // Netzwerk
        'network.view': 'Netzwerk ansehen',
        'network.edit': 'Netzwerk bearbeiten',
        'network.admin': 'Netzwerk verwalten (VLANs anlegen/löschen)',
        // Zubehör (NEU)
        'accessories.manage': 'Zubehör verwalten'
    };

    const permissionGroups = [
        {
            name: 'Geräte & Inventar',
            perms: ['assets.view', 'assets.create', 'assets.edit', 'assets.delete', 'assets.history']
        },
        {
            name: 'Gerätemodelle & Räume',
            perms: ['models.view', 'models.create', 'models.edit', 'models.delete', 'rooms.view', 'rooms.create', 'rooms.edit', 'rooms.delete']
        },
        {
            name: 'Container',
            perms: ['containers.view', 'containers.create', 'containers.edit', 'containers.delete']
        },
        {
            name: 'Ausleihe',
            perms: ['lendings.view', 'lendings.create', 'lendings.return', 'lendings.delete']
        },
        {
            name: 'Fehlermeldungen',
            perms: ['errors.view', 'errors.create', 'errors.edit', 'errors.delete']
        },
        {
            name: 'Benutzer & Rollen',
            perms: ['users.view', 'users.create', 'users.edit', 'users.delete', 'roles.view', 'roles.create', 'roles.edit', 'roles.delete']
        },
        {
            name: 'Netzwerk',
            perms: ['network.view', 'network.edit', 'network.admin']
        },
        {
            name: 'Zubehör (NEU)',
            perms: ['accessories.manage']
        },
        {
            name: 'Sonstiges',
            perms: ['qr.print', 'logs.view']
        }
    ];


    const getRoleBadgeClass = (roleName) => {
        const lower = (roleName || '').toLowerCase();
        if (lower === 'administrator' || lower === 'admin') return 'badge-danger';
        if (lower === 'mediencoach') return 'badge-warning';
        if (lower === 'lehrer') return 'badge-info';
        if (lower === 'schüler' || lower === 'schueler') return 'badge-success';
        return 'badge-info';
    };

    const adminMenuItems = [
        { id: 'overview', label: 'Übersicht', icon: FiGrid },
        { id: 'users', label: 'Benutzer', icon: FiUsers, permission: 'users.view' },
        { id: 'roles', label: 'Rollen', icon: FiShield, permission: 'roles.view' },
        { id: 'permissions', label: 'Rechte', icon: FiLock, role: 'Administrator' },
        { id: 'models', label: 'Gerätemodelle', icon: FiCpu, permission: 'models.view' },
        { id: 'rooms', label: 'Räume', icon: FiMapPin, permission: 'rooms.view' },
        { id: 'qr-codes', label: 'QR-Codes', icon: FiBox, permission: 'qr.print' },
        { id: 'logs', label: 'System-Logs', icon: FiList, permission: 'logs.view' },
        { id: 'settings', label: 'Einstellungen', icon: FiSettings, role: 'Administrator' }
    ];

    return (
        <div className="admin-v2-layout">
            <aside className="admin-v2-sidebar">
                <div className="admin-v2-sidebar-header">
                    <Link to="/dashboard" className="admin-v2-back-link">
                        <FiArrowLeft size={16} />
                        <span>Dashboard</span>
                    </Link>
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '15px -20px 15px -20px', opacity: 0.5 }}></div>
                    <h3>Verwaltung</h3>
                </div>
                <nav className="admin-v2-nav">
                    {adminMenuItems.map(item => {
                        // Permission checks
                        if (item.permission && !hasPermission(item.permission)) return null;
                        if (item.role && !hasRole(item.role)) return null;

                        const Icon = item.icon;
                        const active = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                className={`admin-v2-nav-item ${active ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    navigate(item.id === 'overview' ? '/admin' : `/admin/${item.id}`);
                                }}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main className="admin-v2-content">
                <div className="admin-v2-card-wrap" style={activeTab === 'overview' ? { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 } : {}}>
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
                                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>{users.length}</div>
                                        <div className="stat-label">Benutzer</div>
                                    </div>
                                )}
                                {hasPermission('models.manage', 'assets.view') && (
                                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>{deviceModels.length}</div>
                                        <div className="stat-label">Modelle</div>
                                    </div>
                                )}
                                {hasPermission('rooms.manage', 'containers.manage') && (
                                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>{rooms.length}</div>
                                        <div className="stat-label">Räume</div>
                                    </div>
                                )}
                                {hasRole('Administrator') && (
                                    <div className="stat-card" style={{ borderLeft: '4px solid var(--color-text-tertiary)' }}>
                                        <div className="stat-value" style={{ color: 'var(--color-text-primary)' }}>{roles.length}</div>
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
                                                <td data-label="Benutzername" style={{ fontWeight: 600 }}>
                                                    <button
                                                        onClick={() => { setSelectedDetailUser(user); setShowUserDetailModal(true); }}
                                                        className="btn-link"
                                                        style={{
                                                            fontWeight: 600,
                                                            padding: 0,
                                                            border: 'none',
                                                            background: 'none',
                                                            color: user.username === 'admin' ? 'var(--color-primary)' : 'inherit'
                                                        }}
                                                    >
                                                        {user.username} {user.username === 'admin' && <span className="badge badge-admin" style={{ fontSize: '9px', marginLeft: '4px' }}>System</span>}
                                                    </button>
                                                </td>
                                                <td data-label="Name">{user.first_name} {user.last_name || '-'}</td>
                                                <td data-label="E-Mail" className="text-muted">{user.email}</td>
                                                <td data-label="Rollen">
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                        {(user.roles || []).map(role => (
                                                            <span key={role} className={`badge ${getRoleBadgeClass(role)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td data-label="Status">
                                                    {user.is_active
                                                        ? <span className="badge badge-success">Aktiv</span>
                                                        : <span className="badge badge-danger">Inaktiv</span>
                                                    }
                                                </td>
                                                <td data-label="Aktionen" style={{ textAlign: 'right' }}>
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
                                                                    disabled={user.username === 'admin'}
                                                                    style={user.username === 'admin' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                                    title={user.username === 'admin' ? "Der Administrator kann nicht deaktiviert werden" : ""}
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
                                                                    style={user.username === 'admin' ? { opacity: 0.5, cursor: 'not-allowed', color: 'var(--color-text-secondary)' } : { color: 'var(--color-error)' }}
                                                                    disabled={user.username === 'admin'}
                                                                    title={user.username === 'admin' ? "Der Administrator kann nicht gelöscht werden" : ""}
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
                                    <div className="flex gap-md">
                                        <button onClick={() => { setImportType('models'); setIsImportModalOpen(true); }} className="btn btn-secondary">
                                            Vorschau Import
                                        </button>
                                        <button onClick={openModelModal} className="btn btn-primary">
                                            <FiPlus /> Neues Modell
                                        </button>
                                    </div>
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
                                            {[...deviceModels].sort((a, b) => a.model_name.localeCompare(b.model_name, undefined, { numeric: true, sensitivity: 'base' })).map(model => (
                                                <tr key={model.id} className={activeActionMenu === model.id ? 'row-active-menu' : ''}>
                                                    <td data-label="Modellname" style={{ fontWeight: 600 }}>{model.model_name}</td>
                                                    <td data-label="Typ"><span className="badge badge-info">{model.type}</span></td>
                                                    <td data-label="Hersteller">{model.manufacturer}</td>
                                                    <td data-label="Beschreibung" className="text-muted text-small">{model.description || '-'}</td>
                                                    <td data-label="Aktionen" style={{ textAlign: 'right' }}>
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
                                    <div className="flex gap-md">
                                        <button onClick={() => { setImportType('rooms'); setIsImportModalOpen(true); }} className="btn btn-secondary">
                                            Vorschau Import
                                        </button>
                                        <button onClick={openRoomModal} className="btn btn-primary">
                                            <FiPlus /> Neuer Raum
                                        </button>
                                    </div>
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
                                            {[...rooms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(room => (
                                                <tr key={room.id} className={activeActionMenu === room.id ? 'row-active-menu' : ''}>
                                                    <td data-label="Name" style={{ fontWeight: 600 }}>{room.name}</td>
                                                    <td data-label="Gebäude">{room.building || '-'}</td>
                                                    <td data-label="Etage">{room.floor || '-'}</td>
                                                    <td data-label="Kapazität">{room.capacity ? `${room.capacity} Personen` : '-'}</td>
                                                    <td data-label="QR-Code">
                                                        <code style={{ fontSize: '11px', background: 'var(--color-bg-dark)', padding: '2px 4px', borderRadius: '4px' }}>
                                                            {room.qr_code}
                                                        </code>
                                                    </td>
                                                    <td data-label="Aktionen" style={{ textAlign: 'right' }}>
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
                                                <td data-label="Name" style={{ fontWeight: 600 }}>{role.name}</td>
                                                <td data-label="Typ">
                                                    {role.is_system
                                                        ? <span className="badge badge-info">System</span>
                                                        : <span className="badge badge-secondary" style={{ background: 'var(--color-bg-lighter)', color: 'var(--color-text-secondary)' }}>Custom</span>
                                                    }
                                                </td>
                                                <td data-label="Berechtigungen">
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
                                                <td data-label="Aktionen" style={{ textAlign: 'right' }}>
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
                                                    <td data-label="Zeitstempel" className="text-muted text-small">
                                                        {new Date(log.created_at).toLocaleString('de-DE')}
                                                    </td>
                                                    <td data-label="Aktion"><span className="badge badge-secondary">{log.action}</span></td>
                                                    <td data-label="Benutzer"><strong>{log.user}</strong></td>
                                                    <td data-label="Details">{log.details}</td>
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
                                                <td data-label="Container / Raum" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{container.name}</td>
                                                <td data-label="Typ">
                                                    <span className="badge badge-secondary">
                                                        {container.type === 'raum' ? 'Raum' : container.type}
                                                    </span>
                                                </td>
                                                <td data-label="Standort" className="text-muted">{container.location || '-'}</td>
                                                <td data-label="QR-ID">
                                                    <code style={{ fontSize: '10px' }}>{container.qr_code}</code>
                                                </td>
                                                <td data-label="Geräteanzahl">
                                                    <span style={{ fontWeight: 600 }}>{container.asset_count || 0}</span> Geräte
                                                </td>
                                                <td data-label="Aktionen" style={{ textAlign: 'right' }}>
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
                                                        <td data-label="Berechtigungskürzel"><code>{permKey}</code></td>
                                                        <td data-label="Beschreibung">{label}</td>
                                                        <td data-label="Zugewiesene Rollen">
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
                                <form onSubmit={handleSettingsSubmit} className="settings-form">
                                    <div className="form-group">
                                        <label className="form-label">Name der Organisation</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={settingsForm.org_name || ''}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, org_name: e.target.value })}
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
                                                {settings.logo_path && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        style={{ marginLeft: 'var(--space-sm)', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                                                        onClick={handleDeleteLogo}
                                                    >
                                                        Logo entfernen
                                                    </button>
                                                )}
                                                <p className="text-muted text-small mt-xs">Empfohlen: Quadratisch, PNG oder SVG.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group mt-xl">
                                        <label className="form-label">System-URL (Domain)</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            value={settingsForm.base_url || ''}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, base_url: e.target.value })}
                                            placeholder="https://deine-schule.de"
                                        />
                                        <p className="text-muted text-small mt-sm">
                                            Diese URL wird für QR-Codes und das Info-Blatt verwendet. Standard: Aktuelle Browser-URL.
                                        </p>
                                    </div>

                                    <div className="form-group" style={{ marginTop: 'var(--space-xl)' }}>
                                        <h4 style={{ marginBottom: 'var(--space-md)' }}>Zusätzliche Module</h4>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-md)',
                                            padding: 'var(--space-md)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            background: 'var(--color-bg-medium)',
                                            transition: 'var(--transition-fast)'
                                        }} className="hover-bg-light">
                                            <input
                                                type="checkbox"
                                                checked={settingsForm.module_network_enabled === 'true'}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, module_network_enabled: e.target.checked ? 'true' : 'false' })}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Modul "Netzwerk" aktivieren</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Aktiviert VLAN- und IP-Adressverwaltung</div>
                                            </div>
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-md)',
                                            padding: 'var(--space-md)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            background: 'var(--color-bg-medium)',
                                            transition: 'var(--transition-fast)'
                                        }} className="hover-bg-light">
                                            <input
                                                type="checkbox"
                                                checked={settingsForm.module_accessories_enabled === 'true'}
                                                onChange={(e) => setSettingsForm({ ...settingsForm, module_accessories_enabled: e.target.checked ? 'true' : 'false' })}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>Modul "Zubehör" aktivieren</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Aktiviert die Inventarisierung von Zubehörteilen</div>
                                            </div>
                                        </label>
                                    </div>

                                    <div style={{ marginTop: 'var(--space-xl)' }}>
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
            </main>

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
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="password" className="form-input" value={userForm.password}
                                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength="6" />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleGeneratePassword('userForm')}
                                            title="Passwort generieren"
                                        >
                                            <FiRefreshCcw />
                                        </button>
                                    </div>
                                    <p className="text-muted text-small mt-xs">Klicken Sie auf den Button, um ein sicheres Passwort zu generieren.</p>
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
                                <div className="permissions-groups">
                                    {permissionGroups.map(group => (
                                        <div key={group.name} className="permission-group-section" style={{ marginBottom: '20px', padding: '15px', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', margin: 0 }}>{group.name}</h3>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-xs"
                                                    onClick={() => {
                                                        const allIncluded = group.perms.every(p => roleForm.permissions.includes(p));
                                                        let newPerms = [...roleForm.permissions];
                                                        if (allIncluded) {
                                                            newPerms = newPerms.filter(p => !group.perms.includes(p));
                                                        } else {
                                                            group.perms.forEach(p => {
                                                                if (!newPerms.includes(p)) newPerms.push(p);
                                                            });
                                                        }
                                                        setRoleForm({ ...roleForm, permissions: newPerms });
                                                    }}
                                                >
                                                    {group.perms.every(p => roleForm.permissions.includes(p)) ? 'Alle abwählen' : 'Alle wählen'}
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {group.perms.map(perm => (
                                                    <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            id={`perm-${perm}`}
                                                            checked={roleForm.permissions.includes(perm)}
                                                            onChange={() => togglePermission(perm)}
                                                        />
                                                        <label htmlFor={`perm-${perm}`} style={{ fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {permissionLabels[perm] || perm}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Handle permissions that might not be in any group */}
                                    {availablePermissions.filter(p => !permissionGroups.some(g => g.perms.includes(p))).length > 0 && (
                                        <div className="permission-group-section" style={{ marginBottom: '20px', padding: '15px', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Sonstige</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {availablePermissions.filter(p => !permissionGroups.some(g => g.perms.includes(p))).map(perm => (
                                                    <div key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            id={`perm-${perm}`}
                                                            checked={roleForm.permissions.includes(perm)}
                                                            onChange={() => togglePermission(perm)}
                                                        />
                                                        <label htmlFor={`perm-${perm}`} style={{ fontSize: '13px', cursor: 'pointer' }}>
                                                            {permissionLabels[perm] || perm}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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

            {/* User Detail Modal */}
            {
                showUserDetailModal && selectedDetailUser && (
                    <Modal
                        isOpen={showUserDetailModal}
                        onClose={() => { setShowUserDetailModal(false); setSelectedDetailUser(null); }}
                        title={`Benutzerprofil: ${selectedDetailUser.username}`}
                        footer={
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <button
                                    onClick={() => generateUserPDF(selectedDetailUser)}
                                    className="btn btn-secondary"
                                    title="Zugangsdaten als PDF exportieren"
                                >
                                    <FiDownload /> PDF Info-Blatt
                                </button>
                                <button onClick={() => setShowUserDetailModal(false)} className="btn btn-primary">Schließen</button>
                            </div>
                        }
                    >
                        <div className="user-detail-view" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {/* Stammdaten */}
                            <div style={{ background: 'var(--color-bg-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-md) 0', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                    <FiUsers style={{ color: 'var(--color-primary)' }} /> Stammdaten
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Vollständiger Name</label>
                                        <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>{selectedDetailUser.first_name || '-'} {selectedDetailUser.last_name || ''}</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Benutzername</label>
                                        <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>{selectedDetailUser.username}</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>E-Mail</label>
                                        <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>{selectedDetailUser.email || <em style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Keine hinterlegt</em>}</span>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Erstellt am</label>
                                        <span style={{ fontSize: '15px', color: 'var(--color-text-primary)' }}>{new Date(selectedDetailUser.created_at).toLocaleDateString('de-DE')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Rollen & Berechtigungen */}
                            <div style={{ background: 'var(--color-bg-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-md) 0', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                    <FiShield style={{ color: 'var(--color-success)' }} /> Rollen & Berechtigungen
                                </h4>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Zugeordnete Rollen</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                            {selectedDetailUser.roles && selectedDetailUser.roles.map(role => (
                                                <span key={role} className={`badge ${getRoleBadgeClass(role)}`}>
                                                    {role}
                                                </span>
                                            ))}
                                            {(!selectedDetailUser.roles || selectedDetailUser.roles.length === 0) && <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Keine Rollen</span>}
                                        </div>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => { setShowUserDetailModal(false); openEditUserModal(selectedDetailUser); }}
                                        >
                                            <FiEdit2 /> Rollen bearbeiten
                                        </button>
                                    </div>

                                    <div style={{ height: '1px', background: 'var(--color-border)' }}></div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Zusätzliche Berechtigungen</label>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                            {selectedDetailUser.permissions && selectedDetailUser.permissions.map(perm => (
                                                <span key={perm} className="badge badge-outline" style={{ fontSize: '12px' }}>
                                                    {permissionLabels[perm] || perm}
                                                </span>
                                            ))}
                                            {(!selectedDetailUser.permissions || selectedDetailUser.permissions.length === 0) && <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Keine direkten Berechtigungen</span>}
                                        </div>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => { setShowUserDetailModal(false); openUserPermissionsModal(selectedDetailUser); }}
                                        >
                                            <FiLock /> Berechtigungen verwalten
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Sicherheit */}
                            <div style={{ background: 'var(--color-bg-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 var(--space-md) 0', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                    <FiKey style={{ color: 'var(--color-warning)' }} /> Sicherheit
                                </h4>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1, minWidth: '200px', display: 'flex', justifyContent: 'center' }}
                                        onClick={() => { setShowUserDetailModal(false); openResetModal(selectedDetailUser.id); }}
                                    >
                                        <FiKey /> Passwort zurücksetzen
                                    </button>
                                    <button
                                        className={`btn ${selectedDetailUser.is_active ? 'btn-danger' : 'btn-success'}`}
                                        style={{ flex: 1, minWidth: '200px', display: 'flex', justifyContent: 'center' }}
                                        onClick={() => { toggleUserActive(selectedDetailUser); setShowUserDetailModal(false); }}
                                    >
                                        {selectedDetailUser.is_active ? <FiUserX /> : <FiUserCheck />}
                                        {selectedDetailUser.is_active ? 'Konto deaktivieren' : 'Konto aktivieren'}
                                    </button>
                                </div>
                            </div>
                        </div>
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

            <BulkImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                type={importType} 
                onImportSuccess={() => {
                    if (importType === 'models') loadDeviceModels();
                    if (importType === 'rooms') loadRooms();
                }} 
            />
        </div>
    );
};

const styles = {
    settingsForm: { maxWidth: '600px' }
};

export default Admin;
