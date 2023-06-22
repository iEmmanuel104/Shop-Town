const bcrypt = require('bcryptjs');
const Op = require('sequelize').Op;

module.exports = (sequelize, DataTypes) => {

    // imports
    const { Wallet } = require('./walletModel')(sequelize, DataTypes);
    // const { Cart } = require('./storeModel');

    //  ======  User Model  ====== //
    const User = sequelize.define("User", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fullName: {
            type: DataTypes.VIRTUAL,
            get() {
                return `${this.firstName} ${this.lastName}`
            },
            set(value) {
                throw new Error('Do not try to set the `fullName` value!')
            }
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            validate: {
                isEmail: true,
                notNull: {
                    msg: "Please enter a valid Email address"
                }
            },
            allowNull: false,
            set(value) {
                this.setDataValue('email', value.toLowerCase());
            }
        },
        role: {
            type: DataTypes.ENUM(["super_admin", "admin", "vendor", "guest"]),
            defaultValue: "guest",
            allowNull: false,
            validate: {
                isIn: {
                    args: [["super_admin", "admin", "vendor", "guest"]],
                    msg: "invalid Role input: Please select correct option"
                }
            }
        },
        address: { type: DataTypes.STRING },
        phone: {
            type: DataTypes.BIGINT,
            unique: {
                args: true,
                msg: 'Phone number already in use!'
            },
            validate: {
                len: {
                    args: [10, 15],
                    msg: 'Phone number should be between 10 and 15 digits!'
                },
                isNumeric: {
                    msg: 'Please enter a valid numeric Phone number!'
                }
            }
        },
        status: {
            type: DataTypes.ENUM(["ACTIVE", "INACTIVE"]),
            defaultValue: "INACTIVE",
            allowNull: false
        },
        terms: {
            type: DataTypes.ENUM(["on", "off"]),
            defaultValue: "off",
            validate: {
                isIn: {
                    args: [["on", "off"]],
                    msg: "invalid Terms inout: Please select correct option"
                }
            }
        },
        googleId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        facebookId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        vendorMode: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        isActivated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        profileImage: { type: DataTypes.STRING },
    }, {
        tableName: 'User',
        timestamps: true,

        scopes: {
            verified: {
                where: {
                    status: 'ACTIVE',
                    isActivated: true,
                },
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'status', 'vendorMode', 'createdAt', 'updatedAt']
            }
        },
        hooks: {
            beforeCreate: (user) => {
                user.email = user.email.toLowerCase();
            },
            beforeUpdate: (user) => {
                user.email = user.email.toLowerCase();
            },
            beforeFind: (options) => {
                if (options.where && options.where.email) {
                    options.where.email = options.where.email.toLowerCase();
                }
            },
            beforeCreate: (record, options) => {
                record.dataValues.createdAt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
                record.dataValues.updatedAt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
            },
            beforeUpdate: (record, options) => {
                record.dataValues.updatedAt = new Date().toISOString().replace(/T/, ' ').replace(/\..+/g, '');
            }
        },
    });

    //  ======  Brand Model  ====== //
    const Brand = sequelize.define("Brand", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            // unique: {
            //     args: true,
            //     msg: 'Store name already in use!'
            // },
            allowNull: false
        },
        socials: {
            type: DataTypes.JSONB,
            defaultValue: {},
            allowNull: false
        },
        businessPhone: {
            type: DataTypes.BIGINT,
            unique: {
                args: true,
                msg: 'Business Phone number provided already in use!' 
            },
            allowNull: false
        },
        industry: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        owner: { type: DataTypes.STRING },
        isDisabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        logo: { type: DataTypes.STRING }
    }, {
        tableName: 'Brand',
        timestamps: true,
        scopes: {
            includeProducts: {
                include: [{
                    model: 'Product',
                    as: 'products'
                }]
            },
            includeUsers: {
                include: [{
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'email', 'status'],
                    through: {
                        attributes: ['role']
                    }
                }]
            }
        }
    });

    // ======  UserBrand Model  ====== //
    const UserBrand = sequelize.define("UserBrand", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        UserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        BrandId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM(["owner", "staff"]),
            defaultValue: "staff",
            allowNull: false,
            validate: {
                isIn: {
                    args: [["owner", "staff"]],
                    msg: "invalid Role input: Please select correct option"
                }
            }
        },
    }, {
        tableName: 'UserBrand',
        timestamps: true,
    });

    //  ======  Password Model  ====== //
    const Password = sequelize.define("Password", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
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
        // hooks: {
        //     beforeFind: async (options) => {
        //         const now = new Date();
        //         options.where = {
        //             ...options.where,
        //             expiry: { [Op.lt]: now }
        //         };
        //         const expiredTokens = await BlacklistedTokens.findAll(options);
        //         if (expiredTokens.length > 0) {
        //             await BlacklistedTokens.destroy({ where: { id: expiredTokens.map(token => token.id) } });
        //         }
        //     }
        // },        
    });

    const DeliveryAddress = sequelize.define("DeliveryAddress", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        address: { type: DataTypes.STRING, allowNull: false },
        city: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING, allowNull: false },
        country: { type: DataTypes.STRING, allowNull: false },
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
        }
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

    User.addScope('fulldetails', {
        include: [
            {
                model: DeliveryAddress,
                as: 'DeliveryAddresses',
                where: {
                    isDefault: true,
                },
                attributes: ['id', 'address', 'city', 'state', 'country', 'postal', 'phone', 'type', 'addressCode']
            },
            { model: Wallet, as: 'Wallet', attributes: ['id', 'amount', 'type', 'currency', 'isActive'] },
            // { model: Cart, as: 'Cart', attributes: ['items', 'checkoutData', 'totalAmouny'] },
        ]
    });



    //  =========== ASSOCIATIONS =========== //

    //  =========== USER ASSOCIATIONS =========== //
    User.associate = (models) => {
        User.hasOne(models.Password, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasOne(models.Token, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasMany(models.Order, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.belongsToMany(models.Brand, {
            through: models.UserBrand,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasOne(models.Cart, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasMany(models.DeliveryAddress, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasOne(models.Wallet, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasMany(models.PostActivity, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
        });
    };


    Brand.associate = (models) => {
        Brand.hasMany(models.Product, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            foreignKey: 'storeId',
            as: 'products'
        });
        Brand.belongsToMany(models.User, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            through: models.UserBrand,
        });
        Brand.hasOne(models.DeliveryAddress, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            foreignKey: 'storeId',
            as: 'deliveryAddress'
        });
        Brand.hasMany(models.StoreDiscount, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            foreignKey: 'storeId',
            as: 'storeDiscounts'
        });
        Brand.hasOne(models.Wallet, {
            foreignKey: 'storeId',
            as: 'storewallet',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        Brand.hasMany(models.Ksocial, {
            foreignKey: 'storeId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

    };

    // ================ USERBRAND ================//
    UserBrand.associate = (models) => {
        UserBrand.belongsTo(models.User)
        UserBrand.belongsTo(models.Brand, { foreignKey: 'storeId' })
    }

    //  =========== PASSWORD ASSOCIATIONS =========== //
    Password.associate = (models) => {
        Password.belongsTo(models.User, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    //  =========== TOKEN ASSOCIATIONS =========== //
    Token.associate = (models) => {
        Token.belongsTo(models.User, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

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

    return { User, Brand, Password, Token, BlacklistedTokens, UserBrand, DeliveryAddress };
};


