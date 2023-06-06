import express, { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
const { sequelize, Sequelize } = db
import pagination from '../utils/pagination';
const { getPagination, getPagingData } = pagination;
const Op = Sequelize.Op;
const { Tenant, User, Artist, Revenue } = db;
import { pullAllBy, split } from "lodash";
import { Revenues } from '../../interface/Attributes';
import dotenv from 'dotenv'
import { uploadsingleFile, uploadmultipleFiles } from '../utils/cloudConfig';
dotenv.config()
// {
//     // "artist": "John Doe",
//     "title": "test Album Sale test",
//     "transactionDate": "2023-04-21T12:00:00Z",
//     "type": "Royalti",
//     "currency": "USD",
//     "amount": 74000.00,e
//     "amountUSD": 100.00,
//     "conversionRate": 740.00,
//     "memo": "Sale of album",
//     "files": ["file1.pdf", "file2.pdf"],
//     "split": [
//         {
//             "user": "8bf48f49-bcd3-4d8f-b5e0-7411ec71f2be",
//             "share": 60.00
//         },
//         {
//             "user": "91f1d1bd-ef25-4990-bd4f-aeee696c73a9",
//             "share": 40.00
//         }
//     ]
// }

const createRevenue = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        let revenue: {[key: string]: any} = {}
        revenue['TenantId'] = tenant
        if (req.body.artist) revenue['ArtistId'] = req.body.artist
        revenue['title'] = req.body.title
        revenue['type'] = req.body.type
        revenue['transactionDate'] = req.body.transactionDate
        revenue['currency'] = req.body.currency
        revenue['amount'] = req.body.amount
        if (req.body.amountUSD) revenue['amountUSD'] = req.body.amountUSD
        if (req.body.conversionRate) revenue['conversionRate'] = req.body.conversionRate
        if (req.body.memo) revenue['memo'] = req.body.memo
        // if (req.body.files) revenue['files'] = req.body.files
        let split = req.body.split ? req.body.split : []

        // if (req.file) {
        //     const  publicUrl  = await uploadsingleFile(req, 'revenue')
        //     revenue['files'] = [publicUrl]
        // }

        if (req.files) {
            const { publicUrls, errors, filesProcessed } = await uploadmultipleFiles(req, 'revenue')
            if (errors.length > 0) {
                return res.status(400).send({ errors })
            }
            console.log(filesProcessed)
            revenue['files'] = publicUrls
        }

        let newrevenue = await Revenue.create(revenue)
        if (split.length == 0) {
            return res.status(201).send(newrevenue)
        } else {
            const accountingsplit = await newrevenue.createAccountingSplit({
                TenantId: tenant,           
                name: 'Revenue Splits for ' + req.body.title
            }, { transaction: t })

            if (Array.isArray(split)) {
                split.forEach(async (splitsh: { [key: string]: string }) => {
                    await accountingsplit.createAccountingSplitShare({
                        "TenantId": tenant,
                        "UserId": splitsh.user,
                        "Share": splitsh.share,
                    })
                })
            }


            console.log(newrevenue)
            return res.status(201).send({ 'message': 'Revenue recorded with splits' })
        }
    })
})

const createBulkRevenue = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        let bulkrevenues = req.body.revenues
        const createdrevenues: string[] = []
        var itemsProcessed = 0;
        bulkrevenues.forEach(async (bulkrevenue: {[key: string]: string}) => {
            let revenue: { [key: string]: string } = {}

            revenue['TenantId'] = tenant
            revenue['type'] = bulkrevenue.type
            revenue['title'] = bulkrevenue.title
            revenue['transactionDate'] = bulkrevenue.transactionDate
            revenue['currency'] = bulkrevenue.currency
            revenue['amount'] = bulkrevenue.amount
            revenue['amountUSD'] = bulkrevenue.amountUSD
            if (bulkrevenue.conversionRate) revenue['conversionRate'] = bulkrevenue.conversionRate
            if (bulkrevenue.memo) revenue['memo'] = bulkrevenue.memo
            if (bulkrevenue.files) revenue['files'] = bulkrevenue.files

            itemsProcessed++

            const artist = await Artist.scope().findOne({ where: { artistName: bulkrevenue.artist }, attributes: ['id'], transaction: t })
            revenue['ArtistId'] = artist.id

            const createdRevenue = await Revenue.create(revenue, { transaction: t })
            createdrevenues.push(createdRevenue.title)

            if (itemsProcessed === bulkrevenues.length) {
                return res.status(201).send({ message: "Done.", createdrevenues })
            }
        })
    })
})

const updateRevenue = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant
        // const tenant = req.tenant
        let revenue: { [key: string]: string |  string[] } = {}

        revenue['TenantId'] = tenant
        if (req.body.artist) revenue['ArtistId'] = req.body.artist
        revenue['title'] = req.body.title
        revenue['type'] = req.body.type
        revenue['transactionDate'] = req.body.transactionDate  
        revenue['currency'] = req.body.currency
        revenue['amount'] = req.body.amount
        if (req.body.amountUSD) revenue['amountUSD'] = req.body.amountUSD
        if (req.body.conversionRate) revenue['conversionRate'] = req.body.conversionRate
        if (req.body.memo) revenue['memo'] = req.body.memo
        if (req.files) {
            const { publicUrls, errors, filesProcessed } = await uploadmultipleFiles(req, 'revenue')
            if (errors.length > 0) {
                return res.status(400).send({ errors })
            }
            console.log(filesProcessed)
            revenue['files'] = publicUrls
        }

        const checkrevenue = await Revenue.scope({ method: ['Tenant', tenant] }).findByPk(id, { transaction: t });
        if (!checkrevenue) return next(new CustomError.BadRequestError('Revenue does not exist!'));

        await Revenue.update(revenue, { where: { id }, transaction: t });
        return res.status(200).send({ message: "Revenue was updated successfully." });
    });
});

interface IncludeObject {
    model: any;
    attributes: string[];
}

const getRevenues = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        let attributes = {}
        let include: IncludeObject[] = []
        if (req.query.include) {
            attributes = split(req.query.include as string, ',')
            include = []
        } else {
            attributes = { exclude: ['TenantId'] }
            include = [{
                model: Artist,
                attributes: ["id", "artistName"]
            }]
        }

        const page = Number(req.query.page);
        const size = Number(req.query.size);

        if (page < 1 || size < 0) {
            return next(new CustomError.BadRequestError('Invalid pagination parameters'));
        }
        const { limit, offset } = getPagination(page, size);

        try {
            const result = await Revenue.scope({ method: ['Tenant', tenant] }).findAndCountAll({
                attributes,
                include,
                limit,
                offset,
                order: [['updatedAt', 'DESC']]
            })
            console.log('first result count', result.count)

            const totalcount = await Revenue.findAll({
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
                 response = getPagingData(result, page, limit, 'Revenues');
            } else {
                response = {
                    count: result.count,
                    Revenues: result.rows
                }
            }


            return res.status(200).send(response);
        } catch (e) {
            return next(new CustomError.BadRequestError('An error occured while trying to get revenues!'))
        }
    })
})

const getRevenue = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant
        let attributes, include: IncludeObject[]
        if (req.query.include) {
            attributes = split(req.query.include as string, ',')
            include = []
        }
        else {
            attributes = { exclude: ['TenantId'] }
            include = [{
                model: Artist,
                attributes: ["id", "artistName"]
            }]
        }
        const revenue = await Revenue.scope({ method: ['Tenant', tenant] }).findByPk(id, {
            attributes,
            include
        })
        if (!revenue) return next(new CustomError.BadRequestError('Revenue does not exist!'));
        return res.status(200).send(revenue)
    })
})

const deleteRevenue = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const id = req.params.id
        const checkRevenue = await Revenue.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!checkRevenue) return next(new CustomError.BadRequestError('Revenue does not exist!'));
        await Revenue.destroy({ where: { id } });
        return res.status(200).send({ message: "Revenue was deleted successfully." });
    });
});


export default { getRevenue, getRevenues, createRevenue, updateRevenue, deleteRevenue, createBulkRevenue }