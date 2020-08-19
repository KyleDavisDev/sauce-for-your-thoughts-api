const jwt = require("jsonwebtoken");

const EmailClient = require("../email/email");
const Users = require("../models/Users");

// Request status codes
const OK = 200; // The request has succeeded
const BAD_REQUEST = 400; // request could not be understood for some reason; bad syntax?
const UNAUTHORIZED = 401; // authorization is possible but has failed for any reason
const FORBIDDEN = 403; // authorized passed but user does not have permissions (maybe account is locked)
const NOT_FOUND = 404; // resource not found but may be available in the future
const LOGIN_EXPIRED = 410; // login token expired. User should login again to get new token
// Error Codes
const AUTH_REFRESH_TOKEN_NOT_FOUND = 3300; // Couldn't find expected refresh token
const SAUCE_UPDATE_FAILED = 7300; // There was an error updating the sauce
const UNKNOWN = 9999; // Catch-all value
// Constants
const JWT_AUTH_EXPIRES_IN = 60 * 2; // 2 minutes
const JWT_REFRESH_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days
const JWT_CONFIRMATION_EMAIL_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days
const JWT_RESET_PASSWORD_EXPIRES_IN = 60 * 60 * 1; // 1 hour

const Utility = {
  /** @description Loop through middleware stack and check if the current middleware is at the end or not
   *  @param {String} name - Name of current middleware
   *  @param {Layer[]} stack - Array of middleware layers
   *  @return {Boolean} whether or not the current middleware is the last or not
   */
  isLastMiddlewareInStack({ name, stack }) {
    let position = 0;
    for (let i = 0, len = stack.length; i < len; i++) {
      if (stack[i].name === name) {
        position = i;
        break;
      }
    }

    return position + 1 == stack.length;
  },

  generate: {
    /** @description Standardize error status by passing to a single function here
     *  @param {String} err - error string
     *  @return {Number} The status code error
     */
    responseStatusCode(err) {
      switch (err) {
        case "TokenExpiredError":
        case "Unable to validate your request. Your token may be expired, please try again.":
        case "Could not validate token.":
        case "Error processing your request. Please try again.":
          return UNAUTHORIZED;

        case "Oops! Your URL may be expired or invalid. Please request a new verification email and try again.":
        case "Connection error. Please try again":
        case "Could not verify your account or your account is disabled.":
          return BAD_REQUEST;

        case "Could not find any types":
        case "Something broke and we were unable to find any types. Please try again.":
          return NOT_FOUND;

        case "Your login has expired. Please relogin and try again.":
          return LOGIN_EXPIRED;

        case "Invalid username or password.":
        case "We tried to email your account but something went wrong. Please try again.":
          return FORBIDDEN;

        case "Password reset email has been sent! Thank you!":
          return OK;

        default:
          return BAD_REQUEST;
      }
    },

    /** @description Standardize error status by passing to a single function here
     *  @param {String} err - error string
     *  @return {Number} The status code error
     */
    errorCode(err) {
      if (err === "Could not required parameters for updateSauce")
        return SAUCE_UPDATE_FAILED;
      else if (
        err === "Could not find expected cookies. Please try to relogin."
      )
        return AUTH_REFRESH_TOKEN_NOT_FOUND;
      // default to uknown
      return UNKNOWN;
    }
  },

  create: {
    /** @description Create authentication token and reset token
     *  @param {String} userID - an identifiable user string
     *  @param {String} password - user's password
     *  @returns {Promise}
     *  @resolves {String[APIToken, refreshToken]} array of JWT
     */
    tokens: async ({ userID, password }) => {
      const createToken = Utility.create.APIToken(userID);

      const createRefreshToken = Utility.create.refreshToken(userID, password);

      return Promise.all([createToken, createRefreshToken]);
    },

    /** @description Create authentication token
     *  @param {String} userID - an identifiable user string
     *  @returns {Promise}
     *  @resolves {String} JWT
     */
    async APIToken(userID) {
      return jwt.sign(
        {
          user: userID
        },
        process.env.SECRET_API,
        {
          expiresIn: JWT_AUTH_EXPIRES_IN
        }
      );
    },

    /** @description Create Refresh token
     *  @param {String} userID - an identifiable user string
     *  @param {String} password - a user's password.
     *  @returns {Promise}
     *  @resolves {String} JWT
     */
    async refreshToken(userID, password) {
      return jwt.sign(
        {
          user: userID
        },
        process.env.SECRET_REFRESH + password,
        {
          expiresIn: JWT_REFRESH_EXPIRES_IN
        }
      );
    },

    /** @description Create an Email JWT
     *  @param {String} email - an identifiable user email
     *  @returns {Promise}
     *  @resolves {String} JWT
     */
    async confirmEmailToken(email) {
      return jwt.sign(
        {
          user: email
        },
        process.env.SECRET_EMAIL,
        {
          expiresIn: JWT_CONFIRMATION_EMAIL_EXPIRES_IN
        }
      );
    },

    /** @description Create a Password Reset JWT
     *  @param {String} email - an identifiable user email
     *  @returns {Promise}
     *  @resolves {String} JWT
     */
    async passwordResetToken(email) {
      return jwt.sign(
        {
          user: email
        },
        process.env.SECRET_PASSWORD_RESET + email,
        {
          expiresIn: JWT_RESET_PASSWORD_EXPIRES_IN
        }
      );
    }
  },

  validate: {
    /** @description Check to see if the API token is legit or not
     *  @param {String} token - the API token being verified
     *  @returns {[Boolean, Number]} whether token is legit or not, the user's ID
     */
    async APIToken(token) {
      try {
        // 1) Grab email from jwt
        const { user } = await jwt.decode(token);
        if (!user) {
          return [false, 0];
        }

        // 2) Verify person exists
        const doesUserExist = await Users.DoesUserExist({ UserID: user });
        if (!doesUserExist) {
          return [false, 0];
        }

        // 3) Check if token is legit
        const isTrusted = await !!jwt.verify(token, process.env.SECRET_API);
        if (!isTrusted) {
          return [false, 0];
        }

        return [isTrusted, user];
      } catch (err) {
        // TODO: Log error

        // token is not legit or something else happened
        return [false, 0];
      }
    },
    /** @description Check to see if the refresh token is legit or not
     *  @param {String} token - the refresh token being verified
     *  @returns {[Boolean, Number]} whether token is legit or not, the user's ID
     */
    async emailToken(token) {
      try {
        // 1) Grab email from jwt
        const { user } = await jwt.decode(token);
        if (!user) {
          return [false, 0];
        }
        const email = user;

        // 2) Verify person exists
        const userID = await Users.FindUserIDByUnique({ Email: email });
        if (!userID) {
          return [false, 0];
        }

        // 3) Check if token is legit
        const isTrusted = await !!jwt.verify(token, process.env.SECRET_EMAIL);
        if (!isTrusted) {
          return [false, 0];
        }

        return [isTrusted, userID];
      } catch (err) {
        // TODO: Log error

        // token is not legit or something else happened
        return [false, 0];
      }
    },

    /** @description Check to see if the refresh token is legit or not
     *  @param {String} token - the refresh token being verified
     *  @returns {[Boolean, Number]} whether token is legit or not, the user's ID
     */
    async refreshToken(token) {
      try {
        // 1) Grab userID from jwt
        const { user: userID } = await jwt.decode(token);
        if (!userID) {
          return [false, 0];
        }

        // 2) Verify person exists
        const doesUserExist = await Users.DoesUserExist({ UserID: userID });
        if (!doesUserExist) {
          return [false, 0];
        }

        // 3) Grab user from DB
        const user = await Users.FindUserByID({ UserID: userID });

        // 4) Check if token is legit
        const isTrusted = !!jwt.verify(
          token,
          process.env.SECRET_REFRESH + user.Password
        );

        return [isTrusted, userID];
      } catch (err) {
        // TODO: Log error

        // token is not legit or something else happened
        return [false, 0];
      }
    },

    /** @description Check to see if the password reset token is legit
     *  @param {String} token - the token being verified
     *  @returns {[Boolean, STring]} whether token is legit or not, the user's email
     */
    async passwordResetToken(token) {
      try {
        // 1) Grab email from jwt
        const { user: email } = await jwt.decode(token);
        if (!email) {
          return [false, 0];
        }

        // 2) Verify person exists
        const doesUserExist = await Users.DoesUserExist({ Email: email });
        if (!doesUserExist) {
          return [false, 0];
        }

        // 4) Check if token is legit
        const isTrusted = !!jwt.verify(
          token,
          process.env.SECRET_PASSWORD_RESET + email
        );

        // 5) Return
        return [isTrusted, email];
      } catch (err) {
        // TODO: Log error

        // token is not legit or something else happened
        return [false, 0];
      }
    }
  },

  send: {
    /** @description Send email verification to confirm account creation
     *  @param {String} Email - Where the email will be sent
     *  @returns {Promise}
     *  @resolves {Boolean}
     */
    verificationEmail: async ({ Email }) => {
      // 1) Sanity check
      if (!Email) {
        throw new Error(
          "Must provide required parameters to SendVerificationEmail method"
        );
      }

      // 2) Create jwt
      const emailToken = await Utility.create.confirmEmailToken(Email);

      // 3) Create message
      const msg = {
        to: Email,
        from: "no-reply@sfyt.com",
        subject: "Email Confirmation",
        text: EmailClient.registrationEmail(emailToken),
        html: EmailClient.registrationEmailHTML(emailToken)
      };

      // 4) Send email
      await EmailClient.sendEmail(msg);

      return true;
    },

    /** @description Send email with reset password link
     *  @param {String} Email - Where the email will be sent
     *  @returns {Promise}
     *  @resolves {Boolean}
     */
    resetPasswordEmail: async ({ Email }) => {
      try {
        // Sanity check
        if (!Email) {
          throw new Error(
            "Must provide required parameters to SendVerificationEmail method"
          );
        }

        const resetToken = await Utility.create.passwordResetToken(Email);
        // Send email to user asking to confirm email
        const msg = {
          to: Email,
          from: "no-reply@sfyt.com",
          subject: "SFYT Account Password Reset",
          text: EmailClient.resetPasswordEmail(resetToken),
          html: EmailClient.resetPasswordEmailHTML(resetToken)
        };

        await EmailClient.sendEmail(msg);

        return true;
      } catch (err) {
        // TODO: Proper error handling here
        return false;
      }
    }
  }
};

module.exports = { Utility, JWT_AUTH_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN };
