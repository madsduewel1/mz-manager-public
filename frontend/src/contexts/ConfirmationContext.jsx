import React, { createContext, useContext, useState, useEffect } from 'react';
import Modal from '../components/Modal';

const ConfirmationContext = createContext();

export const useConfirmation = () => useContext(ConfirmationContext);

export const ConfirmationProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        confirmText: 'Bestätigen',
        cancelText: 'Abbrechen',
        type: 'danger' // danger, warning, info
    });

    const confirm = (options) => {
        return new Promise((resolve) => {
            setConfig({
                title: options.title || 'Bestätigung',
                message: options.message || 'Sind Sie sicher?',
                confirmText: options.confirmText || 'Bestätigen',
                cancelText: options.cancelText || 'Abbrechen',
                type: options.type || 'danger',
                onConfirm: () => {
                    resolve(true);
                    setIsOpen(false);
                },
                onCancel: () => {
                    resolve(false);
                    setIsOpen(false);
                }
            });
            setIsOpen(true);
        });
    };

    const handleConfirm = () => {
        config.onConfirm();
    };

    const handleCancel = () => {
        if (config.onCancel) config.onCancel();
        setIsOpen(false);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={handleCancel}
                    title={config.title}
                    footer={
                        <>
                            <button onClick={handleCancel} className="btn btn-secondary">
                                {config.cancelText}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`btn btn-${config.type === 'danger' ? 'danger' : 'primary'}`}
                            >
                                {config.confirmText}
                            </button>
                        </>
                    }
                >
                    <p>{config.message}</p>
                </Modal>
            )}
        </ConfirmationContext.Provider>
    );
};
