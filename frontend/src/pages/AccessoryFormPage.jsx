import { useParams, useNavigate } from 'react-router-dom';
import EntityFormLayout from '../components/forms/EntityFormLayout';
import AccessoryForm from '../components/forms/AccessoryForm';
import { useNotification } from '../contexts/NotificationContext';
import { useState } from 'react';

const AccessoryFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success } = useNotification();
    const [submitting, setSubmitting] = useState(false);

    const onSaveSuccess = () => {
        success(id ? 'Zubehör erfolgreich aktualisiert' : 'Zubehör erfolgreich erstellt');
        navigate('/accessories');
    };

    return (
        <EntityFormLayout
            title={id ? 'Zubehör bearbeiten' : 'Neues Zubehör hinzufügen'}
            subtitle={id ? `Bearbeiten von Zubehör #${id}` : 'Fügen Sie neues Zubehör zum Inventar hinzu'}
            submitting={submitting}
            saveLabel={id ? 'Änderungen speichern' : 'Zubehör speichern'}
        >
            <AccessoryForm 
                accessoryId={id} 
                onSave={onSaveSuccess} 
                setSubmitting={setSubmitting}
                onCancel={() => navigate('/accessories')}
            />
        </EntityFormLayout>
    );
};

export default AccessoryFormPage;
