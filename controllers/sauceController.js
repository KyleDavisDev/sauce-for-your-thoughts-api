const mongoose = require("mongoose");
const Sauce = mongoose.model("Sauce");
const User = mongoose.model("User");
const slug = require("slugs"); //Hi there! How are you! --> hi-there-how-are-you
const multer = require("multer"); //helps uploading images/files
const jimp = require("jimp"); //helps with resizing photos
const uuid = require("uuid"); //generated unique identifiers
const userController = require("./userController.js");

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
  //check if new file to resize
  if (!req.file) {
    next(); //go to next middleware
    return;
  }

  //get file extension and generate unique name
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  //resize photo
  try {
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
  } catch (err) {
    next({ message: "Image was unable to be saved" }, false);
  }
};

//when using FormData, which is needed to upload image, all data gets turned into
//string so we need to reformat to match model
exports.stringToProperType = (req, res, next) => {
  if (typeof req.body.tags === "string") {
    req.body.tags = req.body.tags.split(",");
  }

  next(); //next middleware
};

exports.addSauce = async (req, res) => {
  try {
    req.body.author = req.body._id;
    req.body._id = undefined;
    const sauce = await new Sauce(req.body).save();

    //send back slug so we can link to it for user to rate
    const data = {
      isGood: true,
      msg: "Sauce successfully added!",
      slug: sauce.slug
    };
    res.send(data);
  } catch (err) {
    //TODO log error somewhere so can be referenced later

    const data = {
      isGood: false,
      msg: "There was an issue saving your sauce. Try again"
    };
    res.send(data);
  }
};

exports.getSauceBySlug = async (req, res) => {
  try {
    const sauce = await Sauce.findOne({ slug: req.params.slug }).populate(
      "author"
    );

    //split author off from sauce
    const { author } = sauce;
    sauce.author = undefined;

    //send sauce and only author name
    const data = { isGood: true, sauce, author: { name: author.name } };
    res.send(data);
  } catch (err) {
    res.send(err);
  }
};

exports.getSauceById = async (req, res) => {
  try {
    const sauce = await Sauce.findOne({ _id: req.body.sauceID });

    //make sure user is actual "owner" of sauce
    if (!sauce.author.equals(req.body._id)) {
      const data = {
        isGood: false,
        msg: "You must be the owner to edit the sauce."
      };
      return res.send(data);
    }

    const data = {
      isGood: true,
      msg: "Successfully found your sauce.",
      sauce
    };
    //send sauce back for user to edit
    return res.send(data);
  } catch (err) {
    const data = {
      isGood: false,
      msg: "Something broke or your sauce was unable to be found, Try again."
    };
    return res.send(data);
  }
};

exports.editSauce = async (req, res) => {
  try {
    //generate new slug
    req.body.slug = slug(req.body.name);

    //set _id to be sauce's ID instead of person's ID
    //remove person's ID from req.body
    req.body._id = req.body.sauceID;
    req.body.sauceID = undefined;

    //find sauce by _id and update
    const sauce = await Sauce.findOneAndUpdate(
      { _id: req.body._id },
      req.body,
      {
        new: true, //return new sauce instead of old one -- we want updated data returned
        runValidators: true //force model to be sure required fields are still there
      }
    ).exec();

    const data = {
      isGood: true,
      msg: "Successfully updated your sauce.",
      sauce
    };
    //send sauce back for user to edit
    return res.status(200).send(data);
  } catch (err) {
    //go into here if user didn't input name or some other model requirement wasn't met
    const data = {
      isGood: false,
      msg: "Could not update your sauce.",
      msg: err.message
    };
    res.send(err);
  }
};

exports.getSauces = async (req, res) => {
  try {
    //get all sauces
    let sauces = await Sauce.find().populate("author");

    //get user hearts
    let user = await User.findOne({ _id: req.body._id }, { _id: 0, hearts: 1 });

    if (!sauces) {
      const data = { isGood: false, msg: "Unable to find any sauces" };
      return res.status(400).send(data);
    }

    //replace sauces.author with sauces.author.email
    //add bool heart if the sauce _id is inside user.hearts array
    sauces = sauces.map(sauce => {
      //sauce are not objects so must convert first to be able to write to it
      sauce = sauce.toObject();
      sauce.heart = user.hearts.indexOf(sauce._id) !== -1;
      sauce.author = sauce.author.email;
      return sauce;
    });

    const data = { isGood: true, sauces, msg: "Found sauces" };

    return res.status(200).send(data);
  } catch (err) {
    const data = { isGood: false, msg: "Unable to find any sauces" };
    res.status(400).send(data);
  }
};

//TODO: Filter/sanitize user input
exports.searchSauces = async (req, res) => {
  try {
    //search index by query param and score by relevancy
    const sauces = await Sauce.find(
      {
        $text: {
          $search: req.params.q
        }
      },
      {
        score: { $meta: "textScore" }
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5);

    if (!sauces || sauces.length === 0) {
      const data = {
        isGood: false,
        msg: `Unable to find any sauces!`
      };
      return res.status(300).send(data);
    }

    const data = {
      isGood: true,
      msg: `Successfully found ${sauces.length} sauces!`,
      sauces
    };
    return res.status(200).send(data);
  } catch (err) {
    return res.status(400).send(err);
  }
};

exports.getSauceByTag = async (req, res) => {
  try {
    //get tag from param
    const tag = req.params.tag.toLowerCase();
    //query to get all tags or regex for case insensitive specific ones
    const tagQuery = tag === "all" ? { $exists: true } : new RegExp(tag, "i");

    //find sauces that match tags query and grab author object
    let sauces = await Sauce.find({ tags: tagQuery }).populate("author");

    //sanity check
    if (!sauces) {
      const data = {
        isGood: false,
        msg: "Unable to find tag-specific sauces."
      };
      return res.status(400).send(data);
    }

    //replace sauce.author with sauce.author.email
    sauces = sauces.map(sauce => {
      sauce = sauce.toObject();
      sauce.author = sauce.author.email;
      return sauce;
    });

    const data = {
      isGood: true,
      sauces,
      msg: "Successfuly found tag-specific sauces."
    };
    return res.status(200).send(data);
  } catch (err) {
    const data = {
      isGood: false,
      msg: "You goof'd it. Try again."
    };
    return res.status(400).send(data);
  }
};

exports.getTagsList = async (req, res) => {
  try {
    //get tags from Sauce aggregate
    const tags = await Sauce.getTagsList();

    //sanity check
    if (!tags) {
      const data = { isGood: false, msg: "Could not find any tags!" };
      return res.status(300).send(data);
    }

    //send response
    const data = { isGood: true, tags, msg: "Found the list of tags!" };
    res.status(200).send(data);
  } catch (err) {
    const data = {
      isGood: false,
      msg: "Something went horribly, horribly wrong. Please try again! :)"
    };
    return res.status(400).send(data);
  }
};
