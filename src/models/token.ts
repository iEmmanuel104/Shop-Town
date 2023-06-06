import { Model } from 'sequelize';

import {
    Tokens, 
    BlacklistedToken
} from '../interface/Attributes';

module.exports = (sequelize: any, DataTypes: any) => {
    class Token extends Model<Tokens> implements Tokens {
        declare id: string;
        declare userId: string;
        declare password_reset_code: string | null;
        declare verification_code: string ;
        declare activation_code: string;

        static associate(models: any): void {
            Token.belongsTo(models.User)
        }
    }

    Token.init({
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        userId: {
            type: DataTypes.UUID,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        password_reset_code: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        verification_code: {
            type: DataTypes.STRING,
            defaultValue: `${Math.floor(100000 + Math.random() * 900000)}`
        },
        activation_code: {
            type: DataTypes.STRING,
            defaultValue: DataTypes.UUIDV4,
        },
    },{
        sequelize,
        modelName: 'Token'
    })

    class BlacklistedTokens extends Model<BlacklistedToken> implements BlacklistedToken {
        declare id: string;
        declare token: string;

        static associate(models: any): void {
        }
    }

    BlacklistedTokens.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        token: { type: DataTypes.TEXT, allowNull: false }
    }, {
        sequelize,
        modelName: 'BlacklistedTokens'
    })

return { Token, BlacklistedTokens }
}