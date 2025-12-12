const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const WhatsAppSession = require('../models/WhatsAppSession');
const Message = require('../models/Message');
const AIConfig = require('../models/AIConfig');
const { generateAIResponse } = require('./aiService');

// Store active sockets in memory
const sessions = {};

const startSession = async (userId) => {
    try {
        console.log(`[Baileys] Starting session for user ${userId}`);

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
            // Using default browser config from Baileys as per BOT-SMART reference
            // browser: Browsers.ubuntu('Chrome') 
        });

        sessions[userId] = sock;

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        // ---------------- CONNECTION UPDATE ----------------
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            console.log(`[Baileys] Connection update: ${connection}`);

            // Handle QR Code
            if (qr) {
                console.log(`[Baileys] QR Code generated for ${userId}`);
                await updateSessionStatus(userId, 'scanning', false, qr);
            }

            // If connection closed
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                const isCorrupted = reason === 405;
                const isLoggedOut = reason === DisconnectReason.loggedOut;

                await updateSessionStatus(userId, 'disconnected', false, null);

                console.error(`[Baileys] Connection closed. Reason=${reason}`);

                // ----------- Handle corrupted auth (405) -----------
                if (isCorrupted) {
                    console.log('[Baileys] 405 detected. Resetting session...');
                    delete sessions[userId];
                    fs.rmSync(sessionDir, { recursive: true, force: true });

                    setTimeout(() => startSession(userId), 1500);
                    return;
                }

                // ----------- Reconnect if not logged out -----------
                if (!isLoggedOut) {
                    console.log('[Baileys] Reconnecting...');
                    startSession(userId);
                } else {
                    console.log('[Baileys] User logged out. Cleaning session.');
                    delete sessions[userId];
                }
            }

            // Connected
            else if (connection === 'open') {
                console.log('[Baileys] WhatsApp connected successfully.');
                await updateSessionStatus(userId, 'connected', true, null);
            }
        });

        // ---------------- MESSAGE LISTENER ----------------
        sock.ev.on('messages.upsert', async (m) => {
            console.log(`[Baileys Debug] Upsert Received. Type: ${m.type}, Length: ${m.messages.length}`);
            // if (m.type !== 'notify') return; // Temporarily allow all for debugging

            for (const msg of m.messages) {
                console.log(`[Baileys Debug] Raw Message:`, JSON.stringify(msg, null, 2));
                await processMessage(userId, sock, msg);
            }
        });

        return sock;

    } catch (err) {
        console.error('[Baileys] Error starting session:', err);
    }
};

// ---------------------- UPDATE SESSION IN DB ----------------------
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

// ---------------------- PROCESS INCOMING MESSAGE ----------------------
const processMessage = async (userId, sock, msg) => {
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isMe = msg.key.fromMe;

    const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        null;

    if (!text) return;

    // Ignore Status Updates (Broadcasts)
    if (from.includes('status@broadcast')) return;

    // Ignore Group Messages
    if (from.endsWith('@g.us')) {
        console.log(`[Baileys Debug] Message from group ${from} ignored.`);
        return;
    }

    // Log Message Reception for Debugging
    console.log(`[Baileys Debug] Message from ${from}: "${text.substring(0, 50)}..."`);

    // Save message to DB
    await Message.create({
        userId,
        sessionId: userId,
        messageId: msg.key.id,
        from,
        to: isMe ? from : 'me',
        content: text,
        direction: isMe ? 'outbound' : 'inbound',
        type: 'text'
    });

    // Don't reply to self
    if (isMe) {
        console.log('[Baileys Debug] Message is from me, ignoring.');
        return;
    }

    // Fetch AI config
    console.log('[Baileys Debug] Checking AI Config...');
    const config = await AIConfig.findOne({ where: { userId } });

    if (config) {
        console.log(`[Baileys Debug] Config found. AutoReply: ${config.autoReply}, Provider: ${config.aiProvider}, HasKey: ${!!config.apiKey}`);
    } else {
        console.log('[Baileys Debug] No AI Config found for user.');
    }

    if (config && config.autoReply && config.apiKey) {
        try {
            console.log('[Baileys Debug] Sending typing indication...');
            await sock.sendPresenceUpdate('composing', from);

            // Fetch last 10 messages for context
            const lastMessages = await Message.findAll({
                where: {
                    userId,
                    from: [from, 'me'], // Messages between bot and this specific user
                    to: [from, 'me']
                },
                order: [['createdAt', 'DESC']],
                limit: 10
            });

            // Format history (reverse to get chronological order)
            const history = lastMessages.reverse().map(m => ({
                role: m.direction, // 'inbound' or 'outbound'
                content: m.content
            }));

            const reply = await generateAIResponse(
                config.aiProvider,
                config.apiKey,
                config.aiModel,
                config.customPrompt,
                { text: text, history } // Pass object with text and history
            );

            // Send reply
            await sock.sendMessage(from, { text: reply });

            await Message.create({
                userId,
                sessionId: userId,
                messageId: 'AI-' + Date.now(),
                from: 'me',
                to: from,
                content: reply,
                direction: 'outbound',
                type: 'text',
                isAIResponse: true
            });

        } catch (err) {
            console.error('[Baileys] AI Reply Error:', err);
        }
    }
};

// ---------------------- GET SESSION ----------------------
const getSession = (userId) => sessions[userId];

module.exports = {
    startSession,
    getSession
};
