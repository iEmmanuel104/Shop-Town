import express, { Request, Response, NextFunction } from 'express';
import { runBQquery } from '../helpers/big_query_run'
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
import { createObjectCsvWriter } from 'csv-writer';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import PDFDocument from 'pdfkit';
import mailTemplates from '../utils/mailTemplates'
import fs from 'fs';
const { sendattachmentEmail } = mailTemplates
const { Tenant, User, TenantUser, ArtistUser, ArtistAsset, ArtistProduct, Artist, Product, Asset, Payment } = db;
// const User = db.sequelize.models.User;
const { sequelize, Sequelize } = db
import { BigQuery } from '@google-cloud/bigquery';

// Create a new BigQuery client
const keyFilename = "./src/cloudkeys/bigquery.json"
const bigquery = new BigQuery({ keyFilename });

const Op = Sequelize.Op;

import { Users } from '../../interface/Attributes';
import pagination from '../utils/pagination';
import { uploadsingleFile } from '../utils/cloudConfig';
import { result, split } from 'lodash';
// import bigquery from '@google-cloud/bigquery/build/src/types';
const { getPagination, getPagingData } = pagination;

interface User extends Omit<Users, 'fullName' | 'id' | 'isVerified' | 'isActive' | 'hasPassword' | 'profileImg'> {
    TenantUsers: {
        TenantId: number;
        nickName: string;
        userType: Users['role'][];
    };
}

interface BulkUser extends Omit<Users, 'id' | 'isVerified' | 'isActive' | 'fullName' | 'hasPassword'> {
    nickName: string;
    userType: Users['role'];
}

interface ExistingTenant {
    Users: Pick<Users, 'firstName' | 'lastName'>[];
}

interface UpdateUserRequest {
    firstName: string;
    lastName: string;
    ipi: string | null;
    profileImg: string | null;
    role: string;
}

interface getUsers extends Pick<Users, 'firstName' | 'lastName' | 'externalId'> {
}


const createUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;

        const user: User = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            TenantUsers: {
                TenantId: tenant,
                nickName: req.body.nickName,
                userType: [req.body.userType],
            },
            email: req.body.email || '',
            phone: req.body.phone || '',
            country: req.body.country || '',
            ipi: req.body.ipi || '',
            role: req.body.role || "guest",
        }
        const createdUser = await User.create(user, { include: [TenantUser] }, { transaction: t })

        if (!createdUser) return next(new CustomError.BadRequestError('User not created'))

        return res.status(201).send(createdUser)
    })
})

const createBulkUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;
    const bulkusers = req.body.users as BulkUser[];
    const createdusers: string[] = [];

    const existingUsers = await Tenant.findAll({
        where: { id: tenant },
        attributes: ['name'],
        include: [{
            model: User,
            where: { [Op.or]: bulkusers.map(bulkuser => ({ firstName: bulkuser.firstName, lastName: bulkuser.lastName })) },
            attributes: ["id"],
            through: {
                attributes: []
            }
        }]
    });

    const existingUserMap = new Map(existingUsers.flatMap((existingTenant: ExistingTenant) => existingTenant.Users.map(user => [user.firstName, user.lastName])));

    const usersToCreate = bulkusers.filter(bulkuser => !existingUserMap.has(bulkuser.firstName + bulkuser.lastName))
        .map(bulkuser => ({
            firstName: bulkuser.firstName,
            lastName: bulkuser.lastName,
            TenantUsers: {
                TenantId: tenant,
                nickName: bulkuser.nickName,
                userType: [bulkuser.userType]
            },
            email: bulkuser.email,
            phone: bulkuser.phone,
            country: bulkuser.country,
            externalId: bulkuser.externalId,
            role: bulkuser.role || "guest",
        }));

    await sequelize.transaction(async (t: Transaction) => {
        const createdUsers = await User.bulkCreate(usersToCreate, { include: [TenantUser], transaction: t });
        createdusers.push(...createdUsers.map((user: User) => user.firstName + ' ' + user.lastName));
    });

    return res.status(201).send({ message: "Done.", createdusers });
});

const addUserTenant = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant;
        console.log(tenant)
        const user = await User.findByPk(id);
        if (!user) return next(new CustomError.BadRequestError('User not found!'));

        const foundTenant = await Tenant.findByPk(tenant);
        if (!foundTenant) return next(new CustomError.BadRequestError('Tenant not found!'));

        const isAssociated = await foundTenant.hasUser(user);
        if (isAssociated) return next(new CustomError.BadRequestError('User already associated with tenant!'));

        await foundTenant.addUser(user, { through: { model: 'TenantUser' } });
        return res.status(200).send(`added user ${user.firstName} ${user.lastName} to ${foundTenant.name}`);

    })
})

const updateUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id;
        const tenant = req.tenant;
        const checkuser = await User.findByPk(id);
        if (!checkuser) return next(new CustomError.BadRequestError('User not found!'));

        const { firstName, lastName, profileImg, ipi, role } = checkuser;

        let user: UpdateUserRequest = {
            firstName: firstName,
            lastName: lastName,
            profileImg: profileImg,
            ipi: ipi || null,
            role: role,
        };

        if (req.file) {
            const publicUrl = await uploadsingleFile(req, 'User/profile', checkuser.id);
            console.log(publicUrl)
            user.profileImg = publicUrl;
        }
        user.firstName = req.body.firstName ?? user.firstName;
        user.lastName = req.body.lastName ?? user.lastName;
        user.ipi = req.body.ipi ?? user.ipi;
        user.role = req.body.role ?? user.role;


        await User.update(user, { where: { id } });

        // console.log(req.body.paymentsett)
        console.log(user)
        const tenantuser = await TenantUser.scope({ method: ['Tenant', tenant] }).findOne({ where: { UserId: id } });
        if (!tenantuser) return next(new CustomError.BadRequestError('User not found in this worskspace'))


        let tuser: {
            nickName?: string | null;
            userType?: string[] | null;
            paymentsettings?: { [key: string]: any; } | null;
        } = {};
        tuser.nickName = req.body.nickName ?? tenantuser.nickName;
        tuser.userType = req.body.userType ? [req.body.userType] : tenantuser.userType;
        tuser.paymentsettings = req.body.paymentsettings ?? tenantuser.paymentsettings;

        await TenantUser.scope({ method: ['Tenant', tenant] }).update(tuser, { where: { UserId: id } });

        return res.status(200).json({ message: 'User updated successfully' });
    });
});

const getUsers = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant;

    let whereuser: { [key: string]: any } = {};
    if (req.query.firstName) whereuser['firstName'] = req.query.firstName;
    if (req.query.lastName) whereuser['lastName'] = req.query.lastName;
    if (req.query.externalId) whereuser['externalId'] = req.query.externalId;
    if (req.query.email) whereuser['email'] = req.query.email;

    const page = req.query.page ? Number(req.query.page) : null;
    const size = req.query.size ? Number(req.query.size) : null;
    const { limit, offset } = getPagination(page, size);
    console.log(limit, offset)
    let attributes: string[];
    if (typeof req.query.attributes === 'string') {
        attributes = req.query.attributes.split(',');
    } else {
        attributes = ["id", "fullName", "firstName", "lastName", "email", "ipi", "externalId", "createdAt", "updatedAt"];
    }

    let sequelizeAttributes: object = {
        where: whereuser,
        include: [{
            model: TenantUser,
            where: { TenantId: tenant },
            attributes: { exclude: ['TenantId'] },
            required: true
        }],
    };
    let resultcount, response;

    if (req.query.accounting !== 'true') {
        resultcount = await User.findAndCountAll({
            ...sequelizeAttributes,
            limit,
            offset,
            attributes,
        });
        console.log('first result count', resultcount.count)

        if (page || size) {
            const totalcount = await User.findAll({
                where: whereuser,
                include: [{
                    model: TenantUser,
                    where: { TenantId: tenant },
                    required: true
                }],
                raw: true
            });

            const specificCount = await totalcount.length;

            if (specificCount != resultcount.count) {
                resultcount.count = specificCount;
            }
            console.log('multiple result count', resultcount.count)
            response = await getPagingData(resultcount, page, limit, 'Users');
        } else {
            console.log("herhehr")
            response = {
                count: resultcount.count,
                Users: resultcount.rows
            }
        }
        return res.json(response);
    } else {
        resultcount = await User.findAll(sequelizeAttributes);
    }

    const foundTenant = await Tenant.findByPk(tenant),
    projectId = 'royalti-project',
    viewName = 'v_sales_data',
    datasetName = foundTenant.bigqueryDataset;

    const query = `
            WITH gross AS (
                SELECT
                    splits.UserId,
                    SUM(Royalty * share / 100) AS Gross
                FROM (
                    SELECT
                        IFNULL(upc, "null") upc,
                        IFNULL(isrc, "null") isrc,
                        type,
                        share,
                        UserId
                    FROM \`royalti-project.royalti_def.v_all_splits\`
                    WHERE TenantId = ${tenant}
                ) splits
                LEFT JOIN (
                    SELECT
                        Royalty_Type,
                        IFNULL(UPC, "null") UPC,
                        IFNULL(ISRC, "null") ISRC,
                        Royalty
                    FROM \`${projectId}.${datasetName}.${viewName}\`
                ) sales_data
                ON splits.upc = sales_data.UPC
                AND splits.isrc = sales_data.ISRC
                AND (splits.type = sales_data.Royalty_Type OR splits.type IS NULL)
                GROUP BY UserId
            ), payments AS (
                SELECT
                    UserId,
                    SUM(amountUSD) AS Paid
                FROM \`royalti-project.royalti_def.v_all_payments\`
                WHERE TenantId = ${tenant}
                GROUP BY UserId
            )
            SELECT
                gross.UserId,
                gross.Gross,
                payments.Paid,
                COALESCE(gross.Gross - payments.Paid, gross.Gross) AS Due
            FROM gross
            LEFT JOIN payments ON gross.UserId = payments.UserId
            ORDER BY Due DESC

            `;

    const [bigQueryResults, users] = await Promise.all([bigquery.query(query), resultcount]);
    const joinedResults = users.map((user: { id: any; toJSON: () => any; }) => {
        const matchingRow = bigQueryResults[0].find((row: { UserId: any; }) => row.UserId == user.id);
        return { ...user.toJSON(), ...matchingRow };
    });

    return res.json({ Users: joinedResults });
});

const getUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const id = req.params.id
        const tenant = req.tenant
        const result = await Tenant.findByPk(tenant, {
            attributes: ['name'],
            include: [{
                model: User,
                where: { 'id': id },
                attributes: ["id", "fullName", "firstName", "lastName", "email", "ipi", "externalId", "profileImg"],
                through: {
                    attributes: ['TenantId', 'nickName', 'userType', 'paymentsettings']
                }
            }]
        });
        if (!result) return next(new CustomError.BadRequestError('No result found!'));
        return res.json(result.Users[0]);
    })
});

const deleteUser = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const id = req.params.id
        const deletedCount = await User.destroy({ where: { id: id }, force: true }, { transaction: t });
        if (deletedCount === 0) return next(new CustomError.BadRequestError('User delete failed!'))

        return res.status(200).send({ message: 'User was deleted successfully.' });
    });
});


const getUserStats = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    const tenanti = await Tenant.findByPk(tenant);
    if (!tenanti) return next(new CustomError.BadRequestError('Tenant not found!'));
    const bigqueryDataset = tenanti.bigqueryDataset;
    let userinfo: any = {};
    const artists = await ArtistUser.scope({ method: ['Tenant', tenant] }).findAll({
        where: { UserId: id },
    });
    if (!artists) return next(new CustomError.BadRequestError('No artists found for the user!'));
    userinfo.artists = artists.length;
    userinfo.assets = await ArtistAsset.scope({ method: ['Tenant', tenant] }).count({
        where: { ArtistId: artists.map((artist: any) => artist.ArtistId) },
    });
    userinfo.products = await ArtistProduct.scope({ method: ['Tenant', tenant] }).count({
        where: { ArtistId: artists.map((artist: any) => artist.ArtistId) },
    });

    const paid = await Payment.scope({ method: ['Tenant', tenant] }).sum('amountUSD', { where: { UserId: id } });

    if (bigqueryDataset) {
        const query = `SELECT
        SUM(Royalty*share/100) AS Royalty_Share
        FROM (SELECT IFNULL(upc, "null") upc, IFNULL(isrc, "null") isrc, type, share, UserId FROM \`${bigqueryDataset}.v_all_splits\`) splits
        LEFT JOIN (SELECT Royalty_Type, IFNULL(UPC, "null") UPC, IFNULL(ISRC, "null") ISRC, Royalty FROM \`${bigqueryDataset}.v_sales_data\`) sales_data
        ON splits.upc = sales_data.UPC AND splits.isrc = sales_data.ISRC AND (splits.type = sales_data.Royalty_Type OR splits.type IS NULL)
        WHERE UserId = '${id}' GROUP BY UserId
    `;

        const rows = await runBQquery(query);
        userinfo.Royalty_Share = rows.length > 0 ? rows[0]['Royalty_Share'] : 0;
        userinfo.paid = paid;
    }

    return res.status(200).send(userinfo);
});

const getUserMonthly = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    const foundTenant = await Tenant.findByPk(tenant);
    if (!foundTenant) return next(new CustomError.BadRequestError('Tenant not found!'));
    const bigqueryDataset = foundTenant.bigqueryDataset;
    if (!bigqueryDataset) return next(new CustomError.BadRequestError('Dataset not found!'));

    const query = `SELECT
    DATE_TRUNC(Accounting_Period_Date, MONTH) AS Month, SUM(Quantity) AS Count, SUM(Royalty) AS Royalty, SUM(Royalty*share/100) AS Royalty_Share
    FROM (SELECT IFNULL(upc, "null") upc, IFNULL(isrc, "null") isrc, type, share, UserId
    FROM \`${bigqueryDataset}.v_all_splits\`) splits
    LEFT JOIN ( SELECT Accounting_Period_Date, Quantity, Royalty_Type, IFNULL(UPC, "null") UPC, IFNULL(ISRC, "null") ISRC, Royalty
    FROM \`${bigqueryDataset}.v_sales_data\`) sales_data
    ON splits.upc = sales_data.UPC AND splits.isrc = sales_data.ISRC AND (splits.type = sales_data.Royalty_Type OR splits.type IS NULL)
    WHERE UserId = '${id}' AND Accounting_Period_Date IS NOT NULL GROUP BY UserId, Month ORDER BY Month`

    const rows = await runBQquery(query)
    rows.forEach(row => { row.Month = row.Month.value });

    return res.status(200).send(rows);

});

const getUserArtists = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    const artists = await Artist.scope({ method: ['Tenant', tenant] }).findAll({
        attributes: ['id', 'artistName'],
        where: {
            '$ArtistUsers.UserId$': id,
        },
        include: [
            { model: ArtistUser, attributes: [] }
        ]
    });

    if (!artists) return next(new CustomError.BadRequestError('No artists found for this user!'));
    return res.status(200).send(artists);
});

const getUserProducts = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    let artists = await Artist.scope({ method: ['Tenant', tenant] }).findAll({
        attributes: ['id', 'artistName'],
        where: {
            '$ArtistUsers.UserId$': id,
        },
        include: [
            { model: ArtistUser, attributes: [] },
            {
                model: Product, attributes: ['id', 'upc', 'title', 'status', 'displayArtist', 'type', 'releaseDate'],
                include: [
                    { model: Asset, attributes: ['id'], through: { attributes: ['Number', 'AssetId'] } },
                ]
            }
        ]
    });

    let products: string[] = [];
    artists.forEach((artist: any) => {
        if (artist.Products.length > 0) {
            artist.Products.forEach((product: any) => { products.push(product) });
        }
    });

    return res.status(200).send(products);

});

const getUserAssets = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id
    const tenant = req.tenant
    await sequelize.transaction(async (t: Transaction) => {
        let artists = await Artist.scope({ method: ['Tenant', tenant] }).findAll({
            attributes: ['id', 'artistName'],
            where: {
                '$ArtistUsers.UserId$': id,
            },
            include: [
                { model: ArtistUser, attributes: [] },
                { model: Asset, attributes: ['id', 'isrc', 'title', 'version', 'displayArtist', 'type'] }
            ],
            transaction: t
        })

        let assets: string[] = []
        artists.forEach((artist: any) => {
            if (artist.Assets.length > 0) {
                artist.Assets.forEach((asset: any) => { assets.push(asset) })
            }
        })

        return res.status(200).send(assets);
    });
});

const downloadUserData = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const tenant = req.tenant

    const userEmail = (await User.findByPk(id)).email;
    // const userEmail = "emma221999@gmail.com"

    if (!userEmail) return next(new CustomError.NotFoundError('User does not exist'));

    const users = await User.findAll({
        attributes: ['id', 'email', 'role', 'firstName', 'lastName', 'phone', 'country'],
        include: [{
            model: TenantUser,
            where: { TenantId: tenant },
            attributes: ["userType"],
            required: true
        }],
    });

    if (!users || users.length === 0) return next(new CustomError.NotFoundError('No users found'));

    const csvWriter = createObjectCsvWriter({
        path: 'user_data.csv',
        header: [
            { id: 'id', title: 'ID' },
            { id: 'email', title: 'EMAIL' },
            { id: 'role', title: 'ROLE' },
            { id: 'firstName', title: 'FIRST NAME' },
            { id: 'lastName', title: 'LAST NAME' },
            { id: 'phone', title: 'PHONE' },
            { id: 'country', title: 'COUNTRY' },
            { id: 'userType', title: 'USER TYPE' }
        ]
    });

    const records = users.map((user: any) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        country: user.country,
        userType: user.TenantUsers[0].userType
    }));

    await csvWriter.writeRecords(records);

    const attachment = [{
        filename: 'user_data.csv',
        content: fs.createReadStream('user_data.csv')
    }]
    // send csv to user mail
    await sendattachmentEmail(userEmail, attachment, "User")

    res.download('user_data.csv', (err) => {
        if (err) {
            return next(new CustomError.BadRequestError('Error downloading file'));
        }
    });

});

export default {
    createUser,
    createBulkUser,
    addUserTenant,
    updateUser,
    getUsers,
    getUser,
    deleteUser,
    getUserStats,
    getUserMonthly,
    getUserArtists,
    getUserProducts,
    getUserAssets,
    downloadUserData
};
