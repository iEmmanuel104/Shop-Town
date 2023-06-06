const { BadRequestError } = require('../utils/customErrors');
const uploadToCloudinary = require('../middlewares/cloudinary').uploadtocloudinary;

const uploadSingleFile = async (file, details) => {
    let localfilepath = file.path;
    let originalname = file.originalname;
    details.name = originalname    
    console.log("file details", details)

    let uploadresult = await uploadToCloudinary(localfilepath, details);
    console.log('upload result', uploadresult)
    if (uploadresult.message === 'error') {
        throw new BadRequestError(uploadresult.message);
    }
    if (uploadresult.message === 'success') {
        return uploadresult.url;
    }
};

const uploadFiles = async (req, details) => {
    const files = req.files;
    if (!files || !files.length) {
        throw new BadRequestError('No files found for upload');
    }
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadSingleFile(file, details);
        results.push(result);
    }
    // console.log(results)
    if (results.length === 0) {
        throw new BadRequestError(`Error uploading files to cloudinary`);
    }
    return results;
}

const deleteFiles = async (urls) => {
    const results = [];
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const result = await deleteFromCloudinary(url);
        results.push(result);
    }
    if (results.length === 0) {
        throw new BadRequestError(`Error deleting files from cloudinary`);
    }
    return results;
}



module.exports = {
    uploadSingleFile,
    uploadFiles
};