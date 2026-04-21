import { useParams, useNavigate } from 'react-router-dom';
import EntityFormLayout from '../components/forms/EntityFormLayout';
import ContainerForm from '../components/forms/ContainerForm';
import { useNotification } from '../contexts/NotificationContext';
import { useState } from 'react';

const ContainerFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { success } = useNotification();
    const [submitting, setSubmitting] = useState(false);

    const handleSave = () => {
        const form = document.getElementById('entity-form');
        if (form) {
            form.requestSubmit();
        }
    };

    const onSaveSuccess = () => {
        success(id ? 'Container erfolgreich aktualisiert' : 'Container erfolgreich erstellt');
        navigate('/containers');
    };

    return (
        <EntityFormLayout
            title={id ? 'Container bearbeiten' : 'Neuer Container erstellen'}
            subtitle={id ? `Bearbeiten von Container #${id}` : 'Fügen Sie einen neuen Container hinzu'}
            onSave={handleSave}
            submitting={submitting}
            saveLabel={id ? 'Änderungen speichern' : 'Container anlegen'}
        >
            <ContainerForm 
                containerId={id} 
                onSave={onSaveSuccess} 
                onCancel={() => navigate('/containers')}
            />
        </EntityFormLayout>
    );
};

export default ContainerFormPage;
