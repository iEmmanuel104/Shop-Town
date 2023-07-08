const { BadRequestError } = require('../utils/customErrors');
const { uploadtocloudinary, deleteFromCloudinary } = require('../middlewares/cloudinary');
const { generateRandomString } = require('../utils/stringGenerator');

const uploadSingleFile = async (file, details) => {
    const fileBuffer = file.buffer;
    let originalname = file.originalname;
    details.name = await generateRandomString(6);

    let uploadresult = await uploadtocloudinary(fileBuffer, details);
    if (uploadresult.message === 'error') {
        throw new BadRequestError(uploadresult.error.message);
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

    const uploadPromises = files.map((file) => uploadSingleFile(file, details));
    const results = await Promise.all(uploadPromises);

    if (results.length === 0) {
        throw new BadRequestError(`Error uploading files to cloudinary`);
    }

    return results;
};

const deleteFiles = async (urls) => {
    if (!urls || !urls.length) {
        throw new BadRequestError('No URLs found for deletion');
    }

    const deletePromises = urls.map((url) => deleteFromCloudinary(url));
    const results = await Promise.all(deletePromises);

    if (results.length === 0) {
        throw new BadRequestError(`Error deleting files from cloudinary`);
    }

    return results;
};

module.exports = {
    uploadSingleFile,
    uploadFiles,
    deleteFiles,
};
