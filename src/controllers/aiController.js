const AIConfig = require('../models/AIConfig');
const apiResponse = require('../utils/apiResponse');
const { generateAIResponse } = require('../services/aiService');
const { isSupported, getDefault } = require('../config/aiModels');

const updateConfig = async (req, res) => {
    console.log('[AI Controller] Update Request Body:', req.body);
    const { apiKey, aiProvider, aiModel, customPrompt, autoReply } = req.body;
    const userId = req.user.id;

    try {
        let config = await AIConfig.findOne({ where: { userId } });
        console.log(`[AI Controller] Found existing config for ${userId}?: ${!!config}`);

        if (config) {
            config.apiKey = apiKey || config.apiKey;

            // If provider is changing, capture it, otherwise keep existing
            const newProvider = aiProvider || config.aiProvider;
            config.aiProvider = newProvider;

            // Validate provided model against provider; if invalid, set provider default
            if (aiModel) {
                if (!isSupported(newProvider, aiModel)) {
                    console.log(`[AI Controller] Provided model '${aiModel}' is not supported for provider '${newProvider}'. Using default.`);
                    config.aiModel = getDefault(newProvider);
                } else {
                    config.aiModel = aiModel;
                }
            } else {
                // No aiModel provided: keep existing if compatible, otherwise set default
                if (!isSupported(newProvider, config.aiModel)) {
                    console.log(`[AI Controller] Existing model '${config.aiModel}' incompatible with provider '${newProvider}', switching to default.`);
                    config.aiModel = getDefault(newProvider);
                }
            }

            config.customPrompt = customPrompt || config.customPrompt;
            config.autoReply = autoReply !== undefined ? autoReply : config.autoReply;
            await config.save();
            console.log('[AI Controller] Config updated successfully.');
        } else {
            console.log('[AI Controller] Creating new config.');

            // If no model provided, use provider default
            const modelToUse = aiModel && isSupported(aiProvider, aiModel) ? aiModel : getDefault(aiProvider);

            config = await AIConfig.create({
                userId,
                apiKey,
                aiProvider,
                aiModel: modelToUse,
                customPrompt,
                autoReply
            });
        }

        return apiResponse(res, 200, true, 'AI Config updated', config);
    } catch (error) {
        console.error('[AI Controller] Error updating config:', error);
        return apiResponse(res, 500, false, 'Server Error: ' + error.message);
    }
};

const getConfig = async (req, res) => {
    try {
        const config = await AIConfig.findOne({ where: { userId: req.user.id } });
        if (!config) {
            return apiResponse(res, 404, false, 'Config not found');
        }
        return apiResponse(res, 200, true, 'AI Config', config);
    } catch (error) {
        return apiResponse(res, 500, false, 'Server Error');
    }
};

const testAI = async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;

    try {
        const config = await AIConfig.findOne({ where: { userId } });
        if (!config || !config.apiKey) {
            return apiResponse(res, 400, false, 'AI Config missing or API Key not set');
        }

        const response = await generateAIResponse(
            config.aiProvider,
            config.apiKey,
            config.aiModel,
            config.customPrompt,
            message
        );

        return apiResponse(res, 200, true, 'AI Response generated', { response });
    } catch (error) {
        return apiResponse(res, 500, false, 'Error generating response', error.message);
    }
};

module.exports = {
    updateConfig,
    getConfig,
    testAI
};
