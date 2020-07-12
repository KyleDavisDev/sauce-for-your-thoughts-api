const User = require("../models/Users");
const validator = require("validator");
const {
  Utility,
  JWT_AUTH_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN
} = require("../utility/utility");
const MIN_PASSWORD_LENGTH = User.MIN_PASSWORD_LENGTH;
const MIN_DISPLAYNAME_LENGTH = User.MIN_DISPLAYNAME_LENGTH;

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
    if (req.body.user.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Your password is too weak! Please make your password over ${MIN_PASSWORD_LENGTH} characters long.`
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

exports.validateEmailUpdate = async (req, res, next) => {
  // Make sure emails match
  if (!validator.equals(req.body.user.email, req.body.user.confirmEmail)) {
    throw new Error("Emails do not match. Please try again.");
  }

  // Sanitize user's email
  req.body.user.email = validator.normalizeEmail(req.body.user.email, {
    all_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false
  });

  try {
    const { password, UserID } = req.body.user;
    // Make sure passed password is good
    await User.AuthenticateUser({ UserID, password });

    // Keep going
    return next();
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      err.message = "Connection error. Please try again";
    }

    // make return obj
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    // find appropriate status code number
    const statusCode = Utility.generateResponseStatusCode(data.msg);

    // return to client
    return res.status(statusCode).send(data);
  }
};

exports.validatePasswordUpdate = async (req, res, next) => {
  // Make sure new password is sufficiently long
  if (req.body.user.newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Your new password is too weak! Please make your password over ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }

  // Make sure password is sufficiently long
  if (req.body.user.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Your password is too weak! Please make your password over ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }

  // Make sure new passwords match
  if (
    !validator.equals(
      req.body.user.newPassword,
      req.body.user.confirmNewPassword
    )
  ) {
    throw new Error("New passwords do not match. Please try again.");
  }

  try {
    const { password, UserID } = req.body.user;
    // Make sure passed password is good
    const user = await User.AuthenticateUser({ UserID, password });

    // Make sure user was found
    if (!user) {
      throw new Error("Could not authenticate user. Please try agian");
    }

    // Keep going
    return next();
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      err.message = "Connection error. Please try again";
    }
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    return res.status(err.status).send(data);
  }
};

/** @description Validate displayName information before moving to next middleware
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @param {String} req.body.user.displayName - new display name
 *  @param {String} req.body.user.confirmDisplayName - confirm new display name
 *  @param {String} req.body.user.password - user password
 *  @return Continues on next middleware OR returns error
 */
exports.validateDisplayNameUpdate = async (req, res, next) => {
  // Make sure old password is sufficiently long
  if (req.body.user.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Your old password is too weak! Please make your password over ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }

  // Make sure display name is sufficiently long
  if (req.body.user.displayName.length < MIN_DISPLAYNAME_LENGTH) {
    throw new Error(
      `Your display name is too short! Please make your display name over ${MIN_DISPLAYNAME_LENGTH} characters long.`
    );
  }

  // Make sure new passwords match
  if (
    !validator.equals(
      req.body.user.displayName,
      req.body.user.confirmDisplayName
    )
  ) {
    throw new Error("Dispaly names do not match. Please try again.");
  }

  try {
    const { password, UserID } = req.body.user;
    // Make sure passed password is good
    const user = await User.AuthenticateUser({ UserID, password });

    // Make sure user was found
    if (!user) {
      throw new Error("Could not authenticate user. Please try agian");
    }

    // Keep going
    return next();
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      err.message = "Connection error. Please try again";
    }
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    return res.status(err.status).send(data);
  }
};

/** @description Validate displayName information before moving to next middleware
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @param {String} req.body.user.avatarURL - new display name
 *  @param {String} req.body.user.password - user password
 *  @return Continues on next middleware OR returns error
 */
exports.validateAvatarUpdate = async (req, res, next) => {
  // Make sure old password is sufficiently long
  if (req.body.user.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Your old password is too weak! Please make your password over ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }

  // Make sure avatarURL is sufficiently long -- 10 is arbitrary
  if (req.body.user.avatarURL.length < 10) {
    throw new Error("Your avatar path is too short!");
  }

  try {
    const { password, UserID } = req.body.user;

    // Make sure passed password is good
    const user = await User.AuthenticateUser({ UserID, password });

    // Make sure user was found
    if (!user) {
      throw new Error("Could not authenticate user. Please try agian");
    }
    // Keep going
    return next();
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      err.message = "Connection error. Please try again";
    }
    const data = {
      isGood: false,
      msg: err.message || "Connection error. Please try again"
    };
    return res.status(err.status).send(data);
  }
};

/** @description Register a user into the database.
 *  @param {String} req.body.user.email - user's email
 *  @param {String} req.body.user.displayName - user's display name
 *  @param {String} req.body.user.password - user's password
 *  @return Continues on next middleware OR returns error
 */
exports.register = async (req, res, next) => {
  // Grab variables and check they exist
  const {
    email: Email,
    displayName: DisplayName,
    password: Password
  } = req.body.user;

  if (!Email || !DisplayName || !Password) {
    const data = {
      isGood: false,
      msg:
        "Could not register user. Please make sure all required information is provided."
    };
    // Sending bad data response
    return res.status(400).send(data);
  }

  try {
    // These will have already been checked via userController.validateRegister method
    const record = {
      Email,
      DisplayName,
      Password
    };

    // Insert into DB
    await User.Insert(record);

    // go to authController.login
    next();
  } catch (err) {
    // TODO: Log error into DB

    let msg;
    if (err.code === "ER_DUP_ENTRY") {
      msg =
        "An account with the provided email address or display name already exists.";
    }

    // Will land here if email/name already in use or there was issue hasing password
    const data = {
      isGood: false,
      msg: msg || "Connection error. Please try again"
    };
    return res.status(401).send(data);
  }
};

/** @description Returns basic information about a specific user
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @return {Object} data - container object
 *    @return {Boolean} data.isGood - whether user was able to be found or not
 *    @return {String} data.msg - small blurb about isGood bool
 *    @return {Object} data.user - user container
 *      @return {String} data.user._id - unique person identifier
 *      @return {String} data.user.email - user email
 *      @return {String} data.user.name - user's name (first last)
 */
exports.getInfo = async (req, res) => {
  try {
    // 1) Grab user's ID and make sure we have something
    const { UserID } = req.body.user;
    if (!UserID) {
      const data = {
        isGood: false,
        msg: "Could not verify user as legit. Please log out and try again."
      };
      return res.status(400).send(data);
    }

    // 2) Get info about user
    const user = await User.FindUserByID({ UserID });

    // 3) Construct client-appropriate data object
    const userObj = {
      displayName: user.DisplayName,
      avatarURL: user.URL,
      isAdmin: await User.IsAdmin({ UserID })
    };

    // 4) Return to client
    res.status(200).send({ isGood: true, user: userObj });
  } catch (err) {
    // TODO: error handling
  }
};

/** @description Update a specific user's email address.
 *  userController.validateEmailUpdate should be called before this.
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @param {String} req.body.user.email - new email
 *  @return Continues on next middleware OR returns isGood object
 */
exports.updateEmail = updateEmail = async (req, res, next) => {
  try {
    // Get user's ID and make sure we have something
    const { UserID } = req.body.user;
    if (!UserID) {
      const data = {
        isGood: false,
        msg: "Could not verify user as legit. Please log out and try again."
      };
      return res.status(400).send(data);
    }
    // Grab email and make sure we have soemthing
    const { email } = req.body.user;
    if (!email) {
      const data = {
        isGood: false,
        msg: "Could not find a new email to update to."
      };
      return res.status(400).send(data);
    }

    const isGood = await User.UpdateEmail({ UserID, Email: email });

    if (!isGood) {
      const data = {
        isGood: false,
        msg: "Could not update email. User's account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "updateEmail",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send(Object.assign({}, { isGood: true }));
    } else {
      // Go to next middleware
      return next();
    }
  } catch (err) {}
};

/** @description Update a specific user's password
 *  userController.validatePasswordUpdate should be called before this.
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @param {String} req.body.user.newPassword - new password
 *  @return Continues on next middleware OR returns isGood object
 */
exports.updatePassword = updatePassword = async (req, res, next) => {
  try {
    // Get user's ID and make sure we have something
    const { UserID } = req.body.user;
    console.log(UserID);
    if (!UserID) {
      const data = {
        isGood: false,
        msg: "Could not verify user as legit. Please log out and try again."
      };
      return res.status(400).send(data);
    }
    // Grab email and make sure we have soemthing
    const { newPassword } = req.body.user;
    if (!newPassword) {
      const data = {
        isGood: false,
        msg: "Could not find a new password to update to."
      };
      return res.status(400).send(data);
    }

    // Update the password, make sure it worked.
    const isGood = await User.UpdatePassword({ UserID, Password: newPassword });
    if (!isGood) {
      const data = {
        isGood: false,
        msg:
          "Could not update password. User's account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    // create auth token and refresh token
    const [token, refreshToken] = await Utility.createTokens(
      UserID,
      process.env.SECRET,
      process.env.SECRET2 + newPassword
    );

    // create cookies from tokens
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
    res.cookie("has-refresh-token", 1, {
      maxAge: 1000 * JWT_REFRESH_EXPIRES_IN, // time, in milliseconds, for token expiration
      httpOnly: false,
      path: "/"
    });

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "updatePassword",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send(Object.assign({}, { isGood: true }));
    } else {
      // Go to next middleware
      return next();
    }
  } catch (err) {
    console.log(err);
  }
};

/** @description Update a specific user's display name
 *  userController.validateDisplayNameUpdate should be called before this.
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @param {String} req.body.user.displayName - new display name
 *  @return Continues on next middleware OR returns isGood object
 */
exports.updateDisplayName = updateDisplayName = async (req, res, next) => {
  try {
    // Get user's ID and make sure we have something
    const { UserID } = req.body.user;
    if (!UserID) {
      const data = {
        isGood: false,
        msg: "Could not verify user as legit. Please log out and try again."
      };
      return res.status(400).send(data);
    }
    // Grab email and make sure we have soemthing
    const { displayName } = req.body.user;
    if (!displayName) {
      const data = {
        isGood: false,
        msg: "Could not find a new display name to update to."
      };
      return res.status(400).send(data);
    }

    // Update display name
    const isGood = await User.UpdateDisplayName({
      UserID,
      DisplayName: displayName
    });

    // Make sure good
    if (!isGood) {
      const data = {
        isGood: false,
        msg:
          "Could not update display name. User's account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "updateDisplayName",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send(Object.assign({}, { isGood: true }));
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
  } catch (err) {}
};

/** @description Update a specific user's password
 *  userController.validateAvatarUpdate should be called before this.
 *  @param {String} req.body.user.UserID - unique user identifer
 *  @param {String} req.body.user.avatarURL - new display name
 *  @return Continues on next middleware OR returns isGood object
 */
exports.updateAvatarURL = updateAvatarURL = async (req, res, next) => {
  try {
    // Get user's ID and make sure we have something
    const { UserID } = req.body.user;
    if (!UserID) {
      const data = {
        isGood: false,
        msg: "Could not verify user as legit. Please log out and try again."
      };
      return res.status(400).send(data);
    }

    // Grab email and make sure we have soemthing
    const { avatarURL } = req.body.user;
    if (!avatarURL) {
      const data = {
        isGood: false,
        msg: "Could not find a new avatarURL name to update to."
      };
      return res.status(400).send(data);
    }
    // Update display name
    const isGood = await User.UpdateAvatarURL({
      UserID,
      AvatarURL: avatarURL
    });

    // Make sure good
    if (!isGood) {
      const data = {
        isGood: false,
        msg:
          "Could not update avatar. User's account may be locked or inactive."
      };
      return res.status(401).send(data);
    }

    // Find out if more middleware or if this is last stop.
    const isLastMiddlewareInStack = Utility.isLastMiddlewareInStack({
      name: "updateAvatarURL",
      stack: req.route.stack
    });

    // If we are end of stack, go to client
    if (isLastMiddlewareInStack) {
      //return to client
      return res.status(200).send(Object.assign({}, { isGood: true }));
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
  } catch (err) {}
};
