const jwt = require("jsonwebtoken");
const Users = require("../models/Users");
const Utility = require("../utility/utility");

/** @description Log user in by generating token
 *  @param {Object} req.body.user - expects to find user obj. Will check if stringified if not immediately accessible
 *    @param {String} req.body.user.email - persons email
 *    @param {String} req.body.user.password - persons password
 *  @return {Object} data - container object
 *    @return {Boolean} data.isGood - If request is good
 *    @return {String} data.msg - text related to isGood boolean
 *    @return {Object} data.user - container object
 *      @return {Object} data.user.token - unique user JWT
 *      @return {Object} data.user.displayName - user's display name
 *      @return {Object} data.user.email - user's email
 */
exports.login = async (req, res) => {
  // Quick sanity check
  if (req.body.user === undefined || Object.keys(req.body.user) === 0) {
    const data = {
      isGood: false,
      msg: "You did not pass the necessary fields. Please Try again."
    };
    return res.status(400).send(data);
  }

  try {
    const user = await Users.AuthenticateUser({
      email: req.body.user.email,
      password: req.body.user.password
    });

    // get JWT
    const token = module.exports.createToken({ UserID: user.UserID });

    // get name and email
    const { DisplayName: displayName, Email: email, URL: avatarURL } = user;
    const data = {
      isGood: true,
      msg: "Successfully logged in.",
      user: { token, displayName, email, avatarURL }
    };
    return res.status(200).send(data);
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      err.message = "Connection error. Please try again";
    }
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    return res.status(401).send(data);
  }
};

// Looks at req.body.user.token first then tries to unstringify res.body.user in search for token
exports.isLoggedIn = isLoggedIn = async (req, res, next) => {
  // confirm that we are passed a user.token to parse
  if (req.body.user && req.body.user.token) {
    // We are good and can continue to parse request
  } else {
    // Not good. Need to try to find token somewhere else or give error message
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

      // Now make sure we can find a req.body.user.token val
      if (!req.body.user.token) {
        const data = {
          isGood: false,
          msg:
            "You are not logged in or your token is invalid. Please try again. If you stringified an object, make sure the string is stored in 'data'."
        };
        return res.status(401).send(data);
      }
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

  try {
    // decode the token using a secret key-phrase
    const decoded = await jwt.verify(token, process.env.SECRET);
    if (!decoded) {
      const data = {
        isGood: false,
        msg: "Could not verify your account or your account is disabled."
      };
      return res.status(400).send(data);
    }

    // grab UserID
    const userId = decoded.sub;

    // check if a user exists
    const user = await Users.DoesUserExist({ UserID: userId });

    if (!user) {
      const data = {
        isGood: false,
        msg: "Could not find your account or your account is disabled."
      };
      return res.status(400).send(data);
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "isLoggedIn",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res
        .status(200)
        .send(
          Object.assign({}, res.locals, { isGood: true, msg: "Found user." })
        );
    } else {
      // remove token from user
      delete req.body.user.token;

      // attach user info onto req.body.user obj
      req.body.user = { ...req.body.user, UserID: userId };

      // User is legit, go to next middleware
      return next();
    }
  } catch (err) {
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    return res.status(401).send(data);
  }
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

/** @description Creates a unique JWT
 *  @param {Object} UserID - Unique user id
 *  @return {String} token - unique JWT
 */
exports.createToken = ({ UserID }) => {
  // create JWT token
  const payload = { sub: UserID };
  const token = jwt.sign(payload, process.env.SECRET);

  return token;
};

// exports.validateToken = (req, res) => {
//   const data = { isGood: true, msg: "Found user." };
//   return res.status(200).send(data);
// };
