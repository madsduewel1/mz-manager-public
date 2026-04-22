import React, { useState } from 'react';
import { FiHelpCircle } from 'react-icons/fi';
import HelpViewer from './HelpViewer';
import './HelpButton.css';

const HelpButton = ({ moduleContext, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button 
                type="button"
                className={`help-context-button ${className}`}
                onClick={() => setIsOpen(true)}
                title="Hilfe anzeigen"
            >
                <FiHelpCircle />
                <span className="sr-only">Hilfe</span>
            </button>
            
            <HelpViewer 
                isOpen={isOpen} 
                onClose={() => setIsOpen(false)} 
                moduleContext={moduleContext}
            />
        </>
    );
};

export default HelpButton;
