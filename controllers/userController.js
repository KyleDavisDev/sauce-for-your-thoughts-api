const mongoose = require("mongoose");
const User = mongoose.model("User");
const validator = require("validator");
const Hashids = require("hashids");
const hashids = new Hashids();

exports.validateRegister = (req, res, next) => {
  try {
    // Make sure all fields are not empty
    if (validator.isEmpty(req.body.user.email)) {
      throw new Error("You must supply an email");
    }
    if (validator.isEmpty(req.body.user.confirmEmail)) {
      throw new Error("You must supply a confirmation email");
    }
    if (validator.isEmpty(req.body.user.password)) {
      throw new Error("Password cannot be empty.");
    }
    if (validator.isEmpty(req.body.user.confirmPassword)) {
      throw new Error("Confirmed password cannot be empty.");
    }
    if (validator.isEmpty(req.body.user.displayName)) {
      throw new Error("You must supply a name.");
    }

    // Make sure email is legit, matches the confirmEmail, and is normalized
    if (!validator.isEmail(req.body.user.email)) {
      throw new Error("Email is not valid. Please try again.");
    }

    // Make sure emails match
    if (!validator.equals(req.body.user.email, req.body.user.confirmEmail)) {
      throw new Error("Emails do not match. Please try again.");
    }

    // Make sure password is sufficiently long
    if (req.body.user.password.length < 8) {
      throw new Error(
        "Your password is too weak! Please make your password over 8 characters long."
      );
    }

    // Sanitize user's email
    req.body.user.email = validator.normalizeEmail(req.body.user.email, {
      all_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false
    });

    // Make sure passwords match
    if (
      !validator.equals(req.body.user.password, req.body.user.confirmPassword)
    ) {
      throw new Error("Passwords do not match. Please try again.");
    }

    // Sanitize user's name
    req.body.user.displayName = validator.trim(req.body.user.displayName);

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

exports.register = async (req, res, next) => {
  try {
    // These should have already been checked via validateRegister method
    const record = {
      email: req.body.user.email,
      name: req.body.user.displayName,
      password: req.body.user.password
    };

    const user = new User(record);

    if (!user) {
      const data = {
        isGood: false,
        msg: "Unable to register this user. Please try again."
      };
      return res.status(300).send(data);
    }

    // hash/update password
    await user.setPassword(req.body.user.password);
    console.log("after setPassword: ", user);

    // Save user -- This will execute the .pre("save") method
    await user.save();

    next(); // go to authController.login
  } catch (err) {
    // Will land here if email/name already in use or there was issue hasing password
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    return res.status(401).send(data);
  }
};

// TODO: Sanity checks for params
/** @description search DB for user
 *  @param {String} req.body.user._id - unique user identifer
 *  @return {Object} data - container object
 *    @return {Boolean} data.isGood - whether user was able to be found or not
 *    @return {String} data.msg - small blurb about isGood bool
 *    @return {Object} data.user - user container
 *      @return {String} data.user._id - unique person identifier
 *      @return {String} data.user.email - user email
 *      @return {String} data.user.name - user's name (first last)
 */
exports.getUser = async (req, res) => {
  try {
    // grab user _id
    const query = req.body.user._id;
    // find user
    const user = await User.findById(query, { _id: 1, email: 1, name: 1 });
    if (!user) {
      const data = {
        isGood: false,
        msg: "Unable to find user. Please try again."
      };
      return res.status(401).send(data);
    }

    // construct return object
    const data = {
      isGood: true,
      data: { user: { _id: user._id, name: user.name, email: user.email } },
      msg: "Successfully found user."
    };
    return res.status(200).send(data);
  } catch (err) {
    console.log(err);
  }
};

// TODO: Sanity check for params
/** @description update specifc user with new name and email
 *  @param {String} req.body.user._id - unique user identifier
 *  @param {String} req.body.user.name - name to update to
 *  @param {String} req.body.user.email - email to update to
 *  @return {Object} data - response container
 *    @return {Boolean} data.isGood - whether user was able to be found or not
 *    @return {String} data.msg - small blurb about isGood bool
 *    @return {Object} data.user - user container
 *      @return {String} data.user._id - unique person identifier
 *      @return {String} data.user.email - user email
 *      @return {String} data.user.name - user's name (first last)
 */
exports.updateUser = async (req, res) => {
  try {
    const updates = {
      name: req.body.user.name,
      email: req.body.user.email
    };
    const user = await User.findOneAndUpdate(
      { _id: req.body.user._id },
      { $set: updates },
      { new: true, runValidators: true, context: "query" }
    );

    if (!user) {
      const data = {
        isGood: false,
        msg: "Could not update user. Please try again"
      };
      return res.status(400).send(data);
    }

    const data = {
      isGood: true,
      msg: "Successfully updated user information.",
      user: { email: user.email, name: user.name, _id: user._id }
    };

    return res.status(200).send(data);
  } catch (errors) {
    const data = {
      isGood: false,
      msg: errors.message
    };

    return res.status(401).send(data);
  }
};

exports.getSauceUser = async (req, res, next) => {
  try {
    // array of promises
    const sauces = await Promise.all(
      req.body.sauces.map(async sauce => {
        // search through user for matching id and grab only email
        const email = await User.findOne({ _id: sauce.author }, "-_id email");
        // mongoose return are not objects so we need to convert to object first
        const sauceObj = sauce.toObject();
        // set author to email
        sauceObj.author = email.email;
        return sauceObj;
      })
    );

    const data = await {
      isGood: true,
      sauces,
      msg: "Successfully found sauces"
    };
    res.status(200).send(data);
  } catch (errors) {
    console.log(errors);
    console.log("inside catch");
    const data = {
      isGood: false,
      msg: "Unable to find sauces or appropriate user association."
    };
    res.status(401).send(data);
  }
};

// TODO: Better error handling and sanity checks.
/** @description Find all of the hearted sauces for a specific user
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 *  @param {String} req.body.user._id - unique user string
 */
exports.getHearts = async (req, res, next) => {
  // Quick guard clause
  if (!req.body || !req.body.user || !req.body.user._id) {
    const data = {
      isGood: false,
      msg: "Could not find a specific user to lookup.",
      data: {}
    };
    return res.status(400).send(data);
  }

  try {
    // get array of sauce _id's for specific user's hearts
    const user = await User.findById(req.body.user._id, { _id: 0, hearts: 1 });

    // Make sure user didn't fudge up
    if (!user) {
      const data = {
        isGood: false,
        msg: "Could not find your user in the database. Please try again."
      };
      return res.status(400).send(data);
    }

    // Init req.response if it doesn't already exist
    if (req.response === undefined) req.response = {};

    // Attach hearts to global object
    // Going to tranform array of strings to array of objects so encoding step can parse propery
    req.response.hearts = user.hearts.map(x => ({ _id: x }));

    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

// TODO: Better error handling
// TODO: More sanity checks
/** @description add/remove a sauce _id from the user's heart's array
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 *  @param {String} req.body.user._id - unique user string
 *  @param {String} req.body.sauce._id - unique sauce string
 */
exports.toggleHeart = async (req, res, next) => {
  // Simple guard clause
  if (
    !req.body ||
    !req.body.user ||
    !req.body.user._id ||
    !req.body.sauce ||
    !req.body.sauce._id
  ) {
    const data = {
      isGood: false,
      msg: "Your sauce or user _id got lost. Please try again.",
      data: {}
    };
    return res.status(400).send(data);
  }

  try {
    // grab all user hearts
    // turn mongodb results to workable objects
    const user = await User.findById(req.body.user._id, {
      _id: 0,
      hearts: 1
    });

    const { _id } = req.body.sauce;

    // figure out if we need to remove sauce id from hearts array or add to it
    const operator = user.hearts.map(x => x.toString()).includes(_id)
      ? "$pull"
      : "$addToSet";

    // update user's hearts
    await User.findByIdAndUpdate(
      req.body.user._id,
      { [operator]: { hearts: _id } },
      { new: true }
    );

    // init req.response if not already exists
    if (req.response === undefined) req.response = {};

    // attach toggled sauce _id to req.response
    req.response.sauce = { _id };

    // Go to authController.encodeID
    next();
  } catch (err) {
    return res.status(400).send(err);
  }
};

// TODO: Better error handling and sanity checks
/** @description Get user info from DB by querying a specific _id
 *  @extends req.response - extrends/creates onto the custom 'global' object between middleware
 *  @param {String} req.body.user._id - unique user string
 */
exports.getUserById = async (req, res, next) => {
  // Quick guard clause
  if (!req.body || !req.body.user || !req.body.user._id) {
    const data = {
      isGood: false,
      msg: "Could not find a specific user to lookup.",
      data: {}
    };
    return res.status(400).send(data);
  }

  try {
    // grab user _id
    const query = req.body.user._id;
    // find user
    const user = await User.findById(query, { _id: 1, email: 1, name: 1 });
    if (!user) {
      const data = {
        isGood: false,
        msg: "Unable to find user. Please try again."
      };
      return res.status(401).send(data);
    }

    // init req.response if not already exists
    if (req.response === undefined) req.response = {};

    // attach sauces to req.response
    req.response.user = user;

    // Goto authController.encodeID
    next();
  } catch (err) {
    const data = { isGood: false, msg: "Could not find user.", data: {} };
    return res.status(400).send(data);
  }
};
