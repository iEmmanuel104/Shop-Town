const { generateCode } = require('../app/utils/StringGenerator');
const { sendverificationEmail, sendForgotPasswordEmail } = require('../app/utils/mailTemplates');
// const { generateWallet } = require('../app/services/wallet.service');

module.exports = (sequelize, DataTypes) => {

    // imports
    const { Wallet } = require('./walletModel')(sequelize, DataTypes);
    const { DeliveryAddress, Token } = require('./utilityModel')(sequelize, DataTypes);
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
        phone: {
            type: DataTypes.BIGINT,
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
            type: DataTypes.ENUM(["active", "inactive"]),
            defaultValue: "inactive",
            allowNull: false
        },
        // terms: {
        //     type: DataTypes.ENUM(["on", "off"]),
        //     defaultValue: "off",
        //     validate: {
        //         isIn: {
        //             args: [["on", "off"]],
        //             msg: "invalid Terms inout: Please select correct option"
        //         }
        //     }
        // },
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
            defaultValue: true,
            allowNull: false
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        // virtual field for address, 
        // this field is not stored in the database
        address: {
            type: DataTypes.VIRTUAL,
            // get() {
            //     return this.getAddresses();
            // },
            set(value) {
                // get the address and set it to the address
                this.setDataValue('address', value);

            }
        },
        profileImage: { type: DataTypes.STRING },
    }, {
        tableName: 'User',
        timestamps: true,
        // specify default scope to check for act
        // defaultScope: {
        //     attributes: { exclude: ['password'] }
        // },

        scopes: {
            verified: {
                where: {
                    status: 'active',
                    isActivated: true,
                    isVerified: true
                },
                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'status', 'vendorMode', 'createdAt', 'updatedAt']
            }
        },
        hooks: {
            beforeCreate: (user) => {
                user.email = user.email.toLowerCase();
                // remove white spaces from email
                user.email = user.email.replace(/\s/g, '');

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
            },
            // send email to user after creating account
            afterCreate: (user) => {
                user.generateAndSendVerificationCode('verify');
            }
        },
        indexes: [
            {
                unique: true,
                fields: ['email']
            }
        ]

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
            unique: {
                args: true,
                msg: 'Store name already in use!'
            },
            allowNull: false
        },
        socials: { type: DataTypes.JSONB },
        businessPhone: {
            type: DataTypes.BIGINT,
            // unique: {
            //     args: true,
            //     msg: 'Business Phone number provided already in use!'
            // },
            validate: {
                len: {
                    args: [10, 15],
                    msg: 'Phone number should be between 10 and 15 digits!'
                },
                isNumeric: {
                    msg: 'Please enter a valid numeric Phone number!'
                }
            },
            allowNull: false
        },
        businessEmail: {
            type: DataTypes.STRING,
            unique: {
                args: true,
                msg: 'Business Email provided already in use!'
            },
            allowNull: false,
            validate: {
                isEmail: {
                    msg: 'Please enter a valid email address!'
                }
            }
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
        logo: { type: DataTypes.STRING },
        storeSettings: {type: DataTypes.JSONB}
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
        },
        indexes: [
            {
                unique: true,
                fields: ['businessEmail']
            }
        ]
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

    User.prototype.generateAndSendVerificationCode = async function (type) {
        let code = await generateCode();


        const { id, email, phone } = this;
        const emailData = { email, phone };
        let emailPromise, codePromise;
        if (type === 'verify') {
            emailPromise = sendverificationEmail(emailData, code);
            codePromise = { verificationCode: code };
        } else {
            emailPromise = sendForgotPasswordEmail(emailData, code);
            codePromise = { passwordResetToken: code };
        }

        await Promise.all([
            Token.findOne({ where: { userId: id } }).then((token) => {
                if (token) {
                    token.update(codePromise);
                } else {
                    Token.create({ userId: id, ...codePromise });
                }
            }),
            emailPromise
        ]);

        return code;
    };




    // ======================================= //
    // ============ ASSOCIATIONS ============= //
    // ======================================= //

    //  =========== USER ASSOCIATIONS =========== //
    User.associate = (models) => {
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
            foreignKey: 'userId',
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
        User.hasOne(models.Password, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
        });
        User.hasOne(models.Token, {
            foreignKey: 'userId',
            onDelete: 'CASCADE',
        });
    };

    //  =========== BRAND ASSOCIATIONS =========== //
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
        Brand.hasMany(models.AccountDetails, {
            foreignKey: 'storeId',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

    };

    // ================ USERBRAND ================//
    UserBrand.associate = (models) => {
        UserBrand.belongsTo(models.User)
        UserBrand.belongsTo(models.Brand)
    };

    return { User, Brand, UserBrand };
};


