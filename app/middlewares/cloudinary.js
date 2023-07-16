const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const sharp = require('sharp');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

const uploadtocloudinary = async (fileBuffer, details) => {
    try {
        const options = {
            use_filename: true,
            folder: `Klick/${details.user}/${details.folder}`,
            public_id: details.name,
        };

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(options, (error, result) => {
                    if (error) {
                        console.log('error from uploads ::::::::: ', error);
                        reject(error);
                    } else {
                        console.log('result from upload :::::::: ', result);
                        resolve({ message: 'success', url: result.secure_url });
                    }
                })
                .end(fileBuffer);
        });

        return result;
    } catch (error) {
        console.log(error);
        return { message: 'error', error };
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(result);
        return { message: 'success', result };
    } catch (error) {
        console.log(error);
        return { message: 'error', error };
    }
};

const uploadresizeToCloudinary = async (fileBuffer, details) => {
    const image = sharp(fileBuffer);
    const resizedImage = await image.resize({ width: 200, height: 200 }).toBuffer();
    const options = {
        use_filename: true,
        folder: `EZcart/${details.user}/${details.folder}`,
        public_id: details.name,
    };

    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(options, (error, result) => {
                if (error) {
                    console.log(error);
                    reject({ message: 'error', error: error });
                }
                resolve({ message: 'success', url: result.secure_url });
            })
            .end(resizedImage);
    });
};

module.exports = {
    uploadtocloudinary,
    uploadresizeToCloudinary,
    deleteFromCloudinary,
};
