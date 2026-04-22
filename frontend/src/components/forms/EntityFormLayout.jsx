import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const EntityFormLayout = ({ title, subtitle, children, onCancel, onSave, submitting, saveLabel }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <button 
                        className="btn btn-ghost btn-icon" 
                        onClick={handleBack}
                        title="Zurück"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="h2" style={{ margin: 0 }}>{title}</h1>
                        {subtitle && <p className="text-muted" style={{ margin: '4px 0 0 0' }}>{subtitle}</p>}
                    </div>
                </div>
            </div>

            <div className="card shadow-sm" style={{ width: '100%', maxWidth: '900px' }}>
                <div className="card-body">
                    {children}
                </div>
                <div className="card-footer" style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-start', 
                    gap: 'var(--space-md)',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 'var(--space-lg)'
                }}>
                    <button 
                        type="button"
                        onClick={onSave} 
                        className="btn btn-primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Wird gespeichert...' : (saveLabel || 'Speichern')}
                    </button>
                    <button 
                        type="button"
                        onClick={handleBack} 
                        className="btn btn-secondary"
                        disabled={submitting}
                    >
                        Abbrechen
                    </button>
                </div>
            </div>

            <style>{`
                .card {
                    background: var(--color-bg-medium);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--color-border);
                }
                .card-body {
                    padding: var(--space-lg);
                }
                .card-footer {
                    padding: var(--space-md) var(--space-lg);
                    background: var(--color-bg-light);
                }
            `}</style>
        </div>
    );
};

export default EntityFormLayout;
