'use strict';

import { Model, Sequelize } from 'sequelize';
import customErrors from '../app/utils/customErrors';

import {
    Assets,
     ArtistAssets,
     Products,
    ArtistProducts, ProductAssets
} from '../interface/Attributes';


module.exports = (sequelize: any, DataTypes: any) => {
    // Assets Table
    class Asset extends Model<Assets> implements Assets {
        declare TenantId: number;
        declare id: string;
        declare isrc: string;
        declare iswc: string;
        declare externalId: string;
        declare assetIDs: string[];
        declare displayArtist: string;
        declare mainArtist: string[];
        declare otherArtist: string[];
        declare title: string;
        declare type: 'Audio' | 'Video' | 'Ringtone' | 'YouTube';
        declare version: string;
        declare mainGenre: string[];
        declare subGenre: string[];
        declare contributors: Record<string, string[]>;
        declare extra: Record<string, any>;

        static associate(models: any) {
            Asset.hasMany(models.Expense, {
                foreignKey: 'expenseableId', constraints: false,
                scope: { expenseableType: 'asset' }
            });
            Asset.belongsToMany(models.Artist, { through: 'ArtistAsset'});
            Asset.hasMany(models.ArtistAsset);
            Asset.belongsToMany(models.Product, { through: 'ProductAsset'});
            Asset.hasMany(models.ProductAsset);
            Asset.hasMany(models.Split);
        };
    } 
    Asset.init({   
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
        isrc: {
            type: DataTypes.STRING,
            allowNull: false
        },
        iswc: {
            type: DataTypes.STRING
        },
        externalId: DataTypes.STRING,
        assetIDs: DataTypes.ARRAY(DataTypes.STRING), // an array of asset ids for individual assets in an album asset
        displayArtist: {
            type: DataTypes.STRING(510),
            allowNull: false
        }, //lead artist for asset
        mainArtist: DataTypes.ARRAY(DataTypes.STRING), // lead artists if they are more than one
        otherArtist: DataTypes.ARRAY(DataTypes.STRING), // featured artist in the assetuseful incase of album release
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: 'Audio',
            validate: {
                customValidator: (value: string) => {
                    const enums = ['Audio', 'Video', 'Ringtone', 'YouTube']
                    if (!enums.includes(value)) {
                        throw new Error(value + 'not a valid type option')
                    }
                }
            }
        },
        version: DataTypes.STRING, // single relaese, EP, or Album
        mainGenre: DataTypes.ARRAY(DataTypes.STRING),
        subGenre: DataTypes.ARRAY(DataTypes.STRING),
        contributors: DataTypes.JSON, // {"producer":["Israel Dammy","EeZee Tee"],"mixer":["Israel Dammy","EeZee Tee"], "songwriter":["Israel Dammy","EeZee Tee"]"}
        extra: DataTypes.JSON // other people involved in the asset production directly or indirectly but are worthy of note
    }, {
        sequelize,
        modelName: 'Asset',
        //   paranoid: true,
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
                name: 'tenant_isrcs',
                unique: true,
                using: 'BTREE',
                fields: ['TenantId', 'isrc']
            },
            {
                name: 'tenant_assetartists',
                using: 'BTREE',
                fields: ['TenantId', 'displayArtist']
            },
            {
                name: 'tenant_assettitles',
                using: 'BTREE',
                fields: ['TenantId', 'title']
            }
        ]
    }) 

    // ArtistAssets Table
    class ArtistAsset extends Model<ArtistAssets> implements ArtistAssets {
        declare TenantId: number;
        declare ArtistId: string;
        declare AssetId: string;

        static associate(models: any) {
            // define associations here if needed
            ArtistAsset.belongsTo(models.Artist)
            ArtistAsset.belongsTo(models.Asset)
        };
    }
    ArtistAsset.init({
        
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Tenants',
                key: 'id'
            },
            allowNull: false
        },
        ArtistId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        AssetId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'ArtistAsset',
        timestamps: false,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        }
    })
 
    // Products Table
    class Product extends Model<Products> implements Products {
        declare TenantId: number;
        declare id: string;
        declare upc: string;
        declare catalog: string;
        declare externalId: string;
        declare releaseDate: Date;
        declare displayArtist: string;
        declare mainArtist: string[];
        declare otherArtist: string[];
        declare title: string;
        declare label: string;
        declare type: 'Audio' | 'Video' | 'Ringtone';
        declare format: 'Single' | 'EP' | 'Album' | 'LP';
        declare status: 'Live' | 'Taken Down' | 'Scheduled' | 'Pending' | 'Error';
        declare distribution: string;
        declare mainGenre: string[];
        declare subGenre: string[];
        declare contributors: Record<string, string[]>;
        declare extra: Record<string, any>;

        static associate(models: any) {
            Product.hasMany(models.Expense, {
                foreignKey: 'expenseableId', constraints: false,
                scope: { expenseableType: 'product' }
            })
            Product.belongsToMany(models.Artist, { through: 'ArtistProduct' })
            Product.belongsTo(models.Tenant)
            Product.hasMany(models.ArtistProduct)
            Product.belongsToMany(models.Asset, { through: 'ProductAsset' })
            Product.hasMany(models.ProductAsset)
            Product.hasMany(models.Split)        
        };
    }
    Product.init({
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
        upc: {
            type: DataTypes.STRING,
            allowNull: false
        },
        catalog: DataTypes.STRING,
        externalId: DataTypes.STRING,
        releaseDate: DataTypes.DATEONLY,
        displayArtist: {
            type: DataTypes.STRING,
            allowNull: false
        },
        mainArtist: DataTypes.ARRAY(DataTypes.STRING),
        otherArtist: DataTypes.ARRAY(DataTypes.STRING),
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        label: DataTypes.STRING,
        type: {
            type: DataTypes.STRING,
            defaultValue: 'Audio',
            validate: {
                customValidator: (value: string) => {
                    const enums = ['Audio', 'Video', 'Ringtone']
                    if (!enums.includes(value)) {
                        throw new Error(value + 'not a valid type option')
                    }
                }
            }
        },
        format: {
            type: DataTypes.STRING,
            defaultValue: 'Single',
            validate: {
                customValidator: (value: string) => {
                    const enums = ['Single', 'EP', 'Album', 'LP']
                    if (!enums.includes(value)) {
                        throw new Error(value + 'not a valid format option')
                    }
                }
            }
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Live',
            validate: {
                customValidator: (value: string) => {
                    const enums = ['Live', 'Taken Down', 'Scheduled', 'Pending', 'Error']
                    if (!enums.includes(value)) {
                        throw new Error(value + 'not a valid status option')
                    }
                }
            }
        },
        distribution: DataTypes.STRING,
        mainGenre: DataTypes.ARRAY(DataTypes.STRING),
        subGenre: DataTypes.ARRAY(DataTypes.STRING),
        links: DataTypes.JSON,
        contributors: DataTypes.JSON,
        extra: DataTypes.JSON
    }, {
        sequelize,
        modelName: 'Product',
        // order the results to return the most recently created tenant first
        // defaultScope: {
        //     order: [['createdAt', 'DESC']],
        // },
        //   paranoid: true,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'tenant_upcs',
                unique: true,
                using: 'BTREE',
                fields: ['TenantId', 'upc']
            },
            {
                name: 'tenant_productartists',
                using: 'BTREE',
                fields: ['TenantId', 'displayArtist']
            },
            {
                name: 'tenant_producttitles',
                using: 'BTREE',
                fields: ['TenantId', 'title']
            }
        ]
    }) 

    // ArtistProducts Table
    class ArtistProduct extends Model<ArtistProducts> implements ArtistProducts {
        declare TenantId: number;
        declare ArtistId: string;
        declare ProductId: string;

        static associate(models: any) {
            // define associations here if needed
        ArtistProduct.belongsTo(models.Artist)
        ArtistProduct.belongsTo(models.Product)        
    };
    }
    ArtistProduct.init({
        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Tenants',
                key: 'id'
            },
            allowNull: false
        },
        ArtistId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        ProductId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'ArtistProduct',
        timestamps: false,
        // order the results to return the most recently created tenant first
        defaultScope: {
            order: [['createdAt', 'DESC']],
        },
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        }
    }) 

    // ProductAssets Table
    class ProductAsset extends Model<ProductAssets> implements ProductAssets {
        declare TenantId: number;
        declare ProductId: string;
        declare Number: number;
        declare AssetId: string;

        static associate(models: any) {
            // define associations here if needed
        ProductAsset.belongsTo(models.Product)
        ProductAsset.belongsTo(models.Asset)        };
    }
    ProductAsset.init({

        TenantId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Tenants',
                key: 'id'
            },
            allowNull: false
        },
        ProductId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        Number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        AssetId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'ProductAsset',
        timestamps: false,
        scopes: {
            Tenant: TenantId => ({
                where: { TenantId }
            })
        },
        indexes: [
            {
                name: 'productassets_products',
                using: 'BTREE',
                fields: ['TenantId', 'ProductId']
            },
            {
                name: 'productassets_assets',
                using: 'BTREE',
                fields: ['TenantId', 'AssetId']
            }
        ]
    })

    return { Asset, ArtistAsset, Product, ArtistProduct, ProductAsset }    

}
