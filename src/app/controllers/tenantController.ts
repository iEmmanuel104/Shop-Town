import express, { Request, Response, NextFunction } from 'express';
import {runBQquery, createDataset} from '../helpers/big_query_run'
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import { modifyString } from '../utils/helpers';
import db from '../../models/index';
import { Tenants } from '../../interface/Attributes'
const { Tenant, Artist, TenantUser, ArtistAsset, Product, Asset} = db;
const { sequelize, Sequelize } = db
const Op = Sequelize.Op;

//  INTERFACES
interface GetTenantStatsRequest extends Request {
    tenant: Tenants['id'];
}


const createTenant = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        let tenant: {[key: string] : string} = {}
        tenant['name'] = req.body.name
        tenant['email'] = req.body.email ? req.body.email : null
        const createdTenant = await Tenant.create(tenant, { transaction: t });

        if (!createdTenant) return next(new CustomError.BadRequestError('Tenant not created'))

        return res.status(201).send(createdTenant)
    });
});

const updateTenant = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenantid = req.tenant;
        const tenant = await Tenant.findByPk(tenantid);
        if (!tenant) return next(new CustomError.BadRequestError('Tenant does not exist!'));
        const etenant: {[key:string]: string} = {};
        etenant['name'] = req.body.name? req.body.name : tenant.name
        etenant['user'] = req.body.user ? req.body.user : tenant.user
        etenant['email'] = req.body.email? req.body.email : tenant.email
        etenant['links'] = req.body.links ? req.body.links : tenant.links
        etenant['info'] = req.body.info ? req.body.info : tenant.info
        etenant['labeldetail'] = req.body.labeldetail ? req.body.labeldetail : tenant.labeldetail
        etenant['bigqueryDataset'] = req.body.bigqueryDataset? req.body.bigqueryDataset : tenant.bigqueryDataset

        await Tenant.update(etenant, { where: { id: tenantid } });
        return res.status(200).send({ message: "Tenant was updated successfully." });
    })
});

const getTenantInfo = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
    const tenant = req.tenant
    let tenantinfo: {[key: string]: any}= {}
        tenantinfo = await Tenant.findByPk(tenant, { attributes: ['uid', 'name', 'email', 'links', 'info', 'bigqueryDataset', 'labeldetail', 'user'], raw: true })
        tenantinfo['artists'] = await Artist.scope({ method: ['Tenant', tenant] }).count()
        tenantinfo['users'] = await TenantUser.scope({ method: ['Tenant', tenant] }).count()
        tenantinfo['assets'] = await Asset.scope({ method: ['Tenant', tenant] }).count()
        tenantinfo['products'] = await Product.scope({ method: ['Tenant', tenant] }).count()
        return res.status(200).send(tenantinfo)

    });
});

const getTenants = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const result = await Tenant.findAll()
        console.log(result)
        return res.status(200).send(result)
    });
});

const getTenantStats = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
    const tenant = req.tenant;
    const tenanti = await Tenant.findByPk(tenant);
    let bigqueryDataset = tenanti?.bigqueryDataset; // use optional chaining to avoid runtime error if tenanti is null or undefined
    let user = tenanti?.user; // use optional chaining to avoid runtime error if tenanti is null or undefined

        // let bigqueryDataset = "royalti-project.royalti_demo"
        // let user = "a0e84feb-2524-45f3-b958-e3ea440fa5d6"

    if (!bigqueryDataset) {
      return next(new CustomError.BadRequestError('bigqueryDataset does not exist for this tenant'));
    }
        const query = `SELECT
        SUM(sales_data.Royalty*share/100) AS Royalty_Share
        FROM \`${bigqueryDataset}.v_sales_data\` sales_data
        RIGHT JOIN \`${bigqueryDataset}.v_all_splits\` splits ON
        splits.upc = sales_data.UPC AND splits.isrc = sales_data.ISRC AND splits.type IS NULL
        WHERE UserId = '${user}' GROUP BY UserId`

            const rows = await runBQquery(query);
            return res.status(200).json(rows[0]);
    })
})

const deleteTenant = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const foundTenant = await Tenant.findByPk(tenant);
        if (!foundTenant) return next(new CustomError.BadRequestError('Tenant does not exist!'));
        await foundTenant.destroy({ where: { id: tenant } });
        return res.status(200).send({ message: "Tenant was deleted successfully." });
    })
});

// const getTenantArtists = async (req, res) => {

//     const tenant = req.tenant
// }

// const getTenantProducts = async (req, res) => {
//     const tenant = req.tenant
// }

// const getTenantAssets = async (req, res) => {

//     const tenant = req.tenant
// }

export default { createTenant, 
    updateTenant, 
    getTenantInfo, 
    getTenantStats,
    getTenants, deleteTenant };
