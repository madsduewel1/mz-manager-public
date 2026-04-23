import React from 'react';

const DeviceStatusWidget = ({ stats }) => {
    const total = stats?.statistics?.total_assets || 0;
    const defective = stats?.statistics?.defective_assets || 0;
    const inRepair = stats?.statistics?.repair_assets || 0;
    const active = stats?.statistics?.active_lendings || 0;
    const available = total - defective - inRepair - active;

    const data = [
        { label: 'Verfügbar', value: available, color: 'var(--color-success)', percentage: total > 0 ? (available / total) * 100 : 0 },
        { label: 'Ausgeliehen', value: active, color: 'var(--color-primary)', percentage: total > 0 ? (active / total) * 100 : 0 },
        { label: 'Defekt/Reparatur', value: defective + inRepair, color: 'var(--color-error)', percentage: total > 0 ? ((defective + inRepair) / total) * 100 : 0 },
    ];

    return (
        <div className="device-status-widget">
            <div className="flex gap-1 h-4 radius-sm overflow-hidden mb-lg bg-light" style={{ height: '24px', borderRadius: '4px' }}>
                {data.map((item, i) => item.value > 0 && (
                    <div 
                        key={i} 
                        style={{ 
                            width: `${item.percentage}%`, 
                            backgroundColor: item.color,
                            height: '100%'
                        }} 
                        title={`${item.label}: ${item.value}`}
                    />
                ))}
            </div>
            
            <div className="flex flex-col gap-sm">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-small">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 radius-sm" style={{ backgroundColor: item.color, width: '12px', height: '12px', borderRadius: '2px' }} />
                            <span>{item.label}</span>
                        </div>
                        <span className="font-bold">{item.value}</span>
                    </div>
                ))}
                <div className="mt-md pt-md border-top flex items-center justify-between font-bold" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <span>Gesamt</span>
                    <span>{total}</span>
                </div>
            </div>
        </div>
    );
};

export default DeviceStatusWidget;
