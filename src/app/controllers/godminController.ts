import { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async'
import CustomError from '../utils/customErrors';
import db from '../../models/index';
const { sequelize, Sequelize } = db
import pagination from '../utils/pagination';
const { getPagination, getPagingData } = pagination;
const Op = Sequelize.Op;
const { Tenant, User, TenantUser, Artist, ArtistUser, Product, Asset, ArtistProduct, ArtistAsset, File, Split, SplitShare } = db;
import dotenv from 'dotenv'
dotenv.config()

const getTenants = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const result = Tenant.findAll()
        return res.send(result)
})

const getUsers = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    
    const result = User.findAll({
        include: [{
            model: Tenant,
            attributes: ["id", "name"],
            through: {
              attributes: ['nickName', "userType"]
            }
        }]
    })
    return res.json(result)
})

const getArtists = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    const result = Artist.findAll({
        // attributes: {exclude: ['TenantId']},
        include: [{
            model: User,
            attributes: ["id", "firstName", "lastName"],
            through: {
              attributes: [],
            }
        }]
    })
    return res.status(200).send(result)
})

const getAssets = asyncWrapper( async (req: Request, res: Response, next: NextFunction) => {
    
    const result = Asset.findAll({
        include: [{
            model: Product,
            attributes: ["id", "upc", "title"],
            through: {
              attributes: [],
            }
        },
        {
            model: Artist,
            attributes: ["id", "artistName"],
            through: {
                attributes: []
            }
        }]
    })
        return res.send(result)
})

const getProducts = asyncWrapper( async (req: Request, res: Response) => {

    const result = Product.findAll({
        include: [{
            model: Asset,
            attributes: ["id", "isrc", "title"],
            through: {
                attributes: []
            }
        },
        {
            model: Artist,
            attributes: ["id", "artistName"],
            through: {
                attributes: []
            }
        }]
    })
    return res.status(200).send(result)

})

const getSplits = asyncWrapper( async (req: Request, res: Response) => {

    let where: {[key: string]: any} = {}
    let whereuser: { [key: string]: any } = {}
    if (req.query.asset) where['AssetId'] = req.query.asset
    if (req.query.product) where['ProductId'] = req.query.product
    if (req.query.type) where['type'] = req.query.type
    if (req.query.user) whereuser['UserId'] = req.query.user

    const result = Split.findAll({
        where: where,
        // attributes: {exclude: ['TenantId']},
        include: [
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
    })
        res.send(result)
})

const getFiles = asyncWrapper( async (req: Request, res: Response) => {

    const result = File.findAll({
        
    })
        return res.status(200).send(result)
})


export default { getTenants, getProducts, getAssets, getArtists, getUsers, getSplits, getFiles }