const bcrypt = require("bcrypt");
const moment = require("moment");

const DB = require("../db/db.js");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60; // 2 hour lock time in seconds
const SALT_WORK_FACTOR = 10;

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

// exports.getAllByUser = function(userId, cb) {
//   db.get().query("SELECT * FROM Users WHERE user_id = ?", userId, function(
//     err,
//     rows
//   ) {
//     if (err) return cb(err);
//     cb(null, rows);
//   });
// };

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

  // See if account is locked so we can possibly skipping creating JWT
  // LockedUntil time will be larger if acc locked
  const date = moment().unix();
  if (user.LockedUntil && user.LockedUntil > date) {
    // acc locked if here
    // incriment login attempts
    await module.exports.IncLoginAttempts({
      UserID: user.UserID,
      LoginAttempts: user.LoginAttempts
    });

    // Finally throw error w/ vague message
    throw new Error(
      "This account has been locked. Please try again in a few hours."
    );
  }

  // Check if password is good
  const isMatch = await bcrypt.compare(password, user.Password);

  // delete password from user
  delete user.Password;

  // Password is good
  if (isMatch) {
    // if there's no lock or failed attempts, just return the user
    if (user.LoginAttempts === 0 && !user.LockedUntil) {
      return user;
    }

    // reset attempts and lockedUntil timer
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

    // Finally throw error w/ vague message
    throw new Error("Invalid username or password.");
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

exports.FindByDisplayName = async function({ displayName, UserID }) {
  // First let's see if our UserID is an admin or not
  const isAdmin = UserID && module.exports.IsAdmin({ UserID });

  // If admin, allow to search for any displayName or all users
  if (isAdmin) {
    if (displayName) {
      const rows = await DB.query(
        "SELECT Email, DisplayName FROM Users where displayName = ?",
        [displayName]
      );

      // If error
      if (!rows || !rows[0]) {
        throw new Error("Invalid displayName.");
      }

      // return results
      return rows[0];
    } else {
      // Find all
      const rows = await DB.query("SELECT Email, DisplayName FROM Users ");

      return rows;
    }
  }

  // If not an admin, only return matching UserID
  const rows = await DB.query(
    "SELECT Email, DisplayName FROM Users where UserID = ?",
    [UserID]
  );

  // If error
  if (!rows || !rows[0]) {
    throw new Error("Invalid displayName.");
  }
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
      UserID = ?
    `,
    [Email, UserID]
  );

  console.log(row);
};
