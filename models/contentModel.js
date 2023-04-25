module.exports = (sequelize, DataTypes) => {
    const Content = sequelize.define("Content", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        refId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM([ "audio", "video", "image", "file" ]),
            defaultValue: "image",
            allowNull: false
        },
        contentUrl: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false
        }
    }, {
        tableName: 'Content',
        timestamps: true,
    });

    const Post = sequelize.define("Post", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
        tableName: 'Post',
        timestamps: true,
    });

    Content.associate = models => {
        Content.belongsTo(models.User, {
            foreignKey: 'refId',
            as: 'user'
        });
        Content.belongsTo(models.Product, {
            foreignKey: 'refId',
            as: 'product'
        });
        Content.belongsTo(models.Brand, {
            foreignKey: 'refId',
            as: 'brand'
        });
        Content.belongsTo(models.Category, {
            foreignKey: 'refId',
            as: 'category'
        });
        Content.belongsTo(models.Post, {
            foreignKey: 'refId',
            as: 'post'
        });
    };

    Post.associate = models => {
        Post.hasMany(models.Content, {
            foreignKey: 'refId',
            as: 'contents'
        });
    };

    return { Content, Post}
}