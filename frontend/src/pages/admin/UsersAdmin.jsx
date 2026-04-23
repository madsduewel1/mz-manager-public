import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiUsers, FiShield, FiPlus, FiTrash2, FiEdit2, FiKey,
    FiUserCheck, FiUserX, FiMoreVertical, FiRefreshCcw,
    FiDownload, FiLock
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { adminAPI, dashboardAPI } from '../../services/api';
import Modal from '../../components/Modal';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getUser, hasRole, hasPermission } from '../../utils/auth';
import { getRoleBadgeClass, permissionLabels, availablePermissions } from '../../utils/adminUtils';

const UsersAdmin = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showUserDetailModal, setShowUserDetailModal] = useState(false);
    const [selectedDetailUser, setSelectedDetailUser] = useState(null);
    const [newlyCreatedPasswords, setNewlyCreatedPasswords] = useState({});
    const [showUserPermModal, setShowUserPermModal] = useState(false);
    const [permUser, setPermUser] = useState(null);

    const [userForm, setUserForm] = useState({
        username: '', email: '', password: '', roles: [], first_name: '', last_name: ''
    });

    const { settings } = useSettings();
    const { success, error } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => {
        loadUsers();
        loadRoles();

        const handleClickOutside = () => setActiveActionMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getUsers();
            setUsers(response.data);
        } catch (err) {
            error('Fehler beim Laden der Benutzer');
        } finally {
            setLoading(false);
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

    const toggleActionMenu = (e, userId) => {
        if (e) e.stopPropagation();
        setActiveActionMenu(activeActionMenu === userId ? null : userId);
    };

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
            roles: user.roles || (user.role ? [user.role] : []),
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            password: ''
        });
        setShowModal(true);
    };

    const handleUserSubmit = async (e) => {
        if (e) e.preventDefault();
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
                    confirmLabel: 'PDF herunterladen',
                    cancelLabel: 'Später'
                });

                if (isConfirmed) {
                    generateUserPDF(tempUserData, tempPassword);
                }

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
        if (e) e.preventDefault();
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

    const handleGeneratePassword = (field) => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let pwd = "";
        for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        
        if (field === 'userForm') {
            setUserForm({ ...userForm, password: pwd });
        } else {
            setNewPassword(pwd);
        }
        navigator.clipboard.writeText(pwd);
        success('Passwort generiert und kopiert!');
    };

    const generateUserPDF = async (user, initialPassword = null) => {
        const doc = new jsPDF();
        const orgName = settings.org_name || 'MZ-Manager';
        const loginUrl = settings.base_url || window.location.origin;
        const pwd = initialPassword || newlyCreatedPasswords[user.username] || user.initial_password;

        doc.setFontSize(22);
        doc.text(orgName, 20, 30);
        doc.setFontSize(16);
        doc.text('Ihre Zugangsdaten', 20, 40);
        doc.line(20, 45, 190, 45);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Benutzerinformationen:', 20, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${user.first_name || ''} ${user.last_name || ''}`, 20, 70);
        doc.text(`Benutzername: ${user.username}`, 20, 80);
        if (user.email) doc.text(`E-Mail: ${user.email}`, 20, 90);

        doc.setFont('helvetica', 'bold');
        doc.text('Anmeldedaten:', 20, 110);
        doc.setFont('helvetica', 'normal');
        doc.text(`URL: ${loginUrl}`, 20, 120);
        doc.text(`Passwort: ${pwd || '(Wie vereinbart)'}`, 20, 130);

        try {
            const qrDataUrl = await QRCode.toDataURL(loginUrl, { width: 100, margin: 2 });
            doc.addImage(qrDataUrl, 'PNG', 75, 150, 60, 60);
        } catch (err) {}

        doc.save(`Zugangsdaten_${user.username}.pdf`);
    };

    const deleteUser = async (user) => {
        const isConfirmed = await confirm({
            title: 'Benutzer löschen',
            message: `Möchten Sie den Benutzer "${user.username}" wirklich löschen?`,
            confirmLabel: 'Löschen',
            confirmColor: 'var(--color-error)'
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
        if (user.username === 'admin') return error('Admin nicht deaktivierbar');
        try {
            await adminAPI.toggleUserActive(user.id);
            success('Status geändert');
            loadUsers();
        } catch (err) {
            error('Fehler beim Ändern des Status');
        }
    };

    const handleBulkDelete = async () => {
        const confirmed = await confirm({ title: 'Benutzer löschen', message: `${selectedUsers.length} Benutzer löschen?`, confirmLabel: 'Löschen', confirmColor: 'var(--color-error)' });
        if (!confirmed) return;
        try {
            await Promise.all(selectedUsers.map(id => adminAPI.deleteUser(id)));
            success('Ausgewählte Benutzer gelöscht');
            setSelectedUsers([]);
            loadUsers();
        } catch (err) {
            error('Fehler beim Löschen');
        }
    };

    const handleBulkToggleActive = async () => {
        try {
            await Promise.all(selectedUsers.map(id => {
                const u = users.find(x => x.id === id);
                return u?.username !== 'admin' ? adminAPI.toggleUserActive(id) : Promise.resolve();
            }));
            success('Status geändert');
            setSelectedUsers([]);
            loadUsers();
        } catch (err) {
            error('Fehler bei Massenbearbeitung');
        }
    };

    const openUserPermissionsModal = (user) => {
        setPermUser(user);
        setShowUserPermModal(true);
    };

    const toggleUserDirectPermission = async (perm) => {
        if (!permUser) return;
        const hasDirect = permUser.permissions?.includes(perm);
        try {
            if (hasDirect) await adminAPI.removeUserPermission(permUser.id, perm);
            else await adminAPI.addUserPermission(permUser.id, perm);
            success('Berechtigung geändert');
            loadUsers();
            const newPerms = hasDirect ? permUser.permissions.filter(p => p !== perm) : [...(permUser.permissions || []), perm];
            setPermUser({ ...permUser, permissions: newPerms });
        } catch (err) {
            error('Fehler');
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">Benutzerverwaltung</h2>
                <button onClick={openUserModal} className="btn btn-primary">
                    <FiPlus /> Neuer Benutzer
                </button>
            </div>

            {selectedUsers.length > 0 && (
                <div className="bulk-actions-bar">
                    <div className="bulk-actions-group">
                        <span style={{ fontWeight: 600 }}>{selectedUsers.length} ausgewählt</span>
                        <button onClick={handleBulkToggleActive} className="btn btn-sm btn-secondary"><FiUserCheck /> Status</button>
                        <button onClick={handleBulkDelete} className="btn btn-sm btn-danger"><FiTrash2 /> Löschen</button>
                    </div>
                    <button onClick={() => setSelectedUsers([])} className="btn btn-sm btn-outline">Aufheben</button>
                </div>
            )}

            <div className="table-responsive">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input type="checkbox" checked={selectedUsers.length === users.length && users.length > 0} 
                                    onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])} />
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
                        {users.map(u => (
                            <tr key={u.id} className={selectedUsers.includes(u.id) ? 'selected' : ''}>
                                <td>
                                    <input type="checkbox" checked={selectedUsers.includes(u.id)} 
                                        onChange={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} />
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                    <button onClick={() => { setSelectedDetailUser(u); setShowUserDetailModal(true); }} className="btn-link">
                                        {u.username} {u.username === 'admin' && <span className="badge badge-admin">System</span>}
                                    </button>
                                </td>
                                <td>{u.first_name} {u.last_name}</td>
                                <td className="text-muted">{u.email}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {(u.roles || []).map(r => <span key={r} className={`badge ${getRoleBadgeClass(r)}`}>{r}</span>)}
                                    </div>
                                </td>
                                <td>{u.is_active ? <span className="badge badge-success">Aktiv</span> : <span className="badge badge-danger">Inaktiv</span>}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="action-menu-container">
                                        <button className="action-menu-btn" onClick={(e) => toggleActionMenu(e, u.id)}><FiMoreVertical /></button>
                                        {activeActionMenu === u.id && (
                                            <div className="action-menu-dropdown">
                                                <button onClick={() => toggleUserActive(u)} className="dropdown-item" disabled={u.username === 'admin'}>
                                                    {u.is_active ? <FiUserX /> : <FiUserCheck />} {u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                                                </button>
                                                <button onClick={() => openResetModal(u.id)} className="dropdown-item"><FiKey /> Passwort</button>
                                                <button onClick={() => openEditUserModal(u)} className="dropdown-item"><FiEdit2 /> Bearbeiten</button>
                                                <button onClick={() => openUserPermissionsModal(u)} className="dropdown-item"><FiShield /> Rechte</button>
                                                <button onClick={() => deleteUser(u)} className="dropdown-item text-danger" disabled={u.username === 'admin'}><FiTrash2 /> Löschen</button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {showModal && (modalType === 'user' || modalType === 'user-edit') && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalType === 'user-edit' ? "Benutzer bearbeiten" : "Neuer Benutzer"}
                    footer={<><button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                    <button onClick={handleUserSubmit} className="btn btn-primary" disabled={submitting}>{submitting ? "..." : "Speichern"}</button></>}>
                    <form onSubmit={handleUserSubmit}>
                        <div className="form-group"><label className="form-label">Benutzername *</label><input type="text" className="form-input" value={userForm.username} onChange={(e) => setUserForm({...userForm, username: e.target.value})} required /></div>
                        <div className="form-group"><label className="form-label">E-Mail</label><input type="email" className="form-input" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} /></div>
                        {modalType === 'user' && <div className="form-group"><label className="form-label">Passwort *</label><div style={{display:'flex', gap:'8px'}}><input type="password" className="form-input" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} required minLength="6" /><button type="button" className="btn btn-secondary" onClick={() => handleGeneratePassword('userForm')}><FiRefreshCcw /></button></div></div>}
                        <div className="form-group"><label className="form-label">Vorname</label><input type="text" className="form-input" value={userForm.first_name} onChange={(e) => setUserForm({...userForm, first_name: e.target.value})} /></div>
                        <div className="form-group"><label className="form-label">Nachname</label><input type="text" className="form-input" value={userForm.last_name} onChange={(e) => setUserForm({...userForm, last_name: e.target.value})} /></div>
                        <div className="form-group"><label className="form-label">Rollen *</label><MultiSelectDropdown options={roles.map(r => ({ value: r.name, label: r.name }))} selected={userForm.roles} onChange={(rs) => setUserForm({...userForm, roles: rs})} label="-- Rollen wählen --" /></div>
                    </form>
                </Modal>
            )}

            {showModal && modalType === 'reset-password' && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Passwort zurücksetzen"
                    footer={<><button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button><button onClick={handlePasswordReset} className="btn btn-primary">Zurücksetzen</button></>}>
                    <div className="form-group"><label className="form-label">Neues Passwort *</label><div style={{display:'flex', gap:'8px'}}><input type="text" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="6" autoFocus /><button type="button" className="btn btn-secondary" onClick={() => handleGeneratePassword('newPassword')}><FiKey /></button></div></div>
                </Modal>
            )}

            {showUserDetailModal && selectedDetailUser && (
                <Modal isOpen={showUserDetailModal} onClose={() => setShowUserDetailModal(false)} title={`Benutzer: ${selectedDetailUser.username}`}
                    footer={<><button onClick={() => generateUserPDF(selectedDetailUser)} className="btn btn-secondary"><FiDownload /> PDF</button><button onClick={() => setShowUserDetailModal(false)} className="btn btn-primary">Schließen</button></>}>
                    <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        <div className="user-detail-card">
                            <h4>Stammdaten</h4>
                            <p><strong>Name:</strong> {selectedDetailUser.first_name} {selectedDetailUser.last_name}</p>
                            <p><strong>Email:</strong> {selectedDetailUser.email || '-'}</p>
                            <p><strong>Rollen:</strong> {selectedDetailUser.roles?.join(', ')}</p>
                        </div>
                    </div>
                </Modal>
            )}

            {showUserPermModal && permUser && (
                <Modal isOpen={showUserPermModal} onClose={() => setShowUserPermModal(false)} title={`Rechte für ${permUser.username}`}
                    footer={<button onClick={() => setShowUserPermModal(false)} className="btn btn-primary">Schließen</button>}>
                    <div className="grid grid-2">
                        {availablePermissions.map(p => {
                            const hasViaRole = (permUser.roles || []).includes('Administrator') || roles.filter(r => permUser.roles?.includes(r.name)).some(r => r.permissions?.includes(p));
                            const hasDirect = permUser.permissions?.includes(p);
                            return (
                                <div key={p} style={{display:'flex', gap:'8px', opacity: hasViaRole ? 0.6 : 1}}>
                                    <input type="checkbox" checked={hasViaRole || hasDirect} disabled={hasViaRole} onChange={() => toggleUserDirectPermission(p)} />
                                    <label style={{fontSize:'13px'}}>{permissionLabels[p] || p} {hasViaRole && '(Rolle)'}</label>
                                </div>
                            );
                        })}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default UsersAdmin;
