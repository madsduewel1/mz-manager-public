import { useNavigate } from 'react-router-dom';
import { FiHome, FiAlertCircle } from 'react-icons/fi';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-dark)',
            padding: 'var(--space-xl)',
            textAlign: 'center'
        }}>
            <div style={{
                maxWidth: '500px',
                width: '100%',
                background: 'var(--color-bg-medium)',
                padding: 'var(--space-2xl)',
                borderRadius: '32px',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-2xl)',
                animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                }}>
                    <FiAlertCircle size={40} />
                </div>

                <h1 style={{ fontSize: '120px', margin: '0', opacity: 0.1, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
                    404
                </h1>

                <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                    Seite nicht gefunden
                </h2>
                
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
                    Uups! Die gesuchte Seite existiert leider nicht oder wurde verschoben.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                        className="btn btn-primary btn-lg w-full"
                        onClick={() => navigate('/')}
                        style={{ justifyContent: 'center' }}
                    >
                        <FiHome style={{ marginRight: '8px' }} />
                        Zum Dashboard
                    </button>
                    <button 
                        className="btn btn-secondary btn-lg w-full"
                        onClick={() => navigate(-1)}
                        style={{ justifyContent: 'center' }}
                    >
                        Zurück zur vorherigen Seite
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default NotFound;
