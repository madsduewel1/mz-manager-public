import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, adminAPI } from '../services/api';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        org_name: 'MZ-MANAGER',
        logo_path: null,
        base_url: window.location.origin
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await adminAPI.getSettings();
            if (response.data) {
                setSettings(prev => ({
                    ...prev,
                    ...response.data
                }));
            }
        } catch (err) {
            console.warn('Failed to fetch system settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettingsState = (newSettings) => {
        setSettings(prev => ({
            ...prev,
            ...newSettings
        }));
    };

    const refreshSettings = () => {
        return fetchSettings();
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettingsState, refreshSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
