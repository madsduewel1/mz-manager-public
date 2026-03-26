import { createContext, useContext, useState } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const success = (message) => addNotification(message, 'success');
    const error = (message) => addNotification(message, 'error');
    const info = (message) => addNotification(message, 'info');

    return (
        <NotificationContext.Provider value={{ success, error, info }}>
            {children}
            <NotificationContainer notifications={notifications} onRemove={removeNotification} />
        </NotificationContext.Provider>
    );
};

const NotificationContainer = ({ notifications, onRemove }) => {
    if (notifications.length === 0) return null;

    return (
        <div style={styles.container}>
            {notifications.map(notification => (
                <Notification
                    key={notification.id}
                    notification={notification}
                    onRemove={() => onRemove(notification.id)}
                />
            ))}
        </div>
    );
};

const Notification = ({ notification, onRemove }) => {
    const { type, message } = notification;

    const getIcon = () => {
        switch (type) {
            case 'success': return <FiCheckCircle size={20} />;
            case 'error': return <FiAlertCircle size={20} />;
            default: return <FiInfo size={20} />;
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return 'var(--color-success)';
            case 'error': return 'var(--color-danger)';
            default: return 'var(--color-info)';
        }
    };

    return (
        <div style={{ ...styles.notification, borderLeftColor: getColor() }}>
            <div style={{ ...styles.icon, color: getColor() }}>
                {getIcon()}
            </div>
            <div style={styles.message}>{message}</div>
            <button onClick={onRemove} style={styles.closeBtn}>
                <FiX size={18} />
            </button>
        </div>
    );
};

const styles = {
    container: {
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px'
    },
    notification: {
        background: 'var(--color-bg-medium)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease-out'
    },
    icon: {
        flexShrink: 0
    },
    message: {
        flex: 1,
        color: 'var(--color-text)',
        fontSize: 'var(--font-size-sm)'
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    }
};

export default NotificationProvider;
