import React from 'react';
import { Link } from 'react-router-dom';

const RecentErrorsWidget = ({ errors }) => {
    if (!errors || errors.length === 0) {
        return <p className="text-muted text-center py-md">Keine offenen Fehlermeldungen</p>;
    }

    return (
        <div className="flex flex-col gap-sm">
            {errors.map((error) => (
                <Link 
                    key={error.id} 
                    to={`/error-reports`} 
                    className="flex items-center justify-between p-md bg-light border radius-md hover:bg-light-hover transition-base no-underline"
                    style={{ color: 'inherit' }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }} className="truncate">
                            {error.inventory_number || 'Container/Unbekannt'}
                        </div>
                        <div className="text-small text-muted truncate">
                            {error.description}
                        </div>
                    </div>
                    <span className="badge badge-error text-xs" style={{ flexShrink: 0 }}>Offen</span>
                </Link>
            ))}
        </div>
    );
};

export default RecentErrorsWidget;
