import { useState, useMemo } from 'react';
import { FiInfo, FiArrowRight, FiArrowLeft, FiCheck, FiSettings, FiMonitor, FiRepeat, FiAlertCircle } from 'react-icons/fi';

function Onboarding({ user, onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);

    const STEPS = useMemo(() => {
        const perms = user?.permissions || [];
        const hasAssetPerm = perms.includes('assets.view') || perms.includes('assets.manage') || perms.includes('all');
        const hasLendingPerm = perms.includes('lendings.view') || perms.includes('lendings.create') || perms.includes('lendings.manage') || perms.includes('all');
        const hasErrorPerm = perms.includes('errors.create') || perms.includes('errors.manage') || perms.includes('all');
        const hasAdminPerm = perms.includes('users.manage') || perms.includes('roles.manage') || perms.includes('all');

        const steps = [
            {
                title: 'Willkommen beim MZ-Manager',
                content: 'Hier finden Sie eine Übersicht über Ihre Geräte und deren Status. In dieser kurzen Einführung zeigen wir Ihnen die wichtigsten Funktionen.',
                icon: <FiInfo size={32} color="var(--color-primary)" />
            }
        ];

        if (hasAssetPerm) {
            steps.push({
                title: 'Geräte verwalten',
                content: 'Unter "Geräte" sehen Sie alle verfügbaren Medienelemente. Sie können nach Typ, Standort oder Status filtern.',
                icon: <FiMonitor size={32} color="var(--color-primary)" />
            });
        }

        if (hasLendingPerm) {
            steps.push({
                title: 'Ausleihen im Blick',
                content: 'Der Bereich "Ausleihen" zeigt Ihnen, wer welches Gerät gerade nutzt und wann es voraussichtlich zurückgegeben wird.',
                icon: <FiRepeat size={32} color="var(--color-primary)" />
            });
        }

        if (hasErrorPerm) {
            steps.push({
                title: 'Fehler melden',
                content: 'Sollte ein Gerät defekt sein, können Sie unter "Fehlermeldungen" einen Bericht erstellen, damit sich die Technik darum kümmert.',
                icon: <FiAlertCircle size={32} color="var(--color-primary)" />
            });
        }

        if (hasAdminPerm) {
            steps.push({
                title: 'Verwaltung',
                content: 'Da Sie erweiterte Rechte haben, finden Sie im Bereich "Verwaltung" die Werkzeuge, um Benutzer, Rollen und neue Geräte anzulegen.',
                icon: <FiSettings size={32} color="var(--color-primary)" />
            });
        }

        return steps;
    }, [user]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const step = STEPS[currentStep];

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <button
                    onClick={onComplete}
                    style={styles.skipLink}
                >
                    Überspringen
                </button>
                <div style={styles.header}>
                    <div style={styles.iconContainer}>{step.icon}</div>
                    <div style={styles.stepIndicator}>
                        {STEPS.map((_, index) => (
                            <div
                                key={index}
                                style={{
                                    ...styles.dot,
                                    backgroundColor: index === currentStep ? 'var(--color-primary)' : 'var(--color-border)'
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={styles.body}>
                    <h2 style={styles.title}>{step.title}</h2>
                    <p style={styles.content}>{step.content}</p>
                </div>

                <div style={styles.footer}>
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        style={{
                            ...styles.button,
                            ...styles.secondaryButton,
                            visibility: currentStep === 0 ? 'hidden' : 'visible'
                        }}
                    >
                        <FiArrowLeft /> Zurück
                    </button>

                    <button
                        onClick={handleNext}
                        style={{
                            ...styles.button,
                            ...styles.primaryButton
                        }}
                        className="onboarding-next-btn"
                    >
                        {currentStep === STEPS.length - 1 ? (
                            <>Verstanden <FiCheck /></>
                        ) : (
                            <>Weiter <FiArrowRight /></>
                        )}
                    </button>
                </div>
            </div>
            <style>{`
                .onboarding-next-btn:hover {
                    background-color: var(--color-primary-hover) !important;
                }
            `}</style>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)'
    },
    modal: {
        backgroundColor: 'var(--color-bg-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-2xl)',
        width: '100%',
        maxWidth: '500px',
        boxShadow: 'var(--shadow-xl)',
        textAlign: 'center',
        border: '1px solid var(--color-border)',
        position: 'relative'
    },
    skipLink: {
        position: 'absolute',
        top: '12px',
        right: '20px',
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-tertiary)',
        fontSize: '12px',
        cursor: 'pointer',
        textDecoration: 'underline',
        padding: '5px'
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-lg)',
        marginBottom: 'var(--space-xl)'
    },
    iconContainer: {
        width: '80px',
        height: '80px',
        backgroundColor: 'var(--color-bg-light)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    stepIndicator: {
        display: 'flex',
        gap: 'var(--space-sm)'
    },
    dot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        transition: 'background-color 0.3s'
    },
    body: {
        marginBottom: 'var(--space-2xl)'
    },
    title: {
        fontSize: 'var(--font-size-2xl)',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--space-md)'
    },
    content: {
        fontSize: 'var(--font-size-base)',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.6',
        padding: '0 var(--space-lg)'
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: '12px 24px',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-base)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all var(--transition-base)',
        border: 'none'
    },
    primaryButton: {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-text-on-primary)'
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        color: 'var(--color-text-secondary)'
    }
};

export default Onboarding;
