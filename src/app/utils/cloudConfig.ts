import { Request } from "express";
import { Storage, File } from "@google-cloud/storage";
import configs from "./config";
const { PROJECT_ID, KEY_FILE_PATH, BUCKET_NAME } = configs;
const keyFilename = "./src/cloudkeys/mykey.json"

// let storage: Storage;
// if (process.env.NODE_ENV !== "production") {
//     storage = new Storage({
//         keyFilename,
//     });
// } else {
//     storage = new Storage({
//     projectId: PROJECT_ID,
//     keyFilename: KEY_FILE_PATH,
// });
// }

const storage = new Storage({
    keyFilename: keyFilename,
    projectId: PROJECT_ID
});

const bucket = storage.bucket(BUCKET_NAME!);
const public_bucket = storage.bucket(BUCKET_NAME! + "-public");


const uploadsingleFile = (req: Request, category: string, id?:string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!req.file) {
            reject(new Error("No file uploaded."));
            return;
        }

        console.log("File found, trying to upload...");

        const item: string = "User" || "Artist";
        let bucketName = category === `${item}/profile` ? public_bucket.name : bucket.name;

        const blob = storage.bucket(bucketName).file(`${category}/${id}/${req.file.originalname}`);

        const metadata = {
            contentType: req.file.mimetype,
            labels: {
                category: category,
            },
        };

        const blobStream = blob.createWriteStream({
            // adding labels
            metadata: metadata,
        });

        blobStream.on("error", (err) => {
            console.log("Error uploading file: ", err);
            reject(err);
        });

        blobStream.on("finish", () => {
            console.log("File uploaded successfully.");
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
            console.log("Public URL: ", publicUrl);
            resolve(publicUrl);
        });

        blobStream.on("progress", (event) => {
            console.log(`Uploaded ${event.bytesWritten} bytes of ${event.totalBytes} bytes.`);
        });

        blobStream.end(req.file.buffer);
    });
};


const uploadmultipleFiles = async (req: Request, category: string) => {
    if (!req.files) {
        throw new Error("No file uploaded.");
    }
    console.log("Files found, trying to upload...");

    const files = req.files as Express.Multer.File[];
    const fileUploadPromises: Promise<any>[] = [];

    const publicUrls: string[] = [];
    const errors: string[] = [];
    let filesProcessed = 0;

    files.forEach((file) => {
        const blob = bucket.file(`${category}/${file.originalname}`);

        const metadata = {
            contentType: file.mimetype,
            labels: {
                category: category,
            },
        };

        const blobStream = blob.createWriteStream({
            // adding labels
            metadata: metadata,
        });

        const fileUploadPromise = new Promise<void>((resolve, reject) => {
            blobStream.on("error", (err) => {
                console.log("Error uploading file: ", err);
                errors.push(err.message);
                filesProcessed++;
                reject();
            });

            blobStream.on("finish", () => {
                console.log("File uploaded successfully.");
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                publicUrls.push(publicUrl);
                filesProcessed++;
                resolve();
            });

            blobStream.end(file.buffer);
        });

        fileUploadPromises.push(fileUploadPromise);
    });

    await Promise.all(fileUploadPromises);

    console.log("Files processed: ", filesProcessed);
    console.log("Public URLs: ", publicUrls);
    console.log("Errors: ", errors);

    return { publicUrls, errors, filesProcessed };
};



export { uploadsingleFile, uploadmultipleFiles };