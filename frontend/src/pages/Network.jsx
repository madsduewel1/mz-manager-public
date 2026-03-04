import { useState, useEffect } from 'react';
import {
    FiRepeat, FiPlus, FiTrash2, FiEdit2, FiSearch,
    FiFilter, FiDownload, FiCheck, FiX, FiAlertCircle,
    FiServer, FiMonitor, FiPrinter, FiCpu, FiExternalLink
} from 'react-icons/fi';
import { networkAPI } from '../services/api';
import { hasPermission, hasAdminPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import Modal from '../components/Modal';

function Network() {
    const [devices, setDevices] = useState([]);
    const [vlans, setVlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'vlan'
    const [searchTerm, setSearchTerm] = useState('');
    const [vlanFilter, setVlanFilter] = useState('all');

    // Modals
    const [showVlanModal, setShowVlanModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingVlan, setEditingVlan] = useState(null);
    const [assigningDevice, setAssigningDevice] = useState(null);

    // Form States
    const [vlanForm, setVlanForm] = useState({ vlan_id: '', name: '', subnet: '', description: '' });
    const [assignForm, setAssignForm] = useState({
        network_vlan_id: '',
        ip_address: '',
        mac_address: '',
        dhcp_enabled: false,
        switch_name: '',
        port_number: '',
        network_role: 'Client'
    });

    const { success, error: notifyError } = useNotification();
    const { confirm } = useConfirmation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [devRes, vlanRes] = await Promise.all([
                networkAPI.getDevices(),
                networkAPI.getVlans()
            ]);
            setDevices(devRes.data);
            setVlans(vlanRes.data);
        } catch (err) {
            notifyError(err.response?.data?.error || 'Fehler beim Laden der Netzwerkdaten');
        } finally {
            setLoading(false);
        }
    };

    const handleVlanSubmit = async (e) => {
        e.preventDefault();
        try {
            await networkAPI.saveVlan(vlanForm);
            success(vlanForm.id ? 'VLAN aktualisiert' : 'VLAN erstellt');
            setShowVlanModal(false);
            loadData();
        } catch (err) {
            notifyError(err.response?.data?.error || 'Fehler beim Speichern des VLANs');
        }
    };

    const handleDeleteVlan = async (vlan) => {
        const confirmed = await confirm({
            title: 'VLAN löschen',
            message: `Möchten Sie das VLAN "${vlan.name}" (ID: ${vlan.vlan_id}) wirklich löschen? Zugeordneten Geräten wird das VLAN entzogen.`,
            confirmLabel: 'Löschen',
            confirmVariant: 'danger'
        });

        if (confirmed) {
            try {
                await networkAPI.deleteVlan(vlan.id);
                success('VLAN gelöscht');
                loadData();
            } catch (err) {
                notifyError(err.response?.data?.error || 'Fehler beim Löschen des VLANs');
            }
        }
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        try {
            await networkAPI.assignDevice({
                asset_id: assigningDevice.id,
                ...assignForm
            });
            success('Netzwerkkonfiguration gespeichert');
            setShowAssignModal(false);
            loadData();
        } catch (err) {
            notifyError(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    const openVlanModal = (vlan = null) => {
        if (vlan) {
            setVlanForm({ ...vlan });
            setEditingVlan(vlan);
        } else {
            setVlanForm({ vlan_id: '', name: '', subnet: '', description: '' });
            setEditingVlan(null);
        }
        setShowVlanModal(true);
    };

    const openAssignModal = (device) => {
        setAssigningDevice(device);
        setAssignForm({
            network_vlan_id: device.network_vlan_id || '',
            ip_address: device.ip_address || '',
            mac_address: device.mac_address || '',
            dhcp_enabled: !!device.dhcp_enabled,
            switch_name: device.switch_name || '',
            port_number: device.port_number || '',
            network_role: device.network_role || 'Client'
        });
        setShowAssignModal(true);
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Server': return <FiServer />;
            case 'Printer': return <FiPrinter />;
            case 'AP': return <FiCpu />;
            case 'Switch':
            case 'Router': return <FiRepeat />;
            default: return <FiMonitor />;
        }
    };

    const filteredDevices = devices.filter(d => {
        const matchesSearch =
            d.inventory_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.ip_address || '').includes(searchTerm) ||
            (d.mac_address || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesVlan = vlanFilter === 'all' ||
            (vlanFilter === 'none' && !d.vlan_id) ||
            d.vlan_id?.toString() === vlanFilter;

        return matchesSearch && matchesVlan;
    });

    const exportCSV = () => {
        const headers = ['Gerät', 'Inventarnummer', 'VLAN', 'Subnetz', 'IP-Adresse', 'MAC-Adresse', 'Modus', 'Standort', 'Rolle'];
        const rows = filteredDevices.map(d => [
            d.model || d.type,
            d.inventory_number,
            d.vlan_name || '-',
            d.vlan_subnet || '-',
            d.ip_address || '-',
            d.mac_address || '-',
            d.dhcp_enabled ? 'DHCP' : 'Statisch',
            d.location || '-',
            d.network_role
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `netzwerk_uebersicht_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    if (loading) return <div className="loading">Netzwerkdaten werden geladen...</div>;

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h1>Netzwerk-Verwaltung</h1>
                    <p className="text-muted">VLANs und IP-Adressen zentral verwalten</p>
                </div>
                <div className="flex gap-md">
                    <div className="btn-group">
                        <button
                            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('table')}
                        >
                            Listenansicht
                        </button>
                        <button
                            className={`btn btn-sm ${viewMode === 'vlan' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('vlan')}
                        >
                            VLAN-Gruppen
                        </button>
                    </div>
                    {hasAdminPermission() && (
                        <button className="btn btn-primary" onClick={() => openVlanModal()}>
                            <FiPlus /> VLAN erstellen
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="card mb-lg">
                <div className="flex gap-lg items-center">
                    <div className="search-wrapper flex-grow">
                        <FiSearch />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Suchen nach Inventarnummer, IP oder MAC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-md items-center">
                        <FiFilter className="text-muted" />
                        <select
                            className="form-select"
                            style={{ width: '200px' }}
                            value={vlanFilter}
                            onChange={(e) => setVlanFilter(e.target.value)}
                        >
                            <option value="all">Alle VLANs</option>
                            <option value="none">Kein VLAN</option>
                            {vlans.map(v => (
                                <option key={v.id} value={v.id}>{v.vlan_id} - {v.name}</option>
                            ))}
                        </select>
                        <button className="btn btn-secondary" title="Exportieren" onClick={exportCSV}>
                            <FiDownload />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'table' ? (
                <div className="card p-0 overflow-hidden">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Gerät</th>
                                <th>Inventarnummer</th>
                                <th>VLAN</th>
                                <th>IP-Adresse</th>
                                <th>MAC-Adresse</th>
                                <th>Anschluss</th>
                                <th>Rolle</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDevices.map(device => (
                                <tr key={device.id}>
                                    <td>
                                        <div className="flex items-center gap-sm">
                                            <span style={{ color: 'var(--color-primary)' }}>{getRoleIcon(device.network_role)}</span>
                                            <div>
                                                <div className="font-semibold">{device.model || device.type}</div>
                                                <div className="text-xs text-muted">{device.location}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><code>{device.inventory_number}</code></td>
                                    <td>
                                        {device.vlan_id ? (
                                            <span className="badge badge-outline">
                                                {device.vlan_id}: {device.vlan_name}
                                            </span>
                                        ) : (
                                            <span className="text-muted">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-mono">{device.ip_address || '-'}</span>
                                            {device.dhcp_enabled && <span className="text-xs text-info">DHCP</span>}
                                        </div>
                                    </td>
                                    <td><span className="font-mono text-small">{device.mac_address || '-'}</span></td>
                                    <td>
                                        {device.switch_name ? (
                                            <div className="text-xs">
                                                <div>{device.switch_name}</div>
                                                <div className="text-muted">Port {device.port_number}</div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td><span className="badge">{device.network_role}</span></td>
                                    <td>
                                        <button className="btn btn-ghost btn-icon" onClick={() => openAssignModal(device)}>
                                            <FiEdit2 />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="vlan-groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-xl)' }}>
                    {/* Unassigned Group */}
                    <div className="vlan-card card" style={{ borderTop: '4px solid var(--color-text-muted)' }}>
                        <div className="flex justify-between items-center mb-md">
                            <h3>Nicht zugewiesen</h3>
                            <span className="badge">{devices.filter(d => !d.vlan_id).length}</span>
                        </div>
                        <div className="vlan-device-list" style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {devices.filter(d => !d.vlan_id).slice(0, 10).map(device => (
                                <div key={device.id} className="device-mini-card p-sm bg-light border radius-md flex justify-between items-center">
                                    <div className="flex items-center gap-sm">
                                        {getRoleIcon(device.network_role)}
                                        <span className="text-small">{device.inventory_number}</span>
                                    </div>
                                    <button className="btn btn-ghost btn-xs" onClick={() => openAssignModal(device)}><FiEdit2 /></button>
                                </div>
                            ))}
                            {devices.filter(d => !d.vlan_id).length > 10 && <p className="text-center text-xs text-muted">... und weitere {devices.filter(d => !d.vlan_id).length - 10}</p>}
                        </div>
                    </div>

                    {/* VLAN Groups */}
                    {vlans.map(vlan => (
                        <div key={vlan.id} className="vlan-card card" style={{ borderTop: '4px solid var(--color-primary)' }}>
                            <div className="flex justify-between items-start mb-md">
                                <div>
                                    <h3 style={{ margin: 0 }}>VLAN {vlan.vlan_id}</h3>
                                    <p className="text-small text-muted">{vlan.name}</p>
                                    {vlan.subnet && <code className="text-xs">{vlan.subnet}</code>}
                                </div>
                                <div className="flex gap-xs">
                                    {hasAdminPermission() && (
                                        <>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openVlanModal(vlan)}><FiEdit2 /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeleteVlan(vlan)}><FiTrash2 /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="vlan-device-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {devices.filter(d => d.vlan_id === vlan.vlan_id).map(device => (
                                    <div key={device.id} className="device-mini-card p-sm bg-light border radius-md">
                                        <div className="flex justify-between items-center mb-xs">
                                            <div className="flex items-center gap-sm">
                                                {getRoleIcon(device.network_role)}
                                                <span className="font-semibold text-small">{device.inventory_number}</span>
                                            </div>
                                            <div className="font-mono text-xs">{device.ip_address}</div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-muted">{device.location}</span>
                                            <button className="btn btn-ghost btn-xs" onClick={() => openAssignModal(device)}><FiEdit2 /></button>
                                        </div>
                                    </div>
                                ))}
                                {devices.filter(d => d.vlan_id === vlan.vlan_id).length === 0 && (
                                    <p className="text-center py-md text-muted text-small italic">Keine Geräte</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* VLAN Modal */}
            <Modal
                isOpen={showVlanModal}
                onClose={() => setShowVlanModal(false)}
                title={editingVlan ? 'VLAN bearbeiten' : 'Neues VLAN erstellen'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowVlanModal(false)}>Abbrechen</button>
                        <button className="btn btn-primary" onClick={handleVlanSubmit}>Speichern</button>
                    </>
                }
            >
                <form onSubmit={handleVlanSubmit}>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">VLAN-ID *</label>
                            <input
                                type="number" className="form-input" required
                                value={vlanForm.vlan_id} onChange={e => setVlanForm({ ...vlanForm, vlan_id: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input
                                type="text" className="form-input" required
                                value={vlanForm.name} onChange={e => setVlanForm({ ...vlanForm, name: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subnetz (optional)</label>
                        <input
                            type="text" className="form-input" placeholder="z.B. 10.0.10.0/24"
                            value={vlanForm.subnet} onChange={e => setVlanForm({ ...vlanForm, subnet: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Beschreibung</label>
                        <textarea
                            className="form-textarea" rows="3"
                            value={vlanForm.description} onChange={e => setVlanForm({ ...vlanForm, description: e.target.value })}
                        ></textarea>
                    </div>
                </form>
            </Modal>

            {/* Assignment Modal */}
            <Modal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                title={`Netzwerk: ${assigningDevice?.inventory_number}`}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Abbrechen</button>
                        <button className="btn btn-primary" onClick={handleAssignSubmit}>Speichern</button>
                    </>
                }
            >
                <form onSubmit={handleAssignSubmit}>
                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">VLAN</label>
                            <select
                                className="form-select"
                                value={assignForm.network_vlan_id}
                                onChange={e => setAssignForm({ ...assignForm, network_vlan_id: e.target.value })}
                            >
                                <option value="">Kein VLAN</option>
                                {vlans.map(v => (
                                    <option key={v.id} value={v.id}>{v.vlan_id} - {v.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Netzwerkrolle</label>
                            <select
                                className="form-select"
                                value={assignForm.network_role}
                                onChange={e => setAssignForm({ ...assignForm, network_role: e.target.value })}
                            >
                                <option value="Client">Client</option>
                                <option value="Server">Server</option>
                                <option value="Printer">Drucker</option>
                                <option value="AP">Access Point</option>
                                <option value="Switch">Switch</option>
                                <option value="Router">Router</option>
                                <option value="Sonstiges">Sonstiges</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <div className="flex justify-between items-center mb-xs">
                                <label className="form-label" style={{ margin: 0 }}>IP-Adresse</label>
                                <label className="flex items-center gap-xs text-xs">
                                    <input
                                        type="checkbox"
                                        checked={assignForm.dhcp_enabled}
                                        onChange={e => setAssignForm({ ...assignForm, dhcp_enabled: e.target.checked })}
                                    /> DHCP
                                </label>
                            </div>
                            <input
                                type="text" className="form-input font-mono" placeholder="192.168.1.10"
                                disabled={assignForm.dhcp_enabled}
                                value={assignForm.ip_address} onChange={e => setAssignForm({ ...assignForm, ip_address: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">MAC-Adresse</label>
                            <input
                                type="text" className="form-input font-mono" placeholder="00:11:22:33:44:55"
                                value={assignForm.mac_address} onChange={e => setAssignForm({ ...assignForm, mac_address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Switch-Name</label>
                            <input
                                type="text" className="form-input" placeholder="SW-B-204-01"
                                value={assignForm.switch_name} onChange={e => setAssignForm({ ...assignForm, switch_name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Port</label>
                            <input
                                type="text" className="form-input" placeholder="Gi1/0/24"
                                value={assignForm.port_number} onChange={e => setAssignForm({ ...assignForm, port_number: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Network;
