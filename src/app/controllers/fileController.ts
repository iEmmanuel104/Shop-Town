import express, { Request, Response, Router, NextFunction } from 'express';
import { Storage } from "@google-cloud/storage";
import { TemplatesServiceClient, JobsV1Beta3Client } from '@google-cloud/dataflow';
// import { TemplatesServiceClient, JobsV1Beta3Client } from '@google-cloud/dataflow'.v1beta3;
import db from '../../models';
import sendEmail from '../utils/email';
import dotenv from 'dotenv';
dotenv.config();
import { Transaction } from 'sequelize';
import asyncWrapper from '../middlewares/async';
import CustomError from "../utils/customErrors.js";
import jsonexport from 'jsonexport';
import { BigQuery } from '@google-cloud/bigquery'
let keyFilename = "mykey.json"
const { sequelize, Sequelize } = db
const { Tenant, Artist, ArtistUser, File } = db;
const Op = Sequelize.Op;


// const storage = new Storage({ keyFilename })
// const bigquery = new BigQuery({ keyFilename })
const bigquery = new BigQuery()
const storage = new Storage()
const bucket = storage.bucket("royalti-io_data")

// const dataflowClient = new TemplatesServiceClient({ keyFilename })
const dataflowClient = new TemplatesServiceClient()

const zipBucket = require('zip-bucket')(storage)



const getFiles = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenant = req.tenant

        const result = File.scope({ method: ['Tenant', tenant] }).findAll({
            where: { type: req.params.type },
            attributes: { exclude: ['TenantId'] }
        })
        return res.send(result)
    })
})

const processFile = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const file = await File.findByPk(req.params.id)
        if (file.status != 'Pending') return next(new CustomError.BadRequestError('File already processed!'))
        let folder: String = "";
        const tenant = await Tenant.findByPk(req.params.tenant)
        folder = tenant.bigqueryDataset

        var todayDate = new Date().toISOString().slice(0, 10)

        const request: { [key: string]: any } = {
            jobName: todayDate + " " + folder + " decompress",
            projectId: "royalti-project",
            gcsPath: "gs://dataflow-templates/latest/Bulk_Decompress_GCS_Files",
            environment: {
                bypassTempDirValidation: false,
                region: "us-central1",
                NumWorkers: 2,
                MaxWorkers: 3,
                tempLocation: "gs://royalti-io_data/" + folder + "/royalty/temp",
                ipConfiguration: "WORKER_IP_UNSPECIFIED",
                additionalExperiments: []
            },
            parameters: {
                inputFilePattern: "gs://royalti-io_data/" + folder + "/royalty/" + file.name,
                outputDirectory: "gs://royalti-io_data/" + folder + "/royalty/decompressed",
                outputFailureFile: "gs://royalti-io_data/" + folder + "/royalty/decompressed/failed.csv"
            }
        }

        const response = await dataflowClient.createJobFromTemplate(request)
        // console.log(response[0])
        await File.update({ statusId: response[0].id, status: 'decompressing' }, { where: { id: req.params.id } }, { transaction: t })

        res.status(200).send('file decompressing')
    })
})

const fileStatus = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {

        let folder: String = "";
        const tenant = await Tenant.findByPk(req.tenant)
        folder = tenant.bigqueryDataset

        const file = await File.findByPk(req.params.id)

        // if (file.status == 'processing') return res.status(400).send('file processing!')
        if (file.status == 'processed') return next(new CustomError.BadRequestError('file already processed!'))
        if (file.status == 'decompressed') return next(new CustomError.BadRequestError('file already decompressed!'))

        if (file.status == 'decompressing') {

            // const dataflowClientgetJob = new JobsV1Beta3Client({ keyFilename })
            const dataflowClientgetJob = new JobsV1Beta3Client()

            const request = {
                projectId: "royalti-project",
                jobId: file.statusId,
                environment: {
                    region: "us-central1",
                }
            }

            const response = await dataflowClientgetJob.getJob(request)
            // console.log(response)

            if (response[0].currentState == 'JOB_STATE_DONE') {

                await File.update({ status: 'decompressed' }, { where: { id: req.params.id } }, { transaction: t })
                await bucket.file(folder + "/royalty/" + file.name).move(folder + "/royalty/processed/" + file.name)

                res.status(200).send('file decompressed successfully')

            } else res.status(200).send('file not decompressed')

        }
    })

})

const getCloudFiles = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {

    let folder: String = "";
    const tenant = await Tenant.findByPk(req.tenant)
    folder = tenant.bigqueryDataset

    const [files] = await bucket.getFiles({ prefix: folder + "/" + req.params.type + "/" })
    const sendfiles: string[] = []
    files?.map(data => {
        sendfiles.push(data.metadata)
    })
    res.status(200).json(sendfiles)

})

const uploadRoyalty = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    let folder: String = "";
    const tenant = await Tenant.findByPk(req.tenant)
    folder = tenant.bigqueryDataset

    await sequelize.transaction(async (t: Transaction) => {
        if (req.file) {
            // console.log("File found, trying to upload...");
            const blob = bucket.file(folder + "/royalty/" + req.file.originalname);
            const blobStream = blob.createWriteStream();

            blobStream.on("finish", async () => {
                let file: { [key: string]: any } = {}
                file['TenantId'] = req.tenant
                file['name'] = req.file?.originalname
                file['status'] = 'Pending'
                file['type'] = 'royalty'
                if (req.body.source) file['source'] = req.body.source
                if (req.body.description) file['description'] = req.body.description
                file['CloudId'] = blob.metadata.id

                await File.create({ file }, { transaction: t })

                sendEmail({
                    email: 'chinedum@royalti.io',
                    subject: "New Royalty File Uploaded",
                    message: `File name: ${file['name']} | tenant: ${folder}`
                })

                res.status(200).send("Success");

            });

            blobStream.end(req.file.buffer);

        } else return next(new CustomError.BadRequestError('error uploading file!'))

    })

})

const createRoyaltyFile = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    await sequelize.transaction(async (t: Transaction) => {
        const tenanti = await Tenant.findByPk(req.tenant)

        let bigqueryDataset = tenanti.bigqueryDataset
        // const bigqueryDataset = 'starmakers'

        const query = `SELECT * FROM \`starmakers.v_sales_data\``


        var todayDate = new Date().toISOString().slice(0, 10)

        const df = await bigquery.query({ query, location: 'us-central1' })
        const rows = df[0]

        jsonexport(rows, function (err, csv) {
            if (err) return console.error(err)
            const filename = 'f-' + todayDate + '.csv'

            const blob = bucket.file(bigqueryDataset + '/report/uncompressed/' + filename)
            const blobStream = blob.createWriteStream()

            blobStream.on("finish", async () => {

                let file = {
                    'TenantId': req.tenant,
                    'name': filename,
                    'status': 'generated',
                    'type': 'report',
                    'format': 'csv',
                    // 'description' : req.body.description,
                    'CloudId': blob.metadata.id
                }
                const newFile = await File.create({ file }, { transaction: t })
                console.log(blob.metadata.id)

                const manifest = await zipBucket({
                    fromBucket: 'royalti-io_data',
                    fromPath: bigqueryDataset + "/report/uncompressed/" + filename,
                    toBucket: 'royalti-io_data',
                    toPath: bigqueryDataset + "/report/" + filename + '.zip'
                })

                await console.log(manifest)

                res.status(200).send(blob.metadata)

            })
                .end(csv)

        })

    })
})

export {
    uploadRoyalty,
    getFiles,
    processFile,
    fileStatus,
    createRoyaltyFile
}