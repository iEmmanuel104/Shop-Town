'use strict';

import bcrypt from 'bcryptjs'
import { Model } from 'sequelize';
import { Passwords } from '../interface/Attributes';



module.exports = (sequelize: any, DataTypes: any) => {
    class Password extends Model<Passwords> implements Passwords {
        declare id: string;
        declare userId: string;
        declare password: string;
        static associate(models: any): void {
        }
    }
    Password.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "Users",
                key: 'id'
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Password',
        hooks: {
            beforeCreate: async (password) => {
                const salt = await bcrypt.genSaltSync(10);
                password.password = await bcrypt.hashSync(password.password, salt);
            },
            beforeUpdate: async (password) => {
                // if (password.changed('password')) {
                    const salt = await bcrypt.genSaltSync(10);
                    const hashedPassword = await bcrypt.hashSync(password.password, salt);
                    password.password = hashedPassword;
                // }
            },
        },
        // paranoid: true
    })

    return {Password}
}