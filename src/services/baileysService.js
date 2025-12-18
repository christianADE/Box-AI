const pino = require('pino');
const fs = require('fs');
const path = require('path');
const WhatsAppSession = require('../models/WhatsAppSession');
const Message = require('../models/Message');
const AIConfig = require('../models/AIConfig');
const { generateAIResponse } = require('./aiService');

// Store active sockets in memory
const sessions = {};

/**
 * Dynamic import for Baileys to avoid ERR_REQUIRE_ESM
 */
let baileys = null;
const getBaileys = async () => {
    if (!baileys) {
        baileys = await import('@whiskeysockets/baileys');
    }
    return baileys;
};

const startSession = async (userId) => {
    try {
        console.log(`[Baileys] Starting session for user ${userId}`);

        const {
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason,
            fetchLatestBaileysVersion
        } = await getBaileys();

        // Ensure session directory exists
        const sessionDir = path.join(__dirname, '../../sessions', userId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            logger: pino({ level: 'silent' }),
            markOnlineOnConnect: false,
        });

        sessions[userId] = sock;

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        // ---------------- CONNECTION UPDATE ----------------
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            console.log(`[Baileys] Connection update: ${connection}`);

            if (qr) {
                console.log(`[Baileys] QR Code generated for ${userId}`);
                await updateSessionStatus(userId, 'scanning', false, qr);
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                const isCorrupted = reason === 405;
                const isLoggedOut = reason === DisconnectReason.loggedOut;

                await updateSessionStatus(userId, 'disconnected', false, null);
                console.error(`[Baileys] Connection closed. Reason=${reason}`);

                if (isCorrupted) {
                    console.log('[Baileys] 405 detected. Resetting session...');
                    delete sessions[userId];
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    setTimeout(() => startSession(userId), 1500);
                    return;
                }

                if (!isLoggedOut) {
                    console.log('[Baileys] Reconnecting...');
                    startSession(userId);
                } else {
                    console.log('[Baileys] User logged out. Cleaning session.');
                    delete sessions[userId];
                }
            } else if (connection === 'open') {
                console.log('[Baileys] WhatsApp connected successfully.');
                await updateSessionStatus(userId, 'connected', true, null);
            }
        });

        // ---------------- MESSAGE LISTENER ----------------
        sock.ev.on('messages.upsert', async (m) => {
            console.log(`[Baileys Debug] Upsert Received. Type: ${m.type}, Length: ${m.messages.length}`);
            for (const msg of m.messages) {
                await processMessage(userId, sock, msg);
            }
        });

        return sock;

    } catch (err) {
        console.error('[Baileys] Error starting session:', err);
    }
};

const updateSessionStatus = async (userId, status, isConnected, qrCode) => {
    try {
        const [session] = await WhatsAppSession.findOrCreate({
            where: { userId },
            defaults: { sessionId: userId }
        });

        session.status = status;
        session.isConnected = isConnected;
        if (qrCode) session.qrCode = qrCode;

        await session.save();
    } catch (err) {
        console.error('[Baileys] Failed to update session status:', err);
    }
};

const processMessage = async (userId, sock, msg) => {
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isMe = msg.key.fromMe;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || null;

    if (!text || from.includes('status@broadcast') || from.endsWith('@g.us')) return;

    console.log(`[Baileys Debug] Message from ${from}: "${text.substring(0, 50)}..."`);

    await Message.create({
        userId, sessionId: userId, messageId: msg.key.id,
        from, to: isMe ? from : 'me', content: text,
        direction: isMe ? 'outbound' : 'inbound', type: 'text'
    });

    if (isMe) return;

    const config = await AIConfig.findOne({ where: { userId } });
    if (config && config.autoReply && config.apiKey) {
        try {
            await sock.sendPresenceUpdate('composing', from);

            const lastMessages = await Message.findAll({
                where: { userId, from: [from, 'me'], to: [from, 'me'] },
                order: [['createdAt', 'DESC']],
                limit: 10
            });

            const history = lastMessages.reverse().map(m => ({
                role: m.direction === 'inbound' ? 'user' : 'assistant',
                content: m.content
            }));

            const reply = await generateAIResponse(
                config.aiProvider, config.apiKey, config.aiModel,
                config.customPrompt, { text, history }
            );

            await sock.sendMessage(from, { text: reply });

            await Message.create({
                userId, sessionId: userId, messageId: 'AI-' + Date.now(),
                from: 'me', to: from, content: reply,
                direction: 'outbound', type: 'text', isAIResponse: true
            });
        } catch (err) {
            console.error('[Baileys] AI Reply Error:', err);
        }
    }
};

const getSession = (userId) => sessions[userId];

module.exports = { startSession, getSession };
