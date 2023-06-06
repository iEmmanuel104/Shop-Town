'use strict';

import { Model } from 'sequelize';

import {
    Files
} from '../interface/Attributes';

module.exports = (sequelize: any, DataTypes: any) => {
    class File extends Model<Files> implements Files {
        declare TenantId: number;
        declare id: string;
        declare name: string;
        declare source: string;
        declare CloudId: string;
        declare description: string;
        declare user: string;
        declare email: string;
        declare format: string;
        declare status: string;
        declare statusId: string;
        declare type: 'royalty' | 'invoice' | 'receipt' | 'report';

        static associate(models: any): void {
        }
    }
    File.init({

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
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        source: DataTypes.STRING,
        CloudId: DataTypes.STRING,
        description: DataTypes.STRING,
        user: {
            type: DataTypes.UUID,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        email: DataTypes.STRING,
        format: DataTypes.STRING,
        status: DataTypes.STRING,
        statusId: DataTypes.STRING,
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                customValidator: (value: any) => {
                    const enums = ['royalty', 'invoice', 'receipt', 'report']
                    if (!enums.includes(value)) {
                        throw new Error('not a valid option')
                    }
                }
            }
        }
    }, {
        sequelize,
        modelName: 'File',
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        }
    })
    return File
}
