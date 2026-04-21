import { useNavigate } from 'react-router-dom';
import EntityFormLayout from '../components/forms/EntityFormLayout';
import LendingForm from '../components/forms/LendingForm';
import { useNotification } from '../contexts/NotificationContext';
import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useSettings } from '../contexts/SettingsContext';
import { getUser } from '../utils/auth';

const LendingFormPage = () => {
    const navigate = useNavigate();
    const { success, error } = useNotification();
    const [submitting, setSubmitting] = useState(false);
    const { settings } = useSettings();

    const handleSave = () => {
        const form = document.getElementById('entity-form');
        if (form) {
            form.requestSubmit();
        }
    };

    const handleSaveAndPrint = () => {
        // We'll tell the form to pass back data on save
        const form = document.getElementById('entity-form');
        if (form) {
            // Trigger submit with a flag or something
            // For now, let's just use the standard save and we'll handle PDF in onSaveSuccess
            sessionStorage.setItem('print_after_save', 'true');
            form.requestSubmit();
        }
    };

    const generatePDF = (lending) => {
        const doc = new jsPDF();
        const orgName = settings.org_name || 'MZ-Manager';
        const user = getUser();

        doc.setFontSize(22);
        doc.text(orgName, 20, 30);
        doc.setFontSize(16);
        doc.text('Ausleihprotokoll / Leihvertrag', 20, 40);
        doc.line(20, 45, 190, 45);

        doc.setFontSize(12);
        doc.text(`Datum: ${new Date(lending.start_date).toLocaleDateString('de-DE')}`, 20, 60);
        doc.text(`Entleiher: ${lending.borrower_name} (${lending.borrower_type})`, 20, 70);
        doc.text(`Rückgabe bis: ${new Date(lending.planned_end_date).toLocaleDateString('de-DE')}`, 20, 80);

        if (lending.notes) {
            doc.text('Anmerkungen:', 20, 100);
            doc.text(lending.notes, 20, 110);
        }

        doc.text('__________________________', 20, 220);
        doc.text('Unterschrift Entleiher', 20, 230);
        doc.text('__________________________', 110, 220);
        doc.text('Unterschrift Schule', 110, 230);

        doc.save(`Leihvertrag_${lending.borrower_name}.pdf`);
    };

    const onSaveSuccess = (data) => {
        const print = sessionStorage.getItem('print_after_save') === 'true';
        sessionStorage.removeItem('print_after_save');
        
        if (print && data) {
            generatePDF(data);
        }
        
        success('Ausleihe erfolgreich erstellt');
        navigate('/lendings');
    };

    return (
        <EntityFormLayout
            title="Neue Ausleihe"
            subtitle="Erfassen Sie eine neue Geräteausleihe"
            onSave={handleSave}
            submitting={submitting}
            saveLabel="Erstellen"
            extraActions={
                <button 
                    onClick={handleSaveAndPrint} 
                    className="btn btn-secondary"
                    style={{ marginRight: '10px' }}
                >
                    Speichern & Drucken
                </button>
            }
        >
            <LendingForm 
                onSave={onSaveSuccess} 
                onCancel={() => navigate('/lendings')}
                generatePDF={true}
            />
        </EntityFormLayout>
    );
};

export default LendingFormPage;
