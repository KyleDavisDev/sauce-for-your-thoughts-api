const bcrypt = require("bcrypt");
const moment = require("moment");
const Avatars = require("./Avatars.js");
const { Utility } = require("../utility/utility");

const DB = require("../db/db.js");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60; // 2 hour lock time in seconds
const SALT_WORK_FACTOR = 10;
exports.MIN_PASSWORD_LENGTH = 8;
exports.MIN_DISPLAYNAME_LENGTH = 5;
exports.MAX_DISPLAYNAME_LENGTH = 20;

exports.UsersTableStructure = `CREATE TABLE IF NOT EXISTS 'Users' (
  'UserID' int NOT NULL AUTO_INCREMENT,
  'Email' varchar(50) NOT NULL,
  'IsActive' BOOLEAN DEFAULT '1',
  'Password' varchar(100) NOT NULL,
  'DisplayName' varchar(50) NOT NULL,
  'Created' bigint(20) unsigned DEFAULT NULL,
  'ResetPasswordToken' varchar(300),
  'ResetPasswordExpires' bigint(20) unsigned DEFAULT NULL,
  'LoginAttempts' int DEFAULT 0,
  'LockedUntil' bigint(20) unsigned DEFAULT NULL,
  'AvatarID' int(11) unsigned DEFAULT NULL,
  'IsEmailVerified' int(1) NOT NULL DEFAULT 0,
  PRIMARY KEY ('UserID'),
  KEY 'Users_AvatarID_Avatars_AvatarID' ('AvatarID'),
  CONSTRAINT 'Users_AvatarID_Avatars_AvatarID' FOREIGN KEY ('AvatarID') REFERENCES 'Avatars' ('AvatarID')
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;`;

exports.UsersTableRemove = `ALTER TABLE Sauces DROP FOREIGN KEY Sauces_Users_UserID;
  ALTER TABLE Reviews DROP FOREIGN KEY Reviews_Users_UserID;
  ALTER TABLE Users DROP FOREIGN KEY Users_AvatarID_Avatars_AvatarID;
  DROP TABLE Users;`;

/** @description Insert record into database. Will also send off email asking for user to confirm email.
 *  @param {String} Email - user's email
 *  @param {String} DisplayName - user's display name
 *  @param {String} Password - user's password
 *  @return inserted result
 */
exports.Insert = async function({ Email, Password, DisplayName }) {
  // Throw error if not all info is available.
  if (!Email || !DisplayName || !Password) {
    throw new Error(
      "Could insert user into database. Please make sure all required information is provided."
    );
  }

  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(Password, salt);

  // Find random AvatarID and assign to user
  const AvatarID = await Avatars.getRandomID();

  // Create insert object
  const values = {
    Email,
    Password: hash,
    DisplayName,
    Created: moment().unix(),
    AvatarID
  };

  // Insert user record
  const results = await DB.query("INSERT INTO Users SET ?", values);

  // Make sure we could save user
  if (!results) {
    throw new Error("Error trying to save user. Please try again.");
  }

  await Utility.sendVerificationEmail({ Email });

  return results;
};

/** @description Check if user exists and is active in the DB
 *  @param {Number} UserID - user's id
 *  @param {String} Email - user's email
 *  @return {Promise} promise
 *  @resolves {Boolean} Wether or not user exists and it active in DB
 */
exports.DoesUserExist = async function({ UserID, Email }) {
  // 1) Sanity check
  if (!UserID && !Email) {
    throw new Error("Must provide required parameters to DoesUserExist method");
  }

  // 2) Query DB
  const rows = await DB.query(
    `SELECT 
      COUNT(*) AS UserExists
    FROM
      Users
    WHERE
      (UserID = ? 
      OR Email = ?)
      AND IsActive = 1`,
    [UserID, Email]
  );

  // 3) Return boolean if user exists
  return rows && rows[0] && rows[0].UserExists === 1;
};

/** @description Grab specific user by their id
 *  @param {Number} UserID - user's id
 *  @return {Promise}
 *  @resolves {RowDataPacket} Obj - container object
 *    @resolves {String} Obj.UserID - user email
 *    @resolves {String} Obj.Password - user hashed password
 *    @resolves {String} Obj.DisplayName - user display name
 *    @resolves {String} Obj.Email - user email
 *    @resolves {String} Obj.URL - user avatar URL
 */
exports.FindUserByID = async function({ UserID }) {
  const rows = await DB.query(
    `SELECT
      Users.UserID,
      Users.DisplayName,
      Users.Email,
      Users.Password,
      Avatars.URL
    FROM
      Users
    JOIN Avatars
      ON Avatars.AvatarID = Users.AvatarID
    WHERE
      Users.UserID = ?
      AND Users.IsActive = 1
    LIMIT 1`,
    [UserID]
  );

  // assign for easier use
  const user = rows[0];
  // verify we found someone
  if (!rows || !user) {
    throw new Error("Could not find user.");
  }

  // Return user
  return user;
};

/** @description Authenticate a user as legit or not
 *  @param {String=} email - User email. Must pass email or UserID.
 *  @param {String=} UserID - User's ID. Must pass email or UserID.
 *  @param {String} password - user's password
 *  @return {Promise}
 *  @resolves {RowDataPacket} Obj - container object
 *    @resolves {String} Obj.UserID - user email
 *    @resolves {String} Obj.Password - user hashed password
 *    @resolves {String} Obj.DisplayName - user display name
 *    @resolves {String} Obj.Email - user email
 *    @resolves {String} Obj.URL - user avatar URL
 */
exports.AuthenticateUser = async function({ email, password, UserID }) {
  const rows = await DB.query(
    `SELECT
      Users.UserID,
      Users.LockedUntil,
      Users.LoginAttempts,
      Users.DisplayName,
      Users.Email,
      Users.Password,
      Avatars.URL
    FROM
      Users
    JOIN Avatars
      ON Avatars.AvatarID = Users.AvatarID
    WHERE
      ( Users.Email = ? OR Users.UserID = ? )
      AND Users.IsActive = 1
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
      // remove unnecessary info
      delete user.LoginAttempts;
      delete user.LockedUntil;

      // return user
      return user;
    }

    // else lets remove restrictions before returning
    await DB.query(
      "UPDATE Users SET LoginAttempts = ?, LockedUntil = ? WHERE  UserID = ?",
      [0, null, user.UserID]
    );

    // remove unnecessary info
    delete user.LoginAttempts;
    delete user.LockedUntil;

    // return user
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

/** @description Increase LoginAttempts of user
 *  @param {String} UserID - User to incriment
 *  @param {String} LoginAttempts - Number to set attempts to
 *  @return {Promise}
 */
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

/** @description Find a user's email
 *  @param {String?} DisplayName - unique user display name
 *  @param {String?} UserID - unique user id
 *  @return {String} User's email
 */
exports.FindUserEmail = async function({ DisplayName, UserID }) {
  // Sanity check
  if (!DisplayName && !UserID) {
    throw new Error("Must provide required parameters to FindUserEmail method");
  }

  let rows;
  if (DisplayName) {
    rows = await DB.query("SELECT Email FROM Users where DisplayName = ?", [
      DisplayName
    ]);
  } else if (UserID) {
    rows = await DB.query("SELECT Email FROM Users where UserID = ?", [UserID]);
  }

  // If error
  if (!rows || !rows[0]) {
    throw new Error("Invalid displayName.");
  }

  // return record
  return rows[0].Email;
};

/** @description Find a user's id based off of another unique value
 *  @param {String?} DisplayName - unique user display name
 *  @param {String?} Email - unique user email
 *  @return {Number} User's id
 */
exports.FindUserIDByUnique = async function({ DisplayName, Email }) {
  // Sanity check
  if (!DisplayName && !Email) {
    throw new Error(
      "Must provide required parameters to FindUserIDByUnique method"
    );
  }

  let rows = await DB.query(
    `
    SELECT
      UserID
    FROM
      Users
    WHERE
      DisplayName = ?
      OR Email = ?
    LIMIT 
      1
    `,
    [DisplayName, Email]
  );

  // If error
  if (!rows || !rows[0]) {
    throw new Error("Invalid UserID.");
  }

  // return ID
  return rows[0].UserID || 0;
};

/** @description Checks if a userID is a person who is an admin or not
 *  @param {string} UserID - Unique user's identification
 *  @returns {Promise}
 *  @resolves {Boolean} Is person an admin role or not
 */
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
 *  @returns {Promise}
 *  @resolves {Boolean}
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
  return row && row.affectedRows === 1;
};

/** @description Update a single user's email
 *  @param {string} UserID - Unique user's identification
 *  @param {string} Password - new password to be hashed
 *  @returns {Promise}
 *  @resolves {Boolean}
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

  // Update the record
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
  return row && row.affectedRows === 1;
};

/** @description Update a single user's DisplayName
 *  @param {string} UserID - Unique user's identification
 *  @param {string} DisplayName - new password to be hashed
 *  @returns {Promise}
 *  @resolves {Boolean}
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

/** @description Update a single user's DisplayName
 *  @param {string} UserID - Unique user's identification
 *  @param {string} AvatarURL - new avatar url
 *  @returns {Promise}
 *  @resolves {Boolean}
 */
exports.UpdateAvatarURL = async function({ UserID, AvatarURL }) {
  // Sanity check
  if (!UserID || !AvatarURL) {
    throw new Error(
      "Must provide required parameters to UpdateAvatarURL method"
    );
  }

  // Find ID related to Avatar
  const AvatarID = await Avatars.getIDFromURL({ URL: AvatarURL });

  if (!AvatarID) {
    throw new Error("Error finding AvatarID from URL. Please try again.");
  }

  const row = await DB.query(
    `UPDATE Users
    SET
    AvatarID = ?
    WHERE
      UserID = ? AND IsActive = 1 AND LoginAttempts <= ?
    `,
    [AvatarID, UserID, MAX_LOGIN_ATTEMPTS]
  );

  // If all is good, will return true
  return row && row.affectedRows === 1;
};

/** @description Check if person have verified email or not
 *  @param {String?} UserID - Unique user's identification
 *  @param {String?} UserID - Unique user's identification
 *  @returns {Promise}
 *  @resolves {Boolean}
 */
exports.IsEmailVerified = async function({ UserID, Email }) {
  // Sanity check
  if (!UserID && !Email) {
    throw new Error(
      "Must provide required parameters to IsEmailVerified method"
    );
  }

  const row = await DB.query(
    `
    SELECT
      COUNT(*) AS COUNT
    FROM
      Users
    WHERE
      (UserID = ?
        OR Email = ?)
      AND IsActive = 1
      AND IsEmailVerified = 1
    `,
    [UserID, Email, MAX_LOGIN_ATTEMPTS]
  );

  // If all is good, will return true
  return row && row[0] && row[0].COUNT === 1;
};

/** @description Toggle whether a user's email has been confirmed or not
 *  @param {String} UserID - user to toggle
 *  @param {Boolean} Toggle - whether email has been confirmed or not
 *  @returns {Promise}
 *  @resolves {Boolean}
 */
exports.toggleConfirmEmail = async function({ UserID, Toggle }) {
  // 1) Sanity check
  if (!UserID || Toggle === undefined || Toggle === null) {
    throw new Error(
      "Must provide required parameters to toggleConfirmEmail method"
    );
  }

  // 2) Do the things
  const row = await DB.query(
    `
    UPDATE
      Users
    SET
      IsEmailVerified = ?
    WHERE
      UserID = ?
      AND IsActive = 1
    `,
    [Toggle, UserID]
  );

  // 3) If all is good, will return true
  return row && row.affectedRows === 1;
};
