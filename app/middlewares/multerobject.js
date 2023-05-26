const multer = require("multer");
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "video/mp4"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Please upload only images, PDFs, or videos."), false);
  }
};

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|pdf|mp4)$/)) {
      return cb(new Error("Please upload an image, PDF, or video."));
    }
    cb(null, `${Date.now()}_EZcart_${file.originalname}`);
  },
});

const uploadFile = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 50 }, // set max file size to 50 MB
  fileFilter: fileFilter,
});

module.exports = uploadFile;
