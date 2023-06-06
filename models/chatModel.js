module.exports = (sequelize, DataTypes) => {
    const { User } = require('./userModel')(sequelize, DataTypes);
    const { Brand } = require('./userModel')(sequelize, DataTypes);

    const ChatRoom = sequelize.define('ChatRoom', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            references: {
                model: User,
                key: 'id' 
            }
        },
        storeId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: Brand,
                key: 'id'
            }
        },
    }, {
        tableName: 'ChatRoom',
        timestamps: true
    });

    const Message = sequelize.define('Message', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        senderId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            }
        },
        message: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        tableName: 'Message',
        timestamps: true
    });

    // ASSOCIATIONS 
    ChatRoom.associate = models => {
        ChatRoom.hasMany(models.Message, {
            foreignKey: 'chatRoomId',
            as: 'messages'
        });
    };

    Message.associate = models => {
        Message.belongsTo(models.ChatRoom, {
            foreignKey: 'chatRoomId',
            as: 'chatRoom'
        });
    }

    return { ChatRoom, Message };
}