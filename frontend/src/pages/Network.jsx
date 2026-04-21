import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiRepeat, FiPlus, FiTrash2, FiEdit2, FiSearch,
    FiFilter, FiDownload, FiAlertCircle, FiActivity,
    FiServer, FiMonitor, FiPrinter, FiCpu, FiX, FiWifi
} from 'react-icons/fi';
import { networkAPI } from '../services/api';
import { hasPermission, hasAdminPermission } from '../utils/auth';
import { useNotification } from '../contexts/NotificationContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import Modal from '../components/Modal';

/* ─── Helpers ─────────────────────────────────────────────── */
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
};

const formatMAC = (value) => {
    const raw = value.replace(/[^a-fA-F0-9]/g, '').slice(0, 12);
    return raw.match(/.{1,2}/g)?.join(':') || '';
};

const VLAN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];

function getRoleIcon(role) {
    switch (role) {
        case 'Server': return <FiServer />;
        case 'Printer': return <FiPrinter />;
        case 'AP': return <FiWifi />;
        case 'Switch':
        case 'Router': return <FiRepeat />;
        default: return <FiMonitor />;
    }
}

/* ─── Device Card (Mobile) ────────────────────────────────── */
function DeviceCard({ device, vlans, onEdit, navigate }) {
    const vlanColor = vlans.findIndex(v => v.id === device.network_vlan_id);
    const accentColor = vlanColor >= 0 ? VLAN_COLORS[vlanColor % VLAN_COLORS.length] : 'var(--color-border)';

    return (
        <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            borderLeft: `4px solid ${accentColor}`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ color: accentColor, fontSize: '20px' }}>{getRoleIcon(device.network_role)}</span>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{device.model || device.type}</div>
                        <code style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{device.inventory_number}</code>
                    </div>
                </div>
                <span className={`badge badge-${device.status?.toLowerCase() === 'ok' ? 'success' : 'warning'}`}>
                    {device.status}
                </span>
            </div>

            {/* Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '13px' }}>
                <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>VLAN</div>
                    {device.vlan_name
                        ? <span className="badge badge-outline">VLAN {device.vlan_id}: {device.vlan_name}</span>
                        : <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Nicht zugewiesen</span>
                    }
                </div>
                <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>IP-Adresse</div>
                    <code style={{ fontSize: '13px' }}>{device.ip_address || '-'}</code>
                    {device.dhcp_enabled && <span style={{ fontSize: '11px', color: 'var(--color-info)', marginLeft: '4px' }}>DHCP</span>}
                </div>
                <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>MAC</div>
                    <code style={{ fontSize: '12px' }}>{device.mac_address || '-'}</code>
                </div>
                <div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Standort</div>
                    <span>{device.location || '-'}</span>
                </div>
                {device.switch_name && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Switch / Port</div>
                        <span>{device.switch_name} / {device.port_number || '-'}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <button
                className="btn btn-secondary"
                style={{ width: '100%', minHeight: '44px', justifyContent: 'center', gap: '8px' }}
                onClick={() => onEdit(device)}
            >
                <FiEdit2 size={14} /> Konfiguration bearbeiten
            </button>
        </div>
    );
}

/* ─── Filter Modal (Mobile) ───────────────────────────────── */
function FilterModal({ isOpen, onClose, vlans, vlanFilter, setVlanFilter, searchTerm, setSearchTerm }) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
            <div style={{
                position: 'relative', background: 'var(--card-bg)',
                borderRadius: '16px 16px 0 0', padding: '20px',
                maxHeight: '80vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Filter</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><FiX /></button>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Suche</label>
                    <input
                        type="text"
                        className="form-input"
                        style={{ minHeight: '48px' }}
                        placeholder="Gerät, IP, MAC..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="form-label">VLAN</label>
                    <select
                        className="form-select"
                        style={{ minHeight: '48px' }}
                        value={vlanFilter}
                        onChange={e => setVlanFilter(e.target.value)}
                    >
                        <option value="all">Alle VLANs</option>
                        <option value="none">Kein VLAN</option>
                        {vlans.map(v => <option key={v.id} value={v.id}>{v.vlan_id} - {v.name}</option>)}
                    </select>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: '100%', minHeight: '48px', justifyContent: 'center' }}
                    onClick={onClose}
                >
                    Filter anwenden
                </button>
            </div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────── */
function Network() {
    const isMobile = useIsMobile();
    const [devices, setDevices] = useState([]);
    const [vlans, setVlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('network');
    const [searchTerm, setSearchTerm] = useState('');
    const [vlanFilter, setVlanFilter] = useState('all');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const { success, error: notifyError } = useNotification();
    const { confirm } = useConfirmation();
    const navigate = useNavigate();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [devRes, vlanRes] = await Promise.all([networkAPI.getDevices(), networkAPI.getVlans()]);
            setDevices(devRes.data);
            setVlans([...vlanRes.data].sort((a, b) => a.vlan_id - b.vlan_id));
        } catch (err) {
            notifyError(err.response?.data?.error || 'Fehler beim Laden der Netzwerkdaten');
        } finally {
            setLoading(false);
        }
    };

    const handleImportAssets = () => { loadData(); success('Assets wurden aktualisiert'); };

    const handleDeleteVlan = async (vlan) => {
        if (await confirm(`VLAN ${vlan.vlan_id} wirklich löschen?`)) {
            try {
                await networkAPI.deleteVlan(vlan.id);
                loadData();
                success('VLAN gelöscht');
            } catch (err) {
                notifyError(err.response?.data?.error || 'Fehler beim Löschen');
            }
        }
    };

    const filteredDevices = devices.filter(d => {
        const matchesSearch =
            d.inventory_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.ip_address || '').includes(searchTerm) ||
            (d.mac_address || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesVlan = vlanFilter === 'all' ||
            (vlanFilter === 'none' && !d.network_vlan_id) ||
            d.network_vlan_id?.toString() === vlanFilter;
        return matchesSearch && matchesVlan;
    }).sort((a, b) => {
        const vlanA = a.vlan_id ?? Infinity;
        const vlanB = b.vlan_id ?? Infinity;
        if (vlanA !== vlanB) return vlanA - vlanB;
        const ipToNum = (ip) => {
            if (!ip) return Infinity;
            const parts = ip.split('.');
            if (parts.length !== 4) return Infinity;
            return parts.reduce((acc, octet) => acc * 256 + (parseInt(octet, 10) || 0), 0);
        };
        const ipCmp = ipToNum(a.ip_address) - ipToNum(b.ip_address);
        if (ipCmp !== 0) return ipCmp;
        return a.inventory_number.localeCompare(b.inventory_number, 'de', { numeric: true, sensitivity: 'base' });
    });

    const renderDevicesWithGroups = () => {
        const rows = [];
        let lastVlanId = null;

        filteredDevices.forEach((device) => {
            const vlanId = device.vlan_id || 'none';
            const vlanLabel = device.vlan_id ? `VLAN ${device.vlan_id}${device.vlan_name ? ` - ${device.vlan_name}` : ''}` : 'Kein VLAN / Nicht zugewiesen';

            if (vlanId !== lastVlanId) {
                rows.push(
                    <tr key={`vlan-group-${vlanId}`} className="group-header" style={{ background: '#cbd5e1', borderBottom: '2px solid var(--color-border)' }}>
                        <td colSpan="8" style={{ padding: '10px 16px', fontWeight: 700, color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <FiActivity style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--color-primary)' }} />
                            {vlanLabel}
                        </td>
                    </tr>
                );
                lastVlanId = vlanId;
            }

            rows.push(
                <tr key={device.id}>
                    <td>
                        <div className="flex items-center gap-sm">
                            <span style={{ color: 'var(--color-primary)' }}>{getRoleIcon(device.network_role)}</span>
                            <div>
                                <div className="font-semibold">{device.model || device.type}</div>
                                <div className="text-xs text-muted">{device.network_role}</div>
                            </div>
                        </div>
                    </td>
                    <td><code>{device.inventory_number}</code></td>
                    <td>
                        {device.vlan_name
                            ? <span className="badge badge-outline">VLAN {device.vlan_id}: {device.vlan_name}</span>
                            : <span className="text-muted italic">Nicht zugewiesen</span>
                        }
                    </td>
                    <td>
                        <span className="font-mono">{device.ip_address || '-'}</span>
                        {device.dhcp_enabled && <span className="text-xs text-info" style={{ marginLeft: '4px' }}>DHCP</span>}
                    </td>
                    <td><span className="font-mono text-small">{device.mac_address || '-'}</span></td>
                    <td>
                        <div className="text-xs">
                            <div>{device.location || '-'}</div>
                            {device.switch_name && <div className="text-muted">{device.switch_name} / {device.port_number}</div>}
                        </div>
                    </td>
                    <td>
                        <span className={`badge badge-${device.status?.toLowerCase() === 'ok' ? 'success' : 'warning'}`}>
                            {device.status}
                        </span>
                    </td>
                    <td>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/network/devices/${device.id}/assign`)}>
                            <FiEdit2 />
                        </button>
                    </td>
                </tr>
            );
        });

        return rows;
    };

    const exportCSV = () => {
        const headers = ['Gerät', 'Inventarnummer', 'VLAN', 'Subnetz', 'IP-Adresse', 'MAC-Adresse', 'Modus', 'Standort', 'Rolle'];
        const rows = filteredDevices.map(d => [
            d.model || d.type, d.inventory_number, d.vlan_name || '-', d.vlan_subnet || '-',
            d.ip_address || '-', d.mac_address || '-', d.dhcp_enabled ? 'DHCP' : 'Statisch',
            d.location || '-', d.network_role
        ]);
        const csv = [headers, ...rows].map(e => e.join(';')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `netzwerk_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const activeFiltersCount = (vlanFilter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

    if (loading) return <div className="loading">Netzwerkdaten werden geladen...</div>;

    return (
        <div className="container">
            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '12px',
                marginBottom: '24px'
            }}>
                <div>
                    <h1 style={{ margin: 0 }}>Netzwerk-Verwaltung</h1>
                    {!isMobile && <p className="text-muted">VLAN-Hierarchie und IP-Zuweisung</p>}
                </div>

                {/* Tab switcher */}
                <div className="btn-group" style={{ display: 'flex' }}>
                    <button
                        className={`btn btn-sm ${activeTab === 'network' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, minHeight: '44px', justifyContent: 'center' }}
                        onClick={() => setActiveTab('network')}
                    >
                        Netzwerk
                    </button>
                    <button
                        className={`btn btn-sm ${activeTab === 'vlans' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, minHeight: '44px', justifyContent: 'center' }}
                        onClick={() => setActiveTab('vlans')}
                    >
                        VLANs
                    </button>
                </div>
            </div>

            {/* ── Network Tab ── */}
            {activeTab === 'network' && (
                <>
                    {/* Toolbar */}
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '16px',
                        flexWrap: 'wrap'
                    }}>
                        {isMobile ? (
                            /* Mobile: Filter button + refresh */
                            <>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: 1, minHeight: '44px', justifyContent: 'center', position: 'relative' }}
                                    onClick={() => setShowFilterModal(true)}
                                >
                                    <FiFilter />
                                    Filter
                                    {activeFiltersCount > 0 && (
                                        <span style={{
                                            position: 'absolute', top: '6px', right: '6px',
                                            background: 'var(--color-primary)', color: 'white',
                                            borderRadius: '50%', width: '18px', height: '18px',
                                            fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1, minHeight: '44px', justifyContent: 'center' }}
                                    onClick={handleImportAssets}
                                >
                                    <FiRepeat /> Aktualisieren
                                </button>
                            </>
                        ) : (
                            /* Desktop: Full filter bar */
                            <>
                                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                    <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: '36px' }}
                                        placeholder="Suchen nach Gerät, IP oder MAC..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="form-select"
                                    style={{ width: '200px' }}
                                    value={vlanFilter}
                                    onChange={e => setVlanFilter(e.target.value)}
                                >
                                    <option value="all">Alle VLANs</option>
                                    <option value="none">Kein VLAN</option>
                                    {vlans.map(v => <option key={v.id} value={v.id}>{v.vlan_id} - {v.name}</option>)}
                                </select>
                                <button className="btn btn-secondary" onClick={exportCSV}><FiDownload /> Export</button>
                                <button className="btn btn-primary" onClick={handleImportAssets}><FiRepeat /> Assets importieren</button>
                            </>
                        )}
                    </div>

                    {/* Active filter chips on mobile */}
                    {isMobile && activeFiltersCount > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {searchTerm && (
                                <span className="badge badge-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    "{searchTerm}"
                                    <FiX size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                                </span>
                            )}
                            {vlanFilter !== 'all' && (
                                <span className="badge badge-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    VLAN: {vlanFilter === 'none' ? 'Kein' : vlans.find(v => v.id.toString() === vlanFilter)?.name || vlanFilter}
                                    <FiX size={12} style={{ cursor: 'pointer' }} onClick={() => setVlanFilter('all')} />
                                </span>
                            )}
                        </div>
                    )}

                    {/* Content: Cards on mobile, Table on desktop */}
                    {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredDevices.map(device => (
                                <DeviceCard
                                    key={device.id}
                                    device={device}
                                    vlans={vlans}
                                    onEdit={() => navigate(`/network/devices/${device.id}/assign`)}
                                    navigate={navigate}
                                />
                            ))}
                            {filteredDevices.length === 0 && (
                                <div className="card text-center py-xl text-muted">
                                    <FiAlertCircle size={32} style={{ margin: '0 auto 8px' }} />
                                    <div>Keine Geräte gefunden</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card p-0 overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Gerät</th>
                                        <th>Inventarnummer</th>
                                        <th>VLAN</th>
                                        <th>IP-Adresse</th>
                                        <th>MAC-Adresse</th>
                                        <th>Standort / Port</th>
                                        <th>Status</th>
                                        <th>Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDevices.length > 0 ? (
                                        renderDevicesWithGroups()
                                    ) : (
                                        <tr><td colSpan="8" className="text-center py-xl text-muted">Keine Geräte gefunden</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ── VLANs Tab ── */}
            {activeTab === 'vlans' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0 }}>VLAN-Definitionen</h2>
                        {hasAdminPermission() && (
                            <button
                                className="btn btn-primary"
                                style={{ minHeight: '44px' }}
                                onClick={() => navigate('/network/vlans/new')}
                            >
                                <FiPlus /> {isMobile ? 'Neu' : 'Neues VLAN anlegen'}
                            </button>
                        )}
                    </div>

                    {isMobile ? (
                        /* Mobile: VLAN Cards */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {vlans.map((vlan, idx) => (
                                <div key={vlan.id} style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    borderLeft: `4px solid ${VLAN_COLORS[idx % VLAN_COLORS.length]}`,
                                    padding: '16px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div>
                                            <code style={{ fontSize: '13px', opacity: 0.7 }}>VLAN {vlan.vlan_id}</code>
                                            <div style={{ fontWeight: 600, fontSize: '16px' }}>{vlan.name}</div>
                                        </div>
                                        <span className="badge badge-outline">
                                            {devices.filter(d => d.network_vlan_id === vlan.id).length} Geräte
                                        </span>
                                    </div>
                                    {vlan.subnet && <code style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>{vlan.subnet}</code>}
                                    {vlan.description && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>{vlan.description}</p>}
                                    {hasAdminPermission() && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                style={{ flex: 1, minHeight: '40px', justifyContent: 'center' }}
                                                onClick={() => navigate(`/network/vlans/${vlan.id}/edit`)}
                                            >
                                                <FiEdit2 /> Bearbeiten
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm text-danger"
                                                style={{ minHeight: '40px', padding: '0 12px' }}
                                                onClick={() => handleDeleteVlan(vlan)}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {vlans.length === 0 && (
                                <div className="card text-center py-xl text-muted">
                                    <FiAlertCircle size={32} style={{ margin: '0 auto 8px' }} />
                                    <div>Noch keine VLAN-Definitionen vorhanden.</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Desktop: VLAN Table */
                        <div className="card p-0 overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>ID</th>
                                        <th>Bezeichnung</th>
                                        <th>Subnetz</th>
                                        <th>Beschreibung</th>
                                        <th className="text-center">Geräte</th>
                                        <th className="text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vlans.map(vlan => (
                                        <tr key={vlan.id}>
                                            <td className="font-bold"><code>{vlan.vlan_id}</code></td>
                                            <td><div className="font-semibold text-primary">{vlan.name}</div></td>
                                            <td>
                                                {vlan.subnet
                                                    ? <code className="text-xs">{vlan.subnet}</code>
                                                    : <span className="text-muted italic text-xs">Nicht definiert</span>
                                                }
                                            </td>
                                            <td>
                                                <div className="text-small text-muted truncate" style={{ maxWidth: '300px' }} title={vlan.description}>
                                                    {vlan.description || '-'}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge badge-outline">
                                                    {devices.filter(d => d.network_vlan_id === vlan.id).length}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end gap-xs">
                                                    {hasAdminPermission() && (
                                                        <>
                                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/network/vlans/${vlan.id}/edit`)}><FiEdit2 /></button>
                                                            <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeleteVlan(vlan)}><FiTrash2 /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {vlans.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-xl text-muted">
                                                <FiAlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                                                Noch keine VLAN-Definitionen vorhanden.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* ── Mobile Filter Bottom Sheet ── */}
            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                vlans={vlans}
                vlanFilter={vlanFilter}
                setVlanFilter={setVlanFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
        </div>
    );
}

export default Network;
