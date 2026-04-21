import { useState, useEffect } from 'react';
import { networkAPI } from '../../services/api';

const VlanForm = ({ vlan, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        vlan_id: '',
        name: '',
        subnet: '',
        description: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (vlan) {
            setFormData({
                id: vlan.id,
                vlan_id: vlan.vlan_id,
                name: vlan.name,
                subnet: vlan.subnet || '',
                description: vlan.description || ''
            });
        }
    }, [vlan]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError(null);
        try {
            await networkAPI.saveVlan(formData);
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

            <div className="form-group">
                <label className="form-label">VLAN ID *</label>
                <input
                    type="number"
                    className="form-input"
                    value={formData.vlan_id}
                    onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value })}
                    placeholder="z.B. 10"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Verwaltung"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Subnetz (Optional)</label>
                <input
                    type="text"
                    className="form-input"
                    value={formData.subnet}
                    onChange={(e) => setFormData({ ...formData, subnet: e.target.value })}
                    placeholder="z.B. 10.0.10.0/24"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Beschreibung</label>
                <textarea
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                />
            </div>
            
            <button type="submit" style={{ display: 'none' }} />
        </form>
    );
};

export default VlanForm;
