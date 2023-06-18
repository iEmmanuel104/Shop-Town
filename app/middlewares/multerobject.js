const multer = require("multer");
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") || // Images
    file.mimetype.startsWith("video/") || // Videos
    file.mimetype === "application/pdf" || // PDFs
    file.mimetype === "text/csv" || // CSVs
    file.mimetype === "application/vnd.ms-excel" // Excel
  ) {
    cb(null, true);
  } else {
    cb(new Error("Please upload only images, PDFs, or videos."), false);
  }
};

// const storage = multer.diskStorage({
//   destination: "uploads",
//   filename: (req, file, cb) => {
//     if (!file.originalname
//       .match(/\.(jpg|jpeg|png|pdf|csv|mp4|mpeg|ogg|quicktime|webm|x-ms-wmv|x-flv|x-msvideo| ms-excel|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet)$/)) {
//       return cb(new Error("File type is not supported"), false);
//     }
//     cb(null, `${Date.now()}_EZcart_${file.originalname}`);
//   },
// });

const storage = multer.memoryStorage(); // Store file in memory

const uploadFile = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // set max file size to 5MB
  fileFilter: fileFilter,
});

module.exports = uploadFile;
