import { useParams, useNavigate } from 'react-router-dom';
import EntityFormLayout from '../components/forms/EntityFormLayout';
import AssetForm from '../components/forms/AssetForm';
import { useNotification } from '../contexts/NotificationContext';
import { useRef, useState } from 'react';

const AssetFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success } = useNotification();
    const [submitting, setSubmitting] = useState(false);
    
    const onSaveSuccess = () => {
        success(id ? 'Gerät erfolgreich aktualisiert' : 'Gerät erfolgreich erstellt');
        navigate('/assets');
    };

    return (
        <EntityFormLayout
            title={id ? 'Gerät bearbeiten' : 'Neues Gerät erstellen'}
            subtitle={id ? `Bearbeiten von Gerät #${id}` : 'Fügen Sie ein neues Gerät zum Inventar hinzu'}
            submitting={submitting}
            saveLabel={id ? 'Änderungen speichern' : 'Gerät anlegen'}
        >
            <AssetForm 
                assetId={id} 
                onSave={onSaveSuccess} 
                setSubmitting={setSubmitting}
                onCancel={() => navigate('/assets')}
            />
        </EntityFormLayout>
    );
};

export default AssetFormPage;
