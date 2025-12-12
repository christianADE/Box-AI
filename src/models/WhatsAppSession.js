const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const WhatsAppSession = sequelize.define('WhatsAppSession', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true, // One session per user
        references: {
            model: User,
            key: 'id'
        }
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    qrCode: {
        type: DataTypes.TEXT, // Base64
        allowNull: true,
    },
    sessionData: {
        type: DataTypes.TEXT, // Using JSON string or similar if needed for complex storage, though usually file system or auth store is distinct.
        allowNull: true,
    },
    isConnected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'disconnected',
    },
    lastActivity: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    timestamps: true,
});

// Association
User.hasOne(WhatsAppSession, { foreignKey: 'userId', as: 'whatsappSession' });
WhatsAppSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = WhatsAppSession;
