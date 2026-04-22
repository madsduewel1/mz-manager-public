import React, { useState, useEffect } from 'react';
import { FiInfo, FiChevronDown, FiChevronRight, FiSearch } from 'react-icons/fi';
import { helpAPI } from '../services/api';

const HelpCenter = () => {
    const [helpData, setHelpData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEntries, setExpandedEntries] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchHelp = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await helpAPI.getAllModules();
                setHelpData(response.data);
            } catch (err) {
                if (err.response && err.response.status === 403) {
                    setError('Zugriff verweigert. Du hast keine Berechtigung, diese Hilfe zu sehen.');
                } else if (err.response && err.response.status === 404) {
                    setError('Für diesen Bereich gibt es noch keine Hilfe-Einträge.');
                } else {
                    setError('Hilfe-Inhalte konnten nicht geladen werden.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHelp();
    }, []);

    const toggleEntry = (moduleId, entryId) => {
        setExpandedEntries(prev => ({
            ...prev,
            [`${moduleId}-${entryId}`]: !prev[`${moduleId}-${entryId}`]
        }));
    };

    // Filter logic
    const filteredData = helpData ? helpData.map(mod => {
        const filteredEntries = mod.entries.filter(entry => 
            entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            entry.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return { ...mod, entries: filteredEntries };
    }).filter(mod => mod.entries.length > 0 || mod.module.toLowerCase().includes(searchTerm.toLowerCase())) : [];

    return (
        <div className="fade-in">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiInfo style={{ color: 'var(--color-primary)' }} /> Hilfe-Center
                </h2>
                
                <div style={{ position: 'relative', minWidth: '250px' }}>
                    <FiSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Hilfe durchsuchen..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '35px' }}
                    />
                </div>
            </div>

            {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Hilfe-Inhalte werden geladen...</div>}
            {error && <div className="alert error">{error}</div>}
            
            {!loading && !error && filteredData.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? 'Keine Treffer für deine Suche.' : 'Keine Hilfe-Inhalte verfügbar.'}
                </div>
            )}

            {!loading && !error && filteredData.map((mod, modIdx) => (
                <div key={mod.module || modIdx} className="card mb-md">
                    <div className="card-header" style={{ background: 'var(--bg-secondary)' }}>
                        <h3 className="card-title" style={{ textTransform: 'capitalize' }}>
                            Modul: {mod.module}
                        </h3>
                    </div>
                    <div className="card-body" style={{ padding: '0' }}>
                        {mod.entries.map((entry, index) => (
                            <div key={entry.id} style={{ borderBottom: index < mod.entries.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <div 
                                    onClick={() => toggleEntry(mod.module, entry.id)}
                                    style={{
                                        padding: '1rem 1.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        background: expandedEntries[`${mod.module}-${entry.id}`] ? 'var(--bg-hover)' : 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>{entry.title}</h4>
                                    {expandedEntries[`${mod.module}-${entry.id}`] ? <FiChevronDown /> : <FiChevronRight />}
                                </div>
                                {expandedEntries[`${mod.module}-${entry.id}`] && (
                                    <div 
                                        style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-tertiary)' }}
                                        dangerouslySetInnerHTML={{ __html: entry.content }} 
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default HelpCenter;
