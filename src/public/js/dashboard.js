const API_URL = '/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'index.html';
}

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

document.addEventListener('DOMContentLoaded', async () => {
    // Initial Load
    await checkStatus();
    await loadConfig();
    await loadMessages();

    // Poll Status every 5 seconds (reduced from 2s for better performance)
    setInterval(checkStatus, 5000);

    // Event Listeners
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    document.getElementById('refresh-msgs').addEventListener('click', loadMessages);

    document.getElementById('ai-config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveConfig();
    });
});

async function checkStatus() {
    try {
        const res = await fetch(`${API_URL}/whatsapp/status`, { headers });
        const data = await res.json();

        const badge = document.getElementById('connection-status');
        const qrContainer = document.getElementById('qr-display');

        if (data.data.isConnected) {
            badge.textContent = 'Connecté';
            badge.className = 'status-badge status-connected';
            qrContainer.innerHTML = '<p style="color: #22c55e; font-size: 3rem;">✓</p><p>WhatsApp Connecté</p>';
        } else {
            badge.textContent = 'Déconnecté';
            badge.className = 'status-badge status-disconnected';

            // If disconnected, try to get QR
            const qrRes = await fetch(`${API_URL}/whatsapp/qr`, { headers });
            const qrData = await qrRes.json();

            if (qrData.success && qrData.data && qrData.data.qr) {
                // Clear container and show updated QR
                qrContainer.innerHTML = '';

                // Backend returns a Data URI image, so we just display it
                const img = document.createElement('img');
                img.src = qrData.data.qr;
                img.alt = 'Scan Me';
                img.style.width = '100%';
                img.style.maxWidth = '250px';

                qrContainer.appendChild(img);
            } else if (qrRes.status === 202) {
                qrContainer.innerHTML = '<p>Initialisation...</p>';
            }
        }
    } catch (err) {
        console.error('Status check failed', err);
    }
}

async function loadConfig() {
    try {
        const res = await fetch(`${API_URL}/ai/config`, { headers });
        const data = await res.json();

        if (data.success && data.data) {
            const config = data.data;
            document.getElementById('ai-provider').value = config.aiProvider || 'gpt';
            document.getElementById('api-key').value = config.apiKey || '';
            document.getElementById('custom-prompt').value = config.customPrompt || '';
            document.getElementById('auto-reply').checked = config.autoReply;
        }
    } catch (err) {
        console.error('Load config failed', err);
    }
}

async function saveConfig() {
    const aiProvider = document.getElementById('ai-provider').value;
    const apiKey = document.getElementById('api-key').value;
    const customPrompt = document.getElementById('custom-prompt').value;
    const autoReply = document.getElementById('auto-reply').checked;

    console.log('Enregistrement Config:', { aiProvider, apiKey: apiKey ? '***' : 'VIDE', customPrompt, autoReply });

    try {
        const res = await fetch(`${API_URL}/ai/config`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ aiProvider, apiKey, customPrompt, autoReply })
        });
        const data = await res.json();
        if (data.success) {
            alert('Configuration sauvegardée !');
            console.log('Sauvegarde réussie:', data);
        } else {
            alert('Erreur: ' + data.message);
            console.error('Erreur sauvegarde:', data);
        }
    } catch (err) {
        console.error('Erreur technique sauvegarde:', err);
        alert('Erreur technique lors de la sauvegarde');
    }
}

async function loadMessages() {
    try {
        const res = await fetch(`${API_URL}/messages?limit=20`, { headers });
        const data = await res.json();

        const container = document.getElementById('chat-history');

        if (data.success && data.data.messages.length > 0) {
            container.innerHTML = '';
            data.data.messages.reverse().forEach(msg => {
                const div = document.createElement('div');
                div.className = `message-item ${msg.direction === 'outbound' ? 'msg-out' : 'msg-in'} ${msg.isAIResponse ? 'msg-ai' : ''}`;

                const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                div.innerHTML = `
                    <div style="font-size: 0.8rem; margin-bottom: 0.2rem; opacity: 0.8;">
                        ${msg.isAIResponse ? '🤖 IA' : (msg.direction === 'outbound' ? 'Moi' : msg.from.split('@')[0])} 
                        • ${time}
                    </div>
                    <div>${msg.content}</div>
                `;
                container.appendChild(div);
            });
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        }
    } catch (err) {
        console.error('Load messages failed', err);
    }
}
