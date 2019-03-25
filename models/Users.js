var db = require("../db/db.js");
const bcrypt = require("bcrypt");

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 1000 * 60 * 60 * 2; // 2 hour lock
const SALT_WORK_FACTOR = 10;

exports.UsersTableStructure = `CREATE TABLE IF NOT EXISTS Users (
  UserID int NOT NULL AUTO_INCREMENT,
  Email varchar(50) NOT NULL UNIQUE,
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

exports.Insert = async function({ email, password, displayName }, cb) {
  // Create salt
  const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
  // Create hash
  const hash = await bcrypt.hash(password, salt);

  // Create insert object
  const values = { Email: email, Password: hash, DisplayName: displayName };

  db.get().query("INSERT INTO Users SET ?", values, function(err, result) {
    // If callback was passed, use that
    if (cb !== undefined) {
      if (err) return cb(err);
      cb(null, result);
    }

    // Otherwise return appropriate val
    if (err) return err;
    return result;
  });
};

exports.FindByID = function({ UserID }, cb) {
  db
    .get()
    .query(
      "SELECT Email, DisplayName, UserID FROM Users WHERE UserID = ?",
      [UserID],
      function(err, rows) {
        // If error, get out
        if (err) return cb(err);

        // return result
        cb(null, rows[0]);
      }
    );
};

exports.getAll = function(cb) {
  db.get().query("SELECT * FROM Users", function(err, rows) {
    if (err) return cb(err);
    cb(null, rows);
  });
};

exports.getAllByUser = function(userId, cb) {
  db
    .get()
    .query("SELECT * FROM Users WHERE user_id = ?", userId, function(
      err,
      rows
    ) {
      if (err) return cb(err);
      cb(null, rows);
    });
};

exports.AuthenticateUser = function({ email, password }, cb) {
  db
    .get()
    .query("SELECT * FROM Users WHERE Email = ?", [email], function(err, rows) {
      // If error occured, get out
      if (err) return cb(err, null, null);

      // If cannot find user, get out
      if (!rows[0]) return cb(null, null, null);

      // assign for easier use
      const user = rows[0];

      // See if account is locked so we can possibly skipping creating JWT
      // LockedUntil time will be larger if acc locked
      if (user.LockedUntil && user.LockedUntil > Date.now()) {
        // acc locked if here

        // incriment login attempts
        module.exports.IncLoginAttempts(
          { UserID: user.UserID, LoginAttempts: user.LoginAttempts },
          function(err) {
            // If error occured, get out
            if (err) return cb(err, null, null);

            // Value has been incrimented, return message
            return cb(
              null,
              null,
              "This account is locked. Please try again in a few hours."
            );
          }
        );
      }

      // Check if password is good
      bcrypt.compare(password, user.Password, function(err, isMatch) {
        // If error occured, get out
        if (err) return cb(err, null, null);

        // Password is good
        if (isMatch) {
          // if there's no lock or failed attempts, just return the user
          if (user.LoginAttempts === 0 && !user.LockedUntil) {
            return cb(null, user, null);
          }

          // reset attempts and lockedUntil timer
          return db
            .get()
            .query(
              "UPDATE Users SET LoginAttempts = ?, LockedUntil = ? WHERE  UserID = ?",
              [0, null, user.UserID],
              function(err) {
                // If error occured, get out
                if (err) return cb(err, null, null);

                // return user
                return cb(null, user, null);
              }
            );
        }

        // password is bad, so increment login attempts before responding
        module.exports.IncLoginAttempts(
          { UserID: user.UserID, LoginAttempts: user.LoginAttempts },
          function(err) {
            if (err) return cb(err);
            return cb(null, null);
          }
        );
      });
    });
};

exports.IncLoginAttempts = function({ UserID, LoginAttempts }, cb) {
  // Check if we need to lock the account or not
  if (LoginAttempts + 1 === MAX_LOGIN_ATTEMPTS) {
    db
      .get()
      .query(
        "Update Users SET LoginAttempts = ?, LockedUntil = ? WHERE UserID = ?",
        [MAX_LOGIN_ATTEMPTS, Date.now() + LOCK_TIME, UserID],
        function(err, result) {
          if (err) return cb(err);

          return result;
        }
      );
  }

  // Increase login attempts only
  db
    .get()
    .query(
      "Update Users SET LoginAttempts = LoginAttempts + 1 WHERE UserID = ?",
      [UserID],
      function(err, result) {
        if (err) return cb(err);

        return result;
      }
    );
};
