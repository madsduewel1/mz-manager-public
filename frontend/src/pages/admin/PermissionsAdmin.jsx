import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { getRoleBadgeClass, permissionLabels } from '../../utils/adminUtils';

const PermissionsAdmin = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getRoles();
            setRoles(response.data);
        } catch (err) {
            console.error('Error loading roles:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">Berechtigungs-Matrix</h2>
                <p className="text-muted text-small">Übersicht aller verfügbaren Berechtigungen und deren Zuweisung zu Rollen.</p>
            </div>
            <div className="table-responsive">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Kürzel</th>
                            <th>Beschreibung</th>
                            <th>Rollen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(permissionLabels).map(([key, label]) => {
                            const rolesWithPerm = roles.filter(r => 
                                r.permissions?.includes(key) || r.permissions?.includes('all')
                            );
                            return (
                                <tr key={key}>
                                    <td><code>{key}</code></td>
                                    <td>{label}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {rolesWithPerm.map(r => (
                                                <span key={r.id} className={`badge ${getRoleBadgeClass(r.name)}`} style={{fontSize:'10px'}}>
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
    );
};

export default PermissionsAdmin;
