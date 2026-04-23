import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const ActivityWidget = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await adminAPI.getLogs();
                // Filter to show only top 6
                setLogs(response.data.slice(0, 6));
            } catch (err) {
                console.error('Failed to fetch logs for widget', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    if (loading) return <div className="text-center py-md text-muted">Lade Aktivitäten...</div>;
    if (logs.length === 0) return <div className="text-center py-md text-muted">Keine Aktivitäten vorhanden</div>;

    const formatAction = (action) => {
        return action.replace(/_/g, ' ').toLowerCase();
    };

    return (
        <div className="activity-timeline flex flex-col gap-md">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-md relative">
                    <div className="flex flex-col items-center">
                        <div className="w-2 h-2 radius-full bg-primary" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: '6px' }} />
                        <div className="w-0.5 h-full bg-border" style={{ width: '1px', flex: 1, backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
                    </div>
                    <div className="pb-2">
                        <div className="text-small font-bold" style={{ lineHeight: 1.2 }}>
                            {log.user} <span className="font-normal text-muted" style={{ fontWeight: 400 }}>{log.details}</span>
                        </div>
                        <div className="text-xs text-muted mt-1">
                            {new Date(log.created_at).toLocaleString('de-DE', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActivityWidget;
