const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");
const jwt = require("jsonwebtoken");

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody("name");
  req.checkBody("name", "You must supply a name.").notEmpty();
  req.checkBody("email", "That email is not valid.").isEmail();
  req.sanitizeBody("email").normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody("password", "Password cannot be empty.").notEmpty();
  req
    .checkBody("confirmPassword", "Confirmed password cannot be empty.")
    .notEmpty();
  req
    .checkBody("confirmPassword", "Oops! Your passwords do not match.")
    .equals(req.body.password);

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
  const user = new User({ email: req.body.email, name: req.body.name });
  const registerWithPromise = promisify(User.register, User); //now register method can be awaited
  try {
    await registerWithPromise(user, req.body.password);
  } catch (errors) {
    const data = {
      isGood: false,
      msg: errors.message
    };
    return res.status(401).send(data);
  }
  next(); //go to authController.login
};

exports.getUser = (req, res, next) => {
  // check if a user exists
  return User.findById(req.body._id, (userErr, user) => {
    if (userErr || !user) {
      const data = {
        isGood: false,
        msg: "Unable to find user. Please try again."
      };
      return res.status(401).send(data);
    }

    //only pass back relevant information
    const data = {
      isGood: true,
      user: { email: user.email },
      msg: "Successfully found user."
    };
    return res.status(200).send(data);
  });
};

exports.updateUser = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  try {
    const user = await User.findOneAndUpdate(
      { _id: req.body._id },
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
    //array of promises
    const sauces = await Promise.all(
      req.body.sauces.map(async sauce => {
        //search through user for matching id and grab only email
        const email = await User.findOne({ _id: sauce.author }, "-_id email");
        //mongoose return are not objects so we need to convert to object first
        sauce = sauce.toObject();
        //set author to email
        sauce.author = email.email;
        return sauce;
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
