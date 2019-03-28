const Sauces = require("../models/Sauces");

// when using FormData, which is needed to upload image, all data gets turned into
// string so we need to reformat to match model
exports.stringToProperType = (req, res, next) => {
  // grab string from req.body.sauce
  const obj = JSON.parse(req.body.sauce);

  // Remove the string from req.body.sauce and reinitialize so we can assign values
  delete req.body.sauce;
  req.body.sauce = {};
  Object.keys(obj.sauce).forEach(x => {
    req.body.sauce[x] = obj.sauce[x];
  });

  // Keep on chuggin'!
  next();
};

exports.validateInsert = (req, res, next) => {
  try {
    const { sauce } = req.body;
    // Make sure required fields are not empty
    if (validator.isEmpty(sauce.name)) {
      throw new Error("You must supply a name");
    }
    if (validator.isEmpty(sauce.maker)) {
      throw new Error("You must supply a maker");
    }
    if (validator.isEmpty(sauce.description)) {
      throw new Error("You must supply a description.");
    }

    // Trim string insert
    req.body.sauce = Object.keys(sauce).map(key => {
      if (typeof sauce[key] === "string") {
        return sauce[key].trim();
      }
      return sauce[key];
    });

    next();
  } catch (err) {
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg: err.message
    };
    return res.status(401).send(data);
  }
};

/** @description Save a sauce into the database
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 *  @param {String} req.body.sauce.name - name of the sauce
 *  @param {String} req.body.sauce.maker - name of person/company that made sauce
 *  @param {String} req.body.sauce.description - description of the sauce
 *  @param {String?} req.body.sauce.ingrediants - ingrediants of the sauce
 *  @param {Number?|null} req.body.sauce.shu - spiciness of sauce
 *  @param {String[]?} req.body.sauce.types - how the suace is intended to be used
 *  @param {Object?} req.body.sauce.location - location object
 *    @param {String?} req.body.sauce.location.country - country sauce was made in
 *    @param {String?} req.body.sauce.location.state - state/region sauce was made in
 *    @param {String?} req.body.sauce.location.city - city sauce was made in
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
    // Grab values from req.body.sauce
    const { sauce, user } = req.body;

    // Grab photo name if exists
    let Photo = null;
    if (req.body.photo) Photo = req.body.photo;

    // Insert sauce
    const slug = await Sauces.Insert({
      UserID: user.UserID,
      Name: sauce.name,
      Maker: sauce.maker,
      Description: sauce.description,
      Ingrediants: sauce.ingrediants,
      SHU: sauce.shu,
      State: sauce.state,
      Country: sauce.country,
      City: sauce.city,
      IsPrivate: sauce.isPrivate,
      Types: sauce.types,
      Photo
    });

    // Safety check
    if (!slug) {
      const data = {
        isGood: false,
        msg:
          "We could not add your sauce. Please verify everything is set appropriately and try agian."
      };
      return res.status(400).send(data);
    }

    // construct return object
    const data = {
      isGood: true,
      sauce: { slug }
    };

    return res.status(200).send(data);
  } catch (err) {
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
 *  @param {String?} req.parms.slug - unique sauce string
 *  @param {String?} req.body.sauce.slug - unique sauce string
 */
// exports.getSauceBySlug = async (req, res, next) => {
//   try {
//     // Make sure slug is in right place
//     if (!req.body.sauce || !req.body.sauce.slug) {
//       const data = {
//         isGood: false,
//         msg: "Make sure you are providing a slug with your sauce."
//       };
//       return res.status(300).send(data);
//     }

//     const sauce = await Sauce.findOne(
//       {
//         slug: req.body.sauce.slug, //by slug
//         isPrivate: false, // make sure publicly available
//         isActive: true // make sure active
//       },
//       {
//         photo: 1,
//         types: 1,
//         name: 1,
//         maker: 1,
//         shu: 1,
//         location: 1,
//         description: 1,
//         created: 1,
//         slug: 1
//         // author: 1
//       }
//     ).populate("author", { _id: 0, name: 1, created: 1 });
//     console.log(sauce);

//     // Make sure we found the sauce or else throw error
//     if (!sauce) {
//       throw new Error(
//         "Could not find a sauce associated with this slug. Please make sure your slug is correct and try agian."
//       );
//     }

//     // reassign sauce
//     req.body.sauce = sauce;

//     // keep going
//     next();
//   } catch (err) {
//     console.log(err);
//     // Will be here is input failed a validator check
//     const data = {
//       isGood: false,
//       msg: err.message
//     };
//     return res.status(401).send(data);
//   }
// };

// TODO Sanitize sauce _id before search DB for it.
// exports.getSauceById = async (req, res, next) => {
//   // make sure we have a sauce _id in req.body.sauce
//   if (
//     !req.body.sauce ||
//     Object.keys(req.body.sauce) === 0 ||
//     !req.body.sauce._id
//   ) {
//     const data = {
//       isGood: false,
//       msg: "Requires sauce object. Please try again."
//     };
//     return res.status(300).send(data);
//   }

//   try {
//     // search for sauce by id
//     const sauce = await Sauce.findById(req.body.sauce._id, {
//       _id: 1,
//       name: 1,
//       description: 1,
//       photo: 1,
//       tags: 1
//     }).populate("author");

//     // return if sauce isn't found
//     if (!sauce) {
//       const data = {
//         isGood: false,
//         msg: "This sauce was not found. Please try again."
//       };
//       return res.status(300).send(data);
//     }

//     // init req.response object
//     if (req.response === undefined) req.response = {};

//     // attach sauce object to our response object
//     // call .toObject() to get rid of a bunch of mongoose stuff
//     // array since next middleware expects array
//     req.response.sauces = [sauce.toObject()];

//     // go to reviewController.findReviewByUserID
//     next();
//   } catch (err) {
//     const data = {
//       isGood: false,
//       msg: "Something broke or your sauce was unable to be found, Try again."
//     };
//     return res.send(data);
//   }
// };

// exports.editSauce = async (req, res) => {
//   try {
//     // generate new slug
//     req.body.slug = slug(req.body.name);

//     // find sauce by _id and update
//     const sauce = await Sauce.findOneAndUpdate(
//       { _id: req.body._id },
//       req.body,
//       {
//         new: true, // return new sauce instead of old one -- we want updated data returned
//         runValidators: true // force model to be sure required fields are still there
//       }
//     ).exec();

//     const data = {
//       isGood: true,
//       msg: "Successfully updated your sauce.",
//       sauce
//     };
//     // send sauce back for user to edit
//     return res.status(200).send(data);
//   } catch (err) {
//     // go into here if user didn't input name or some other model requirement wasn't met
//     const data = {
//       isGood: false,
//       msg: "Could not update your sauce.",
//       err
//     };
//     res.satus(400).send(data);
//   }
// };

/** @description Grabs all available sauces and attaches to req.response.sauces
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 */
// exports.getSauces = async (req, res, next) => {
//   try {
//     // Grab page and limit. Make sure they are numbers.
//     const page = parseInt(req.query.page, 10);
//     const limit = parseInt(req.query.limit, 10);
//     if (Number.isNaN(page) || Number.isNaN(limit)) {
//       const data = {
//         isGood: false,
//         msg: "Your search query was invalid. Try using numbers only."
//       };
//       return res.status(400).send(data);
//     }

//     // get all sauces within the given range (skip, limit)
//     const sauces = await Sauce.find({ isActive: true }, { isActive: 0 })
//       .skip(limit * (page - 1))
//       .limit(limit)
//       .populate({
//         path: "author",
//         select: "_id name"
//       });

//     // Get the total number of sauces w/o any range
//     const total = await Sauce.count({ isActive: true });

//     if (!sauces || sauces.length === 0) {
//       const data = { isGood: false, msg: "Unable to find any sauces" };
//       return res.status(400).send(data);
//     }

//     // init req.response if not already exists
//     if (req.response === undefined) req.response = {};

//     // attach sauces and total to req.response
//     req.response.sauces = sauces;
//     req.response.total = total;

//     // go to reviewController.getOnlyReviewIDsBySauceID
//     next();
//   } catch (err) {
//     const data = { isGood: false, msg: "Unable to find any sauces" };
//     res.status(400).send(data);
//   }
// };

// TODO: Filter/sanitize user input
// exports.searchSauces = async (req, res) => {
//   try {
//     // search index by query param and score by relevancy
//     const sauces = await Sauce.find(
//       {
//         $text: {
//           $search: req.params.q
//         }
//       },
//       {
//         score: { $meta: "textScore" }
//       }
//     )
//       .sort({ score: { $meta: "textScore" } })
//       .limit(5);

//     if (!sauces || sauces.length === 0) {
//       const data = {
//         isGood: false,
//         msg: "Unable to find any sauces!"
//       };
//       return res.status(300).send(data);
//     }

//     const data = {
//       isGood: true,
//       msg: `Successfully found ${sauces.length} sauces!`,
//       sauces
//     };
//     return res.status(200).send(data);
//   } catch (err) {
//     return res.status(400).send(err);
//   }
// };

// exports.getSauceByTag = async (req, res) => {
//   try {
//     // get tag from param or passed through body
//     const tag = req.body.tag.toLowerCase();
//     // query to get all tags or regex for case insensitive specific ones
//     const tagQuery = tag === "all" ? { $exists: true } : new RegExp(tag, "i");

//     // find sauces that match tags query and grab author object
//     let sauces = await Sauce.find({ tags: tagQuery }).populate("author");

//     // sanity check
//     if (!sauces) {
//       const data = {
//         isGood: false,
//         msg: "Unable to find tag-specific sauces."
//       };
//       return res.status(400).send(data);
//     }

//     // replace sauce.author with sauce.author.email
//     sauces = sauces.map(sauce => {
//       const sauceObj = sauce.toObject();
//       sauceObj.author = sauceObj.author.email;
//       return sauceObj;
//     });

//     const data = {
//       isGood: true,
//       sauces,
//       msg: "Successfuly found tag-specific sauces."
//     };
//     return res.status(200).send(data);
//   } catch (err) {
//     const data = {
//       isGood: false,
//       msg: "You goof'd it. Try again."
//     };
//     console.log(err);
//     return res.status(400).send(data);
//   }
// };

// exports.getTagsList = async (req, res) => {
//   try {
//     // get tags from Sauce aggregate
//     const tags = await Sauce.getTagsList();

//     // sanity check
//     if (!tags) {
//       const data = { isGood: false, msg: "Could not find any tags!" };
//       return res.status(300).send(data);
//     }

//     // send response
//     const data = { isGood: true, tags, msg: "Found the list of tags!" };
//     res.status(200).send(data);
//   } catch (err) {
//     const data = {
//       isGood: false,
//       msg: "Something went horribly, horribly wrong. Please try again! :)"
//     };
//     return res.status(400).send(data);
//   }
// };
