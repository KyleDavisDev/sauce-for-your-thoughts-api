const jwt = require("jsonwebtoken");

const EmailClient = require("../email/email");
const Users = require("../models/Users");

const BAD_REQUEST = 400; // request could not be understood for some reason; bad syntax?
const UNAUTHORIZED = 401; // authorization is possible but has failed for any reason
const FORBIDDEN = 403; // authorized passed but user does not have permissions
const NOT_FOUND = 404; // resource not found but may be available in the future
const LOGIN_EXPIRED = 410; // login token expired. User should login again to get new token
const JWT_AUTH_EXPIRES_IN = 60 * 2; // how long, in seconds, should auth token last for?
const JWT_REFRESH_EXPIRES_IN = 60 * 60 * 24 * 7; // how long, in seconds, should refresh token last for?
const JWT_EMAIL_EXPIRES_IN = 60 * 60 * 24 * 7; // how long, in seconds, should refresh token last for?

class utility {
  constructor() {}

  /** @description Get all reviews related to specific sauce slug.
   *  @param {String} name - Name of current middleware
   *  @param {Layer[]} stack - Array of middleware layers
   *  @return {Boolean} whether or not the current middleware is the last or not
   */
  isLastMiddlewareInStack({ name, stack }) {
    let position = 0;
    for (let i = 0, len = stack.length; i < len; i++) {
      const middleware = stack[i];
      if (middleware.name === name) {
        position = i;
        break;
      }
    }

    return position + 1 == stack.length;
  }

  /** @description Standardize error status by passing to a single function here
   *  @param {String} err - error string
   *  @return {Number} The status code error
   */
  generateErrorStatusCode(err) {
    if (err === "TokenExpiredError") return UNAUTHORIZED;
    if (err === "Connection error. Please try again") return BAD_REQUEST;
    if (err === "Could not find any types") return NOT_FOUND;
    if (
      err ===
      "Something broke and we were unable to find any types. Please try again."
    )
      return NOT_FOUND;
    if (err === "Could not verify your account or your account is disabled.")
      return BAD_REQUEST;
    if (err === "Your login has expired. Please relogin and try again.")
      return LOGIN_EXPIRED;
    if (
      "Oops! Your URL may be expired or invalid. Please request a new verification email and try again."
    )
      return BAD_REQUEST;

    // default to bad request
    return BAD_REQUEST;
  }

  /** @description Create authentication token and reset token
   *  @param {String} userID - an identifiable user string
   *  @param {String} secret - random, secret string. Used for auth token.
   *  @param {String} secret2 - random, secret string. Used for refresh token.
   *  @returns {Promise}
   *  @resolves {String[]} array of JWT
   */
  async createTokens(userID, secret, secret2) {
    const createToken = this.createAuthToken(userID, secret);

    const createRefreshToken = this.createRefreshToken(userID, secret2);

    return Promise.all([createToken, createRefreshToken]);
  }

  /** @description Create authentication token
   *  @param {String} userID - an identifiable user string
   *  @param {String} secret - random, secret string. Used for auth token.
   *  @returns {Promise}
   *  @resolves {String} JWT
   */
  async createAuthToken(userID, secret) {
    return jwt.sign(
      {
        user: userID
      },
      secret,
      {
        expiresIn: JWT_AUTH_EXPIRES_IN
      }
    );
  }

  /** @description Create Refresh token
   *  @param {String} userID - an identifiable user string
   *  @param {String} secret2 - random, secret string. Used for auth token.
   *  @returns {Promise}
   *  @resolves {String} JWT
   */
  async createRefreshToken(userID, secret2) {
    return jwt.sign(
      {
        user: userID
      },
      secret2,
      {
        expiresIn: JWT_REFRESH_EXPIRES_IN
      }
    );
  }

  /** @description Create an Email JWT
   *  @param {String} email - an identifiable user email
   *  @returns {Promise}
   *  @resolves {String} JWT
   */
  async createEmailToken(email) {
    return jwt.sign(
      {
        user: email
      },
      process.env.SECRET_EMAIL,
      {
        expiresIn: JWT_EMAIL_EXPIRES_IN
      }
    );
  }

  /** @description Check to see if the refresh token is legit or not
   *  @param {String} token - the refresh token being verified
   *  @returns {[Boolean, Number]} whether token is legit or not, the user's ID
   */
  async validateEmailToken(token) {
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
  }

  /** @description Check to see if the refresh token is legit or not
   *  @param {String} token - the refresh token being verified
   *  @returns {[Boolean, Number]} whether token is legit or not, the user's ID
   */
  async validateRefreshToken(token) {
    try {
      // 1) Grab userID from jwt
      const { user: userID } = await jwt.decode(token);
      if (!userID) {
        return false;
      }

      // 2) Verify person exists
      const doesUserExist = await Users.DoesUserExist({ UserID: userID });
      if (!doesUserExist) {
        return false;
      }

      // 3) Grab user from DB
      const user = await Users.FindUserByID({ UserID: userID });

      // 4) Check if token is legit
      const isTrusted = !!jwt.verify(
        token,
        process.env.SECRET2 + user.Password
      );

      return [isTrusted, userID];
    } catch (err) {
      // TODO: Log error

      // token is not legit or something else happened
      return [false, 0];
    }
  }

  /** @description Send email verification to confirm account creation
   *  @param {String} Email - Where the email will be sent
   *  @returns {Promise}
   *  @resolves {Boolean}
   */
  async sendVerificationEmail({ Email }) {
    // Sanity check
    if (!Email) {
      throw new Error(
        "Must provide required parameters to SendVerificationEmail method"
      );
    }

    const emailToken = await this.createEmailToken(Email);
    // Send email to user asking to confirm email
    const msg = {
      to: Email,
      from: "no-reply@sfyt.com",
      subject: "Email Confirmation",
      text: EmailClient.registrationEmail(emailToken),
      html: EmailClient.registrationEmailHTML(emailToken)
    };

    await EmailClient.sendEmail(msg);

    return true;
  }
}

const Utility = new utility();
module.exports = { Utility, JWT_AUTH_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN };
