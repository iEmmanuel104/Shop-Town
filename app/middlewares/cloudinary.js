const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const fs = require('fs');
const sharp = require('sharp'); 

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const uploadtocloudinary = (filepath, details) => {
    try {
        const options = {
            use_filename: true,
            folder: `EZcart/${details.user}/${details.folder}`,
            public_id: details.name,
        };
        return cloudinary.uploader.upload(filepath, options)
        .then((result) => {
            // assign the result to a variable
            let cloudinaryResult = result;
            // delete the file from the server
            fs.unlinkSync(filepath)
            return { message: 'success', url: cloudinaryResult.secure_url }
        })
    } catch (error) {
        console.log(error);
        fs.unlinkSync(filepath)
        return { message: 'error', error: error }
    }
};

const deleteFromCloudinary = (public_id) => {
    try {
        return cloudinary.uploader.destroy(public_id)
        .then((result) => {
            console.log(result);
            return { message: 'success', result: result }
        })
    } catch (error) {
        console.log(error);
        return { message: 'error', error: error }
    }
};




// const uploadresizeToCloudinary = async (filepath, details) => {
//     const image = sharp(filepath);
//     const resizedImage = await image.resize({ width: 200, height: 200 }).toBuffer();
//     const options = {
//         use_filename: true,
//         folder: `Taximania/${details.user}/${details.folder}`,
//         public_id: details.name,
//     };
//     let reload;

//     const wait =  await new Promise((resolve, reject) => {
//             cloudinary.uploader.upload_stream(options, (error, result) => {
//                 if (error) {
//                     console.log(error);
//                     fs.unlinkSync(filepath);
//                     return { message: 'error', error: error };
//                 }
//                 fs.unlinkSync(filepath);
//                  reload =  { message: 'success', url: result.secure_url };
//                 console.log("this is reload",reload);
//                 resolve(reload);
//             }).end(resizedImage);
//         });

//     console.log ("this is reload from cloudinary file",wait);

//     return wait;

// };

const uploadresizeToCloudinary = async (filepath, details) => {
    const image = sharp(filepath);
    const resizedImage = await image.resize({ width: 200, height: 200 }).toBuffer();
    const options = {
        use_filename: true,
        folder: `EZcart/${details.user}/${details.folder}`,
        public_id: details.name,
    };

    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                console.log(error);
                fs.unlinkSync(filepath);
                reject({ message: 'error', error: error });
            }
            fs.unlinkSync(filepath);
            resolve({ message: 'success', url: result.secure_url });
        }).end(resizedImage);
    });
};



module.exports = {
    uploadtocloudinary,
    uploadresizeToCloudinary,
    deleteFromCloudinary
};
