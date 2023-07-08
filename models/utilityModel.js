const bcrypt = require('bcryptjs');
const Op = require('sequelize').Op;

module.exports = (sequelize, DataTypes) => {

    //  ======  Password Model  ====== //
    const Password = sequelize.define("Password", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        // userId: {
        //     type: DataTypes.UUID,
        //     allowNull: false,
        //     references: {
        //         model: "User",
        //         key: 'id'
        //     }
        // },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        // paranoid: true,
        tableName: 'Password',
        // timestamps: false,
        hooks: {
            beforeCreate(password) {
                password.password = bcrypt.hashSync(password.password, bcrypt.genSaltSync(10));
            },
            beforeUpdate(password) {
                password.password = bcrypt.hashSync(password.password, bcrypt.genSaltSync(10));
            }
        },
    });

    Password.prototype.isValidPassword = function (password) {
        return bcrypt.compareSync(password, this.password);
    };
    Password.prototype.toJSON = function () {
        const values = Object.assign({}, this.get());
        delete values.password;
        return values;
    };

    //  =========== Token Model =========== //
    const Token = sequelize.define("Token", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        passwordResetToken: { type: DataTypes.STRING },
        activationCode: { type: DataTypes.STRING }, // for phone verification 
        verificationCode: { type: DataTypes.STRING }, // for email verification
    }, {
        tableName: 'Token',
        // timestamps: false,                
    });

    const BlacklistedTokens = sequelize.define("BlacklistedTokens", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        token: { type: DataTypes.TEXT, allowNull: false },
        expiry: {
            type: DataTypes.DATE,
            defaultValue: Date.now() + (24 * 60 * 60 * 1000) // 24 hours in milliseconds
        },
    }, {
        tableName: 'BlacklistedTokens',
        timestamps: false,
    });

    const DeliveryAddress = sequelize.define("DeliveryAddress", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        address: {
            type: DataTypes.STRING, allowNull: false,
            set(val) {
                this.setDataValue('address', val.trim().toLowerCase());
            }
        },
        city: {
            type: DataTypes.STRING, allowNull: false,
            set(val) {
                this.setDataValue('city', val.trim().toLowerCase());
            }
        },
        state: {
            type: DataTypes.STRING, allowNull: false,
            set(val) {
                this.setDataValue('state', val.trim().toLowerCase());
            }
        },
        country: {
            type: DataTypes.STRING, allowNull: false,
            set(val) {
                this.setDataValue('country', val.trim().toLowerCase());
            }
        },
        postal: { type: DataTypes.INTEGER },
        phone: { type: DataTypes.BIGINT, allowNull: false },
        type: {
            type: DataTypes.ENUM(["home", "office", "school", "other"]),
            defaultValue: "home",
            allowNull: false,
            validate: {
                isIn: {
                    args: [["home", "office", "school", "other"]],
                    msg: "invalid Type input: Please select correct option"
                }
            }
        },
        addressCode: { type: DataTypes.INTEGER },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
    }, {
        tableName: 'DeliveryAddress',
        timestamps: true,
        scopes: {
            Default(value) {
                let valuq;
                value.type === 'store' ? valuq = 'storeId' : valuq = 'userId';
                return {
                    where: {
                        isDefault: true,
                        [valuq]: value.id
                    }
                }
            }
        },
        indexes: [
            { fields: ['userId'] }, // for user delivery addresses
            { fields: ['storeId'] }, // for store delivery addresses
        ]
    });

    DeliveryAddress.addHook('beforeSave', async (address, options) => {
        if (address.changed('isDefault') && address.isDefault) {
            const whereClause = {};

            if (address.userId) {
                whereClause.userId = address.userId;
            } else if (address.storeId) {
                whereClause.storeId = address.storeId;
            }

            // Find all other delivery addresses for this user or store and update their isDefault field to false
            await DeliveryAddress.update(
                { isDefault: false },
                {
                    where: {
                        ...whereClause,
                        id: { [Op.ne]: address.id },
                    },
                    transaction: options.transaction,
                }
            );
        }
    });

    const AccountDetails = sequelize.define("AccountDetails", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        accountName: {
            type: DataTypes.STRING, allowNull: false,
            set(val) {
                this.setDataValue('accountName', val.trim().toLowerCase());
            }
        },
        accountNumber: { type: DataTypes.STRING, allowNull: false },
        bankName: {
            type: DataTypes.STRING, allowNull: false,
            set(val) {
                this.setDataValue('bankName', val.trim().toLowerCase());
            }
        },
        bankCode: { type: DataTypes.STRING, allowNull: false },
    }, {
        tableName: 'AccountDetails',
        timestamps: true,
    });


    // ==================================== //
    // ============ ASSOCIATIONS =========== //
    // ==================================== //
    // ===========  DELIVERY ADDRESS ASSOCIATIONS   =========== //
    DeliveryAddress.associate = (models) => {
        DeliveryAddress.belongsTo(models.User, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        DeliveryAddress.belongsTo(models.Brand, {
            foreignKey: 'storeId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    //  =========== TOKEN ASSOCIATIONS =========== //
    Token.associate = (models) => {
        Token.belongsTo(models.User, {
            allowNull: false,
            foreignKey: 'userId',
        });
    };

    // =========== PASSWORD ASSOCIATIONS =========== //
    Password.associate = (models) => {
        Password.belongsTo(models.User, {
            foreignKey: 'userId',
        });
    };

    // =========== ACCOUNT DETAIL ASSOCIATIONS =========== //
    AccountDetails.associate = (models) => {
        AccountDetails.belongsTo(models.Brand, {
            foreignKey: 'storeId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    return { Password, Token, BlacklistedTokens, DeliveryAddress, AccountDetails };
};
