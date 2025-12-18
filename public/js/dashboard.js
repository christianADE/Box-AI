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
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        const badge = document.getElementById('connection-status');
        const dot = document.getElementById('status-dot');
        const qrContainer = document.getElementById('qr-display');

        if (data.data.isConnected) {
            badge.textContent = 'ConnectAc';
            dot.className = 'dot dot-connected';
            qrContainer.innerHTML = '<div style="text-align: center;"><p style="color: #10b981; font-size: 4rem; margin: 0;">✓</p><p style="color: #64748b;">ConnectAc avec succA¨s</p></div>';
        } else {
            badge.textContent = 'DAcconnectAc';
            dot.className = 'dot dot-disconnected';

            // If disconnected, try to get QR
            const qrRes = await fetch(`${API_URL}/whatsapp/qr`, { headers });
            if (qrRes.ok) {
                const qrData = await qrRes.json();
                if (qrData.success && qrData.data && qrData.data.qr) {
                    qrContainer.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = qrData.data.qr;
                    img.alt = 'Scan Me';
                    qrContainer.appendChild(img);
                }
            } else if (qrRes.status === 202) {
                qrContainer.innerHTML = '<p style="color: #64748b;">Initialisation...</p>';
            }
        }
    } catch (err) {
        console.error('Status check failed', err);
    }
}

async function loadConfig() {
    try {
        const res = await fetch(`${API_URL}/ai/config`, { headers });
        if (!res.ok) throw new Error('Network response was not ok');
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
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        const container = document.getElementById('chat-history');

        if (data.success && data.data.messages.length > 0) {
            container.innerHTML = '';
            data.data.messages.reverse().forEach(msg => {
                const isOutbound = msg.direction === 'outbound' || msg.isAIResponse;
                const div = document.createElement('div');
                div.className = `message ${isOutbound ? 'msg-sent' : 'msg-received'}`;

                const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const sender = msg.isAIResponse ? '🤖 IA' : (msg.direction === 'outbound' ? 'Moi' : msg.from.split('@')[0]);

                div.innerHTML = `
                    <div class="msg-meta">
                        ${sender} • ${time}
                    </div>
                    <div class="msg-content">${msg.content}</div>
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

// Compatibility Alias for reported error
async function fetchDashboardData() {
    console.log('[Debug] fetchDashboardData called');
    return await checkStatus();
}

