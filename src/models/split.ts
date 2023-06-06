'use strict';

import { Model } from 'sequelize';

import {
    Splits, 
    SplitShares, 
    AccountingSplits, 
    AccountingSplitShares
} from '../interface/Attributes';


module.exports = (sequelize: any, DataTypes: any) => {
    // Helper function
    const uppercaseFirst = (str: string): string => `${str[0].toUpperCase()}${str.substring(1)}`;
     
    // Split Table
    class Split extends Model<Splits> implements Splits {
        declare TenantId: number;
        declare id: string;
        declare ProductId: string;
        declare AssetId: string;
        declare name: string;
        declare type: ' ' | 'Publishing' | 'YouTube' | 'Live';
        declare period: [Date, Date];
        declare contract: boolean;
        declare ContractId: string;
        declare conditions: { Include: string[]; Exclude: string[] };

        static associate(models: any) {
            // define association here
            Split.belongsTo(models.Product)
            Split.belongsTo(models.Asset)
            Split.belongsToMany(models.User, { through: SplitShare })
            Split.hasMany(models.SplitShare) 
        }
    }
    Split.init({

        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Tenants',
                key: 'id'
            },
            allowNull: false
        },
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        ProductId: DataTypes.UUID,
        AssetId: DataTypes.UUID,
        name: DataTypes.STRING,
        type: DataTypes.STRING, // ' ', Publishing, YouTube, Live?
        period: DataTypes.RANGE(DataTypes.DATEONLY),

        contract: DataTypes.BOOLEAN,
        ContractId: DataTypes.UUID,
        conditions: DataTypes.JSON  // { {'Include': [list]}, {'Exclude': [list]} }

    }, {
        sequelize,
        modelName: 'Split',
        timestamps: false,
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
                name: 'split_products',
                using: 'BTREE',
                fields: ['TenantId', 'ProductId']
            },
            {
                name: 'split_assets',
                using: 'BTREE',
                fields: ['TenantId', 'AssetId']
            }
        ]
    })

    // Split Share Table
    class SplitShare extends Model<SplitShares> implements SplitShares {
        declare TenantId: number;
        declare SplitId: string;
        declare UserId: string;
        declare Share: number;

        static associate(models: any) {
            // define association 
            SplitShare.belongsTo(models.Split)
            SplitShare.belongsTo(models.User)
        }
    }
    SplitShare.init({
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: "Tenants",
                key: 'id'
            },
            allowNull: false
        },
        SplitId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        UserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        Share: {
            type: DataTypes.FLOAT,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'SplitShare',
        timestamps: false,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'share_user',
                using: 'BTREE',
                fields: ['TenantId', 'UserId']
            }
        ]
    })

    // AccountingSplit junction table
    class AccountingSplit extends Model<AccountingSplits> implements AccountingSplits {
        declare TenantId: number;
        declare id: string;
        declare name: string;
        declare accountingsplitableId: string;
        declare accountingsplitableType: string;

        static associate(models: any) {
            // define association here
            AccountingSplit.belongsTo(models.Expense, { foreignKey: 'accountingsplitableId', constraints: false })
            AccountingSplit.belongsTo(models.Revenue, { foreignKey: 'accountingsplitableId', constraints: false })
            AccountingSplit.belongsToMany(models.User, { through: AccountingSplitShare })
            AccountingSplit.hasMany(models.AccountingSplitShare)
            AccountingSplitShare.belongsTo(models.AccountingSplit)
            AccountingSplitShare.belongsTo(models.User)
        }

        async getAccountingSplitable(options: any) {
            if (!this.accountingsplitableType) return null;
            const mixinMethodName = `get${uppercaseFirst(this.accountingsplitableType)}` as keyof typeof this;
            const fn = this[mixinMethodName] as (options: any) => any; // type assertion
            return fn(options);
        }

    }
    AccountingSplit.init({

        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: "Tenants",
                key: 'id'
            },
            allowNull: false
        },
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: DataTypes.STRING,
        accountingsplitableId: DataTypes.UUID,
        accountingsplitableType: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'AccountingSplit',
        timestamps: false,
        // sequelize: db,
        hooks: {
            afterFind: (findResult: any) => {
                if (!Array.isArray(findResult)) findResult = [findResult];
                for (const instance of findResult) {
                    if (instance.accountingsplitableType === "expense" && instance.expense !== undefined) {
                        instance.accountingsplitable = instance.expense;
                    } else if (instance.accountingsplitableType === "revenue" && instance.revenue !== undefined) {
                        instance.accountingsplitable = instance.revenue;
                    }

                    delete instance.revenue;
                    delete instance.dataValues.revenue;
                    delete instance.expense;
                    delete instance.dataValues.expense;
                }
            }
        }
    });

    // AccountingSpliShare junction table 
    class AccountingSplitShare extends Model<AccountingSplitShares> implements AccountingSplitShares {
        declare TenantId: number;
        declare AccountingSplitId: string;
        declare UserId: string;
        declare Share: number;

        static associate(models: any) {
            // define association here
        }
    }
    AccountingSplitShare.init({

        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: "Tenants",
                key: 'id'
            },
            allowNull: false
        },
        AccountingSplitId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        UserId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        Share: {
            type: DataTypes.FLOAT,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'AccountingSplitShare',
        timestamps: false,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'accountingshare_user',
                using: 'BTREE',
                fields: ['TenantId', 'UserId']
            }
        ]
    })

    return { Split, SplitShare, AccountingSplit, AccountingSplitShare };
}