import { useParams, useNavigate } from 'react-router-dom';
import EntityFormLayout from '../components/forms/EntityFormLayout';
import VlanForm from '../components/forms/VlanForm';
import NetworkDeviceForm from '../components/forms/NetworkDeviceForm';
import { useNotification } from '../contexts/NotificationContext';
import { useState, useEffect } from 'react';
import { networkAPI, assetsAPI } from '../services/api';

const NetworkFormPage = ({ type }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success, error: notifyError } = useNotification();
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [vlans, setVlans] = useState([]);

    useEffect(() => {
        loadBaseData();
        if (id) {
            loadEntity(id);
        }
    }, [id, type]);

    const loadBaseData = async () => {
        try {
            const vlanRes = await networkAPI.getVlans();
            setVlans(vlanRes.data);
        } catch (err) {
            console.error('Error loading base network data:', err);
        }
    };

    const loadEntity = async (entityId) => {
        setLoading(true);
        try {
            if (type === 'vlan') {
                const vlanRes = await networkAPI.getVlans();
                const vlan = vlanRes.data.find(v => v.id === parseInt(entityId));
                if (vlan) {
                    setData(vlan);
                } else {
                    notifyError('VLAN nicht gefunden');
                    navigate('/network');
                }
            } else if (type === 'device') {
                const assetRes = await assetsAPI.getOne(entityId);
                setData(assetRes.data);
            }
        } catch (err) {
            console.error('Error loading entity:', err);
            notifyError('Fehler beim Laden der Daten');
            navigate('/network');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        const form = document.getElementById('entity-form');
        if (form) {
            form.requestSubmit();
        }
    };

    const onSaveSuccess = () => {
        success('Speichern erfolgreich');
        navigate('/network');
    };

    if (loading) return <div className="container"><div className="loading">Wird geladen...</div></div>;

    const title = type === 'vlan' 
        ? (id ? 'VLAN bearbeiten' : 'Neues VLAN erstellen')
        : 'Netzwerkkonfiguration zuweisen';
    
    const subtitle = type === 'vlan'
        ? (id ? `Bearbeiten von VLAN ${data?.vlan_id}` : 'Erstellen eines neuen logischen Netzwerks')
        : `Konfiguration für Gerät ${data?.inventory_number} (${data?.model || data?.type})`;

    return (
        <EntityFormLayout
            title={title}
            subtitle={subtitle}
            onSave={handleSave}
            submitting={submitting}
            saveLabel="Speichern"
        >
            {type === 'vlan' ? (
                <VlanForm 
                    vlan={data} 
                    onSave={onSaveSuccess} 
                    onCancel={() => navigate('/network')}
                />
            ) : (
                <NetworkDeviceForm 
                    device={data} 
                    vlans={vlans}
                    onSave={onSaveSuccess} 
                    onCancel={() => navigate('/network')}
                />
            )}
        </EntityFormLayout>
    );
};

export default NetworkFormPage;
