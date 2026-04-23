import React from 'react';
import { FiPackage, FiMapPin, FiUsers, FiAlertCircle } from 'react-icons/fi';

const SystemOverviewWidget = ({ stats }) => {
    const items = [
        { label: 'Geräte', value: stats?.statistics?.total_assets || 0, icon: FiPackage, color: 'var(--color-primary)' },
        { label: 'Räume/Container', value: stats?.statistics?.total_containers || 0, icon: FiMapPin, color: 'var(--color-info)' },
        { label: 'Offene Tickets', value: stats?.statistics?.open_error_reports || 0, icon: FiAlertCircle, color: 'var(--color-error)' },
    ];

    return (
        <div className="grid grid-3 gap-md">
            {items.map((item, i) => (
                <div key={i} className="stat-card p-md bg-light border radius-md text-center">
                    <item.icon size={24} style={{ color: item.color, marginBottom: '8px' }} />
                    <div className="stat-value" style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{item.value}</div>
                    <div className="stat-label" style={{ fontSize: '0.7rem' }}>{item.label}</div>
                </div>
            ))}
        </div>
    );
};

export default SystemOverviewWidget;
