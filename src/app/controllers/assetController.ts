import express, { Request, Response, NextFunction } from 'express';
import {runBQquery} from '../helpers/big_query_run'
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import pagination from '../utils/pagination';
import db from '../../models/index';
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
const { Tenant, Artist, User, Asset, Product, ArtistAsset, Split, SplitShare } = db;
import { pullAllBy, split } from "lodash";
import { Assets } from '../../interface/Attributes';


const createAsset = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;
    let asset: {[key: string]: any} = {};
    asset['TenantId'] = tenant
    asset['isrc'] = req.body.isrc
    asset['title'] = req.body.title
    asset['displayArtist'] = req.body.displayArtist
    asset['mainArtist'] = req.body.mainArtist
    asset['type'] = req.body.type ? req.body.type : 'Audio'

    if (req.body.otherArtist) asset['otherArtist'] = req.body.otherArtist
    if (req.body.type) asset['type'] = req.body.type
    if (req.body.version) asset['version'] = req.body.version
    if (req.body.mainGenre) asset['mainGenre'] = req.body.mainGenre
    if (req.body.subGenre) asset['subGenre'] = req.body.subGenre
    if (req.body.contributors) asset['contributors'] = req.body.contributors
    if (req.body.iswc) asset['iswc'] = req.body.iswc
    if (req.body.externalId) asset['externalId'] = req.body.externalId
    if (req.body.extra) asset['extra'] = req.body.extra
    if (req.body.assetIDs) asset['assetIDs'] = req.body.assetIDs

    let artists: any = []
    req.body.artists.forEach((artist: string) => {
        artists.push({
            "TenantId": tenant,
            "ArtistId": artist,
        })
    })

    asset['ArtistAssets'] = artists

    // set default splits                                                       
    let split: any;
    if (!req.body.split) {
        const artist = await Artist.scope({ method: ['Tenant', tenant] }).findByPk(req.body.artists[0], { attributes: ['split'] })
        split = artist.split
    } else {
        split = req.body.split
    }

    const createdAsset = await sequelize.transaction(async (t: Transaction) => {
        const createdAsset = await Asset.create(asset, { include: [ArtistAsset], validate: true }, { transaction: t })
        if (split) {
            let splitshare: any[] = []
            split.forEach((splitsh: {[key: string]: string}) => {
                splitshare.push({
                    "TenantId": tenant,
                    "UserId": splitsh.user,
                    "Share": splitsh.share,
                })
            })
            let newsplit: {[key: string]: any} = {}
            newsplit['TenantId'] = tenant
            newsplit['AssetId'] = createdAsset.id
            newsplit['name'] = createdAsset.isrc + ': ' + createdAsset.title
            newsplit['SplitShares'] = splitshare

            await Split.create(newsplit, { include: [SplitShare] }, { transaction: t })
        }
        return createdAsset
    })

    return res.status(201).send(createdAsset)
});

const createBulkAsset = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        let bulkassets = req.body.assets
        let createdassets = []
        var itemsProcessed = 0;
        let asset: any = [], errors = []

        for (let i = 0; i < bulkassets.length; i++) {
            bulkassets[i].artists = split(bulkassets[i].artists, '|')
            bulkassets[i].TenantId = tenant
            bulkassets[i].type = bulkassets[i].type ? bulkassets[i].type : 'Audio'
            bulkassets[i].iswc = (bulkassets[i].iswc != '') ? bulkassets[i].iswc : null
            bulkassets[i].version = (bulkassets[i].version != '') ? bulkassets[i].version : null
            bulkassets[i].externalId = (bulkassets[i].externalId != '') ? bulkassets[i].externalId : null
            bulkassets[i].mainGenre = (bulkassets[i].mainGenre != '') ? split(bulkassets[i].mainGenre, '|') : null
            bulkassets[i].subGenre = (bulkassets[i].subGenre != '') ? split(bulkassets[i].subGenre, '|') : null
            bulkassets[i].mainArtist = (bulkassets[i].mainArtist != '') ? split(bulkassets[i].mainArtist, '|') : null
            let contributors = {
                "producer": split(bulkassets[i].producer, '|') || null,
                "songwriter": split(bulkassets[i].songwriter, '|') || null,
                "mixer": split(bulkassets[i].remixer, '|') || null
            }
            bulkassets[i].contributors = contributors;

            
            itemsProcessed++
            
            try {
                asset[i] = await Asset.create( bulkassets[i] )
                console.log(asset[i])
            } catch (e: any) {
                if (Array.isArray(e.errors)) {
                    e.errors.forEach(function (err: any) {
                        errors.push( bulkassets[i].isrc + '-' + err.message + ': ' + err.value )
                    })
                } else errors.push(bulkassets[i].isrc + '-' + e)
                continue
            }

            createdassets.push( bulkassets[i].title )

            bulkassets[i].artists.forEach(async (artist: string) => {
                const [createdArtist] = await Artist.scope({ method: ['Tenant', tenant] }).findOrCreate({
                    where: { artistName: artist },
                    defaults: { TenantId: tenant },
                    attributes: ['id']
                });
                await ArtistAsset.create({
                    TenantId: tenant,
                    AssetId: asset[i].id,
                    ArtistId: createdArtist.id
                });
            });

        }
        
        if(itemsProcessed === bulkassets.length) {
            return res.status(201).send({ message: "Done.", createdassets, errors })
        }
    })
})

const setBulkSplits = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const tenanti = await Tenant.findByPk(tenant);
        const tenantuser = tenanti.user;
        console.log(tenantuser);

        let bulkassets = req.body.assets;
        let itemsProcessed = 0;
        let errors = [];

        for (const bulkasset of bulkassets) {
            itemsProcessed++;

            try {
                const asset = await Asset.scope({
                    method: ['Tenant', tenant],
                }).findOne({
                    where: { isrc: bulkasset.isrc },
                    attributes: ['id', 'isrc', 'title'],
                    include: [
                        {
                            model: Artist,
                            attributes: ['id', 'split'],
                            through: { attributes: [] },
                            include: [
                                {
                                    model: User,
                                    attributes: ['id'],
                                    through: { attributes: [] },
                                },
                            ],
                        },
                    ],
                });

                if (!asset) throw new Error('Asset not found');

                const split = await Split.scope({
                    method: ['Tenant', tenant],
                }).findOne({
                    where: { AssetId: asset.id, ProductId: null, type: null },
                    attributes: ['id'],
                });

                if (split) throw new Error('Splits already exist');

                const splitShares = [];

                if (bulkasset.split && bulkasset.split.length > 0) {
                    splitShares.push(...bulkasset.split.map((s:any) => ({
                        TenantId: tenant,
                        UserId: s.user,
                        Share: s.share,
                    })));
                } 
                // else {
                //     const artistIds = asset.Artists.map(artist => artist.id);
                //     const artistSplits = await SplitShare.findAll({
                //         where: { ArtistId: artistIds },
                //         attributes: ['id', 'share'],
                //         group: ['UserId'],
                //         raw: true,
                //     });

                //     artistSplits.forEach((split) => {
                //         splitShares.push({
                //             TenantId: tenant,
                //             UserId: split.UserId,
                //             Share: split.Share,
                //         });
                //     });
                // }

                // const remainingShare = 100 - splitShares.reduce((acc, cur) => acc + cur.Share, 0);

                // splitShares.push({
                //     TenantId: tenant,
                //     UserId: tenantuser,
                //     Share: remainingShare,
                // });

                await Split.create(
                    {
                        TenantId: tenant,
                        AssetId: asset.id,
                        name: asset.isrc + ': ' + asset.title,
                        SplitShares: splitShares,
                    },
                    { include: [SplitShare], validate: true },
                    { transaction: t }
                );
            } catch (e:any) {
                if (Array.isArray(e.errors)) {
                    e.errors.forEach(function (err: any) {
                        errors.push(bulkasset.isrc + '-' + err.message + ': ' + err.value);
                    });
                } else {
                    errors.push(bulkasset.isrc + '-' + e.message);
                }
                continue;
            }
        }

        return res.status(201).send({ message: 'Done.', itemsProcessed, errors });
    });
});

const updateAsset = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  await sequelize.transaction(async (t: Transaction) => {
    const id = req.params.id;
    const tenant = req.tenant;

    const checkasset = await Asset.scope({ method: ['Tenant', tenant] }).findByPk(id);
    if (checkasset === null) return res.status(400).send({ message: 'Asset does not exist!' });

    if (req.body.artists) {
      await checkasset.setArtists([]);
      const artists = req.body.artists.map((artist: string) => {
        return {
          TenantId: tenant,
          ArtistId: artist,
          AssetId: id,
        };
      });
      await ArtistAsset.bulkCreate(artists, { validate: true });
    }

    await Asset.update(req.body, { where: { id: id } }, { transaction: t });
    return res.send({ message: 'Asset was updated successfully.' });
  });
});

const getAssetInfo = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant

        const result = await Asset.scope({method: ['Tenant', tenant]}).findByPk( id, {
            attributes: {exclude: ['TenantId']},
            include: [
                {
                    model: Artist,
                    attributes: ["id", "artistName"],
                    through: {
                        attributes: []
                    }
                },
                {
                    model: Product,
                    attributes: ["id", "upc", "title", "displayArtist", "status", "format", "releaseDate"],
                    through: {
                        attributes: []
                    }
                }
            ]
        })
        console.log(result)
        return res.json({result})

    })

})

const getAssets = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;

        let include: any[] = [];
        let attributes: string[] | { exclude: string[] } = [];

        if (typeof req.query.include === "string") {
            attributes = split(req.query.include, ",");
        } else {
            attributes = { exclude: ["TenantId"] };
            include = [
                {
                    model: Product,
                    attributes: ["id", "upc", "title"],
                    through: {
                        attributes: [],
                    },
                },
                {
                    model: Artist,
                    attributes: ["id", "artistName"],
                    through: {
                        attributes: [],
                    },
                },
            ];
        }

        if (req.query.splits === "true") {
            include.push({
                model: Split,
                attributes: ["id"],
                where: {
                    id: {
                        [Op.ne]: null,
                    },
                },
            });
        }

        const page = Number(req.query.page);
        const size = Number(req.query.size);

        if (page < 1 || size < 0) {
            return next(new CustomError.BadRequestError('Invalid pagination parameters'));
        }
        
        const { limit, offset } = getPagination(page, size);
        const result = await Asset.scope({ method: ["Tenant", tenant] }).findAndCountAll({
            attributes,
            include,
            limit,
            offset,
            order : [['updatedAt', 'DESC']]
        });

        console.log('first result count', result.count)

        const totalcount = await Split.findAll({
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
            response = getPagingData(result, page, limit, 'Assets');
        } else {
            response = {
                count: result.count,
                Assets: result.rows
            }        
        }


        return res.send(response);
    });
});

const assetArtists = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
        const id = req.params.id;
        const tenant = req.tenant;

        const asset = await Asset.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!asset) {
            throw new CustomError.NotFoundError('Asset not found');
        }

        await asset.setArtists([]);

        const artists = req.body.artists.map((artist: string) => {
            return {
                TenantId: tenant,
                ArtistId: artist,
                AssetId: id,
            };
        });

        const result = await ArtistAsset.bulkCreate(artists, { validate: true });
        return res.send(result);

});

const getAssetStats = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    let assetstats: {[key: string]: any} = {}

    let isrc = await Asset.scope({method: ['Tenant', tenant]}).findByPk( id, {
        attributes: ['isrc', 'assetIDs']
    } )
    let isrcs = isrc['assetIDs'] ? isrc['isrc'] + '\',\'' + isrc['assetIDs'].join("','") : isrc['isrc']

    const tenanti = await Tenant.findByPk(tenant)
    let bigqueryDataset = tenanti?.bigqueryDataset
    if (bigqueryDataset) {
        const query = `SELECT
        SUM(CASE WHEN sales_data.Sale_Type = 'Download' THEN sales_data.Quantity END) AS Downloads,
        SUM(CASE WHEN CONTAINS_SUBSTR(sales_data.Sale_Type, 'Stream') THEN sales_data.Quantity END) AS Streams,
        SUM(sales_data.Royalty) AS Royalty
        FROM \`${bigqueryDataset}.v_sales_data\` sales_data
        WHERE ISRC IN ('${isrcs}')`
        
        const rows = await runBQquery(query)
        assetstats['downloads'] = rows['0']['Downloads']
        assetstats['streams'] = rows[0]['Streams']
        assetstats['royalty'] = rows[0]['Royalty']

    } else {
        assetstats['downloads'] = 0;
        assetstats['streams'] = 0;
        assetstats['royalty'] = 0;
    }

    res.status(200).json(assetstats)

})

const deleteAsset = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const id = req.params.id
        
        const asset = Asset.scope({method: ['Tenant', tenant]}).findByPk( id )
            if (asset === null) return next (new CustomError.NotFoundError('Asset not found'))

        await Asset.destroy({ where: { id: id } }, { transaction: t} )

        return res.send({ message: "Asset was deleted successfully." })
        
    })
})

const setAssetDefaultSplit = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const id = req.params.id

        var split = await Split.scope({method: ['Tenant', tenant]}).findOne({
            where: { AssetId: id, ProductId: null, type: null },
            attributes: ['id']
        } )
        if (split) return next (new CustomError.BadRequestError('Asset split already set'))

        const asset = await Asset.scope({method: ['Tenant', tenant]}).findByPk( id, {
            attributes: ['isrc', 'title'],
            include: [{ model: Artist, attributes: ["id", "split"], through: {attributes: []} }]
        })
        if (asset === null) return next (new CustomError.NotFoundError('Asset does not exist'))

        let artistsplit = asset.Artists[0].split
        if (!artistsplit) return next (new CustomError.BadRequestError('Artist default split not set'))

        // set asset splits
        let splitshare: any = []
        artistsplit.forEach((splitsh: any) => {
            splitshare.push({
                "TenantId": tenant,
                "UserId": splitsh.user,
                "Share": splitsh.share,
            })
        })
        let newsplit: { [key: string]: any } = {}
        newsplit['TenantId'] = tenant
        newsplit['AssetId'] = id
        newsplit['name'] = asset.isrc + ': ' + asset.title
        newsplit['SplitShares'] = splitshare

        await Split.create( newsplit, { include: [SplitShare] }, { transaction: t} )
        return res.status(200).send({ message: "Splits updated succesfully." })

    })
})

const downloadAssetData = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const tenant = req.tenant

    // const userEmail = (await User.findByPk(id)).email;
    const userEmail = "emma221999@gmail.com"

    if (!userEmail) return next(new CustomError.NotFoundError('User does not exist'));

    const assets = await Asset.scope({ method: ['Tenant', tenant] }).findAll({
        attributes: ['id', 'isrc', 'iswc', 'externalId', 'displayArtist', 'mainArtist', 'type', 'version', 'mainGenre', 'subGenre', ],
        // include: [
        //     {
        //         model: User,
        //         attributes: ['firstName', 'lastName'],
        //     }
        // ],
    });
    console.log(assets)
    if (!assets || assets.length === 0) return next(new CustomError.NotFoundError('No Artists found'));

    const csvWriter = createObjectCsvWriter({
        path: 'asset_data.csv',
        header: [
            { id: 'id', title: 'ID' },
            { id: 'isrc', title: 'ISRC' },
            { id: 'iswc', title: 'ISWC' },
            { id: 'externalId', title: 'External ID' },
            { id: 'displayArtist', title: 'Display Artist' },
            { id: 'mainArtist', title: 'Main Artist' },
            { id: 'type', title: 'Type' },
            { id: 'version', title: 'Version' },
            { id: 'mainGenre', title: 'Main Genre' },
            { id: 'subGenre', title: 'Sub Genre' },
        ]
    });

    const records = assets.map((user: any) => ({
        id: user.id,
        isrc: user.isrc,
        iswc: user.iswc,
        externalId: user.externalId,
        displayArtist: user.displayArtist,
        mainArtist: user.mainArtist,
        type: user.type,
        version: user.version,
        mainGenre: user.mainGenre,
        subGenre: user.subGenre,
    }));

    console.log(records)

    await csvWriter.writeRecords(records);

    const attachment = [{
        filename: 'asset_data.csv',
        content: fs.createReadStream('asset_data.csv')
    }]
    // send csv to user mail
    await sendattachmentEmail(userEmail, attachment, "Asset");

    res.download('asset_data.csv', (err) => {
        if (err) {
            return next(new CustomError.BadRequestError('Error downloading file'));
        }
    });

});

export default { getAssetInfo, getAssets, createAsset, 
    updateAsset, assetArtists, getAssetStats, 
    deleteAsset, setAssetDefaultSplit, createBulkAsset, 
    setBulkSplits, downloadAssetData
 }