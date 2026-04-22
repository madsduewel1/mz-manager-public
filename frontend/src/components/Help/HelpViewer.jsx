import React, { useState, useEffect } from 'react';
import { FiX, FiInfo, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { helpAPI } from '../../services/api';
import './HelpViewer.css';

const HelpViewer = ({ isOpen, onClose, moduleContext = null }) => {
    const [helpData, setHelpData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEntries, setExpandedEntries] = useState({});

    useEffect(() => {
        if (!isOpen) return;

        const fetchHelp = async () => {
            setLoading(true);
            setError(null);
            try {
                if (moduleContext) {
                    // Fetch specific module
                    const response = await helpAPI.getModule(moduleContext);
                    setHelpData([response.data]);
                } else {
                    // Fetch all accessible modules
                    const response = await helpAPI.getAllModules();
                    setHelpData(response.data);
                }
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
    }, [isOpen, moduleContext]);

    const toggleEntry = (moduleId, entryId) => {
        setExpandedEntries(prev => ({
            ...prev,
            [`${moduleId}-${entryId}`]: !prev[`${moduleId}-${entryId}`]
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="help-modal-overlay" onClick={onClose}>
            <div className="help-modal-content" onClick={e => e.stopPropagation()}>
                <div className="help-modal-header">
                    <div className="help-modal-title">
                        <FiInfo />
                        <h2>{moduleContext ? `Hilfe: ${moduleContext}` : 'Hilfe-Center'}</h2>
                    </div>
                    <button className="help-modal-close" onClick={onClose}>
                        <FiX />
                    </button>
                </div>

                <div className="help-modal-body">
                    {loading && <div className="help-loading">Hilfe-Inhalte werden geladen...</div>}
                    
                    {error && <div className="help-error">{error}</div>}
                    
                    {!loading && !error && helpData && helpData.length === 0 && (
                        <div className="help-empty">Keine Hilfe-Inhalte verfügbar.</div>
                    )}

                    {!loading && !error && helpData && helpData.map((mod, modIdx) => (
                        <div key={mod.module || modIdx} className="help-module-section">
                            {!moduleContext && <h3 className="help-module-title">{mod.module}</h3>}
                            
                            <div className="help-entries-list">
                                {mod.entries && mod.entries.map(entry => (
                                    <div key={entry.id} className="help-entry-card">
                                        <div 
                                            className="help-entry-header" 
                                            onClick={() => toggleEntry(mod.module, entry.id)}
                                        >
                                            <h4>{entry.title}</h4>
                                            {expandedEntries[`${mod.module}-${entry.id}`] ? <FiChevronDown /> : <FiChevronRight />}
                                        </div>
                                        {expandedEntries[`${mod.module}-${entry.id}`] && (
                                            <div className="help-entry-content" dangerouslySetInnerHTML={{ __html: entry.content }} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HelpViewer;
