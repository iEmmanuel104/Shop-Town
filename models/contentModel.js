module.exports = (sequelize, DataTypes) => {
    const Ksocial = sequelize.define("Ksocial", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        contentUrl: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false
        },
        caption: {
            type: DataTypes.STRING,
        },
        postType: {
            type: DataTypes.ENUM('ksocial', 'status'),
            defaultValue: 'ksocial',
        },
        likesCount: {
            type: DataTypes.VIRTUAL,
            get() {
                 if (this.postActivities === undefined) return 0;
                // RETURN all the post activities with like = true
                return this.postActivities.filter((activity) => activity.like === true)
                    .length;            }
        },
        commentsCount: {
            type: DataTypes.VIRTUAL,
            get() {
                 if (this.postActivities === undefined) return 0;
                // Return all the comments when comment is not null
                return this.postActivities.filter(
                    (activity) =>
                        activity.comment !== null && activity.comment !== ""
                ).length;
            }
        }
    }, {
        tableName: 'Ksocial',
        timestamps: true,
    });

    const PostActivity = sequelize.define("PostActivity", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        comment: { type: DataTypes.STRING},
        like: { 
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'PostActivity',
        timestamps: true,
    });

    Ksocial.associate = (models) => {
        Ksocial.hasMany(models.PostActivity, {
            foreignKey: "KsocialId",
            as: "postActivities",
            onDelete: "CASCADE",
        });
        Ksocial.belongsTo(models.Brand, {
            foreignKey: "storeId",
            onDelete: "CASCADE",
        });
    };

    PostActivity.associate = (models) => {
        PostActivity.belongsTo(models.Ksocial, {
            foreignKey: "KsocialId",
            onDelete: "CASCADE",
        });
        PostActivity.belongsTo(models.User, {
            foreignKey: "userId",
            onDelete: "CASCADE",
        });
    };


    return { Ksocial, PostActivity };
}
