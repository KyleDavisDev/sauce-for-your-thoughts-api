const Sauces = require("../models/Sauces");
const Users = require("../models/Users");
const Types = require("../models/Types");
const { Utility } = require("../utility/utility");
const validator = require("validator");

// constants
const DEFAULT_QUERY_PAGE = 1;
const DEFAULT_QUERY_LIMIT = 12;
const DEFAULT_QUERY_TYPE = "all";
const DEFAULT_QUERY_ORDER = "newest";

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

    // Shallow trim string values
    Object.keys(sauce).map(key => {
      if (typeof sauce[key] === "string") {
        req.body.sauce[key] = sauce[key].trim();
      }
    });

    // Maybe more filtering here?

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

// Validate Slug param to make sure legit
// Will assign res.locals as well
exports.validateSlugParam = async (req, res, next) => {
  try {
    // Grab parameters
    const params = req.query;

    if (validator.isEmpty(params.s)) {
      throw new Error("You must supply a sauce to look up.");
    }
    res.locals.slug = params.s;

    return next();
  } catch (err) {
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg: err.message
    };
    return res.status(401).send(data);
  }
};

// Validate query params to make sure legit
// Will assign res.locals as well
exports.validateQueryParams = async (req, res, next) => {
  try {
    // Grab parameters
    const params = req.query;

    // Grab available types and make lowercase
    const types = await Types.FindTypes().then(result => {
      return result.map(type => {
        return type.toLowerCase();
      });
    });

    // If param type exists and is a known type
    if (params.type && types.includes(params.type.toLowerCase())) {
      res.locals.type = params.type.toLowerCase();
    } else {
      res.locals.type = DEFAULT_QUERY_TYPE;
    }

    // Maybe this will come from DB later?
    // List of known order options
    const orderOptions = ["name", "newest", "times reviewed", "avg rating"];
    // If Sort By doesn't exist, assign it
    if (params.order && orderOptions.includes(params.order.toLowerCase())) {
      res.locals.order = params.order.toLowerCase();
    } else {
      res.locals.order = DEFAULT_QUERY_ORDER;
    }

    // Grab page. Make sure is number and greater than 0.
    const page = parseInt(params.page, 10);
    if (page !== NaN && page > 0) {
      res.locals.page = page;
    } else {
      res.locals.page = DEFAULT_QUERY_PAGE;
    }

    // Grab limit. Make sure is number and greater than 0.
    const limit = parseInt(params.limit, 10);
    if (limit !== NaN && limit > 0) {
      res.locals.limit = limit;
    } else {
      res.locals.limit = DEFAULT_QUERY_LIMIT;
    }

    // Check srch
    const srch = params.srch;
    // exists, is string, less than 20 char long
    if (srch && !validator.isNumeric(srch) && srch.length < 20) {
      res.locals.srch = srch;
    }

    return next();
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
 *  @param {String=} req.body.sauce.ingrediants - ingrediants of the sauce
 *  @param {Number=|null} req.body.sauce.shu - spiciness of sauce
 *  @param {String[]=} req.body.sauce.types - how the suace is intended to be used
 *  @param {Object=} req.body.sauce.location - location object
 *    @param {String=} req.body.sauce.location.country - country sauce was made in
 *    @param {String=} req.body.sauce.location.state - state/region sauce was made in
 *    @param {String=} req.body.sauce.location.city - city sauce was made in
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
      Ingredients: sauce.ingredients,
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
      msg: "There was an issue saving your sauce. Try again"
    };
    res.status(400).send(data);
  }
};

/** @description look up a specific sauce by the sauce's slug
 *  @param {String} res.locals.slug - unique sauce string
 *  @param {String} req.body.sauce.slug - unique sauce string
 *  @returns {Boolean} isGood - did the things work as expected?
 *  @returns {String} msg - small msg associated with task
 *  @returns {Object} sauce - sauce obj
 */
exports.getSauceBySlug = getSauceBySlug = async (req, res, next) => {
  try {
    let { slug } = res.locals;
    // Make sure slug is in right place
    if (!slug || slug.length === 0) {
      // One last check to see slug is on req body
      slug = req.body.sauce.slug;

      if (!slug || slug.length === 0) {
        const data = {
          isGood: false,
          msg: "Unable find your sauce. Please verify you provided a slug."
        };
        return res.status(300).send(data);
      }
    }

    const Slug = slug;
    const sauce = await Sauces.FindSauceBySlug({ Slug });

    // Make sure we found the sauce or else throw error
    if (!sauce) {
      throw new Error(
        "Could not find a sauce associated with this slug. Please make sure your slug is correct and try agian."
      );
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getSauceBySlug",
      stack: req.route.stack
    });

    // attach slug to res.locals
    res.locals.SauceSlug = Slug;

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      // send to client
      res.status(200).send({
        isGood: true,
        sauce,
        msg: "Found suace"
      });

      next();
    } else {
      // reassign sauce
      req.body.sauce = sauce;

      // keep going
      return next();
    }
  } catch (err) {
    console.log(err);
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg:
        "There was an issue finding this sauce. Please verify the provided slug is valid."
    };
    return res.status(401).send(data);
  }
};

/** @description Get sauces related to a sauce.
 *  @param {Object} req.body.sauce - sauce object
 *  @param {Object} res.locals.sauce - sauce object
 *  @return Attaches realated to sauce OR Returns res.locals w/ sauce
 */
exports.getRelatedSauces = getRelatedSauces = async (req, res, next) => {
  // Grab sauce from body
  let { sauce } = req.body;

  // If sauce isn't good, try reassigning.
  if (!sauce || !sauce.slug) {
    sauce = res.locals.sauce;
  }

  // If sauce still not good, send back.
  if (!sauce || !sauce.slug) {
    const data = {
      isGood: false,
      msg:
        "We couldn't find a slug to look up related sauces. Make sure it's in the right place"
    };

    // Maybe we still return what we found?
    return res.status(300).send(data);
  }

  try {
    // Get few related sauces
    const related = await Sauces.FindRelated({ Slug: sauce.slug });

    // Assign related to sauce obj.
    sauce._related = related;

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getRelatedSauces",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res
        .status(200)
        .send(Object.assign({}, res.locals, { isGood: true, sauces }));
    } else {
      // Go to next middleware
      return next();
    }
  } catch (err) {
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg: "Could not find any related sauces."
    };
    return res.status(401).send(data);
  }
};

/** @description Get all reviews related to specific sauce slug.
 *  @param {Object} req.body.sauce - sauce object
 *  @param {Object} res.locals.sauce - sauce object
 *  @return Attaches reviews to sauce.
 */
exports.getSaucesWithNewestReviews = getSaucesWithNewestReviews = async (
  req,
  res,
  next
) => {
  // Grab sauce from body
  let { sauce } = req.body;

  // If sauce isn't good, try reassigning.
  if (!sauce || !sauce.slug) {
    sauce = res.locals.sauce;
  }

  // If sauce still not good, send back.
  if (!sauce || !sauce.slug) {
    const data = {
      isGood: false,
      msg:
        "We couldn't find a slug to look up the reviews. Make sure it's in the right place"
    };
    return res.status(300).send(data);
  }

  try {
    // array of newest sauces
    const saucesWithNewestReviews = await Sauces.getSaucesWithNewestReviews();

    // Attach newest to res.locals
    res.locals.saucesWithNewestReviews = saucesWithNewestReviews;

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getSaucesWithNewestReviews",
      stack: req.route.stack
    });

    // If we are end of stack, send to client
    if (isLastMiddlewareInStack) {
      // Send to client
      res.status(200).send({ isGood: true, sauce, saucesWithNewestReviews });

      next();
    } else {
      // Go to next middleware
      return next();
    }
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "Error finding reviews. Make sure you have passed a legitimate slug and try again."
    };
    return res.status(400).send(data);
  }
};

/** @description Find newly-added sauces */
exports.getSaucesByNewest = getSaucesByNewest = async (req, res, next) => {
  try {
    const { sauces: saucesByNewest } = await Sauces.FindSaucesByQuery({
      params: { type: "all", order: "newest", limit: 10 },
      includeTotal: false
    });

    // Make sure we found the sauces or else throw error
    if (!saucesByNewest) {
      throw new Error(
        "Could not find any newly-added sauces. This is likely an error on our end. Please try again in a bit."
      );
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getSaucesByNewest",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      // Send response to client
      return res.status(200).send({ isGood: true, saucesByNewest });
    } else {
      // attach to res.locals
      res.locals.saucesByNewest = saucesByNewest;
      // Go to next middleware
      return next();
    }
  } catch (err) {
    console.log(err);
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg:
        "There was an issue finding this sauce. Please verify the provided slug is valid."
    };
    return res.status(401).send(data);
  }
};

/** @description Find featured sauces */
exports.getSaucesByFeatured = getSaucesByFeatured = async (req, res, next) => {
  try {
    const { sauces: saucesByFeatured } = await Sauces.FindSaucesByQuery({
      params: { type: "all", order: "newest", limit: 10 },
      includeTotal: false
    });

    // Make sure we found the sauces or else throw error
    if (!saucesByFeatured) {
      throw new Error(
        "Could not find any featured sauces. This is likely an error on our end. Please try again in a bit."
      );
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getSaucesByFeatured",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      // Send response to client
      return res.status(200).send({ isGood: true, saucesByFeatured });
    } else {
      // attach to res.locals
      res.locals.saucesByFeatured = saucesByFeatured;
      // Go to next middleware
      return next();
    }
  } catch (err) {
    console.log(err);
    // Will be here is input failed a validator check
    const data = {
      isGood: false,
      msg: "There was an issue finding featured sauces."
    };
    return res.status(401).send(data);
  }
};

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

/** @description Get sauces by a query params
 *  @param {Object} res.locals - local object to each request
 *  @param {String} res.locals.type - type of sauce interested in
 *  @param {String} res.locals.order - Which order to list the sauces
 *  @param {Number} res.locals.page - How many we should offset
 *  @param {Number} res.locals.limit - sauce per page
 *  @returns Attaches sauces to res.locals, clean up res.locals, attach totalForQuery to res.locals OR returns sauces w/ res.locals
 */
exports.getByQuery = getByQuery = async (req, res, next) => {
  try {
    const { sauces, total: totalForQuery } = await Sauces.FindSaucesByQuery({
      params: res.locals,
      includeTotal: true
    });

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getByQuery",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send({
        isGood: true,
        sauces
      });
    } else {
      // Attach newest to res.locals
      res.locals.sauces = sauces;

      // attach total for the query to res.locals
      res.locals.totalForQuery = totalForQuery;

      // remove query-related items from res.locals
      delete res.locals.limit;
      delete res.locals.order;
      delete res.locals.srch;
      delete res.locals.page;

      // Go to next middleware
      return next();
    }
  } catch (err) {
    const data = { isGood: false, msg: "Unable to find any sauces" };
    res.status(400).send(data);
  }
};

/** @description Get total count of sauces. Append to res.locals if middle
 *  @returns Attaches count to res.locals OR returns count w/ res.locals
 */
exports.getTotal = getTotal = async (req, res, next) => {
  try {
    const total = await Sauces.FindTotal();

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getTotal",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      res
        .status(200)
        .send(Object.assign({}, res.locals, { isGood: true, total }));

      // Finish off request
      next();
    } else {
      // Attach newest to res.locals
      res.locals.total = total;
      // Go to next middleware
      return next();
    }
  } catch (err) {
    console.log(err);
    const data = { isGood: false, msg: "Unable to find any sauces" };
    res.status(400).send(data);
  }
};

/** @description Get list of unapproved sauces
 *  @returns Array of sauces OR goes to next middleware
 */
exports.getUnapproved = getUnapproved = async (req, res, next) => {
  try {
    const sauces = await Sauces.GetUnappoved();

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "getUnapproved",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send({
        isGood: true,
        sauces
      });
    } else {
      // Attach sauces to res.locals
      res.locals.sauces = sauces;

      // Go to next middleware
      return next();
    }
  } catch (err) {
    const data = { isGood: false, msg: "Unable to find any sauces" };
    res.status(400).send(data);
  }
};

/** @description Approve single sauce
 *  @param {Number} req.body.sauce.sauceID - unique sauce id
 *  @returns {Boolean} isGood - did the things work as expected?
 *  @returns {String} msg - small msg associated with task
 */
exports.approveSauce = approveSauce = async (req, res, next) => {
  try {
    const { sauceID: SauceID } = req.body.sauce;

    if (!SauceID) {
      const data = {
        isGood: false,
        msg: "Could not find an Sauce to approve."
      };
      // Send back bad data response
      return res.status(400).send(data);
    }

    const toggleSuccessfull = await Sauces.ToggleSauceApproval({
      SauceID,
      Toggle: true
    });

    //return to client
    return res.status(200).send({
      isGood: toggleSuccessfull,
      msg: "Sauce successfully approved."
    });
  } catch (err) {
    console.log(err);
    const data = { isGood: false, msg: "Unable to approve the sauce" };
    res.status(400).send(data);
  }
};

/** @description Decline single sauce
 *  @param {Number} req.body.sauce.sauceID - unique sauce id
 *  @returns {Boolean} isGood - did the things work as expected?
 *  @returns {String} msg - small msg associated with task
 */
exports.declineSauce = declineSauce = async (req, res, next) => {
  try {
    const { sauceID: SauceID } = req.body.sauce;

    if (!SauceID) {
      const data = {
        isGood: false,
        msg: "Could not find an Sauce to decline."
      };
      // Send back bad data response
      return res.status(400).send(data);
    }

    const toggleSuccessfull = await Sauces.ToggleSauceApproval({
      SauceID,
      Toggle: false
    });

    //return to client
    return res.status(200).send({
      isGood: toggleSuccessfull,
      msg: "Sauce successfully declined."
    });
  } catch (err) {
    console.log(err);
    const data = { isGood: false, msg: "Unable to decline the sauce" };
    res.status(400).send(data);
  }
};

/** @description Check if a person is eligible to edit a sauce or not.
 *  First checks if user is admin or not, then checks if user is sauce owner and sauce is private.
 *  @param {String} req.body.user.UserID - unique user id
 *  @param {String} req.body.sauce.slug - unique sauce id
 *  @returns {Boolean} isGood - did the things work as expected?
 *  @returns {String} msg - small msg associated with task
 */
exports.canUserEdit = canUserEdit = async (req, res, next) => {
  try {
    // Grab variables
    const { UserID } = req.body.user;
    const { slug: Slug } = req.body.sauce;

    // Quick sanity check
    if (!Slug || !UserID) {
      const data = {
        isGood: false,
        msg: "Could not required parameters for canUserEdit"
      };
      // Send back bad data response
      return res.status(400).send(data);
    }

    // If user is an admin, automatically give access.
    const isUserAdmin = await Users.IsAdmin({ UserID });

    if (!isUserAdmin) {
      // Check to see if user owns sauce and the sauce is private.
      // Public sauces can only be edited by an admin.
      var isUserSauceOwnerAndSaucePrivate = await Sauces.CanUserEditSauce({
        UserID,
        Slug
      });
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "canUserEdit",
      stack: req.route.stack
    });

    if (isLastMiddlewareInStack) {
      const isGood = isUserAdmin || isUserSauceOwnerAndSaucePrivate;
      const data = {
        isGood,
        msg: isGood
          ? "User is eligible to edit."
          : "You are ineligible to edit this sauce. You are not the submitter of the sauce or the sauce is listed as a public sauce. Please contact an Admin if this is a mistake."
      };

      //return to client
      return res.status(200).send(data);
    } else {
      // do we need to do anything here?

      // Keep going
      return next();
    }
  } catch (err) {
    console.log(err);
    const data = {
      isGood: false,
      msg: "User is inelgible to edit this sauce."
    };
    res.status(400).send(data);
  }
};

/** @description Update a specific sauce
 *  @param {String} req.body.user.UserID - unique user id
 *  @param {Object} req.body.sauce - sauce object
 *  @returns {Boolean} isGood - did the things work as expected?
 *  @returns {String} msg - small msg associated with task
 */
exports.updateSauce = updateSauce = async (req, res, next) => {
  try {
    // Grab variables
    const { UserID } = req.body.user;
    const { sauce } = req.body;

    // Quick sanity check
    if (!UserID || !sauce) {
      const data = {
        isGood: false,
        msg: "Could not required parameters for updateSauce"
      };
      // Send back bad data response
      return res.status(400).send(data);
    }

    const updateSauce = await Sauces.UpdateSauce({
      Slug: sauce.slug,
      Name: sauce.name,
      Maker: sauce.maker,
      Description: sauce.description,
      Ingredients: sauce.ingredients,
      SHU: sauce.shu,
      State: sauce.state,
      Country: sauce.country,
      City: sauce.city,
      Photo: sauce.photo,
      Types: sauce.types,
      UserID
    });

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "updateSauce",
      stack: req.route.stack
    });

    if (isLastMiddlewareInStack) {
      const isGood = updateSauce;
      const data = {
        isGood,
        msg: isGood
          ? "Sauce has been updated!"
          : "Failed to update sauce. Please try again or contact an admin."
      };

      //return to client
      return res.status(200).send(data);
    } else {
      // do we need to do anything here?

      return next();
    }
  } catch (err) {
    console.log(err);
    const data = { isGood: false, msg: "Unable to update the sauce" };
    res.status(400).send(data);
  }
};
