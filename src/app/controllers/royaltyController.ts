import { Request, Response, NextFunction } from 'express';
import { BigQuery } from '@google-cloud/bigquery';
import { Transaction } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();
import { at, merge, keyBy } from 'lodash';
import db from '../../models';
import asyncWrapper from '../middlewares/async';
import CustomError from '../utils/customErrors';
const keyFilename = "./src/cloudkeys/bigquery.json"
const bigquery = new BigQuery({ keyFilename });
const { sequelize, Sequelize } = db
const Op = Sequelize.Op;
const { Tenant, Artist, ArtistUser, Product, Asset, ArtistProduct, ArtistAsset } = db;

const getRoyaltySummary = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    const tenanti = await Tenant.findByPk(tenant)
    let bigqueryDataset = tenanti.bigqueryDataset
    if (!bigqueryDataset) return res.status(206).json({
        "Downloads": 0,
        "Downloads_Royalty": 0,
        "Streams": 0,
        "Streams_Royalty": 0,
        "Royalty": 0,
        message: "Dataset records currently Unavailable"
    })

    const country = req.query.country ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
    const dsp = req.query.dsp ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
    let period = '';
    if (req.query.start) {
        const end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()';
        period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end;
    }

    let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
    let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''


    let code = await catalogFilter(tenant, req.query)

    const query = `SELECT
    SUM(CASE WHEN sales_data.Sale_Type = 'Download' THEN sales_data.Quantity END) AS Downloads,
    SUM(CASE WHEN sales_data.Sale_Type = 'Download' THEN sales_data.Royalty END) AS Downloads_Royalty,
    SUM(CASE WHEN CONTAINS_SUBSTR(sales_data.Sale_Type, 'Stream') THEN sales_data.Quantity END) AS Streams,
    SUM(CASE WHEN CONTAINS_SUBSTR(sales_data.Sale_Type, 'Stream') THEN sales_data.Royalty END) AS Streams_Royalty,
    SUM(sales_data.Royalty) AS Royalty
    FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
     ${period} ${dsp} ${country} ${code} ${aggregator} ${type}`

    const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' });
    const [rows] = await job.getQueryResults();

    return res.status(200).json(rows[0]);

});

const getRoyaltyMonth = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const tenanti = await Tenant.findByPk(tenant);
        let bigqueryDataset = tenanti.bigqueryDataset;
        if (bigqueryDataset) {
            let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
            let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
            let period = '';
            if (req.query.start) {
                let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()';
                period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end;
            }


            let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
            let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''


            let code = await catalogFilter(tenant, req.query);

            try {
                const query = `SELECT
            DATE_TRUNC(sales_data.Reporting_Date, MONTH) AS Month, SUM(sales_data.Royalty) AS Royalty, SUM(sales_data.Quantity) AS Count
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
            ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY Month ORDER BY Month`;

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' });
                const [rows] = await job.getQueryResults();

                rows.forEach(row => { row.Month = row.Month.value });

                return res.status(200).json(rows);
            } catch (e) {
                logger.error(e)
                return res.status(400).send("Error while computing results");
            }
        } else return res.status(404).send({
            "Month": 0,
            "Royalty": 0,
            "Count": 0
        });
    });
});

const getRoyaltyDSP = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const tenanti = await Tenant.findByPk(tenant);
        let bigqueryDataset = tenanti.bigqueryDataset;
        if (bigqueryDataset) {
            let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
            let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
            let period = '';
            if (req.query.start) {
                let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()';
                period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end;
            }

            let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
            let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''


            let code = await catalogFilter(tenant, req.query);

            try {
                const query = `SELECT
            sales_data.DSP, SUM(sales_data.Royalty) AS Royalty, SUM(sales_data.Quantity) AS Count
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
           ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY DSP ORDER BY Royalty Desc`;

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' });
                const [rows] = await job.getQueryResults();

                return res.status(200).json(rows);
            } catch (e) {
                logger.error(e)
                return res.status(400).send("Error while computing results")
            }
        } else return res.status(404).send("Dataset records currently Unavailable")

    });
});

const getRoyaltySaleType = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const tenanti = await Tenant.findByPk(tenant)
        let bigqueryDataset = tenanti.bigqueryDataset
        if (bigqueryDataset) {
            let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
            let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
            let period = '';
            if (req.query.start) {
                let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()'
                period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end
            }

            let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
            let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''


            let code = await catalogFilter(tenant, req.query)

            try {
                const query = `SELECT
            sales_data.Sale_Type, SUM(sales_data.Royalty) AS Royalty, SUM(sales_data.Quantity) AS Count
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
             ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY Sale_Type ORDER BY Royalty Desc`

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
                const [rows] = await job.getQueryResults()

                return res.status(200).json(rows)
            } catch (e) {
                logger.error(e)
                return res.status(400).send("Error while computing results")
            }
        } else return next(new CustomError.NotFoundError("Dataset records currently Unavailable"))
    });
});

const getRoyaltyCountry = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const tenanti = await Tenant.findByPk(tenant)
        let bigqueryDataset = tenanti.bigqueryDataset
        if (bigqueryDataset) {
            let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
            let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
            let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
            let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''
            let code = await catalogFilter(tenant, req.query)

            let period = ''
            if (req.query.start) {
                let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()'
                period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end
            }

            try {
                const query = `SELECT
            sales_data.Country, SUM(sales_data.Quantity) AS Count, SUM(sales_data.Royalty) AS Royalty
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
          ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY Country ORDER BY Royalty Desc`

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
                const [rows] = await job.getQueryResults()
                return res.status(200).json(rows)
            } catch (e) {
                logger.error(e)
                return res.status(400).send("Error while computing results")
            }
        } else return next(new CustomError.NotFoundError("Dataset records currently Unavailable"))
    })
});

const getRoyaltyProduct = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const tenant = req.tenant
    const tenanti = await Tenant.findByPk(tenant);
    let bigqueryDataset = tenanti.bigqueryDataset;
    if (bigqueryDataset) {
        await sequelize.transaction(async (t: Transaction) => {
            try {
                let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
                let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
                let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
                let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''

                let code = await catalogFilter(tenant, req.query)

                let period = ''
                if (req.query.start) {
                    let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()'
                    period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end
                }

                const query = `SELECT
            sales_data.UPC, SUM(sales_data.Quantity) AS Count, SUM(sales_data.Royalty) AS Royalty
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
            ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY UPC ORDER BY Royalty Desc`

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
                const [rows] = await job.getQueryResults()

                let products = await Product.scope({ method: ['Tenant', tenant] }).findAll({
                    raw: true,
                    attributes: ['id', 'upc', ['title', 'Release_Name'], 'displayArtist', 'type'],
                    where: {
                        'upc': rows.map(row => row.UPC),
                    }
                })

                var merged = merge(keyBy(rows, 'UPC'), keyBy(products, 'upc'))
                var values = Object.values(merged)
                values.forEach(row => delete row.upc)
                return res.status(200).json(values)
            } catch (e) {
                logger.error(e)
                return res.status(400).send("Error while computing results")
            }
        });
    } else {
        return next(new CustomError.NotFoundError("Dataset records currently Unavailable"));
    }
});

const getRoyaltyAsset = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const tenanti = await Tenant.findByPk(tenant);
        let bigqueryDataset = tenanti.bigqueryDataset;
        if (!bigqueryDataset) {
            return res.status(404).send("Dataset records currently Unavailable")
        }
        let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
        let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
        let period = '';

        if (req.query.start) {
            let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()';
            period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end;
        }

        let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
        let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''

        let code = await catalogFilter(tenant, req.query);

        try {
            const query = `SELECT
            sales_data.ISRC, SUM(sales_data.Quantity) AS Count, SUM(sales_data.Royalty) AS Royalty
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
            ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY ISRC ORDER BY Royalty Desc`;

            const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' });
            const [rows] = await job.getQueryResults();

            let assets = await Asset.scope({ method: ['Tenant', tenant] }).findAll({
                raw: true,
                attributes: ['id', 'isrc', ['title', 'Track_Title'], 'displayArtist', 'version', 'type'],
                where: {
                    'isrc': rows.map(row => row.ISRC),
                }
            });

            var merged = merge(keyBy(rows, 'ISRC'), keyBy(assets, 'isrc'));
            var values = Object.values(merged);
            values.forEach(row => delete row.isrc);
            return res.status(200).json(values);
        } catch (e) {
            logger.error(e);
            return res.status(400).send("Error while computing results")
        }
    });
});

const getRoyaltyArtist = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const tenanti = await Tenant.findByPk(tenant)
        let bigqueryDataset = tenanti.bigqueryDataset
        if (bigqueryDataset) {
            let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
            let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
            let period = '';
            if (req.query.start) {
                let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()'
                period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end
            }

            let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
            let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''

            let code = await catalogFilter(tenant, req.query)

            try {
                const query = `SELECT
            sales_data.Track_Artist, SUM(sales_data.Quantity) AS Count, SUM(sales_data.Royalty) AS Royalty
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
           ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY Track_Artist ORDER BY Royalty Desc`

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
                const [rows] = await job.getQueryResults()

                return res.status(200).json(rows)
            } catch (e) {
                logger.error(e)
                return res.status(400).send("Error while computing results")
            }
        } else return next(new CustomError.NotFoundError("Dataset records currently Unavailable"));
    });
});

const getRoyaltyAccountingPeriod = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant
        const tenanti = await Tenant.findByPk(tenant, { transaction: t })
        if (!tenanti) return next(new CustomError.BadRequestError('Tenant does not exist!'));

        let bigqueryDataset = tenanti.bigqueryDataset
        if (!bigqueryDataset) return res.status(404).send("Dataset records currently Unavailable")

        let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
        let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
        let period = '';
        if (req.query.start) {
            let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()'
            period = ' AND Accounting_Period_Date BETWEEN DATE("' + req.query.start + '") AND ' + end
        }

        let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
        let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''

        let code = await catalogFilter(tenant, req.query)

        try {
            const query = `SELECT
        DATE_TRUNC(sales_data.Accounting_Period_Date, MONTH) AS Month,
        SUM(sales_data.Royalty) AS Royalty, SUM(sales_data.Quantity) AS Count
        FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
        ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
        GROUP BY Month ORDER BY Month`

            const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' })
            const [rows] = await job.getQueryResults()

            rows.forEach(row => { row.Month = row.Month.value })

            return res.status(200).json(rows)
        } catch (e) {
            logger.error(e)
            return res.status(400).send("Error while computing results")
        }
    })
});

const getRoyaltyAggregator = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant;
        const tenanti = await Tenant.findByPk(tenant, { transaction: t });
        let bigqueryDataset = tenanti.bigqueryDataset;
        if (bigqueryDataset) {
            let country = Array.isArray(req.query.country) ? ' AND Country IN ("' + (req.query.country as string[]).join('","') + '")' : '';
            let dsp = Array.isArray(req.query.dsp) ? ' AND DSP IN ("' + (req.query.dsp as string[]).join('","') + '")' : '';
            let period = '';
            if (req.query.start) {
                let end = req.query.end ? 'DATE("' + req.query.end + '")' : 'current_date()';
                period = ' AND Reporting_Date BETWEEN DATE("' + req.query.start + '") AND ' + end;
            }

            let type = req.query.type ? ' AND Sale_Type = "' + req.query.type + '"' : ''
            let aggregator = req.query.aggregator ? ' AND Aggregator = "' + req.query.aggregator + '"' : ''

            let code = await catalogFilter(tenant, req.query);

            try {
                const query = `SELECT
            sales_data.Aggregator, SUM(sales_data.Royalty) AS Royalty, SUM(sales_data.Quantity) AS Count
            FROM \`${bigqueryDataset}.v_sales_data\` sales_data WHERE 1=1
            ${period} ${dsp} ${country} ${code} ${aggregator} ${type}
            GROUP BY Aggregator`;

                const [job] = await bigquery.createQueryJob({ query, location: 'us-central1' });
                const [rows] = await job.getQueryResults();
                return res.status(200).json(rows);
            } catch (e) {
                logger.error(e);
                return res.status(400).send("Error while computing results");
            }
        } else {
            return res.status(404).send("Dataset records currently Unavailable");
        }
    });
});


//helpers
import { QueryInterface } from 'sequelize';
import { runBQquery } from '../helpers/big_query_run';
import { logger } from '../../lib/logger';

const catalogFilter = async (tenant: number, query: { [key: string]: any }): Promise<string> => {

    let code: string = '';

    if (query.artists) {
        let artists: string[] = query.artists.split(',');

        let assets = await ArtistAsset.scope({ method: ['Tenant', tenant] }).findAll({
            where: { ArtistId: artists },
            attributes: [], through: { attributes: [] },
            include: [{ model: Asset, attributes: ["isrc"] }]
        });

        assets = assets.map((asset: { Asset: { isrc: string } }) => asset.Asset.isrc);

        let products = await ArtistProduct.scope({ method: ['Tenant', tenant] }).findAll({
            where: { ArtistId: artists },
            attributes: [], through: { attributes: [] },
            include: [{ model: Product, attributes: ["upc"] }]
        });

        products = products.map((product: { Product: { upc: string } }) => product.Product.upc);

        code = ' AND ';
        const upc = products ? 'UPC IN ("' + products.join('","') + '")' : '';
        const isrc = assets ? 'ISRC IN ("' + assets.join('","') + '")' : '';
        code += (upc && isrc) ? '(' + upc + ' OR ' + isrc + ')' : upc + isrc;

    } else if (query.user) {
        let artists = await ArtistUser.scope({ method: ['Tenant', tenant] }).findAll({
            where: { UserId: query.user },
            attributes: ['ArtistId']
        });

        artists = artists.map((artist: { ArtistId: string }) => artist.ArtistId);

    } else if (query.user) {
        console.log(query.user);
        const artists = await ArtistUser.scope({ method: ['Tenant', tenant] }).findAll({
            where: { UserId: query.user },
            attributes: ['ArtistId']
        });
        console.log(artists);
        const artistIds = artists.map((artist: { [key: string]: any }) => artist.ArtistId);
        console.log(artistIds);

        const aassets = await ArtistAsset.scope({ method: ['Tenant', tenant] }).findAll({
            where: { ArtistId: artistIds },
            attributes: [],
            through: { attributes: [] },
            include: [{ model: Asset, attributes: ['isrc'] }]
        });
        const assets = aassets.map((asset: { [key: string]: any }) => asset.Asset.isrc);

        const aproducts = await ArtistProduct.scope({ method: ['Tenant', tenant] }).findAll({
            where: { ArtistId: artistIds },
            attributes: [],
            through: { attributes: [] },
            include: [{ model: Product, attributes: ['upc'] }]
        });
        const products = aproducts.map((product: { [key: string]: any }) => product.Product.upc);

        let code = ' AND ';
        const upc = products.length ? 'UPC IN ("' + products.join('","') + '")' : '';
        const isrc = assets.length ? 'ISRC IN ("' + assets.join('","') + '")' : '';
        code += (upc && isrc) ? '(' + upc + ' OR ' + isrc + ')' : upc + isrc;
    }
    else if (query.upc || query.isrc) {
        code = ' AND ';
        const upc = query.upc ? query.upc.split(',') : []; // Initialize as an empty array instead of an empty string
        const isrc = query.isrc ? query.isrc.split(',') : []; // Initialize as an empty array instead of an empty string
        const upcCondition = upc.length ? 'UPC IN ("' + upc.join('","') + '")' : ''; // Check if the array has elements
        const isrcCondition = isrc.length ? 'ISRC IN ("' + isrc.join('","') + '")' : ''; // Check if the array has elements
        code += (upcCondition && isrcCondition) ? '(' + upcCondition + ' OR ' + isrcCondition + ')' : upcCondition + isrcCondition;
    }


    return code;
}




// const getAssetsProducts = async (tenant, artists) => {

//     if (artists) {
//         artists = artists.split(',')
//         // } else if (user) {
//         //     artists = await ArtistUser.scope({method: ['Tenant', tenant]}).findAll({
//         //         where: { UserId: user }, attributes: ['ArtistId']
//         //     })
//         //     artists = artists.map(artist => artist.ArtistId)
//     }

//     assets = await ArtistAsset.scope({ method: ['Tenant', tenant] }).findAll({
//         where: { ArtistId: artists },
//         attributes: [], through: { attributes: [] },
//         include: [{ model: Asset, attributes: ["isrc"] }]
//     })
//     assets = assets.map(asset => asset.Asset.isrc)

//     products = await ArtistProduct.scope({ method: ['Tenant', tenant] }).findAll({
//         where: { ArtistId: artists },
//         attributes: [], through: { attributes: [] },
//         include: [{ model: Product, attributes: ["upc"] }]
//     })
//     products = products.map(product => product.Product.upc)

//     return { assets, products }
// }


export { getRoyaltySummary, getRoyaltyMonth, getRoyaltyDSP, getRoyaltyCountry, getRoyaltyProduct, getRoyaltyAsset, getRoyaltyArtist, getRoyaltyAccountingPeriod, getRoyaltySaleType, getRoyaltyAggregator }