const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const AIConfig = sequelize.define('AIConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: User,
            key: 'id'
        }
    },
    apiKey: {
        type: DataTypes.STRING,
        allowNull: true, // User might not set it immediately
    },
    aiProvider: {
        type: DataTypes.ENUM('gpt', 'gemini', 'groq'),
        defaultValue: 'gpt',
    },
    aiModel: {
        type: DataTypes.STRING,
        defaultValue: 'gpt-3.5-turbo',
    },
    temperature: {
        type: DataTypes.FLOAT,
        defaultValue: 0.7,
    },
    customPrompt: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    responseLanguage: {
        type: DataTypes.STRING,
        defaultValue: 'fr',
    },
    autoReply: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    timestamps: true,
});

// Association
User.hasOne(AIConfig, { foreignKey: 'userId', as: 'aiConfig' });
AIConfig.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = AIConfig;
