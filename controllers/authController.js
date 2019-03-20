const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { encryptDecrypt } = require("../handlers/auth");
// const mail = require("../handlers/mail.js");

exports.login = (req, res) => {
  if (req.body.user === undefined || Object.keys(req.body.user) === 0) {
    const data = {
      isGood: false,
      msg: "You did not pass the necessary fields. Please Try again."
    };
    return res.status(400).send(data);
  }

  User.AuthenticateUser(
    { email: req.body.user.email, password: req.body.user.password },
    function(err, result, msg) {
      if (err) {
        return res.status(401).send(err);
      }

      // Login was bad or user is locked
      if (!result) {
        const data = {
          isGood: false,
          msg: msg || "Invalid username or password."
        };
        return res.status(400).send(data);
      }

      // create JWT token
      const payload = { sub: result._id };
      const token = jwt.sign(payload, process.env.SECRET);

      // get name and email
      const { name, email } = result;
      const data = {
        isGood: true,
        msg: "Successfully logged in.",
        user: { token, name, email }
      };
      return res.status(200).send(data);
    }
  );
};

exports.isLoggedIn = (req, res, next) => {
  // confirm that we are passed a user.token to parse
  if (!req.body.user || !req.body.user.token) {
    // One last check: maybe we were passed a stringified object
    if (
      req.body.user !== undefined &&
      Object.prototype.toString.call(req.body.user) === "[object String]"
    ) {
      // convert string to object
      const obj = JSON.parse(req.body.user);

      // concat onto req.body
      Object.keys(obj).forEach(x => {
        req.body[x] = obj[x];
      });
    } else {
      const data = {
        isGood: false,
        msg:
          "You are not logged in or your token is invalid. Please try again. If you stringified an object, make sure the string is stored in 'data'."
      };
      return res.status(401).send(data);
    }
  }

  // get token from post
  const { token } = req.body.user;

  // decode the token using a secret key-phrase
  return jwt.verify(token, process.env.SECRET, (err, decoded) => {
    if (err) {
      const data = {
        isGood: false,
        msg: "You are not logged in or your token is invalid. Please try again."
      };
      return res.status(401).send(data);
    }

    const userId = decoded.sub;

    // check if a user exists
    return User.findById(userId, (userErr, user) => {
      // error or not user
      if (userErr || !user) {
        const data = {
          isGood: false,
          msg:
            "You are not logged in or your token is invalid. Please try again."
        };
        return res.status(401).send(data);
      }
      // remove token from user
      delete req.body.user.token;

      // attach person _id to body
      req.body.user._id = user._id;

      // user is legit
      return next();
    });
  });
};

exports.forgot = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.user.email });
    // if user not found we will send false positive object but actually send no email
    // doing this check early will also prevent server from having to use resouces to create new token
    if (!user) {
      const data = { isGood: true, msg: "An email has been sent to you." };
      return res.send(data);
    }

    // create a token string
    const payload = {
      sub: user.email
    };
    const token = jwt.sign(payload, process.env.SECRET);

    // assign token and current date in DB to check against later
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // create URL and email to user email
    const resetURL = `http://localhost:8080/account/reset/${
      user.resetPasswordToken
    }`;
    await mail.send({
      user,
      subject: "Password reset",
      resetURL,
      filename: "password-reset"
    });

    // send legitmate data
    const data = { isGood: true, msg: "An email has been sent to you." };
    return res.send(data);
  } catch (err) {
    res.send(err);
  }
};

// called to verify if token is legit or not when user first lands on reset page
exports.validateResetToken = async (req, res) => {
  try {
    // find if user exists w/ matching token and within time limit of 1hr
    const user = await User.findOne({
      resetPasswordToken: req.body.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      const data = {
        isGood: false,
        msg: "Password reset token has expired or is incorrect."
      };
      res.send(data);
      return;
    }

    const data = { isGood: true, msg: "Please enter a new password." };
    res.send(data);
  } catch (err) {
    res.send(err);
  }
};

// checks if two submitted passwords are equal
exports.confirmPasswords = (req, res, next) => {
  if (req.body.password === req.body.confirmPassword) {
    next(); // keep going
    return;
  }

  // passwords didn't match
  const data = {
    isGood: false,
    msg: "Passwords did not match. Please try again."
  };
  return res.status(401).send(data);
};

// reset password
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.body.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      res.send({
        isGood: false,
        msg: "User was not found or token has expired."
      });
      return;
    }

    // save pw
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);

    // remove token and token expiration from db
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // log user in -- need to bind email to req.body first
    // can clean up req.body too since local passport only needs email and password
    req.body.email = user.email;
    req.body.confirmPassword = undefined;
    req.body.token = undefined;

    next();
    return;
  } catch (err) {
    res.send(err);
  }
};

exports.validateToken = (req, res) => {
  const data = { isGood: true, msg: "Found user." };
  return res.status(200).send(data);
};

/** @description Search through return data object for any mongoose _id's and encodes them.
 *  @extends req.response - semi 'global' object between middleware
 *  @param {Object} req.response - expects something to be here
 */
exports.encodeID = (req, res) => {
  // Simple guard clause
  if (!req.response || Object.keys(req.response).length === 0) {
    const data = {
      isGood: false,
      msg: "response object failed to be created. Please try again",
      data: {}
    };
    res.status(400).send(data);
  }

  try {
    // We need to search through sauces/users/reviews in req.response for
    // any _id properties and convert it to a hashed value.
    req.response = encryptDecrypt(req.response, "encode");

    // construct our final return object
    const data = {
      isGood: true,
      data: req.response
    };

    return res.status(200).send(data);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
};

/** @description Decode any _id found and go to next middleware
 *  @param {Object} req.body - expects data to be found here to decode
 */
exports.decodeID = (req, res, next) => {
  // Simple guard clause
  if (!req.body || Object.keys(req.body).length === 0) {
    const data = {
      isGood: false,
      msg:
        "Oops! Looks like nothing was passed to the server. Please ensure you are sending data in a JSON format.",
      data: {}
    };
    res.status(300).send(data);
  }

  try {
    // We need to search through sauces/users/reviews in req.response for
    // any _id properties and convert it to a hashed value.
    req.body = encryptDecrypt(req.body, "decode");

    next();
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
};
