'use strict';

import { Model } from 'sequelize';

import {
    Payments, Revenues, Expenses
} from '../interface/Attributes';

module.exports = (sequelize: any, DataTypes: any) => {
    //  Helper function to capitalize the first letter of a string
    const uppercaseFirst = (str: string) => `${str[0].toUpperCase()}${str.substring(1)}`;
    
    // Payment Table
    class Payment extends Model<Payments> implements Payments {
        declare TenantId: number;
        declare id: string;
        declare title: string;
        declare transactionDate: Date | null;
        declare currency: string | null;
        declare amount: number | null;
        declare amountUSD: number | null;
        declare balanceCurrency: string | null;
        declare balance: number | null;
        declare conversionRate: number | null;
        declare externalId: string | null;
        declare memo: string | null;
        declare files: { [key: string]: any} | null;

        static associate(models: any): void {
            // define association 
            Payment.belongsTo(models.User);
        }
    }

    Payment.init({
        TenantId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Tenants',
                key: 'id'
            }
        },
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        transactionDate: {
            type: DataTypes.DATEONLY
        },
        currency: {
            type: DataTypes.STRING(3)
        },
        amount: {
            type: DataTypes.FLOAT
        },
        amountUSD: {
            type: DataTypes.FLOAT
        },
        balanceCurrency: {
            type: DataTypes.STRING(3)
        },
        balance: {
            type: DataTypes.FLOAT
        },
        conversionRate: {
            type: DataTypes.FLOAT
        },
        externalId: {
            type: DataTypes.STRING
        },
        memo: {
            type: DataTypes.TEXT('long')
        },
        files: {
            type: DataTypes.JSON
        }
    }, {
        sequelize,
        modelName: 'Payment',
        // order the results to return the most recently created tenant first
        // defaultScope: {
        //     order: [['createdAt', 'DESC']],
        // },
        scopes: {
            Tenant: (TenantId: number) => ({
                where: { TenantId }
            })
        }
    });
    
    // Revenue Table
    class Revenue extends Model<Revenues> implements Revenues {
        declare TenantId: number;
        declare id: string;
        declare title: string;
        declare type: string;
        declare transactionDate: Date;
        declare currency: string;
        declare amount: number;
        declare amountUSD: number;
        declare conversionRate: number;
        declare memo: string;
        declare files: any;

        static associate(models: any) {
            Revenue.belongsTo(models.Artist);
            Revenue.hasMany(models.AccountingSplit, {
                foreignKey: 'accountingsplitableId', constraints: false,
                scope: { accountingsplitableType: 'revenue' }
            })        
        }
    }

    Revenue.init({
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Tenants',
                key: 'id',
            },
            allowNull: false,
        },
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: DataTypes.STRING,
        transactionDate: DataTypes.DATEONLY,
        currency: DataTypes.STRING(3),
        amount: DataTypes.FLOAT,
        amountUSD: DataTypes.FLOAT,
        conversionRate: DataTypes.FLOAT,
        memo: DataTypes.STRING,
        files: DataTypes.JSON,
    }, {
        sequelize,
        modelName: 'Revenue',
        // order the results to return the most recently created tenant first
        // defaultScope: {
        //     order: [['createdAt', 'DESC']],
        // },
        scopes: {
            Tenant: (TenantId: number) => ({
                where: { TenantId },
            }),
        },
    });


    // Expense class 
    class Expense extends Model<Expenses> implements Expenses {
        declare TenantId: number;
        declare id: string;
        declare expenseableId: string;
        declare expenseableType: string;
        declare title: string;
        declare type: string;
        declare transactionDate: Date;
        declare currency: string;
        declare amount: number;
        declare amountUSD: number;
        declare conversionRate: number;
        declare memo: string;
        declare files: any;

        static associate(models: any) {
            Expense.belongsTo(models.Asset, { foreignKey: 'expenseableId', constraints: false })
            Expense.belongsTo(models.Product, { foreignKey: 'expenseableId', constraints: false })
            Expense.belongsTo(models.Artist, { foreignKey: 'expenseableId', constraints: false })
            Expense.belongsTo(models.User, { foreignKey: 'expenseableId', constraints: false })
            Expense.hasMany(models.AccountingSplit, {
                foreignKey: 'accountingsplitableId', constraints: false,
                scope: { accountingsplitableType: 'expense' }
            })        
        }

        // add the getExpensable instance method here
        async getExpensable(options: any) {
            if (!this.expenseableType) return null;
            const mixinMethodName = `get${uppercaseFirst(this.expenseableType)}` as keyof Expense;
            return this[mixinMethodName](options);
        }
    }

    Expense.init({
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
        expenseableId: DataTypes.UUID,
        expenseableType: DataTypes.STRING,
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: DataTypes.STRING,
        transactionDate: DataTypes.DATEONLY,
        currency: DataTypes.STRING(3),
        amount: DataTypes.FLOAT,
        amountUSD: DataTypes.FLOAT,
        conversionRate: DataTypes.FLOAT,
        memo: DataTypes.STRING,
        files: DataTypes.JSON
    }, {
        sequelize,
        modelName: 'Expense',
        // order the results to return the most recently created tenant first
        // defaultScope: {
        //     order: [['createdAt', 'DESC']]
        // },
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        hooks: {
            afterFind: (findResult: any) => {
                if (findResult && Array.isArray(findResult)) {
                    for (const instance of findResult) {
                        if (instance.expenseableType === "asset" && instance.asset == undefined) {
                            instance.expenseable = instance.asset;
                        } else if (instance.expenseableType === "product" && instance.product == undefined) {
                            instance.expenseable = instance.product;
                        } else if (instance.expenseableType === "artist" && instance.artist == undefined) {
                            instance.expenseable = instance.artist;
                        }
                    }
                }
            }
        }

    });

    return { Payment, Revenue, Expense };
};