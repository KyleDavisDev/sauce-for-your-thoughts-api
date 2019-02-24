const multer = require("multer"); // helps uploading images/files
const jimp = require("jimp"); // helps with resizing photos
const uuid = require("uuid"); // generated unique identifiers
var fs = require("fs"); // file system

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype is not allowed" }, false);
    }
  },
  dest: "uploads/"
};

exports.upload = multer(multerOptions).single("image");

exports.resize = async (req, res, next) => {
  // check if new file to resize
  if (!req.file) {
    next(); // go to next middleware
    return;
  }
  // get file extension and generate unique name
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  // resize photo
  try {
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    const dir = "./public/uploads";
    await photo.write(`${dir}/${req.body.photo}`); // Save point
    req.body.sauce.photo = req.file;
    next();
  } catch (err) {
    console.log(err);
    next({ message: "Image was unable to be saved" }, false);
  }
};
