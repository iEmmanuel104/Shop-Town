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
    cb(new BadRequestError("Please upload only images, PDFs, or videos."), false);
  }
};

const storage = multer.memoryStorage(); // Store file in memory

const uploadFile = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // set max file size to 5MB
  fileFilter: fileFilter,
});

module.exports = uploadFile;
