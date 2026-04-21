import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FiUsers, FiShield, FiPlus, FiCpu, FiMapPin, FiActivity, FiCheck
} from 'react-icons/fi';
import { adminAPI, dashboardAPI } from '../../services/api';
import { getUser, hasRole, hasPermission } from '../../utils/auth';

const AdminOverview = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, modelsRes, roomsRes, statsRes] = await Promise.all([
                adminAPI.getUsers(),
                adminAPI.getRoles(),
                adminAPI.getDeviceModels(),
                adminAPI.getRooms(),
                dashboardAPI.getStats() // Assuming this exists based on original code
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            setDeviceModels(modelsRes.data);
            setRooms(roomsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Error loading admin overview data:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="card-header">
                <h2 className="card-title">Admin Übersicht</h2>
            </div>

            {/* Handlungsbedarf / Status */}
            {stats && (
                <div className="mb-xl">
                    {(stats.recent_errors?.length > 0 || stats.upcoming_returns?.length > 0) ? (
                        <div className="status-alert warning">
                            <FiActivity size={24} />
                            <div>
                                <div style={{ fontWeight: 700 }}>Handlungsbedarf</div>
                                <div className="text-small">
                                    {stats.recent_errors?.length || 0} offene Fehler • {stats.upcoming_returns?.length || 0} anstehende Rückgaben
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="status-alert success">
                            <FiCheck size={24} />
                            <div>
                                <div style={{ fontWeight: 700 }}>Alles im Griff</div>
                                <div className="text-small">Bisher keine kritischen Aufgaben für heute.</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-4 grid-mobile-2 mb-xl">
                <div className="stat-card">
                    <div className="stat-value">{users.length}</div>
                    <div className="stat-label">Benutzer</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{deviceModels.length}</div>
                    <div className="stat-label">Modelle</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{rooms.length}</div>
                    <div className="stat-label">Räume</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{roles.length}</div>
                    <div className="stat-label">Rollen</div>
                </div>
            </div>

            <div className="grid grid-2 grid-mobile-1">
                {/* Schnellzugriff */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Navigation</h3></div>
                    <div className="card-body">
                        <div className="quick-links">
                            <Link to="/admin/users" className="btn btn-outline btn-block" style={{justifyContent:'start'}}><FiUsers /> Benutzerverwaltung</Link>
                            <Link to="/admin/roles" className="btn btn-outline btn-block" style={{justifyContent:'start'}}><FiShield /> Rollen & Rechte</Link>
                            <Link to="/admin/models" className="btn btn-outline btn-block" style={{justifyContent:'start'}}><FiCpu /> Gerätemodelle</Link>
                            <Link to="/admin/rooms" className="btn btn-outline btn-block" style={{justifyContent:'start'}}><FiMapPin /> Räume & Standorte</Link>
                        </div>
                    </div>
                </div>

                {/* Rollenverteilung Chart-ish */}
                <div className="card">
                    <div className="card-header"><h3 className="card-title">Benutzer-Struktur</h3></div>
                    <div className="card-body">
                        {roles.map(role => {
                            const count = users.filter(u => u.roles?.includes(role.name)).length;
                            const percent = users.length > 0 ? (count / users.length) * 100 : 0;
                            return (
                                <div key={role.id} className="mb-md">
                                    <div className="flex justify-between text-xs mb-xs">
                                        <span>{role.name}</span>
                                        <span className="text-muted">{count} User</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                .status-alert {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    border-radius: var(--radius-md);
                    border: 1px solid transparent;
                }
                .status-alert.warning {
                    background: #fff9db;
                    border-color: #ffe066;
                    color: #856404;
                }
                .status-alert.success {
                    background: #ebfbee;
                    border-color: #b2f2bb;
                    color: #2b8a3e;
                }
                .progress-bar {
                    height: 8px;
                    background: var(--color-bg-dark);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--color-primary);
                }
                .quick-links {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .btn-block {
                    width: 100%;
                }
            `}</style>
        </div>
    );
};

export default AdminOverview;
