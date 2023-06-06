module.exports = (sequelize, DataTypes) => {
    const Wallet = sequelize.define("Wallet", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        amount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING,
            defaultValue: 'NGN',
            allowNull: false
        },
        reference: {
            type: DataTypes.STRING,
        },
        type: {
            type: DataTypes.ENUM('customer', 'store'),
            defaultValue: 'customer',
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        }
    }, {
        tableName: 'Wallet',
        timestamps: true,
    });

    const WalletTransaction = sequelize.define("WalletTransaction", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING,
            defaultValue: 'NGN',
            allowNull: false
        },
        reference: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('credit', 'debit'),
            defaultValue: 'credit',
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'success', 'failed'),
            defaultValue: 'pending',
            allowNull: false
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        tableName: 'WalletTransaction',
        timestamps: true,
    });


    Wallet.associate = (models) => {
        Wallet.belongsTo(models.User, {
            foreignKey: "userId",
            as: 'userwallet'
        });
        Wallet.belongsTo(models.Brand, {
            foreignKey: 'storeId',
            as: 'storewallet'
        })
        Wallet.hasMany(models.WalletTransaction, {
            foreignKey: 'walletId',
            as: 'wallettransactions'
        });
    };

    WalletTransaction.associate = (models) => {
        WalletTransaction.belongsTo(models.Wallet, {
            foreignKey: 'walletId',
            as: 'wallettransaction'
        });
    };

    return {Wallet, WalletTransaction};
};
//
