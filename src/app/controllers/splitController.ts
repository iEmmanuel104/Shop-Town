import express, { Request, Response, NextFunction } from 'express';
import {runBQquery} from '../helpers/big_query_run'
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
const { sequelize, Sequelize } = db
import pagination from '../utils/pagination';
const { getPagination, getPagingData } = pagination;
const Op = Sequelize.Op;
const { User, Artist, Split, SplitShare, Product, Asset } = db;
import { sumBy } from "lodash";
import { Splits } from '../../interface/Attributes';
import { v4 as uuidv4 } from 'uuid';

const createSplit = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const split = {
            AssetId: req.body.asset ?? null,
            ProductId: req.body.product ?? null,
            type: req.body.type ?? null,

            // Convert period to Postgres range
            period: req.body.period
                ? sequelize.fn(
                    'daterange',
                    sequelize.fn('to_date', req.body.period.start, 'YYYY-MM-DD'),
                    sequelize.fn('to_date', req.body.period.end, 'YYYY-MM-DD')
                )
                : null,
            name: req.body.name ?? null,
            contract: req.body.contract ?? null,
            ContractId: req.body.ContractId ?? null,
            conditions: req.body.conditions ?? null,
            TenantId: tenant,
        };
        // Check for existing Split parameters
        const checksplit = await Split.scope({ method: ['Tenant', tenant] }).findOne({ where: split });
        if (checksplit !== null) {
            return next(new CustomError.BadRequestError('Split with same parameters already exists.'));
        }

        // Check sum of splits
        const splitSum = sumBy(req.body.split, (item: { [key: string]: any }) => Number(item.share));
        if (splitSum !== 100) {
            return next(new CustomError.BadRequestError(`Split must equal 100. Current total: ${splitSum}`));
        }
        console.log(req.body.split)
        console.log('====================================>>>>')
        const splitShares = req.body.split.map((splitsh: { [key: string]: any }) => ({
            TenantId: tenant,
            UserId: splitsh.user,
            Share: splitsh.share,
        }));

        const newSplit = await Split.create(
            split,
            { transaction: t }
        );

        // Bulk create split shares
        await SplitShare.bulkCreate(
            splitShares.map((splitShare:  any) => ({
                ...splitShare,
                SplitId: newSplit.id,
            })),
            { transaction: t }
        );

        return res.status(201).send(newSplit);
    });
});

const updateSplit = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id;
        // const tenant = 2; 
        const tenant = req.tenant; 
        
        // Add more validation on period and more here.

        let split:{[key:string]:string} = {};
        split['AssetId'] = req.body.asset || null;
        split['ProductId'] = req.body.product || null;
        split['type'] = req.body.type || null;
        split['period'] = req.body.period || null;

        // Check for existing Split first
        const checksplit = await Split.scope({ method: ['Tenant', tenant] }).findAndCountAll({ where: split });
        if (!checksplit) return next(new CustomError.BadRequestError('Split does not exist.'));

        // Check for existing Split parameters
        const existingSplit = await Split.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (checksplit.length > 1) return next(new CustomError.BadRequestError('Split with same parameters already exist.'));

        // Check sum of splits
        let splitSum = sumBy(req.body.split, (item: {[key:string]: string}) => Number(item.share));
        if (splitSum !== 100) return next(new CustomError.BadRequestError('Split must equal 100. Current total: ' + splitSum));

        await existingSplit.setUsers([]);

        if (req.body.name) split['name'] = req.body.name;
        if (req.body.contract) split['contract'] = req.body.contract;
        if (req.body.ContractId) split['ContractId'] = req.body.ContractId;
        if (req.body.conditions) split['conditions'] = req.body.conditions;
        split['TenantId'] = tenant;

        await Split.update(split, { where: { id: id } }, { transaction: t });

        let splitshare: any[] = [];
        req.body.split.forEach((splitsh: {[key:string]: any}) => {
            splitshare.push({
                "TenantId": tenant,
                "SplitId": id,
                "UserId": splitsh.user,
                "Share": splitsh.share,
            });
        });

        await SplitShare.bulkCreate(splitshare, { validate: true }, { transaction: t });

        return res.status(200).send({ message: "Split was updated successfully." })

    })
})

const getSplit = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const id = req.params.id
        const split = await Split.scope({ method: ['Tenant', tenant] }).findByPk(id, {
            attributes: { exclude: ['TenantId'] },
            include: [
                {
                    model: SplitShare,
                    attributes: ["UserId", "Share"],
                    include: [{
                        model: User,
                        attributes: ['firstName', 'lastName', 'ipi']
                    }]
                },
                {
                    model: Asset,
                    attributes: ["displayArtist", "isrc", "title", "version"],
                },
                {
                    model: Product,
                    attributes: ["displayArtist", "upc", "title"],
                }
            ]
        });
        if (!split) return next(new CustomError.BadRequestError('Split not found!'));

        return res.status(200).send(split);
    });
});

const getSplits = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;
    let where:{[key: string]: any} = {};
    let whereuser: { [key: string]: any } = {};
    let include: any[] = []
    if (req.query.asset) where['AssetId'] = req.query.asset;
    if (req.query.product) where['ProductId'] = req.query.product;
    if (req.query.type) where['type'] = req.query.type;
    if (req.query.user) whereuser['UserId'] = req.query.user;
    const page = Number(req.query.page)
    const size = Number(req.query.size) 

    if (page < 1 || size < 0) {
        return next(new CustomError.BadRequestError('Invalid pagination parameters'));
    }
    const { limit, offset } = getPagination(page, size);

    if (req.query.include == 'count') {
        include = [
            {
                model: SplitShare,
                where: whereuser,
                attributes: ["UserId"]
            },
            {
                model: Asset,
                attributes: ["isrc"],
            },
            {
                model: Product,
                attributes: ["upc"],
            }
        ]
    } else {
        include = [
            {
                model: SplitShare,
                where: whereuser,
                attributes: ["UserId", "Share"],
                include: [{
                    model: User,
                    attributes: ['firstName', 'lastName']
                }]
            },
            {
                model: Asset,
                attributes: ["displayArtist", "isrc", "title", "version"],
            },
            {
                model: Product,
                attributes: ["displayArtist", "upc", "title"],
            }
        ]
    }

    await sequelize.transaction(async (t: Transaction) => {        
        const result = await Split.scope({ method: ['Tenant', tenant] }).findAndCountAll({
            where: where,
            attributes: { exclude: ['TenantId'] },
            include: include,
            limit,
            offset,
            // order: [['updatedAt', 'DESC']]
        });
        console.log('first result count', result.count)

        const totalcount = await Split.findAll({
            where: where,
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
            response = getPagingData(result, page, limit, 'Splits');
        } else {
            response = {
                count: result.count,
                Splits: result.rows
            }
        }


        return res.send(response);    
    })    
});

const deleteSplit = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;

        const id = req.params.id;
        const split = await Split.scope({ method: ['Tenant', tenant] }).findByPk(id);
        if (!split) return next(new CustomError.BadRequestError('Split does not exist!'));
        await Split.destroy({ where: { id: id } });
        return res.status(200).send({ message: "Split was deleted successfully." });
    });
});

export default { createSplit, updateSplit, getSplit, getSplits, deleteSplit }