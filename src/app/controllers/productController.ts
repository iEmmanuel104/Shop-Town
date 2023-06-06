import express, { Request, Response, NextFunction } from 'express';
import { runBQquery } from '../helpers/big_query_run'
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
import { uniqBy, pullAllBy, split } from "lodash";
import pagination from '../utils/pagination';
import { Products } from '../../interface/Attributes';
import { createObjectCsvWriter } from 'csv-writer';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import PDFDocument from 'pdfkit';
import mailTemplates from '../utils/mailTemplates'
import fs from 'fs';
const { sendattachmentEmail } = mailTemplates
const { sequelize, Sequelize } = db
const { getPagination, getPagingData } = pagination;
const Op = Sequelize.Op;
const { Tenant, User, Artist, Asset, Product, ProductAsset, ArtistProduct, Split, SplitShare } = db;


const createProduct = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        let product: { [key: string]: any } = {}

        product['TenantId'] = tenant
        product['upc'] = req.body.upc
        if (req.body.catalog) product['catalog'] = req.body.catalog
        product['title'] = req.body.title
        if (req.body.externalId) product['externalId'] = req.body.externalId
        product['displayArtist'] = req.body.displayArtist
        // product['mainArtist'] = req.body.mainArtist
        // product['otherArtist'] = req.body.otherArtist
        product['type'] = req.body.type ? req.body.type : 'Audio'
        product['format'] = req.body.format ? req.body.format : 'Single'
        if (req.body.releaseDate) product['releaseDate'] = req.body.releaseDate
        if (req.body.mainGenre) product['mainGenre'] = req.body.mainGenre
        if (req.body.subGenre) product['subGenre'] = req.body.subGenre
        if (req.body.label) product['label'] = req.body.label
        product['status'] = req.body.status ? req.body.status : 'Live'
        if (req.body.distribution) product['distribution'] = req.body.distribution
        if (req.body.contributors) product['contributors'] = req.body.contributors

        let artists: any[] = []
        req.body.artists.forEach((artist: string) => {
            artists.push({
                "TenantId": tenant,
                "ArtistId": artist,
                // priviledges: []
            })
        })
        product['ArtistProducts'] = artists

        if (req.body.assets && Array.isArray(req.body.assets)) {

            let assets: any[] = []
            req.body.assets.forEach((asset: any) => {
                assets.push({
                    "TenantId": tenant,
                    "Number": asset.number,
                    "AssetId": asset.asset
                })
            })

            if (req.body.assets.length > 5) product['format'] = 'Album'
            else if (req.body.assets.length > 3) product['format'] = 'EP'
            else product['format'] = 'Single'

            product['ProductAssets'] = assets

        }

        // set default splits
        let artistsplit;
        if (!req.body.split) {
            var split = await Artist.scope({ method: ['Tenant', tenant] }).findByPk(req.body.artists[0], { attributes: ['split'] })
            artistsplit = split.split
        } else {
            split = req.body.split
        }
        console.log(product)
        const newproduct = await Product.create(
            product,
            { include: [ArtistProduct, ProductAsset], validate: true }, { transaction: t }
        );

        req.body.assets.forEach(async (asset: { [key: string]: string }) => {
            const split = await Split.scope({ method: ['Tenant', tenant] }).findOne({
                where: { AssetId: asset.asset, ProductId: null, type: null },
                attributes: { exclude: ['id'] },
                include: [
                    { model: SplitShare, attributes: ["UserId", "Share", "TenantId"] },
                    { model: Asset, attributes: ['isrc', 'title'] }
                ]
            });

            if (split) {
                let newsplit: { [key: string]: any } = {};
                newsplit['TenantId'] = tenant;
                newsplit['AssetId'] = asset.asset;
                newsplit['ProductId'] = newproduct.id;
                newsplit['name'] =
                    newproduct.upc + ': ' + newproduct.title + '|' + split.Asset.isrc + ': ' + split.Asset.title;
                newsplit['SplitShares'] = split.SplitShares;

                await Split.create(newsplit, { include: [SplitShare] }, { transaction: t });
            }
        });

        if (artistsplit) {
            let splitshare: any[] = [];
            artistsplit.forEach((splitsh: { [key: string]: any }) => {
                splitshare.push({
                    "TenantId": tenant,
                    "UserId": splitsh.user,
                    "Share": splitsh.share,
                });
            });
            let newsplit: { [key: string]: any } = {};
            newsplit['TenantId'] = tenant;
            newsplit['ProductId'] = newproduct.id;
            newsplit['name'] = newproduct.upc + ': ' + newproduct.title;
            newsplit['SplitShares'] = splitshare;

            await Split.create(newsplit, { include: [SplitShare] }, { transaction: t });
        }
        return res.status(201).send(newproduct);
    })

})

const createBulkProduct = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const bulkproducts = req.body.products;
    const tenant = req.tenant;
    let createdproducts = [];
    let errors = [];

    for (let i = 0; i < bulkproducts.length; i++) {
        bulkproducts[i].artists = split(bulkproducts[i].artists, "|");

        if (bulkproducts[i].tracklist) {
            bulkproducts[i].tracklist = split(bulkproducts[i].tracklist, "|");

            if (Array.isArray(bulkproducts[i].tracklist)) {
                if (bulkproducts[i].tracklist.length > 5) bulkproducts[i].format = "Album";
                else if (bulkproducts[i].tracklist.length > 3) bulkproducts[i].format = "EP";
                else bulkproducts[i].format = "Single";
            }
        }

        bulkproducts[i].TenantId = tenant;

        if (!bulkproducts[i].upc) continue;

        bulkproducts[i].catalog = bulkproducts[i].catalog ? bulkproducts[i].catalog : null;
        bulkproducts[i].type = bulkproducts[i].type ? bulkproducts[i].type : "Audio";
        bulkproducts[i].releaseDate = bulkproducts[i].releaseDate ? bulkproducts[i].releaseDate : null;
        bulkproducts[i].mainGenre = bulkproducts[i].mainGenre != "" ? split(bulkproducts[i].mainGenre, "|") : null;
        bulkproducts[i].subGenre = bulkproducts[i].subGenre != "" ? split(bulkproducts[i].subGenre, "|") : null;
        bulkproducts[i].label = bulkproducts[i].label ? bulkproducts[i].label : null;
        bulkproducts[i].status = bulkproducts[i].status ? bulkproducts[i].status : "Live";
        bulkproducts[i].distribution = bulkproducts[i].distribution ? bulkproducts[i].distribution : null;
        bulkproducts[i].externalId = bulkproducts[i].externalId ? bulkproducts[i].externalId : null;
        // bulkproducts[i].displayArtist = bulkproducts[i].displayArtist ? bulkproducts[i]. : null;

        try {
            const product = await Product.create(bulkproducts[i]);
            createdproducts.push(bulkproducts[i].title);

            for (const artist of bulkproducts[i].artists) {
                const [artistRecord] = await Artist.scope({ method: ["Tenant", tenant] }).findOrCreate({
                    where: { artistName: artist },
                    defaults: { TenantId: tenant },
                    attributes: ["id"],
                });
                await ArtistProduct.create({
                    TenantId: tenant,
                    ProductId: product.id,
                    ArtistId: artistRecord.id,
                });
            }

            if (bulkproducts[i].tracklist) {
                for (let j = 0; j < bulkproducts[i].tracklist.length; j++) {
                    const asset = await Asset.scope({ method: ["Tenant", tenant] }).findOne({ where: { isrc: bulkproducts[i].tracklist[j] } });
                    if (asset) {
                        await ProductAsset.create({
                            TenantId: tenant,
                            ProductId: product.id,
                            Number: j + 1,
                            AssetId: asset.id,
                        });
                    }
                }
            }
        } catch (e: any) {
            if (Array.isArray(e.errors)) {
                e.errors.forEach(function (err: any) {
                    errors.push(`${bulkproducts[i].upc}-${err.message}: ${err.value}`);
                });
            } else {
                errors.push(`${bulkproducts[i].upc}-${e}`);
            }
        }
    }

    return res.status(201).send({ message: "Done.", createdproducts, errors });
});

const updateProduct = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant

        const checkproduct = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!checkproduct) return next(new CustomError.BadRequestError('Product does not exist'));

        if (req.body.artists) {
            await checkproduct.setArtists([]);
            let artists: { [key: string]: any } = [];
            req.body.artists.forEach((artist: string) => {
                artists.push({
                    TenantId: tenant,
                    ArtistId: artist,
                    ProductId: id,
                });
            });
            await ArtistProduct.bulkCreate(artists, { validate: true }, { transaction: t });
        }

        await checkproduct.setAssets([]);
        let assets: { [key: string]: any } = [];
        req.body.assets.forEach((asset: { [key: string]: any }) => {
            assets.push({
                TenantId: tenant,
                ProductId: id,
                Number: asset.number,
                AssetId: asset.asset,
            });
        });
        await ProductAsset.bulkCreate(assets, { validate: true }, { transaction: t });

        let product: { [key: string]: any } = {};
        product['TenantId'] = tenant;

        if (req.body.catalog) product['catalog'] = req.body.catalog;
        if (req.body.upc) product['upc'] = req.body.upc;
        if (req.body.title) product['title'] = req.body.title;
        if (req.body.displayArtist) product['displayArtist'] = req.body.displayArtist;
        if (req.body.externalId) product['externalId'] = req.body.externalId
        if (req.body.type) product['type'] = req.body.type;
        if (req.body.format) product['format'] = req.body.format;
        if (req.body.releaseDate) product['releaseDate'] = req.body.releaseDate;
        if (req.body.mainGenre) product['mainGenre'] = req.body.mainGenre;
        if (req.body.subGenre) product['subGenre'] = req.body.subGenre;
        if (req.body.label) product['label'] = req.body.label;
        if (req.body.status) product['status'] = req.body.status;
        if (req.body.distribution) product['distribution'] = req.body.distribution;

        await Product.update(product, { where: { id } }, { transaction: t });

        return res.status(200).send({ message: 'Product updated succesfully.' });
    })
})

const getProductInfo = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const id = req.params.id
        const tenant = req.tenant

        const result = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id, {
            attributes: { exclude: ['TenantId'] },
            include: [{
                model: Asset,
                attributes: ["id", "isrc", "title", "version", "displayArtist", "contributors", "mainGenre", "subGenre", "type"],
                through: {
                    attributes: ['Number'],
                }
            },
            {
                model: Artist,
                attributes: ["id", "artistName"],
                through: {
                    attributes: []
                }
            }
                // {
                //     model: Split,
                //     attributes: ["id", "name"],
                //     include: [{
                //         model: SplitShare,
                //         attributes: ["UserId", "Share"],
                //         include: [{
                //             model: User,
                //             attributes: ["id", "firstName", "lastName", "ipi"],
                //             through: {
                //                 attributes: []
                //             }
                //         }]
                //     }]
                // }
            ]
        })
        if (!result) return next(new CustomError.BadRequestError('No product info found'))
        return res.status(200).send(result)
    })
})

const getProducts = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant

        let include: any[] = []
        let attributes: string[] | { exclude: string[] } = [];
        if (typeof req.query.include === "string") {
            attributes = split(req.query.include, ',')
            include = []
        }
        else {
            attributes = { exclude: ['TenantId'] }
            include = [{
                model: Asset,
                attributes: ["id", "isrc", "title"],
                through: {
                    attributes: []
                }
            },
            {
                model: Artist,
                attributes: ["id", "artistName"],
                through: {
                    attributes: []
                }
            }]
        }

        if (req.query.splits == 'true') {
            include.push({
                model: Split,
                attributes: ["id"],
                where: {
                    id: {
                        [Op.ne]: null
                    }
                }
            })
        }

        const page = Number(req.query.page);
        const size = Number(req.query.size);

        if (page < 1 || size < 0) {
            return next(new CustomError.BadRequestError('Invalid pagination parameters'));
        }

        const { limit, offset } = getPagination(page, size);
        const result = await Product.scope({ method: ["Tenant", tenant] }).findAndCountAll({
            attributes,
            include,
            limit,
            offset,
            order: [['updatedAt', 'DESC']]
        });

        console.log('first result count', result.count)

        const totalcount = await Product.findAll({
            attributes,
            include,
            raw: true
        });

        const specificCount = await totalcount.length;

        if (specificCount != result.count) {
            result.count = specificCount;
        }
        console.log('multiple result count', result.count)

        let response;
        if (page || size) {
            response = getPagingData(result, page, limit, 'Products');
        } else {
            response = {
                count: result.count,
                Products: result.rows
            }
        }

        return res.send(response);
    })
})

const productArtists = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const id = req.params.id
        const tenant = req.tenant

        const product = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!product) return next(new CustomError.BadRequestError('Product not found'))

        await product.setArtists([]);

        let artists: any[] = [];
        req.body.artists.forEach((artist: string) => {
            artists.push({
                "TenantId": tenant,
                "ArtistId": artist,
                "ProductId": id,
            });
        });
        await ArtistProduct.bulkCreate(artists, { validate: true });

        return res.status(200).send({ message: 'Artist added to product' });
    })
})

const productAssets = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant

        const product = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!product) return next(new CustomError.BadRequestError('Product not found'))

        if (uniqBy(req.body.assets, 'asset').length !== req.body.assets.length) return next(new CustomError.BadRequestError('failed. Duplicate Assets'));

        await product.setAssets([]);

        let assets: any[] = [];
        req.body.assets.forEach((asset: any) => {
            assets.push({
                "TenantId": tenant,
                "ProductId": id,
                "Number": asset.number,
                "AssetId": asset.asset
            });
        });

        await ProductAsset.bulkCreate(assets, { validate: true });

        return res.status(200).send({ message: 'Assets added to Products' });

    });
})

const getProductStats = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant
        let productstats: { [key: string]: any } = {}
        // const upc = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id, {
        //     attributes: ['upc']
        // });

        const upc = { 'upc': "748367026508" }

        const tenanti = await Tenant.findByPk(tenant);
        let bigqueryDataset = tenanti?.bigqueryDataset;
        if (bigqueryDataset) {
            const query = `SELECT
        SUM(CASE WHEN sales_data.Sale_Type = 'Download' THEN sales_data.Quantity END) AS Downloads,
        SUM(CASE WHEN CONTAINS_SUBSTR(sales_data.Sale_Type, 'Stream') THEN sales_data.Quantity END) AS Streams,
        SUM(sales_data.Royalty) AS Royalty
        FROM \`${bigqueryDataset}.v_sales_data\` sales_data
        WHERE UPC = '${upc['upc']}'`;

            const rows = await runBQquery(query);
            productstats['downloads'] = rows[0]['Downloads'];
            productstats['streams'] = rows[0]['Streams'];
            productstats['royalty'] = rows[0]['Royalty'];

        } else {
            productstats['downloads'] = 0;
            productstats['streams'] = 0;
            productstats['royalty'] = 0;
        }

        return res.status(200).json(productstats);
    })
})

const deleteProduct = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const id = req.params.id;
        const product = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!product) return next(new CustomError.BadRequestError('Product not found'))

        await Product.destroy({ where: { id: id } }, { transaction: t });

        return res.status(200).send({ message: "Product was deleted successfully." });
    })
})

const setBulkSplits = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const tenanti = await Tenant.findByPk(tenant)
        let tenantuser = tenanti.user

        let bulkproducts = req.body.products
        let product: any[] = []
        // let newsplit = []
        let split = []
        var itemsProcessed = 0
        let errors = []

        for (let i = 0; i < bulkproducts.length; i++) {

            itemsProcessed++

            product[i] = await Product.scope({ method: ['Tenant', tenant] }).findOne({
                where: { 'upc': bulkproducts[i].upc },
                attributes: ['id', 'upc', 'title'],
                include: [{
                    model: Artist,
                    attributes: ["id"],
                    through: { attributes: [] },
                    include: [{ model: User, attributes: ["id"], through: { attributes: [] } }]
                }, {
                    model: Asset,
                    attributes: ["id", "isrc", "title"],
                    through: { attributes: [] }
                }]
            })
            if (!product[i]) continue

            split[i] = await Split.scope({ method: ['Tenant', tenant] }).findOne({
                where: { AssetId: null, ProductId: product[i].id, type: null },
                attributes: ['id']
            })
            if (split[i]) continue

            try {
                await Split.create({
                    "TenantId": tenant,
                    "ProductId": product[i].id,
                    "name": product[i].upc + ': ' + product[i].title,
                    "SplitShares": [{
                        "TenantId": tenant,
                        "UserId": product[i].Artists[0].Users[0].id,
                        "Share": bulkproducts[i].share
                    }, {
                        "TenantId": tenant,
                        "UserId": tenantuser,
                        "Share": 100 - bulkproducts[i].share
                    }]
                }, { include: [SplitShare], validate: true })
            } catch (e: any) {
                console.log(e)
                if (Array.isArray(e.errors)) {
                    e.errors.forEach(function (err: any) {
                        errors.push(bulkproducts[i].upc + '-' + err.message + ': ' + err.value)
                    })
                } else errors.push(bulkproducts[i].upc + '-' + e)
                continue
            }


            // set product assets splits
            product[i].Assets.forEach(async (asset: { [key: string]: any }) => {
                const split = await Split.scope({ method: ['Tenant', tenant] }).findOne({
                    where: { AssetId: asset.id, ProductId: product[i].id, type: null },
                    attributes: ['id']
                });
                if (!split) {
                    const existingSplit = await Split.scope({ method: ['Tenant', tenant] }).findOne({
                        where: { AssetId: asset.id, ProductId: null, type: null },
                        attributes: ['id'],
                        include: [{ model: SplitShare, attributes: ['UserId', 'Share', 'TenantId'] }]
                    });
                    if (existingSplit) {
                        await Split.create({
                            TenantId: tenant,
                            AssetId: asset.id,
                            ProductId: product[i].id,
                            name: product[i].upc + ': ' + product[i].title + '|' + asset.isrc + ': ' + asset.title,
                            SplitShares: existingSplit.SplitShares
                        }, { include: [SplitShare] }, { transaction: t });
                    }
                }
            });
        }

        if (itemsProcessed === bulkproducts.length) {
            return res.status(201).send({ message: "Done.", itemsProcessed, errors })
        }
    })
})

const setProductDefaultSplit = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const tenant = req.tenant
        const id = req.params.id

        var split = await Split.scope({ method: ['Tenant', tenant] }).findOne({
            where: { AssetId: null, ProductId: id, type: null },
            attributes: ['id']
        })

        const product = await Product.scope({ method: ['Tenant', tenant] }).findByPk(id, {
            attributes: ['upc', 'title'],
            include: [
                { model: Asset, attributes: ['id', 'isrc', 'title'], through: { attributes: [] } },
                { model: Artist, attributes: ['id', 'split'], through: { attributes: [] } }
            ]
        });

        if (!product) {
            return next(new CustomError.BadRequestError('Product does not exist!'));
        }

        const artistsplit = product.Artists[0].split;
        if (!artistsplit) {
            return next(new CustomError.BadRequestError('Artist default split not set!'));
        }

        if (!split) {
            // set product splits
            const splitshare: any[] = [];
            artistsplit.forEach((splitsh: { [key: string]: any }) => {
                splitshare.push({
                    TenantId: tenant,
                    UserId: splitsh.user,
                    Share: splitsh.share
                });
            });
            const newsplit: { [key: string]: any } = {};
            newsplit.TenantId = tenant;
            newsplit.ProductId = id;
            newsplit.name = `${product.upc}: ${product.title}`;
            newsplit.SplitShares = splitshare;

            await Split.create(newsplit, { include: [SplitShare] });
        }

        // add tracklist splits
        product.Assets.forEach(async (asset: { [key: string]: any }) => {
            const split = await Split.scope({ method: ['Tenant', tenant] }).findOne({
                where: { AssetId: asset.id, ProductId: id, type: null },
                attributes: ['id']
            });

            if (!split) {
                const split = await Split.scope({ method: ['Tenant', tenant] }).findOne({
                    where: { AssetId: asset.id, ProductId: null, type: null },
                    attributes: { exclude: ['id'] },
                    include: [
                        { model: SplitShare, attributes: ['UserId', 'Share', 'TenantId'] },
                        { model: Asset, attributes: ['isrc', 'title'] }
                    ]
                });

                if (split) {
                    let newsplit: { [key: string]: any } = {}
                    newsplit['TenantId'] = tenant
                    newsplit['AssetId'] = asset.id
                    newsplit['ProductId'] = id
                    newsplit['name'] = product.upc + ': ' + product.title + '|' + split.Asset.isrc + ': ' + split.Asset.title
                    newsplit['SplitShares'] = split.SplitShares

                    await Split.create(newsplit, { include: [SplitShare] });
                }
            }
        });

        return res.status(200).send({ message: 'Splits updated succesfully.' });
    })
})

const downloadProductData = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const tenant = req.tenant

    // const userEmail = (await User.findByPk(id)).email;
    const userEmail = "emma221999@gmail.com"

    if (!userEmail) return next(new CustomError.NotFoundError('User does not exist'));

    const Products = await Product.scope({ method: ['Tenant', tenant] }).findAll({
        attributes: ['upc', 'catalog', 'title', 'displayArtist', 'type', 'releaseDate', 'mainGenre', 'subGenre', 'status', 'distribution'],

    });

    if (!Products || Products.length === 0) return next(new CustomError.NotFoundError('No AProducts found'));

    const csvWriter = createObjectCsvWriter({
        path: 'Product_data.csv',
        header: [
            { id: 'upc', title: 'UPC' },
            { id: 'catalog', title: 'CATALOG' },
            { id: 'title', title: 'TITLE' },
            { id: 'displayArtist', title: 'DISPLAY ARTIST' },
            { id: 'type', title: 'TYPE' },
            { id: 'releaseDate', title: 'RELEASE DATE' },
            { id: 'mainGenre', title: 'MAIN GENRE' },
            { id: 'subGenre', title: 'SUB GENRE' },
            { id: 'status', title: 'STATUS' },
            { id: 'distribution', title: 'DISTRIBUTION' }
        ]
    });

    const records = Products.map((user: any) => ({
        upc: user.upc,
        catalog: user.catalog,
        title: user.title,
        displayArtist: user.displayArtist,
        type: user.type,
        releaseDate: user.releaseDate,
        mainGenre: user.mainGenre,
        subGenre: user.subGenre,
        status: user.status,
        distribution: user.distribution
    }));

    await csvWriter.writeRecords(records);

    const attachment = [{
        filename: 'Product_data.csv',
        content: fs.createReadStream('Product_data.csv')
    }]
    // send csv to user mail
    await sendattachmentEmail(userEmail, attachment, "Product");

    res.download('Product_data.csv', (err) => {
        if (err) {
            return next(new CustomError.BadRequestError('Error downloading file'));
        }
    });

});

export default {
    getProductInfo,
    getProducts,
    createProduct,
    updateProduct,
    getProductStats,
    deleteProduct,
    productAssets,
    productArtists,
    setProductDefaultSplit,
    createBulkProduct,
    setBulkSplits,
    downloadProductData
}