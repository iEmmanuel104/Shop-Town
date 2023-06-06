import Multer from "multer";
import { Request } from "express";

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: Multer.FileFilterCallback | any
): void => {
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

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 50 }, // set max file size to 50 MB
  fileFilter: fileFilter,
});

export default multer;
