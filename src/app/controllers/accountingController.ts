import { Request, Response, NextFunction } from 'express'
import { Transaction } from 'sequelize/types'
import db from '../../models'
import dotenv from 'dotenv'
dotenv.config()
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors'
const { sequelize, Sequelize } = db
const { Tenant, Artist, TenantUser, Payment } = db


import {runBQquery} from '../helpers/big_query_run'

const getUserStats = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {

    const tenant = req.tenant
    const user = req.params.id

    const tenanti = await Tenant.findByPk(tenant)
    let bigqueryDataset = tenanti.bigqueryDataset
    // let bigqueryDataset = "royalti-project.royalti_demo"
    // let user = "a0e84feb-2524-45f3-b958-e3ea440fa5d6"
    
    let paid = await Payment.scope({method: ['Tenant', tenant]}).sum('amountUSD', { where: { UserId: user } })
    console.log(paid)

    if (bigqueryDataset) {
        const query = `SELECT
        SUM(Royalty*share/100) AS Royalty_Share
        FROM (SELECT IFNULL(upc, "null") upc, IFNULL(isrc, "null") isrc, type, share, UserId FROM \`${bigqueryDataset}.v_all_splits\`) splits
        LEFT JOIN (SELECT Royalty_Type, IFNULL(UPC, "null") UPC, IFNULL(ISRC, "null") ISRC, Royalty FROM \`${bigqueryDataset}.v_sales_data\`) sales_data
        ON splits.upc = sales_data.UPC AND splits.isrc = sales_data.ISRC AND (splits.type = sales_data.Royalty_Type OR splits.type IS NULL)
        WHERE UserId = '${user}' GROUP BY UserId`

        const rows = await runBQquery(query)
        let result: { Royalty_Share : number, paid: number } = { Royalty_Share: 0, paid: 0 }
        console.log(rows)
        result['Royalty_Share'] = rows.length > 0 ? rows[0]['Royalty_Share'] : 0
        result['paid'] = paid

        res.status(200).send(result)
    } else return next (new CustomError.BadRequestError('No royalty data' ))
})
export { getUserStats }