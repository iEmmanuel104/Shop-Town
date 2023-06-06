import { createObjectCsvWriter } from 'csv-writer';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import PDFDocument from 'pdfkit';
import mailTemplates from './mailTemplates'
import fs from 'fs';
const { sendattachmentEmail } = mailTemplates

type DataItem = { 
    reqEmail: string; 
    type: string; 
};

type HeaderItem = { 
    id: string; 
    title: string;
}

type RecordItem = {
    [key:string]: string;
}

const generateCSV = async (data: DataItem, headers: HeaderItem[], records: RecordItem) => {
    let type = data.type
    const csvWriter = createObjectCsvWriter({
        path: `${type}_data.csv`,
        header: headers,
    })

    // await csvWriter.writeRecords(records);


}