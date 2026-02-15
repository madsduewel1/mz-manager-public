import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FiCamera, FiX, FiAlertCircle } from 'react-icons/fi';
import Modal from './Modal';

function QRScanner({ isOpen, onClose, onScanSuccess }) {
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isOpen]);

    const startScanner = async () => {
        setError('');
        setIsScanning(true);

        try {
            const html5QrCode = new Html5Qrcode('qr-reader');
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // QR code not found - this is called frequently, so we ignore it
                }
            );
        } catch (err) {
            console.error('QR Scanner error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Kamera-Zugriff nicht erlaubt. Bitte erlauben Sie den Zugriff in Ihren Browsereinstellungen.');
            } else if (err.name === 'NotFoundError') {
                setError('Keine Kamera gefunden. Bitte stellen Sie sicher, dass eine Kamera angeschlossen ist.');
            } else {
                setError('Fehler beim Starten der Kamera: ' + err.message);
            }
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        html5QrCodeRef.current = null;
        setIsScanning(false);
    };

    const handleScanSuccess = (decodedText) => {
        // Extract QR code from URL if needed
        // Expected format: http://localhost:5173/report/ASSET-xxxx or just ASSET-xxxx
        let qrCode = decodedText;

        // Check if it's a URL
        if (decodedText.includes('/report/')) {
            const parts = decodedText.split('/report/');
            qrCode = parts[parts.length - 1];
        }

        stopScanner();
        onScanSuccess(qrCode);
    };

    const handleClose = () => {
        stopScanner();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="QR-Code scannen"
            footer={
                <button onClick={handleClose} className="btn btn-secondary">
                    Abbrechen
                </button>
            }
        >
            <div style={{ textAlign: 'center' }}>
                {error ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                        <div className="empty-state-icon" style={{ color: 'var(--color-error)' }}>
                            <FiAlertCircle />
                        </div>
                        <p style={{ color: 'var(--color-error)' }}>{error}</p>
                        <button
                            onClick={startScanner}
                            className="btn btn-primary mt-lg"
                        >
                            <FiCamera /> Erneut versuchen
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-muted mb-md">
                            Halten Sie den QR-Code des Geräts vor die Kamera
                        </p>
                        <div
                            id="qr-reader"
                            ref={scannerRef}
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                margin: '0 auto',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden'
                            }}
                        />
                        {isScanning && (
                            <p className="text-small text-muted mt-md">
                                <FiCamera style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                Kamera aktiv - Suche nach QR-Code...
                            </p>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}

export default QRScanner;
