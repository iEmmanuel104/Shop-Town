import express, { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
const { sequelize, Sequelize } = db
import pagination from '../utils/pagination';
const { getPagination, getPagingData } = pagination;
const Op = Sequelize.Op;
const { Tenant, User, Artist, Payment } = db;
import { pullAllBy, split } from "lodash";
import { Payments } from '../../interface/Attributes';
import dotenv from 'dotenv'
import { uploadsingleFile, uploadmultipleFiles } from '../utils/cloudConfig';
dotenv.config()

const createPayment = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        let payment: { [key: string]: any } = {}

        payment['TenantId'] = tenant
        payment['UserId'] = req.body.user
        payment['title'] = req.body.title
        payment['transactionDate'] = req.body.transactionDate
        payment['currency'] = req.body.currency
        payment['amount'] = req.body.amount
        if (req.body.amountUSD) payment['amountUSD'] = req.body.amountUSD
        if (req.body.conversionRate) payment['conversionRate'] = req.body.conversionRate
        if (req.body.memo) payment['memo'] = req.body.memo
        // 
        
        if (req.files) {
            const { publicUrls, errors, filesProcessed } = await uploadmultipleFiles(req, 'payment')
            if (errors.length > 0) {
                return res.status(400).send({ errors })
            }
            console.log(filesProcessed)
            payment['files'] = publicUrls
        }

        // const user = await User.scope().findOne({ where: {id: req.body.user} })
        // if (!user) return next(new CustomError.BadRequestError('User not found'))
        const newpayment = await Payment.create( payment, {transaction: t} )
            // payment.setUser(user)
        return res.status(201).send(newpayment)

    })
})

const createBulkPayment = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        let bulkpayments = req.body.payments
        const createdpayments = []
        var itemsProcessed = 0
        let bulkpayment = []
        let user = []
        let errors = []

        for (let i = 0; i < bulkpayments.length; i++) {
            itemsProcessed++

            console.log(bulkpayments[i])
            bulkpayments[i].TenantId = tenant
            if (bulkpayments[i].currency != 'USD') {
                bulkpayments[i].amount = parseFloat(bulkpayments[i].amount.replaceAll(',', ''))
                bulkpayments[i].amountUSD = parseFloat(bulkpayments[i].amountUSD.replaceAll(',', ''))
                bulkpayments[i].conversionRate = bulkpayments[i].amount / bulkpayments[i].amountUSD
            } else {
                bulkpayments[i].amount = null
                bulkpayments[i].amountUSD = parseFloat(bulkpayments[i].amountUSD.replaceAll(',', ''))
                bulkpayments[i].conversionRate = null
                bulkpayments[i].amount = null
            }
            bulkpayments[i].memo = (bulkpayments[i].memo != '') ? bulkpayments[i].memo : null
            console.log(bulkpayments[i])

            let payment = await Payment.scope({method: ['Tenant', tenant]}).findOne({ where: { title: bulkpayments[i].title, transactionDate: bulkpayments[i].transactionDate, amountUSD: bulkpayments[i].amountUSD }, attributes: ['id'] })
            if (payment) continue

            user[i] = await Tenant.findByPk(tenant, {
                include: [{
                    model: User,
                    where: { firstName: bulkpayments[i].firstName, lastName: bulkpayments[i].lastName },
                    attributes: ["id"],
                    through: {
                    attributes: ['nickName']
                    }
                }]
            })
            
            if (user[i]) bulkpayments[i].UserId = user[i].Users[0].id
            else continue
            
            try {
                bulkpayment[i] = await Payment.create( bulkpayments[i] )
            } catch (e: any) {
                if (Array.isArray(e.errors)) {
                    e.errors.forEach(function (err: any) {
                        errors.push( bulkpayments[i].title + '-' + err.message + ': ' + err.value )
                    })
                } else errors.push(bulkpayments[i].title + '-' + e)
                continue
            }

            createdpayments.push(bulkpayments[i].title)
            console.log(bulkpayment[i])
        }
        
        if (itemsProcessed === bulkpayments.length) {
            return res.status(201).send({ message: "Done.", createdpayments, errors })
        }

    })  
})

const updatePayment = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const id = req.params.id
        const tenant = req.tenant;

        let payment: {[key: string]: any} = {}

        payment['TenantId'] = tenant
        payment['UserId'] = req.body.user
        payment['title'] = req.body.title
        payment['transactionDate'] = req.body.transactionDate
        payment['currency'] = req.body.currency
        payment['amount'] = req.body.amount
        if (req.body.amountUSD) payment['amountUSD'] = req.body.amountUSD
        if (req.body.conversionRate) payment['conversionRate'] = req.body.conversionRate
        if (req.body.memo) payment['memo'] = req.body.memo
        if (req.body.files) payment['files'] = req.body.files
        
        const checkpayment = await Payment.scope({method: ['Tenant', tenant]}).findByPk( id )
        if (checkpayment === null) return next (new CustomError.BadRequestError("Payment does not exist."))
        
        await Payment.update( payment, { where: { id } }, {transaction: t} )
        return res.status(200).send({ message: "Payment was updated successfully." })

    })
})

interface IncludeObject {
    model: any;
    attributes: string[];
}

const getPayments = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const tenant = req.tenant

        let where: {[key: string]: any} = {}
        let attributes: string[] | {exclude: string[]} = []
        let include: IncludeObject[] = []
        if (req.query.user) where['UserId'] = req.query.user
        if (req.query.include) {
            attributes = split(req.query.include as string, ',')
            include = []
        }
        else {
            attributes = {exclude: ['TenantId']}
            include = [{
                model: User,
                attributes: ["id", "firstName", "lastName"]
            }]
        }
        const page = req.query.page ? Number(req.query.page) : 1;
        const size = req.query.size ? Number(req.query.size) : 10;

        if (page < 1 || size < 0) {
            return next(new CustomError.BadRequestError('Invalid pagination parameters'));
        }
        const { limit, offset } = getPagination(page, size);
        
        const result = await Payment.scope({method: ['Tenant', tenant]}).findAndCountAll({
            where,
            attributes,
            include,
            limit,
            offset,
            order: [['updatedAt', 'DESC']]
        })

        console.log('first result count', result.count)

        const totalcount = await Payment.findAll({
            where,
            attributes,
            include,
            raw: true
        });

        const specificCount = await totalcount.length;

        if (specificCount != result.count) {
            result.count = specificCount;
        }
        console.log('multiple result count', result.count)

        const response = getPagingData(result, page, limit, 'Payments');

        return res.status(200).send(response);
    })
})

const getPayment = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const id = req.params.id
        const tenant = req.tenant

        let attributes: string[] | { exclude: string[] } = []
        let include: IncludeObject[] = []
        if (req.query.include) {
            attributes = split(req.query.include as string, ',')
            include = []
        }
        else {
            attributes = {exclude: ['TenantId']}
            include = [{
                model: User,
                attributes: ["id", "firstName", "lastName"]
            }]
        }

        const result = await Payment.scope({ method: ['Tenant', tenant] }).findByPk(id, {
            attributes,
            include
        });

        if (result === null) return next (new CustomError.BadRequestError("Payment does not exist."))

            return res.status(200).send(result)

    })

})

const deletePayment = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        const tenant = req.tenant
        const id = req.params.id

        let checkPayment = Payment.scope({method: ['Tenant', tenant]}).findByPk( id )
        if (!checkPayment) return res.status(400).send({message: 'Payment does not exist!'})

        Payment.destroy({ where: { id } }, {transaction: t})
            return res.status(200).send({ message: "Payment was deleted successfully." })
    })

})


export default { getPayment, getPayments, createPayment, updatePayment, deletePayment, createBulkPayment }