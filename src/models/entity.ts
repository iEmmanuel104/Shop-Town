'use strict';

import { Model, Sequelize } from 'sequelize';
import { Users, Tenants, LabelAdmins,
        TenantUsers, Artists, ArtistUsers,
        AccountDetail, Restrictions } from '../interface/Attributes';
import { v4 as uuidv4 } from 'uuid';

module.exports = (sequelize: any, DataTypes: any) => {
 
    // Tenant Table
    class Tenant extends Model<Tenants> implements Tenants {
        declare id: number;
        declare uid: string;
        declare name: string;
        declare info: string | null;
        declare user: string | null;
        declare email: string | null;
        declare links: object | null;
        declare bigqueryDataset: string | null;
        declare labeldetail: object | null;

        static associate(models: any) {
            Tenant.belongsToMany(models.User, { through: models.TenantUser });
            Tenant.hasMany(models.TenantUser);
            Tenant.hasMany(models.Artist);
            Tenant.hasMany(models.Product)
        }
    }
    Tenant.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            uid: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            info: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            user: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            email: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    isEmail: true,
                },
            },
            links: {
                type: DataTypes.JSON,
                allowNull: true,
            },
            bigqueryDataset: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            labeldetail: {
                type: DataTypes.JSONB,
                allowNull: true,
                defaultValue: {}
            }

        },
        {
            sequelize,
            modelName: 'Tenant',
            // order the results to return the most recently created tenant first
            // defaultScope: {
            //     order: [['createdAt', 'DESC']],
            // },
        }
    );
    
    // User Table   
    class User extends Model<Users> implements Users {
        declare id: string;
        declare externalId: string | null;
        declare firstName: string;
        declare lastName: string;
        declare email: string;
        declare phone: string;
        declare country: string;
        declare profileImg: string;
        declare ipi: string;
        declare role: 'admin' | 'label_admin' | 'main_admin' | 'super_admin' | 'main_super_admin' | 'artist' | 'guest';
        declare isVerified: boolean;
        declare hasPassword: boolean;
        declare isActive: boolean;
        declare fullName: string; // virtual field

        static associate(models: any) {
            User.belongsToMany(models.Tenant, { through: models.TenantUser })
            User.hasMany(models.TenantUser)
            User.belongsToMany(models.Artist, { through: models.ArtistUser })
            User.hasMany(models.ArtistUser)
            User.hasMany(models.Payment)
            User.hasMany(models.Expense, {
                foreignKey: 'expenseableId',
                constraints: false,
                scope: { expenseableType: 'user' }
            })
            User.belongsToMany(models.Split, { through: models.SplitShare })
            User.hasMany(models.SplitShare)
            User.belongsToMany(models.AccountingSplit, { through: models.AccountingSplitShare })
            User.hasMany(models.AccountingSplitShare)
            User.hasOne(models.AccountDetails)     
            User.hasOne(models.Token)   
        }
    };
    User.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        externalId: {type: DataTypes.STRING },
        firstName: { type: DataTypes.STRING },
        lastName: { type: DataTypes.STRING },
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
                isEmail: true
            }
        },
        profileImg: DataTypes.STRING,
        phone: DataTypes.STRING,
        country: DataTypes.STRING,
        ipi: DataTypes.STRING,
        role: {
            type: DataTypes.ENUM,
            values: ['admin', 'label_admin', 'main_admin', 'super_admin', 'main_super_admin', 'artist', 'guest'],
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        hasPassword: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },                                                                                                                                                                                                                                                  
    }, {
        sequelize,
        modelName: 'User',
        // order the results to return the most recently created tenant first
        // defaultScope: {
        //     order: [['createdAt', 'DESC']],
        // },
    });

    // Label Admin Table
    class LabelAdmin extends Model<LabelAdmins> implements LabelAdmins {
        declare id: string;
        declare userId: string;
        declare tenantId: string;
        declare userType: string[];
        static associate(models: any) {
            // define association here
        }
    };
    LabelAdmin.init({
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        accountDetails: { type: DataTypes.UUID, },
        userType: DataTypes.ARRAY(DataTypes.STRING),
    }, {
        sequelize,
        modelName: 'LabelAdmin',
        timestamps: false,
        // scopes: {
        //     withSecret: {
        //         attributes: {},
        //     }
        // }
    });

    // Tenant User Junction Table
    class TenantUser extends Model<TenantUsers> implements TenantUsers {
        declare UserId: string;
        declare TenantId: number;
        declare userType: string[];
        declare nickName: string | undefined;
        declare paymentsettings: { [key: string]: any; } | undefined;
        declare lastLogin: Date | undefined;
        declare permissions: { [key: string]: any; } | undefined;
        static associate(models: any) {
            TenantUser.belongsTo(models.Tenant)
            TenantUser.belongsTo(models.User)        
        }
    }
    TenantUser.init({
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: Tenant,
                key: 'id'
            },
            allowNull: false
        },
        UserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        nickName: DataTypes.STRING,
        paymentsettings: DataTypes.JSON,
        userType: DataTypes.ARRAY(DataTypes.STRING),
        lastLogin: DataTypes.DATE,
        permissions: DataTypes.JSONB
    }, {
        sequelize,
        modelName: 'TenantUser',
        timestamps: false,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'tenant_users',
                using: 'BTREE',
                fields: ['TenantId', 'UserId']
            }
        ]
    })

    // Artist Table
    class Artist extends Model<Artists> implements Artists {
        declare id: string;
        declare TenantId: number;
        declare label: string | undefined;
        declare copyright: string | undefined;
        declare publisher : string | undefined;
        declare artistImg: string | undefined;
        declare externalId: string | undefined;
        declare artistName: string;
        declare signDate: Date | undefined;
        declare links: { [key: string]: string; } | undefined;
        declare split: { [key: string]: string | number; } | undefined;
        declare contributors: { [key: string]: string; } | undefined;
        static associate(models: any) {
            Artist.belongsTo(models.Tenant);
            Artist.belongsToMany(models.User, { through: models.ArtistUser });
            Artist.hasMany(models.ArtistUser);
            Artist.hasMany(models.Revenue);
            Artist.hasMany(models.Expense, {
                foreignKey: 'expenseableId',
                constraints: false,
                scope: { expenseableType: 'artist' }
            })
            Artist.belongsToMany(models.Asset, { through: models.ArtistAsset })
            Artist.hasMany(models.ArtistAsset)
            Artist.belongsToMany(models.Product, { through: models.ArtistProduct })
            Artist.hasMany(models.ArtistProduct)
        }
    }
    Artist.init({
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: Tenant,
                key: 'id'
            },
            allowNull: false
        },
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        label: DataTypes.STRING,
        publisher: DataTypes.STRING,
        artistImg: DataTypes.STRING,
        copyright: DataTypes.STRING,
        externalId: DataTypes.STRING,
        contributors: DataTypes.JSONB,
        artistName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        signDate: DataTypes.DATEONLY,
        links: DataTypes.JSON,
        split: DataTypes.JSONB  // { [userID (UUID4) : share (FLOAT)] }
    }, {
        sequelize,
        modelName: 'Artist',
        // paranoid: true,
        // timestamps: false,
        // order the results to return the most recently created tenant first
        // defaultScope: {
        //     order: [['createdAt', 'DESC']],
        // },
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'tenant_artists',
                using: 'BTREE',
                fields: ['TenantId', 'id']
            },
            {
                name: 'tenant_artistnames',
                unique: true,
                using: 'BTREE',
                fields: ['TenantId', 'artistName']
            }
        ]
    })

    // Artist User Junction Table
    class ArtistUser extends Model<ArtistUsers> implements ArtistUsers {
        declare UserId: string;
        declare ArtistId: string;
        declare TenantId: number;
        static associate(models: any) {
            ArtistUser.belongsTo(models.Artist)
            ArtistUser.belongsTo(models.User)        
        }
    } 
    ArtistUser.init({
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: Tenant,
                key: 'id'
            },
            allowNull: false
        },
        ArtistId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        UserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        // priviledges: DataTypes.ARRAY(DataTypes.STRING)
    }, {
        sequelize,
        modelName: 'ArtistUser',
        timestamps: false,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'artists_users',
                using: 'BTREE',
                fields: ['TenantId', 'ArtistId', 'UserId']
            }
        ]
    })  
    
    // Account Details Table
    class AccountDetails extends Model<AccountDetail> implements AccountDetail {
        declare id: string;
        declare accountName: string;
        declare bankName: string;
        declare accountNumber: string;
        static associate(models: any) {
            AccountDetails.belongsTo(models.User)        
        }
    } 
    AccountDetails.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        accountName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        bankName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        accountNumber: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'AccountDetails',
        timestamps: false,
        // do not cange table name
        freezeTableName: true,
    })            

    // Restriction Table
    class Restriction extends Model<Restrictions> implements Restrictions {
        declare id: string;
        declare userId: string;
        declare permissions: string[];
        declare restrictions: string[];

        static associate(models: any) {
            // define association here
        }
    } Restriction.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            references: {
                model: User,
                key: 'id'
            }
        },
        // Format: "HTTP_METHOD FULL_URL" e.g "GET /api/v1/users"
        permissions: {
            type: DataTypes.ARRAY(DataTypes.STRING),
        },
        // Format: "HTTP_METHOD FULL_URL" e.g "GET /api/v1/users"
        restrictions: {
            type: DataTypes.ARRAY(DataTypes.STRING),
        }
    }, {
        sequelize,
        modelName: 'Restriction',
    });
    
    return { User, Tenant, LabelAdmin, TenantUser, Artist, ArtistUser, AccountDetails, Restriction }     
};
