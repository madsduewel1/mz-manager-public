import { useState, useEffect } from 'react';
import {
    FiShield, FiPlus, FiTrash2, FiEdit2, FiLock, FiMoreVertical
} from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import Modal from '../../components/Modal';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { permissionLabels, permissionGroups, availablePermissions } from '../../utils/adminUtils';

const RolesAdmin = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState({ name: '', permissions: [] });

    const { success, error } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => {
        loadRoles();
        const handleClickOutside = () => setActiveActionMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadRoles = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getRoles();
            setRoles(response.data);
        } catch (err) {
            error('Fehler beim Laden der Rollen');
        } finally {
            setLoading(false);
        }
    };

    const toggleActionMenu = (e, roleId) => {
        if (e) e.stopPropagation();
        setActiveActionMenu(activeActionMenu === roleId ? null : roleId);
    };

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
        setRoleForm(prev => {
            const perms = prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm];
            return { ...prev, permissions: perms };
        });
    };

    const handleRoleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            if (modalType === 'role-edit') {
                await adminAPI.updateRole(editingRole.id, roleForm);
                success('Rolle aktualisiert');
            } else {
                await adminAPI.createRole(roleForm);
                success('Rolle erstellt');
            }
            setShowModal(false);
            loadRoles();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Speichern');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteRole = async (id) => {
        const confirmed = await confirm({
            title: 'Rolle löschen',
            message: 'Möchten Sie diese Rolle wirklich löschen?',
            confirmLabel: 'Löschen',
            confirmColor: 'var(--color-error)'
        });
        if (!confirmed) return;
        try {
            await adminAPI.deleteRole(id);
            success('Rolle gelöscht');
            loadRoles();
        } catch (err) {
            error(err.response?.data?.error || 'Fehler beim Löschen');
        }
    };

    return (
        <div className="fade-in">
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
                            <tr key={role.id}>
                                <td style={{ fontWeight: 600 }}>{role.name}</td>
                                <td>
                                    {role.is_system 
                                        ? <span className="badge badge-info">System</span> 
                                        : <span className="badge badge-secondary">Eigene</span>}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {role.permissions?.includes('all') ? (
                                            <span className="badge badge-success">Alle Rechte</span>
                                        ) : (
                                            role.permissions?.map(p => (
                                                <span key={p} className="badge badge-outline" style={{ fontSize: '10px' }}>
                                                    {permissionLabels[p] || p}
                                                </span>
                                            ))
                                        )}
                                        {(!role.permissions || role.permissions.length === 0) && <span className="text-muted">-</span>}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="action-menu-container">
                                        <button className="action-menu-btn" onClick={(e) => toggleActionMenu(e, role.id)}><FiMoreVertical /></button>
                                        {activeActionMenu === role.id && (
                                            <div className="action-menu-dropdown">
                                                <button onClick={() => openEditRoleModal(role)} className="dropdown-item"><FiEdit2 /> Bearbeiten</button>
                                                {!role.is_system && (
                                                    <button onClick={() => deleteRole(role.id)} className="dropdown-item text-danger"><FiTrash2 /> Löschen</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (modalType === 'role' || modalType === 'role-edit') && (
                <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalType === 'role-edit' ? 'Rolle bearbeiten' : 'Neue Rolle'}
                    footer={<><button onClick={() => setShowModal(false)} className="btn btn-secondary">Abbrechen</button>
                    <button onClick={handleRoleSubmit} className="btn btn-primary" disabled={submitting}>Speichern</button></>}>
                    <form onSubmit={handleRoleSubmit}>
                        <div className="form-group"><label className="form-label">Name *</label><input type="text" className="form-input" value={roleForm.name} onChange={(e) => setRoleForm({...roleForm, name: e.target.value})} required /></div>
                        <div className="form-group">
                            <label className="form-label">Berechtigungen</label>
                            <div className="permissions-groups" style={{maxHeight:'400px', overflowY:'auto', paddingRight:'10px'}}>
                                {permissionGroups.map(group => (
                                    <div key={group.name} className="permission-group-section mb-md">
                                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                                            <h4 style={{fontSize:'14px', margin:0}}>{group.name}</h4>
                                            <button type="button" className="btn btn-ghost btn-xs" onClick={() => {
                                                const all = group.perms.every(p => roleForm.permissions.includes(p));
                                                let newPerms = all ? roleForm.permissions.filter(p => !group.perms.includes(p)) : [...new Set([...roleForm.permissions, ...group.perms])];
                                                setRoleForm({...roleForm, permissions: newPerms});
                                            }}>{group.perms.every(p => roleForm.permissions.includes(p)) ? 'Keine' : 'Alle'}</button>
                                        </div>
                                        <div className="grid grid-2">
                                            {group.perms.map(p => (
                                                <div key={p} style={{display:'flex', gap:'6px', alignItems:'center'}}>
                                                    <input type="checkbox" id={`role-p-${p}`} checked={roleForm.permissions.includes(p)} onChange={() => togglePermission(p)} />
                                                    <label htmlFor={`role-p-${p}`} style={{fontSize:'12px', cursor:'pointer'}}>{permissionLabels[p] || p}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default RolesAdmin;
