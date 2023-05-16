const bcrypt = require('bcryptjs');
const Op = require('sequelize').Op;

module.exports = (sequelize, DataTypes) => {

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
    }, {
        tableName: 'User',
        timestamps: true,

        scopes: {
            active: {
                where: {
                    status: 'ACTIVE'
                }
            },
            verified : {
                where: {
                    isActivated: true
                }
            }
        },

        // indexes : [
        //     {
        //         unique: true,
        //         fields: ['email']
        //     }, {
        //         unique: true,
        //         fields: ['phone']
        //     }
        // ],

        // hooks: {
        //     afterCreate(user, options) {
        //         user.createPassword({
        //             password: user.password
        //         });
        //     },
        // },
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
            allowNull: false
        },
        socials: {
            type: DataTypes.JSONB,
            defaultValue: {},
            allowNull: false
        },
        businessPhone: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        industry: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        owner: { type: DataTypes.STRING },
        country: { type: DataTypes.STRING },
        address: { type: DataTypes.STRING },
        state: { type: DataTypes.STRING },
        city: { type: DataTypes.STRING },
        postal: { type: DataTypes.INTEGER },
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
                    attributes: ['id', 'firstName', 'lastName', 'status'],
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
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
    }, {
        tableName: 'DeliveryAddress',
        timestamps: true,
    });

    DeliveryAddress.addHook('beforeSave', async (address, options) => {
        if (address.changed('isDefault') && address.isDefault) {
            // Find all other delivery addresses for this user and update their isDefault field to false
            await DeliveryAddress.update(
                { isDefault: false },
                {
                    where: {
                        userId: address.userId,
                        id: { [Op.ne]: address.id },
                    },
                    transaction: options.transaction,
                }
            );
        }
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
        User.hasMany(models.Content, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasMany(models.Order, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }); 
        User.belongsToMany(models.Brand, {
            through: models.UserBrand,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasOne(models.Cart, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
        User.hasMany(models.DeliveryAddress, {
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

    };


    Brand.associate = (models) => {
        Brand.hasMany(models.Product, {
            foreignKey: 'brandId',
            as: 'products'
        });
        Brand.belongsToMany(models.User, {
            through: models.UserBrand,
        });
        Brand.hasOne(models.Content, {
            foreignKey: 'refId',
            as: 'brand'
        });
    };

    // ================ USERBRAND ================//
    UserBrand.associate = (models) => {
        UserBrand.belongsTo(models.User)
        UserBrand.belongsTo(models.Brand)
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
    };

    return { User, Brand, Password, Token, BlacklistedTokens, UserBrand, DeliveryAddress };
};


