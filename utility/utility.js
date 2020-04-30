const jwt = require("jsonwebtoken");

const BAD_REQUEST = 400; // request could not be understood for some reason; bad syntax?
const UNAUTHORIZED = 401; // authorization is possible but has failed for any reason
const FORBIDDEN = 403; // authorized passed but user does not have permissions
const NOT_FOUND = 404; // resource not found but may be available in the future
const JWT_AUTH_EXPIRES_IN = 60; // how long, in seconds, should auth token last for?
const JWT_REFRESH_EXPIRES_IN = 60 * 60 * 24 * 7; // how long, in seconds, should refresh token last for?

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
    if (err == "Connection error. Please try again") return BAD_REQUEST;

    // default to bad request
    return BAD_REQUEST;
  }

  /** @description Create authentication token and reset token
   *  @param {String} userID - an identifiable user string
   *  @param {String} secret - random, secret string. Used for auth token.
   *  @param {String} secret2 - random, secret string. Used for refresh token.
   */
  async createTokens(userID, secret, secret2) {
    const createToken = jwt.sign(
      {
        user: userID
      },
      secret,
      {
        expiresIn: JWT_AUTH_EXPIRES_IN
      }
    );

    const createRefreshToken = jwt.sign(
      {
        user: userID
      },
      secret2,
      {
        expiresIn: JWT_REFRESH_EXPIRES_IN
      }
    );

    return Promise.all([createToken, createRefreshToken]);
  }
}

const Utility = new utility();
module.exports = { Utility, JWT_AUTH_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN };
