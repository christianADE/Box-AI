const { startSession, getSession } = require('../services/baileysService');
const WhatsAppSession = require('../models/WhatsAppSession');
const apiResponse = require('../utils/apiResponse');
const QRCode = require('qrcode'); // Import qrcode lib

const getQR = async (req, res) => {
    const userId = req.user.id;
    try {
        let session = await WhatsAppSession.findOne({ where: { userId } });

        // If no active socket in memory, start one
        if (!getSession(userId)) {
            await startSession(userId);
            // Give it a moment to generate QR
            await new Promise(r => setTimeout(r, 2000));
            session = await WhatsAppSession.findOne({ where: { userId } });
        }

        if (session && session.isConnected) {
            console.log('[Controller Debug] Already connected');
            return apiResponse(res, 200, true, 'Already connected');
        }

        if (session && session.qrCode) {
            console.log('[Controller Debug] QR found in DB, generating image...');
            // Convert raw string to Data URI image for easier frontend consumption?
            // User requested Base64. Baileys gives raw string. 
            // Better to give Data URL for <img> tag usage directly
            const qrImage = await QRCode.toDataURL(session.qrCode);
            console.log('[Controller Debug] QR Image generated success');
            return apiResponse(res, 200, true, 'QR Code generated', { qr: qrImage });
        }

        console.log('[Controller Debug] No QR in DB yet, returning 202');

        return apiResponse(res, 202, true, 'Initializing session, please retry in a few seconds');
    } catch (error) {
        console.error(error);
        return apiResponse(res, 500, false, 'Internal Server Error');
    }
};

const getStatus = async (req, res) => {
    const start = Date.now();
    const userId = req.user.id;
    console.log(`[Status Check] Request for ${userId}`);
    try {
        const session = await WhatsAppSession.findOne({ where: { userId } });
        console.log(`[Status Check] Session found? ${!!session}. Time: ${Date.now() - start}ms`);

        if (!session) {
            return apiResponse(res, 200, true, 'No session found', { status: 'disconnected', isConnected: false });
        }
        return apiResponse(res, 200, true, 'Session Status', {
            status: session.status,
            isConnected: session.isConnected
        });
    } catch (error) {
        console.error('[Status Check Error]', error);
        return apiResponse(res, 500, false, 'Server Error');
    }
};

const logout = async (req, res) => {
    // Optional: implement logout logic (sock.logout())
    return apiResponse(res, 501, false, 'Not implemented yet');
};

module.exports = {
    getQR,
    getStatus,
    logout
};
