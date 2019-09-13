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
 *      @return {String} data.user.token - unique user JWT
 *      @return {String} data.user.displayName - user's display name
 *      @return {String} data.user.email - user's email
 *      @return {String} data.user.isAdmin - is user an admin or not
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
    // Verify user
    const user = await Users.AuthenticateUser({
      email: req.body.user.email,
      password: req.body.user.password
    });

    // check we found the person
    if (!user) {
      const data = {
        isGood: false,
        msg: "Could not verify login."
      };

      //invalid credentials
      res.status(400).send(data);
    }

    // Check out if user is an admin or not
    const isAdmin = await Users.IsAdmin({ UserID: user.UserID });

    // get JWT
    const token = module.exports.createToken(user.UserID);

    // remove userID from user obj
    delete user.UserID;

    // get name and email
    const { DisplayName: displayName, Email: email, URL: avatarURL } = user;
    const data = {
      isGood: true,
      msg: "Successfully logged in.",
      user: { token, displayName, email, avatarURL, isAdmin }
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

/** @description Verify if a user is legit by checking JWT
 *  @param {String} req.body.user.token - unique user string
 *  @extends req.body.user.UserID attaches the user's id to the request obj
 *  @return Attaches UserID onto req.body.user OR return with isGood status and message
 */
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
    console.log(decoded);
    if (!decoded) {
      const data = {
        isGood: false,
        msg: "Could not verify your account or your account is disabled."
      };
      return res.status(400).send(data);
    }

    // grab UserID
    const userId = decoded.sub;
    console.log(userId);

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
      return res.status(200).send({ isGood: true, msg: "Found user." });
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
    const resetURL = `http://localhost:8080/account/reset/${user.resetPasswordToken}`;
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
 *  @param {String} StringToCreateTokenWith - Unique user id
 *  @return {String} token - unique JWT
 */
exports.createToken = StringToCreateTokenWith => {
  // create JWT token
  const payload = { sub: StringToCreateTokenWith };
  const token = jwt.sign(payload, process.env.SECRET);

  return token;
};

/** @description Check if user is eligible to add a sauce or not
 *  @extends res.locals attaches isEmailVerified to res.locals or returns with that message
 *  @param {String} req.body.user.UserID - unique user string *
 *  @return Attaches isEmailVerified to res.locals OR Returns res.locals w/ isEmailVerified
 */
exports.isEmailVerified = isEmailVerified = async (req, res, next) => {
  try {
    // get UserID
    const { UserID } = req.body.user;

    // Make sure we have userid
    if (!UserID) {
      const data = {
        isGood: false,
        msg: "Could not find a user to lookup. Please provide a valid user."
      };
      return res.status(400).send(data);
    }

    // Find if email has been verified or not
    const IsEmailVerified = await Users.IsEmailVerified({ UserID });

    // If not verified, end here.
    if (!IsEmailVerified) {
      //return to client
      return res.status(200).send({
        isGood: false, //user cannot update
        msg:
          "You are ineligible to submit at this time. Please verify email first."
      });
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "isEmailVerified",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send({
        isGood: IsEmailVerified, //user can/cannot update
        msg: "Email is verified."
      });
    } else {
      // Go to next middleware
      res.locals.isEmailVerified = IsEmailVerified;
      return next();
    }
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "There was an error in determing if your email has been verified or not. Please try again.",
      err
    };
    return res.status(400).send(data);
  }
};

/** @description Confirm an email address
 *  @param {String} req.body.email - email to confirm
 *  @return Continues on next middleware OR returns isGood object
 */
exports.confirmEmail = confirmEmail = async (req, res, next) => {
  try {
    // Make sure we have an email to work with
    const { email: JWTEmail } = req.body;
    if (!JWTEmail) {
      const data = {
        isGood: false,
        msg:
          "Could not find an email address to verify. Please confirm email address is provided correctly and try again."
      };
      // Send back bad data response
      return res.status(400).send(data);
    }

    // Need to turn JWT into something usable
    const decoded = await jwt.verify(JWTEmail, process.env.SECRET);
    if (!decoded) {
      const data = {
        isGood: false,
        msg:
          "Could not process the passed Email. Please verify URL and try again."
      };
      return res.status(400).send(data);
    }

    // grab Email
    const Email = decoded.sub;

    // Confirm Email
    const isGood = await Users.toggleConfirmEmail({
      Email,
      Toggle: true
    });

    // Make sure good
    if (!isGood) {
      const data = {
        isGood: false,
        msg:
          "Could not confirm email address. User's account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "confirmEmail",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send({
        isGood: true,
        msg: "Your email has been verified! Thank you!"
      });
    } else {
      // Get user's email and attach to body
      const email = await User.FindByDisplayName({
        DisplayName: displayName
      }).then(resp => {
        return resp.Email;
      });

      req.body.user.email = email;

      // Go to next middleware
      return next();
    }
  } catch (err) {
    const data = {
      isGood: false,
      msg:
        "Could not confirm email address. Your account may be locked, inactive, or token may be expired. "
    };
    return res.status(401).send(data);
  }
};
