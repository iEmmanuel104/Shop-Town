import { Request, Response, NextFunction } from 'express'
import { Transaction } from 'sequelize/types'
import {fn, col, where, Op} from 'sequelize'
import { BigQuery } from '@google-cloud/bigquery'
import { pullAllBy, uniqBy, slice, omitBy } from 'lodash'
import db from '../../models'
const { Tenant, Artist, Split, SplitShare, Asset, Product, ArtistAsset } = db
import dotenv from 'dotenv'
dotenv.config()
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors'
import { runBQquery } from '../helpers/big_query_run'
const { sequelize, Sequelize } = db
const keyFilename = "./src/cloudkeys/bigquery.json" 
const bigquery = new BigQuery({ keyFilename });

const checkRoyaltyAsset = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    console.log(tenant)
    const tenanti = await Tenant.findByPk(tenant)
    let bigqueryDataset = tenanti.bigqueryDataset

    if (bigqueryDataset) {
        const query = `SELECT ISRC AS isrc, Track_Title, Track_Version, Track_Artist
        FROM \`${bigqueryDataset}.v_sales_data\`
        GROUP BY isrc, Track_Title, Track_Version, Track_Artist`
        const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
        const [rows] = await job.getQueryResults()
        let assets = await Asset.scope({method: ['Tenant', tenant]}).findAll({ attributes: ['isrc'] })

        let pullallrows = pullAllBy(rows, assets, 'isrc')
        let opullallrows = []
        // for (var i in pullallrows) if (pullallrows[i].isrc && !pullallrows[i].isrc.startsWith("A")) opullallrows.push(pullallrows[i])
        for (var i in pullallrows) if (pullallrows[i].isrc) opullallrows.push(pullallrows[i])
        
        res.status(200).send({ count: opullallrows.length, royaltyassets: slice(opullallrows, 0, 999) })

    } else return next (new CustomError.BadRequestError('No royalty data'))

})

const checkRoyaltyProduct = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    const tenanti = await Tenant.findByPk(tenant)
    let bigqueryDataset = tenanti.bigqueryDataset

    if (bigqueryDataset) {
        // const query = `SELECT Aggregator, UPC AS upc, Release_Name, Release_Artist, Label
        // FROM \`${bigqueryDataset}.v_sales_data\`
        // GROUP BY Aggregator, upc, Release_Name, Release_Artist, Label`
        const query = `WITH vals AS (
        SELECT Aggregator, UPC AS upc, ISRC AS isrc, Release_Name, Release_Artist, Label
        FROM \`${bigqueryDataset}.v_sales_data\` GROUP BY Aggregator, upc, isrc, Release_Name, Release_Artist, Label )
        SELECT Aggregator, UPC AS upc, ARRAY_AGG(ISRC IGNORE NULLS) AS isrcs, Release_Name, Release_Artist, Label
        FROM vals GROUP BY Aggregator, upc, Release_Name, Release_Artist, Label`
        const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
        const [rows] = await job.getQueryResults()
        let products = await Product.scope({method: ['Tenant', tenant]}).findAll({ attributes: ['upc'] })

        let urows = uniqBy(rows, 'upc')
        let pullallrows = pullAllBy(urows, products, 'upc')
        let opullallrows = []
        // for (var i in pullallrows) if (pullallrows[i].upc) opullallrows.push(pullallrows[i])

        // res.status(200).send(slice(pullAllBy(urows, products, 'upc'), 0, 99))
        res.status(200).send({ count: pullallrows.length, royaltyproducts: slice(pullallrows, 0, 999) })

    } else return next(new CustomError.BadRequestError( 'No royalty data' ))
})

const checkArtistSplits = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    
})

const checkAssetSplits = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    
    let all = await Asset.scope({method: ['Tenant', tenant]}).findAll({
        attributes: ['id'],
    })

    let defaultset = await Asset.scope({method: ['Tenant', tenant]})
    .findAll({
        attributes: ['id'],
        where: {
            '$Artists.split$': { [Op.ne]: null },
        },
        include: [
            { model: Artist, attributes: [], through: {attributes: []} }
        ]
    })

    let assetssplits = await Split.scope({method: ['Tenant', tenant]})
    .findAll({
        attributes: [['AssetId', 'id']],
        where: { ProductId: null, type: null }
    })

    pullAllBy(all, assetssplits, 'id')
    pullAllBy(defaultset, assetssplits, 'id')
    return res.send({all, defaultset})
    
})

const checkProductSplits = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    
    let all = await Product.scope({method: ['Tenant', tenant]}).findAll({
        attributes: ['id'],
    })

    let defaultset = await Product.scope({method: ['Tenant', tenant]})
    .findAll({
        attributes: ['id'],
        where: {
            '$Artists.split$': { [Op.ne]: null },
        },
        include: [
            { model: Artist, attributes: [], through: {attributes: []} }
        ]
    })

    let productssplits = await Split.scope({method: ['Tenant', tenant]})
    .findAll({
        attributes: [['ProductId', 'id']],
        where: { AssetId: null, type: null }
    })

    pullAllBy(all, productssplits, 'id')
    pullAllBy(defaultset, productssplits, 'id')
    return res.send({all, defaultset})
    
})

const checkAllSplits = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    
    let allsplits = await Split.scope({method: ['Tenant', tenant]})
    .findAll({
        attributes: ['id']
    })

    let allsplitsShares = await SplitShare.scope({method: ['Tenant', tenant]})
    .findAll({
        attributes: [['SplitId', 'id']],
        having: where(fn('SUM', col('Share')), 100),
        group: ['SplitId']
    })

    pullAllBy(allsplits, allsplitsShares, 'id')
    
    return res.send(allsplits)
    
})

const checkMissingRoyaltySplits = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => { 
    const tenant = req.tenant
    const tenanti = await Tenant.findByPk(tenant)
   let bigqueryDataset = tenanti.bigqueryDataset

    if (bigqueryDataset) {
        const query = `WITH splits AS (
            SELECT IFNULL(upc, "null") upc, IFNULL(isrc, "null") isrc, type FROM \`${bigqueryDataset}.v_all_splits\`
          ), 
          sales_data AS (
            SELECT Royalty_Type, IFNULL(UPC, "null") UPC, IFNULL(ISRC, "null") ISRC FROM \`${bigqueryDataset}.v_sales_data\`
            GROUP BY Royalty_Type, UPC, ISRC
          ),
          nosplits AS (
            SELECT sales_data.UPC, sales_data.ISRC FROM splits
            RIGHT JOIN sales_data ON splits.upc = sales_data.UPC AND splits.isrc = sales_data.ISRC AND (splits.type = sales_data.Royalty_Type OR splits.type IS NULL)
            WHERE splits.upc IS NULL AND splits.isrc IS NULL
            GROUP BY sales_data.UPC, sales_data.ISRC
          )
          SELECT DISTINCT nosplits.UPC, nosplits.ISRC FROM nosplits
          INNER JOIN splits ON nosplits.UPC = splits.upc
          `

        const rows = await runBQquery(query)
        res.status(200).send(rows)
    } else res.status(400).send(0)

})



export { checkRoyaltyAsset, checkRoyaltyProduct, checkAssetSplits, checkProductSplits, checkAllSplits, checkMissingRoyaltySplits }