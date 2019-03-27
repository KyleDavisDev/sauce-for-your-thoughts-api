const DB = require("../db/db.js");
const bcrypt = require("bcrypt");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 1000 * 60 * 60 * 2; // 2 hour lock
const SALT_WORK_FACTOR = 10;

exports.UsersTableStructure = `CREATE TABLE IF NOT EXISTS Users (
  UserID int NOT NULL AUTO_INCREMENT,
  Email varchar(50) NOT NULL UNIQUE,
  IsActive BOOLEAN DEFAULT '1',
  Password varchar(100) NOT NULL,
  DisplayName varchar(50) NOT NULL,
  Created DATETIME DEFAULT CURRENT_TIMESTAMP,
  ResetPasswordToken varchar(300),
  ResetPasswordExpires DATETIME,
  LoginAttempts int DEFAULT 0,
  LockedUntil DATETIME,
  PRIMARY KEY (UserID)
  );`;

exports.UsersTableRemove = "DROP TABLE Users";

// Return insert results
exports.Insert = async function({ email, password, displayName }) {
  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(password, salt);

  // Create insert object
  const values = { Email: email, Password: hash, DisplayName: displayName };

  const results = await DB.query("INSERT INTO Users SET ?", values);

  return results;
};

// Returns user
exports.FindByID = async function({ UserID }) {
  const rows = await DB.query(
    "SELECT Email, DisplayName, UserID FROM Users WHERE UserID = ? AND IsActive = 1",
    [UserID]
  );

  // Return user
  return rows[0];
};

exports.getAll = function(cb) {
  db.get().query("SELECT * FROM Users", function(err, rows) {
    if (err) return cb(err);
    cb(null, rows);
  });
};

exports.getAllByUser = function(userId, cb) {
  db.get().query("SELECT * FROM Users WHERE user_id = ?", userId, function(
    err,
    rows
  ) {
    if (err) return cb(err);
    cb(null, rows);
  });
};

exports.AuthenticateUser = async function({ email, password }) {
  const rows = await DB.query("SELECT * FROM Users WHERE Email = ?", [email]);

  // assign for easier use
  const user = rows[0];

  // See if account is locked so we can possibly skipping creating JWT
  // LockedUntil time will be larger if acc locked
  if (user.LockedUntil && user.LockedUntil > Date.now()) {
    // acc locked if here

    // incriment login attempts
    return await module.exports.IncLoginAttempts({
      UserID: user.UserID,
      LoginAttempts: user.LoginAttempts
    });
  }

  // Check if password is good
  const isMatch = await bcrypt.compare(password, user.Password);

  // Password is good
  if (isMatch) {
    // if there's no lock or failed attempts, just return the user
    if (user.LoginAttempts === 0 && !user.LockedUntil) {
      return user;
    }

    // reset attempts and lockedUntil timer
    var test = await DB.query(
      "UPDATE Users SET LoginAttempts = ?, LockedUntil = ? WHERE  UserID = ?",
      [0, null, user.UserID]
    );
    console.log(test);
    return test;
  } else {
    // password is bad, so increment login attempts before responding
    return await module.exports.IncLoginAttempts({
      UserID: user.UserID,
      LoginAttempts: user.LoginAttempts
    });
  }
};

exports.IncLoginAttempts = async function({ UserID, LoginAttempts }) {
  // Check if we need to lock the account or not
  if (LoginAttempts + 1 === MAX_LOGIN_ATTEMPTS) {
    return await DB.query(
      "Update Users SET LoginAttempts = ?, LockedUntil = ? WHERE UserID = ?",
      [MAX_LOGIN_ATTEMPTS, Date.now() + LOCK_TIME, UserID]
    );
  }

  // Increase login attempts only
  return await DB.query(
    "Update Users SET LoginAttempts = LoginAttempts + 1 WHERE UserID = ?",
    [UserID]
  );
};
