import { useState, useEffect } from 'react';
import { networkAPI } from '../../services/api';

const NetworkDeviceForm = ({ device, vlans, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        network_vlan_id: '',
        ip_address: '',
        mac_address: '',
        dhcp_enabled: false,
        switch_name: '',
        port_number: '',
        network_role: 'Client'
    });

    const [error, setError] = useState(null);

    useEffect(() => {
        if (device) {
            setFormData({
                network_vlan_id: device.network_vlan_id || '',
                ip_address: device.ip_address || '',
                mac_address: device.mac_address || '',
                dhcp_enabled: !!device.dhcp_enabled,
                switch_name: device.switch_name || '',
                port_number: device.port_number || '',
                network_role: device.network_role || 'Client'
            });
        }
    }, [device]);

    const formatMAC = (value) => {
        const raw = value.replace(/[^a-fA-F0-9]/g, '').slice(0, 12);
        return raw.match(/.{1,2}/g)?.join(':') || '';
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        try {
            await networkAPI.assignDevice({ asset_id: device.id, ...formData });
            if (onSave) onSave();
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler beim Speichern');
        }
    };

    return (
        <form id="entity-form" onSubmit={handleSubmit}>
            {error && (
                <div className="alert alert-danger mb-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-2 grid-mobile-1">
                <div className="form-group">
                    <label className="form-label">Netzwerk-Rolle</label>
                    <select
                        className="form-select"
                        value={formData.network_role}
                        onChange={(e) => setFormData({ ...formData, network_role: e.target.value })}
                    >
                        <option value="Client">Client (PC, Laptop)</option>
                        <option value="Server">Server</option>
                        <option value="Switch">Switch</option>
                        <option value="Router">Router / Gateway</option>
                        <option value="AP">Access Point</option>
                        <option value="Printer">Drucker</option>
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">VLAN</label>
                    <select
                        className="form-select"
                        value={formData.network_vlan_id}
                        onChange={(e) => setFormData({ ...formData, network_vlan_id: e.target.value })}
                    >
                        <option value="">-- Kein VLAN --</option>
                        {vlans.map(v => (
                            <option key={v.id} value={v.id}>VLAN {v.vlan_id}: {v.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-2 grid-mobile-1">
                <div className="form-group">
                    <label className="form-label">IP-Adresse</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                        placeholder="z.B. 10.0.10.50"
                        disabled={formData.dhcp_enabled}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={formData.dhcp_enabled}
                            onChange={(e) => setFormData({ ...formData, dhcp_enabled: e.target.checked, ip_address: e.target.checked ? '' : formData.ip_address })}
                        />
                        <span className="text-small">DHCP aktiviert</span>
                    </label>
                </div>

                <div className="form-group">
                    <label className="form-label">MAC-Adresse</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.mac_address}
                        onChange={(e) => setFormData({ ...formData, mac_address: formatMAC(e.target.value) })}
                        placeholder="00:00:00:00:00:00"
                    />
                </div>
            </div>

            <div className="grid grid-2 grid-mobile-1">
                <div className="form-group">
                    <label className="form-label">Switch Name</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.switch_name}
                        onChange={(e) => setFormData({ ...formData, switch_name: e.target.value })}
                        placeholder="z.B. SW-EG-01"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Port Nummer</label>
                    <input
                        type="text"
                        className="form-input"
                        value={formData.port_number}
                        onChange={(e) => setFormData({ ...formData, port_number: e.target.value })}
                        placeholder="z.B. 24"
                    />
                </div>
            </div>
            
            <button type="submit" style={{ display: 'none' }} />
        </form>
    );
};

export default NetworkDeviceForm;
