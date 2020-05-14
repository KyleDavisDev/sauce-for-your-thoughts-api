const jwt = require("jsonwebtoken");
const Users = require("../models/Users");
const {
  Utility,
  JWT_AUTH_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
} = require("../utility/utility");

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
 */
exports.login = login = async (req, res, next) => {
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

    // check if an admin
    const isAdmin = await Users.IsAdmin({ UserID: user.UserID });

    // create auth token and refresh token
    const [token, refreshToken] = await Utility.createTokens(
      user.UserID,
      process.env.SECRET,
      process.env.SECRET2 + user.Password
    );

    // create httpOnly cookies from tokens
    res.cookie("sfyt-api-token", token, {
      maxAge: 1000 * JWT_AUTH_EXPIRES_IN, // time, in milliseconds, for token expiration
      httpOnly: true,
      path: "/"
    });
    res.cookie("sfyt-api-refresh-token", refreshToken, {
      maxAge: 1000 * JWT_REFRESH_EXPIRES_IN, // time, in milliseconds, for token expiration
      httpOnly: true,
      path: "/"
    });

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "login",
      stack: req.route.stack
    });

    // get name and email
    const { DisplayName: displayName, Email: email, URL: avatarURL } = user;

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      const data = {
        isGood: true,
        msg: "Successfully logged in.",
        user: { token, displayName, email, avatarURL, isAdmin }
      };
      // Send back to client
      res.status(200).send(data);

      // make sure userid is in req.body
      res.locals.UserID = user.UserID;

      // Keep going
      next();
    } else {
      // attach user info onto req.body.user obj
      req.body.user = {
        token,
        displayName,
        email,
        avatarURL,
        UserID: user.UserID
      };

      // remove userID from user obj -- general cleanup
      delete user.UserID;

      // User is legit, go to next middleware
      return next();
    }
  } catch (err) {
    // TODO: Log error in a DB

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
  // grab api token
  const token = req.cookies["sfyt-api-token"];
  if (token) {
    try {
      // 1) Grab userID from token
      const { user: userID } = jwt.verify(token, process.env.SECRET);
      if (!userID) {
        const data = {
          isGood: false,
          msg: "Could not verify your account or your account is disabled."
        };
        const errCode = Utility.generateErrorStatusCode(data.msg);
        return res.status(errCode).send(data);
      }

      // 2) Check if a user exists
      const user = await Users.DoesUserExist({ UserID: userID });
      if (!user) {
        const data = {
          isGood: false,
          msg: "Could not find your account or your account is disabled."
        };
        const errCode = Utility.generateErrorStatusCode(data.msg);
        return res.status(errCode).send(data);
      }

      // 3) Find out if more middleware or if this is last stop.
      const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
        name: "isLoggedIn",
        stack: req.route.stack
      });

      // 4) Send response back OR keep going
      if (isLastMiddlewareInStack) {
        //return to client
        return res.status(200).send({ isGood: true, msg: "Found user." });
      } else {
        if (!req.body.user) {
          req.body.user = {};
        }
        // attach user info onto req.body.user obj
        req.body.user.UserID = userID;

        // User is legit, go to next middleware
        return next();
      }
    } catch (err) {
      // If api token is expired, we cannot find user, or something else happened, ask person to sign in again
      const data = {
        isGood: false,
        msg: "Your login has expired. Please relogin and try again."
      };
      const errCode = Utility.generateErrorStatusCode(data.msg);
      return res.status(errCode).send(data);
    }
  } else {
    // User has not provided required token so ending it here.
    const data = {
      isGood: false,
      msg: "Your login has expired. Please relogin and try again."
    };
    const errCode = Utility.generateErrorStatusCode(data.msg);
    return res.status(errCode).send(data);
  }
};

exports.refreshAuthToken = async (req, res, next) => {
  try {
    // 1) Grab refresh token
    const refreshToken = req.cookies["sfyt-api-refresh-token"];
    if (!refreshToken) {
      const data = {
        isGood: false,
        msg: "Could not verify your account or your account is disabled."
      };
      const errCode = Utility.generateErrorStatusCode(data.msg);
      return res.status(errCode).send(data);
    }

    // 2) Check if refresh token is valid or not
    const [isRefreshTokenValid, userID] = await Utility.validateRefreshToken(
      refreshToken
    );
    if (!isRefreshTokenValid) {
      const data = {
        isGood: false,
        msg: "Could not verify your account or your account is disabled."
      };
      const errCode = Utility.generateErrorStatusCode(data.msg);
      return res.status(errCode).send(data);
    }

    // 3) Create new auth token
    const authToken = await Utility.createAuthToken(userID, process.env.SECRET);
    res.cookie("sfyt-api-token", authToken, {
      maxAge: 1000 * JWT_AUTH_EXPIRES_IN, // time, in milliseconds, for token expiration
      httpOnly: true,
      path: "/"
    });

    // 4) Return to user
    return res.status(200).send({ isGood: true, token: authToken });
  } catch (err) {
    // set cookies to 'delete'
    res.clearCookie("sfyt-api-refresh-token", { path: "/", maxAge: 0 });
    res.clearCookie("sfyt-api-token", { path: "/", maxAge: 0 });

    // construct our return data object
    const data = {
      isGood: false,
      msg: "Could not verify your account or your account is disabled."
    };
    const errCode = Utility.generateErrorStatusCode(data.msg);
    return res.status(errCode).send(data);
  }
};

/** @description Verify if a user is legit by checking JWT
 *  @param {String} req.body.user.UserID - unique user string
 *  @extends req.body.user attached whether user is an Admin or not
 *  @return Attaches isAdmin onto req.body.user OR return with isGood status and message
 */
exports.isAdmin = isAdmin = async (req, res, next) => {
  if (!req.body.user || !req.body.user.UserID) {
    const data = {
      isGood: false,
      msg: "Could not verify if you are an admin or not."
    };
    // 401 not enough data
    return res.status(400).send(data);
  }

  try {
    // grab UserID
    const { UserID } = req.body.user;
    delete req.body.user.UserID;

    // check if an admin
    const isAdmin = await Users.IsAdmin({ UserID });

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "isAdmin",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      const data = {
        isGood: false,
        msg: isAdmin ? "User is admin." : "User is not an admin",
        user: Object.assign({}, req.body.user, isAdmin)
      };
      //return to client
      return res.status(200).send(data);
    } else {
      // remove token from user
      delete req.body.user.token;

      // attach user info onto req.body.user obj
      req.body.user = Object.assign({}, req.body.user, isAdmin);

      // User is legit, go to next middleware
      return next();
    }
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const data = {
        isGood: false,
        msg: "Oops! Looks like your login has expired. Please log in again."
      };
      // 403, user has token but expired so simply need to relogin
      return res.status(403).send(data);
    }
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
      return res.status(401).send({
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
      res.status(200).send({
        isGood: IsEmailVerified, //user can/cannot update
        msg: "Email is verified."
      });

      // Go to next middleware
      next();
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
    // 1) Make sure we have an email to work with
    const { jwt: JWTEmail } = req.body;
    if (!JWTEmail) {
      const data = {
        isGood: false,
        msg:
          "Could not find an email address to verify. Please confirm email address is provided correctly and try again."
      };
      // Send back bad data response
      return res.status(400).send(data);
    }

    // 2) Turn JWT into something usable
    const [isTrusted, userID] = await Utility.validateEmailToken(JWTEmail);
    if (!isTrusted) {
      const data = {
        isGood: false,
        msg:
          "Oops! Your URL may be expired or invalid. Please request a new verification email and try again."
      };
      const errCode = Utility.generateErrorStatusCode(data.msg);
      return res.status(errCode).send(data);
    }

    // 3) Toggle email on
    const success = await Users.toggleConfirmEmail({
      UserID: userID,
      Toggle: true
    });
    if (!success) {
      const data = {
        isGood: false,
        msg:
          "Oops! Your URL may be expired or invalid. Please request a new verification email and try again."
      };
      const errCode = Utility.generateErrorStatusCode(data.msg);
      return res.status(errCode).send(data);
    }

    // 4) Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "confirmEmail",
      stack: req.route.stack
    });
    if (isLastMiddlewareInStack) {
      // 5) Send to client
      return res.status(200).send({
        isGood: true,
        msg: "Your email has been verified! Thank you!"
      });
    } else {
      // 5) Keep going
      req.body.user.Email = Email;

      // Go to next middleware
      return next();
    }
  } catch (err) {
    // TODO: Log to DB here

    const data = {
      isGood: false,
      msg:
        "Oops! Your URL may be expired or invalid. Please request a new verification email and try again."
    };
    const errCode = Utility.generateErrorStatusCode(data.msg);
    return res.status(errCode).send(data);
  }
};

/** @description Confirm an email address
 *  @param {String} req.body.user.UserID - User to resend email verfication to
 *  @return Continues on next middleware OR returns isGood object
 */
exports.resendEmail = resendEmail = async (req, res, next) => {
  try {
    const { UserID } = req.body.user;

    const Email = await Users.FindUserEmail({ UserID });
    // Make sure good
    if (!Email) {
      const data = {
        isGood: false,
        msg:
          "Could not find your email address. Your account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    const couldSendVerification = await Users.SendVerificationEmail({ Email });

    // Make sure good
    if (!couldSendVerification) {
      const data = {
        isGood: false,
        msg:
          "Could not resend verification email. User's account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "resendEmail",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send({
        isGood: true,
        msg: "Email verification resent! Thank you."
      });
    } else {
      // Get user's email and attach to body
      const email = await User.FindUserEmail({
        DisplayName: displayName
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
