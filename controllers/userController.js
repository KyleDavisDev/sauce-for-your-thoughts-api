const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");
const jwt = require("jsonwebtoken");

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody("user.name");
  req.checkBody("user.name", "You must supply a name.").notEmpty();
  req.checkBody("user.email", "That email is not valid.").isEmail();
  req.sanitizeBody("user.email").normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody("user.password", "Password cannot be empty.").notEmpty();
  req
    .checkBody("user.confirmPassword", "Confirmed password cannot be empty.")
    .notEmpty();
  req
    .checkBody("user.confirmPassword", "Oops! Your passwords do not match.")
    .equals(req.body.user.password);

  const errors = req.validationErrors();
  if (errors) {
    const data = {
      isGood: false,
      msg: errors
    };
    return res.status(401).send(data);
  }
  next();
};

exports.register = async (req, res, next) => {
  try {
    const record = {
      email: req.body.user.email,
      name: req.body.user.name
    };

    const user = new User(record);

    if (!user) {
      const data = {
        isGood: false,
        msg: "Unable to register this user. Please try again."
      };
      return res.status(300).send(data);
    }

    // switch User.register() to be promised-based instead of callback
    // now register method can be awaited
    // need to pass method to promisify and the object in which the method lives so it can rebind
    const register = promisify(User.register, User);

    // actually register user
    // stores hashed pw
    await register(user, req.body.user.password);

    next(); // go to authController.login
  } catch (errors) {
    console.log(errors);
    const data = {
      isGood: false,
      msg: errors.message
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

exports.updateUser = async (req, res) => {
  try {
    const updates = {
      name: req.body.update.name,
      email: req.body.update.email
    };
    const user = await User.findOneAndUpdate(
      { _id: req.body.user._id },
      { $set: updates },
      { new: true, runValidators: true, context: "query" }
    );

    const data = {
      isGood: true,
      msg: "Successfully updated user information.",
      user: { email: user.email, name: user.name }
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

exports.getHearts = async (req, res) => {
  try {
    const user = await User.findById(req.body.user._id, { _id: 0, hearts: 1 });

    if (!user) {
      const data = {
        isGood: false,
        msg: "Could not find user. Please try again."
      };
      return res.status(400).send(data);
    }

    const data = {
      isGood: true,
      msg: "Found user hearts.",
      data: { hearts: user.hearts }
    };

    return res.status(200).send(data);
  } catch (err) {
    return res.status(400).send(err);
  }
};

exports.toggleHeart = async (req, res) => {
  try {
    // grab all user hearts
    // turn mongodb results to workable objects
    const user = await User.findById(req.body.user._id, {
      _id: 0,
      hearts: 1
    });

    // figure out if we need to remove sauce id from hearts array or add to it
    const operator = user.hearts
      .map(x => x.toString())
      .includes(req.body.sauce._id)
      ? "$pull"
      : "$addToSet";

    // update user's hearts
    await User.findByIdAndUpdate(
      req.body.user._id,
      { [operator]: { hearts: req.body.sauce._id } },
      { new: true }
    );

    return res.status(200).send({
      isGood: true,
      msg: `Sauce ${req.body.sauce._id} has been toggled.`,
      data: { sauce: { _id: req.body.sauce._id } }
    });
  } catch (err) {
    // TODO: Better error handling
    console.log(err);
    return res.status(400).send(err);
  }
};

exports.getUserById = async (req, res, next) => {
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
