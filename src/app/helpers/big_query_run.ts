import { BigQuery } from '@google-cloud/bigquery';
import  { logger } from '../../lib/logger';

import path from 'path';

// Path to the JSON key file
const keyFilename = "./src/cloudkeys/bigquery.json"
// const keyFilename = path.join(__dirname, '../../bigQ_Dataset', 'bigquery.json');
import configs from '../utils/config'
const { PROJECT_ID } = configs


// Create a new BigQuery client with the key file
const bigquery = new BigQuery({
    keyFilename,
});

// Check if the BigQuery client is successfully connected
// bigquery
//     .dataset('royalti_dataset')
//     .exists()
//     .then(() => {
//         console.log('BigQuery client successfully connected');
//     })
//     .catch((err) => {
//         console.error('BigQuery client connection error', err);
//     });

async function runBQquery(query: string): Promise<any[]> {
    const [job] = await bigquery.createQueryJob({
        query: query,
    });

    const [rows] = await job.getQueryResults();

    logger.info(`Query results: ${JSON.stringify(rows)}`);

    return rows;
}

async function createDataset(datasetId: string, tenantId: number): Promise<any> {
    try {
        

    // Get a reference to the dataset
    let datasetIds = `${PROJECT_ID}.${datasetId}}`
    const dataset = bigquery.dataset(datasetIds);

    // Check if the dataset already exists
    const [exists] = await dataset.exists();

    // If the dataset doesn't exist, create it
    if (!exists) {
        const [Newdataset] = await bigquery.createDataset(datasetId);
        console.log(Newdataset)

        const dataset = await bigquery.dataset(Newdataset.id!)

        // create split view
    //     const [splitView] = await dataset.createTable('v_all_splits', {
    //         view: `
    //     SELECT
    //     "Split"."TenantId",
    //     "Split"."id"::VARCHAR,
    //     "Product"."upc",
    //     "Asset"."isrc",
    //     "Asset"."iswc",
    //     "Split"."type",
    //     "Split"."period"::VARCHAR,
    //     "Split"."contract",
    //     "Split"."ContractId"::VARCHAR,
    //     "Split"."conditions",
    //     "SplitShares"."UserId"::VARCHAR,
    //     "SplitShares"."Share"
    //     FROM
    //     "Splits" AS "Split"
    //     LEFT OUTER JOIN "SplitShares" AS "SplitShares" ON "Split"."id" = "SplitShares"."SplitId"
    //     LEFT OUTER JOIN "Assets" AS "Asset" ON "Split"."AssetId" = "Asset"."id"
    //     LEFT OUTER JOIN "Products" AS "Product" ON "Split"."ProductId" = "Product"."id"
    //     WHERE
    //     "Split"."TenantId" = ${tenantId};
    // `
    //     });

    //     console.log(`View ${splitView.id} created successfully`);

        console.log(`Dataset ${dataset.id} created successfully`);
        return `${dataset.id}`

    } else {
        console.log(`Dataset ${datasetId} already exists`);
        return
    }
    } catch (error: any) {
        logger.error(`Error creating dataset: ${error.message}`);

    }
}

export { runBQquery, createDataset };
