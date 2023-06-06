import express, { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
const { sequelize, Sequelize } = db
import pagination from '../utils/pagination';
const { getPagination, getPagingData } = pagination;
const Op = Sequelize.Op;
const { Tenant, User, Artist, Asset, Product, Expense } = db;
import { uploadsingleFile, uploadmultipleFiles } from '../utils/cloudConfig';
import { split } from "lodash";
import { Expenses } from '../../interface/Attributes';

const createExpense = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t:Transaction) => {
        const tenant = req.tenant

        let expense: any = {}
        expense['TenantId'] = tenant
        expense['title'] = req.body.title
        expense['transactionDate'] = req.body.transactionDate
        expense['currency'] = req.body.currency
        expense['amount'] = req.body.amount
        if (req.body.amountUSD) expense['amountUSD'] = req.body.amountUSD
        if (req.body.conversionRate) expense['conversionRate'] = req.body.conversionRate
        if (req.body.memo) expense['memo'] = req.body.memo
        // if (req.body.files) expense['files'] = req.body.files
        if (req.files) {
            const { publicUrls, errors, filesProcessed } = await uploadmultipleFiles(req, 'expense')
            if (errors.length > 0) {
                return res.status(400).send({ errors })
            }
            console.log(filesProcessed)
            expense['files'] = publicUrls
        }

        let newexpense: {[key: string]: any};
        let item: {[key: string]: any} | null = null;
        if (req.body.type) {
            if (req.body.type == 'user') item = await User.findByPk( req.body.id )
            else if (req.body.type == 'artist') item = await Artist.scope({method: ['Tenant', tenant]}).findByPk( req.body.id )
            else if (req.body.type == 'product') item = await Product.scope({method: ['Tenant', tenant]}).findByPk( req.body.id )
            else if (req.body.type == 'asset') item = await Asset.scope({method: ['Tenant', tenant]}).findByPk( req.body.id )
            
            if (item == null) return next(new CustomError.BadRequestError(`${req.body.type} does not exist.`))

            newexpense = await item.createExpense( expense )
        } else {
            newexpense = await Expense.create( {expense}, {transaction: t} )
        }
        
        let split = req.body.split ? req.body.split : []
        if (split.length == 0) {
            return res.status(201).send(newexpense)
        } else {
            const accountingsplit = await newexpense.createAccountingSplit({
                TenantId: tenant,
                name: 'Expense Splits for ' + req.body.title
            })

            if (Array.isArray(split)) {
                split.forEach(async (splitsh: { [key: string]: string }) => {
                    await accountingsplit.createAccountingSplitShare({
                        "TenantId": tenant,
                        "UserId": splitsh.user,
                        "Share": splitsh.share,
                    })
                })
            }

            return res.status(201).send({ 'message': 'Expense recorded with splits for ' + req.body.type + ' with title ' + req.body.title })
        }

    })
})

const createBulkExpense = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    const bulkexpenses = req.body.expenses
    const createdexpenses: string[] = []
    let itemsprocessed = 0
    const errors: string[] = []

    await sequelize.transaction(async (t:Transaction) => {
        for (let i = 0; i < bulkexpenses.length; i++) {
            const bulkexpense = bulkexpenses[i]

            const expense = {
                TenantId: tenant,
                title: bulkexpense.title,
                transactionDate: bulkexpense.transactionDate,
                currency: bulkexpense.currency,
                amount: bulkexpense.amount,
                amountUSD: bulkexpense.amountUSD,
                ...(bulkexpense.conversionRate && { conversionRate: bulkexpense.conversionRate }),
                ...(bulkexpense.memo && { memo: bulkexpense.memo }),
                ...(bulkexpense.files && { files: bulkexpense.files })
            }

            let newexpense: {[key: string]: any};
            let item: { [key: string]: any } | null = null;
            if (bulkexpense.type) {
                // push the type to the expense object
                expense.type = bulkexpense.type
                try {
                    if (bulkexpense.type == 'user') item = await User.findByPk(bulkexpense.id)
                    else if (bulkexpense.type == 'artist') item = await Artist.scope({ method: ['Tenant', tenant] }).findOne({ where: { artistName: bulkexpense.artist } })
                    else if (bulkexpense.type == 'product') item = await Product.scope({ method: ['Tenant', tenant] }).findOne({ where: { title: bulkexpense.product } })
                    else if (bulkexpense.type == 'asset') item = await Asset.scope({ method: ['Tenant', tenant] }).findOne({ where: { title: bulkexpense.asset } })

                    if (item == null) {
                        errors.push(`${bulkexpense.type}+ does not exist.`)
                        continue
                    }
                    // capitalise the first letter of the type
                    bulkexpense.type = bulkexpense.type.charAt(0).toUpperCase() + bulkexpense.type.slice(1)
                    newexpense = await item[`createExpense`](expense)
                    createdexpenses.push(newexpense.title)
                    itemsprocessed++
                } catch (error) {
                    errors.push(`Error creating expense for ${bulkexpense.type} with title: ${bulkexpense.title}`)
                    continue
                }
            } else {
                try {
                    newexpense = await Expense.create(expense, { transaction: t })
                    createdexpenses.push(newexpense.title)
                    itemsprocessed++
                } catch (error: any) {
                    errors.push(`Error creating expense: ${error.message}`)
                    continue
                }
            }
        }

        if (errors.length > 0) return res.status(201).send({ message: "Done with errors.", createdexpenses, errors })
        else return res.status(201).send({ message: "Done.", createdexpenses, itemsprocessed })
    })
})

const updateExpense = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t:Transaction) => {
        const id = req.params.id
        const tenant = req.tenant

        let expense: {[key:string]: any} = {}

        expense['TenantId'] = tenant
        if (req.body.artist) expense['ArtistId'] = req.body.artist 
        if (req.body.product) expense['ProductId'] = req.body.product   
        if (req.body.asset) expense['AssetId'] = req.body.asset 
        expense['type'] = req.body.type
        expense['title'] = req.body.title
        expense['transactionDate'] = req.body.transactionDate
        expense['currency'] = req.body.currency
        expense['amount'] = req.body.amount
        if (req.body.amountUSD) expense['amountUSD'] = req.body.amountUSD
        if (req.body.conversionRate) expense['conversionRate'] = req.body.conversionRate
        if (req.body.memo) expense['memo'] = req.body.memo
        if (req.body.files) expense['files'] = req.body.files
        
        const checkexpense = await Expense.scope({method: ['Tenant', tenant]}).findByPk( id )

        if (checkexpense === null) return next(new CustomError.BadRequestError("message: Expense does not exist."))
          
        await Expense.update( expense, { where: { id } }, { transaction: t } )

        return res.status(200).send({ message: "Expense was updated successfully." })
    })
})

interface IncludeObject {
    model: any;
    attributes: string[];
}

const getExpenses = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t:Transaction) => {
        const tenant = req.tenant

        let include: IncludeObject[] | any[] = [];
        console.log(req.query.include)
        if (req.query.include) {
            const models = (req.query.include as string).split(',');
            include = models.map(model => {
                if (model === 'Artist') {
                    return {
                        model: Artist,
                        attributes: ['id', 'artistName'],
                    };
                } else if (model === 'Product') {
                    return {
                        model: Product,
                        attributes: ['id', 'title']
                    };
                } else if (model === 'Asset') {
                    return {
                        model: Asset,
                        attributes: ['id', 'title']
                    };
                }
            });
        } else {
            include = [{
                model: Artist,
                attributes: ['id', 'artistName']
            }];
        }

        const page = Number(req.query.page);
        const size = Number(req.query.size);

        if (page < 1 || size < 0) {
            return next(new CustomError.BadRequestError('Invalid pagination parameters'));
        }
        const { limit, offset } = getPagination(page, size);

        console.log(include, limit, offset);

        const result = await Expense.scope({ method: ['Tenant', tenant] }).findAndCountAll({
            include,
            attributes: { exclude: ['TenantId'] },
            limit,
            offset,
            order: [['updatedAt', 'DESC']],
        });

        if (!result) return next(new CustomError.BadRequestError(" message: No expenses found." ))

        console.log('first result count', result.count)

        const totalcount = await Expense.findAll({
            include,
            attributes: { exclude: ['TenantId'] },
            raw: true
        });

        const specificCount = await totalcount.length;

        if (specificCount != result.count) {
            result.count = specificCount;
        }
        console.log('multiple result count', result.count)

        let response;
        if (page || size) {
            response = getPagingData(result, page, limit, 'Expenses');
        } else {
            response = {
                count: result.count,
                Expenses: result.rows
            }
        }

        return res.status(200).send(response);

    })
})

const getExpense = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t:Transaction) => {
        const id = req.params.id
        const tenant = req.tenant
        const result = await Expense.scope({method: ['Tenant', tenant]}).findByPk( id, {
            attributes : { exclude: ['TenantId'] }
            })
        return res.status(200).send(result)
    })
})

const deleteExpense = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t:Transaction) => {

        const tenant = req.tenant
        const id = req.params.id

        let checkExpense = await Expense.scope({method: ['Tenant', tenant]}).findByPk( id )
        if (!checkExpense) return next(new CustomError.BadRequestError("message: Expense does not exist."))

        await Expense.destroy({ where: { id } }, {transaction: t})
        return res.status(200).send({ message: "Expense was deleted successfully." })
    })
})

export default { getExpense, getExpenses, createExpense, updateExpense, deleteExpense, createBulkExpense }