import React from 'react';
import { hasPermission, hasRole } from '../utils/auth';

const DashboardWidget = ({ title, icon: Icon, permission, size = 'medium', children, action }) => {
    // Permission check
    const isVisible = !permission || hasPermission(permission) || hasRole('Administrator');

    if (!isVisible) return null;

    // Map size to column span
    const sizeClasses = {
        small: 'span-3',
        medium: 'span-6',
        large: 'span-12'
    };

    return (
        <div className={`dashboard-widget ${sizeClasses[size]}`}>
            <div className="card h-full">
                <div className="card-header border-none mb-0 pb-2">
                    <h3 className="card-title flex items-center gap-2 text-sm uppercase tracking-wider text-muted">
                        {Icon && <Icon size={18} />}
                        {title}
                    </h3>
                    {action && <div className="widget-action">{action}</div>}
                </div>
                <div className="card-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default DashboardWidget;
