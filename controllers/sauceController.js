const mongoose = require("mongoose");
const Sauce = mongoose.model("Sauce");
const User = mongoose.model("User");
const slug = require("slugs"); // Hi there! How are you! --> hi-there-how-are-you
const multer = require("multer"); // helps uploading images/files
const jimp = require("jimp"); // helps with resizing photos
const uuid = require("uuid"); // generated unique identifiers

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
    await photo.write(`./public/uploads/${req.body.photo}`);
    req.body.sauce.photo = req.body.photo;
    next();
  } catch (err) {
    next({ message: "Image was unable to be saved" }, false);
  }
};

// when using FormData, which is needed to upload image, all data gets turned into
// string so we need to reformat to match model
exports.stringToProperType = (req, res, next) => {
  try {
    if (
      Object.prototype.toString.call(req.body.sauce.tags) === "[object String]"
    ) {
      req.body.sauce.tags = req.body.sauce.tags.split(",");
    }

    if (
      Object.prototype.toString.call(req.body.review.rating) ===
      "[object String]"
    ) {
      req.body.review.rating = parseInt(req.body.review.rating);
    }

    next(); // next middleware
  } catch (err) {
    // TODO:proper error handling
    return res.status(400).send(err);
  }
};

/** @description Save a sauce into the database
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 *  @param {String} req.body.user._id - unique user string
 *  @param {String} req.body.sauce.name - name of the sauce
 *  @param {String} req.body.sauce.description - description of the sauce
 *  @param {String[]} req.body.sauce.tags - tags that help to describe the sauce
 *  @param {String} req.body.sauce.photo - unique name of the photo saved on server
 */
exports.addSauce = async (req, res, next) => {
  if (!req.body.sauce || Object.keys(req.body.sauce) === 0) {
    const data = {
      isGood: false,
      msg: "Requires sauce object. Please try again."
    };
    return res.status(300).send(data);
  }

  try {
    // create save query
    const record = {
      author: req.body.user._id,
      name: req.body.sauce.name,
      description: req.body.sauce.description,
      tags: req.body.sauce.tags,
      photo: req.body.sauce.photo
    };

    // add sauce to DB
    // TODO: Figure out how to populate on save()
    const sauce = await new Sauce(record).save();

    // make sure something didn't break
    if (!sauce) {
      const data = {
        isGood: false,
        msg: "Could not add sauce"
      };
      return res.status(400).send(data);
    }

    // look up author
    const user = await User.findById(sauce.author, { _id: 1, name: 1 });

    // create response object if not already created
    if (!req.response) req.response = {};

    // add sauce to req.response for next middleware
    req.response.sauces = [sauce.toObject()];

    // update .author to the 'standard' return author object
    req.response.sauces[0].author = user.toObject();

    next(); // go to reviewController.addReview
  } catch (err) {
    console.log(err);
    // TODO log error somewhere so can be referenced later
    const data = {
      isGood: false,
      msg: "There was an issue saving your sauce. Try again",
      err
    };
    res.status(400).send(data);
  }
};

/** @description look up a specific sauce by the sauce's slug
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 *  @param {String} req.body.sauce.slug - unique sauce string
 */
exports.getSauceBySlug = async (req, res, next) => {
  try {
    const sauce = await Sauce.findOne({ slug: req.params.slug }).populate(
      "author",
      { _id: 1, name: 1 }
    );

    // init req.response if not already exists
    if (req.response === undefined) req.response = {};

    // attach sauce to req.response object so we can access it in next middleware
    // turn sauce in array since that is format reviewController.findReviewsBySauceID expects
    req.response.sauces = [sauce];

    // go to reviewController.findReviewsBySauceID
    next();
  } catch (err) {
    res.send(err);
  }
};

// TODO Sanitize sauce _id before search DB for it.
exports.getSauceById = async (req, res, next) => {
  // make sure we have a sauce _id in req.body.sauce
  if (
    !req.body.sauce ||
    Object.keys(req.body.sauce) === 0 ||
    !req.body.sauce._id
  ) {
    const data = {
      isGood: false,
      msg: "Requires sauce object. Please try again."
    };
    return res.status(300).send(data);
  }

  try {
    // search for sauce by id
    const sauce = await Sauce.findById(req.body.sauce._id, {
      _id: 1,
      name: 1,
      description: 1,
      photo: 1,
      tags: 1
    }).populate("author");

    // return if sauce isn't found
    if (!sauce) {
      const data = {
        isGood: false,
        msg: "This sauce was not found. Please try again."
      };
      return res.status(300).send(data);
    }

    // init req.response object
    if (req.response === undefined) req.response = {};

    // attach sauce object to our response object
    // call .toObject() to get rid of a bunch of mongoose stuff
    // array since next middleware expects array
    req.response.sauces = [sauce.toObject()];

    // go to reviewController.findReviewByUserID
    next();
  } catch (err) {
    console.log(err);
    const data = {
      isGood: false,
      msg: "Something broke or your sauce was unable to be found, Try again."
    };
    return res.send(data);
  }
};

exports.editSauce = async (req, res) => {
  try {
    // generate new slug
    req.body.slug = slug(req.body.name);

    // find sauce by _id and update
    const sauce = await Sauce.findOneAndUpdate(
      { _id: req.body._id },
      req.body,
      {
        new: true, // return new sauce instead of old one -- we want updated data returned
        runValidators: true // force model to be sure required fields are still there
      }
    ).exec();

    const data = {
      isGood: true,
      msg: "Successfully updated your sauce.",
      sauce
    };
    // send sauce back for user to edit
    return res.status(200).send(data);
  } catch (err) {
    // go into here if user didn't input name or some other model requirement wasn't met
    const data = {
      isGood: false,
      msg: "Could not update your sauce.",
      err
    };
    res.satus(400).send(data);
  }
};

/** @description Grabs all available sauces and attaches to req.response.sauces
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 */
exports.getSauces = async (req, res, next) => {
  try {
    // Grab page and limit. Make sure they are numbers.
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(page) || Number.isNaN(limit)) {
      const data = {
        isGood: false,
        msg: "Your search query was invalid. Try using numbers only."
      };
      return res.status(400).send(data);
    }

    // get all sauces
    const sauces = await Sauce.find({}, { created: 0 })
      .skip(limit * (page - 1))
      .limit(limit)
      .populate({
        path: "author",
        select: "_id name"
      });

    if (!sauces) {
      const data = { isGood: false, msg: "Unable to find any sauces" };
      return res.status(400).send(data);
    }

    // init req.response if not already exists
    if (req.response === undefined) req.response = {};

    // attach sauces to req.response
    req.response.sauces = sauces;

    // go to reviewController.getOnlyReviewIDsBySauceID
    next();
  } catch (err) {
    const data = { isGood: false, msg: "Unable to find any sauces" };
    res.status(400).send(data);
  }
};

// TODO: Filter/sanitize user input
exports.searchSauces = async (req, res) => {
  try {
    // search index by query param and score by relevancy
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
    // get tag from param or passed through body
    const tag = req.body.tag.toLowerCase();
    // query to get all tags or regex for case insensitive specific ones
    const tagQuery = tag === "all" ? { $exists: true } : new RegExp(tag, "i");

    // find sauces that match tags query and grab author object
    let sauces = await Sauce.find({ tags: tagQuery }).populate("author");

    // sanity check
    if (!sauces) {
      const data = {
        isGood: false,
        msg: "Unable to find tag-specific sauces."
      };
      return res.status(400).send(data);
    }

    // replace sauce.author with sauce.author.email
    sauces = sauces.map(sauce => {
      const sauceObj = sauce.toObject();
      sauceObj.author = sauceObj.author.email;
      return sauceObj;
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
    console.log(err);
    return res.status(400).send(data);
  }
};

exports.getTagsList = async (req, res) => {
  try {
    // get tags from Sauce aggregate
    const tags = await Sauce.getTagsList();

    // sanity check
    if (!tags) {
      const data = { isGood: false, msg: "Could not find any tags!" };
      return res.status(300).send(data);
    }

    // send response
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
