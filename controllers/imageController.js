require("dotenv").config({ path: "variables.env" });
const multer = require("multer"); // helps uploading images/files
const jimp = require("jimp"); // helps with resizing photos
const uuid = require("uuid"); // generated unique identifiers
var fs = require("fs"); // file system
var cloudinary = require("cloudinary").v2;
const Datauri = require("datauri");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype is not allowed" }, false);
    }
  }
  // dest: "uploads/"
};

exports.upload = multer(multerOptions).single("image");

exports.saveImage = async (req, res, next) => {
  // check if new file to resize
  if (!req.file) {
    next(); // go to next middleware
    return;
  }
  // get file extension and generate unique name
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  // upload photo
  try {
    // Convert buffer into something cloudinary can handle
    var dUri = new Datauri();
    dUri.format(".png", req.file.buffer);

    // Upload image
    cloudinary.uploader.upload(dUri.content, function(err, img) {
      console.log("ERR: ", err);
      console.log("IMG: ", img);
    });
    // console.log(test);
  } catch (err) {
    console.log(err);
  }

  // return next();
};
