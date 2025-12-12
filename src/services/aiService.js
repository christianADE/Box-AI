const axios = require('axios');

/**
 * Generate response from AI Provider
 * @param {string} provider - 'gpt' or 'gemini'
 * @param {string} apiKey - API Key
 * @param {string} model - Model name (e.g. 'gpt-3.5-turbo', 'gemini-pro')
 * @param {string} systemPrompt - Custom instruction
 * @param {string} userMessage - User's message
 */
const generateAIResponse = async (provider, apiKey, model, systemPrompt, userMessage) => {
    try {
        if (provider === 'gpt') {
            return await generateGPTResponse(apiKey, model, systemPrompt, userMessage);
        } else if (provider === 'gemini') {
            return await generateGeminiResponse(apiKey, model, systemPrompt, userMessage);
        } else if (provider === 'groq') {
            return await generateGroqResponse(apiKey, model, systemPrompt, userMessage);
        } else {
            throw new Error('Invalid AI Provider');
        }
    } catch (error) {
        console.error('AI Service Error:', error.response?.data || error.message);
        return 'Désolé, je ne peux pas répondre pour le moment.';
    }
};

const generateGPTResponse = async (apiKey, model, systemPrompt, userMessage) => {
    const url = 'https://api.openai.com/v1/chat/completions';
    const data = {
        model: model || 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: userMessage }
        ],
        temperature: 0.7
    };

    const response = await axios.post(url, data, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content;
};

const generateGeminiResponse = async (apiKey, model, systemPrompt, userMessage) => {
    // Simple implementation for Gemini REST API
    // Note: Actual Gemini API might differ slightly depending on version (v1/v1beta)

    // Auto-correct model name if it's set to GPT, empty, or old/quota-limited models
    // 'gemini-2.0-flash' gave 429 (Limit 0). 'gemini-1.5-flash' gave 404.
    // Using 'gemini-flash-latest' which was listed in available models.
    let modelName = model;
    if (!modelName || modelName.includes('gpt') || modelName === 'gemini-pro' || modelName.includes('2.0-flash')) {
        modelName = 'gemini-flash-latest';
    }

    const history = userMessage.history || []; // Expect history array
    const currentMessage = userMessage.text || userMessage; // Handle object or string

    console.log(`[AI Service] Generating Gemini response. Model: ${modelName}. History Length: ${history.length}`);
    modelName = modelName.replace('models/', '');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    // Construct contents array with history
    const contents = [];

    // Add system prompt as the first user part or system instruction (depending on model support, but User part is safest for now)
    if (systemPrompt) {
        // Enforce human-like behavior
        const humanizer = "\n\nIMPORTANT: Tu dois agir comme un HUMAIN sur WhatsApp. Règles absolues :\n1. Tes réponses doivent être COURTES (1-2 phrases max).\n2. Pas de listes à puces, pas de formalisme.\n3. Écris comme on parle (pas de 'Bonjour, je suis...', sois direct).\n4. Si la réponse est simple, réponds en 3 mots.\n5. NE DIS JAMAIS que tu es une IA.";

        contents.push({
            role: 'user',
            parts: [{ text: `System Instruction: ${systemPrompt}${humanizer}` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "Ok." }] // Short fake acknowledgement
        });
    }

    // Add conversation history
    history.forEach(msg => {
        contents.push({
            role: msg.role === 'inbound' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        });
    });

    // Add current message
    contents.push({
        role: 'user',
        parts: [{ text: currentMessage }]
    });

    const data = { contents };

    // const data = { contents }; // Removed duplicate

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.candidates && response.data.candidates.length > 0) {
                return response.data.candidates[0].content.parts[0].text;
            }
            return "No response from Gemini.";

        } catch (error) {
            // If Rate Limit Exceeded (429)
            if (error.response && error.response.status === 429) {
                retryCount++;
                if (retryCount > maxRetries) throw error;

                const waitTime = 2000 * retryCount; // Wait 2s, 4s, 6s...
                console.log(`[AI Service] Rate limit hit (429). Retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw error; // Other errors, throw immediately
            }
        }
    }
};

const generateGroqResponse = async (apiKey, model, systemPrompt, userMessage) => {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });

    const history = userMessage.history || [];
    const currentMessage = userMessage.text || userMessage;

    const messages = [];

    if (systemPrompt) {
        // Enforce human-like behavior
        const humanizer = "\n\nIMPORTANT: Tu dois agir comme un HUMAIN sur WhatsApp. Règles absolues :\n1. Tes réponses doivent être COURTES (1-2 phrases max).\n2. Pas de listes à puces, pas de formalisme.\n3. Écris comme on parle (pas de 'Bonjour, je suis...', sois direct).\n4. Si la réponse est simple, réponds en 3 mots.\n5. NE DIS JAMAIS que tu es une IA.";

        messages.push({ role: 'system', content: `${systemPrompt}${humanizer}` });
    }

    // Add conversation history
    history.forEach(msg => {
        messages.push({
            role: msg.role === 'inbound' ? 'user' : 'assistant',
            content: msg.content
        });
    });

    messages.push({ role: 'user', content: currentMessage });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: model || 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 1024,
        });
        return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
        console.error('Groq API Error:', error);
        return "Désolé, je ne peux pas répondre pour le moment.";
    }
};

module.exports = {
    generateAIResponse
};
