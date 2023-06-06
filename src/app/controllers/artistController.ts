import express, { Request, Response, NextFunction } from 'express';
import {runBQquery} from '../helpers/big_query_run'
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
import pagination from '../utils/pagination'; 
import { Artists } from '../../interface/Attributes';
import { sumBy } from "lodash";
import { createObjectCsvWriter } from 'csv-writer';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import PDFDocument from 'pdfkit';
import mailTemplates from '../utils/mailTemplates'
import fs from 'fs';
import { uploadsingleFile } from '../utils/cloudConfig';
import { artistCreatedEvent } from '../utils/mixpanel';
const { sendattachmentEmail } = mailTemplates
const { sequelize, Sequelize } = db
const { getPagination, getPagingData } = pagination; 
const Op = Sequelize.Op;
const { Tenant, User, TenantUser, Artist, ArtistUser, Product, Asset, ArtistProduct, ArtistAsset } = db;

const createArtist = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant: number = req.tenant;
        // const tenant: number = req.tenant;
        // Check sum of splits
        if (req.body.split) {
            let splitSum: number = sumBy(req.body.split, (item: {[key: string]: string | number}) => Number(item.share));
            if (splitSum !== 100) {
                return next(new CustomError.BadRequestError(`message: Sum of splits must be 100. Current total: ${splitSum}`));
            }
        }

        const newArtist: Artists = await Artist.create({
            TenantId: tenant,
            artistName: req.body.artistName,
            signDate: req.body.signDate,
            label: req.body.label,
            externalId: req.body.externalId,
            copyright: req.body.copyright,
            publisher: req.body.publisher,
            links: req.body.links,
            split: req.body.split,
            contributors: req.body.contributors,
        }, { transaction: t });

        if (req.body.users) {
            let users: any = [];
            req.body.users.forEach((user: string) => {
                users.push({
                    TenantId: tenant,
                    ArtistId: newArtist.id,
                    UserId: user,
                });
            });
            await ArtistUser.bulkCreate(users, { validate: true, transaction: t });
        }

        // const tenantname = (await Tenant.findByPk(tenant)).name;
        // track artist created
        // await artistCreatedEvent({
        //     workspace: tenantname,
        //     id: newArtist.id,
        //     label: newArtist.label,
        //     artistName: newArtist.artistName,
        //     signDate: newArtist.signDate,
        // });

        return res.status(201).send(newArtist);
    });
});

const createBulkArtist = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const bulkartists = req.body.artists;
        const createdartist = [];
        const artistsToCreate = [];

        for (let i = 0; i < bulkartists.length; i++) {
            const bulkartist = bulkartists[i];

            const existingArtist = await Artist.findOne({
                where: { TenantId: tenant, artistName: bulkartist.artistName },
            });

            if (!existingArtist) {
                const links: {[key:string] : string} = {};
                if (bulkartist.instagram) links.instagram = bulkartist.instagram;
                if (bulkartist.facebook) links.facebook = bulkartist.facebook;
                if (bulkartist.twitter) links.twitter = bulkartist.twitter;
                if (bulkartist.vevo) links.vevo = bulkartist.vevo;
                if (bulkartist.vevourl) links.vevourl = bulkartist.vevourl;
                if (bulkartist.youtube) links.youtube = bulkartist.youtube;
                if (bulkartist.apple) links.apple = bulkartist.apple;
                if (bulkartist.spotify) links.spotify = bulkartist.spotify;
                if (bulkartist.deezer) links.deezer = bulkartist.deezer;

                const artist = {
                    TenantId: tenant,
                    artistName: bulkartist.artistName,
                    signDate: bulkartist.signDate,
                    label: bulkartist.label,
                    externalId: bulkartist.externalId,
                    links: links,
                };

                artistsToCreate.push(artist);
                createdartist.push(artist.artistName);
            }
        }

        await Artist.bulkCreate(artistsToCreate, { transaction: t });
        return res.status(201).send({ message: "Done.", createdartist });
    });
});

const bulkSetArtistSplit = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;
    const tenanti = await Tenant.findByPk(tenant);
    const bulksplits = req.body.splits;
    const updatedartists: string[] = [];

    await sequelize.transaction(async (t: Transaction) => {
        for (let i = 0; i < bulksplits.length; i++) {
            const bulksplit = bulksplits[i];
            const checkartist = await Artist.scope({ method: ['Tenant', tenant] }).findOne({ where: { artistName: bulksplit.artistName } });

            if (checkartist && checkartist.split == null) {
                const checkuser = await User.findOne({ where: { firstName: bulksplit.firstName, lastName: bulksplit.lastName } });

                if (checkuser) {
                    const split = [
                        { user: checkuser.id, share: bulksplit.share - 0 },
                        { user: tenanti.user, share: 100 - bulksplit.share },
                    ];

                    await Artist.update({ split }, { where: { id: checkartist.id } }, { transaction: t });
                    console.log(`updated ${bulksplit.artistName} - ${bulksplit.firstName} `)
                    const users = [{
                        TenantId: tenant,
                        ArtistId: checkartist.id,
                        UserId: checkuser.id,
                    }];

                    await ArtistUser.bulkCreate(users, { validate: true });
                    updatedartists.push(`${bulksplit.artistName} - ${bulksplit.firstName} ${bulksplit.lastName}`);
                }
            }
        }

        return res.status(200).send({ message: 'Done.', updatedartists });
    });
});

const updateArtist = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id;
        const tenant = req.tenant;

        // Check sum of splits
        if (req.body.split) {
            let splitSum = sumBy(req.body.split, (item: { [key: string]: string | number }) => Number(item.share));
            if (splitSum !== 100)
                return res
                    .status(400)
                    .send("Split must equal 100. Current total: " + splitSum);
        }

        const artist = await Artist.scope({ method: ["Tenant", tenant] }).findByPk(id);

        if (!artist) {
            return res.status(404).send("Artist not found.");
        }

        await artist.setUsers([]);

        let updatedArtist: {[key: string]: any} = {};
        updatedArtist["TenantId"] = tenant;
        updatedArtist["artistName"] = req.body.artistName;
        updatedArtist["publisher"] = req.body.publisher;
        updatedArtist["label"] = req.body.label;
        updatedArtist["copyright"] = req.body.copyright;
        updatedArtist["contributors"] = req.body.contributors;
        if (req.file) {
            const publicUrl = await uploadsingleFile(req, 'Artist/profile', artist.id);
            console.log(publicUrl)
            updatedArtist["artistImg"] = publicUrl;
        }
        if (req.body.signDate) updatedArtist["signDate"] = req.body.signDate;
        updatedArtist["split"] =
            req.body.split && req.body.split.length > 0 ? req.body.split : null;

        await Artist.update(updatedArtist, { where: { id: id } }, { transaction: t });

        if (req.body.users) {
            let users: any = [];
            req.body.users.forEach((user: string) => {
                users.push({
                    TenantId: tenant,
                    ArtistId: id,
                    UserId: user,
                });
            });

            await ArtistUser.bulkCreate(users, { validate: true });
        }

        return res.status(200).send({ message: "Artist was updated successfully." });
    });
});

const getArtists = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;

    let whereartist: {[key: string]: any} = {};
    // if (req.query.firstName) whereartist['firstName'] = req.query.firstName
    if (req.query.artistName) whereartist['artistName'] = req.query.artistName;
    if (req.query.externalId) whereartist['externalId'] = req.query.externalId;
    

    const page = Number(req.query.page);
    const size = Number(req.query.size);

    if (page < 1 || size < 0) {
        return next(new CustomError.BadRequestError('Invalid pagination parameters'));
    }
    const { limit, offset } = getPagination(page, size);

    let include = []
    if (req.query.catalog == 'true') {
        include = [
            {
                model: User,
                attributes: ["id", "fullName", "firstName", "lastName"],
                through: {
                    attributes: [],
                }
            },
            {
                model: ArtistAsset,
                attributes: ["AssetId"],
            },
            {
                model: ArtistProduct,
                attributes: ["ProductId"],
            }
        ]
    } else {
        include = [
            {
                model: User,
                attributes: ["id", "fullName", "firstName", "lastName"],
                through: {
                    attributes: [],
                }
            },
        ]
    }

    const result = await Artist.scope({ method: ['Tenant', tenant] }).findAndCountAll({
        attributes: { exclude: ['TenantId'] },
        where: whereartist,
        include: include,
        limit,
        offset,
        order: [['updatedAt', 'DESC']],
    });

    console.log('first result count', result.count)

    const totalcount = await Artist.findAll({
        where: whereartist,
        attributes: { exclude: ['TenantId'] },
        include: include,
        raw: true
    });

    const specificCount = await totalcount.length;

    if (specificCount != result.count) {
        result.count = specificCount;
    }
    console.log('multiple result count', result.count)

    let response;
    if (page || size) {
    response = getPagingData(result, page, limit, 'Artists');
    } else {
        response = {
            count: result.count,
            Artists: result.rows
        }
    }   

    return res.send(response);
});

const getArtist = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const tenant = req.tenant;

    const result = await Artist.scope({ method: ['Tenant', tenant] }).findByPk(id, {
        attributes: { exclude: ['TenantId'] },
        include: [
            {
                model: User,
                attributes: ['firstName', 'lastName', 'id'],
                through: {
                    attributes: []
                },
                include: [
                    {
                        model: Tenant,
                        attributes: ['name'],
                        through: { attributes: ['nickName'] },
                    }
                ]
            }
        ]
    });

    if (!result) {
        return next(new CustomError.NotFoundError('Artist not found'));
    }

    return res.json({ result });
});

const deleteArtist = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const id = req.params.id
        const artist = await Artist.scope({ method: ['Tenant', tenant] }).findByPk(id)

        if (artist === null) {
            return next(new CustomError.BadRequestError('Artist does not exist!'))
        }

        const num = await Artist.destroy({ where: { id: id } }, { transaction: t })

        if (num === 1) {
            res.send({ message: 'Artist was deleted successfully.' })
        } else {
            return next(new CustomError.BadRequestError('Artist could not be deleted.'))
        }
    })
})

const getArtistStats = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    const artiststats: {
        assets: number,
        products: number,
        downloads: number,
        streams: number,
        royalty: number,
        [key: string]: number // allow any string key
    } = {
        assets: 0,
        products: 0,
        downloads: 0,
        streams: 0,
        royalty: 0
    }

    const assetsPromise = ArtistAsset.scope({ method: ['Tenant', tenant] }).findAll({
        where: { ArtistId: id },
        attributes: { exclude: ['TenantId', 'ArtistId'] },
        include: [{ model: Asset, attributes: ['isrc'] }],
    })
    const productsPromise = ArtistProduct.scope({ method: ['Tenant', tenant] }).findAll({
        where: { ArtistId: id },
        attributes: { exclude: ['TenantId', 'ArtistId'] },
        include: [{ model: Product, attributes: ['upc'] }],
    })

    const [assets, products] = await Promise.all([assetsPromise, productsPromise])

    artiststats['assets'] = assets.length
    artiststats['products'] = products.length

    const tenanti = await Tenant.findByPk(tenant)
    const bigqueryDataset = tenanti.bigqueryDataset
    // const bigqueryDataset = tenanti.bigqueryDataset
    
    if (bigqueryDataset && (artiststats['assets'] > 0 || artiststats['products'] > 0)) {
        const assetIsrcs = assets.map((item:any) => item.Asset.isrc).join('","')
        const assetQuery = assetIsrcs.length > 0 ? `ISRC IN ("${assetIsrcs}")` : 'NULL'

        const productUpcs = products.map((item: any) => item.Product.upc).join('","')
        const productQuery = artiststats['products']! > 0 ? `UPC IN ("${productUpcs}")` : 'NULL'

        const query = `SELECT
        SUM(CASE WHEN sales_data.Sale_Type = 'Download' THEN sales_data.Quantity END) AS Downloads,
        SUM(CASE WHEN CONTAINS_SUBSTR(sales_data.Sale_Type, 'Stream') THEN sales_data.Quantity END) AS Streams,
        SUM(sales_data.Royalty) AS Royalty
        FROM \`${bigqueryDataset}.v_sales_data\` sales_data
        WHERE ${assetQuery} OR ${productQuery}`

        const rows = await runBQquery(query)
        artiststats['downloads'] = rows[0]['Downloads'] || 0
        artiststats['streams'] = rows[0]['Streams'] || 0
        artiststats['royalty'] = rows[0]['Royalty'] || 0
    } else {
        ['downloads', 'streams', 'royalty'].forEach((key) => (artiststats[key] = 0))
    }

    res.status(200).send(artiststats)
})

const getArtistAssets = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const tenant = req.tenant;

    const assets = await Asset.scope({ method: ['Tenant', tenant] }).findAll({
        attributes: { exclude: ['TenantId'] },
        include: [
            {
                model: Product,
                attributes: ['id', 'upc', 'title'],
                through: {
                    attributes: [],
                },
            },
            {
                model: Artist,
                attributes: [],
                where: { id },
                required: true,
                through: {
                    attributes: [],
                },
            },
        ],
    });

    return res.status(200).send(assets);
});

const getArtistProducts = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    
    const result = Product.scope({method: ['Tenant', tenant]}).findAll({
        attributes: {exclude: ['TenantId']},
        include: [{
            model: Asset,
            attributes: ["id", "isrc", "title", "version"],
            through: {
              attributes: ['Number']
            }
        },
        {
            model: Artist,
            right: true,
            attributes: ["id", "artistName"],
            through: {
                attributes: [],
                where: {
                  ArtistId: id
                }
            }
        }]
    } )
    return res.send(result)

})

const downloadArtistData = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const tenant = req.tenant

    // const userEmail = (await User.findByPk(id)).email;
    const userEmail = "emma221999@gmail.com"

    if (!userEmail) return next(new CustomError.NotFoundError('User does not exist'));

    const artists = await Artist.scope({ method: ['Tenant', tenant] }).findAll({
        attributes: ['id', 'label', 'externalId', 'artistName', 'signDate'],
        // include: [
        //     {
        //         model: User,
        //         attributes: ['firstName', 'lastName'],
        //     }
        // ],
    });
    console.log(artists)
    if (!artists || artists.length === 0) return next(new CustomError.NotFoundError('No Artists found'));

    const csvWriter = createObjectCsvWriter({
        path: 'artist_data.csv',
        header: [
            { id: 'id', title: 'ID' },
            { id: 'label', title: 'LABEL' },
            { id: 'externalId', title: 'EXTERNAL ID'},
            { id: 'artistName', title: 'ARTIST NAME'},
            { id: 'signDate', title: 'SIGN DATE'}
        ]
    });

    const records = artists.map((user: any) => ({
        id: user.id,
        label: user.label,
        externalId: user.externalId,
        artistName: user.artistName,
        signDate: user.signDate
    }));

    await csvWriter.writeRecords(records);

    const attachment = [{
        filename: 'artist_data.csv',
        content: fs.createReadStream('artist_data.csv')
    }]
    // send csv to user mail
    await sendattachmentEmail(userEmail, attachment, "Artist")

    res.download('artist_data.csv', (err) => {
        if (err) {
            return next(new CustomError.BadRequestError('Error downloading file'));
        }
    });

});

export default { 
    createArtist, 
    updateArtist, 
    getArtist, 
    getArtists, 
    deleteArtist, 
    getArtistProducts, 
    getArtistAssets, 
    getArtistStats, 
    bulkSetArtistSplit, 
    createBulkArtist,
    downloadArtistData
 }