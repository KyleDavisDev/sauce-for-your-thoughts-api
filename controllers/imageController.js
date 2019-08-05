require("dotenv").config({ path: "variables.env" });
const multer = require("multer"); // helps uploading images/files
var cloudinary = require("cloudinary").v2; // image hosting
const Datauri = require("datauri"); // turn image buffer into something handleable

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
  // check if new file
  if (!req.file) {
    next(); // go to next middleware
    return;
  }

  // upload photo
  try {
    // Convert buffer into something cloudinary can handle
    var dUri = new Datauri();
    dUri.format(".png", req.file.buffer);

    // Upload image
    cloudinary.uploader
      .upload(dUri.content, { folder: "sauces/" })
      .then(img => {
        // assign name to req.body
        req.body.photo = img.secure_url;

        // Keep going!
        return next();
      })
      .catch(function(err) {
        console.log();
        console.log("** File Upload (Promise)");
        if (err) {
          console.warn(err);
        }
      });
  } catch (err) {
    console.log(err);
  }

  // return next();
};

exports.getAvatarURLs = async (req, res, next) => {
  console.log("am i here?");
  cloudinary.api.resources(
    { type: "upload", prefix: "avatars/", max_results: 500 },
    function(error, result) {
      if (error) {
        console.warn(err);
      }

      const urls = [];
      for (let i = 0, len = result.resources.length; i < len; i++) {
        urls.push(result.resources[i].secure_url);
      }

      console.log(urls);

      // construct return object
      const data = {
        isGood: true,
        urls
      };

      // Send back successful submission
      return res.status(200).send(data);
    }
  );
};
