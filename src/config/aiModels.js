/**
 * Supported AI models per provider and helpers
 */

const MODELS = {
    groq: [
        'llama-3.3-70b-versatile',
        'llama-3.3-70b-instruct',
        'llama-3.3-16b',
    ],
    gemini: [
        'gemini-flash-latest',
        'gemini-1.5',
    ],
    gpt: [
        'gpt-3.5-turbo',
        'gpt-4'
    ]
};

const DEFAULTS = {
    groq: 'llama-3.3-70b-versatile',
    gemini: 'gemini-flash-latest',
    gpt: 'gpt-3.5-turbo'
};

function isSupported(provider, model) {
    if (!provider || !model) return false;
    const list = MODELS[provider];
    if (!list) return false;
    return list.includes(model);
}

function getDefault(provider) {
    return DEFAULTS[provider] || DEFAULTS.gpt;
}

module.exports = { MODELS, DEFAULTS, isSupported, getDefault };
