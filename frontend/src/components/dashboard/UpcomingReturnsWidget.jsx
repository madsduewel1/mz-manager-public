import React from 'react';
import { Link } from 'react-router-dom';

const UpcomingReturnsWidget = ({ lendings }) => {
    if (!lendings || lendings.length === 0) {
        return <p className="text-muted text-center py-md">Keine anstehenden Rückgaben</p>;
    }

    return (
        <div className="flex flex-col gap-sm">
            {lendings.map((lending) => {
                const isOverdue = new Date(lending.planned_end_date) < new Date();
                
                return (
                    <div 
                        key={lending.id} 
                        className="p-md bg-light border radius-md flex items-center justify-between"
                    >
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }} className="truncate">
                                {lending.inventory_number || lending.container_name}
                            </div>
                            <div className="text-small text-muted truncate">
                                {lending.borrower_name}
                            </div>
                        </div>
                        <div className="text-right" style={{ flexShrink: 0 }}>
                            <div className={`text-xs font-bold ${isOverdue ? 'text-error' : 'text-muted'}`} style={{ color: isOverdue ? 'var(--color-error)' : 'inherit' }}>
                                {isOverdue ? 'ÜBERFÄLLIG' : 'Rückgabe'}
                            </div>
                            <div className="text-small">
                                {new Date(lending.planned_end_date).toLocaleDateString('de-DE')}
                            </div>
                        </div>
                    </div>
                );
            })}
            <Link to="/lendings" className="btn btn-sm btn-secondary w-full mt-sm">
                Alle Ausleihen
            </Link>
        </div>
    );
};

export default UpcomingReturnsWidget;
