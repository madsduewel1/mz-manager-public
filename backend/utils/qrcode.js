const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate a unique QR code identifier
 */
function generateQRId(prefix = 'MZ') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate QR code as data URL (base64)
 * @param {string} qrId - The QR code identifier
 * @param {string} baseUrl - The base URL for the public error report page
 * @returns {Promise<string>} Data URL of the QR code image
 */
async function generateQRCode(qrId, baseUrl) {
    try {
        const url = `${baseUrl}/report/${qrId}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrDataUrl;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('Fehler beim Erstellen des QR-Codes');
    }
}

/**
 * Generate QR code as buffer for file storage
 * @param {string} qrId - The QR code identifier
 * @param {string} baseUrl - The base URL for the public error report page
 * @returns {Promise<Buffer>} Buffer of the QR code image
 */
async function generateQRCodeBuffer(qrId, baseUrl) {
    try {
        const url = `${baseUrl}/report/${qrId}`;
        const buffer = await QRCode.toBuffer(url, {
            errorCorrectionLevel: 'M',
            type: 'png',
            width: 300,
            margin: 2
        });
        return buffer;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('Fehler beim Erstellen des QR-Codes');
    }
}

module.exports = {
    generateQRId,
    generateQRCode,
    generateQRCodeBuffer
};
