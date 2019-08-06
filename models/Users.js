const bcrypt = require("bcrypt");
const moment = require("moment");

const DB = require("../db/db.js");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60; // 2 hour lock time in seconds
const SALT_WORK_FACTOR = 10;
exports.MIN_PASSWORD_LENGTH = 8;
exports.MIN_DISPLAYNAME_LENGTH = 5;
exports.MAX_DISPLAYNAME_LENGTH = 20;

exports.UsersTableStructure = `CREATE TABLE IF NOT EXISTS Users (
  UserID int NOT NULL AUTO_INCREMENT,
  Email varchar(50) NOT NULL UNIQUE,
  IsActive BOOLEAN DEFAULT '1',
  Password varchar(100) NOT NULL,
  DisplayName varchar(50) NOT NULL,
  Created bigint(20) unsigned DEFAULT NULL,
  ResetPasswordToken varchar(300),
  ResetPasswordExpires bigint(20) unsigned DEFAULT NULL,
  LoginAttempts int DEFAULT 0,
  LockedUntil bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (UserID)
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.UsersTableRemove = `ALTER TABLE Sauces DROP FOREIGN KEY Sauces_Users_UserID;
  ALTER TABLE Reviews DROP FOREIGN KEY Reviews_Users_UserID;
  DROP TABLE Users;`;

// Return insert results
exports.Insert = async function({ Email, Password, DisplayName }) {
  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(Password, salt);

  // Create insert object
  const values = {
    Email,
    Password: hash,
    DisplayName,
    Created: moment().unix()
  };

  const results = await DB.query("INSERT INTO Users SET ?", values);

  // Make sure we could save user
  if (!results) {
    throw new Error("Error trying to save user. Please try again.");
  }

  return results;
};

// Returns bool
exports.DoesUserExist = async function({ UserID }) {
  const rows = await DB.query(
    `SELECT 
      COUNT(*) AS UserExists
    FROM
      Users
    WHERE
      UserID = ? AND IsActive = 1`,
    [UserID]
  );

  // Return boolean if user exists
  return rows && rows[0] && rows[0].UserExists === 1;
};

exports.getAll = function(cb) {
  db.get().query("SELECT * FROM Users", function(err, rows) {
    if (err) return cb(err);
    cb(null, rows);
  });
};

exports.AuthenticateUser = async function({ email, password, UserID }) {
  const rows = await DB.query(
    `SELECT
      UserID, LockedUntil, LoginAttempts, DisplayName, Email, Password
    FROM
      Users
    WHERE
      ( Email = ? OR UserID = ? ) AND IsActive = 1
    LIMIT 1`,
    [email, UserID]
  );

  // assign for easier use
  const user = rows[0];
  if (!rows || !user) {
    throw new Error("Invalid username or password.");
  }

  // Check if password is good
  const isMatch = await bcrypt.compare(password, user.Password);

  // delete password from user
  delete user.Password;

  // Password is good
  if (isMatch) {
    // See if account is locked.
    // LockedUntil time will be larger if acc locked
    const date = moment().unix();
    if (user.LockedUntil && user.LockedUntil > date) {
      // acc locked if here
      // incriment login attempts
      await module.exports.IncLoginAttempts({
        UserID: user.UserID,
        LoginAttempts: user.LoginAttempts
      });

      // Throw error w/ vague message
      throw {
        status: 403, // Forbidden
        message:
          "This account has been locked. Please try again in a few hours."
      };
    }

    // If doesn't have any false login attempts, or has been locked out, we can return user
    if (user.LoginAttempts === 0 && !user.LockedUntil) {
      return user;
    }

    // else lets remove restrictions before returning
    await DB.query(
      "UPDATE Users SET LoginAttempts = ?, LockedUntil = ? WHERE  UserID = ?",
      [0, null, user.UserID]
    );

    return user;
  } else {
    // password is bad, so increment login attempts before responding
    await module.exports.IncLoginAttempts({
      UserID: user.UserID,
      LoginAttempts: user.LoginAttempts
    });

    // Account locked
    if (user.LoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Throw error w/ vague message
      throw {
        status: 403, // Forbidden
        message:
          "This account has been locked. Please try again in a few hours."
      };
    } else {
      // Throw error w/ vague message
      throw { status: 401, message: "Invalid username or password." };
    }
  }
};

exports.IncLoginAttempts = async function({ UserID, LoginAttempts }) {
  // Check if we need to lock the account or not
  if (LoginAttempts + 1 === MAX_LOGIN_ATTEMPTS) {
    // Create Unix Epoch time in seconds
    const date = moment().unix() + LOCK_TIME;

    return await DB.query(
      "Update Users SET LoginAttempts = ?, LockedUntil = ? WHERE UserID = ?",
      [MAX_LOGIN_ATTEMPTS, date, UserID]
    );
  }

  // Increase login attempts only
  return await DB.query(
    "Update Users SET LoginAttempts = LoginAttempts + 1 WHERE UserID = ?",
    [UserID]
  );
};

/** @description Get basic user info
 *  @param {String?} displayName - unique user display name
 *  @return {RowDataPacket} Obj - container object
 *    @return {String} Obj.DisplayName - user email
 *    @return {String} Obj.Email - user email
 */
exports.FindByDisplayName = async function({ DisplayName }) {
  const rows = await DB.query(
    "SELECT Email, DisplayName FROM Users where DisplayName = ?",
    [DisplayName]
  );

  // If error
  if (!rows || !rows[0]) {
    throw new Error("Invalid displayName.");
  }

  // return record
  return rows[0];
};

// Returns boolean
exports.IsAdmin = async function({ UserID }) {
  const tmp = await DB.query(
    `SELECT 
      COUNT(*) as IsAdmin
      FROM UserRole
      JOIN Roles
        ON Roles.RoleID = UserRole.RoleID
      JOIN Users
        ON Users.UserID = UserRole.UserID
     WHERE
      Roles.Name = 'admin' AND
      Users.UserID = ?
    `,
    [UserID]
  );

  return tmp[0] && tmp[0].IsAdmin === 1;
};

/** @description Update a single user's email
 *  @param {string} UserID - Unique user's identification
 *  @param {string} Email - new email address
 *  @returns {Boolean}
 */
exports.UpdateEmail = async function({ UserID, Email }) {
  if (!UserID || !Email) {
    throw new Error("Must provide required parameters to UpdateEmail method");
  }

  const row = await DB.query(
    `UPDATE Users
    SET
      Email = ?
    WHERE
      UserID = ? AND IsActive = 1 AND LoginAttempts <= ?
    `,
    [Email, UserID, MAX_LOGIN_ATTEMPTS]
  );

  // If all is good, will return true
  return row && row.changedRows === 1;
};

/** @description Update a single user's email
 *  @param {string} UserID - Unique user's identification
 *  @param {string} Password - new password to be hashed
 *  @returns {Boolean}
 */
exports.UpdatePassword = async function({ UserID, Password }) {
  // Sanity check
  if (!UserID || !Password) {
    throw new Error("Must provide required parameters to UpdateEmail method");
  }

  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(Password, salt);

  const row = await DB.query(
    `UPDATE Users
    SET
      Password = ?
    WHERE
      UserID = ? AND IsActive = 1 AND LoginAttempts <= ?
    `,
    [hash, UserID, MAX_LOGIN_ATTEMPTS]
  );

  // If all is good, will return true
  return row && row.changedRows === 1;
};

/** @description Update a single user's DisplayName
 *  @param {string} UserID - Unique user's identification
 *  @param {string} DisplayName - new password to be hashed
 *  @returns {Boolean}
 */
exports.UpdateDisplayName = async function({ UserID, DisplayName }) {
  // Sanity check
  if (!UserID || !DisplayName) {
    throw new Error(
      "Must provide required parameters to UpdateDisplayName method"
    );
  }

  const row = await DB.query(
    `UPDATE Users
    SET
    DisplayName = ?
    WHERE
      UserID = ? AND IsActive = 1 AND LoginAttempts <= ?
    `,
    [DisplayName, UserID, MAX_LOGIN_ATTEMPTS]
  );

  // If all is good, will return true
  return row && row.affectedRows === 1;
};
